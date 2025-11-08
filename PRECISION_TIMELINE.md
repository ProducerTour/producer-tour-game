# Precision Fix Timeline - Visual Guide

## The Problem in a Nutshell

```
┌─────────────────────────────────────────────────────────────────┐
│ Migration changed SCHEMA but not DATA                           │
│                                                                  │
│ Before Migration: DECIMAL(12,2) → stores 4.11                  │
│ After Migration:  DECIMAL(12,6) → ALLOWS 4.113851              │
│                                 → but old data is still 4.11!   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Statement Processing Timeline

```
Upload Statement (CSV/TSV)
    ↓
Parse File
    ↓ parseAmountValue("$4.113851") → 4.113851
    ↓
Store in metadata.parsedItems (JSON)
    ├─ Full precision preserved: 4.113851
    └─ Stored as JavaScript number (~15 decimals)
    ↓
Assign Writers
    ↓
PUBLISH (creates StatementItems)
    ↓ writerRevenue = 4.113851
    ↓
    ├──→ BEFORE Nov 8 00:08 UTC
    │    Column: DECIMAL(12,2)
    │    Stored as: 4.11 ❌ (ROUNDED)
    │
    └──→ AFTER Nov 8 00:08 UTC
         Column: DECIMAL(12,6)
         Stored as: 4.113851 ✓ (ACCURATE)
    ↓
Payment Summary
    ├─ Aggregates StatementItem rows
    ├─ SUM(revenue) from database
    │
    ├──→ If items have 2-decimal precision
    │    SUM(4.11 + 10.55 + 0.12) = 14.78 ❌
    │    Missing: $0.057039
    │
    └──→ If items have 6-decimal precision
         SUM(4.113851 + 10.554732 + 0.123456) = 14.792039
         Rounded to 2 decimals: 14.79 ✓
```

---

## Migration Impact by Timestamp

```
┌──────────────────────────────────────────────────────────────────┐
│                  MIGRATION TIMESTAMP                              │
│              Nov 8, 2025 00:08:00 UTC                            │
├─────────────────────┬─────────────────────────────────────────────┤
│  BEFORE MIGRATION  │         AFTER MIGRATION                    │
├─────────────────────┼─────────────────────────────────────────────┤
│ Column Definition:  │ Column Definition:                        │
│   DECIMAL(12,2)     │   DECIMAL(12,6)                           │
│                     │                                           │
│ StatementItems:     │ StatementItems:                           │
│   revenue: 4.11     │   revenue: 4.113851                       │
│   commission: 0.20  │   commission: 0.205692                    │
│   netRevenue: 3.91  │   netRevenue: 3.908159                    │
│                     │                                           │
│ Payment Summary:    │ Payment Summary:                          │
│   ❌ INACCURATE     │   ✓ ACCURATE                              │
│   (rounded data)    │   (full precision)                        │
└─────────────────────┴─────────────────────────────────────────────┘
```

---

## Why Existing Data is NOT Fixed

### PostgreSQL ALTER TABLE Behavior

```sql
-- BEFORE migration (StatementItem row exists)
revenue: 4.11  (DECIMAL(12,2))

-- Migration runs
ALTER TABLE "StatementItem" ALTER COLUMN "revenue" TYPE DECIMAL(12,6);

-- AFTER migration (same row)
revenue: 4.110000  (DECIMAL(12,6))
                   ↑
                   Zero-padded, NOT recalculated!
