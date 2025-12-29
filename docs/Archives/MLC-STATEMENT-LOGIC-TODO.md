# MLC Statement Processing Logic - TODO

## Background

MLC (Mechanical Licensing Collective) is **not a PRO** like BMI/ASCAP. It handles mechanical royalties, not performance royalties.

## Current Behavior (Incorrect for MLC)

The `split-calculator.ts` filters by PRO:
```typescript
if (filters.proAffiliation) {
  const writerPro = credit.pro || credit.user?.writerProAffiliation;
  if (writerPro !== filters.proAffiliation) {
    // EXCLUDED
  }
}
```

If an MLC statement is uploaded with `proAffiliation: 'MLC'`, only credits with `pro: 'MLC'` would match - which is wrong since writers don't have MLC as their PRO.

## Options to Discuss

### Option 1: Split Among ALL Writers
- Ignore PRO filter for MLC statements
- Distribute based on split percentages to all credits on the placement

### Option 2: Split Among PT-Published Writers Only
- Check if credit has PT's publisher IPI
- Only writers published by PT get MLC royalties
- External collaborators (with their own publishers) are excluded

### Option 3: Hybrid Approach
- Check if the line item in the MLC statement has an "original publisher" field
- If no original publisher → split among PT writers
- If original publisher exists → that publisher handles it

## Questions to Answer

1. When PT receives an MLC statement, are ALL line items for PT-published writers?
2. Or does the MLC statement include lines for external collaborators too?
3. Should the split be based on the same percentages as BMI/ASCAP, or different?

## Implementation Notes

When ready to implement, update `split-calculator.ts`:
```typescript
// For MLC statements, skip PRO filter entirely
if (filters.proAffiliation && filters.proAffiliation !== 'MLC') {
  // Apply PRO filter for BMI/ASCAP
} else if (filters.proAffiliation === 'MLC') {
  // Apply MLC-specific logic (TBD)
}
```

---

*Created: 2024-12-09*
*Status: Pending discussion*
