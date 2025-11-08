# Payment Summary Precision Issue - Root Cause Analysis

## Executive Summary

**The migration ran successfully, but it DOES NOT fix existing StatementItems.** The precision fix only affects NEW statements published AFTER the migration. If the user is looking at a statement published BEFORE November 8, 2025 00:08 UTC, the StatementItems have 2-decimal precision (4.11) instead of 6-decimal precision (4.113851).

---

## 1. Migration Impact on Existing Data

### What the Migration Did
```sql
ALTER TABLE "StatementItem" ALTER COLUMN "revenue" TYPE DECIMAL(12,6);
ALTER TABLE "StatementItem" ALTER COLUMN "commissionAmount" TYPE DECIMAL(12,6);
ALTER TABLE "StatementItem" ALTER COLUMN "netRevenue" TYPE DECIMAL(12,6);
```

Migration timestamp: **November 8, 2025 00:08 UTC** (`20251108_increase_revenue_precision`)

### Critical PostgreSQL Behavior

When PostgreSQL changes a column from `DECIMAL(12,2)` to `DECIMAL(12,6)`:

**Before migration:**
- Value stored: `4.11` (2 decimal places)
- Database storage: `4.11`

**After migration (same row):**
- Value now: `4.110000` (6 decimal places)
- Database storage: `4.110000` (NOT `4.113851`)

**THE MIGRATION DOES NOT RECALCULATE DATA.** It only changes the column definition to ALLOW 6 decimals going forward. Existing values keep their original precision padded with zeros.

---

## 2. When StatementItems Are Created

### Statement Lifecycle
```
Upload → Parse → Review → Assign → PUBLISH (creates StatementItems) → Process Payment
```

**StatementItems are created during the PUBLISH step** in `statement.routes.ts` (lines 428-476):

```typescript
// Line 444: Revenue calculation uses parseFloat on parsedItems
const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
const itemCommissionAmount = (writerRevenue * commissionRateToUse) / 100;
const itemNetRevenue = writerRevenue - itemCommissionAmount;

// Line 453-465: Creates StatementItem with these calculated values
prisma.statementItem.create({
  data: {
    revenue: writerRevenue,        // Stored in DB with current column precision
    commissionAmount: itemCommissionAmount,
    netRevenue: itemNetRevenue,
    // ... other fields
  }
})
```

### Precision Timeline

| Statement Published | StatementItem Precision | Reason |
|---------------------|------------------------|--------|
| Before Nov 8 00:08  | 2 decimals (4.11)      | Column was DECIMAL(12,2) |
| After Nov 8 00:08   | 6 decimals (4.113851)  | Column is DECIMAL(12,6) |

---

## 3. Where parsedItems Revenue Comes From

### MLC Parser (example)
File: `apps/backend/src/parsers/mlc.parser.ts` (line 97)

```typescript
// Parse revenue using utility function
const amount = parseAmountValue(row['Distributed Amount']);

// Store in parsedItems (metadata JSON)
items.push({
  workTitle: title,
  revenue: amount,  // Full precision from parseFloat
  performances,
  metadata: { ... }
});
```

### parseAmountValue Utility
File: `apps/backend/src/parsers/utils.ts` (lines 5-18)

```typescript
export function parseAmountValue(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove currency symbols, commas, spaces
  let cleaned = String(value).replace(/[$,\s]/g, '');
  
  // Handle parentheses as negative (accounting format)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  
  const parsed = parseFloat(cleaned);  // JavaScript float (15-17 decimal precision)
  return isNaN(parsed) ? 0 : parsed;
}
```

**Key Point:** The parser stores revenue as JavaScript `number` (64-bit float) in JSON metadata. This has ~15 decimal precision. The precision loss happens ONLY when creating StatementItems, based on the column definition at that time.

---

## 4. Payment Summary Data Source

### Payment Summary Endpoint
File: `apps/backend/src/routes/statement.routes.ts` (lines 546-630)

