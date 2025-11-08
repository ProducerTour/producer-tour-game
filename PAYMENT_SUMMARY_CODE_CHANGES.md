# Payment Summary Fix - Code Changes

## File 1: Add Debug Endpoint

**File:** `apps/backend/src/routes/statement.routes.ts`

**Location:** Add BEFORE the export statement (around line 1013)

```typescript
/**
 * GET /api/statements/:id/debug
 * Debug payment discrepancies (Admin only)
 */
router.get(
  '/:id/debug',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      const metadata = statement.metadata as any;
      const parsedItems = metadata.parsedItems || [];
      const assignments = metadata.writerAssignments || {};

      // Count assignments
      let totalAssignments = 0;
      for (const assignmentList of Object.values(assignments)) {
        totalAssignments += (assignmentList as any).length;
      }

      // Fetch commission settings
      const activeCommission = await prisma.commissionSettings.findFirst({
        where: { isActive: true },
        orderBy: { effectiveDate: 'desc' }
      });
      const commissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;

      // Calculate expected totals from parsedItems
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

      // Check for unassigned items
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

      // Sample data
      const sampleParsedItems = parsedItems.slice(0, 5).map((item: any) => {
        let key = item.workTitle;
        if (metadata.pro === 'MLC') {
          const publisherIpi = item.metadata?.originalPublisherIpi || 'none';
          const dspName = item.metadata?.dspName || 'none';
          key = `${item.workTitle}|${publisherIpi}|${dspName}`;
        }
        return {
          workTitle: item.workTitle,
          revenue: item.revenue,
          assignmentKey: key,
          assignments: assignments[key] || []
        };
      });

      const sampleStatementItems = statement.items.slice(0, 5).map(item => ({
        workTitle: item.workTitle,
        revenue: Number(item.revenue),
        commissionAmount: Number(item.commissionAmount),
        netRevenue: Number(item.netRevenue),
        splitPercentage: Number(item.splitPercentage),
        userId: item.userId
      }));

      // Check precision (2 vs 6 decimals)
      const precisionCheck = statement.items.slice(0, 10).map(item => {
        const revStr = item.revenue.toString();
        const decimals = revStr.includes('.') ? revStr.split('.')[1].length : 0;
        return {
          revenue: Number(item.revenue),
          decimalsStored: decimals,
          isPrecise: decimals > 2
        };
      });

      const discrepancy = {
        revenueDiff: actualGross - expectedGross,
        commissionDiff: actualCommission - expectedCommission,
        itemCountDiff: statement.items.length - totalAssignments,
        percentDiff: ((actualGross - expectedGross) / expectedGross * 100).toFixed(2) + '%'
      };

      res.json({
        statement: {
          id: statement.id,
          filename: statement.filename,
          proType: statement.proType,
          publishedAt: statement.publishedAt,
          totalRevenue: Number(statement.totalRevenue),
          totalCommission: Number(statement.totalCommission),
          totalNet: Number(statement.totalNet)
        },
        parsedItems: {
          count: parsedItems.length,
          totalRevenue: Math.round(expectedGross * 100) / 100,
          expectedCommission: Math.round(expectedCommission * 100) / 100,
          expectedNet: Math.round((expectedGross - expectedCommission) * 100) / 100,
          unassignedCount: unassignedItems.length,
          sampleItems: sampleParsedItems
        },
        assignments: {
          songCount: Object.keys(assignments).length,
          totalAssignments: totalAssignments
        },
        statementItems: {
          count: statement.items.length,
          totalRevenue: Math.round(actualGross * 100) / 100,
          totalCommission: Math.round(actualCommission * 100) / 100,
          totalNet: Math.round((actualGross - actualCommission) * 100) / 100,
          sampleItems: sampleStatementItems
        },
        precisionCheck: {
          samples: precisionCheck,
          has6Decimals: precisionCheck.some(p => p.isPrecise),
          allHave6Decimals: precisionCheck.every(p => p.isPrecise)
        },
        discrepancy,
        analysis: {
          migrationApplied: precisionCheck.some(p => p.isPrecise),
          likelyIssue: Math.abs(discrepancy.revenueDiff) > (expectedGross * 0.01)
            ? 'Missing rows or calculation bug (>1% error)'
            : 'Precision rounding (<1% error)',
          unassignedItems: unassignedItems.length > 0
            ? `${unassignedItems.length} items have no writer assignments`
            : 'All items have assignments'
        }
      });
    } catch (error) {
      console.error('Debug statement error:', error);
      res.status(500).json({ error: 'Failed to debug statement' });
    }
  }
);
```

