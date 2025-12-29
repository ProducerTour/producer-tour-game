/**
 * Export Generator Utility
 *
 * Generates CSV and Excel exports for accounting and payment processing.
 */

import { Parser } from 'json2csv';

export interface PaymentExportRow {
  statementId: string;
  proType: string;
  filename: string;
  publishedDate: string;
  paymentDate: string;
  writerName: string;
  writerEmail: string;
  songCount: number;
  grossRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  netPayment: number;
  paymentStatus: string;
}

export interface StatementExportSummary {
  statementId: string;
  proType: string;
  filename: string;
  publishedDate: string;
  paymentDate: string | null;
  totalWriters: number;
  totalSongs: number;
  totalGrossRevenue: number;
  totalCommission: number;
  totalNetPayments: number;
  paymentStatus: string;
}

/**
 * Generate CSV export for a single statement's payment details
 */
export function generatePaymentCSV(rows: PaymentExportRow[]): string {
  const fields = [
    { label: 'Statement ID', value: 'statementId' },
    { label: 'Statement', value: 'proType' },
    { label: 'Filename', value: 'filename' },
    { label: 'Published Date', value: 'publishedDate' },
    { label: 'Payment Date', value: 'paymentDate' },
    { label: 'Writer Name', value: 'writerName' },
    { label: 'Writer Email', value: 'writerEmail' },
    { label: 'Song Count', value: 'songCount' },
    { label: 'Gross Revenue', value: 'grossRevenue' },
    { label: 'Commission Rate (%)', value: 'commissionRate' },
    { label: 'Commission Amount', value: 'commissionAmount' },
    { label: 'Net Payment', value: 'netPayment' },
    { label: 'Payment Status', value: 'paymentStatus' }
  ];

  const parser = new Parser({ fields });
  return parser.parse(rows);
}

/**
 * Generate CSV export for multiple statements summary
 */
export function generateStatementSummaryCSV(summaries: StatementExportSummary[]): string {
  const fields = [
    { label: 'Statement ID', value: 'statementId' },
    { label: 'Statement', value: 'proType' },
    { label: 'Filename', value: 'filename' },
    { label: 'Published Date', value: 'publishedDate' },
    { label: 'Payment Date', value: 'paymentDate' },
    { label: 'Total Writers', value: 'totalWriters' },
    { label: 'Total Songs', value: 'totalSongs' },
    { label: 'Total Gross Revenue', value: 'totalGrossRevenue' },
    { label: 'Total Commission', value: 'totalCommission' },
    { label: 'Total Net Payments', value: 'totalNetPayments' },
    { label: 'Payment Status', value: 'paymentStatus' }
  ];

  const parser = new Parser({ fields });
  return parser.parse(summaries);
}

/**
 * Generate QuickBooks-compatible CSV format
 */
export function generateQuickBooksCSV(rows: PaymentExportRow[]): string {
  // QuickBooks IIF format for expenses
  const qbRows = rows.map(row => ({
    'TRNS Type': 'GENERAL JOURNAL',
    'Date': row.paymentDate,
    'Account': 'Commission Expense',
    'Name': 'Producer Tour LLC',
    'Amount': row.commissionAmount.toFixed(2),
    'Memo': `${row.proType} - ${row.filename}`,
    'Class': row.proType
  })).concat(rows.map(row => ({
    'TRNS Type': 'GENERAL JOURNAL',
    'Date': row.paymentDate,
    'Account': 'Royalty Expense',
    'Name': row.writerName,
    'Amount': row.netPayment.toFixed(2),
    'Memo': `${row.songCount} songs - ${row.proType}`,
    'Class': row.proType
  })));

  const fields = [
    { label: 'TRNS Type', value: 'TRNS Type' },
    { label: 'Date', value: 'Date' },
    { label: 'Account', value: 'Account' },
    { label: 'Name', value: 'Name' },
    { label: 'Amount', value: 'Amount' },
    { label: 'Memo', value: 'Memo' },
    { label: 'Class', value: 'Class' }
  ];

  const parser = new Parser({ fields });
  return parser.parse(qbRows);
}

/**
 * Format date for export
 */
export function formatExportDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}
