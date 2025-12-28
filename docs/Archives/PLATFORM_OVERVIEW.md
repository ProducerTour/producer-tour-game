# Producer Tour Platform Overview

**Last Updated**: 2025-11-19
**Platform URL**: https://producertour.com
**Purpose**: Music Publishing Royalty Management & Distribution Platform

---

## Table of Contents
1. [Platform Mission](#platform-mission)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Database Schema](#database-schema)
4. [Core Features](#core-features)
5. [Tech Stack](#tech-stack)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Business Logic](#business-logic)
8. [Payment Flow](#payment-flow)
9. [Key File Locations](#key-file-locations)

---

## Platform Mission

**Producer Tour** is a comprehensive music publishing royalty management platform designed for independent music producers, songwriters, and publishers. It serves as an all-in-one solution for:

- **Royalty Collection**: Aggregate royalties from multiple PROs (BMI, ASCAP, SESAC, GMR, MLC)
- **Revenue Tracking**: Real-time analytics on earnings, performances, and placements
- **Payment Distribution**: Automated writer payouts via Stripe Connect
- **Publishing Management**: Track placements, credits, splits, and PRO submissions
- **Business Tools**: Advance estimators, deal simulators, and opportunity portals

---

## User Roles & Permissions

### Role Hierarchy
```
ADMIN > PUBLISHER > MANAGER > LEGAL > WRITER > STAFF > VIEWER
```

### Role Capabilities

#### ADMIN
- Full system access
- Statement processing and payment approval
- User management and commission overrides
- Placement deal management
- Application review
- System configuration

#### WRITER (Primary End User)
- View personal statements and earnings
- Track placements and credits
- Submit withdrawal requests
- Access documents (contracts, statements, tax forms)
- Use tools (advance estimator, deal simulator)
- View opportunities

#### PUBLISHER
- Similar to ADMIN but focused on publishing operations
- Manage writer contracts and deals

#### MANAGER
- Oversee multiple writers
- View aggregated analytics

#### LEGAL
- Access to contracts and legal documents
- Placement deal tracking

#### STAFF
- Limited administrative functions
- Support operations

#### VIEWER
- Can upload statements (special permission)
- Limited read access

---

## Database Schema

### Core Models

#### User
**Purpose**: Writers, admins, and platform users

```prisma
model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  password              String
  role                  Role      @default(WRITER)
  firstName             String?
  lastName              String?

  // Publishing Identity
  ipiNumber             String?   // Songwriter IPI
  publisherIpiNumber    String?   // Publisher IPI
  proAffiliation        String?   // BMI, ASCAP, SESAC, etc.

  // Financial
  walletBalance         Float     @default(0)
  pendingBalance        Float     @default(0)
  lifetimeEarnings      Float     @default(0)
  commissionRate        Float?    // Override global rate
  stripeAccountId       String?   // Stripe Connect ID
  stripeCustomerId      String?

  // Settings
  notificationsEnabled  Boolean   @default(true)
  emailVerified         Boolean   @default(false)

  // Relations
  statements            StatementItem[]
  placements            Placement[]
  credits               Credit[]
  payouts               Payout[]
  documents             Document[]
}
```

#### Statement
**Purpose**: PRO royalty statements (quarterly/monthly)

```prisma
model Statement {
  id                    String    @id @default(cuid())
  pro                   PRO       // BMI, ASCAP, SESAC, GMR, MLC
  period                String    // "Q1 2024", "Jan 2024"
  startDate             DateTime
  endDate               DateTime

  // Financials
  totalRevenue          Float
  totalPerformances     Int
  totalCommission       Float
  netRevenue            Float

  // Processing
  status                StatementStatus  // PENDING, PROCESSING, PUBLISHED, PAID
  uploadedBy            String
  processedAt           DateTime?
  publishedAt           DateTime?
  paidAt                DateTime?

  // File
  fileName              String
  fileUrl               String?

  // Relations
  items                 StatementItem[]
}
```

#### StatementItem
**Purpose**: Individual song earnings within a statement

```prisma
model StatementItem {
  id                    String    @id @default(cuid())
  statementId           String
  statement             Statement @relation(fields: [statementId])

  // Work Info
  workTitle             String
  writerIpiNumber       String?
  publisherIpiNumber    String?

  // Earnings
  revenue               Float
  performances          Int
  splitPercentage       Float     @default(100)
  commission            Float
  netRevenue            Float

  // Assignment
  userId                String?
  user                  User?     @relation(fields: [userId])

  // Visibility (writers only see published/paid)
  isVisible             Boolean   @default(false)
}
```

#### Placement
**Purpose**: Music placements/releases tracking

```prisma
model Placement {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId])

  // Track Info
  title                 String
  artist                String
  platform              Platform  // SPOTIFY, APPLE_MUSIC, AMAZON, YOUTUBE, etc.

  // Identifiers
  isrc                  String?
  spotifyTrackId        String?

  // Performance
  streams               Int       @default(0)
  isEstimated           Boolean   @default(true)

  // Metadata (flexible storage)
  metadata              Json?     // album, images, genre, etc.

  // Tracking
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

#### Credit
**Purpose**: Song credits and split tracking

```prisma
model Credit {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId])

  // Song Info
  songTitle             String
  artist                String?

  // Credit Details
  role                  CreditRole  // PRODUCER, WRITER, COMPOSER, etc.
  splitPercentage       Float
  ipiNumber             String?

  // PRO Submission
  submittedTo           String[]    // ["BMI", "ASCAP"]
  submittedAt           DateTime?

  // Metadata
  metadata              Json?
}
```

#### PlacementDeal
**Purpose**: Business/legal tracking for client deals

```prisma
model PlacementDeal {
  id                    String    @id @default(cuid())

  // Client Info
  clientName            String
  clientEmail           String?

  // Song Info
  songTitle             String
  artist                String
  platform              Platform
  streams               Int

  // Financial Terms
  legalFeeType          LegalFeeType  // FLAT, PERCENTAGE
  legalFeeAmount        Float
  advanceAmount         Float?
  royaltyPercentage     Float?

  // Contract
  contractStatus        ContractStatus  // DRAFT, SENT, SIGNED, ACTIVE
  contractUrl           String?
  startDate             DateTime?
  endDate               DateTime?

  // Tracking
  invoiceGenerated      Boolean   @default(false)
  invoiceUrl            String?
  notes                 String?
}
```

#### Payout
**Purpose**: Writer withdrawal/payout requests

```prisma
model Payout {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId])

  amount                Float
  status                PayoutStatus  // PENDING, APPROVED, PROCESSING, PAID, REJECTED

  // Payment
  stripeTransferId      String?
  paidAt                DateTime?

  // Admin Review
  reviewedBy            String?
  reviewedAt            DateTime?
  rejectionReason       String?

  requestedAt           DateTime  @default(now())
}
```

#### Document
**Purpose**: Contracts, statements, tax forms

```prisma
model Document {
  id                    String    @id @default(cuid())

  title                 String
  type                  DocumentType  // CONTRACT, STATEMENT, TAX, INVOICE, etc.
  fileUrl               String

  // Access Control
  userId                String?   // Specific user (null = all users)
  user                  User?     @relation(fields: [userId])
  isAdminOnly           Boolean   @default(false)

  uploadedAt            DateTime  @default(now())
  uploadedBy            String
}
```

#### Opportunity
**Purpose**: Industry opportunities (sync, placements)

```prisma
model Opportunity {
  id                    String    @id @default(cuid())

  title                 String
  type                  OpportunityType  // SYNC, PLACEMENT, COLLABORATION
  brief                 String
  genres                String[]

  budget                Float?
  deadline              DateTime?

  priority              Priority  // HIGH, MEDIUM, LOW
  status                OpportunityStatus  // OPEN, CLOSED, FILLED

  contactEmail          String?
  contactName           String?

  createdAt             DateTime  @default(now())
}
```

### Enums

```prisma
enum Role {
  ADMIN
  WRITER
  LEGAL
  MANAGER
  PUBLISHER
  STAFF
  VIEWER
}

enum PRO {
  BMI
  ASCAP
  SESAC
  GMR
  MLC
  SOCAN
  PRS
  OTHER
}

enum Platform {
  SPOTIFY
  APPLE_MUSIC
  AMAZON_MUSIC
  YOUTUBE_MUSIC
  TIDAL
  DEEZER
  PANDORA
  SOUNDCLOUD
  OTHER
}

enum StatementStatus {
  PENDING      // Uploaded, not processed
  PROCESSING   // Admin is processing
  PUBLISHED    // Visible to writers
  PAID         // Payments sent
}

enum PayoutStatus {
  PENDING
  APPROVED
  PROCESSING
  PAID
  REJECTED
}
```

---

## Core Features

### For Writers (Primary Users)

#### 1. Dashboard & Analytics
**Location**: [AdminDashboard.tsx](../apps/frontend/src/pages/AdminDashboard.tsx)

**Metrics Displayed**:
- Total Earnings (lifetime)
- Available Balance (withdrawable)
- Pending Balance (not yet cleared)
- Total Placements
- Total Streams
- Total Statements

**Charts**:
- **Earnings Timeline**: Monthly earnings over time (Recharts Line Chart)
- **PRO Breakdown**: Earnings by PRO (Recharts Pie Chart)
- **Platform Distribution**: Placements by streaming platform (Recharts Bar Chart)
- **Global Revenue Heatmap**: Earnings by territory (if available)

**Top Tracks Widget**: Shows highest-earning songs with revenue

#### 2. Publishing Tracker
**Purpose**: Track music placements and credits

**Features**:
- Add placements with title, artist, platform
- ISRC and Spotify Track ID tracking
- Stream count tracking (real or estimated)
- Credit management (Producer, Writer, Composer roles)
- Split percentage tracking
- PRO submission status (ASCAP, BMI, SESAC)
- Metadata storage (album art, genre, etc.)

**Analytics**:
- Total placements count
- Total streams across platforms
- Platform distribution chart
- Top tracks by streams

#### 3. Royalty Statements
**Purpose**: View earnings from PROs

**What Writers See**:
- Only PUBLISHED or PAID statements (visibility control)
- Statement period and PRO
- Total performances and revenue
- Commission deducted
- Net revenue (after commission)
- Breakdown by song/work

**Statement Item Details**:
- Work title
- IPI number (if matched)
- Performance count
- Gross revenue
- Split percentage
- Commission amount
- Net earnings

#### 4. Payments & Wallet
**Purpose**: Manage earnings and withdrawals

**Wallet Balances**:
- **Available Balance**: Ready to withdraw
- **Pending Balance**: Processing, not yet cleared
- **Lifetime Earnings**: Total all-time earnings

**Withdrawal Flow**:
1. Writer requests payout (minimum $50 default)
2. Admin reviews and approves
3. Stripe Connect transfer initiated
4. Funds sent to writer's bank account
5. Status updates: PENDING → APPROVED → PROCESSING → PAID

**Stripe Connect Integration**:
- Writers onboard to Stripe Connect
- Direct deposits to bank accounts
- Automated transfers after admin approval

#### 5. Documents
**Purpose**: Access contracts, statements, tax forms

**Document Types**:
- Contracts (publishing agreements)
- Processed statements (PDF exports)
- Tax documents (1099s, W9s)
- Invoices
- Pre-processed statements (raw PRO files)

**Access Control**:
- User-specific documents (only visible to assigned user)
- Global documents (visible to all writers)
- Admin-only documents (internal use)

#### 6. Tools

**Advance Estimator**:
- Input: Catalog size, monthly royalties, contract length, advance percentage
- Output: Estimated advance amount based on projected earnings
- Helps writers negotiate publishing deals

**Publishing Deal Simulator**:
- Model different deal structures
- Compare advance vs royalty retention scenarios
- Calculate break-even points

**Opportunities Portal**:
- View industry opportunities (sync placements, collaborations)
- Filter by genre, budget, deadline
- Contact info for submissions

---

### For Admins (Platform Operators)

#### 1. Statement Processing
**Endpoint**: `POST /api/statements/upload`
**Purpose**: Upload and process PRO statements

**Workflow**:
1. **Upload CSV/Excel**: Admin uploads statement file from PRO
2. **Parsing**: System parses file, extracts work titles, IPI numbers, revenue, performances
3. **Matching**: Match IPI numbers to users in database
4. **Commission Calculation**: Apply global or user-specific commission rates
5. **Review**: Admin reviews assignments and totals
6. **Publish**: Make statement visible to writers
7. **Payment Processing**: Generate payouts and send via Stripe

**Auto-Assignment Logic**:
- Match `writerIpiNumber` from statement to `user.ipiNumber`
- Match `publisherIpiNumber` to `user.publisherIpiNumber`
- If no match, item remains unassigned for manual review

**Commission Logic**:
```javascript
// User-specific override takes precedence
const rate = user.commissionRate || globalCommissionRate
const commission = revenue * rate
const netRevenue = revenue - commission
```

#### 2. User Management
**Features**:
- Create/edit users
- Assign roles (ADMIN, WRITER, etc.)
- Set commission overrides per writer
- Manage IPI numbers
- View user analytics (total earnings, placements, statements)
- Impersonation mode (troubleshoot as user)

#### 3. Placement Deal Management
**Purpose**: Track business deals with clients

**Features**:
- Client information tracking
- Song and stream data
- Legal fee tracking (flat or percentage)
- Advance and royalty terms
- Contract status workflow (DRAFT → SENT → SIGNED → ACTIVE)
- Invoice generation
- Notes and communication log

**Use Case**: Legal team tracks deals, generates invoices, monitors contract status

#### 4. Application Review
**Purpose**: Review artist/producer applications

**Features**:
- Tier-based scoring (Priority A, B, C, D)
- Status workflow (Pending, Approved, Rejected, Contacted)
- Catalog size, monthly royalties, social followers
- Notes and internal comments

#### 5. Financial Management
**Features**:
- Global commission rate setting
- Payout request approval/rejection
- Payment status tracking
- Stripe Connect account management
- Revenue reports and analytics

**Payout Approval Flow**:
1. Writer requests withdrawal
2. Admin views in /admin/payouts
3. Admin approves or rejects with reason
4. If approved, Stripe transfer initiated
5. Status tracked until PAID

---

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: TailwindCSS
- **State**: React Query (TanStack Query) for server state
- **Charts**: Recharts
- **Forms**: React Hook Form (likely)
- **Routing**: React Router
- **HTTP**: Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Security**: Helmet.js, rate limiting
- **Email**: SendGrid
- **Payments**: Stripe + Stripe Connect
- **File Upload**: Multer (likely)
- **CSV Parsing**: csv-parser or similar

### Infrastructure
- **Hosting**: Likely Render or similar (backend at website-0qgn.onrender.com)
- **Database**: PostgreSQL (likely managed service)
- **File Storage**: Unknown (local or S3)

### Development
- **Monorepo**: apps/backend, apps/frontend structure
- **Package Manager**: npm
- **Version Control**: Git + GitHub

---

## API Endpoints Reference

### Authentication
```
POST   /api/auth/register          # Create new account
POST   /api/auth/login             # Login (returns JWT)
POST   /api/auth/forgot-password   # Request password reset
POST   /api/auth/reset-password    # Reset password with token
GET    /api/auth/me                # Get current user profile
PUT    /api/auth/profile           # Update profile
```

### Statements
```
GET    /api/statements                        # List statements (writers: visible only)
GET    /api/statements/:id                    # Get statement details
POST   /api/statements/upload                 # Upload new statement (admin)
POST   /api/statements/:id/process            # Process uploaded statement (admin)
POST   /api/statements/:id/publish            # Publish to writers (admin)
POST   /api/statements/:id/process-payment    # Initiate payments (admin)
DELETE /api/statements/:id                    # Delete statement (admin)
```

### Placements
```
GET    /api/placements             # List user's placements
GET    /api/placements/:id         # Get placement details
POST   /api/placements             # Create new placement
PUT    /api/placements/:id         # Update placement
DELETE /api/placements/:id         # Delete placement
GET    /api/placements/analytics   # Get placement analytics
```

### Credits
```
GET    /api/credits                # List user's credits
GET    /api/credits/:id            # Get credit details
POST   /api/credits                # Create new credit
PUT    /api/credits/:id            # Update credit
DELETE /api/credits/:id            # Delete credit
```

### Users (Admin)
```
GET    /api/users                  # List all users (admin)
GET    /api/users/:id              # Get user details (admin)
POST   /api/users                  # Create user (admin)
PUT    /api/users/:id              # Update user (admin)
DELETE /api/users/:id              # Delete user (admin)
PUT    /api/users/:id/commission   # Set commission override (admin)
```

### Payouts
```
GET    /api/payouts                # List payouts (writers: own, admin: all)
GET    /api/payouts/:id            # Get payout details
POST   /api/payouts                # Request withdrawal (writer)
POST   /api/payouts/:id/approve    # Approve payout (admin)
POST   /api/payouts/:id/reject     # Reject payout (admin)
POST   /api/payouts/:id/process    # Process approved payout (admin)
```

### Documents
```
GET    /api/documents              # List accessible documents
GET    /api/documents/:id          # Get document details
POST   /api/documents              # Upload document (admin)
DELETE /api/documents/:id          # Delete document (admin)
```

### Opportunities
```
GET    /api/opportunities          # List opportunities
GET    /api/opportunities/:id      # Get opportunity details
POST   /api/opportunities          # Create opportunity (admin)
PUT    /api/opportunities/:id      # Update opportunity (admin)
DELETE /api/opportunities/:id      # Delete opportunity (admin)
```

### Placement Deals (Legal)
```
GET    /api/placement-deals        # List deals
GET    /api/placement-deals/:id    # Get deal details
POST   /api/placement-deals        # Create new deal
PUT    /api/placement-deals/:id    # Update deal
DELETE /api/placement-deals/:id    # Delete deal
POST   /api/placement-deals/:id/invoice  # Generate invoice
```

### Tools
```
POST   /api/tools/advance-estimator       # Calculate advance estimate
POST   /api/tools/deal-simulator          # Simulate deal scenarios
```

---

## Business Logic

### Commission Calculation

**Global vs Override**:
```javascript
// Priority: User override > Global rate
const commissionRate = user.commissionRate !== null
  ? user.commissionRate
  : globalSettings.commissionRate

const commission = statementItem.revenue * commissionRate
const netRevenue = statementItem.revenue - commission
```

**Applied At**:
- Statement item processing
- Writer payouts
- Revenue calculations

### Wallet Balance Management

**Three Balance Types**:
1. **Available Balance**: Ready for withdrawal
2. **Pending Balance**: Processing, not cleared
3. **Lifetime Earnings**: Total all-time

**Balance Updates**:
```javascript
// When statement is PUBLISHED
user.pendingBalance += statementItem.netRevenue

// When statement is PAID
user.pendingBalance -= statementItem.netRevenue
user.availableBalance += statementItem.netRevenue
user.lifetimeEarnings += statementItem.netRevenue

// When payout is APPROVED
user.availableBalance -= payout.amount

// When payout is REJECTED (refund)
user.availableBalance += payout.amount
```

### Statement Visibility Rules

**Writers Can Only See**:
```javascript
// Status must be PUBLISHED or PAID
const visibleStatuses = [StatementStatus.PUBLISHED, StatementStatus.PAID]

// AND statement items must have isVisible = true
const writerStatements = statements.filter(s =>
  visibleStatuses.includes(s.status) && s.items.every(i => i.isVisible)
)
```

**Why**: Prevents writers from seeing unprocessed/unverified data

### IPI Matching Algorithm

**When Processing Statement**:
```javascript
// Try to match writer IPI
const writerByIpi = users.find(u => u.ipiNumber === item.writerIpiNumber)

// Try to match publisher IPI
const publisherByIpi = users.find(u => u.publisherIpiNumber === item.publisherIpiNumber)

// Assign to matched user
item.userId = writerByIpi?.id || publisherByIpi?.id || null

// If null, admin must manually assign
```

### Payout Minimum Threshold

**Default**: $50 minimum withdrawal

```javascript
if (requestedAmount < MINIMUM_PAYOUT) {
  throw new Error(`Minimum payout is $${MINIMUM_PAYOUT}`)
}

if (requestedAmount > user.availableBalance) {
  throw new Error('Insufficient balance')
}
```

---

## Payment Flow

### Statement → Wallet Flow

```
1. Admin uploads PRO statement (CSV)
   ↓
2. System parses rows, extracts IPI, revenue, performances
   ↓
3. Match IPI to users
   ↓
4. Calculate commission per item
   ↓
5. Status: PENDING (admin reviews)
   ↓
6. Admin publishes statement
   ↓
7. Statement status → PUBLISHED
   ↓
8. User.pendingBalance += netRevenue
   ↓
9. Admin processes payment
   ↓
10. Statement status → PAID
    ↓
11. User.pendingBalance -= netRevenue
    User.availableBalance += netRevenue
    User.lifetimeEarnings += netRevenue
```

### Withdrawal Flow

```
1. Writer requests payout ($50+)
   ↓
2. Payout status: PENDING
   ↓
3. Admin reviews in /admin/payouts
   ↓
4. Admin approves → Status: APPROVED
   ↓
5. Stripe Connect transfer initiated
   ↓
6. Status: PROCESSING
   ↓
7. Stripe confirms transfer
   ↓
8. Status: PAID
   ↓
9. User.availableBalance reduced
```

### Stripe Connect Integration

**Writer Onboarding**:
1. Writer clicks "Connect Bank Account"
2. Redirect to Stripe Connect onboarding
3. Writer enters bank info, identity verification
4. Stripe returns `stripeAccountId`
5. Store in `user.stripeAccountId`

**Transfer Process**:
```javascript
const transfer = await stripe.transfers.create({
  amount: payout.amount * 100, // Convert to cents
  currency: 'usd',
  destination: user.stripeAccountId,
  description: `Payout for ${user.email}`
})

payout.stripeTransferId = transfer.id
payout.status = PayoutStatus.PROCESSING
```

---

## Key File Locations

### Backend
```
apps/backend/
├── src/
│   ├── index.ts                           # Main entry point, Express app
│   ├── routes/
│   │   ├── auth.routes.ts                 # Authentication endpoints
│   │   ├── user.routes.ts                 # User management
│   │   ├── statement.routes.ts            # Statement processing
│   │   ├── placement.routes.ts            # Placement tracking
│   │   ├── credit.routes.ts               # Credit management
│   │   ├── payout.routes.ts               # Withdrawal/payments
│   │   └── document.routes.ts             # Document management
│   ├── middleware/
│   │   ├── auth.middleware.ts             # JWT verification
│   │   ├── role.middleware.ts             # Role-based access control
│   │   └── rate-limit.middleware.ts       # Rate limiting
│   ├── services/
│   │   ├── auth.service.ts                # Auth logic
│   │   ├── statement.service.ts           # Statement processing
│   │   ├── payment.service.ts             # Stripe integration
│   │   └── email.service.ts               # SendGrid emails
│   └── utils/
│       └── csvParser.ts                   # Parse PRO statements
├── prisma/
│   └── schema.prisma                      # Database schema
└── package.json
```

### Frontend
```
apps/frontend/
├── src/
│   ├── pages/
│   │   ├── AdminDashboard.tsx             # Main dashboard
│   │   ├── Statements.tsx                 # View statements
│   │   ├── Placements.tsx                 # Publishing tracker
│   │   ├── Credits.tsx                    # Credit management
│   │   ├── Wallet.tsx                     # Payments/withdrawals
│   │   ├── Documents.tsx                  # Document library
│   │   └── Tools.tsx                      # Advance estimator, etc.
│   ├── components/
│   │   ├── StatementCard.tsx              # Statement display
│   │   ├── PlacementCard.tsx              # Placement display
│   │   ├── Charts/
│   │   │   ├── EarningsTimeline.tsx       # Recharts line chart
│   │   │   ├── ProBreakdown.tsx           # Recharts pie chart
│   │   │   └── PlatformDistribution.tsx   # Recharts bar chart
│   │   └── forms/
│   │       ├── PlacementForm.tsx          # Add/edit placement
│   │       └── CreditForm.tsx             # Add/edit credit
│   ├── services/
│   │   └── api.ts                         # Axios API client
│   └── App.tsx                            # Routes and app shell
└── package.json
```

---

## Quick Reference: Common Tasks

### How to Process a Statement
1. Admin uploads CSV via `POST /api/statements/upload`
2. System creates Statement and parses into StatementItems
3. IPI matching runs automatically
4. Admin reviews unmatched items in dashboard
5. Admin publishes via `POST /api/statements/:id/publish`
6. Writers can now see statement in their dashboard
7. Admin processes payment via `POST /api/statements/:id/process-payment`
8. Balances updated, status → PAID

### How to Add a Placement
1. Writer navigates to Publishing Tracker
2. Clicks "Add Placement"
3. Enters title, artist, platform, ISRC, streams
4. (Optional) Future: Search AudioDB for metadata
5. Saves placement
6. Appears in placements list and analytics

### How to Request a Payout
1. Writer checks Available Balance in Wallet
2. Clicks "Request Withdrawal"
3. Enters amount (≥ $50)
4. Submits request → Status: PENDING
5. Admin approves in /admin/payouts
6. Stripe transfer initiated
7. Funds arrive in 2-5 business days

### How Commission Works
1. Statement uploaded with gross revenue per song
2. Commission rate applied: `user.commissionRate || globalRate`
3. Net revenue = Gross - Commission
4. Net revenue goes to writer's balance
5. Commission retained by Producer Tour

---

## Integration Opportunities

### Current Gaps
- No automated metadata enrichment (manual entry for all placements)
- No visual assets (album art, artist photos)
- No genre classification system
- Limited search/discovery features
- No external music database linking

### Potential Integrations
1. **AudioDB API**: Artist/album metadata, images, genre classification
2. **Spotify API**: Real stream counts, track metadata, popularity
3. **MusicBrainz**: Canonical music database, ISRCs, recordings
4. **Discogs**: Release information, credits, label data
5. **PRO APIs**: Direct BMI/ASCAP/SESAC integration (if available)

---

## Notes for Future Development

### Security Considerations
- All endpoints require JWT authentication (except /auth/login, /auth/register)
- Role-based middleware restricts admin-only routes
- Rate limiting on auth endpoints prevents brute force
- Helmet.js for HTTP security headers
- Input validation on all forms (prevent injection)

### Performance Considerations
- React Query caching reduces API calls
- Pagination on statement/placement lists (likely needed)
- Database indexing on IPI numbers, user IDs, statement dates
- Lazy loading for images/documents

### Scalability Considerations
- Monorepo structure allows independent scaling of frontend/backend
- Stateless JWT auth enables horizontal scaling
- Prisma can connect to read replicas for heavy read workloads
- File uploads should move to S3/CDN (if not already)

---

## Support & Documentation

### For Platform Questions
- **Internal Docs**: `/docs/` directory
- **Schema Reference**: `apps/backend/prisma/schema.prisma`

### For Technical Questions
- **Database**: Prisma docs at https://www.prisma.io/docs
- **Stripe**: Stripe Connect docs at https://stripe.com/docs/connect
- **SendGrid**: Email API docs at https://docs.sendgrid.com

---

**End of Platform Overview**
*This document should be referenced in future conversations to understand Producer Tour's functionality without re-exploring the codebase.*
