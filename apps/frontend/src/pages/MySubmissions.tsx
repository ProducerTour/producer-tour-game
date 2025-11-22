import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, Music, Filter, ArrowLeft, Upload, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { workRegistrationApi, WorkSubmission } from '@/lib/workRegistrationApi';
import { SubmissionStatusBadge } from '@/components/SubmissionStatusBadge';

type StatusFilter = 'ALL' | 'PENDING' | 'DOCUMENTS_REQUESTED' | 'APPROVED' | 'DENIED' | 'TRACKING' | 'COMPLETED';

export default function MySubmissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<WorkSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<WorkSubmission | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (statusFilter === 'ALL') {
      setFilteredSubmissions(submissions);
    } else {
      setFilteredSubmissions(submissions.filter((s) => s.status === statusFilter));
    }
  }, [statusFilter, submissions]);

  const loadSubmissions = async () => {
    try {
      setIsLoading(true);
      const response = await workRegistrationApi.getMySubmissions();
      setSubmissions(response.data.submissions);
      setFilteredSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Failed to load submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResubmit = async (id: string, notes: string) => {
    try {
      await workRegistrationApi.resubmit(id, notes);
      toast.success('Documents submitted successfully!');
      setShowDocumentModal(false);
      setSelectedSubmission(null);
      loadSubmissions();
    } catch (error) {
      console.error('Failed to resubmit:', error);
      toast.error('Failed to submit documents');
    }
  };

  const handleEdit = async (id: string, data: { title?: string; artist?: string; notes?: string; credits?: any[] }) => {
    try {
      await workRegistrationApi.edit(id, data);
      toast.success('Submission updated successfully!');
      setShowEditModal(false);
      setSelectedSubmission(null);
      loadSubmissions();
    } catch (error) {
      console.error('Failed to edit submission:', error);
      toast.error('Failed to update submission');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5" />;
      case 'DOCUMENTS_REQUESTED':
        return <AlertCircle className="w-5 h-5" />;
      case 'APPROVED':
      case 'TRACKING':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'DENIED':
        return <XCircle className="w-5 h-5" />;
      case 'COMPLETED':
        return <FileText className="w-5 h-5" />;
      default:
        return <Music className="w-5 h-5" />;
    }
  };

  const getStatusCount = (status: StatusFilter) => {
    if (status === 'ALL') return submissions.length;
    return submissions.filter((s) => s.status === status).length;
  };

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">

      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-blue-600/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-purple-600/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => navigate('/admin')}
              className="text-slate-400 hover:text-white transition-colors mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FileText className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-4xl font-bold text-white">My Submissions</h1>
                  <p className="text-slate-400 mt-2">
                    Track your work registration submissions and their status
                  </p>
                </div>
              </div>
              <motion.button
                onClick={() => navigate('/work-registration')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2"
                whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(59, 130, 246, 0.4)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Music className="w-5 h-5" />
                Submit New Work
              </motion.button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
            <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
            {(['ALL', 'PENDING', 'DOCUMENTS_REQUESTED', 'APPROVED', 'TRACKING', 'DENIED', 'COMPLETED'] as StatusFilter[]).map((status) => (
              <motion.button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 flex-shrink-0 ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {status === 'ALL' ? 'All' : status.replace(/_/g, ' ')}
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {getStatusCount(status)}
                </span>
              </motion.button>
            ))}
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
              <Music className="w-20 h-20 mx-auto mb-4 text-slate-600" />
              <h3 className="text-2xl font-bold text-white mb-2">
                {statusFilter === 'ALL' ? 'No submissions yet' : `No ${statusFilter.toLowerCase().replace(/_/g, ' ')} submissions`}
              </h3>
              <p className="text-slate-400 mb-6">
                {statusFilter === 'ALL'
                  ? 'Submit your first work to get started!'
                  : 'Try selecting a different filter to see more submissions.'}
              </p>
              {statusFilter === 'ALL' && (
                <motion.button
                  onClick={() => navigate('/work-registration')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Submit Your First Work
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Submissions Grid */}
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSubmissions.map((submission, index) => (
                <motion.div
                  key={submission.id}
                  className="relative rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-xl overflow-hidden group hover:border-blue-500/50 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  {/* Glassmorphism effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                  <div className="relative z-10 p-6">
                    <div className="flex items-start gap-4">
                      {/* Album Art */}
                      <div className="flex-shrink-0">
                        {submission.albumArtUrl ? (
                          <motion.img
                            src={submission.albumArtUrl}
                            alt={submission.title}
                            className="w-24 h-24 rounded-lg object-cover shadow-lg"
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg">
                            <Music className="w-12 h-12 text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white truncate">
                              {submission.title}
                            </h3>
                            <p className="text-slate-400 truncate">{submission.artist}</p>
                            {submission.albumName && (
                              <p className="text-slate-500 text-sm mt-1 truncate">
                                {submission.albumName}
                              </p>
                            )}
                          </div>
                          <SubmissionStatusBadge status={submission.status} />
                        </div>

                        {/* Case Number (if approved) */}
                        {submission.caseNumber && (
                          <motion.div
                            className="mb-3 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring" }}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 font-semibold text-sm">
                                Case: {submission.caseNumber}
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Timeline */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-400">Submitted:</span>
                            <span className="text-slate-300">{formatDate(submission.submittedAt)}</span>
                          </div>
                          {submission.reviewedAt && (
                            <div className="flex items-center gap-2 text-sm">
                              {getStatusIcon(submission.status)}
                              <span className="text-slate-400">Reviewed:</span>
                              <span className="text-slate-300">{formatDate(submission.reviewedAt)}</span>
                            </div>
                          )}
                        </div>

                        {/* Documents Requested Message */}
                        {submission.status === 'DOCUMENTS_REQUESTED' && submission.documentsRequested && (
                          <motion.div
                            className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-yellow-400 font-semibold text-sm mb-1">
                                  Documents Requested
                                </p>
                                <p className="text-slate-300 text-sm">{submission.documentsRequested}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Denial Reason */}
                        {submission.status === 'DENIED' && submission.denialReason && (
                          <motion.div
                            className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <div className="flex items-start gap-2">
                              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-red-400 font-semibold text-sm mb-1">
                                  Denial Reason
                                </p>
                                <p className="text-slate-300 text-sm">{submission.denialReason}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {/* Edit button for PENDING and DOCUMENTS_REQUESTED */}
                          {(submission.status === 'PENDING' || submission.status === 'DOCUMENTS_REQUESTED') && (
                            <motion.button
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setShowEditModal(true);
                              }}
                              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </motion.button>
                          )}
                          {submission.status === 'DOCUMENTS_REQUESTED' && (
                            <motion.button
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setShowDocumentModal(true);
                              }}
                              className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Upload className="w-4 h-4" />
                              Upload Documents
                            </motion.button>
                          )}
                          {(submission.status === 'APPROVED' || submission.status === 'TRACKING') && (
                            <motion.button
                              onClick={() => navigate(`/placements/${submission.id}`)}
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Eye className="w-4 h-4" />
                              View Case
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </div>
      </div>

      {/* Document Upload Modal */}
      {showDocumentModal && selectedSubmission && (
        <DocumentUploadModal
          submission={selectedSubmission}
          onClose={() => {
            setShowDocumentModal(false);
            setSelectedSubmission(null);
          }}
          onSubmit={(notes) => handleResubmit(selectedSubmission.id, notes)}
        />
      )}

      {/* Edit Submission Modal */}
      {showEditModal && selectedSubmission && (
        <EditSubmissionModal
          submission={selectedSubmission}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSubmission(null);
          }}
          onSubmit={(data) => handleEdit(selectedSubmission.id, data)}
        />
      )}
    </div>
  );
}

// Document Upload Modal Component
interface DocumentUploadModalProps {
  submission: WorkSubmission;
  onClose: () => void;
  onSubmit: (notes: string) => void;
}

function DocumentUploadModal({ submission, onClose, onSubmit }: DocumentUploadModalProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.error('Please provide notes about the documents');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(notes);
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
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Upload className="w-6 h-6 text-yellow-400" />
            Upload Documents
          </h2>
          <p className="text-slate-400 mt-2">
            Submit the requested documents for: <span className="text-white font-semibold">{submission.title}</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* What was requested */}
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 font-semibold mb-2">Requested Documents:</p>
            <p className="text-slate-300">{submission.documentsRequested}</p>
          </div>

          {/* Notes textarea */}
          <div className="mb-6">
            <label className="block text-slate-300 font-semibold mb-2">
              Document Notes / Response
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide details about the documents you're submitting, links to files, or any other relevant information..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              rows={5}
            />
          </div>

          {/* Info message */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              💡 Include links to Google Drive, Dropbox, or other cloud storage where you've uploaded the requested documents.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting || !notes.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
              whileHover={!isSubmitting && notes.trim() ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting && notes.trim() ? { scale: 0.98 } : {}}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Submit Documents
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

// Edit Submission Modal Component
interface EditSubmissionModalProps {
  submission: WorkSubmission;
  onClose: () => void;
  onSubmit: (data: { title?: string; artist?: string; notes?: string; credits?: any[] }) => void;
}

interface CreditForm {
  firstName: string;
  lastName: string;
  role: string;
  splitPercentage: number;
  pro?: string;
  ipiNumber?: string;
}

function EditSubmissionModal({ submission, onClose, onSubmit }: EditSubmissionModalProps) {
  const [title, setTitle] = useState(submission.title || '');
  const [artist, setArtist] = useState(submission.artist || '');
  const [notes, setNotes] = useState(submission.notes || '');
  const [credits, setCredits] = useState<CreditForm[]>(
    submission.credits?.map(c => ({
      firstName: c.firstName,
      lastName: c.lastName,
      role: c.role,
      splitPercentage: c.splitPercentage,
      pro: c.pro || '',
      ipiNumber: c.ipiNumber || '',
    })) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addCredit = () => {
    setCredits([...credits, {
      firstName: '',
      lastName: '',
      role: 'WRITER',
      splitPercentage: 0,
      pro: '',
      ipiNumber: '',
    }]);
  };

  const removeCredit = (index: number) => {
    setCredits(credits.filter((_, i) => i !== index));
  };

  const updateCredit = (index: number, field: keyof CreditForm, value: string | number) => {
    const newCredits = [...credits];
    newCredits[index] = { ...newCredits[index], [field]: value };
    setCredits(newCredits);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!artist.trim()) {
      toast.error('Artist is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ title, artist, notes, credits });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-slate-800 rounded-2xl w-full max-w-3xl border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Pencil className="w-6 h-6 text-blue-400" />
            Edit Submission
          </h2>
          <p className="text-slate-400 mt-2">
            Update your work registration details
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Track Info */}
          <div className="flex items-start gap-4 mb-6">
            {submission.albumArtUrl ? (
              <img
                src={submission.albumArtUrl}
                alt={submission.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-slate-700 flex items-center justify-center">
                <Music className="w-10 h-10 text-slate-500" />
              </div>
            )}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-2">Artist</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-slate-300 font-semibold mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this submission..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              rows={3}
            />
          </div>

          {/* Credits/Collaborators */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-slate-300 font-semibold">Collaborators / Split Sheet</label>
              <motion.button
                type="button"
                onClick={addCredit}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                Add Collaborator
              </motion.button>
            </div>

            {credits.length === 0 ? (
              <div className="text-center py-6 text-slate-500 bg-slate-900/50 rounded-lg border border-slate-700">
                No collaborators added. Click "Add Collaborator" to add split information.
              </div>
            ) : (
              <div className="space-y-4">
                {credits.map((credit, index) => (
                  <div key={index} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-400">Collaborator {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeCredit(index)}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="First Name"
                        value={credit.firstName}
                        onChange={(e) => updateCredit(index, 'firstName', e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={credit.lastName}
                        onChange={(e) => updateCredit(index, 'lastName', e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={credit.role}
                        onChange={(e) => updateCredit(index, 'role', e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="WRITER">Writer</option>
                        <option value="PRODUCER">Producer</option>
                        <option value="COMPOSER">Composer</option>
                        <option value="ARTIST">Artist</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Split %"
                        min="0"
                        max="100"
                        value={credit.splitPercentage || ''}
                        onChange={(e) => updateCredit(index, 'splitPercentage', parseFloat(e.target.value) || 0)}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="PRO (ASCAP, BMI...)"
                        value={credit.pro || ''}
                        onChange={(e) => updateCredit(index, 'pro', e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="IPI Number"
                        value={credit.ipiNumber || ''}
                        onChange={(e) => updateCredit(index, 'ipiNumber', e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-700 flex-shrink-0">
          <div className="flex gap-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
              whileHover={!isSubmitting ? { scale: 1.02 } : {}}
              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Pencil className="w-5 h-5" />
                  Save Changes
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
