import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, XCircle, FileText, Music, AlertCircle,
  DollarSign, Percent, Calendar, Clock,
  ChevronDown, Search, Users, Paperclip, Download, Check, X, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workRegistrationApi, WorkSubmission } from '@/lib/workRegistrationApi';
import { getAuthToken } from '@/lib/api';
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
          <div className="text-sm text-text-muted">Added to writer's Claims</div>
        </div>,
        { icon: <Check className="w-5 h-5 text-green-500" />, duration: 4000 }
      );
      closeModal();
      loadPendingSubmissions();
    } catch (error: any) {
      console.error('Failed to approve:', error);
      const errorMessage = error.response?.data?.error || 'Failed to approve submission';
      toast.error(errorMessage);
    }
  };

  const handleDeny = async (reason: string) => {
    if (!selectedSubmission) return;

    try {
      await workRegistrationApi.deny(selectedSubmission.id, reason);
      toast.success('Submission denied and writer notified', { icon: <X className="w-5 h-5 text-red-500" /> });
      closeModal();
      loadPendingSubmissions();
    } catch (error: any) {
      console.error('Failed to deny:', error);
      const errorMessage = error.response?.data?.error || 'Failed to deny submission';
      toast.error(errorMessage);
    }
  };

  const handleRequestDocuments = async (documentsRequested: string) => {
    if (!selectedSubmission) return;

    try {
      await workRegistrationApi.requestDocuments(selectedSubmission.id, documentsRequested);
      toast.success('Document request sent to writer', { icon: <FileText className="w-5 h-5 text-yellow-500" /> });
      closeModal();
      loadPendingSubmissions();
    } catch (error: any) {
      console.error('Failed to request documents:', error);
      const errorMessage = error.response?.data?.error || 'Failed to request documents';
      toast.error(errorMessage);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = (documentId: string, filename: string) => {
    // This would call the document download API
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = getAuthToken();
    const url = `${API_URL}/api/documents/${documentId}/download`;

    // Create a temporary anchor element to trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    // Add authorization header via fetch and blob
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob);
        a.href = blobUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(err => {
        console.error('Download error:', err);
        toast.error('Failed to download document');
      });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-surface p-6">

      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative mb-8">
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
            <p className="text-text-secondary mt-1">Review and approve work registration submissions</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, artist, or album..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08]"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Pending Review</p>
              <p className="text-3xl font-bold text-white">{submissions.length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </motion.div>
        <motion.div
          className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08]"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Awaiting Documents</p>
              <p className="text-3xl font-bold text-white">
                {submissions.filter((s) => s.status === 'DOCUMENTS_REQUESTED').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
        </motion.div>
        <motion.div
          className="p-4 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08]"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Today's Submissions</p>
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
          <p className="text-text-muted">
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
              className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] hover:border-blue-500 transition-all duration-300 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              {/* Main Content */}
              <div
                className="p-6 cursor-pointer hover:bg-white/[0.02] transition-colors rounded-t-xl"
                onClick={() => toggleExpand(submission.id)}
              >
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
                      <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center shadow-xl">
                        <Music className="w-16 h-16 text-text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-2xl font-bold text-white">{submission.title}</h3>
                          {expandedId !== submission.id && (
                            <span className="text-text-muted text-xs flex items-center gap-1">
                              <ChevronDown className="w-3 h-3" />
                              Click to expand
                            </span>
                          )}
                        </div>
                        <p className="text-text-secondary text-lg">{submission.artist}</p>
                        {submission.albumName && (
                          <p className="text-text-muted mt-1">Album: {submission.albumName}</p>
                        )}
                      </div>
                      <SubmissionStatusBadge status={submission.status} />
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-text-muted">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(submission, 'approve');
                        }}
                        className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold shadow-lg shadow-green-600/30 flex items-center gap-2"
                        whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Approve and send to Claims
                      </motion.button>

                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (submission.status !== 'DOCUMENTS_REQUESTED') {
                            handleAction(submission, 'request_documents');
                          }
                        }}
                        disabled={submission.status === 'DOCUMENTS_REQUESTED'}
                        className={`px-6 py-2.5 ${
                          submission.status === 'DOCUMENTS_REQUESTED'
                            ? 'bg-white/10 cursor-not-allowed opacity-50'
                            : 'bg-yellow-600 hover:bg-yellow-700'
                        } text-white rounded-lg font-semibold shadow-lg shadow-yellow-600/30 flex items-center gap-2`}
                        whileHover={submission.status !== 'DOCUMENTS_REQUESTED' ? { scale: 1.05, boxShadow: '0 10px 30px rgba(234, 179, 8, 0.4)' } : {}}
                        whileTap={submission.status !== 'DOCUMENTS_REQUESTED' ? { scale: 0.95 } : {}}
                      >
                        <FileText className="w-5 h-5" />
                        {submission.status === 'DOCUMENTS_REQUESTED' ? 'Documents Requested' : 'Request Documents'}
                      </motion.button>

                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(submission, 'deny');
                        }}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-lg shadow-red-600/30 flex items-center gap-2"
                        whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(220, 38, 38, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <XCircle className="w-5 h-5" />
                        Deny
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === submission.id && (
                <div className="px-6 pb-6 border-t border-white/[0.08]">
                    <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        <h4 className="text-white font-semibold mb-3">Submission Details</h4>
                        <div>
                          <p className="text-text-muted text-sm mb-1">Submitted At</p>
                          <p className="text-white">{formatDate(submission.submittedAt)}</p>
                        </div>
                        {submission.reviewedAt && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">Reviewed At</p>
                            <p className="text-white">{formatDate(submission.reviewedAt)}</p>
                          </div>
                        )}
                        {submission.caseNumber && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">Case Number</p>
                            <p className="text-white font-mono font-semibold text-green-400">{submission.caseNumber}</p>
                          </div>
                        )}
                        {submission.isrc && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">ISRC</p>
                            <p className="text-white font-mono">{submission.isrc}</p>
                          </div>
                        )}
                        {submission.spotifyTrackId && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">Spotify Track ID</p>
                            <p className="text-white font-mono">{submission.spotifyTrackId}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-text-muted text-sm mb-1">Platform</p>
                          <p className="text-white">{submission.platform || 'SPOTIFY'}</p>
                        </div>
                        <div>
                          <p className="text-text-muted text-sm mb-1">Release Date</p>
                          <p className="text-white">{formatDate(submission.releaseDate)}</p>
                        </div>
                        {(submission.streams !== undefined || submission.estimatedStreams !== undefined) && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">Streams</p>
                            <p className="text-white">
                              {submission.streams ? submission.streams.toLocaleString() :
                               submission.estimatedStreams ? `~${submission.estimatedStreams.toLocaleString()} (estimated)` :
                               'N/A'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        <h4 className="text-white font-semibold mb-3">Track Metadata</h4>
                        {submission.genre && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">Genre</p>
                            <p className="text-white">{submission.genre}</p>
                          </div>
                        )}
                        {submission.label && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">Label</p>
                            <p className="text-white">{submission.label}</p>
                          </div>
                        )}
                        {submission.releaseYear && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">Release Year</p>
                            <p className="text-white">{submission.releaseYear}</p>
                          </div>
                        )}
                        {submission.musicbrainzId && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">MusicBrainz ID</p>
                            <p className="text-white font-mono text-sm">{submission.musicbrainzId}</p>
                          </div>
                        )}
                        {submission.audioDbArtistId && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">AudioDB Artist ID</p>
                            <p className="text-white font-mono text-sm">{submission.audioDbArtistId}</p>
                          </div>
                        )}
                        {submission.audioDbAlbumId && (
                          <div>
                            <p className="text-text-muted text-sm mb-1">AudioDB Album ID</p>
                            <p className="text-white font-mono text-sm">{submission.audioDbAlbumId}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes Section */}
                    {submission.notes && (
                      <div className="mt-6 pt-6 border-t border-white/[0.08]">
                        <h4 className="text-white font-semibold mb-3">Submission Notes</h4>
                        <div className="p-4 bg-white/[0.04] rounded-lg border border-white/[0.08]">
                          <p className="text-text-secondary whitespace-pre-wrap">{submission.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Documents Requested Section */}
                    {submission.documentsRequested && (
                      <div className="mt-6 pt-6 border-t border-white/[0.08]">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                          Documents Requested
                        </h4>
                        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                          <p className="text-yellow-200 whitespace-pre-wrap">{submission.documentsRequested}</p>
                        </div>
                      </div>
                    )}

                    {/* Denial Reason Section */}
                    {submission.denialReason && (
                      <div className="mt-6 pt-6 border-t border-white/[0.08]">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-400" />
                          Denial Reason
                        </h4>
                        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                          <p className="text-red-200 whitespace-pre-wrap">{submission.denialReason}</p>
                        </div>
                      </div>
                    )}

                    {/* Credits/Collaborators Section */}
                    {submission.credits && submission.credits.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white/[0.08]">
                        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-purple-400" />
                          Collaborators & Credits ({submission.credits.length})
                        </h4>
                        <div className="space-y-3">
                          {submission.credits.map((credit, idx) => (
                            <div key={credit.id || idx} className="flex items-center justify-between p-4 bg-white/[0.04] rounded-lg border border-white/[0.08]">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-white font-semibold">
                                    {credit.firstName} {credit.lastName}
                                  </p>
                                  {credit.isPrimary && (
                                    <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded">Primary</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm">
                                  <span className="text-text-muted">{credit.role}</span>
                                  {credit.pro && (
                                    <span className="text-text-muted">PRO: {credit.pro}</span>
                                  )}
                                  {credit.ipiNumber && (
                                    <span className="text-text-muted font-mono">IPI: {credit.ipiNumber}</span>
                                  )}
                                </div>
                                {credit.notes && (
                                  <p className="text-text-muted text-sm mt-1">{credit.notes}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-400">{credit.splitPercentage}%</p>
                                <p className="text-xs text-text-muted">Split</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-sm text-text-muted">
                          Total Split: <span className={`font-semibold ${submission.credits.reduce((sum, c) => sum + Number(c.splitPercentage), 0) === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {Number(submission.credits.reduce((sum, c) => sum + Number(c.splitPercentage), 0)).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Documents Section */}
                    {submission.documents && submission.documents.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white/[0.08]">
                        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                          <Paperclip className="w-5 h-5 text-blue-400" />
                          Uploaded Documents ({submission.documents.length})
                        </h4>
                        <div className="space-y-2">
                          {submission.documents.map((doc, idx) => (
                            <div key={doc.id || idx} className="flex items-center justify-between p-4 bg-white/[0.04] rounded-lg border border-white/[0.08] hover:border-brand-blue/50 transition-colors group">
                              <div className="flex-1 min-w-0 mr-4">
                                <p className="text-white font-medium truncate">{doc.originalName}</p>
                                <div className="flex flex-wrap gap-3 mt-1">
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-500/30">
                                    {doc.category}
                                  </span>
                                  <span className="text-text-muted text-xs">{formatFileSize(doc.fileSize)}</span>
                                  <span className="text-text-muted text-xs">{formatDate(doc.uploadedAt)}</span>
                                </div>
                                {doc.description && (
                                  <p className="text-text-muted text-sm mt-1">{doc.description}</p>
                                )}
                              </div>
                              <motion.button
                                onClick={() => handleDownload(doc.id, doc.originalName)}
                                className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </motion.button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
        className="bg-surface rounded-2xl w-full max-w-2xl border border-white/[0.08] overflow-hidden max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-green-600/20 to-emerald-600/20">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            Approve Submission
          </h2>
          <p className="text-text-secondary mt-2">
            <span className="font-semibold">{submission.title}</span> by {submission.artist}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Deal Terms */}
          <div>
            <label className="block text-text-secondary font-semibold mb-2">
              Deal Terms <span className="text-red-400">*</span>
            </label>
            <textarea
              value={dealTerms}
              onChange={(e) => setDealTerms(e.target.value)}
              placeholder="Enter the deal terms and agreements for this placement..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/50 min-h-[120px]"
              rows={5}
            />
          </div>

          {/* Financial Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary font-semibold mb-2 flex items-center gap-2">
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
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-2 flex items-center gap-2">
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
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-300 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" /> This will create a case in the Placement Tracker and notify the writer
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting || !dealTerms.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-white/10 disabled:to-white/10 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
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
              className="px-6 py-3 bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white rounded-xl font-semibold"
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
        className="bg-surface rounded-2xl w-full max-w-2xl border border-white/[0.08] overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-red-600/20 to-rose-600/20">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-400" />
            Deny Submission
          </h2>
          <p className="text-text-secondary mt-2">
            <span className="font-semibold">{submission.title}</span> by {submission.artist}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Reason */}
          <div>
            <label className="block text-text-secondary font-semibold mb-2">
              Reason for Denial <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a clear reason for denying this submission..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[120px]"
              rows={5}
            />
          </div>

          {/* Warning */}
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> The writer will be notified of this denial and the reason provided
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-white/10 disabled:to-white/10 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
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
              className="px-6 py-3 bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white rounded-xl font-semibold"
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

// Common document types for quick selection
const COMMON_DOCUMENTS = [
  { id: 'split_sheet', label: 'Split Sheet', description: 'Ownership splits between all writers/producers' },
  { id: 'master_agreement', label: 'Master Recording Agreement', description: 'Agreement for master recording ownership' },
  { id: 'work_for_hire', label: 'Work for Hire Agreement', description: 'Work for hire documentation' },
  { id: 'publishing_agreement', label: 'Publishing Agreement', description: 'Publishing deal documentation' },
  { id: 'sync_license', label: 'Sync License', description: 'Synchronization license for visual media' },
  { id: 'mechanical_license', label: 'Mechanical License', description: 'Mechanical rights license' },
  { id: 'collaboration_agreement', label: 'Collaboration Agreement', description: 'Agreement between collaborators' },
  { id: 'release_form', label: 'Artist Release Form', description: 'Permission from featured artists' },
  { id: 'sample_clearance', label: 'Sample Clearance', description: 'Clearance for any samples used' },
  { id: 'pro_registration', label: 'PRO Registration Proof', description: 'BMI/ASCAP/SESAC registration confirmation' },
];

function RequestDocumentsModal({ submission, onClose, onSubmit }: RequestDocumentsModalProps) {
  const [documentsRequested, setDocumentsRequested] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle a document in the checklist
  const toggleDocument = (docId: string) => {
    setSelectedDocs(prev => {
      const newSelection = prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId];

      // Update the textarea with selected documents
      const selectedLabels = newSelection.map(id =>
        COMMON_DOCUMENTS.find(d => d.id === id)?.label
      ).filter(Boolean);

      if (selectedLabels.length > 0) {
        const existingCustomText = documentsRequested
          .split('\n')
          .filter(line => !COMMON_DOCUMENTS.some(d => line.includes(d.label)))
          .join('\n')
          .trim();

        const newText = selectedLabels.join('\n') + (existingCustomText ? '\n\n' + existingCustomText : '');
        setDocumentsRequested(newText);
      }

      return newSelection;
    });
  };

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
        className="bg-surface rounded-2xl w-full max-w-2xl border border-white/[0.08] overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] bg-gradient-to-r from-yellow-600/20 to-orange-600/20">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-yellow-400" />
            Request Documents
          </h2>
          <p className="text-text-secondary mt-2">
            <span className="font-semibold">{submission.title}</span> by {submission.artist}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Quick Select Checklist */}
          <div>
            <label className="block text-text-secondary font-semibold mb-3">
              Quick Select Common Documents
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMON_DOCUMENTS.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => toggleDocument(doc.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                    selectedDocs.includes(doc.id)
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    selectedDocs.includes(doc.id)
                      ? 'border-yellow-500 bg-yellow-500'
                      : 'border-white/30'
                  }`}>
                    {selectedDocs.includes(doc.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{doc.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{doc.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Documents field */}
          <div>
            <label className="block text-text-secondary font-semibold mb-2">
              Document Request Details <span className="text-red-400">*</span>
            </label>
            <textarea
              value={documentsRequested}
              onChange={(e) => setDocumentsRequested(e.target.value)}
              placeholder="Selected documents appear here. Add any custom requirements or specific instructions..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50 min-h-[100px]"
              rows={4}
            />
            <p className="text-xs text-text-muted mt-1">
              {selectedDocs.length} document type{selectedDocs.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Info */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" /> The writer will be notified and can upload the requested documents
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting || !documentsRequested.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-white/10 disabled:to-white/10 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2"
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
              className="px-6 py-3 bg-white/5 hover:bg-white/10 disabled:bg-white/5 text-white rounded-xl font-semibold"
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
