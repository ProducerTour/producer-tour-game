import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAuthToken } from '../../lib/api';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Music,
  DollarSign,
  FileText,
  Download,
  Eye,
  Filter,
  Loader2,
  X,
  Printer,
} from 'lucide-react';

interface SessionPayout {
  id: string;
  workOrderNumber: string;
  sessionDate: string;
  artistName: string;
  songTitles: string;
  startTime: string;
  finishTime: string;
  totalHours: number;
  studioName: string;
  trackingEngineer: string;
  assistantEngineer?: string;
  mixEngineer?: string;
  masteringEngineer?: string;
  sessionNotes?: string;
  masterLink: string;
  sessionFilesLink: string;
  beatStemsLink: string;
  beatLink: string;
  sampleInfo?: string;
  midiPresetsLink?: string;
  studioRateType: string;
  studioRate: number;
  engineerRateType: string;
  engineerRate: number;
  paymentSplit: string;
  depositPaid: number;
  studioCost: number;
  engineerFee: number;
  totalSessionCost: number;
  payoutAmount: number;
  submittedByName: string;
  submittedByEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPUTED' | 'PROCESSING' | 'COMPLETED';
  adminNotes?: string;
  rejectionReason?: string;
  disputeReason?: string;
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
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPUTED' | 'PROCESSING' | 'COMPLETED';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  APPROVED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
  DISPUTED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PROCESSING: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function RecordingSessionsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedPayout, setSelectedPayout] = useState<SessionPayout | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'dispute'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch session payouts
  const { data, isLoading } = useQuery({
    queryKey: ['admin-session-payouts', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      params.append('limit', '100');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/session-payouts?${params}`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch session payouts');
      return response.json();
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/session-payouts/${id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ adminNotes: notes }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session-payouts'] });
      toast.success('Session payout approved');
      closeActionModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve session payout');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason, notes }: { id: string; reason: string; notes: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/session-payouts/${id}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ rejectionReason: reason, adminNotes: notes }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session-payouts'] });
      toast.success('Session payout rejected');
      closeActionModal();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject session payout');
    },
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/session-payouts/${id}/process-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process payment');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-session-payouts'] });
      toast.success('Payment processed successfully');
      setShowDetailModal(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process payment');
    },
  });

  const openActionModal = (payout: SessionPayout, action: 'approve' | 'reject' | 'dispute') => {
    setSelectedPayout(payout);
    setModalAction(action);
    setAdminNotes('');
    setRejectionReason('');
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    setShowActionModal(false);
    setSelectedPayout(null);
    setAdminNotes('');
    setRejectionReason('');
  };

  const handleConfirmAction = async () => {
    if (!selectedPayout) return;

    if (modalAction === 'approve') {
      await approveMutation.mutateAsync({ id: selectedPayout.id, notes: adminNotes });
    } else if (modalAction === 'reject') {
      if (!rejectionReason.trim()) {
        toast.error('Rejection reason is required');
        return;
      }
      await rejectMutation.mutateAsync({ id: selectedPayout.id, reason: rejectionReason, notes: adminNotes });
    }
  };

  const openDetailModal = (payout: SessionPayout) => {
    setSelectedPayout(payout);
    setShowDetailModal(true);
  };

  const openInvoiceModal = (payout: SessionPayout) => {
    setSelectedPayout(payout);
    setShowInvoiceModal(true);
  };

  const handlePrintInvoice = () => {
    if (invoiceRef.current) {
      const printContent = invoiceRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice - ${selectedPayout?.workOrderNumber}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
                .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
                .invoice-title { font-size: 32px; font-weight: bold; color: #1e293b; }
                .section { margin-bottom: 24px; }
                .section-title { font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
                .field { margin-bottom: 8px; }
                .field-label { font-size: 12px; color: #94a3b8; }
                .field-value { font-size: 14px; color: #1e293b; font-weight: 500; }
                .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                .table th { background: #f8fafc; font-weight: 600; color: #475569; }
                .total-row { font-weight: bold; background: #f1f5f9; }
                .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                .status-completed { background: #dcfce7; color: #166534; }
                .status-approved { background: #dbeafe; color: #1e40af; }
                .status-pending { background: #fef3c7; color: #92400e; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
                @media print { body { padding: 20px; } }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading recording sessions...</div>
      </div>
    );
  }

  const payouts: SessionPayout[] = data?.sessionPayouts || [];
  const pendingCount = payouts.filter((p) => p.status === 'PENDING').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Recording Sessions</h2>
        <p className="text-slate-400">
          Manage session payout requests from engineers
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
              {pendingCount} pending
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">Status:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DISPUTED', 'PROCESSING', 'COMPLETED'] as StatusFilter[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
              </button>
            )
          )}
        </div>
      </div>

      {/* Session Payouts List */}
      {payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <Music className="w-16 h-16 mb-4 opacity-20" />
          <div className="text-lg mb-2">No recording sessions found</div>
          <div className="text-sm">
            {statusFilter !== 'ALL' ? `No ${statusFilter.toLowerCase()} sessions` : 'Session payouts will appear here'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header Row */}
                  <div className="flex items-center gap-3 mb-3">
                    <Music className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">{payout.artistName || 'Untitled Session'}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${statusColors[payout.status]}`}>
                      {payout.status}
                    </span>
                    <span className="text-sm text-slate-500">#{payout.workOrderNumber}</span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Submitted By</div>
                      <div className="text-sm text-white">{payout.submittedByName}</div>
                      <div className="text-xs text-slate-400">{payout.submittedByEmail}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Session Date</div>
                      <div className="text-sm text-white">{formatDate(payout.sessionDate)}</div>
                      <div className="text-xs text-slate-400">
                        {payout.startTime} - {payout.finishTime}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Studio</div>
                      <div className="text-sm text-white">{payout.studioName || '-'}</div>
                      <div className="text-xs text-slate-400">{payout.totalHours} hours</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Payout Amount</div>
                      <div className="text-lg font-semibold text-green-400">{formatCurrency(payout.payoutAmount)}</div>
                    </div>
                  </div>

                  {/* Song Titles */}
                  {payout.songTitles && (
                    <div className="text-sm text-slate-300 mb-4">
                      <span className="text-slate-500">Songs:</span> {payout.songTitles}
                    </div>
                  )}

                  {/* Admin Notes / Rejection Reason */}
                  {payout.rejectionReason && (
                    <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg mb-4">
                      <strong>Rejection Reason:</strong> {payout.rejectionReason}
                    </div>
                  )}
                  {payout.adminNotes && (
                    <div className="text-sm text-slate-400 bg-slate-700/50 px-3 py-2 rounded-lg mb-4">
                      <strong>Admin Notes:</strong> {payout.adminNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => openDetailModal(payout)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>

                {payout.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => openActionModal(payout, 'approve')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => openActionModal(payout, 'reject')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}

                {payout.status === 'APPROVED' && (
                  <button
                    onClick={() => processPaymentMutation.mutate(payout.id)}
                    disabled={processPaymentMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {processPaymentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <DollarSign className="w-4 h-4" />
                    )}
                    Process Payment
                  </button>
                )}

                <button
                  onClick={() => openInvoiceModal(payout)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Generate Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                Session Details - {selectedPayout.workOrderNumber}
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span className={`px-3 py-1 text-sm rounded-full border ${statusColors[selectedPayout.status]}`}>
                {selectedPayout.status}
              </span>
            </div>

            {/* Session Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-400 uppercase">Session Information</h4>
                <div className="space-y-2">
                  <div><span className="text-slate-500">Artist:</span> <span className="text-white">{selectedPayout.artistName || '-'}</span></div>
                  <div><span className="text-slate-500">Songs:</span> <span className="text-white">{selectedPayout.songTitles || '-'}</span></div>
                  <div><span className="text-slate-500">Date:</span> <span className="text-white">{formatDate(selectedPayout.sessionDate)}</span></div>
                  <div><span className="text-slate-500">Time:</span> <span className="text-white">{selectedPayout.startTime} - {selectedPayout.finishTime} ({selectedPayout.totalHours}h)</span></div>
                  <div><span className="text-slate-500">Studio:</span> <span className="text-white">{selectedPayout.studioName || '-'}</span></div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-400 uppercase">Team</h4>
                <div className="space-y-2">
                  <div><span className="text-slate-500">Tracking Engineer:</span> <span className="text-white">{selectedPayout.trackingEngineer || '-'}</span></div>
                  <div><span className="text-slate-500">Assistant Engineer:</span> <span className="text-white">{selectedPayout.assistantEngineer || '-'}</span></div>
                  <div><span className="text-slate-500">Mix Engineer:</span> <span className="text-white">{selectedPayout.mixEngineer || '-'}</span></div>
                  <div><span className="text-slate-500">Mastering Engineer:</span> <span className="text-white">{selectedPayout.masteringEngineer || '-'}</span></div>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-400 uppercase mb-4">Deliverables</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedPayout.masterLink && (
                  <a href={selectedPayout.masterLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-sm text-blue-400 hover:bg-slate-600">
                    <Download className="w-4 h-4" /> Master
                  </a>
                )}
                {selectedPayout.sessionFilesLink && (
                  <a href={selectedPayout.sessionFilesLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-sm text-blue-400 hover:bg-slate-600">
                    <Download className="w-4 h-4" /> Session Files
                  </a>
                )}
                {selectedPayout.beatStemsLink && (
                  <a href={selectedPayout.beatStemsLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-sm text-blue-400 hover:bg-slate-600">
                    <Download className="w-4 h-4" /> Beat Stems
                  </a>
                )}
                {selectedPayout.beatLink && (
                  <a href={selectedPayout.beatLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg text-sm text-blue-400 hover:bg-slate-600">
                    <Download className="w-4 h-4" /> Beat
                  </a>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-slate-400 uppercase mb-4">Payment Details</h4>
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Payment Split:</span> <span className="text-white capitalize">{selectedPayout.paymentSplit}</span></div>
                  <div><span className="text-slate-500">Deposit Paid:</span> <span className="text-white">{formatCurrency(selectedPayout.depositPaid)}</span></div>
                  <div><span className="text-slate-500">Studio Cost:</span> <span className="text-white">{formatCurrency(selectedPayout.studioCost)}</span></div>
                  <div><span className="text-slate-500">Engineer Fee:</span> <span className="text-white">{formatCurrency(selectedPayout.engineerFee)}</span></div>
                  <div><span className="text-slate-500">Total Session Cost:</span> <span className="text-white">{formatCurrency(selectedPayout.totalSessionCost)}</span></div>
                  <div><span className="text-slate-500 font-semibold">Payout Amount:</span> <span className="text-green-400 font-semibold">{formatCurrency(selectedPayout.payoutAmount)}</span></div>
                </div>
              </div>
            </div>

            {/* Stripe Info */}
            {selectedPayout.submittedBy && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-400 uppercase mb-4">Stripe Status</h4>
                <div className="bg-slate-900 rounded-lg p-4 text-sm">
                  {selectedPayout.submittedBy.stripeOnboardingComplete ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Stripe account connected
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      Stripe onboarding not complete
                    </div>
                  )}
                  {selectedPayout.stripeTransferId && (
                    <div className="mt-2 text-slate-400">
                      Transfer ID: {selectedPayout.stripeTransferId}
                    </div>
                  )}
                  {selectedPayout.paidAt && (
                    <div className="mt-2 text-slate-400">
                      Paid at: {formatDate(selectedPayout.paidAt)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session Notes */}
            {selectedPayout.sessionNotes && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-400 uppercase mb-4">Session Notes</h4>
                <div className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300">
                  {selectedPayout.sessionNotes}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openInvoiceModal(selectedPayout);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <FileText className="w-4 h-4" />
                Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Approve/Reject) */}
      {showActionModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-md w-full p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {modalAction === 'approve' ? 'Approve' : modalAction === 'reject' ? 'Reject' : 'Dispute'} Session Payout
            </h3>
            <p className="text-slate-300 mb-4">
              {modalAction === 'approve'
                ? `Approve payout of ${formatCurrency(selectedPayout.payoutAmount)} to ${selectedPayout.submittedByName}?`
                : `Reject payout request from ${selectedPayout.submittedByName}?`}
            </p>

            {modalAction === 'reject' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Provide reason for rejection..."
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Admin Notes (Optional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeActionModal}
                className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={
                  (modalAction === 'reject' && !rejectionReason.trim()) ||
                  approveMutation.isPending ||
                  rejectMutation.isPending
                }
                className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${
                  modalAction === 'approve'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {approveMutation.isPending || rejectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : modalAction === 'approve' ? (
                  'Approve'
                ) : (
                  'Reject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Print Actions */}
            <div className="sticky top-0 bg-slate-100 px-6 py-3 border-b flex items-center justify-between">
              <span className="text-slate-600 font-medium">Invoice Preview</span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Invoice Content */}
            <div ref={invoiceRef} className="p-8">
              {/* Header */}
              <div className="invoice-header flex justify-between items-start mb-8">
                <div>
                  <div className="logo text-2xl font-bold text-blue-600">Producer Tour</div>
                  <div className="text-slate-500 text-sm mt-1">Recording Session Invoice</div>
                </div>
                <div className="text-right">
                  <div className="invoice-title text-2xl font-bold text-slate-800">INVOICE</div>
                  <div className="text-slate-500 mt-1">#{selectedPayout.workOrderNumber}</div>
                  <div className={`status mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedPayout.status === 'COMPLETED' ? 'status-completed bg-green-100 text-green-800' :
                    selectedPayout.status === 'APPROVED' ? 'status-approved bg-blue-100 text-blue-800' :
                    'status-pending bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedPayout.status}
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="section">
                  <div className="section-title text-xs font-semibold text-slate-500 uppercase mb-2">From</div>
                  <div className="text-slate-800 font-medium">{selectedPayout.submittedByName}</div>
                  <div className="text-slate-500 text-sm">{selectedPayout.submittedByEmail}</div>
                </div>
                <div className="section">
                  <div className="section-title text-xs font-semibold text-slate-500 uppercase mb-2">Session Details</div>
                  <div className="field">
                    <div className="field-label text-xs text-slate-400">Artist</div>
                    <div className="field-value text-sm text-slate-800 font-medium">{selectedPayout.artistName || '-'}</div>
                  </div>
                  <div className="field mt-2">
                    <div className="field-label text-xs text-slate-400">Date</div>
                    <div className="field-value text-sm text-slate-800 font-medium">{formatDate(selectedPayout.sessionDate)}</div>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              <div className="section mb-8">
                <div className="section-title text-xs font-semibold text-slate-500 uppercase mb-3">Session Information</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Songs:</span> <span className="text-slate-800">{selectedPayout.songTitles || '-'}</span></div>
                  <div><span className="text-slate-500">Studio:</span> <span className="text-slate-800">{selectedPayout.studioName || '-'}</span></div>
                  <div><span className="text-slate-500">Time:</span> <span className="text-slate-800">{selectedPayout.startTime} - {selectedPayout.finishTime}</span></div>
                  <div><span className="text-slate-500">Duration:</span> <span className="text-slate-800">{selectedPayout.totalHours} hours</span></div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="section mb-8">
                <div className="section-title text-xs font-semibold text-slate-500 uppercase mb-3">Cost Breakdown</div>
                <table className="table w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-3 px-4 text-slate-600 font-semibold">Description</th>
                      <th className="text-right py-3 px-4 text-slate-600 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPayout.paymentSplit === 'split' ? (
                      <>
                        <tr>
                          <td className="py-3 px-4 border-b border-slate-200 text-slate-700">
                            Studio Rate ({selectedPayout.studioRateType === 'hourly' ? `$${selectedPayout.studioRate}/hr x ${selectedPayout.totalHours}hrs` : 'Flat Rate'})
                          </td>
                          <td className="py-3 px-4 border-b border-slate-200 text-right text-slate-800">{formatCurrency(selectedPayout.studioCost)}</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 border-b border-slate-200 text-slate-700">
                            Engineer Fee ({selectedPayout.engineerRateType === 'hourly' ? `$${selectedPayout.engineerRate}/hr x ${selectedPayout.totalHours}hrs` : 'Flat Rate'})
                          </td>
                          <td className="py-3 px-4 border-b border-slate-200 text-right text-slate-800">{formatCurrency(selectedPayout.engineerFee)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td className="py-3 px-4 border-b border-slate-200 text-slate-700">Total Session Cost (Combined)</td>
                        <td className="py-3 px-4 border-b border-slate-200 text-right text-slate-800">{formatCurrency(selectedPayout.totalSessionCost)}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-3 px-4 border-b border-slate-200 text-slate-700">Subtotal</td>
                      <td className="py-3 px-4 border-b border-slate-200 text-right text-slate-800">{formatCurrency(selectedPayout.totalSessionCost)}</td>
                    </tr>
                    {selectedPayout.depositPaid > 0 && (
                      <tr>
                        <td className="py-3 px-4 border-b border-slate-200 text-slate-700">Deposit Paid</td>
                        <td className="py-3 px-4 border-b border-slate-200 text-right text-green-600">-{formatCurrency(selectedPayout.depositPaid)}</td>
                      </tr>
                    )}
                    <tr className="total-row bg-slate-100">
                      <td className="py-3 px-4 font-bold text-slate-800">Amount Due</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(selectedPayout.payoutAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="footer text-center text-slate-500 text-xs pt-4 border-t border-slate-200">
                <p>Thank you for your business!</p>
                <p className="mt-1">Generated on {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
