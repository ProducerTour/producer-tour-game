# Payment Summary Precision Issue - Investigation Summary

## Key Finding

**The migration ran successfully, but it only fixes FUTURE data, not existing StatementItems.**

StatementItems created BEFORE the migration (Nov 8, 2025 00:08 UTC) have 2-decimal precision.
StatementItems created AFTER the migration have 6-decimal precision.

The payment summary is showing incorrect totals because it's aggregating StatementItems that still have old 2-decimal precision.

---

## Root Cause

### What the Migration Did

```sql
ALTER TABLE "StatementItem" ALTER COLUMN "revenue" TYPE DECIMAL(12,6);
ALTER TABLE "StatementItem" ALTER COLUMN "commissionAmount" TYPE DECIMAL(12,6);
ALTER TABLE "StatementItem" ALTER COLUMN "netRevenue" TYPE DECIMAL(12,6);
```

This changed the column SCHEMA but did NOT recalculate existing data.

### PostgreSQL Behavior

- **Before migration**: Value `4.11` stored with 2 decimals
- **After migration (same row)**: Value becomes `4.110000` (padded with zeros)
- **NOT**: `4.113851` (the actual full-precision value)

### When Precision Matters

StatementItems are created during the PUBLISH step:

```typescript
// statement.routes.ts line 444
const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;

// This value is stored in the database with the column's CURRENT precision
prisma.statementItem.create({
  data: {
    revenue: writerRevenue  // DECIMAL(12,2) before migration, DECIMAL(12,6) after
  }
})
```

**Timeline**:
- Published BEFORE Nov 8 00:08 → 2 decimals (rounded)
- Published AFTER Nov 8 00:08 → 6 decimals (accurate)

---

## Why Payment Summaries Are Wrong

Payment summaries aggregate StatementItem rows:

```typescript
// statement.routes.ts line 594
statement.items.forEach(item => {
  writer.grossRevenue += Number(item.revenue);  // Summing already-rounded values
});

// Round AFTER summing
writer.grossRevenue = Math.round(writer.grossRevenue * 100) / 100;
```

**Problem**: If `item.revenue` values are already rounded to 2 decimals, summing them accumulates rounding errors. Rounding AFTER summing doesn't help.

**Example**:
- Original values: `4.113851, 10.554732, 0.123456`
- Stored as (before migration): `4.11, 10.55, 0.12`
- Sum: `14.78` (missing `$0.057039`)
- Across 1000s of items, errors compound to significant amounts

---

## Where Full Precision Is Preserved

The parser stores full precision in `statement.metadata.parsedItems`:

```typescript
// mlc.parser.ts line 97
const amount = parseAmountValue(row['Distributed Amount']);  // JavaScript float (~15 decimals)

// Stored in metadata JSON
items.push({
  workTitle: title,
  revenue: amount  // Full precision preserved here
});
```

This means we CAN recalculate StatementItems from the metadata!

---

## Solutions

### 1. Re-Publish Statement (UNPAID statements only)

**Endpoint**: `POST /api/statements/:id/republish`

```typescript
// Add to statement.routes.ts
router.post('/:id/republish', authenticate, requireAdmin, async (req, res) => {
  // Delete StatementItems, reset status to PROCESSED
  // Then re-publish via UI to create new StatementItems with 6-decimal precision
});
```

**Pros**: Clean, uses existing logic
**Cons**: Changes publishedAt timestamp, can't use on PAID statements

### 2. Data Migration Script (ALL statements)

**File**: `apps/backend/src/scripts/recalculate_statement_items.ts`

```bash
# Preview changes
npx ts-node apps/backend/src/scripts/recalculate_statement_items.ts --dry-run

# Fix all old statements
npx ts-node apps/backend/src/scripts/recalculate_statement_items.ts

# Fix specific statement
npx ts-node apps/backend/src/scripts/recalculate_statement_items.ts --statement=STATEMENT_ID
```

**What it does**:
1. Finds statements published before Nov 8 00:08
2. Extracts `parsedItems` from metadata (full precision)
3. Recalculates revenue with 6-decimal precision
4. Updates StatementItem rows
5. Updates statement totals

**Pros**: Preserves timestamps, works on PAID statements, batch processing
**Cons**: More complex, requires testing

### 3. Wait for Next Statement (NEW data only)

No action needed. The migration is working for new statements.

**Pros**: Zero effort
**Cons**: Doesn't fix existing statements

---

## Verification Steps

### Check if Statement Needs Fixing

```sql
SELECT id, filename, publishedAt
FROM statements
WHERE id = 'STATEMENT_ID';
```

If `publishedAt < 2025-11-08 00:08:00`, statement needs fixing.

### Check StatementItem Precision

```sql
SELECT revenue, commissionAmount, netRevenue
FROM statement_items
WHERE statementId = 'STATEMENT_ID'
LIMIT 5;
```

Look for:
- `4.11, 10.55` → 2 decimals (OLD precision)
- `4.113851, 10.554732` → 6 decimals (NEW precision)

### Verify Fix Worked

```sql
SELECT 
  totalRevenue,
  totalCommission,
  totalNet,
  (totalRevenue - totalCommission - totalNet) as diff
FROM statements
WHERE id = 'STATEMENT_ID';
```

`diff` should be near $0 (< $0.01).

---

## Recommended Action

**For the user's specific statement**:

1. Check `publishedAt` timestamp
2. If before Nov 8 00:08:
   - **UNPAID**: Use re-publish endpoint
   - **PAID**: Use data migration script
3. If after Nov 8 00:08:
   - Issue is NOT precision-related
   - Investigate parser or aggregation logic

**For future statements**:
- Migration is working correctly
- No action needed

---

## Documentation

- **Full Analysis**: `PRECISION_FIX_ANALYSIS.md`
- **Quick Reference**: `QUICK_REFERENCE.md`
- **Migration Script**: `apps/backend/src/scripts/recalculate_statement_items.ts`

---

## Files Reference

| File | Line(s) | What It Does |
|------|---------|--------------|
| `schema.prisma` | 211, 218, 220 | Defines DECIMAL(12,6) columns |
| `20251108_increase_revenue_precision/migration.sql` | 4-6 | ALTER TABLE commands |
| `statement.routes.ts` | 428-476 | Publish logic (creates StatementItems) |
| `statement.routes.ts` | 546-630 | Payment summary (aggregates StatementItems) |
| `mlc.parser.ts` | 97 | Parses revenue with full precision |
| `parsers/utils.ts` | 5-18 | parseAmountValue (parseFloat) |

---

## Next Steps

1. Determine which statements are affected (query publishedAt < Nov 8)
2. Choose fix strategy based on payment status
3. Run with --dry-run to preview changes
4. Apply fix
5. Verify totals match original statement files

For questions or issues, review the detailed analysis in `PRECISION_FIX_ANALYSIS.md`.
