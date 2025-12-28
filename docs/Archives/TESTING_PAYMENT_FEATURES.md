# Testing Payment Features

This guide walks you through testing all 4 payment features that were just added.

## Prerequisites

- PostgreSQL database running
- Backend and frontend dev servers running
- At least one admin user account
- At least one unpaid statement with parsed data

## Quick Start

### 1. Start the Development Servers

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
npm run dev
```

### 2. Verify Setup

- Backend should be running on `http://localhost:3000`
- Frontend should be running on `http://localhost:5173`
- Check backend logs for:
  - `✅ Email service configured successfully` (if SMTP is set up)
  - OR `⚠️ Email service not configured` (if SMTP not set up - this is fine!)

---

## Feature Testing

### Feature 1: CSV/Excel Accounting Export ✅

**What to test:** Export payment data in multiple formats

**Steps:**

1. **Login as admin** at `http://localhost:5173`

2. **Navigate to Royalty Portal** (`/admin/royalty-portal`)

3. **Process a test payment:**
   - Find an unpaid statement in the table
   - Click the "View Details" button (eye icon)
   - In the payment summary modal, click "Process Payment"
   - Confirm the action

4. **Test Single Statement Export:**
   - In the same modal, you should now see export buttons:
     - Click **"Export CSV"** - should download a CSV file
     - Click **"Export QuickBooks"** - should download a QuickBooks-compatible CSV

5. **Test Unpaid Summary Export:**
   - Close the modal
   - In the page header, click **"Export All Unpaid"**
   - Should download a CSV with summary of all unpaid statements

**Expected Results:**
- ✅ CSV files download without errors
- ✅ CSV contains correct payment data (writer names, amounts, dates)
- ✅ QuickBooks format has dual entries (commission + royalty expense)
- ✅ Files can be opened in Excel/Numbers/Google Sheets

**Sample CSV Content:**
```csv
Statement ID,PRO,Filename,Published Date,Payment Date,Writer Name,Writer Email,Song Count,Gross Revenue,Commission Rate (%),Commission Amount,Net Payment,Payment Status
abc123,BMI,bmi-q1-2024.csv,2024-01-15,2024-01-20,John Smith,john@example.com,5,1000,30,300,700,PAID
```

---

### Feature 2: Bulk Payment Processing ✅

**What to test:** Select and process multiple statements at once

**Steps:**

