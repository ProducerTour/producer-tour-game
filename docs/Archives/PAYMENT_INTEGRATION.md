# Payment Integration Guide

This guide explains how to set up actual payment transfers to writers using Stripe or other payment providers.

## Overview

The Producer Tour platform currently supports:

1. **Payment tracking** ✅ (Database recording)
2. **Payment export** ✅ (CSV/QuickBooks for manual processing)
3. **Email notifications** ✅ (Writers notified when payments are processed)
4. **Automated transfers** 🚧 (Requires setup - see below)

## Option 1: Manual Payments (Current Default)

**How it works:**
1. Admin processes payment in the Royalty Portal
2. Writers are notified via email
3. Admin exports CSV/QuickBooks format
4. Admin manually processes payments via bank transfer, PayPal, etc.

**Pros:**
- No additional setup required
- Works immediately
- Full control over payment method
- No transaction fees

**Cons:**
- Manual work for each payment cycle
- Slower for writers
- More prone to human error

---

## Option 2: Stripe Connect (Recommended for Automation)

**Best for:** Platforms with multiple creators/contractors

### Setup Steps

1. **Create Stripe Account**
   ```
   https://stripe.com
   ```

2. **Enable Stripe Connect**
   ```
   Dashboard → Connect → Get Started
   ```

3. **Install Stripe SDK**
   ```bash
   cd apps/backend
   npm install stripe
   ```