---

## File 2: Replace Payment Summary Endpoint

**File:** `apps/backend/src/routes/statement.routes.ts`

**Location:** Replace EXISTING `/payment-summary` route (lines 697-785)

```typescript
/**
 * GET /api/statements/:id/payment-summary
 * Get detailed payment breakdown for a statement (Admin only)
 * CALCULATES FROM METADATA for accuracy (not StatementItems)
 */
router.get(
  '/:id/payment-summary',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const statement = await prisma.statement.findUnique({
        where: { id }
      });

      if (!statement) {
        return res.status(404).json({ error: 'Statement not found' });
      }

      // CHANGE: Calculate from metadata instead of StatementItems
      const metadata = statement.metadata as any;
      const parsedItems = metadata.parsedItems || [];
      const assignments = metadata.writerAssignments || {};

      if (parsedItems.length === 0) {
        return res.status(400).json({
          error: 'No parsed items found in statement metadata'
        });
      }

      // Fetch commission settings
      const activeCommission = await prisma.commissionSettings.findFirst({
        where: { isActive: true },
        orderBy: { effectiveDate: 'desc' },
      });
      const globalCommissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;

      // Get all assigned user IDs
      const allUserIds = new Set<string>();
      Object.values(assignments).forEach((assignmentList: any) => {
        if (Array.isArray(assignmentList)) {
          assignmentList.forEach((a: any) => {
            if (a.userId) allUserIds.add(a.userId);
          });
        }
      });

      // Fetch user data and commission overrides
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          commissionOverrideRate: true
        }
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
      let totalGross = 0;
      let totalCommission = 0;

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
              name: user
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
                : 'Unknown Writer',
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

          totalGross += writerRevenue;
          totalCommission += commissionAmount;
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
          grossRevenue: Math.round(totalGross * 100) / 100,
          commissionToProducerTour: Math.round(totalCommission * 100) / 100,
          netToWriters: Math.round((totalGross - totalCommission) * 100) / 100,
          songCount: parsedItems.length
        },
        writers: Array.from(writerMap.values()),
        metadata: {
          calculatedFrom: 'metadata.parsedItems',
          note: 'Totals calculated from source data for accuracy'
        }
      };

      res.json(summary);
    } catch (error) {
      console.error('Get payment summary error:', error);
      res.status(500).json({ error: 'Failed to fetch payment summary' });
    }
  }
);
```

---

## File 3: Update Unpaid Statements Endpoint

**File:** `apps/backend/src/routes/statement.routes.ts`

**Location:** Update EXISTING `/unpaid` route (lines 165-275)

**Change:** Replace lines 212-256 with the same calculation logic from payment-summary above.

```typescript
// BEFORE (lines 212-256):
const formatted = unpaidStatements.map(statement => {
  // Group items by writer
  const writerMap = new Map();

  statement.items.forEach(item => {
    const key = item.userId;
    if (!writerMap.has(key)) {
      writerMap.set(key, {
        userId: item.userId,
        name: `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || item.user.email,
        email: item.user.email,
        grossRevenue: 0,
        commissionAmount: 0,
        netRevenue: 0,
        songCount: 0
      });
    }

    const writer = writerMap.get(key);
    writer.grossRevenue += Number(item.revenue);
    writer.commissionAmount += Number(item.commissionAmount);
    writer.songCount += 1;
  });

  // Calculate netRevenue fresh: gross - commission
  // Round totals to 2 decimals AFTER summing all rows for accuracy
  for (const writer of writerMap.values()) {
    writer.grossRevenue = Math.round(writer.grossRevenue * 100) / 100;
    writer.commissionAmount = Math.round(writer.commissionAmount * 100) / 100;
    writer.netRevenue = Math.round((writer.grossRevenue - writer.commissionAmount) * 100) / 100;
  }

  return {
    id: statement.id,
    proType: statement.proType,
    filename: statement.filename,
    publishedAt: statement.publishedAt,
    paymentStatus: statement.paymentStatus,
    totalRevenue: Number(statement.totalRevenue),
    totalCommission: Number(statement.totalCommission),
    totalNet: Number(statement.totalNet),
    writerCount: writerMap.size,
    writers: Array.from(writerMap.values())
  };
});

