# Production Environment Variables Guide

This document lists all environment variables that must be configured in your **Render dashboard** for production deployment.

## 🔒 Critical Security Notes

1. **NEVER copy your local `.env` file to production**
2. **Use different JWT secrets** for local and production
3. **Use LIVE Stripe keys** in production (not test keys)
4. **Rotate production secrets** periodically
5. **All values below should be set in Render's environment variables settings**

---

## Required Environment Variables for Render

### 🗄️ Database
```
DATABASE_URL
```
- **Value:** Automatically provided by Render when you add a PostgreSQL database
- **Action:** Link your PostgreSQL database to your web service in Render
- **Do NOT set manually** - Render handles this

### 🖥️ Server Configuration
```
NODE_ENV=production
```
- **Required:** Yes
- **Value:** `production`

```
PORT
```
- **Required:** No (Render sets this automatically)
- **Value:** Automatically set by Render
- **Do NOT set manually**

```
CORS_ORIGIN
```
- **Required:** Yes
- **Value:** Your production frontend URL
- **Examples:**
  - `https://producertour.com`
  - `https://www.producertour.com`
  - `https://website-frontend-producer-tour.vercel.app`

### 🔐 JWT (Authentication)
```
JWT_SECRET
```
- **Required:** Yes
- **Value:** Generate a new cryptographically secure secret
- **How to generate:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- **⚠️ CRITICAL:** Must be different from your local JWT_SECRET
- **Length:** Minimum 128 characters

```
JWT_EXPIRES_IN=7d
```
- **Required:** Yes
- **Value:** `7d` (or your preferred expiration time)

### 📧 Email Service (SendGrid)
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
EMAIL_FROM=noreply@producertour.com
```
- **Required:** Yes (for password reset, notifications)
- **Get SendGrid API key from:** https://app.sendgrid.com/settings/api_keys
- **Note:** `SMTP_USER` should literally be the string `apikey` for SendGrid

### 🌐 Frontend URL
```
FRONTEND_URL
```
- **Required:** Yes
- **Value:** Your production frontend URL
- **Examples:**
  - `https://producertour.com`
  - `https://www.producertour.com`
- **Used for:** Email links (password reset, etc.)

### 📁 File Upload
```
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```
- **Required:** Yes
- **MAX_FILE_SIZE:** `10485760` (10MB in bytes)
- **UPLOAD_DIR:** `./uploads`

### ☁️ AWS S3 (Optional - Recommended for Production)
```
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_S3_BUCKET=<your-bucket-name>
AWS_REGION=us-east-1
```
- **Required:** Optional, but recommended for production
- **If not set:** Files will be stored locally (may be lost on redeploy)
- **Get credentials from:** AWS IAM Console
- **Bucket:** Create an S3 bucket for storing uploaded statements

### 🎵 Spotify Web API
```
SPOTIFY_CLIENT_ID=<your-client-id>
SPOTIFY_CLIENT_SECRET=<your-client-secret>
```
- **Required:** Yes (for metadata lookups)
- **Get from:** https://developer.spotify.com/dashboard
- **Same credentials can be used for both local and production**

### 💳 Stripe Payment Processing
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```
- **Required:** Yes
- **⚠️ CRITICAL:** Use **LIVE keys** (sk_live_..., pk_live_...) NOT test keys
- **Get from:** https://dashboard.stripe.com/apikeys
- **Security:** Only the secret key needs to be kept secret; publishable key is safe to expose

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Create a new PostgreSQL database in Render
- [ ] Link the database to your web service (DATABASE_URL will auto-populate)
- [ ] Generate a NEW JWT_SECRET (different from local)
- [ ] Set NODE_ENV=production
- [ ] Configure SendGrid SMTP credentials
- [ ] Set CORS_ORIGIN to your production frontend URL
- [ ] Set FRONTEND_URL to your production frontend URL
- [ ] Add Spotify credentials
- [ ] Add LIVE Stripe keys (not test keys!)
- [ ] (Optional) Configure AWS S3 for file storage
- [ ] Verify all environment variables are set in Render dashboard
- [ ] Test deployment with a manual deploy
- [ ] Verify email sending works (test password reset)
- [ ] Verify Stripe payments work (create a test payment)

---

## 🔄 How to Update Environment Variables

1. Go to your Render dashboard
2. Select your backend web service
3. Navigate to "Environment" tab
4. Click "Add Environment Variable" or edit existing ones
5. After changes, Render will automatically redeploy

---

## 🆘 Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is set (should be automatic from Render)
- Check that PostgreSQL service is running
- Ensure Prisma migrations are up to date

### Email Not Sending
- Verify all SMTP_* variables are set correctly
- Check SendGrid API key is valid
- Verify EMAIL_FROM domain matches your SendGrid sender

### CORS Errors
- Verify CORS_ORIGIN matches your frontend URL exactly
- Check for trailing slashes (should not have one)
- Ensure frontend URL uses https:// in production

### Stripe Issues
- Verify you're using LIVE keys (sk_live_..., pk_live_...)
- Check Stripe dashboard for webhook settings
- Ensure Stripe account is activated and verified

---

## 📞 Support

For environment variable issues:
- Check Render logs: `Settings > Logs`
- Review Render docs: https://render.com/docs/environment-variables
- Contact: support@producertour.com
