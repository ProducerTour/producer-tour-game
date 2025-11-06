# Payment Processing System - Testing Guide

This guide walks through testing all 7 phases of the payment processing system.

## Prerequisites

- Backend deployed and running on Render
- Database migrations applied (`npx prisma migrate deploy`)
- Admin account: `admin@producertour.com`
- Test writer account (we'll create one)

---

## Phase 1-2: Commission Settings & Tracking

### What Was Built
- Commission settings table (global commission rate)
- Per-writer commission overrides
- Automatic commission calculation on statement items
- Commission tracking fields (rate, amount, recipient, netRevenue)

### Test Steps

#### 1. Set Global Commission Rate (Admin Settings Page)

**URL:** `/settings` (Admin only)

**Test:**
1. Login as admin
2. Navigate to Settings page
3. Set commission rate (e.g., 15%)
4. Set recipient name (e.g., "Producer Tour")
5. Click "Save Commission Settings"

**Expected Result:**
- Success message appears
- Settings are saved to database
- Commission will apply to all new statement items

#### 2. Set Per-Writer Commission Override

**URL:** `/writers` (Admin only)

**Test:**
1. Go to Writers page
2. Find or create a test writer
3. Click "Edit" on the writer
4. Set custom commission rate (e.g., 10% instead of global 15%)
5. Save

**Expected Result:**
- Writer-specific commission rate is saved
- This writer's statements will use 10% instead of 15%

#### 3. Verify Commission Calculation on Publish

**Test:**
1. Upload a BMI/ASCAP/SESAC statement CSV
2. Assign statements to the test writer (with 10% override)
3. Click "Publish Statement"
4. Check the statement items in database

**Expected Database Values:**
```
StatementItem:
- revenue: $1000 (gross)
- commissionRate: 10.00
- commissionAmount: $100
- netRevenue: $900 (what writer receives)
- commissionRecipient: "Producer Tour"
```

**API to Check:**
```bash
GET /api/statements/:id
```

---

## Phase 3: Payment Processing Backend

### What Was Built
- Payment status tracking (UNPAID → PENDING → PAID)
- `POST /api/statements/:id/process-payment` endpoint
- Payment date tracking (`paidAt` on statement items)
- Visibility control (`isVisibleToWriter` flag)

### Test Steps

#### 1. Check Initial Payment Status

**Test:**
1. Go to Statements page (Admin)
2. Find a PUBLISHED statement
3. Check payment status badge

**Expected:**
- Shows "UNPAID" badge (red)
- No payment date

#### 2. Process Payment

**URL:** Statements page → Click "Process Payment" button

**Test:**
1. Click "Process Payment" on an UNPAID statement
2. Confirm the action

**Expected API Call:**
```bash
POST /api/statements/:id/process-payment
```

**Expected Result:**
- Payment status changes to PAID
- Payment processed date appears
- All statement items get:
  - `isVisibleToWriter: true`
  - `paidAt: [current timestamp]`

#### 3. Verify Writer Can See Paid Statements

**Test:**
1. Login as the test writer
2. Go to Writer Dashboard
3. Check earnings summary

**Expected:**
- Writer now sees NET revenue (not gross)
- Only paid statements are visible
- Unpaid statements are hidden

---

## Phase 4: Writer Payment Status Indicators

### What Was Built
- `GET /api/dashboard/payment-status` endpoint
- Red/Yellow/Green status indicator on writer dashboard
- Payment timeline display

### Test Steps

#### 1. Check Payment Status Indicator (Writer View)

**URL:** `/dashboard` (Writer login)

**Test:**
1. Login as test writer
2. View dashboard

**Expected Indicators:**

**🔴 Red (No Payments):**
- Message: "No royalty statements yet"
- Displayed when: Writer has never been paid

**🟡 Yellow (Pending):**
- Message: "2 statements awaiting payment"
- Displayed when: Writer has unpaid statements

**🟢 Green (Recent Payment):**
- Message: "Last payment 5 days ago"
- Displayed when: Writer was paid within last 30 days

#### 2. Test Payment Timeline

**Test:**
1. Process multiple payments on different dates
2. Check writer dashboard timeline

**Expected:**
- Timeline shows monthly breakdown
- Only shows NET revenue (after commission)
- Only includes paid statements

---

## Phase 5-7: Smart Writer Matching

### What Was Built
- Fuzzy matching algorithm for writer assignment
- `POST /api/statements/:id/smart-assign` endpoint
- Confidence scoring (0-100%)
- Auto-assign, suggested, and unmatched categories

### Test Steps

#### 1. Upload Statement with Known Writer Names

**Test:**
1. Upload a CSV with writer names matching database
2. Click "Smart Assign Writers" button

**Expected API Call:**
```bash
POST /api/statements/:id/smart-assign
```

**Expected Response:**
```json
{
  "summary": {
    "totalSongs": 50,
    "autoAssignedCount": 35,
    "suggestedCount": 10,
    "unmatchedCount": 5
  },
  "autoAssigned": [
    {
      "workTitle": "Song Name",
      "writer": { "id": "...", "name": "John Doe" },
      "confidence": 95,
      "reason": "Exact IPI match"
    }
  ],
  "suggested": [...],
  "unmatched": [...]
}
```

#### 2. Test Matching Confidence Levels

**Test Cases:**

| Writer Name in CSV | Writer in DB | Expected Confidence | Category |
|-------------------|--------------|---------------------|----------|
| John Doe (IPI: 123) | John Doe (IPI: 123) | 100% | Auto-assign |
| John Doe | John Doe | 95% | Auto-assign |
| J. Doe | John Doe | 80% | Suggested |
| Johnny Doe | John Doe | 75% | Suggested |
| Random Name | John Doe | 0% | Unmatched |

---

## Full Payment Workflow Test (End-to-End)

### Scenario: Complete statement lifecycle

**Steps:**

1. **Admin uploads BMI statement**
   - CSV with 10 songs
   - Various writer names

2. **Smart assign writers**
   - 8 auto-assigned (>90% confidence)
   - 2 manually assigned

3. **Set commission settings**
   - Global: 15%
   - Test Writer: 10% override

4. **Publish statement**
   - Calculates commissions
   - Creates statement items
   - Status: PUBLISHED, UNPAID

5. **Verify admin dashboard**
   - Shows gross revenue: $10,000
   - Shows net revenue: $8,500 (after 15% avg commission)
   - Shows total commission: $1,500

6. **Verify writer dashboard (before payment)**
   - Shows $0 earnings
   - Payment status: 🟡 Yellow
   - Message: "1 statement awaiting payment"

7. **Process payment**
   - Admin clicks "Process Payment"
   - Status: UNPAID → PAID
   - Sets paidAt timestamp
   - Makes items visible to writer

8. **Verify writer dashboard (after payment)**
   - Shows net earnings: $900 (if writer had $1000 gross with 10% commission)
   - Payment status: 🟢 Green
   - Message: "Payment received today"

9. **Verify commission breakdown (admin)**
   - Total commissions: $100
   - Recipient: "Producer Tour"
   - Rate applied: 10% (writer override)

---

## API Testing with curl

### Test Commission Settings
```bash
# Get current settings
curl -X GET https://your-backend.onrender.com/api/settings/commission \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Update settings
curl -X POST https://your-backend.onrender.com/api/settings/commission \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commissionRate": 15,
    "recipientName": "Producer Tour",
    "description": "Standard commission rate"
  }'
```

### Test Payment Processing
```bash
# Process payment
curl -X POST https://your-backend.onrender.com/api/statements/STATEMENT_ID/process-payment \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check payment status
curl -X GET https://your-backend.onrender.com/api/dashboard/payment-status \
  -H "Authorization: Bearer YOUR_WRITER_TOKEN"
```

### Test Smart Matching
```bash
curl -X POST https://your-backend.onrender.com/api/statements/STATEMENT_ID/smart-assign \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Success Criteria

✅ **Phase 1-2:** Commissions calculate correctly on publish
✅ **Phase 3:** Payment processing changes status and visibility
✅ **Phase 4:** Writer sees correct payment status indicator
✅ **Phase 5-7:** Smart matching assigns writers accurately
✅ **End-to-End:** Complete workflow from upload → payment works

---

## Common Issues & Fixes

**Issue:** Writer sees gross revenue instead of net
**Fix:** Ensure `isVisibleToWriter` is only true after payment

**Issue:** Commission not calculating
**Fix:** Check CommissionSettings table has active record

**Issue:** Smart matching returns 0 matches
**Fix:** Ensure writers have firstName/lastName or IPI numbers

**Issue:** Payment status stuck on UNPAID
**Fix:** Run `POST /api/statements/:id/process-payment`
