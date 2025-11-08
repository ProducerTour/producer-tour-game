# Payment Summary Incorrect Totals - Investigation & Solutions

## Problem Summary

User reports incorrect payment totals even after:
1. Creating precision migration (DECIMAL 12,2 → 12,6)
2. Deleting and re-uploading statement
3. Using republish endpoint

This suggests the issue is MORE than just precision - there may be calculation bugs or data loss.

---

## Critical Discovery: Migration NOT Applied

```bash
npx prisma migrate status
# Output: Following migrations have not yet been applied:
# 20251108_increase_revenue_precision
```

**The precision migration never ran on the database!**

This explains why delete/reupload didn't work:
- New StatementItems still stored with DECIMAL(12,2) precision
- Rounding errors still accumulating
- Database schema hasn't changed

---

## Root Cause Analysis

### 1. Why Totals Are Wrong

**Option A: Precision Loss (Most Likely)**
- StatementItems store revenue with 2 decimal precision
- Summing 1000+ items accumulates rounding errors
- Example: 1000 items × $0.003 lost per item = $3 total error

**Option B: Missing Rows**
- Parser skips certain rows (negatives, $0, etc.)
- Not all parsedItems get converted to StatementItems
- Some writer assignments missing

**Option C: Calculation Bug**
- Split percentage applied incorrectly
- Commission calculated on wrong base
- Math operations in wrong order

---

## Immediate Fix: Apply Migration

```bash
cd apps/backend
npx prisma migrate deploy
```

This will:
- Apply the precision migration to database
- Change StatementItem columns to DECIMAL(12,6)
- Fix precision for FUTURE statements

**However:** This does NOT fix existing StatementItems (see below).

---

## Solution 1: On-the-Fly Recalculation (RECOMMENDED)

**Change payment summary to calculate from metadata instead of StatementItems.**

### Why This Works
- `statement.metadata.parsedItems` has FULL precision (JavaScript float)
- No rounding errors from database storage
- Always accurate, no republish needed
- StatementItems still used for payment tracking (paidAt, isVisibleToWriter)

### Implementation

File: `apps/backend/src/routes/statement.routes.ts`

```typescript
router.get(
  '/:id/payment-summary',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      // CHANGE: Calculate from metadata instead of StatementItems
      const metadata = statement.metadata as any;
      const parsedItems = metadata.parsedItems || [];
      const assignments = metadata.writerAssignments || {};

      // Fetch commission settings
      const activeCommission = await prisma.commissionSettings.findFirst({
        where: { isActive: true },
        orderBy: { effectiveDate: 'desc' },
      });
      const globalCommissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;

      // Get commission overrides
      const allUserIds = new Set<string>();
      Object.values(assignments).forEach((assignmentList: any) => {
        assignmentList.forEach((a: any) => {
          if (a.userId) allUserIds.add(a.userId);
        });
      });

      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: { id: true, email: true, firstName: true, lastName: true, commissionOverrideRate: true }
      });

      const userMap = new Map(users.map(u => [u.id, u]));
      const overrideMap = new Map<string, number>();
      users.forEach(u => {
        if (u.commissionOverrideRate !== null && u.commissionOverrideRate !== undefined) {
          overrideMap.set(u.id, Number(u.commissionOverrideRate));
        }
      });

      // Recalculate from parsedItems
      const writerMap = new Map();

      parsedItems.forEach((item: any) => {
        // Construct assignment key (handle MLC composite keys)
        let assignmentKey = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }

        const songAssignments = assignments[assignmentKey] || [];

        songAssignments.forEach((assignment: any) => {
          const userId = assignment.userId;
          if (!writerMap.has(userId)) {
            const user = userMap.get(userId);
            writerMap.set(userId, {
              userId,
              name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
              email: user?.email || 'unknown@example.com',
              grossRevenue: 0,
              commissionAmount: 0,
              netRevenue: 0,
              songCount: 0
            });
          }

          const writer = writerMap.get(userId);
          const splitPercentage = parseFloat(assignment.splitPercentage) || 100;
          const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
          const commissionRate = overrideMap.get(userId) ?? globalCommissionRate;
          const commissionAmount = (writerRevenue * commissionRate) / 100;

          writer.grossRevenue += writerRevenue;
          writer.commissionAmount += commissionAmount;
          writer.songCount += 1;
        });
      });

      // Round totals to 2 decimals AFTER summing
      for (const writer of writerMap.values()) {
        writer.grossRevenue = Math.round(writer.grossRevenue * 100) / 100;
        writer.commissionAmount = Math.round(writer.commissionAmount * 100) / 100;
        writer.netRevenue = Math.round((writer.grossRevenue - writer.commissionAmount) * 100) / 100;
      }

      const summary = {
        statement: {
          id: statement.id,
          proType: statement.proType,
          filename: statement.filename,
          publishedAt: statement.publishedAt,
          paymentStatus: statement.paymentStatus
        },
        totals: {
          grossRevenue: Number(statement.totalRevenue),
          commissionToProducerTour: Array.from(writerMap.values()).reduce((sum, w) => sum + w.commissionAmount, 0),
          netToWriters: Array.from(writerMap.values()).reduce((sum, w) => sum + w.netRevenue, 0),
          songCount: parsedItems.length
        },
        writers: Array.from(writerMap.values())
      };

      res.json(summary);
    } catch (error) {
      console.error('Get payment summary error:', error);
      res.status(500).json({ error: 'Failed to fetch payment summary' });
    }
  }
);
```