1. **Create multiple unpaid statements** (if you don't have them):
   - Upload 2-3 different PRO statements
   - Make sure they're parsed successfully
   - Leave them unpaid

2. **Test Multi-Select:**
   - Go to Royalty Portal
   - Check the checkbox in the header (should select all statements)
   - Uncheck it (should deselect all)
   - Manually select 2-3 individual statements by checking their checkboxes

3. **Test Bulk Action Bar:**
   - When statements are selected, a purple bar should appear at the top
   - It should show: "X statements selected" and a "Process X Payments" button

4. **Process Bulk Payment:**
   - Click "Process X Payments"
   - Confirm the action
   - Watch the UI update as payments are processed

**Expected Results:**
- ✅ Checkboxes work correctly (select/deselect)
- ✅ Bulk action bar appears when statements are selected
- ✅ Success message shows how many payments were processed
- ✅ Statements move from unpaid to paid status
- ✅ If any fail, you see a count of failures

**Error Case Testing:**
- Try processing a statement that's already paid (should fail gracefully)
- Select 0 statements and try to process (should show alert)

---

### Feature 3: Email Notifications 📧

**What to test:** Writers receive emails when payments are processed

**Option A: Test WITHOUT SMTP (Skip Email Testing)**

If you don't want to set up email right now, that's fine! The feature will:
- Log a warning: `Email service not configured - skipping payment notification`
- Continue processing payments normally
- You can set up email later in production

**Option B: Test WITH SMTP (Recommended for Full Testing)**

**Setup SMTP (Gmail Example):**

1. **Create App Password for Gmail:**
   - Go to https://myaccount.google.com/security
   - Enable 2-factor authentication if not enabled
   - Go to "App passwords"
   - Create a new app password for "Mail"
   - Copy the 16-character password

2. **Configure Environment Variables:**

   Edit `apps/backend/.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   EMAIL_FROM=Producer Tour <noreply@producertour.com>
   FRONTEND_URL=http://localhost:5173
   ```

3. **Restart Backend Server:**
   - Stop the backend (Ctrl+C)
   - Run `npm run dev` again
   - You should see: `✅ Email service configured successfully`

**Testing Steps:**

1. **Create a test writer** with YOUR email address:
   - Use your real email so you can receive the test email
   - Make sure the writer has songs in an unpaid statement

2. **Process a payment:**
   - Go to Royalty Portal
   - Process a statement that includes your test writer
   - Click "Process Payment"

3. **Check your email:**
   - You should receive an email within 1-2 minutes
   - Subject: "Payment Processed - {PRO} Royalties"

**Expected Email Content:**
- ✅ Beautiful HTML design with gradient header
- ✅ Payment summary table showing:
  - Statement filename
  - Payment date
  - Number of songs
  - Gross revenue
  - Commission (rate and amount)
  - Net payment
- ✅ "View Full Statement" button linking to dashboard
- ✅ Plain text fallback for email clients that don't support HTML

**SMTP Troubleshooting:**

If emails aren't sending:

1. **Check backend logs** for errors:
   ```
   ✅ Payment notification sent to writer@example.com
   ```
   OR
   ```
   ❌ Failed to send payment notification to writer@example.com: [error]
   ```

2. **Common issues:**
   - Wrong app password (must be 16 characters, no spaces)
   - 2FA not enabled on Gmail
   - Gmail blocking "less secure apps" (use app password instead)
   - SMTP_USER doesn't match the Gmail account

3. **Test SMTP connection directly:**
   - Add a test route in backend or use a SMTP testing tool
   - Verify credentials work outside the app first

**Alternative SMTP Providers:**

If Gmail doesn't work, try:

- **Mailtrap (Testing)**: https://mailtrap.io (catches all emails, perfect for testing)
- **SendGrid**: https://sendgrid.com (free tier: 100 emails/day)
- **Mailgun**: https://mailgun.com (free tier: 5,000 emails/month)
- **AWS SES**: https://aws.amazon.com/ses/ (very cheap, requires verification)

---

### Feature 4: Stripe Integration Framework 📚

**What to test:** Documentation and framework (not active yet)

**Steps:**

1. **Review the integration guide:**
   - Open `PAYMENT_INTEGRATION.md`
   - Review the 5 payment provider options
   - Choose which integration method you want to use

2. **Verify service structure:**
   - Open `apps/backend/src/services/stripe.service.ts`
   - Confirm the code is ready to uncomment when needed
   - Review the 3 integration methods available

**This feature doesn't need active testing** - it's a framework ready to activate when you:
- Create a Stripe account
- Get API keys
- Uncomment the code
- Follow the setup steps in `PAYMENT_INTEGRATION.md`

---

## Complete Test Checklist

Use this checklist to verify all features work:

### CSV Export
- [ ] Single statement CSV export downloads
- [ ] QuickBooks format export downloads
- [ ] Unpaid summary export downloads
- [ ] CSV files open correctly in Excel/Sheets
- [ ] Data is accurate (amounts, dates, names)

### Bulk Payment Processing
- [ ] Select All checkbox works
- [ ] Individual checkboxes work
- [ ] Bulk action bar appears when selecting statements
- [ ] Button shows correct count (e.g., "Process 3 Payments")
- [ ] Processing multiple payments works
- [ ] Success message is accurate
- [ ] Statements update to PAID status

### Email Notifications (if SMTP configured)
- [ ] Backend logs show email service configured
- [ ] Email is received after processing payment
- [ ] Email has beautiful HTML design
- [ ] Payment details are accurate in email
- [ ] "View Full Statement" link works
- [ ] Plain text version works (disable HTML in email client)

### Integration Framework
- [ ] `PAYMENT_INTEGRATION.md` is complete and readable
- [ ] `stripe.service.ts` has proper structure
- [ ] Code comments explain integration options

---

## Sample Test Data

If you need to create test data, here's a quick way:

### Create Test Writer
```sql
-- Run in your PostgreSQL database
INSERT INTO "User" (id, name, email, role, password_hash)
VALUES (
  'test-writer-1',
  'Test Writer',
  'your-real-email@example.com',  -- USE YOUR REAL EMAIL
  'WRITER',
  '$2a$10$test'  -- Dummy password (login as admin instead)
);
```

### Create Test Statement
1. Go to Royalty Portal as admin
2. Click "Upload Statement"
3. Upload a PRO CSV file (BMI, ASCAP, or SESAC format)
4. Let it parse
5. It will be marked as UNPAID by default

### Assign Songs to Test Writer
```sql
-- Update a parsed statement to include your test writer
-- This depends on your data structure, but generally:
UPDATE "Statement"
SET metadata = jsonb_set(
  metadata,
  '{writerAssignments,some-song-id}',
  '"test-writer-1"'::jsonb
)
WHERE id = 'your-statement-id';
```

---

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Run `npm install` in `apps/backend`
- Check `.env` file exists
- Verify DATABASE_URL is correct

### Frontend won't start
- Run `npm install` in `apps/frontend`
- Check backend is running first
- Verify VITE_API_URL in `.env`

### Exports not downloading
- Check browser console for errors
- Verify you're logged in as admin
- Check backend logs for export errors
- Ensure statement has parsed data

### Bulk payments failing
- Check individual statement can be paid first
- Verify statements are actually UNPAID
- Check backend logs for errors
- Try processing one at a time to isolate issue

### Emails not sending
- Verify SMTP credentials are correct
- Check backend logs for email service status
- Try Mailtrap.io for testing (easier than Gmail)
- Ensure FRONTEND_URL is set in `.env`

---

## Next Steps

After testing all features:

1. **Push to production:**
   ```bash
   git push
   ```

2. **Configure production SMTP:**
   - Use a production email service (SendGrid, Mailgun, SES)
   - Add SMTP credentials to production `.env`
   - Test in production with real email

3. **Set up Stripe (when ready):**
   - Follow `PAYMENT_INTEGRATION.md`
   - Start with test mode
   - Gradually roll out to writers

4. **Monitor usage:**
   - Check backend logs for email delivery
   - Monitor CSV export downloads
   - Track payment processing volume

---

**Need help?** Check the backend console logs - they'll show detailed errors for any issues!