```

**PostgreSQL does NOT recalculate values when changing precision.**
It only changes the column's STORAGE format.

Existing value `4.11` becomes `4.110000` (padded), NOT `4.113851` (original).

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      CSV/TSV FILE                                │
│  "Distributed Amount": "$4.113851"                              │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
                    parseFloat()
                         ↓
                    4.113851 (JavaScript number)
                         ↓
┌────────────────────────┴────────────────────────────────────────┐
│              statement.metadata.parsedItems                      │
│  { revenue: 4.113851, ... }  ← Full precision in JSON          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
                    PUBLISH step
                         ↓
┌────────────────────────┴────────────────────────────────────────┐
│                   StatementItem (database)                       │
│                                                                  │
│  BEFORE migration:                                              │
│    revenue DECIMAL(12,2) → stores 4.11 ❌                       │
│                                                                  │
│  AFTER migration:                                               │
│    revenue DECIMAL(12,6) → stores 4.113851 ✓                    │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
                  Payment Summary
                         ↓
┌────────────────────────┴────────────────────────────────────────┐
│               SUM(StatementItem.revenue)                         │
│                                                                  │
│  Old data: SUM(4.11, 10.55, ...) ❌ Rounding errors             │
│  New data: SUM(4.113851, 10.554732, ...) ✓ Accurate            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Fix Decision Tree

```
Is payment summary incorrect?
    ├─→ YES
    │   ↓
    │   Check statement.publishedAt timestamp
    │   ↓
    │   ├─→ publishedAt < Nov 8 00:08 UTC
    │   │   ↓
    │   │   StatementItems have OLD precision (2 decimals)
    │   │   ↓
    │   │   Is statement PAID?
    │   │   ↓
    │   │   ├─→ NO (UNPAID)
    │   │   │   ↓
    │   │   │   Use re-publish endpoint
    │   │   │   (Deletes items, resets status, re-publish via UI)
    │   │   │
    │   │   └─→ YES (PAID)
    │   │       ↓
    │   │       Use data migration script
    │   │       (Recalculates from metadata.parsedItems)
    │   │
    │   └─→ publishedAt >= Nov 8 00:08 UTC
    │       ↓
    │       StatementItems have NEW precision (6 decimals)
    │       ↓
    │       Issue is NOT precision-related
    │       ↓
    │       Check parser logic or aggregation code
    │
    └─→ NO
        ↓
        No action needed
```

---

## Example: 1000 Items with Rounding Errors

```
┌──────────────────────────────────────────────────────────────────┐
│                    OLD PRECISION (2 decimals)                     │
├──────────────────────────────────────────────────────────────────┤
│ Item 1:   $4.11   (actual: $4.113851 → lost $0.003851)          │
│ Item 2:  $10.55   (actual: $10.554732 → lost $0.004732)         │
│ Item 3:   $0.12   (actual: $0.123456 → lost $0.003456)          │
│ ...                                                              │
│ Item 1000: $2.34  (actual: $2.345678 → lost $0.005678)          │
├──────────────────────────────────────────────────────────────────┤
│ Total Lost: ~$3.00 - $5.00 per 1000 items                       │
│                                                                  │
│ For MLC statements with 10,000+ rows:                           │
│   Potential error: $30 - $50+                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    NEW PRECISION (6 decimals)                     │
├──────────────────────────────────────────────────────────────────┤
│ Item 1:   $4.113851   (accurate)                                │
│ Item 2:  $10.554732   (accurate)                                │
│ Item 3:   $0.123456   (accurate)                                │
│ ...                                                              │
│ Item 1000: $2.345678  (accurate)                                │
├──────────────────────────────────────────────────────────────────┤
│ Total Lost: $0.00                                               │
│                                                                  │
│ Rounding only happens at DISPLAY time (2 decimals)              │
│ Database stores 6 decimals for accurate aggregation             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **Migration changes SCHEMA, not DATA**
   - ALTER TABLE changes column definition
   - Existing rows keep their values (padded with zeros)

2. **Precision is set at INSERT time**
   - Column precision at the moment of INSERT determines storage
   - Old items: inserted when column was DECIMAL(12,2) → 2 decimals
   - New items: inserted when column is DECIMAL(12,6) → 6 decimals

3. **Full precision exists in metadata**
   - statement.metadata.parsedItems has original values
   - Can be used to recalculate StatementItems

4. **Rounding after aggregation doesn't help**
   - If data is already rounded, summing accumulates errors
   - Need to fix source data first

5. **Migration works for future data**
   - NEW statements automatically get 6-decimal precision
   - OLD statements need manual fix (re-publish or script)

---

## Quick Commands

```bash
# Check which statements need fixing
psql -c "SELECT id, filename, publishedAt FROM statements WHERE publishedAt < '2025-11-08 00:08:00' ORDER BY publishedAt DESC;"

# Preview recalculation (dry run)
npx ts-node apps/backend/src/scripts/recalculate_statement_items.ts --dry-run

# Fix all old statements
npx ts-node apps/backend/src/scripts/recalculate_statement_items.ts

# Fix specific statement
npx ts-node apps/backend/src/scripts/recalculate_statement_items.ts --statement=STATEMENT_ID

# Verify fix
psql -c "SELECT totalRevenue, totalCommission, totalNet, (totalRevenue - totalCommission - totalNet) as diff FROM statements WHERE id='STATEMENT_ID';"
```
