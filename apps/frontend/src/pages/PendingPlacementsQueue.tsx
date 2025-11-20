import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, FileText, Music, AlertCircle,
  DollarSign, Percent, Calendar, Clock,
  ChevronDown, ChevronUp, Search
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { workRegistrationApi, WorkSubmission } from '@/lib/workRegistrationApi';
import { SubmissionStatusBadge } from '@/components/SubmissionStatusBadge';

type ActionType = 'approve' | 'deny' | 'request_documents';

export default function PendingPlacementsQueue() {
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<WorkSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<WorkSubmission | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingSubmissions();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSubmissions(submissions);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSubmissions(
        submissions.filter(
          (s) =>
            s.title.toLowerCase().includes(query) ||
            s.artist.toLowerCase().includes(query) ||
            s.albumName?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, submissions]);

  const loadPendingSubmissions = async () => {
    try {
      setIsLoading(true);
      const response = await workRegistrationApi.getPendingSubmissions();
      setSubmissions(response.data.submissions);
      setFilteredSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Failed to load pending submissions:', error);
      toast.error('Failed to load pending submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (submission: WorkSubmission, type: ActionType) => {
    setSelectedSubmission(submission);
    setActionType(type);
  };

  const closeModal = () => {
    setSelectedSubmission(null);
    setActionType(null);
  };

  const handleApprove = async (data: {
    dealTerms: string;
    advanceAmount?: number;
    royaltyPercentage?: number;
  }) => {
    if (!selectedSubmission) return;

    try {
      await workRegistrationApi.approve(selectedSubmission.id, data);
      toast.success(
        <div>
          <div className="font-semibold">Submission Approved!</div>
          <div className="text-sm text-slate-400">Added to Placement Tracker</div>
        </div>,
        { icon: '✅', duration: 4000 }
      );
      closeModal();
      loadPendingSubmissions();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error('Failed to approve submission');
    }
  };

  const handleDeny = async (reason: string) => {
    if (!selectedSubmission) return;

    try {
      await workRegistrationApi.deny(selectedSubmission.id, reason);
      toast.success('Submission denied and writer notified', { icon: '❌' });
      closeModal();
      loadPendingSubmissions();
    } catch (error) {
      console.error('Failed to deny:', error);
      toast.error('Failed to deny submission');
    }
  };

  const handleRequestDocuments = async (documentsRequested: string) => {
    if (!selectedSubmission) return;

    try {
      await workRegistrationApi.requestDocuments(selectedSubmission.id, documentsRequested);
      toast.success('Document request sent to writer', { icon: '📄' });
      closeModal();
      loadPendingSubmissions();
    } catch (error) {
      console.error('Failed to request documents:', error);
      toast.error('Failed to request documents');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <motion.div
            className="p-3 rounded-xl bg-gradient-to-br from-yellow-600 to-orange-600"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileText className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-white">Pending Placements Queue</h1>
            <p className="text-slate-400 mt-1">Review and approve work registration submissions</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, artist, or album..."
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          className="p-4 bg-slate-800 rounded-xl border border-slate-700"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Pending Review</p>
              <p className="text-3xl font-bold text-white">{submissions.length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </motion.div>
        <motion.div
          className="p-4 bg-slate-800 rounded-xl border border-slate-700"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Awaiting Documents</p>
              <p className="text-3xl font-bold text-white">
                {submissions.filter((s) => s.status === 'DOCUMENTS_REQUESTED').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
        </motion.div>
        <motion.div
          className="p-4 bg-slate-800 rounded-xl border border-slate-700"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Today's Submissions</p>
              <p className="text-3xl font-bold text-white">
                {submissions.filter(
                  (s) =>
                    s.submittedAt &&
                    new Date(s.submittedAt).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
        </motion.div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <motion.div
            className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSubmissions.length === 0 && (
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle2 className="w-20 h-20 mx-auto mb-4 text-green-600" />
          <h3 className="text-2xl font-bold text-white mb-2">All Caught Up!</h3>
          <p className="text-slate-400">
            {searchQuery ? 'No submissions match your search.' : 'No pending submissions at the moment.'}
          </p>
        </motion.div>
      )}

      {/* Submissions List */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-4">
          {filteredSubmissions.map((submission, index) => (
            <motion.div
              key={submission.id}
              className="bg-slate-800 rounded-xl border border-slate-700 hover:border-blue-500 transition-all duration-300 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              {/* Main Content */}
              <div className="p-6">
                <div className="flex items-start gap-6">
                  {/* Album Art */}
                  <div className="flex-shrink-0">
                    {submission.albumArtUrl ? (
                      <motion.img
                        src={submission.albumArtUrl}
                        alt={submission.title}
                        className="w-32 h-32 rounded-lg object-cover shadow-xl"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-xl">
                        <Music className="w-16 h-16 text-slate-500" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold text-white mb-1">{submission.title}</h3>
                        <p className="text-slate-300 text-lg">{submission.artist}</p>
                        {submission.albumName && (
                          <p className="text-slate-500 mt-1">Album: {submission.albumName}</p>
                        )}
                      </div>
                      <SubmissionStatusBadge status={submission.status} />
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(submission.submittedAt)}</span>
                      </div>
                      {submission.genre && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">
                          {submission.genre}
                        </span>
                      )}
                      {submission.releaseYear && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
                          {submission.releaseYear}
                        </span>
                      )}
                      {submission.label && (
                        <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm border border-pink-500/30">
                          {submission.label}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <motion.button
                        onClick={() => handleAction(submission, 'approve')}
                        className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold shadow-lg shadow-green-600/30 flex items-center gap-2"
                        whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Approve & Send to Tracker
                      </motion.button>

                      <motion.button
                        onClick={() => handleAction(submission, 'request_documents')}
                        className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold shadow-lg shadow-yellow-600/30 flex items-center gap-2"
                        whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(234, 179, 8, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <FileText className="w-5 h-5" />
                        Request Documents
                      </motion.button>

                      <motion.button
                        onClick={() => handleAction(submission, 'deny')}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-lg shadow-red-600/30 flex items-center gap-2"
                        whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(220, 38, 38, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <XCircle className="w-5 h-5" />
                        Deny
                      </motion.button>

                      <motion.button
                        onClick={() => toggleExpand(submission.id)}
                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {expandedId === submission.id ? (
                          <>
                            <ChevronUp className="w-5 h-5" />
                            Less Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-5 h-5" />
                            More Details
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedId === submission.id && (
                  <motion.div
                    className="px-6 pb-6 border-t border-slate-700"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <h4 className="text-white font-semibold mb-3">Submission Details</h4>
                        {submission.isrc && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">ISRC</p>
                            <p className="text-white font-mono">{submission.isrc}</p>
                          </div>
                        )}
                        {submission.spotifyTrackId && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Spotify Track ID</p>
                            <p className="text-white font-mono">{submission.spotifyTrackId}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-slate-400 text-sm mb-1">Platform</p>
                          <p className="text-white">{submission.platform || 'SPOTIFY'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm mb-1">Release Date</p>
                          <p className="text-white">{formatDate(submission.releaseDate)}</p>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        <h4 className="text-white font-semibold mb-3">AudioDB Metadata</h4>
                        {submission.genre && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Genre</p>
                            <p className="text-white">{submission.genre}</p>
                          </div>
                        )}
                        {submission.label && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Label</p>
                            <p className="text-white">{submission.label}</p>
                          </div>
                        )}
                        {submission.releaseYear && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Release Year</p>
                            <p className="text-white">{submission.releaseYear}</p>
                          </div>
                        )}
                        {submission.musicbrainzId && (
                          <div>
                            <p className="text-slate-400 text-sm mb-1">MusicBrainz ID</p>
                            <p className="text-white font-mono text-sm">{submission.musicbrainzId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Modals */}
      {selectedSubmission && actionType === 'approve' && (
        <ApprovalModal submission={selectedSubmission} onClose={closeModal} onSubmit={handleApprove} />
      )}
      {selectedSubmission && actionType === 'deny' && (
        <DenyModal submission={selectedSubmission} onClose={closeModal} onSubmit={handleDeny} />
      )}
      {selectedSubmission && actionType === 'request_documents' && (
        <RequestDocumentsModal submission={selectedSubmission} onClose={closeModal} onSubmit={handleRequestDocuments} />
      )}
    </div>
  );
}

// Approval Modal
interface ApprovalModalProps {
  submission: WorkSubmission;
  onClose: () => void;
  onSubmit: (data: { dealTerms: string; advanceAmount?: number; royaltyPercentage?: number }) => void;
}

function ApprovalModal({ submission, onClose, onSubmit }: ApprovalModalProps) {
  const [dealTerms, setDealTerms] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [royaltyPercentage, setRoyaltyPercentage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!dealTerms.trim()) {
      toast.error('Please enter deal terms');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        dealTerms,
        advanceAmount: advanceAmount ? parseFloat(advanceAmount) : undefined,
        royaltyPercentage: royaltyPercentage ? parseFloat(royaltyPercentage) : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-700 overflow-hidden max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-green-600/20 to-emerald-600/20">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            Approve Submission
          </h2>
          <p className="text-slate-300 mt-2">
            <span className="font-semibold">{submission.title}</span> by {submission.artist}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Deal Terms */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Deal Terms <span className="text-red-400">*</span>
            </label>
            <textarea
              value={dealTerms}
              onChange={(e) => setDealTerms(e.target.value)}
              placeholder="Enter the deal terms and agreements for this placement..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[120px]"
              rows={5}
            />
          </div>

          {/* Financial Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Advance Amount (Optional)
              </label>
              <input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Royalty Percentage (Optional)
              </label>
              <input
                type="number"
                value={royaltyPercentage}
                onChange={(e) => setRoyaltyPercentage(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max="100"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-300 text-sm">
              ✓ This will create a case in the Placement Tracker and notify the writer
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting || !dealTerms.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
              whileHover={!isSubmitting && dealTerms.trim() ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting && dealTerms.trim() ? { scale: 0.98 } : {}}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Approve & Create Case
                </>
              )}
            </motion.button>
            <motion.button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-xl font-semibold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Deny Modal
interface DenyModalProps {
  submission: WorkSubmission;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

function DenyModal({ submission, onClose, onSubmit }: DenyModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for denial');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-700 overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-red-600/20 to-rose-600/20">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-400" />
            Deny Submission
          </h2>
          <p className="text-slate-300 mt-2">
            <span className="font-semibold">{submission.title}</span> by {submission.artist}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Reason */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Reason for Denial <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a clear reason for denying this submission..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[120px]"
              rows={5}
            />
          </div>

          {/* Warning */}
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-300 text-sm">
              ⚠️ The writer will be notified of this denial and the reason provided
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
              whileHover={!isSubmitting && reason.trim() ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting && reason.trim() ? { scale: 0.98 } : {}}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Denying...
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  Deny Submission
                </>
              )}
            </motion.button>
            <motion.button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-xl font-semibold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Request Documents Modal
interface RequestDocumentsModalProps {
  submission: WorkSubmission;
  onClose: () => void;
  onSubmit: (documentsRequested: string) => void;
}

function RequestDocumentsModal({ submission, onClose, onSubmit }: RequestDocumentsModalProps) {
  const [documentsRequested, setDocumentsRequested] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!documentsRequested.trim()) {
      toast.error('Please specify what documents are needed');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(documentsRequested);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-slate-700 overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-yellow-600/20 to-orange-600/20">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-yellow-400" />
            Request Documents
          </h2>
          <p className="text-slate-300 mt-2">
            <span className="font-semibold">{submission.title}</span> by {submission.artist}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Documents field */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Required Documents <span className="text-red-400">*</span>
            </label>
            <textarea
              value={documentsRequested}
              onChange={(e) => setDocumentsRequested(e.target.value)}
              placeholder="Specify what documents are needed (e.g., split sheet, master recording agreement, etc.)..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 min-h-[120px]"
              rows={5}
            />
          </div>

          {/* Info */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300 text-sm">
              📄 The writer will be notified and can upload the requested documents
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting || !documentsRequested.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
              whileHover={!isSubmitting && documentsRequested.trim() ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting && documentsRequested.trim() ? { scale: 0.98 } : {}}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Requesting...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Request Documents
                </>
              )}
            </motion.button>
            <motion.button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-xl font-semibold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
