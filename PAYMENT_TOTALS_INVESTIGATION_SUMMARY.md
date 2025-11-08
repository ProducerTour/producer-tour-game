# Payment Totals Investigation - Executive Summary

## Critical Finding

**The precision migration was never applied to the database.**

```bash
npx prisma migrate status
# Output: 20251108_increase_revenue_precision - NOT APPLIED
```

This is why delete/reupload didn't work:
- New statements still store values with DECIMAL(12,2) precision
- Rounding errors accumulate across thousands of rows
- Database schema never changed from 2-decimal to 6-decimal

---

## Root Cause: Precision Loss from Database Storage

### How It Happens

1. **Parser** reads CSV with full precision (e.g., $4.113851)
2. **Upload** stores in `metadata.parsedItems` as JavaScript number (full precision)
3. **Publish** creates StatementItems with DECIMAL(12,2) columns (rounds to $4.11)
4. **Payment Summary** sums StatementItems: $4.11 + $4.11 + ... = $4,110.00
5. **Actual total should be:** $4.113851 × 1000 = $4,113.85

**Lost:** $3.85 per 1000 rows (accumulating rounding errors)

### Why Migration Didn't Help

Migration changes the column definition but does NOT recalculate existing data:
- Before: `DECIMAL(12,2)` stores 4.11
- After: `DECIMAL(12,6)` stores 4.110000 (NOT 4.113851!)

Existing rows keep their rounded values, just with more trailing zeros.

---

## Recommended Solution: Calculate from Metadata

**Instead of using stored StatementItems, recalculate from source data on-the-fly.**

### Benefits
- Always accurate (uses full-precision values from metadata)
- No republish needed
- Works for ALL statements (old and new)
- StatementItems still track payment state (paidAt, isVisibleToWriter)
- No UI changes required

### Implementation

Change payment summary endpoint to:
1. Read `statement.metadata.parsedItems` (full precision)
2. Read `statement.metadata.writerAssignments`
3. Recalculate totals using same logic as publish
4. Return accurate totals

See: `PAYMENT_SUMMARY_CODE_CHANGES.md` for implementation details.

---

## Alternative Solutions

### Option 1: Apply Migration + Republish (Partial Fix)
```bash
cd apps/backend
npx prisma migrate deploy
```

Then for EACH old statement:
- Call `/api/statements/:id/republish` endpoint
- This deletes and recreates StatementItems with 6-decimal precision

**Pros:** Fixes stored data, migration is always beneficial
**Cons:** Must republish each statement individually, changes publishedAt timestamp

### Option 2: Calculate from Metadata (RECOMMENDED)
Change payment summary to aggregate from metadata instead of StatementItems.

**Pros:** No republish needed, always accurate, works for all statements
**Cons:** Slight performance overhead, duplicates calculation logic

### Option 3: Data Migration Script
Run a script to recalculate ALL existing StatementItems from metadata.

**Pros:** Fixes all data at once, preserves timestamps
**Cons:** Complex script, risk of errors, requires downtime

---

## Debug Checklist

Run debug endpoint to verify issue:

```bash
GET /api/statements/:id/debug
```

Check these values:
- **parsedItems.count**: Should match CSV row count
- **statementItems.count**: Should match total assignments
- **discrepancy.revenueDiff**: How much money is missing
- **discrepancy.percentDiff**: Is it >1% (calculation bug) or <1% (precision)?
- **precisionCheck.has6Decimals**: Was migration applied?
- **analysis.likelyIssue**: System's diagnosis

**If discrepancy > 1%:** Likely missing rows or calculation bug
**If discrepancy < 1%:** Likely precision issue (fixed by calculating from metadata)

---

## Action Plan

### Immediate (5 min)
1. Apply migration: `npx prisma migrate deploy`
2. Add debug endpoint (see code changes document)
3. Test on problematic statement

### Short-term (1 hour)
1. Implement metadata-based payment summary
2. Test accuracy against debug endpoint
3. Deploy to production

### Long-term (Optional)
1. Add validation to publish endpoint:
   - Verify StatementItems sum = parsedItems sum
   - Alert if discrepancy > 0.1%
2. Add admin UI showing:
   - Expected total (from metadata)
   - Stored total (from StatementItems)
   - Discrepancy amount
3. Add "Recalculate" button to fix individual statements

---

## Why This Happened

### Timeline
1. **Initial Implementation:** Used DECIMAL(12,2) (standard for currency)
2. **Problem Discovered:** Totals off by small amounts
3. **Migration Created:** Change to DECIMAL(12,6) for better precision
4. **Migration NOT Applied:** Database never updated
5. **Delete/Reupload Attempted:** Still used old precision (migration not applied)
6. **Totals Still Wrong:** Rounding errors persist

### Key Insight
The issue is NOT just precision - it's that precision loss happens BEFORE storage:
- JavaScript calculation: 4.113851 ✓ (accurate)
- Database insertion: 4.11 ✗ (rounded by column type)
- Aggregation: SUM(4.11) ✗ (accumulates rounding errors)

**Fix:** Either use 6-decimal storage OR calculate from metadata (which has full precision).

---

## Files Created

1. **PAYMENT_SUMMARY_FIX_OPTIONS.md** - Detailed analysis of all solutions
2. **PAYMENT_SUMMARY_CODE_CHANGES.md** - Implementation guide with code
3. **PAYMENT_TOTALS_INVESTIGATION_SUMMARY.md** - This executive summary

---

## Next Steps

**Recommended path:**
1. Apply migration immediately (it's safe and beneficial)
2. Add debug endpoint to verify issue
3. Implement metadata-based calculation for payment summary
4. Test on problematic statement
5. If accurate, deploy to production

**Why this path:**
- Minimal code changes
- No data migration needed
- Always accurate going forward
- Can fix old statements gradually via republish

**User should verify:**
- Apply migration first
- Test debug endpoint
- Share results if totals still wrong after metadata calculation