```typescript
router.get('/:id/payment-summary', authenticate, requireAdmin, async (req, res) => {
  // Fetches statement with ALL its StatementItems
  const statement = await prisma.statement.findUnique({
    where: { id },
    include: {
      items: {
        include: { user: { ... } }
      }
    }
  });
  
  // Groups items by writer and sums revenue
  statement.items.forEach(item => {
    writer.grossRevenue += Number(item.revenue);        // Line 594
    writer.commissionAmount += Number(item.commissionAmount); // Line 595
  });
  
  // Rounds totals to 2 decimals AFTER summing
  writer.grossRevenue = Math.round(writer.grossRevenue * 100) / 100;  // Line 602
  writer.commissionAmount = Math.round(writer.commissionAmount * 100) / 100;
  writer.netRevenue = Math.round((writer.grossRevenue - writer.commissionAmount) * 100) / 100;
});
```

### The Problem

**If StatementItems were created BEFORE migration:**
- Each `item.revenue` value: `4.11` (already rounded to 2 decimals)
- Sum of 1000 items: `4110.00` (accumulates rounding errors)
- Round to 2 decimals: `4110.00` (rounding AFTER doesn't help!)

**If StatementItems were created AFTER migration:**
- Each `item.revenue` value: `4.113851` (6 decimal precision)
- Sum of 1000 items: `4113.851` (accurate)
- Round to 2 decimals: `4113.85` (correct total!)

**Rounding AFTER aggregation cannot fix data that was ALREADY rounded before storage.**

---

## 5. Verification Steps

### Check When Statement Was Published
```sql
SELECT id, filename, publishedAt, paymentStatus, totalRevenue, totalCommission, totalNet
FROM statements
WHERE id = '<statement_id>';
```

**Compare publishedAt to migration time:**
- Migration ran: `2025-11-08 00:08:00` (based on git log)
- If `publishedAt < 2025-11-08 00:08:00`: StatementItems have OLD precision
- If `publishedAt >= 2025-11-08 00:08:00`: StatementItems have NEW precision

### Check StatementItem Precision
```sql
-- Check if items have 2-decimal or 6-decimal precision
SELECT id, workTitle, revenue, commissionAmount, netRevenue
FROM statement_items
WHERE statementId = '<statement_id>'
LIMIT 10;
```

**Look for:**
- 2-decimal values: `4.11`, `10.55`, `0.12` → Published BEFORE migration
- 6-decimal values: `4.113851`, `10.554732`, `0.123456` → Published AFTER migration

---

## 6. Fix Options

### Option A: Re-Publish Existing Statements (RECOMMENDED)

**How it works:**
1. Delete existing StatementItems for the statement
2. Re-run the PUBLISH logic (creates new StatementItems from parsedItems)
3. NEW StatementItems will use 6-decimal precision

**Pros:**
- Clean, uses existing publish logic
- Guaranteed accurate calculations

**Cons:**
- Changes `publishedAt` timestamp
- May affect payment history if already paid

**Implementation:**
```typescript
// Add new endpoint: POST /api/statements/:id/republish
router.post('/:id/republish', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  const statement = await prisma.statement.findUnique({ where: { id } });
  if (!statement) return res.status(404).json({ error: 'Statement not found' });
  
  // Verify not already paid
  if (statement.paymentStatus === 'PAID') {
    return res.status(400).json({ error: 'Cannot republish paid statements' });
  }
  
  await prisma.$transaction(async (tx) => {
    // Delete old items
    await tx.statementItem.deleteMany({ where: { statementId: id } });
    
    // Reset statement to PROCESSED status
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

**Usage:**
1. Admin calls `/api/statements/:id/republish` to reset statement
2. Admin re-publishes statement via UI (triggers normal publish flow)
3. NEW StatementItems created with 6-decimal precision

---

### Option B: Migrate Existing StatementItem Data

**How it works:**
1. For each statement published BEFORE migration
2. Recalculate StatementItems from `parsedItems` in metadata
3. Update existing StatementItem rows with new precision values

**Pros:**
- Preserves `publishedAt` timestamp
- Preserves StatementItem IDs
- No UI interaction needed

**Cons:**
- Complex migration script
- Risk of calculation mismatches
- Requires duplicate publish logic

**Implementation:**
```typescript
// Migration script: recalculate_statement_items.ts
import { prisma } from '../lib/prisma';

async function recalculateStatementItems() {
  // Find all statements published before migration
  const oldStatements = await prisma.statement.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lt: new Date('2025-11-08T00:08:00Z') }
    },
    include: { items: true }
  });
  
  console.log(`Found ${oldStatements.length} statements to recalculate`);
  
  for (const statement of oldStatements) {
    const metadata = statement.metadata as any;
    const parsedItems = metadata.parsedItems || [];
    const assignments = metadata.writerAssignments || {};
    
    // Fetch commission rate
    const activeCommission = await prisma.commissionSettings.findFirst({
      where: { isActive: true },
      orderBy: { effectiveDate: 'desc' }
    });
    const globalCommissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;
    
    // Recalculate each item
    let totalCommission = 0;
    let totalNet = 0;
    
    for (const item of parsedItems) {
      const assignmentKey = item.workTitle; // Adjust for MLC composite key if needed
      const songAssignments = assignments[assignmentKey] || [];
      
      for (const assignment of songAssignments) {
        const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
        const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
        const itemCommissionAmount = (writerRevenue * globalCommissionRate) / 100;
        const itemNetRevenue = writerRevenue - itemCommissionAmount;
        
        totalCommission += itemCommissionAmount;
        totalNet += itemNetRevenue;
        
        // Find matching StatementItem and update
        await prisma.statementItem.updateMany({
          where: {
            statementId: statement.id,
            userId: assignment.userId,
            workTitle: item.workTitle
          },
          data: {
            revenue: writerRevenue,
            commissionAmount: itemCommissionAmount,
            netRevenue: itemNetRevenue
          }
        });
      }
    }
    
    // Update statement totals
    await prisma.statement.update({
      where: { id: statement.id },
      data: {
        totalCommission,
        totalNet
      }
    });
    
    console.log(`✓ Recalculated statement ${statement.id}`);
  }
}
```

**Usage:**
```bash
npx ts-node scripts/recalculate_statement_items.ts
```

---

### Option C: Tell User to Process a NEW Statement

**How it works:**
1. User uploads and publishes a NEW statement
2. NEW StatementItems will automatically have 6-decimal precision
3. Old statements remain unchanged

**Pros:**
- No code changes needed
- Migration is already working for new data
- Simplest approach

**Cons:**
- Doesn't fix existing statements
- User must wait for next statement upload

---

## 7. Recommended Solution

**For the specific statement the user is looking at:**

1. **Check publishedAt timestamp:**
   ```sql
   SELECT publishedAt FROM statements WHERE id = '<statement_id>';
   ```

2. **If published BEFORE Nov 8 00:08:**
   - Use **Option A (Re-Publish)** if statement is UNPAID
   - Use **Option B (Data Migration)** if statement is PAID or needs to preserve history

3. **If published AFTER Nov 8 00:08:**
   - The issue is NOT the precision fix
   - Check for other bugs (parser logic, aggregation logic, etc.)

**For all future statements:**
- ✅ Migration is working correctly
- ✅ NEW statements will have 6-decimal precision
- ✅ Payment summaries will be accurate

---

## 8. Key Takeaways

1. **Database migrations do NOT retroactively fix data** - they only change schema
2. **Precision is determined at INSERT time** - based on column definition when row is created
3. **parsedItems in JSON have full precision** - it's preserved in metadata
4. **StatementItems store rounded values** - based on DECIMAL column precision
5. **Payment summaries aggregate StatementItems** - rounding after aggregation can't fix already-rounded data

**The user needs to either:**
- Re-publish the statement (if UNPAID)
- Run a data migration script (if PAID)
- Wait for the next statement upload (migration is working for new data)
