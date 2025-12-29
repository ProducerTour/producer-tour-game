import { Building2, Shield, FileText, Users, Wallet } from 'lucide-react';
import { EntityData } from '../types';

// Corporate entities with positions scaled 3.5x for expanded universe
export const entities: EntityData[] = [
  {
    id: 'holdings',
    name: 'Producer Tour Holdings, Inc.',
    shortName: 'Holdings',
    type: 'Delaware C-Corp',
    jurisdiction: 'DE',
    color: '#3b82f6',
    position: [0, 21, 0], // TOP CENTER - Parent company
    purpose: 'Parent company - owns all LLCs, holds equity, QSBS eligible for 100% capital gains exclusion on exit',
    taxNote: '21% federal rate, retained earnings for reinvestment. QSBS eligible after 5 years.',
    icon: Building2,
    owns: ['100% of all 4 LLCs', 'Consolidated reporting', 'QSBS eligibility', 'Investor-ready structure'],
    doesNot: ['Operate directly', 'Sign client contracts', 'Hold operational IP'],
    criticalDocs: ['Bylaws', 'Shareholder Agreement', 'Board Resolutions', 'Stock Certificates'],
    taxRate: '21%',
    stateTax: '$0 (no DE operations)',
    complianceItems: [
      { task: 'Annual meeting & minutes', frequency: 'Annual', critical: true },
      { task: 'Franchise tax filing', frequency: 'Annual', critical: true },
      { task: 'Board resolutions for distributions', frequency: 'As needed', critical: true }
    ]
  },
  {
    id: 'ip',
    name: 'Producer Tour IP LLC',
    shortName: 'IP LLC',
    type: 'Delaware LLC',
    jurisdiction: 'DE',
    color: '#a855f7',
    position: [-49, 7, 21], // FRONT LEFT - IP vault
    purpose: 'The vault - holds trademarks, software, brand assets. Protected from operational liability.',
    taxNote: 'Disregarded entity → income flows to C-Corp at 21%. Strongest charging order protection in the US.',
    icon: Shield,
    owns: ['Producer Tour trademark', 'Software & code', 'Brand assets', 'Proprietary processes'],
    doesNot: ['Sign client contracts', 'Run operations', 'Handle payments'],
    criticalDocs: ['IP Assignment Agreements', 'Trademark filings', 'IP License to PT LLC', 'Asset inventory'],
    taxRate: '21% (→ C-Corp)',
    stateTax: '$0 DE state tax',
    complianceItems: [
      { task: 'Trademark maintenance', frequency: 'Annual', critical: true },
      { task: 'IP registry update', frequency: 'Quarterly', critical: false },
      { task: 'License fee collection', frequency: 'Quarterly', critical: true }
    ]
  },
  {
    id: 'admin',
    name: 'Producer Tour LLC',
    shortName: 'PT LLC',
    type: 'Florida LLC',
    jurisdiction: 'FL',
    color: '#f59e0b',
    position: [0, 7, 0], // TRUE CENTER - Client-facing hub
    purpose: 'Admin entity - client agreements, PRO relationships, trust accounting. Client royalties are NOT revenue.',
    taxNote: 'Client royalties = trust liability. Only 10-15% commission is taxable revenue. FL = $0 state tax.',
    icon: FileText,
    owns: ['Client relationships', 'PRO registrations', 'Admin agreements', 'Trust accounting'],
    doesNot: ['Own IP', 'Run payroll', 'Handle operations'],
    criticalDocs: ['Client MSA + SOW', 'PRO agreements', 'IP License from IP LLC', 'Services Agreement with Ops'],
    taxRate: '21% (→ C-Corp)',
    stateTax: '$0 FL state tax',
    complianceItems: [
      { task: 'Client trust reconciliation', frequency: 'Monthly', critical: true },
      { task: 'PRO registration audits', frequency: 'Quarterly', critical: true },
      { task: 'Pay IP license fees', frequency: 'Quarterly', critical: true },
      { task: 'Pay services fees to Ops', frequency: 'Monthly', critical: true }
    ]
  },
  {
    id: 'ops',
    name: 'Producer Tour Ops LLC',
    shortName: 'Ops LLC',
    type: 'Florida LLC',
    jurisdiction: 'FL',
    color: '#22c55e',
    position: [49, 7, 21], // FRONT RIGHT - Operations
    purpose: 'Operations - payroll, contractors, day-to-day vendors. All employees work here.',
    taxNote: 'No FICA on LLC profits (corp-owned). Officers get W-2 wages with normal payroll tax.',
    icon: Users,
    owns: ['Employee relationships', 'Contractor agreements', 'Vendor relationships', 'Day-to-day operations'],
    doesNot: ['Sign client contracts', 'Own IP', 'Hold client funds'],
    criticalDocs: ['Employment agreements', 'Contractor IP assignments', 'Intercompany Services Agreement', 'Insurance policies'],
    taxRate: '21% (→ C-Corp)',
    stateTax: '$0 FL state tax',
    complianceItems: [
      { task: 'Payroll processing', frequency: 'Bi-weekly', critical: true },
      { task: 'Contractor IP assignment audit', frequency: 'Quarterly', critical: true },
      { task: 'Insurance review', frequency: 'Annual', critical: false }
    ]
  },
  {
    id: 'finance',
    name: 'Producer Tour Finance LLC',
    shortName: 'Finance',
    type: 'Florida LLC',
    jurisdiction: 'FL',
    color: '#10b981',
    position: [0, 7, -49], // BACK CENTER - Treasury
    purpose: 'Treasury - distributions, reserves, owner payouts. Separates treasury risk from operations.',
    taxNote: 'Manages cash flow to Holdings. Maintains operating reserves and handles distributions.',
    icon: Wallet,
    owns: ['Treasury management', 'Distribution policy', 'Reserve accounts', 'Intercompany lending'],
    doesNot: ['Sign client contracts', 'Own IP', 'Run operations'],
    criticalDocs: ['Distribution policy', 'Cash management policy', 'Reserve requirements', 'Treasury controls'],
    taxRate: '21% (→ C-Corp)',
    stateTax: '$0 FL state tax',
    complianceItems: [
      { task: 'Intercompany reconciliation', frequency: 'Monthly', critical: true },
      { task: 'Distribution documentation', frequency: 'Quarterly', critical: true },
      { task: 'Reserve level review', frequency: 'Quarterly', critical: false }
    ]
  }
];