4. **Add API Keys to `.env`**
   ```env
   STRIPE_SECRET_KEY=sk_test_...  # Test mode first!
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

5. **Uncomment Stripe Code**
   ```
   File: apps/backend/src/services/stripe.service.ts
   - Uncomment the Stripe initialization code
   - Uncomment the payWriterViaConnect method
   ```

6. **Add Stripe Account ID to User Model**

   Update `prisma/schema.prisma`:
   ```prisma
   model User {
     // ... existing fields
     stripeConnectedAccountId String? @unique
   }
   ```

   Run migration:
   ```bash
   npm run db:migrate
   ```

7. **Add Writer Onboarding Flow**

   Create route to generate Stripe Connect onboarding link:
   ```typescript
   // apps/backend/src/routes/stripe.routes.ts
   router.get('/connect/onboard', authenticate, async (req, res) => {
     const accountLink = await stripe.accountLinks.create({
       account: 'acct_...',
       refresh_url: `${FRONTEND_URL}/settings?stripe=refresh`,
       return_url: `${FRONTEND_URL}/settings?stripe=success`,
       type: 'account_onboarding',
     });
     res.json({ url: accountLink.url });
   });
   ```

8. **Update Payment Processing**

   In `statement.routes.ts`, after marking statement as PAID:
   ```typescript
   // Transfer funds to each writer via Stripe
   for (const writer of writerMap.values()) {
     if (writer.stripeConnectedAccountId) {
       await stripeService.payWriterViaConnect(
         writer.stripeConnectedAccountId,
         {
           writerId: writer.userId,
           writerName: writer.name,
           writerEmail: writer.email,
           amount: writer.netRevenue,
           currency: 'USD',
           description: `${statement.proType} Royalties - ${statement.filename}`,
         }
       );
     }
   }
   ```

9. **Test with Stripe Test Mode**
   ```
   Use test API keys (sk_test_...)
   Test cards: https://stripe.com/docs/testing
   ```

10. **Go Live**
    ```
    1. Switch to live API keys (sk_live_...)
    2. Update STRIPE_SECRET_KEY in production .env
    3. Complete Stripe verification process
    4. Start processing real payments!
    ```

### Stripe Connect Benefits

- ✅ Writers control their own accounts
- ✅ Automatic tax form generation (1099s)
- ✅ No PCI compliance burden on you
- ✅ Instant transfers to writer bank accounts
- ✅ Built-in fraud protection
- ✅ International payments support

### Stripe Connect Fees

- 2.9% + $0.30 per transaction (standard processing)
- Additional 0.25% for Connect platform fee (optional)
- Volume discounts available

---

## Option 3: Stripe Payouts API

**Best for:** Simpler setup with fewer writers

### Setup Steps

1. **Install Stripe SDK** (same as Option 2)

2. **Collect Writer Bank Details**

   Add to User model:
   ```prisma
   model User {
     // ... existing fields
     bankAccountLast4    String?
     bankAccountType     String?  // checking, savings
     bankRoutingNumber   String?  // encrypted
     bankAccountNumber   String?  // encrypted - NEVER log this!
   }
   ```

   **IMPORTANT:** Encrypt sensitive bank data:
   ```typescript
   import crypto from 'crypto';

   const algorithm = 'aes-256-gcm';
   const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

   function encrypt(text: string): string {
     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipheriv(algorithm, key, iv);
     let encrypted = cipher.update(text, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     const authTag = cipher.getAuthTag();
     return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
   }
   ```

3. **Create External Accounts in Stripe**

   ```typescript
   const account = await stripe.accounts.create({
     type: 'custom',
     country: 'US',
     email: writer.email,
     capabilities: {
       transfers: { requested: true },
     },
     external_account: {
       object: 'bank_account',
       country: 'US',
       currency: 'usd',
       account_number: decryptedAccountNumber,
       routing_number: decryptedRoutingNumber,
     },
   });
   ```

4. **Uncomment Payout Code**

   In `stripe.service.ts`:
   ```typescript
   // Uncomment payWriterViaPayout method
   ```

5. **Process Payouts**

   ```typescript
   await stripeService.payWriterViaPayout(
     writer.stripeExternalAccountId,
     paymentDetails
   );
   ```

### Payouts API Considerations

- ⚠️ You hold funds (requires sufficient Stripe balance)
- ⚠️ PCI compliance required for bank account storage
- ⚠️ More liability
- ✅ Simpler for writers (just provide bank details)
- ✅ More control over timing

---

## Option 4: PayPal Payouts

**Best for:** International payments, writers without bank accounts

### Setup

1. **Install PayPal SDK**
   ```bash
   npm install @paypal/payouts-sdk
   ```

2. **Add PayPal Client**
   ```typescript
   import paypal from '@paypal/checkout-server-sdk';

   const environment = new paypal.core.SandboxEnvironment(
     process.env.PAYPAL_CLIENT_ID,
     process.env.PAYPAL_CLIENT_SECRET
   );
   const client = new paypal.core.PayPalHttpClient(environment);
   ```

3. **Create Payout**
   ```typescript
   const request = new paypal.payouts.PayoutsPostRequest();
   request.requestBody({
     sender_batch_header: {
       recipient_type: 'EMAIL',
       email_message: 'You have a payment from Producer Tour',
       note: 'Thanks for your work!',
     },
     items: [{
       recipient_type: 'EMAIL',
       amount: {
         value: '10.00',
         currency: 'USD',
       },
       receiver: 'writer@example.com',
       note: `${proType} Royalties`,
       sender_item_id: `statement_${statementId}`,
     }],
   });

   const response = await client.execute(request);
   ```

### PayPal Fees

- 2% of payout amount
- $0.25 minimum per payout

---

## Option 5: Wise (formerly TransferWise)

**Best for:** International payments with low fees

### Setup

1. **Create Wise Business Account**
   ```
   https://wise.com/business
   ```

2. **Get API Token**
   ```
   Settings → API Tokens → Create token
   ```

3. **Install Axios** (or use existing)
   ```bash
   npm install axios
   ```

4. **Create Transfer**
   ```typescript
   const response = await axios.post(
     'https://api.transferwise.com/v1/transfers',
     {
       targetAccount: writerWiseAccountId,
       quote: quoteId,
       customerTransactionId: `stmt_${statementId}`,
       details: {
         reference: `${proType} Royalties - ${filename}`,
       },
     },
     {
       headers: {
         Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
       },
     }
   );
   ```

### Wise Benefits

- ✅ Very low fees (often under 1%)
- ✅ Real exchange rates
- ✅ Excellent for international payments
- ✅ Fast transfers

---

## Comparison Table

| Feature | Manual | Stripe Connect | Stripe Payouts | PayPal | Wise |
|---------|--------|----------------|----------------|--------|------|
| **Setup Complexity** | ⭐ Easy | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ Hard | ⭐⭐ Medium | ⭐⭐ Medium |
| **Fees** | $0 | 2.9% + $0.30 | 2.9% + $0.30 | 2% + $0.25 | ~0.5-1% |
| **International** | ✅ | ✅ | ✅ | ✅ | ✅✅ Best |
| **Speed** | Slow | Fast | Fast | Medium | Fast |
| **PCI Compliance** | N/A | Not needed | Required | Not needed | Not needed |
| **Writer Setup** | None | Stripe account | Bank details | PayPal account | Wise account |
| **Tax Forms** | Manual | Automatic | Manual | Manual | Manual |

---

## Recommendations

### For US-only with < 50 writers:
→ **Start with Manual**, upgrade to **Stripe Connect** when ready

### For US-only with > 50 writers:
→ **Stripe Connect** (worth the setup for automation)

### For international writers:
→ **Wise** (lowest fees) or **PayPal** (easier setup)

### For hobbyist/small projects:
→ **Manual** (keep it simple)

### For serious business:
→ **Stripe Connect** (professional, scalable, tax-compliant)

---

## Security Best Practices

1. **Never log sensitive data**
   - ❌ Don't log bank account numbers
   - ❌ Don't log card numbers
   - ❌ Don't log API keys

2. **Encrypt everything**
   - Bank account details
   - Routing numbers
   - Social security numbers

3. **Use environment variables**
   - Never commit API keys
   - Use different keys for test/production

4. **Implement webhooks**
   - Handle payment failures
   - Track payment status
   - Reconcile accounts

5. **Regular audits**
   - Check for orphaned accounts
   - Verify payment totals
   - Monitor for fraud

---

## Testing

1. **Test Mode First**
   - Use Stripe test keys
   - Use PayPal sandbox
   - Never test with real money

2. **Test Scenarios**
   - Successful payment
   - Failed payment
   - Partial payment
   - Refund
   - Writer with no payment method

3. **Test Data**
   ```
   Stripe test cards: https://stripe.com/docs/testing
   PayPal sandbox accounts: developer.paypal.com
   ```

---

## Support

- **Stripe:** support.stripe.com
- **PayPal:** developer.paypal.com/support
- **Wise:** wise.com/help
- **Producer Tour:** support@producertour.com

---

**Ready to get started? Choose your integration method and follow the steps above!**