// AFTER (replace with):
const formatted = unpaidStatements.map(statement => {
  const metadata = statement.metadata as any;
  const parsedItems = metadata.parsedItems || [];
  const assignments = metadata.writerAssignments || {};

  // Get commission settings
  const activeCommission = await prisma.commissionSettings.findFirst({
    where: { isActive: true },
    orderBy: { effectiveDate: 'desc' }
  });
  const globalCommissionRate = activeCommission ? Number(activeCommission.commissionRate) : 0;

  // Build user map from statement items (already loaded)
  const userMap = new Map();
  statement.items.forEach(item => {
    if (!userMap.has(item.userId)) {
      userMap.set(item.userId, item.user);
    }
  });

  // Get commission overrides
  const allUserIds = Array.from(userMap.keys());
  const usersWithOverrides = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, commissionOverrideRate: true }
  });
  const overrideMap = new Map<string, number>();
  usersWithOverrides.forEach(u => {
    if (u.commissionOverrideRate !== null && u.commissionOverrideRate !== undefined) {
      overrideMap.set(u.id, Number(u.commissionOverrideRate));
    }
  });

  // Recalculate from parsedItems
  const writerMap = new Map();

  parsedItems.forEach((item: any) => {
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

  // Round totals
  for (const writer of writerMap.values()) {
    writer.grossRevenue = Math.round(writer.grossRevenue * 100) / 100;
    writer.commissionAmount = Math.round(writer.commissionAmount * 100) / 100;
    writer.netRevenue = Math.round((writer.grossRevenue - writer.commissionAmount) * 100) / 100;
  }

  return {
    id: statement.id,
    proType: statement.proType,
    filename: statement.filename,
    publishedAt: statement.publishedAt,
    paymentStatus: statement.paymentStatus,
    totalRevenue: Number(statement.totalRevenue),
    totalCommission: Array.from(writerMap.values()).reduce((sum, w) => sum + w.commissionAmount, 0),
    totalNet: Array.from(writerMap.values()).reduce((sum, w) => sum + w.netRevenue, 0),
    writerCount: writerMap.size,
    writers: Array.from(writerMap.values())
  };
});
```

**WAIT!** The `/unpaid` endpoint uses `.map()` which can't use `await`. Need to change to loop:

```typescript
// Replace the .map() with a for loop
const formatted = [];

for (const statement of unpaidStatements) {
  const metadata = statement.metadata as any;
  const parsedItems = metadata.parsedItems || [];
  const assignments = metadata.writerAssignments || {};

  // ... (rest of logic from above)

  formatted.push({
    id: statement.id,
    proType: statement.proType,
    // ... (rest of return object)
  });
}
```

---

## Testing Steps

### 1. Apply Migration
```bash
cd apps/backend
npx prisma migrate deploy
```

### 2. Test Debug Endpoint
```bash
curl -X GET http://localhost:3000/api/statements/<STATEMENT_ID>/debug \
  -H "Authorization: Bearer <TOKEN>"
```

Expected output:
- `parsedItems.count` should match number of rows in CSV
- `statementItems.count` should match total assignments
- `discrepancy.revenueDiff` shows difference between expected and actual
- `precisionCheck.has6Decimals` shows if migration was applied
- `analysis.likelyIssue` suggests the root cause

### 3. Test New Payment Summary
```bash
curl -X GET http://localhost:3000/api/statements/<STATEMENT_ID>/payment-summary \
  -H "Authorization: Bearer <TOKEN>"
```

Expected output:
- `totals` should be accurate (calculated from metadata)
- `writers` should show correct per-writer totals
- `metadata.calculatedFrom` confirms source

### 4. Compare Totals
Compare debug vs payment-summary:
- Debug `parsedItems.totalRevenue` should = Payment Summary `totals.grossRevenue`
- Both should be accurate

---

## Rollback Plan

If the new code causes issues:

1. **Revert payment-summary endpoint** to use StatementItems
2. **Keep debug endpoint** for troubleshooting
3. **Apply migration** anyway (it's always beneficial)
4. **Use republish endpoint** to fix individual statements

---

## Performance Considerations

The new payment-summary endpoint:
- Loads metadata from JSON (fast)
- Iterates parsedItems (O(n) where n = rows)
- Fetches users (1 query, limited to assigned writers)
- Fetches commission settings (1 query, 1 row)

**Total:** ~50ms for 1000 rows (acceptable for admin endpoint)

If too slow, add caching or compute on publish.