### Benefits
- No republish needed
- Always accurate (calculates from source data)
- Works for ALL statements (old and new)
- StatementItems still track payment state
- No UI changes needed

### Tradeoffs
- Payment summary endpoint is slower (more computation)
- Duplicates publish calculation logic
- Still stores imprecise values in StatementItems (but doesn't use them for totals)

---

## Solution 2: Debug Current Statement

Before changing code, verify what's actually wrong:

### Step 1: Count Rows
```typescript
// Add debug endpoint
router.get('/:id/debug', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  const statement = await prisma.statement.findUnique({
    where: { id },
    include: { items: true }
  });
  
  const metadata = statement.metadata as any;
  const parsedItems = metadata.parsedItems || [];
  const assignments = metadata.writerAssignments || {};
  
  // Count assignments
  let totalAssignments = 0;
  for (const assignmentList of Object.values(assignments)) {
    totalAssignments += (assignmentList as any).length;
  }
  
  // Calculate expected totals from parsedItems
  const activeCommission = await prisma.commissionSettings.findFirst({
    where: { isActive: true },
    orderBy: { effectiveDate: 'desc' }
  });
  const commissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;
  
  let expectedGross = 0;
  let expectedCommission = 0;
  parsedItems.forEach((item: any) => {
    const revenue = parseFloat(item.revenue);
    expectedGross += revenue;
    expectedCommission += (revenue * commissionRate) / 100;
  });
  
  // Calculate actual totals from StatementItems
  let actualGross = 0;
  let actualCommission = 0;
  statement.items.forEach(item => {
    actualGross += Number(item.revenue);
    actualCommission += Number(item.commissionAmount);
  });
  
  res.json({
    parsedItems: {
      count: parsedItems.length,
      totalRevenue: expectedGross,
      expectedCommission: expectedCommission,
      expectedNet: expectedGross - expectedCommission
    },
    assignments: {
      songCount: Object.keys(assignments).length,
      totalAssignments: totalAssignments
    },
    statementItems: {
      count: statement.items.length,
      totalRevenue: actualGross,
      totalCommission: actualCommission,
      totalNet: actualGross - actualCommission
    },
    discrepancy: {
      revenueDiff: actualGross - expectedGross,
      commissionDiff: actualCommission - expectedCommission,
      itemCountDiff: statement.items.length - totalAssignments
    },
    statement: {
      totalRevenue: Number(statement.totalRevenue),
      totalCommission: Number(statement.totalCommission),
      totalNet: Number(statement.totalNet)
    }
  });
});
```

Call: `GET /api/statements/:id/debug`

### Step 2: Check Sample Values
```typescript
// Add to debug endpoint
const sampleItems = parsedItems.slice(0, 5).map((item: any) => ({
  workTitle: item.workTitle,
  parsedRevenue: item.revenue,
  assignments: assignments[item.workTitle] || []
}));

const sampleStatementItems = statement.items.slice(0, 5).map(item => ({
  workTitle: item.workTitle,
  revenue: Number(item.revenue),
  commissionAmount: Number(item.commissionAmount),
  netRevenue: Number(item.netRevenue),
  splitPercentage: Number(item.splitPercentage)
}));

// Add to response
debug: {
  sampleParsedItems: sampleItems,
  sampleStatementItems: sampleStatementItems
}
```

### Step 3: Check for Missing Rows
```typescript
// Check if all parsedItems have assignments
const unassignedItems = parsedItems.filter((item: any) => {
  let key = item.workTitle;
  if (metadata.pro === 'MLC') {
    const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
    const dspName = item.metadata?.dspName || 'none';
    key = `${item.workTitle}|${publisherIpi}|${dspName}`;
  }
  const songAssignments = assignments[key] || [];
  return songAssignments.length === 0;
});

// Add to response
unassignedItems: unassignedItems.map(i => ({
  workTitle: i.workTitle,
  revenue: i.revenue,
  metadata: i.metadata
}))
```

---

## Solution 3: Hybrid Approach

**Keep StatementItems for payment tracking, add calculated fields for display.**

### Database View (PostgreSQL)
```sql
CREATE VIEW statement_item_accurate AS
SELECT 
  si.id,
  si.statementId,
  si.userId,
  si.workTitle,
  si.isVisibleToWriter,
  si.paidAt,
  -- Calculate revenue from statement metadata
  (s.metadata->'parsedItems'->si.rowIndex->>'revenue')::DECIMAL(12,6) * si.splitPercentage / 100 AS revenue_accurate,
  -- Store original for comparison
  si.revenue AS revenue_stored,
  si.commissionAmount,
  si.netRevenue
FROM statement_items si
JOIN statements s ON s.id = si.statementId;
```

**Problem:** Hard to map StatementItem to parsedItems row (no rowIndex stored).

**Better:** Just use Solution 1 (calculate from metadata on query).

---

## Solution 4: Fix the Publish Endpoint

If the issue is in HOW StatementItems are created (not just precision), fix the publish logic:

### Potential Bugs to Check

1. **MLC Composite Key Mismatch**
   ```typescript
   // Publish uses:
   assignmentKey = `${item.workTitle}|${publisherIpi}|${dspName}`;
   
   // But what if Smart Assign uses different format?
   // Check: apps/backend/src/utils/writer-matcher.ts
   ```

2. **Split Percentage Not Applied**
   ```typescript
   // Line 444: Is splitPercentage always correct?
   const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100;
   
   // Debug: Log splitPercentage values
   console.log({ workTitle, splitPercentage, originalRevenue: item.revenue, writerRevenue });
   ```

3. **Commission Override Not Applied**
   ```typescript
   // Line 445: Is overrideMap populated correctly?
   const commissionRateToUse = overrideMap.get(assignment.userId) ?? globalCommissionRate;
   
   // Debug: Log which rate is used
   console.log({ userId: assignment.userId, overrideRate: overrideMap.get(assignment.userId), globalRate: globalCommissionRate });
   ```

---

## Recommended Action Plan

### Immediate (5 minutes)
1. Apply migration: `npx prisma migrate deploy`
2. Add debug endpoint (Solution 2)
3. Call debug endpoint on problematic statement
4. Share results with user

### Short-term (1 hour)
1. Implement Solution 1 (calculate from metadata)
2. Test on problematic statement
3. Verify totals match expected values
4. Deploy to production

### Long-term (2 hours)
1. Add comprehensive logging to publish endpoint
2. Add validation checks:
   - All parsedItems have assignments
   - Sum of StatementItems = sum of parsedItems
   - No negative revenues
   - No missing writers
3. Add admin UI to compare:
   - parsedItems totals
   - StatementItems totals
   - Statement totals
4. Add "Recalculate Totals" button (runs Solution 1 logic, updates statement totals)

---

## Why Delete/Reupload Didn't Work

1. **Migration not applied** → New StatementItems still have 2-decimal precision
2. **Same calculation logic** → Same rounding errors
3. **Same assignment data** → If assignments were wrong, they're still wrong

**To truly test delete/reupload:**
1. Apply migration first
2. Delete statement completely (including assignments in metadata)
3. Re-upload CSV
4. Re-run Smart Assign
5. Re-publish
6. Check totals

---

## Debug Checklist

Run through these checks with the user:

- [ ] Migration applied? (`npx prisma migrate status`)
- [ ] How many parsedItems? (from metadata)
- [ ] How many StatementItems? (from database)
- [ ] How many assignments? (from metadata.writerAssignments)
- [ ] Do counts match? (parsedItems × splits = StatementItems)
- [ ] Sample revenue values - 2 decimals or 6? (from StatementItems)
- [ ] Expected total from parsedItems? (sum of item.revenue)
- [ ] Actual total from StatementItems? (sum of revenue)
- [ ] Discrepancy amount? (expected - actual)
- [ ] Discrepancy percentage? (discrepancy / expected × 100)

If discrepancy > 1%: Likely missing rows or calculation bug
If discrepancy < 1%: Likely precision issue

---

## Next Steps

**User should:**
1. Apply migration
2. Try Solution 1 (on-the-fly recalculation)
3. If totals still wrong, run debug endpoint
4. Share debug output for further analysis

**If Solution 1 shows correct totals:**
- Issue was precision (fixed by calculating from metadata)
- Keep this as permanent fix

**If Solution 1 STILL shows wrong totals:**
- Issue is in parser or assignments
- Need deeper investigation (check parsedItems, check assignments)
