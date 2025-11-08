# Precision Fix - Quick Reference Guide

## Problem Summary

The migration changed the database schema to support 6-decimal precision, but it DOES NOT fix existing StatementItems that were created with 2-decimal precision.

## Timeline

- **Migration Ran**: November 8, 2025 00:08 UTC
- **Before this time**: StatementItems have 2 decimals (4.11)
- **After this time**: StatementItems have 6 decimals (4.113851)

## How to Check if a Statement Needs Fixing

### Method 1: Check publishedAt timestamp

```sql
SELECT id, filename, publishedAt, paymentStatus
FROM statements
WHERE id = 'YOUR_STATEMENT_ID';
```

If `publishedAt < 2025-11-08 00:08:00 UTC`, the statement needs fixing.

### Method 2: Check StatementItem values

```sql
SELECT revenue, commissionAmount, netRevenue
FROM statement_items
WHERE statementId = 'YOUR_STATEMENT_ID'
LIMIT 5;
```

If values look like `4.11`, `10.55` (2 decimals), the statement needs fixing.
If values look like `4.113851`, `10.554732` (6 decimals), the statement is correct.

## Fix Solutions

### Solution A: Re-Publish (For UNPAID statements)

**Best for**: Statements that haven't been paid yet

**Steps**:
1. Delete StatementItems for the statement
2. Reset statement status to PROCESSED
3. Re-publish via UI

**Implementation**: Add this endpoint to `statement.routes.ts`

```typescript
router.post('/:id/republish', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  const statement = await prisma.statement.findUnique({ where: { id } });
  if (!statement) return res.status(404).json({ error: 'Statement not found' });
  
  if (statement.paymentStatus === 'PAID') {
    return res.status(400).json({ error: 'Cannot republish paid statements' });
  }
  
  await prisma.$transaction(async (tx) => {
    await tx.statementItem.deleteMany({ where: { statementId: id } });
    await tx.statement.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        publishedAt: null,
        publishedById: null,
        totalCommission: 0,
        totalNet: 0,
      }
    });
  });
  
  res.json({ message: 'Statement reset. Re-publish to apply precision fix.' });
});
```

**Usage**:
```bash
curl -X POST http://localhost:5000/api/statements/STATEMENT_ID/republish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Then re-publish the statement via the UI.

---

### Solution B: Data Migration Script (For PAID or ALL statements)

**Best for**: Statements already paid, or batch-fixing multiple statements

**File**: `apps/backend/src/scripts/recalculate_statement_items.ts`

**Usage**:
```bash
# Preview changes (dry run)
npx ts-node apps/backend/src/scripts/recalculate_statement_items.ts --dry-run

# Fix all statements published before migration
npx ts-node apps/backend/src/scripts/recalculate_statement_items.ts

# Fix specific statement
npx ts-node apps/backend/src/scripts/recalculate_statement_items.ts --statement=STATEMENT_ID
```

**What it does**:
1. Finds all statements published before Nov 8 00:08 UTC
2. Extracts parsedItems from statement metadata (full precision)
3. Recalculates revenue, commission, netRevenue with 6-decimal precision
4. Updates StatementItem rows in database
5. Updates statement totals

---

### Solution C: Wait for Next Statement (For new data only)

**Best for**: User is OK waiting for next upload

**No action needed**: The migration is working correctly for new statements. Next time they upload and publish a statement, it will have 6-decimal precision automatically.

---

## Verification After Fix

### Check Statement Totals

```sql
SELECT 
  id,
  filename,
  totalRevenue,
  totalCommission,
  totalNet,
  (totalRevenue - totalCommission - totalNet) as diff
FROM statements
WHERE id = 'YOUR_STATEMENT_ID';
```

The `diff` should be very close to 0 (< $0.01).

### Check StatementItem Precision

```sql
SELECT 
  workTitle,
  revenue,
  commissionAmount,
  netRevenue,
  LENGTH(CAST(revenue AS TEXT)) - POSITION('.' IN CAST(revenue AS TEXT)) as decimal_places
FROM statement_items
WHERE statementId = 'YOUR_STATEMENT_ID'
LIMIT 10;
```

`decimal_places` should be 6 (not 2).

### Check Payment Summary Endpoint

```bash
curl http://localhost:5000/api/statements/STATEMENT_ID/payment-summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Compare the totals to the original statement file. They should match closely.

---

## Why This Happened

1. **Database migrations change schema, not data**
   - `ALTER TABLE` changes column definition
   - Existing values keep their precision (4.11 becomes 4.110000, not 4.113851)

2. **Precision is determined at INSERT time**
   - StatementItems created before migration: stored with 2 decimals
   - StatementItems created after migration: stored with 6 decimals

3. **parsedItems in metadata have full precision**
   - Parser uses JavaScript `parseFloat()` (~15 decimal precision)
   - Stored as JSON in `statement.metadata.parsedItems`
   - Can be used to recalculate correct values

4. **Payment summaries aggregate StatementItems**
   - Sums revenue from StatementItem table
   - Rounding AFTER aggregation can't fix already-rounded data
   - Need to fix source data (StatementItems) first

---

## Files Involved

- **Migration**: `/apps/backend/prisma/migrations/20251108_increase_revenue_precision/migration.sql`
- **Schema**: `/apps/backend/prisma/schema.prisma` (lines 211, 218, 220)
- **Publish Logic**: `/apps/backend/src/routes/statement.routes.ts` (lines 428-476)
- **Payment Summary**: `/apps/backend/src/routes/statement.routes.ts` (lines 546-630)
- **Parser**: `/apps/backend/src/parsers/mlc.parser.ts` (line 97)
- **Utility**: `/apps/backend/src/parsers/utils.ts` (parseAmountValue)

---

## Contact

If you need help:
1. Check which statements need fixing (query publishedAt)
2. Choose appropriate fix solution
3. Run with --dry-run first to preview changes
4. Verify results after fixing
