# Producer Tour Notification System

This document outlines all notifications available in the Producer Tour platform, including their triggers, source locations, and user preferences.

---

## Table of Contents

- [Email Notifications](#email-notifications)
  - [Authentication](#authentication)
  - [Payments & Royalties](#payments--royalties)
  - [Work Registration](#work-registration)
  - [Messaging](#messaging)
- [Real-Time Notifications](#real-time-notifications)
- [User Preferences](#user-preferences)
- [Email Templates](#email-templates)
- [Architecture](#architecture)

---

## Email Notifications

All email notifications are sent via the `EmailService` class.

**Core Service File:** `apps/backend/src/services/email.service.ts`

### Authentication

| Notification | Description | Trigger Location | Service Method |
|--------------|-------------|------------------|----------------|
| **Password Reset** | Sends reset link (expires in 1 hour) | `apps/backend/src/routes/auth.routes.ts` | `sendPasswordResetEmail()` (line 446) |
| **Password Reset Confirmation** | Confirms password was changed | `apps/backend/src/routes/auth.routes.ts` | `sendPasswordResetConfirmation()` (line 479) |
| **Welcome Email** | New user account setup instructions | `apps/backend/src/routes/user.routes.ts` | `sendWelcomeEmail()` (line 510) |

### Payments & Royalties

| Notification | Description | Trigger Location | Service Method |
|--------------|-------------|------------------|----------------|
| **Payment Processed** | PRO royalty payment summary (BMI, ASCAP, SESAC, MLC) | Statement processing routes | `sendPaymentNotification()` (line 160) |
| **Bulk Payment Notifications** | Batch payment emails with delay | Statement processing routes | `sendBulkPaymentNotifications()` (line 186) |
| **Session Payout (Engineer)** | Engineering session payment details | `apps/backend/src/routes/session-payout.routes.ts` | `sendSessionPayoutNotification()` (line 1417) |
| **Session Payout (Admin)** | Admin summary of session payout | `apps/backend/src/routes/session-payout.routes.ts` | `sendSessionPayoutAdminNotification()` (line 1688) |

### Work Registration

| Notification | Description | Trigger Location | Service Method |
|--------------|-------------|------------------|----------------|
| **Document Request** | Admin requests additional documents | `apps/backend/src/routes/work-registration.routes.ts` | `sendDocumentRequestEmail()` (line 906) |
| **Submission Approved** | Work registration approved | `apps/backend/src/routes/work-registration.routes.ts` | `sendSubmissionApprovedEmail()` (line 942) |
| **Submission Denied** | Work registration denied with reason | `apps/backend/src/routes/work-registration.routes.ts` | `sendSubmissionDeniedEmail()` (line 978) |

### Messaging

| Notification | Description | Trigger Location | Service Method |
|--------------|-------------|------------------|----------------|
| **New Message** | Email notification for offline users | `apps/backend/src/socket/index.ts` (line 229) | `sendNewMessageNotification()` (line 1772) |

---

## Real-Time Notifications

Real-time notifications are delivered via Socket.io for users who are online.

**Socket Handler:** `apps/backend/src/socket/index.ts`

| Event | Description | Socket Event Name |
|-------|-------------|-------------------|
| **New Message** | Instant message delivery | `message:new` |
| **Typing Indicator** | User is typing in conversation | `typing:start` / `typing:stop` |
| **Message Read** | Message marked as read | `message:read` |
| **User Online Status** | User comes online/goes offline | `user:online` / `user:offline` |
| **Conversation Updated** | Conversation metadata changed | `conversation:updated` |

---

## User Preferences

Users can configure their notification preferences via the API.

**Preferences Endpoint:** `PATCH /api/users/preferences`
**Chat Settings Endpoint:** `PATCH /api/users/chat-settings`
**Route File:** `apps/backend/src/routes/user.routes.ts` (lines 310-450)

### Email Preferences

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `emailNotificationsEnabled` | Boolean | `true` | Master toggle for all email notifications |
| `statementNotificationsEnabled` | Boolean | `true` | Payment/royalty statement emails |
| `monthlySummaryEnabled` | Boolean | `false` | Monthly earnings summary reports |

### Chat Preferences

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `chatDesktopNotifications` | Boolean | `true` | Browser push notifications for messages |
| `chatSoundEnabled` | Boolean | `true` | Play sound on new message |
| `chatSoundType` | String | `"chime"` | Sound type: `chime`, `pop`, `ding`, `bell`, `subtle` |
| `chatMessagePreview` | Boolean | `true` | Show message content in notifications |
| `chatShowOnlineStatus` | Boolean | `true` | Display online/offline status to others |
| `chatShowTypingIndicator` | Boolean | `true` | Show typing indicator to others |
| `chatVisibilityStatus` | String | `"online"` | Visibility status: `online`, `away`, `busy`, `offline` |

### Conversation-Level Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `isMuted` | Boolean | `false` | Mute notifications for specific conversation |

**Schema Location:** `apps/backend/prisma/schema.prisma` (User model, lines 161-173)

---

## Email Templates

Pre-built HTML email templates are located in the `email-templates/` directory.

| Template File | Notification Type |
|---------------|-------------------|
| `1-payment-notification.html` | Royalty payment processed |
| `2-password-reset.html` | Password reset request |
| `3-password-reset-confirmation.html` | Password reset success |
| `4-welcome.html` | Welcome email for new users |
| `5-document-request.html` | Documents needed for submission |
| `6-submission-approved.html` | Work registration approved |
| `7-submission-denied.html` | Work registration denied |
| `8-session-payout.html` | Engineer session payout |
| `9-session-payout-admin.html` | Admin summary of session payout |
| `10-new-message.html` | New message notification |

### Template Features

- ✅ Dark mode support
- ✅ Responsive design (mobile-friendly)
- ✅ Producer Tour branding
- ✅ Call-to-action buttons
- ✅ Plain text fallback versions

---

## Architecture

### Email Delivery Flow

```
User Action / System Event
         ↓
    Route Handler
         ↓
  Check User Preferences
         ↓
    EmailService Method
         ↓
  SMTP Transport (Nodemailer)
         ↓
    Retry Logic (3 attempts)
         ↓
   Email Delivered ✓
```

### Email Service Features

| Feature | Implementation |
|---------|----------------|
| **SMTP Configuration** | Environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) |
| **Retry Logic** | 3 attempts with exponential backoff (1s → 2s → 4s) |
| **Bulk Sending** | 1.5s delay between emails to prevent rate limiting |
| **Graceful Degradation** | Service disables silently if SMTP not configured |
| **Non-Blocking** | Email failures don't block main operations |

### Real-Time Notification Flow

```
Message Sent
     ↓
Socket.io Handler
     ↓
Check if Recipient Online
     ↓
├─ Online → Emit Socket Event
└─ Offline → Queue Email Notification
```

---

## Adding New Notifications

### 1. Create Email Template

Add a new HTML template to `email-templates/` following the existing pattern.

### 2. Add Service Method

Add a new method to `apps/backend/src/services/email.service.ts`:

```typescript
async sendMyNewNotification(
  to: string,
  data: MyNotificationData
): Promise<boolean> {
  // Check user preferences if applicable
  const user = await prisma.user.findUnique({ where: { email: to } });
  if (!user?.emailNotificationsEnabled) {
    return false;
  }

  const subject = 'Your Notification Subject';
  const html = `<!-- HTML content -->`;
  const text = `Plain text version`;

  return this.sendEmail(to, subject, html, text);
}
```

### 3. Trigger from Route/Handler

Call the service method from the appropriate route or socket handler:

```typescript
await emailService.sendMyNewNotification(user.email, notificationData);
```

### 4. Add User Preference (Optional)

If users should be able to toggle this notification:

1. Add field to User model in `prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev`
3. Add to preferences endpoint in `user.routes.ts`
4. Check preference in service method before sending

---

## Related Files

| File | Purpose |
|------|---------|
| `apps/backend/src/services/email.service.ts` | Core email notification service |
| `apps/backend/src/socket/index.ts` | Real-time Socket.io notifications |
| `apps/backend/src/routes/user.routes.ts` | User preference endpoints |
| `apps/backend/src/routes/auth.routes.ts` | Auth notification triggers |
| `apps/backend/src/routes/work-registration.routes.ts` | Work registration notification triggers |
| `apps/backend/src/routes/session-payout.routes.ts` | Session payout notification triggers |
| `apps/backend/prisma/schema.prisma` | User preference schema |
| `apps/backend/src/__tests__/email-service.test.ts` | Email service tests |
| `email-templates/` | HTML email templates |
