# Feature Ideas & Notes

## MLC Statement Processing - Data Validation Check

**Date:** 2025-12-10

**Problem Discovered:**
When processing MLC statements, we found that "Ian Chow" was mistakenly added to the PRESSURE placement instead of "Jackson Thomas". The MLC line showed writers: DEVANTE MCCREARY, JACKSON THOMAS, NATHANIEL BALL - but the Manage Placements had Ian Chow instead of Jackson.

**Feature Request:**
Add a validation check during MLC statement processing that:

1. **Cross-references MLC writer names with Placement Tracker credits**
   - When an MLC line lists writers (e.g., "DEVANTE MCCREARY, JACKSON THOMAS, NATHANIEL BALL")
   - Compare against the credits on the matched placement
   - Flag any discrepancies where MLC writer names don't match placement credits

2. **Alert scenarios:**
   - MLC shows a writer not on the placement (like Jackson Thomas missing)
   - Placement has a writer not on the MLC line (like Ian Chow being extra)
   - Potential typos or name variations

3. **UI Integration:**
   - Show warnings in the statement review screen before publishing
   - Allow admin to review and fix placement data before finalizing

**Benefit:** Catches data entry mistakes early, ensures accurate royalty distribution.
