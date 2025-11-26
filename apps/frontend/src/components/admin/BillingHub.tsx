import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invoiceApi } from '../../lib/api';
import {
  CheckCircle,
  XCircle,
  FileText,
  Eye,
  Filter,
  Loader2,
  X,
  Printer,
  TrendingUp,
  Briefcase,
  Music,
  CreditCard,
  AlertCircle,
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'SESSION' | 'ADVANCE' | 'FEE';
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  description?: string;
  details?: any;
  advanceType?: 'FUTURE_ROYALTY' | 'DEAL_ADVANCE';
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED';
  submittedByName: string;
  submittedByEmail?: string;
  adminNotes?: string;
  rejectionReason?: string;
  stripeTransferId?: string;
  paidAt?: string;
  reviewedAt?: string;
  createdAt: string;
  submittedBy: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    stripeAccountId?: string;
    stripeOnboardingComplete?: boolean;
  };
  reviewedBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  placementDeal?: {
    id: string;
    clientFullName: string;
    songTitle: string;
    artistName: string;
  };
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED';
type TypeFilter = 'ALL' | 'SESSION' | 'ADVANCE' | 'FEE';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  APPROVED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PROCESSING: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  PAID: 'bg-green-500/20 text-green-400 border-green-500/30',
  REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const typeColors: Record<string, string> = {
  SESSION: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  ADVANCE: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  FEE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const typeIcons: Record<string, any> = {
  SESSION: Music,
  ADVANCE: TrendingUp,
  FEE: Briefcase,
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function BillingHub() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', statusFilter, typeFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      const response = await invoiceApi.getAll(params);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const response = await invoiceApi.getStats();
      return response.data;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await invoiceApi.approve(id, notes);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      toast.success(`Invoice ${data.invoiceNumber} approved! Ready for payment processing.`);
      closeActionModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve invoice');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason, notes }: { id: string; reason: string; notes: string }) => {
      const response = await invoiceApi.reject(id, reason, notes);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      toast.success(`Invoice ${data.invoiceNumber} rejected. Submitter will be notified.`);
      closeActionModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reject invoice');
    },
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await invoiceApi.processPayment(id);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      toast.success(`Payment of $${Number(data.netAmount).toFixed(2)} processed for ${data.invoiceNumber}!`);
      setShowDetailModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process payment');
    },
  });

  const invoices: Invoice[] = data?.invoices || [];

  const openActionModal = (invoice: Invoice, action: 'approve' | 'reject') => {
    setSelectedInvoice(invoice);
    setModalAction(action);
    setAdminNotes('');
    setRejectionReason('');
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedInvoice(null);
    setAdminNotes('');
    setRejectionReason('');
  };

  const handleActionSubmit = () => {
    if (!selectedInvoice) return;

    if (modalAction === 'approve') {
      approveMutation.mutate({ id: selectedInvoice.id, notes: adminNotes });
    } else if (modalAction === 'reject') {
      if (!rejectionReason.trim()) {
        toast.error('Rejection reason is required');
        return;
      }
      rejectMutation.mutate({ id: selectedInvoice.id, reason: rejectionReason, notes: adminNotes });
    }
  };

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice ${selectedInvoice?.invoiceNumber}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; }
                .invoice-header { text-align: center; margin-bottom: 40px; }
                .invoice-header h1 { font-size: 28px; margin-bottom: 8px; }
                .invoice-number { font-size: 18px; color: #666; }
                .invoice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                .section-title { font-weight: bold; margin-bottom: 8px; color: #333; }
                .detail-row { margin-bottom: 4px; }
                .detail-label { color: #666; }
                .amounts-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .amounts-table th, .amounts-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                .amounts-table th { background: #f5f5f5; }
                .total-row { font-weight: bold; font-size: 18px; }
                .commission { color: #dc2626; }
                .net { color: #059669; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        toast.success(`Invoice ${selectedInvoice?.invoiceNumber} sent to printer`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Billing Hub</h2>
          <p className="text-text-secondary">Manage all invoices and billing requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-surface-elevated rounded-xl p-4 border border-border">
            <div className="text-yellow-400 text-2xl font-bold">{stats.counts?.pending || 0}</div>
            <div className="text-text-secondary text-sm">Pending</div>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4 border border-border">
            <div className="text-blue-400 text-2xl font-bold">{stats.counts?.approved || 0}</div>
            <div className="text-text-secondary text-sm">Approved</div>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4 border border-border">
            <div className="text-purple-400 text-2xl font-bold">{stats.counts?.processing || 0}</div>
            <div className="text-text-secondary text-sm">Processing</div>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4 border border-border">
            <div className="text-green-400 text-2xl font-bold">{stats.counts?.paid || 0}</div>
            <div className="text-text-secondary text-sm">Paid</div>
          </div>
          <div className="bg-surface-elevated rounded-xl p-4 border border-border">
            <div className="text-green-400 text-2xl font-bold">{formatCurrency(Number(stats.totals?.netPaid) || 0)}</div>
            <div className="text-text-secondary text-sm">Total Paid Out</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-surface-elevated rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-secondary" />
          <span className="text-text-secondary text-sm">Filters:</span>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status
                  ? 'bg-brand-blue text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-elevated'
              }`}
            >
              {status}
              {status === 'PENDING' && stats?.counts?.pending > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-500/30 text-yellow-400 rounded text-xs">
                  {stats.counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="border-l border-border pl-4 flex flex-wrap gap-2">
          {(['ALL', 'SESSION', 'ADVANCE', 'FEE'] as TypeFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                typeFilter === type
                  ? 'bg-brand-blue text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-elevated'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {invoices.length === 0 ? (
          <div className="bg-surface-elevated rounded-xl p-8 border border-border text-center">
            <FileText className="w-12 h-12 text-text-secondary mx-auto mb-3" />
            <p className="text-text-secondary">No invoices found</p>
          </div>
        ) : (
          invoices.map((invoice) => {
            const TypeIcon = typeIcons[invoice.type] || FileText;
            return (
              <div
                key={invoice.id}
                className="bg-surface-elevated rounded-xl p-4 border border-border hover:border-border-hover transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Invoice Info */}
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${typeColors[invoice.type]}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-white font-medium">{invoice.invoiceNumber}</span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${statusColors[invoice.status]}`}>
                          {invoice.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${typeColors[invoice.type]}`}>
                          {invoice.type}
                        </span>
                      </div>
                      <p className="text-text-secondary text-sm">
                        {invoice.submittedByName} • {formatDate(invoice.createdAt)}
                      </p>
                      {invoice.description && (
                        <p className="text-text-secondary text-sm mt-1 line-clamp-1">{invoice.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-4">
                    {/* Amount Info */}
                    <div className="text-right">
                      <div className="text-white font-semibold">{formatCurrency(Number(invoice.grossAmount))}</div>
                      {invoice.commissionRate > 0 && (
                        <div className="text-text-secondary text-sm">
                          Net: <span className="text-green-400">{formatCurrency(Number(invoice.netAmount))}</span>
                          <span className="text-red-400 ml-1">(-{invoice.commissionRate}%)</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowDetailModal(true);
                        }}
                        className="p-2 rounded-lg bg-surface hover:bg-surface-elevated text-text-secondary hover:text-white transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {invoice.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => openActionModal(invoice, 'approve')}
                            className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openActionModal(invoice, 'reject')}
                            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {invoice.status === 'APPROVED' && (
                        <button
                          onClick={() => processPaymentMutation.mutate(invoice.id)}
                          disabled={processPaymentMutation.isPending}
                          className="px-3 py-1.5 rounded-lg bg-brand-blue hover:bg-brand-blue/80 text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {processPaymentMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                          Pay
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stripe Status Warning */}
                {invoice.status === 'APPROVED' && !invoice.submittedBy.stripeOnboardingComplete && (
                  <div className="mt-3 flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4" />
                    Submitter has not completed Stripe onboarding
                  </div>
                )}

                {/* Rejection Reason */}
                {invoice.status === 'REJECTED' && invoice.rejectionReason && (
                  <div className="mt-3 bg-red-500/10 rounded-lg px-3 py-2 text-red-400 text-sm">
                    <strong>Rejection Reason:</strong> {invoice.rejectionReason}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-elevated border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedInvoice.invoiceNumber}</h3>
                <p className="text-text-secondary text-sm">Invoice Details</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="p-2 rounded-lg bg-surface hover:bg-surface-elevated text-text-secondary hover:text-white transition-all"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 rounded-lg bg-surface hover:bg-surface-elevated text-text-secondary hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Type */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${statusColors[selectedInvoice.status]}`}>
                  {selectedInvoice.status}
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${typeColors[selectedInvoice.type]}`}>
                  {selectedInvoice.type}
                </span>
                {selectedInvoice.advanceType && (
                  <span className="px-3 py-1 rounded-lg text-sm font-medium bg-surface text-text-secondary">
                    {selectedInvoice.advanceType.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Submitter Info */}
              <div className="bg-surface rounded-xl p-4">
                <h4 className="text-text-secondary text-sm mb-2">Submitted By</h4>
                <p className="text-white font-medium">{selectedInvoice.submittedByName}</p>
                <p className="text-text-secondary text-sm">{selectedInvoice.submittedByEmail || selectedInvoice.submittedBy.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  {selectedInvoice.submittedBy.stripeOnboardingComplete ? (
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Stripe Connected
                    </span>
                  ) : (
                    <span className="text-yellow-400 text-sm flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Stripe Not Connected
                    </span>
                  )}
                </div>
              </div>

              {/* Financial Details */}
              <div className="bg-surface rounded-xl p-4">
                <h4 className="text-text-secondary text-sm mb-3">Financial Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Gross Amount</span>
                    <span className="text-white font-medium">{formatCurrency(Number(selectedInvoice.grossAmount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Commission Rate</span>
                    <span className="text-red-400">{selectedInvoice.commissionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Commission Amount</span>
                    <span className="text-red-400">-{formatCurrency(Number(selectedInvoice.commissionAmount))}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="text-white font-medium">Net Amount (Payout)</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(Number(selectedInvoice.netAmount))}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedInvoice.description && (
                <div className="bg-surface rounded-xl p-4">
                  <h4 className="text-text-secondary text-sm mb-2">Description</h4>
                  <p className="text-white">{selectedInvoice.description}</p>
                </div>
              )}

              {/* Linked Placement Deal */}
              {selectedInvoice.placementDeal && (
                <div className="bg-surface rounded-xl p-4">
                  <h4 className="text-text-secondary text-sm mb-2">Linked Placement Deal</h4>
                  <p className="text-white font-medium">{selectedInvoice.placementDeal.songTitle}</p>
                  <p className="text-text-secondary text-sm">
                    {selectedInvoice.placementDeal.artistName} • {selectedInvoice.placementDeal.clientFullName}
                  </p>
                </div>
              )}

              {/* Admin Notes */}
              {selectedInvoice.adminNotes && (
                <div className="bg-surface rounded-xl p-4">
                  <h4 className="text-text-secondary text-sm mb-2">Admin Notes</h4>
                  <p className="text-white">{selectedInvoice.adminNotes}</p>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedInvoice.rejectionReason && (
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                  <h4 className="text-red-400 text-sm mb-2">Rejection Reason</h4>
                  <p className="text-red-300">{selectedInvoice.rejectionReason}</p>
                </div>
              )}

              {/* Payment Info */}
              {selectedInvoice.stripeTransferId && (
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                  <h4 className="text-green-400 text-sm mb-2">Payment Completed</h4>
                  <p className="text-green-300 text-sm">
                    Transfer ID: <span className="font-mono">{selectedInvoice.stripeTransferId}</span>
                  </p>
                  {selectedInvoice.paidAt && (
                    <p className="text-green-300 text-sm mt-1">
                      Paid: {formatDate(selectedInvoice.paidAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {selectedInvoice.status === 'PENDING' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openActionModal(selectedInvoice, 'approve');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openActionModal(selectedInvoice, 'reject');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}

              {selectedInvoice.status === 'APPROVED' && (
                <button
                  onClick={() => processPaymentMutation.mutate(selectedInvoice.id)}
                  disabled={processPaymentMutation.isPending || !selectedInvoice.submittedBy.stripeOnboardingComplete}
                  className="w-full py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue/80 text-white font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processPaymentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  Process Payment ({formatCurrency(Number(selectedInvoice.netAmount))})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Approve/Reject) */}
      {showActionModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl border border-border max-w-md w-full">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-white">
                {modalAction === 'approve' ? 'Approve Invoice' : 'Reject Invoice'}
              </h3>
              <p className="text-text-secondary text-sm">{selectedInvoice.invoiceNumber}</p>
            </div>

            <div className="p-4 space-y-4">
              {modalAction === 'reject' && (
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Rejection Reason <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-white placeholder-text-secondary focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all resize-none"
                    placeholder="Explain why this invoice is being rejected..."
                  />
                </div>
              )}

              <div>
                <label className="block text-text-secondary text-sm mb-2">Admin Notes (optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-white placeholder-text-secondary focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all resize-none"
                  placeholder="Internal notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeActionModal}
                  className="flex-1 py-2.5 rounded-xl bg-surface hover:bg-surface-elevated text-text-secondary font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionSubmit}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className={`flex-1 py-2.5 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                    modalAction === 'approve'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {(approveMutation.isPending || rejectMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {modalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-lg bg-brand-blue hover:bg-brand-blue/80 text-white text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div ref={invoiceRef} className="p-8 text-gray-900">
              {/* Invoice Header */}
              <div className="invoice-header text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">PRODUCER TOUR</h1>
                <p className="text-gray-500 mt-1">Invoice</p>
                <p className="invoice-number text-lg font-mono mt-2">{selectedInvoice.invoiceNumber}</p>
              </div>

              {/* Invoice Grid */}
              <div className="invoice-grid grid grid-cols-2 gap-8 mb-8">
                <div>
                  <div className="section-title font-semibold text-gray-700 mb-2">From:</div>
                  <p className="text-gray-900">{selectedInvoice.submittedByName}</p>
                  <p className="text-gray-600 text-sm">{selectedInvoice.submittedByEmail || selectedInvoice.submittedBy.email}</p>
                </div>
                <div>
                  <div className="section-title font-semibold text-gray-700 mb-2">Invoice Details:</div>
                  <p className="text-gray-600 text-sm">
                    <strong>Type:</strong> {selectedInvoice.type}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Date:</strong> {formatDate(selectedInvoice.createdAt)}
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Status:</strong> {selectedInvoice.status}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedInvoice.description && (
                <div className="mb-6">
                  <div className="section-title font-semibold text-gray-700 mb-2">Description:</div>
                  <p className="text-gray-600">{selectedInvoice.description}</p>
                </div>
              )}

              {/* Amounts Table */}
              <table className="amounts-table w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 border-b border-gray-200">Description</th>
                    <th className="text-right p-3 border-b border-gray-200">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 border-b border-gray-200">{selectedInvoice.type} Payment</td>
                    <td className="text-right p-3 border-b border-gray-200">{formatCurrency(Number(selectedInvoice.grossAmount))}</td>
                  </tr>
                  {selectedInvoice.commissionRate > 0 && (
                    <tr>
                      <td className="p-3 border-b border-gray-200 commission text-red-600">
                        Commission ({selectedInvoice.commissionRate}%)
                      </td>
                      <td className="text-right p-3 border-b border-gray-200 commission text-red-600">
                        -{formatCurrency(Number(selectedInvoice.commissionAmount))}
                      </td>
                    </tr>
                  )}
                  <tr className="total-row font-bold text-lg">
                    <td className="p-3 net text-green-600">Net Payout</td>
                    <td className="text-right p-3 net text-green-600">{formatCurrency(Number(selectedInvoice.netAmount))}</td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
                <p>Thank you for your work!</p>
                <p className="mt-1">Producer Tour • producertour.com</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
