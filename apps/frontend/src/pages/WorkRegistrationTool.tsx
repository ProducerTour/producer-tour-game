import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Music, Sparkles, CheckCircle2, ArrowRight, Plus, CircleDollarSign, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SpotifyTrackLookup } from '@/components/SpotifyTrackLookup';
import { CollaboratorForm, Collaborator } from '@/components/CollaboratorForm';
import { DocumentUpload, UploadedDocument } from '@/components/DocumentUpload';
import { placementApi, documentApi } from '@/lib/api';
import { audiodbApi } from '@/lib/audiodbApi';
import { useAuthStore } from '@/store/auth.store';

export default function WorkRegistrationTool() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  const handleTrackSelect = async (track: any) => {
    console.log('Selected track:', track);

    // Enrich with AudioDB
    try {
      const enriched = await audiodbApi.enrichPlacementData(
        track.artist,
        track.title,
        track.album
      );

      setSelectedTrack({
        ...track,
        enriched,
      });
      setShowSpotifyModal(false);
    } catch (error) {
      console.error('AudioDB enrichment error:', error);
      setSelectedTrack(track);
      setShowSpotifyModal(false);
    }
  };

  const submitPlacement = async () => {
    if (!selectedTrack) return null;

    // Check for duplicate titles in Manage Placements
    try {
      const duplicateCheck = await placementApi.checkDuplicate(selectedTrack.title);
      if (duplicateCheck.data.isDuplicate) {
        const existing = duplicateCheck.data.existingPlacement;
        toast.error(
          <div>
            <div className="font-semibold">Duplicate Song Detected</div>
            <div className="text-sm text-gray-400 mt-1">
              "{existing.title}" already exists in Manage Placements
              {existing.caseNumber && ` (Case: ${existing.caseNumber})`}
            </div>
          </div>,
          { duration: 5000, icon: '⚠️' }
        );
        return null;
      }
    } catch (error) {
      console.error('Duplicate check error:', error);
      // Continue with submission if duplicate check fails
    }

    // Validate collaborators - splits must equal exactly 100%
    const totalSplit = collaborators.reduce((sum, c) => sum + (c.splitPercentage || 0), 0);
    const splitDifference = 100 - totalSplit;
    const isExactly100 = Math.abs(splitDifference) < 0.01;

    if (!isExactly100) {
      if (splitDifference > 0) {
        toast.error(`Split percentages must equal exactly 100%. You have ${splitDifference.toFixed(2)}% remaining.`);
      } else {
        toast.error(`Split percentages must equal exactly 100%. You are ${Math.abs(splitDifference).toFixed(2)}% over.`);
      }
      return null;
    }

    if (collaborators.length === 0) {
      toast.error('Please add at least one collaborator with split percentages');
      return null;
    }

    const placementData = {
      title: selectedTrack.title,
      artist: selectedTrack.artist,
      platform: 'SPOTIFY',
      releaseDate: selectedTrack.releaseDate || new Date().toISOString(),
      isrc: selectedTrack.isrc,
      spotifyTrackId: selectedTrack.id,
      status: 'PENDING',
      metadata: {
        album: selectedTrack.album,
        image: selectedTrack.image,
        popularity: selectedTrack.popularity,
      },
      // AudioDB enrichment
      albumName: selectedTrack.enriched?.album?.name || selectedTrack.album,
      genre: selectedTrack.enriched?.artist?.genre || selectedTrack.enriched?.album?.genre,
      releaseYear: selectedTrack.enriched?.album?.year,
      label: selectedTrack.enriched?.album?.label,
      albumArtUrl: selectedTrack.enriched?.album?.thumbnail || selectedTrack.image,
      albumArtHQUrl: selectedTrack.enriched?.album?.thumbnailHQ,
      artistThumbUrl: selectedTrack.enriched?.artist?.thumbnail,
      artistBio: selectedTrack.enriched?.artist?.biography,
      musicbrainzId: selectedTrack.enriched?.album?.musicbrainzId || selectedTrack.enriched?.artist?.musicbrainzId,
      audioDbArtistId: selectedTrack.enriched?.artist?.id,
      audioDbAlbumId: selectedTrack.enriched?.album?.id,
      audioDbData: selectedTrack.enriched,
      // Credits/Collaborators with user linking for statement processing
      credits: collaborators.map(c => ({
        firstName: c.firstName,
        lastName: c.lastName,
        role: c.role,
        splitPercentage: c.splitPercentage,
        pro: c.pro || undefined,
        ipiNumber: c.ipiNumber || undefined,
        isPrimary: c.isPrimary || false,
        notes: c.notes || undefined,
        // User linking fields for Manage Placements integration
        userId: c.userId || undefined,
        publisherIpiNumber: c.publisherIpiNumber || undefined,
        isExternalWriter: c.isExternalWriter || false,
      })),
    };

    const response = await placementApi.create(placementData);
    return response.data.placement;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const placement = await submitPlacement();

      if (!placement) {
        setIsSubmitting(false);
        return;
      }

      // Upload documents if any
      if (documents.length > 0) {
        const uploadPromises = documents.map(doc => {
          if (doc.file) {
            return documentApi.upload(doc.file, {
              category: doc.category,
              description: doc.description,
              placementId: placement.id,
            });
          }
          return Promise.resolve();
        });

        await Promise.all(uploadPromises);
      }

      toast.success(
        <div>
          <div className="font-semibold">Submission Successful!</div>
          <div className="text-sm text-gray-400">Your work has been submitted for review</div>
        </div>,
        {
          duration: 4000,
          icon: '✨',
        }
      );

      // Show success animation then navigate
      setTimeout(() => {
        navigate('/my-submissions');
      }, 2000);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error('Failed to submit. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSubmitAndAddAnother = async () => {
    setIsSubmitting(true);

    try {
      const placement = await submitPlacement();

      if (!placement) {
        setIsSubmitting(false);
        return;
      }

      // Upload documents if any
      if (documents.length > 0) {
        const uploadPromises = documents.map(doc => {
          if (doc.file) {
            return documentApi.upload(doc.file, {
              category: doc.category,
              description: doc.description,
              placementId: placement.id,
            });
          }
          return Promise.resolve();
        });

        await Promise.all(uploadPromises);
      }

      toast.success(
        <div>
          <div className="font-semibold">Track Submitted!</div>
          <div className="text-sm text-gray-400">Ready to add another placement</div>
        </div>,
        {
          duration: 3000,
          icon: '✨',
        }
      );

      // Reset for next track
      setSelectedTrack(null);
      setCollaborators([]);
      setDocuments([]);
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error('Failed to submit. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-white/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-white/[0.015] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-white/[0.01] rounded-full blur-[80px]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-white/[0.08] backdrop-blur-sm bg-surface/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-400 hover:text-white transition-colors mb-4 flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
            <div className="flex items-center gap-4">
              <motion.div
                className="p-3 rounded-xl bg-gradient-to-b from-white/[0.12] to-white/[0.04] border border-white/[0.08]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Music className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                  Work Registration Tool
                </h1>
                <p className="text-gray-400 mt-2">
                  Submit your music for placement tracking and royalty management
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <AnimatePresence mode="wait">
            {!selectedTrack ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {/* Search Card */}
                <motion.div
                  className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-8 overflow-hidden"
                  whileHover={{ borderColor: 'rgba(255, 255, 255, 0.15)' }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative z-10">
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-b from-white/[0.12] to-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                        <Search className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Find Your Track
                      </h2>
                      <p className="text-gray-400">
                        Search Spotify to automatically populate track information
                      </p>
                    </div>

                    <motion.button
                      onClick={() => setShowSpotifyModal(true)}
                      className="w-full py-4 px-6 bg-white text-surface hover:bg-white/90 rounded-xl font-semibold text-lg shadow-lg flex items-center justify-center gap-3 transition-all"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Search className="w-5 h-5" />
                      Search Spotify
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      {[
                        { icon: Music, title: 'Track Placements', desc: 'Monitor your music across platforms' },
                        { icon: CircleDollarSign, title: 'Royalty Tracking', desc: 'See earnings per track' },
                        { icon: BarChart3, title: 'Professional Management', desc: 'Industry-standard tools' },
                      ].map((item, idx) => (
                        <motion.div
                          key={idx}
                          className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 + 0.2 }}
                          whileHover={{ y: -4, borderColor: 'rgba(255, 255, 255, 0.15)' }}
                        >
                          <div className="w-10 h-10 rounded-lg bg-white/[0.08] border border-white/[0.08] flex items-center justify-center mb-3">
                            <item.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="font-semibold text-white text-sm">{item.title}</div>
                          <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                {/* Track Preview Card */}
                <motion.div
                  className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl overflow-hidden"
                  layoutId="track-card"
                >
                  <div className="relative z-10 p-8">
                    <div className="flex items-start gap-6">
                      {/* Album Art */}
                      <motion.div
                        className="relative flex-shrink-0"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {selectedTrack.enriched?.album?.thumbnail || selectedTrack.image ? (
                          <img
                            src={selectedTrack.enriched?.album?.thumbnailHQ || selectedTrack.enriched?.album?.thumbnail || selectedTrack.image}
                            alt={selectedTrack.title}
                            className="w-48 h-48 rounded-xl shadow-2xl object-cover border border-white/[0.08]"
                          />
                        ) : (
                          <div className="w-48 h-48 rounded-xl bg-gradient-to-b from-white/[0.12] to-white/[0.04] border border-white/[0.08] flex items-center justify-center shadow-2xl">
                            <Music className="w-24 h-24 text-white/30" />
                          </div>
                        )}
                        <motion.div
                          className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-2"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: "spring" }}
                        >
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </motion.div>
                      </motion.div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-3xl font-bold text-white mb-2">
                          {selectedTrack.title}
                        </h2>
                        <p className="text-xl text-gray-300 mb-4">
                          {selectedTrack.artist}
                        </p>

                        {selectedTrack.enriched?.album?.name && (
                          <p className="text-gray-400 mb-4">
                            Album: {selectedTrack.enriched.album.name}
                          </p>
                        )}

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap gap-2 mb-6">
                          {selectedTrack.enriched?.artist?.genre && (
                            <span className="px-3 py-1 bg-white/[0.08] text-gray-300 rounded-full text-sm border border-white/[0.08]">
                              {selectedTrack.enriched.artist.genre}
                            </span>
                          )}
                          {selectedTrack.enriched?.album?.year && (
                            <span className="px-3 py-1 bg-white/[0.08] text-gray-300 rounded-full text-sm border border-white/[0.08]">
                              {selectedTrack.enriched.album.year}
                            </span>
                          )}
                          {selectedTrack.enriched?.album?.label && (
                            <span className="px-3 py-1 bg-white/[0.08] text-gray-300 rounded-full text-sm border border-white/[0.08]">
                              {selectedTrack.enriched.album.label}
                            </span>
                          )}
                          {selectedTrack.isrc && (
                            <span className="px-3 py-1 bg-white/[0.04] text-gray-400 rounded-full text-xs font-mono border border-white/[0.08]">
                              ISRC: {selectedTrack.isrc}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-3">
                            <motion.button
                              onClick={handleSubmit}
                              disabled={isSubmitting}
                              className="flex-1 py-3 px-6 bg-white text-surface hover:bg-white/90 disabled:bg-gray-600 disabled:text-gray-400 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all"
                              whileHover={!isSubmitting ? { scale: 1.02, y: -2 } : {}}
                              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                            >
                              {isSubmitting ? (
                                <>
                                  <motion.div
                                    className="w-5 h-5 border-2 border-surface border-t-transparent rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-5 h-5" />
                                  Submit for Registration
                                </>
                              )}
                            </motion.button>

                            <motion.button
                              onClick={handleSubmitAndAddAnother}
                              disabled={isSubmitting}
                              className="flex-1 py-3 px-6 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] disabled:bg-white/[0.04] disabled:text-gray-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                              whileHover={!isSubmitting ? { scale: 1.02, y: -2 } : {}}
                              whileTap={!isSubmitting ? { scale: 0.98 } : {}}
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
                                  <Plus className="w-5 h-5" />
                                  Submit & Add Another
                                </>
                              )}
                            </motion.button>
                          </div>

                          <motion.button
                            onClick={() => {
                              setSelectedTrack(null);
                              setCollaborators([]);
                              setDocuments([]);
                            }}
                            disabled={isSubmitting}
                            className="w-full px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] disabled:opacity-50 text-gray-300 rounded-xl font-medium transition-all"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            Change Track
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Collaborators & Credits Section */}
                    <div className="mt-8 pt-8 border-t border-white/[0.08]">
                      <CollaboratorForm
                        collaborators={collaborators}
                        onChange={setCollaborators}
                        currentUserName={
                          user?.firstName && user?.lastName
                            ? { firstName: user.firstName, lastName: user.lastName }
                            : undefined
                        }
                      />
                    </div>

                    {/* Document Upload Section */}
                    <div className="mt-8 pt-8 border-t border-white/[0.08]">
                      <DocumentUpload
                        documents={documents}
                        onChange={setDocuments}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Spotify Lookup Modal */}
      {showSpotifyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-surface-elevated rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/[0.08]"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <SpotifyTrackLookup
              onTrackSelect={handleTrackSelect}
              onClose={() => setShowSpotifyModal(false)}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}
