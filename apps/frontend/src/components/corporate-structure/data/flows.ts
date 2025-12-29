import { FlowConnection } from '../types';

// Intercompany flow connections
export const flowConnections: FlowConnection[] = [
  // Ownership lines
  {
    from: 'holdings',
    to: 'ip',
    label: '100% Ownership',
    type: 'ownership',
    color: '#3b82f6',
    description: 'Holdings owns IP LLC as a single-member LLC (disregarded entity)'
  },
  {
    from: 'holdings',
    to: 'admin',
    label: '100% Ownership',
    type: 'ownership',
    color: '#3b82f6',
    description: 'Holdings owns PT LLC as a single-member LLC (disregarded entity)'
  },
  {
    from: 'holdings',
    to: 'ops',
    label: '100% Ownership',
    type: 'ownership',
    color: '#3b82f6',
    description: 'Holdings owns Ops LLC as a single-member LLC (disregarded entity)'
  },
  {
    from: 'holdings',
    to: 'finance',
    label: '100% Ownership',
    type: 'ownership',
    color: '#3b82f6',
    description: 'Holdings owns Finance LLC as a single-member LLC (disregarded entity)'
  },

  // Intercompany flows
  {
    from: 'ip',
    to: 'admin',
    label: 'IP License',
    type: 'license',
    color: '#a855f7',
    amount: '$$$',
    description: 'Quarterly license fees for trademark, software, and brand assets at arm\'s length pricing'
  },
  {
    from: 'ops',
    to: 'admin',
    label: 'Services',
    type: 'services',
    color: '#22c55e',
    amount: '$$',
    description: 'Monthly services agreement for staffing, support, and operations at cost-plus 10-15%'
  },
  {
    from: 'admin',
    to: 'finance',
    label: 'Net Profits',
    type: 'distribution',
    color: '#f59e0b',
    amount: '$$$',
    description: 'After intercompany payments, net profits flow to Finance for treasury management'
  },
  {
    from: 'finance',
    to: 'holdings',
    label: 'Distributions',
    type: 'distribution',
    color: '#10b981',
    amount: '$$$$',
    description: 'Quarterly distributions to Holdings for retained earnings or shareholder dividends'
  },
];
