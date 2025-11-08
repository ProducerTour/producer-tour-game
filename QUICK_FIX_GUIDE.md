# Payment Totals Fix - Quick Reference

## TL;DR

Migration was never applied. Totals are wrong because values are rounded to 2 decimals before storage.

**Solution:** Calculate payment summary from metadata (where full precision is preserved) instead of StatementItems.

---

## Step 1: Apply Migration (1 minute)

```bash
cd apps/backend
npx prisma migrate deploy
```

This fixes FUTURE statements. Existing statements still need metadata calculation.

---

## Step 2: Add Debug Endpoint (2 minutes)

Add to `/Users/nolangriffis/Documents/Producer Tour Wordperss/Producer-Tour-WP-Directory/producer-tour-react/apps/backend/src/routes/statement.routes.ts` before `export default router;`:

```typescript
router.get('/:id/debug', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  // See PAYMENT_SUMMARY_CODE_CHANGES.md for full code
});
```

Full code in: `PAYMENT_SUMMARY_CODE_CHANGES.md` - File 1

---

## Step 3: Replace Payment Summary Endpoint (5 minutes)

Replace EXISTING `/:id/payment-summary` route with version that calculates from metadata.

Full code in: `PAYMENT_SUMMARY_CODE_CHANGES.md` - File 2

Key change:
```typescript
// BEFORE: Sums StatementItems (rounded values)
statement.items.forEach(item => {
  writer.grossRevenue += Number(item.revenue); // 4.11
});

// AFTER: Recalculates from metadata (full precision)
parsedItems.forEach((item: any) => {
  const writerRevenue = (parseFloat(item.revenue) * splitPercentage) / 100; // 4.113851
  writer.grossRevenue += writerRevenue;
});
```

---

## Step 4: Test (2 minutes)

```bash
# Start backend
cd apps/backend
npm run dev

# In another terminal, test debug endpoint
curl http://localhost:3000/api/statements/<ID>/debug -H "Authorization: Bearer <TOKEN>"

# Check output
# - parsedItems.totalRevenue: Expected total (accurate)
# - statementItems.totalRevenue: Stored total (rounded)
# - discrepancy.revenueDiff: How much is missing
```

---

## Step 5: Deploy

If debug shows accurate totals from metadata:
1. Commit changes
2. Deploy to production
3. Verify payment summary shows correct totals

---

## Verification Checklist

After deploying:

- [ ] Migration applied? (Check: `npx prisma migrate status`)
- [ ] Debug endpoint returns data?
- [ ] Payment summary totals match parsedItems totals?
- [ ] Royalty Portal displays correct amounts?
- [ ] All statements (old and new) show accurate totals?

---

## Rollback Plan

If issues occur:

1. Revert payment summary endpoint to old version
2. Keep debug endpoint for troubleshooting
3. Migration is safe to keep (only helps future statements)

---

## Why This Fixes It

**Problem:**
- StatementItems store rounded values (4.11)
- Summing rounded values accumulates errors

**Solution:**
- `metadata.parsedItems` has full precision (4.113851)
- Calculate from metadata = accurate totals
- StatementItems still track payment state (paidAt, isVisibleToWriter)

**No republish needed** - works for all statements immediately.

---

## Files Reference

1. `PAYMENT_TOTALS_INVESTIGATION_SUMMARY.md` - Why this is happening
2. `PAYMENT_SUMMARY_FIX_OPTIONS.md` - All possible solutions
3. `PAYMENT_SUMMARY_CODE_CHANGES.md` - Implementation code
4. `QUICK_FIX_GUIDE.md` - This file (step-by-step)

---

## Expected Results

After fix:
- Payment summary shows accurate totals
- Matches original CSV totals
- Works for ALL statements (no republish needed)
- Future statements automatically use 6-decimal precision

---

## If Totals Are STILL Wrong

If metadata calculation STILL shows wrong totals:

1. Check debug endpoint output:
   - `parsedItems.count` vs CSV row count
   - `unassignedItems` - any rows missing assignments?
   - `sampleItems` - do revenues match CSV?

2. Possible issues:
   - Parser skipping rows (negative amounts, $0 values, etc.)
   - Assignment key mismatch (MLC composite keys)
   - Split percentage incorrect

3. Share debug output for deeper investigation

---

## Common Questions

**Q: Why not just fix StatementItems?**
A: Would require republishing every statement. Calculating from metadata works immediately for all statements.

**Q: Is it slower to calculate from metadata?**
A: Slightly (~50ms for 1000 rows), but acceptable for admin endpoint.

**Q: Will future statements have this problem?**
A: No - after migration applied, new StatementItems use 6-decimal precision.

**Q: What about the republish endpoint?**
A: Still useful for individual statements if needed, but not required with metadata calculation.
