import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SpotifyTrackLookup } from '@/components/SpotifyTrackLookup';
import { placementApi, creditApi, proSubmissionApi } from '@/lib/api';
import './pages.css';

interface Placement {
  id: string;
  title: string;
  artist: string;
  platform: string;
  releaseDate: string;
  streams: number;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  isrc?: string;
  spotifyTrackId?: string;
  metadata?: any;
}

interface Credit {
  id: string;
  songTitle: string;
  role: string;
  ipiNumber?: string;
  splitPercentage: number;
}

interface ProSubmission {
  id: string;
  proName: 'BMI' | 'ASCAP' | 'SESAC' | 'OTHER';
  submittedAt: string;
}

type TabType = 'placements' | 'credits' | 'submissions' | 'analytics';

export default function PublishingTrackerToolPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('placements');
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [latestSubmissions, setLatestSubmissions] = useState<Record<string, ProSubmission>>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ACTIVE' | 'PENDING' | 'COMPLETED'>('all');

  // Modals
  const [showSpotifyLookup, setShowSpotifyLookup] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteCreditConfirm, setDeleteCreditConfirm] = useState<string | null>(null);

  // Edit states
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null);

  // Form states
  const [creditForm, setCreditForm] = useState({
    songTitle: '',
    role: '',
    ipiNumber: '',
    splitPercentage: '',
  });
  const [streamForm, setStreamForm] = useState({
    streams: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch placements
  useEffect(() => {
    fetchPlacements();
  }, []);

  // Fetch credits
  useEffect(() => {
    fetchCredits();
  }, []);

  // Fetch PRO submissions
  useEffect(() => {
    fetchLatestSubmissions();
  }, []);

  // Fetch analytics when placements change
  useEffect(() => {
    if (placements.length > 0) {
      fetchAnalytics();
    }
  }, [placements]);

  const fetchPlacements = async () => {
    try {
      setLoading(true);
      const response = await placementApi.list();
      setPlacements(response.data.placements || []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching placements:', err);
      setError('Failed to load placements');
      setPlacements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const response = await creditApi.list();
      setCredits(response.data.credits || []);
    } catch (err: any) {
      console.error('Error fetching credits:', err);
      setCredits([]);
    }
  };

  const fetchLatestSubmissions = async () => {
    try {
      const response = await proSubmissionApi.getLatest();
      setLatestSubmissions(response.data.latest || {});
    } catch (err: any) {
      console.error('Error fetching submissions:', err);
      setLatestSubmissions({});
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await placementApi.getAnalytics();
      setAnalytics(response.data.analytics);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
    }
  };

  const filteredPlacements = placements.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.artist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalStreams = placements.reduce((sum, p) => sum + p.streams, 0);
  const activePlacements = placements.filter(p => p.status === 'ACTIVE').length;

  // Placement handlers
  const handleDeletePlacement = async (id: string) => {
    try {
      await placementApi.delete(id);
      setPlacements(placements.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error deleting placement:', err);
      alert('Failed to delete placement');
    }
  };

  const handleSpotifyTrackSelect = async (track: any) => {
    try {
      const newPlacement = {
        title: track.title,
        artist: track.artist,
        platform: 'SPOTIFY',
        releaseDate: track.releaseDate,
        isrc: track.isrc,
        spotifyTrackId: track.id,
        streams: 0,
        status: 'PENDING',
        metadata: {
          album: track.album,
          image: track.image,
          popularity: track.popularity,
        },
      };

      const response = await placementApi.create(newPlacement);
      setPlacements([response.data.placement, ...placements]);
      setShowSpotifyLookup(false);
    } catch (err: any) {
      console.error('Error creating placement:', err);
      alert('Failed to add placement');
    }
  };

  const openStreamModal = (placement: Placement) => {
    setEditingPlacement(placement);
    setStreamForm({ streams: placement.streams.toString() });
    setShowStreamModal(true);
  };

  const handleUpdateStreams = async () => {
    if (!editingPlacement) return;

    const streams = parseInt(streamForm.streams);
    if (isNaN(streams) || streams < 0) {
      alert('Please enter a valid stream count');
      return;
    }

    try {
      await placementApi.update(editingPlacement.id, { streams });
      setPlacements(placements.map(p =>
        p.id === editingPlacement.id ? { ...p, streams } : p
      ));
      setShowStreamModal(false);
      setEditingPlacement(null);
      setStreamForm({ streams: '' });
    } catch (err: any) {
      console.error('Error updating streams:', err);
      alert('Failed to update streams');
    }
  };

  const handleUpdatePlacementStatus = async (placementId: string, newStatus: 'ACTIVE' | 'PENDING' | 'COMPLETED') => {
    try {
      await placementApi.update(placementId, { status: newStatus });
      setPlacements(placements.map(p =>
        p.id === placementId ? { ...p, status: newStatus } : p
      ));
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  // Credit handlers
  const openAddCreditModal = () => {
    setEditingCredit(null);
    setCreditForm({
      songTitle: '',
      role: '',
      ipiNumber: '',
      splitPercentage: '',
    });
    setShowCreditModal(true);
  };

  const openEditCreditModal = (credit: Credit) => {
    setEditingCredit(credit);
    setCreditForm({
      songTitle: credit.songTitle,
      role: credit.role,
      ipiNumber: credit.ipiNumber || '',
      splitPercentage: credit.splitPercentage.toString(),
    });
    setShowCreditModal(true);
  };

  const handleSaveCredit = async () => {
    const { songTitle, role, splitPercentage } = creditForm;

    if (!songTitle || !role || !splitPercentage) {
      alert('Please fill in all required fields');
      return;
    }

    const split = parseFloat(splitPercentage);
    if (isNaN(split) || split < 0 || split > 100) {
      alert('Split percentage must be between 0 and 100');
      return;
    }

    try {
      const creditData = {
        songTitle,
        role,
        ipiNumber: creditForm.ipiNumber || undefined,
        splitPercentage: split,
      };

      if (editingCredit) {
        // Update existing credit
        const response = await creditApi.update(editingCredit.id, creditData);
        setCredits(credits.map(c => c.id === editingCredit.id ? response.data.credit : c));
      } else {
        // Create new credit
        const response = await creditApi.create(creditData);
        setCredits([response.data.credit, ...credits]);
      }

      setShowCreditModal(false);
      setEditingCredit(null);
      setCreditForm({ songTitle: '', role: '', ipiNumber: '', splitPercentage: '' });
    } catch (err: any) {
      console.error('Error saving credit:', err);
      alert('Failed to save credit');
    }
  };

  const handleDeleteCredit = async (id: string) => {
    try {
      await creditApi.delete(id);
      setCredits(credits.filter(c => c.id !== id));
      setDeleteCreditConfirm(null);
    } catch (err: any) {
      console.error('Error deleting credit:', err);
      alert('Failed to delete credit');
    }
  };

  // PRO submission handler
  const handleSubmitToPRO = async (proName: 'BMI' | 'ASCAP' | 'SESAC') => {
    if (placements.length === 0) {
      alert('No placements to submit. Add some placements first.');
      return;
    }

    try {
      const submission = {
        proName,
        submittedAt: new Date().toISOString(),
        placementIds: placements.map(p => p.id),
      };

      await proSubmissionApi.create(submission);
      fetchLatestSubmissions();
      alert(`Successfully recorded submission to ${proName}`);
    } catch (err: any) {
      console.error('Error submitting to PRO:', err);
      alert('Failed to record submission');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/admin')}
                className="text-slate-400 hover:text-white mb-4 transition"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-4xl font-bold text-white">🎵 Publishing Tracker</h1>
              <p className="text-slate-400 mt-2">Monitor placements, manage credits, and track performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm font-medium mb-2">Total Placements</div>
            <div className="text-4xl font-bold text-blue-400">{placements.length}</div>
            <div className="text-slate-500 text-sm mt-2">{activePlacements} active</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm font-medium mb-2">Total Streams</div>
            <div className="text-4xl font-bold text-green-400">
              {totalStreams > 0 ? (totalStreams / 1000000).toFixed(1) + 'M' : '0'}
            </div>
            <div className="text-slate-500 text-sm mt-2">Across all platforms</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-slate-400 text-sm font-medium mb-2">Published Credits</div>
            <div className="text-4xl font-bold text-purple-400">{credits.length}</div>
            <div className="text-slate-500 text-sm mt-2">Documented splits</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-slate-700">
          {(['placements', 'credits', 'submissions', 'analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          {/* Placements Tab */}
          {activeTab === 'placements' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Search placements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <button
                  onClick={() => setShowSpotifyLookup(true)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                  + Add Placement
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12 text-slate-400">
                  <p>Loading placements...</p>
                </div>
              ) : filteredPlacements.length > 0 ? (
                <div className="space-y-3">
                  {filteredPlacements.map((placement) => (
                    <div
                      key={placement.id}
                      className="bg-slate-700 p-4 rounded-lg border border-slate-600 hover:border-blue-500 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg">{placement.title}</h3>
                          <p className="text-slate-400 text-sm mt-1">{placement.artist}</p>
                          <div className="flex gap-4 mt-3 text-sm flex-wrap">
                            <span className="px-3 py-1 bg-slate-600 rounded text-slate-300">
                              {placement.platform}
                            </span>
                            <select
                              value={placement.status}
                              onChange={(e) => handleUpdatePlacementStatus(placement.id, e.target.value as any)}
                              className={`px-3 py-1 rounded text-sm font-medium focus:outline-none cursor-pointer ${
                                placement.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                placement.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="ACTIVE">Active</option>
                              <option value="COMPLETED">Completed</option>
                            </select>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-semibold">
                            {placement.streams > 0 ? (placement.streams / 1000).toFixed(0) + 'K streams' : 'No streams yet'}
                          </div>
                          <p className="text-slate-400 text-sm mt-1">{formatDate(placement.releaseDate)}</p>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => openStreamModal(placement)}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded transition"
                            >
                              Update Streams
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(placement.id)}
                              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-lg mb-2">No placements yet</p>
                  <p className="text-sm mb-6">Add your first placement to start tracking your music</p>
                  <button
                    onClick={() => setShowSpotifyLookup(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                    + Add Your First Placement
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Credits Tab */}
          {activeTab === 'credits' && (
            <div className="space-y-6">
              <button
                onClick={openAddCreditModal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                + Add Credit
              </button>

              {credits.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="px-4 py-3 text-left text-slate-400 font-medium">Song Title</th>
                        <th className="px-4 py-3 text-left text-slate-400 font-medium">Role</th>
                        <th className="px-4 py-3 text-left text-slate-400 font-medium">IPI Number</th>
                        <th className="px-4 py-3 text-left text-slate-400 font-medium">Split %</th>
                        <th className="px-4 py-3 text-right text-slate-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {credits.map((credit) => (
                        <tr key={credit.id} className="border-b border-slate-700 hover:bg-slate-600/50 transition">
                          <td className="px-4 py-3 text-white">{credit.songTitle}</td>
                          <td className="px-4 py-3 text-slate-300">{credit.role}</td>
                          <td className="px-4 py-3 text-slate-300">{credit.ipiNumber || '-'}</td>
                          <td className="px-4 py-3 text-slate-300">{credit.splitPercentage}%</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openEditCreditModal(credit)}
                              className="text-blue-400 hover:text-blue-300 mr-2">
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteCreditConfirm(credit.id)}
                              className="text-red-400 hover:text-red-300">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-lg mb-2">No credits recorded yet</p>
                  <p className="text-sm mb-6">Add credits to track songwriting and production splits</p>
                  <button
                    onClick={openAddCreditModal}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                    + Add Your First Credit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submissions Tab */}
          {activeTab === 'submissions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-4">Publishing Submissions</h3>
                <p className="text-slate-400 mb-6">Record when you submit your publishing data to PROs</p>
              </div>

              <div className="space-y-3">
                {['ASCAP', 'BMI', 'SESAC'].map((proName) => {
                  const submission = latestSubmissions[proName];
                  return (
                    <div key={proName} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">{proName} Submission</h4>
                          <p className="text-slate-400 text-sm mt-1">
                            {submission
                              ? `Last submitted: ${formatDate(submission.submittedAt)}`
                              : 'Never submitted'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleSubmitToPRO(proName as 'BMI' | 'ASCAP' | 'SESAC')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition"
                        >
                          Record Submission
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-white font-semibold">Performance Analytics</h3>

              {analytics && placements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <h4 className="text-white font-medium mb-4">Placements by Platform</h4>
                    <div className="space-y-3">
                      {analytics.platformDistribution?.length > 0 ? (
                        analytics.platformDistribution.map((platform: any) => (
                          <div key={platform.platform} className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm">{platform.platform}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-600 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${platform.percentage}%` }}
                                />
                              </div>
                              <span className="text-white text-sm font-medium">{platform.count}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 text-sm">No data available</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <h4 className="text-white font-medium mb-4">Top Performing Tracks</h4>
                    <div className="space-y-3">
                      {analytics.topTracks?.length > 0 ? (
                        analytics.topTracks.slice(0, 5).map((track: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-slate-400 text-sm truncate mr-2">{track.title}</span>
                            <span className="text-green-400 text-sm font-medium">
                              {track.streams > 0 ? (track.streams / 1000).toFixed(0) + 'K' : '0'}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 text-sm">Update stream counts to see rankings</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-lg mb-2">No analytics data yet</p>
                  <p className="text-sm">Add placements to see performance analytics</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Spotify Lookup Modal */}
        {showSpotifyLookup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
              <SpotifyTrackLookup
                onTrackSelect={handleSpotifyTrackSelect}
                onClose={() => setShowSpotifyLookup(false)}
              />
            </div>
          </div>
        )}

        {/* Stream Update Modal */}
        {showStreamModal && editingPlacement && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md w-full">
              <h3 className="text-white font-semibold text-lg mb-4">Update Stream Count</h3>
              <p className="text-slate-400 text-sm mb-4">
                {editingPlacement.title} by {editingPlacement.artist}
              </p>
              <div className="mb-6">
                <label className="block text-slate-400 text-sm mb-2">Stream Count</label>
                <input
                  type="number"
                  value={streamForm.streams}
                  onChange={(e) => setStreamForm({ streams: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g., 150000"
                  min="0"
                />
                <p className="text-slate-500 text-xs mt-2">
                  Get this number from your distributor dashboard (DistroKid, TuneCore, etc.)
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowStreamModal(false);
                    setEditingPlacement(null);
                    setStreamForm({ streams: '' });
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStreams}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Credit Modal */}
        {showCreditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md w-full">
              <h3 className="text-white font-semibold text-lg mb-4">
                {editingCredit ? 'Edit Credit' : 'Add Credit'}
              </h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Song Title *</label>
                  <input
                    type="text"
                    value={creditForm.songTitle}
                    onChange={(e) => setCreditForm({ ...creditForm, songTitle: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Summer Vibes"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Role *</label>
                  <select
                    value={creditForm.role}
                    onChange={(e) => setCreditForm({ ...creditForm, role: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select role...</option>
                    <option value="Producer">Producer</option>
                    <option value="Composer">Composer</option>
                    <option value="Writer">Writer</option>
                    <option value="Co-Writer">Co-Writer</option>
                    <option value="Arranger">Arranger</option>
                    <option value="Lyricist">Lyricist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">IPI Number (optional)</label>
                  <input
                    type="text"
                    value={creditForm.ipiNumber}
                    onChange={(e) => setCreditForm({ ...creditForm, ipiNumber: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g., IPI-123456789"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Split Percentage * (0-100)</label>
                  <input
                    type="number"
                    value={creditForm.splitPercentage}
                    onChange={(e) => setCreditForm({ ...creditForm, splitPercentage: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g., 50"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowCreditModal(false);
                    setEditingCredit(null);
                    setCreditForm({ songTitle: '', role: '', ipiNumber: '', splitPercentage: '' });
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCredit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  {editingCredit ? 'Update' : 'Add'} Credit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Placement Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-sm">
              <h3 className="text-white font-semibold text-lg mb-4">Delete Placement?</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete this placement? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePlacement(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Credit Confirmation Modal */}
        {deleteCreditConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-sm">
              <h3 className="text-white font-semibold text-lg mb-4">Delete Credit?</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete this credit? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteCreditConfirm(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteCredit(deleteCreditConfirm)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
