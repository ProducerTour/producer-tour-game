# Payment Processing System Refactor - Implementation Plan

**Created:** November 3, 2025
**Status:** Planning
**Estimated Timeline:** 3 weeks

---

## Executive Summary

Transform the statement publishing system from immediate writer visibility to an admin-controlled payment processing workflow with payment status tracking, smart writer matching, and enhanced Royalty Portal integration.

### Current Behavior
- Statement published → Writers see earnings immediately
- No payment processing workflow
- No payment status tracking

### New Behavior
- Statement published → Earnings hidden from writers
- Admin processes payment via Royalty Portal → Earnings become visible
- Full payment status tracking (Unpaid, Pending, Paid)
- Smart writer matching with fuzzy logic
- Commission breakdown in payment flow

---

## Table of Contents
1. [Database Schema Updates](#phase-1-database-schema-updates)
2. [Statement Publishing Flow Changes](#phase-2-statement-publishing-flow-changes)
3. [Payment Processing Workflow](#phase-3-payment-processing-workflow)
4. [Royalty Portal Implementation](#phase-4-royalty-portal-implementation)
5. [Smart Writer Matching](#phase-5-smart-writer-matching)
6. [Writer Payment Status Indicators](#phase-6-writer-payment-status-indicators)
7. [Testing & Validation](#phase-7-testing--validation)

---

## Phase 1: Database Schema Updates

### 1.1 Add Payment Status Tracking

**File:** `apps/backend/prisma/schema.prisma`

#### Add PaymentStatus Enum
```prisma
enum PaymentStatus {
  UNPAID
  PENDING
  PAID
}
```

#### Update Statement Model
```prisma
model Statement {
  // ... existing fields

  // NEW: Payment tracking
  paymentStatus        PaymentStatus @default(UNPAID)
  paymentProcessedAt   DateTime?
  paymentProcessedById String?
  paymentProcessedBy   User?         @relation("PaymentProcessedBy", fields: [paymentProcessedById], references: [id])

  // ... existing relations
}
```

#### Update StatementItem Model
```prisma
model StatementItem {
  // ... existing fields

  // NEW: Visibility control
  isVisibleToWriter Boolean  @default(false)
  paidAt           DateTime?

  // ... existing relations
}
```

### 1.2 Add Manager Role

```prisma
enum UserRole {
  ADMIN
  WRITER
  LEGAL
  MANAGER  // NEW
}
```

### 1.3 Migration Steps
```bash
# Generate migration
cd apps/backend
npx prisma migrate dev --name add_payment_processing

# Review migration file
# Test on development database
# Verify schema changes
```

**Estimated Time:** 2 hours

---

## Phase 2: Statement Publishing Flow Changes

### 2.1 Update Publish Endpoint

**File:** `apps/backend/src/routes/statement.routes.ts`

**Current Logic (Line 226-359):**
```typescript
// When publishing:
await prisma.statement.update({
  data: {
    status: 'PUBLISHED',
    publishedAt: new Date(),
    publishedById: req.user!.id,
    totalRevenue,
    totalCommission,
    totalNet
  }
});

// Creates StatementItems immediately visible
await prisma.statementItem.create({
  data: {
    // ... all fields
    // Currently no visibility control
  }
});
```

**New Logic:**
```typescript
// When publishing:
await prisma.statement.update({
  data: {
    status: 'PUBLISHED',
    paymentStatus: 'UNPAID',  // NEW
    publishedAt: new Date(),
    publishedById: req.user!.id,
    totalRevenue,
    totalCommission,
    totalNet
  }
});

// Create StatementItems HIDDEN from writers
await prisma.statementItem.create({
  data: {
    // ... all existing fields
    isVisibleToWriter: false,  // NEW: Hidden until payment processed
    // ... commission calculation stays the same
  }
});
```

**No Changes to Commission Calculation**
- Current logic is correct:
  - Global 20% = Writer gets 80%, Producer Tour gets 20%
  - Override 90% = Writer gets 90%, Producer Tour gets 10%
- Keep all existing commission logic intact

### 2.2 Update Writer Dashboard Queries

**File:** `apps/backend/src/routes/dashboard.routes.ts`

**Current Query (Line ~15-50):**
```typescript
// Writers see ALL published statements
const items = await prisma.statementItem.findMany({
  where: {
    userId: req.user!.id,
    statement: { status: 'PUBLISHED' }
  }
});
```

**New Query:**
```typescript
// Writers only see PAID statements
const items = await prisma.statementItem.findMany({
  where: {
    userId: req.user!.id,
    isVisibleToWriter: true  // NEW: Only show after payment processed
  }
});

// OR filter at statement level:
const statements = await prisma.statement.findMany({
  where: {
    status: 'PUBLISHED',
    paymentStatus: 'PAID'  // NEW: Only paid statements
  }
});
```

**Update Summary Stats:**
```typescript
// Total Earnings (only from paid statements)
const totalEarnings = await prisma.statementItem.aggregate({
  where: {
    userId: req.user!.id,
    isVisibleToWriter: true
  },
  _sum: { netRevenue: true }
});
```

**Estimated Time:** 4 hours

---

## Phase 3: Payment Processing Workflow

### 3.1 New Backend Endpoints

**File:** `apps/backend/src/routes/statement.routes.ts`

#### Endpoint 1: Get Unpaid Statements
```typescript
/**
 * GET /api/statements/unpaid
 * Get all statements ready for payment processing
 * Admin only
 */
router.get('/unpaid', authenticate, requireAdmin, async (req, res) => {
  try {
    const unpaidStatements = await prisma.statement.findMany({
      where: {
        status: 'PUBLISHED',
        paymentStatus: { in: ['UNPAID', 'PENDING'] }
      },
      include: {
        items: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { publishedAt: 'desc' }
    });

    // Group by statement with writer summaries
    const formatted = unpaidStatements.map(statement => ({
      id: statement.id,
      proType: statement.proType,
      filename: statement.filename,
      publishedAt: statement.publishedAt,
      paymentStatus: statement.paymentStatus,
      totalRevenue: statement.totalRevenue,
      totalCommission: statement.totalCommission,
      totalNet: statement.totalNet,
      writerCount: new Set(statement.items.map(i => i.userId)).size,
      writers: groupWriterTotals(statement.items)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get unpaid statements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function groupWriterTotals(items) {
  const writerMap = new Map();

  items.forEach(item => {
    const key = item.userId;
    if (!writerMap.has(key)) {
      writerMap.set(key, {
        userId: item.userId,
        name: `${item.user.firstName} ${item.user.lastName}`,
        email: item.user.email,
        grossRevenue: 0,
        commissionAmount: 0,
        netRevenue: 0,
        songCount: 0
      });
    }

    const writer = writerMap.get(key);
    writer.grossRevenue += parseFloat(item.revenue);
    writer.commissionAmount += parseFloat(item.commissionAmount);
    writer.netRevenue += parseFloat(item.netRevenue);
    writer.songCount += 1;
  });

  return Array.from(writerMap.values());
}
```

#### Endpoint 2: Get Payment Summary
```typescript
/**
 * GET /api/statements/:id/payment-summary
 * Get detailed payment breakdown for a statement
 * Admin only
 */
router.get('/:id/payment-summary', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const statement = await prisma.statement.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    const summary = {
      statement: {
        id: statement.id,
        proType: statement.proType,
        filename: statement.filename,
        publishedAt: statement.publishedAt,
        paymentStatus: statement.paymentStatus
      },
      totals: {
        grossRevenue: parseFloat(statement.totalRevenue),
        commissionToProducerTour: parseFloat(statement.totalCommission),
        netToWriters: parseFloat(statement.totalNet),
        songCount: statement.items.length
      },
      writers: groupWriterTotals(statement.items)
    };

    res.json(summary);
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### Endpoint 3: Process Payment
```typescript
/**
 * POST /api/statements/:id/process-payment
 * Mark statement as paid and make visible to writers
 * Admin only
 */
router.post('/:id/process-payment', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify statement exists and is unpaid
    const statement = await prisma.statement.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    if (statement.paymentStatus === 'PAID') {
      return res.status(400).json({ error: 'Statement already paid' });
    }

    // Process payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update statement
      const updatedStatement = await tx.statement.update({
        where: { id },
        data: {
          paymentStatus: 'PAID',
          paymentProcessedAt: new Date(),
          paymentProcessedById: req.user!.id
        }
      });

      // Make all items visible to writers
      await tx.statementItem.updateMany({
        where: { statementId: id },
        data: {
          isVisibleToWriter: true,
          paidAt: new Date()
        }
      });

      return updatedStatement;
    });

    // Return payment confirmation
    res.json({
      success: true,
      statement: {
        id: result.id,
        paymentStatus: result.paymentStatus,
        paymentProcessedAt: result.paymentProcessedAt,
        totalPaidToWriters: parseFloat(result.totalNet),
        commissionToProducerTour: parseFloat(result.totalCommission)
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 3.2 Frontend API Integration

**File:** `apps/frontend/src/lib/api.ts`

```typescript
export const statementApi = {
  // ... existing methods

  // NEW: Payment processing methods
  getUnpaidStatements: () =>
    api.get('/statements/unpaid'),

  getPaymentSummary: (id: string) =>
    api.get(`/statements/${id}/payment-summary`),

  processPayment: (id: string) =>
    api.post(`/statements/${id}/process-payment`),
};
```

**Estimated Time:** 6 hours

---

## Phase 4: Royalty Portal Implementation

### 4.1 Replace Mock Data with Real API

**File:** `apps/frontend/src/pages/RoyaltyPortalPage.tsx`

**Current Implementation (Lines 1-500+):**
- Uses hardcoded mock data
- No backend connection
- Fake payment processing

**New Implementation:**

```typescript
import { useState, useEffect } from 'react';
import { statementApi } from '../lib/api';

interface UnpaidStatement {
  id: string;
  proType: string;
  filename: string;
  publishedAt: string;
  paymentStatus: 'UNPAID' | 'PENDING' | 'PAID';
  totalRevenue: number;
  totalCommission: number;
  totalNet: number;
  writerCount: number;
  writers: Array<{
    userId: string;
    name: string;
    email: string;
    grossRevenue: number;
    commissionAmount: number;
    netRevenue: number;
    songCount: number;
  }>;
}

export default function RoyaltyPortalPage() {
  const [unpaidStatements, setUnpaidStatements] = useState<UnpaidStatement[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<string | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load unpaid statements on mount
  useEffect(() => {
    loadUnpaidStatements();
  }, []);

  const loadUnpaidStatements = async () => {
    try {
      setLoading(true);
      const response = await statementApi.getUnpaidStatements();
      setUnpaidStatements(response.data);
    } catch (error) {
      console.error('Failed to load unpaid statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentSummary = async (statementId: string) => {
    try {
      setLoading(true);
      const response = await statementApi.getPaymentSummary(statementId);
      setPaymentSummary(response.data);
      setSelectedStatement(statementId);
    } catch (error) {
      console.error('Failed to load payment summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (statementId: string) => {
    if (!confirm('Process payment for this statement? Writers will be able to see their earnings.')) {
      return;
    }

    try {
      setLoading(true);
      await statementApi.processPayment(statementId);

      // Refresh lists
      await loadUnpaidStatements();
      setSelectedStatement(null);
      setPaymentSummary(null);

      alert('Payment processed successfully!');
    } catch (error) {
      console.error('Failed to process payment:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="royalty-portal">
      <h1>Royalty Portal - Payment Processing</h1>

      {/* Unpaid Statements List */}
      <section className="unpaid-statements">
        <h2>Statements Ready for Payment</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>PRO</th>
                <th>Filename</th>
                <th>Published</th>
                <th>Status</th>
                <th>Writers</th>
                <th>Total Revenue</th>
                <th>Commission</th>
                <th>Net to Writers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {unpaidStatements.map(statement => (
                <tr key={statement.id}>
                  <td>{statement.proType}</td>
                  <td>{statement.filename}</td>
                  <td>{new Date(statement.publishedAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${statement.paymentStatus.toLowerCase()}`}>
                      {statement.paymentStatus}
                    </span>
                  </td>
                  <td>{statement.writerCount}</td>
                  <td>${statement.totalRevenue.toFixed(2)}</td>
                  <td>${statement.totalCommission.toFixed(2)}</td>
                  <td>${statement.totalNet.toFixed(2)}</td>
                  <td>
                    <button onClick={() => loadPaymentSummary(statement.id)}>
                      View Details
                    </button>
                    <button
                      onClick={() => handleProcessPayment(statement.id)}
                      className="process-payment-btn"
                    >
                      Process Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Payment Summary Modal */}
      {paymentSummary && (
        <div className="payment-summary-modal">
          <div className="modal-content">
            <h2>Payment Summary</h2>

            <div className="summary-totals">
              <div>
                <strong>Total Gross Revenue:</strong>
                ${paymentSummary.totals.grossRevenue.toFixed(2)}
              </div>
              <div>
                <strong>Commission to Producer Tour:</strong>
                ${paymentSummary.totals.commissionToProducerTour.toFixed(2)}
              </div>
              <div>
                <strong>Net to Writers:</strong>
                ${paymentSummary.totals.netToWriters.toFixed(2)}
              </div>
              <div>
                <strong>Song Count:</strong>
                {paymentSummary.totals.songCount}
              </div>
            </div>

            <h3>Writer Breakdown</h3>
            <table>
              <thead>
                <tr>
                  <th>Writer</th>
                  <th>Email</th>
                  <th>Songs</th>
                  <th>Gross Revenue</th>
                  <th>Commission</th>
                  <th>Net Payment</th>
                </tr>
              </thead>
              <tbody>
                {paymentSummary.writers.map(writer => (
                  <tr key={writer.userId}>
                    <td>{writer.name}</td>
                    <td>{writer.email}</td>
                    <td>{writer.songCount}</td>
                    <td>${writer.grossRevenue.toFixed(2)}</td>
                    <td>${writer.commissionAmount.toFixed(2)}</td>
                    <td>${writer.netRevenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-actions">
              <button onClick={() => setSelectedStatement(null)}>
                Close
              </button>
              <button
                onClick={() => handleProcessPayment(selectedStatement!)}
                className="process-payment-btn"
              >
                Process Payment for All Writers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.2 Add Styles

**File:** `apps/frontend/src/pages/RoyaltyPortalPage.tsx` (CSS-in-JS or separate stylesheet)

```css
.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
}

.status-badge.unpaid {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.pending {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.paid {
  background: #d1fae5;
  color: #065f46;
}

.process-payment-btn {
  background: #10b981;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.process-payment-btn:hover {
  background: #059669;
}
```

**Estimated Time:** 8 hours

---

## Phase 5: Smart Writer Matching

### 5.1 Fuzzy Matching Algorithm

**New File:** `apps/backend/src/utils/writer-matcher.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface WriterMatch {
  writer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    ipiNumber: string | null;
  };
  confidence: number;
  reason: string;
}

interface ParsedSong {
  workTitle: string;
  writerName?: string;
  writerIpiNumber?: string;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity percentage (0-1) based on Levenshtein distance
 */
function stringSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength);
}

/**
 * Normalize song title for matching
 */
function normalizeSongTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Smart match writers for a parsed song
 */
export async function smartMatchWriters(song: ParsedSong): Promise<WriterMatch[]> {
  const matches: WriterMatch[] = [];

  // Get all writers
  const allWriters = await prisma.user.findMany({
    where: { role: 'WRITER' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      ipiNumber: true
    }
  });

  // Strategy 1: IPI Number Exact Match (100% confidence)
  if (song.writerIpiNumber) {
    const ipiMatch = allWriters.find(
      w => w.ipiNumber && w.ipiNumber === song.writerIpiNumber
    );

    if (ipiMatch) {
      matches.push({
        writer: ipiMatch,
        confidence: 100,
        reason: 'IPI number exact match'
      });
      return matches; // IPI match is definitive, return immediately
    }
  }

  // Strategy 2: Writer Name Similarity (parsed from statement)
  if (song.writerName) {
    allWriters.forEach(writer => {
      const fullName = `${writer.firstName || ''} ${writer.lastName || ''}`.trim();

      if (fullName) {
        const similarity = stringSimilarity(song.writerName!, fullName);

        // High confidence: >80% similarity
        if (similarity > 0.8) {
          matches.push({
            writer,
            confidence: Math.round(similarity * 100),
            reason: `Name similarity: "${song.writerName}" ≈ "${fullName}"`
          });
        }
      }
    });
  }

  // Strategy 3: Historical Assignment Match (song title similarity)
  const historicalAssignments = await prisma.statementItem.findMany({
    where: {
      statement: { status: 'PUBLISHED' }
    },
    select: {
      workTitle: true,
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          ipiNumber: true
        }
      }
    },
    distinct: ['userId', 'workTitle']
  });

  const normalizedSongTitle = normalizeSongTitle(song.workTitle);

  historicalAssignments.forEach(assignment => {
    const normalizedHistoricalTitle = normalizeSongTitle(assignment.workTitle);
    const similarity = stringSimilarity(normalizedSongTitle, normalizedHistoricalTitle);

    // Very high similarity: >90%
    if (similarity > 0.9) {
      // Check if this writer is already in matches
      const existingMatch = matches.find(m => m.writer.id === assignment.userId);

      if (!existingMatch) {
        matches.push({
          writer: assignment.user,
          confidence: Math.round(similarity * 90), // Cap at 90% for historical
          reason: `Similar song previously assigned: "${assignment.workTitle}"`
        });
      } else {
        // Boost confidence if multiple strategies match
        existingMatch.confidence = Math.min(100, existingMatch.confidence + 10);
        existingMatch.reason += ' + historical match';
      }
    }
  });

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  // Remove duplicate writers (keep highest confidence)
  const uniqueMatches = matches.filter(
    (match, index, self) =>
      self.findIndex(m => m.writer.id === match.writer.id) === index
  );

  return uniqueMatches;
}

/**
 * Smart match all songs in a parsed statement
 */
export async function smartMatchStatement(
  parsedSongs: ParsedSong[]
): Promise<Map<string, WriterMatch[]>> {
  const matchResults = new Map<string, WriterMatch[]>();

  for (const song of parsedSongs) {
    const matches = await smartMatchWriters(song);
    matchResults.set(song.workTitle, matches);
  }

  return matchResults;
}
```

### 5.2 Smart Assignment Endpoint

**File:** `apps/backend/src/routes/statement.routes.ts`

```typescript
import { smartMatchStatement } from '../utils/writer-matcher';

/**
 * POST /api/statements/:id/smart-assign
 * Auto-assign writers using fuzzy matching
 * Admin only
 */
router.post('/:id/smart-assign', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const statement = await prisma.statement.findUnique({
      where: { id }
    });

    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    // Get parsed items from metadata
    const parsedItems = (statement.metadata as any)?.parsedItems || [];

    if (parsedItems.length === 0) {
      return res.status(400).json({ error: 'No parsed items found' });
    }

    // Run smart matching
    const matchResults = await smartMatchStatement(
      parsedItems.map(item => ({
        workTitle: item.workTitle,
        writerName: item.writerName,
        writerIpiNumber: item.writerIpiNumber
      }))
    );

    // Format results for frontend
    const formattedResults = Array.from(matchResults.entries()).map(([songTitle, matches]) => {
      const topMatch = matches[0];

      return {
        songTitle,
        matches,
        autoAssigned: topMatch && topMatch.confidence > 90,
        suggested: topMatch && topMatch.confidence >= 70 && topMatch.confidence <= 90,
        confidence: topMatch?.confidence || 0,
        topMatch: topMatch || null
      };
    });

    res.json({
      statementId: id,
      songCount: parsedItems.length,
      results: formattedResults
    });
  } catch (error) {
    console.error('Smart assign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 5.3 Frontend UI Integration

**File:** `apps/frontend/src/pages/AdminDashboard.tsx`

Add "Smart Assign" button in writer assignment modal:

```typescript
const handleSmartAssign = async (statementId: string) => {
  try {
    setLoading(true);
    const response = await statementApi.smartAssign(statementId);
    const results = response.data.results;

    // Apply auto-assignments (>90% confidence)
    const autoAssignments = {};
    results.forEach(result => {
      if (result.autoAssigned && result.topMatch) {
        autoAssignments[result.songTitle] = [{
          userId: result.topMatch.writer.id,
          ipiNumber: result.topMatch.writer.ipiNumber,
          splitPercentage: 100
        }];
      }
    });

    // Update state with assignments
    setWriterAssignments(prev => ({ ...prev, ...autoAssignments }));

    // Show suggestions modal for medium confidence matches
    const suggestions = results.filter(r => r.suggested);
    if (suggestions.length > 0) {
      setSmartSuggestions(suggestions);
      setShowSuggestionsModal(true);
    }

    alert(`Auto-assigned ${Object.keys(autoAssignments).length} songs with high confidence.`);
  } catch (error) {
    console.error('Smart assign failed:', error);
    alert('Smart assignment failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

// Render in modal
<div className="smart-assign-section">
  <button onClick={() => handleSmartAssign(selectedStatement.id)}>
    🤖 Smart Assign Writers
  </button>

  {/* Show confidence indicators */}
  {Object.entries(writerAssignments).map(([songTitle, assignments]) => (
    <div key={songTitle} className="song-assignment">
      <h4>{songTitle}</h4>
      {assignments.map((assignment, idx) => (
        <div key={idx} className="assignment-row">
          <span className={`confidence-indicator ${getConfidenceClass(assignment.confidence)}`}>
            {assignment.confidence >= 90 ? '🟢' : assignment.confidence >= 70 ? '🟡' : '🔴'}
          </span>
          <span>{assignment.writerName}</span>
          <span>{assignment.confidence}% confidence</span>
          {assignment.reason && <small>{assignment.reason}</small>}
        </div>
      ))}
    </div>
  ))}
</div>
```

**Estimated Time:** 8 hours

---

## Phase 6: Writer Payment Status Indicators

### 6.1 Dashboard Status Light

**File:** `apps/frontend/src/pages/WriterDashboard.tsx`

```typescript
interface PaymentStatus {
  hasUnpaidStatements: boolean;
  hasPendingStatements: boolean;
  lastPaymentDate: Date | null;
}

const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
  hasUnpaidStatements: false,
  hasPendingStatements: false,
  lastPaymentDate: null
});

// Fetch payment status
useEffect(() => {
  const fetchPaymentStatus = async () => {
    try {
      // Check for statements assigned to this writer that are unpaid/pending
      const response = await api.get('/dashboard/payment-status');
      setPaymentStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch payment status:', error);
    }
  };

  fetchPaymentStatus();
}, []);

// Render status indicator
const renderPaymentStatusLight = () => {
  if (paymentStatus.lastPaymentDate) {
    const daysSincePayment = Math.floor(
      (new Date().getTime() - new Date(paymentStatus.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePayment <= 7) {
      return (
        <div className="payment-status green">
          <span className="status-light">🟢</span>
          <span>Recent payment: {new Date(paymentStatus.lastPaymentDate).toLocaleDateString()}</span>
        </div>
      );
    }
  }

  if (paymentStatus.hasPendingStatements) {
    return (
      <div className="payment-status yellow">
        <span className="status-light">🟡</span>
        <span>Payment pending</span>
      </div>
    );
  }

  return (
    <div className="payment-status red">
      <span className="status-light">🔴</span>
      <span>No pending payments</span>
    </div>
  );
};

// Add to dashboard header
<div className="dashboard-header">
  <h1>Writer Dashboard</h1>
  {renderPaymentStatusLight()}
</div>
```

### 6.2 Backend Endpoint for Payment Status

**File:** `apps/backend/src/routes/dashboard.routes.ts`

```typescript
/**
 * GET /api/dashboard/payment-status
 * Get payment status for current writer
 */
router.get('/payment-status', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Check for unpaid statements where this writer has items
    const unpaidCount = await prisma.statement.count({
      where: {
        status: 'PUBLISHED',
        paymentStatus: 'UNPAID',
        items: {
          some: { userId }
        }
      }
    });

    const pendingCount = await prisma.statement.count({
      where: {
        status: 'PUBLISHED',
        paymentStatus: 'PENDING',
        items: {
          some: { userId }
        }
      }
    });

    // Get last payment date
    const lastPaidItem = await prisma.statementItem.findFirst({
      where: {
        userId,
        isVisibleToWriter: true,
        paidAt: { not: null }
      },
      orderBy: { paidAt: 'desc' },
      select: { paidAt: true }
    });

    res.json({
      hasUnpaidStatements: unpaidCount > 0,
      hasPendingStatements: pendingCount > 0,
      lastPaymentDate: lastPaidItem?.paidAt || null
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Estimated Time:** 3 hours

---

## Phase 7: Testing & Validation

### 7.1 Commission Calculation Tests

**Test Cases:**

1. **Global Commission Test**
   - Set global commission to 20%
   - Process statement with $1000 revenue
   - Verify: Producer Tour gets $200, Writer gets $800

2. **Writer Override Test**
   - Set global commission to 20%
   - Set writer override to 90%
   - Process statement with $1000 revenue
   - Verify: Writer gets $900, Producer Tour gets $100

3. **Multiple Writers with Splits**
   - Global commission: 20%
   - Song revenue: $1000
   - Writer A: 50% split, no override
   - Writer B: 50% split, 90% override
   - Expected:
     - Writer A: ($1000 × 50% = $500) × 80% = $400
     - Writer B: ($1000 × 50% = $500) × 90% = $450
     - Producer Tour: $150 total commission

### 7.2 Payment Workflow Tests

1. **Upload → Publish → Verify Hidden**
   - Upload statement
   - Parse and assign writers
   - Publish statement
   - Login as writer
   - Verify: Earnings not visible in dashboard

2. **Process Payment → Verify Visible**
   - Login as admin
   - Go to Royalty Portal
   - Process payment for statement
   - Login as writer
   - Verify: Earnings now visible

3. **Payment Status Transitions**
   - Published statement: paymentStatus = UNPAID
   - After processing: paymentStatus = PAID
   - StatementItems: isVisibleToWriter = true
   - Verify paidAt timestamp

### 7.3 Smart Matching Tests

1. **IPI Exact Match**
   - Parse statement with IPI number
   - Writer exists with matching IPI
   - Verify: 100% confidence match

2. **Name Fuzzy Match**
   - Parse statement with writer name "John Smith"
   - Writer exists as "John A. Smith"
   - Verify: High confidence match (>80%)

3. **Historical Assignment Match**
   - Song "Shape of You" previously assigned to Writer A
   - New statement has "Shape Of You" (different capitalization)
   - Verify: High confidence match

**Estimated Time:** 4 hours

---

## Implementation Checklist

### Database & Schema
- [ ] Add PaymentStatus enum
- [ ] Update Statement model with payment fields
- [ ] Update StatementItem with visibility fields
- [ ] Add MANAGER to UserRole enum
- [ ] Run Prisma migration
- [ ] Test migration on dev database

### Backend - Statement Flow
- [ ] Update publish endpoint to set paymentStatus = UNPAID
- [ ] Update publish endpoint to create items with isVisibleToWriter = false
- [ ] Update dashboard queries to filter by isVisibleToWriter
- [ ] Update summary stats to only count visible items

### Backend - Payment Processing
- [ ] Create GET /api/statements/unpaid endpoint
- [ ] Create GET /api/statements/:id/payment-summary endpoint
- [ ] Create POST /api/statements/:id/process-payment endpoint
- [ ] Create GET /api/dashboard/payment-status endpoint
- [ ] Test all endpoints with Postman/Thunder Client

### Frontend - API Integration
- [ ] Add payment methods to statementApi
- [ ] Add payment status method to dashboardApi

### Frontend - Royalty Portal
- [ ] Replace mock data with real API calls
- [ ] Implement unpaid statements list
- [ ] Implement payment summary modal
- [ ] Implement process payment workflow
- [ ] Add confirmation dialogs
- [ ] Add loading states
- [ ] Style payment status badges

### Frontend - Writer Dashboard
- [ ] Add payment status light component
- [ ] Fetch payment status on mount
- [ ] Update to only show paid statements
- [ ] Test visibility changes

### Smart Writer Matching
- [ ] Create writer-matcher.ts utility
- [ ] Implement Levenshtein distance algorithm
- [ ] Implement IPI matching logic
- [ ] Implement name similarity matching
- [ ] Implement historical assignment matching
- [ ] Create POST /api/statements/:id/smart-assign endpoint
- [ ] Add smart assign button to admin UI
- [ ] Display confidence scores
- [ ] Show matching reasons
- [ ] Test fuzzy matching accuracy

### Testing
- [ ] Test commission calculations (global + override)
- [ ] Test statement publishing hides from writers
- [ ] Test payment processing makes visible
- [ ] Test payment status transitions
- [ ] Test smart matching with various names
- [ ] Test IPI matching
- [ ] Test historical matching
- [ ] Test multiple writers per song
- [ ] Test writer dashboard filtering
- [ ] End-to-end test full workflow

### Documentation
- [ ] Document new API endpoints
- [ ] Update README with payment workflow
- [ ] Document smart matching algorithm
- [ ] Create admin user guide for payment processing

---

## Risk Assessment & Mitigation

### Risk 1: Existing Data Migration
**Issue:** Existing published statements don't have payment status
**Mitigation:**
- Migration script sets all existing published statements to `PAID`
- Sets all existing items to `isVisibleToWriter = true`
- Writers continue to see historical earnings

### Risk 2: Commission Calculation Bug
**Issue:** Existing commission logic might have edge cases
**Mitigation:**
- Thoroughly test with various scenarios
- Add validation to ensure commissions add up correctly
- Log all commission calculations for audit

### Risk 3: Smart Matching Accuracy
**Issue:** Fuzzy matching might produce false positives
**Mitigation:**
- High threshold for auto-assignment (>90%)
- Medium confidence shows suggestions (70-90%)
- Admin always reviews and can override
- Log matching decisions for improvement

### Risk 4: Payment Processing Performance
**Issue:** Large statements might timeout during payment processing
**Mitigation:**
- Use database transactions for atomicity
- Add timeout limits
- Consider batch processing for very large statements
- Add progress indicators

---

## Future Enhancements (Out of Scope)

1. **Stripe/PayPal Integration**
   - Actual payment disbursement
   - Track transaction IDs
   - Handle payment failures

2. **Batch Payment Processing**
   - Pay multiple statements at once
   - Generate batch payment reports
   - Export to accounting software

3. **Manager Role Permissions**
   - View-only access to statements
   - Generate reports
   - No payment processing capability

4. **Email Notifications**
   - Notify writers when payment processed
   - Send payment receipts
   - Alert admins of unpaid statements

5. **Advanced Smart Matching**
   - Machine learning model
   - ISRC/ISWC code matching
   - Spotify/MusicBrainz integration

6. **Payment Approval Workflow**
   - Multi-step approval process
   - Manager reviews, Admin approves
   - Audit trail

---

## Success Criteria

✅ **Phase 1:** Database schema updated, migrations successful
✅ **Phase 2:** Published statements hidden from writers
✅ **Phase 3:** Payment processing endpoints working
✅ **Phase 4:** Royalty Portal functional with real data
✅ **Phase 5:** Smart matching achieves >80% accuracy
✅ **Phase 6:** Payment status indicators visible to writers
✅ **Phase 7:** All tests passing, commission calculations verified

---

## Questions or Issues?

Contact: [Your contact info]
Repository: [GitHub URL]
Documentation: [Docs URL]

---

**Document Version:** 1.0
**Last Updated:** November 3, 2025
