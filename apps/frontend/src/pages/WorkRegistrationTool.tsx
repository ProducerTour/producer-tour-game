import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Music, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
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

    // Validate collaborators
    const totalSplit = collaborators.reduce((sum, c) => sum + (c.splitPercentage || 0), 0);
    if (totalSplit > 100) {
      toast.error('Total split percentage cannot exceed 100%');
      return null;
    }

    if (collaborators.length > 0 && totalSplit === 0) {
      toast.error('Please add at least one collaborator with a split percentage');
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
      // Credits/Collaborators
      credits: collaborators.map(c => ({
        firstName: c.firstName,
        lastName: c.lastName,
        role: c.role,
        splitPercentage: c.splitPercentage,
        pro: c.pro || undefined,
        ipiNumber: c.ipiNumber || undefined,
        isPrimary: c.isPrimary || false,
        notes: c.notes || undefined,
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
          <div className="text-sm text-slate-400">Your work has been submitted for review</div>
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
          <div className="text-sm text-slate-400">Ready to add another placement</div>
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
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      <Toaster position="top-right" />

      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-600/20 to-transparent rounded-full blur-3xl"
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
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-600/20 to-transparent rounded-full blur-3xl"
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => navigate('/admin')}
              className="text-slate-400 hover:text-white transition-colors mb-4 flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>
            <div className="flex items-center gap-4">
              <motion.div
                className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Music className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                  Work Registration Tool
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </h1>
                <p className="text-slate-400 mt-2">
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
                  className="relative rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-xl p-8 overflow-hidden"
                  whileHover={{ borderColor: 'rgba(59, 130, 246, 0.5)' }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Glassmorphism effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                  <div className="relative z-10">
                    <div className="text-center mb-8">
                      <Search className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Find Your Track
                      </h2>
                      <p className="text-slate-400">
                        Search Spotify to automatically populate track information
                      </p>
                    </div>

                    <motion.button
                      onClick={() => setShowSpotifyModal(true)}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3"
                      whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(59, 130, 246, 0.4)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Search className="w-5 h-5" />
                      Search Spotify
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      {[
                        { icon: '🎵', title: 'Track Placements', desc: 'Monitor your music across platforms' },
                        { icon: '💰', title: 'Royalty Tracking', desc: 'See earnings per track' },
                        { icon: '📊', title: 'Professional Management', desc: 'Industry-standard tools' },
                      ].map((item, idx) => (
                        <motion.div
                          key={idx}
                          className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 backdrop-blur-sm"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 + 0.2 }}
                          whileHover={{ y: -4, borderColor: 'rgba(148, 163, 184, 0.5)' }}
                        >
                          <div className="text-3xl mb-2">{item.icon}</div>
                          <div className="font-semibold text-white text-sm">{item.title}</div>
                          <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
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
                  className="relative rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-xl overflow-hidden"
                  layoutId="track-card"
                >
                  {/* Glassmorphism effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

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
                            className="w-48 h-48 rounded-xl shadow-2xl object-cover"
                          />
                        ) : (
                          <div className="w-48 h-48 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl">
                            <Music className="w-24 h-24 text-white/50" />
                          </div>
                        )}
                        <motion.div
                          className="absolute -top-2 -right-2 bg-green-500 rounded-full p-2"
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
                        <p className="text-xl text-slate-300 mb-4">
                          {selectedTrack.artist}
                        </p>

                        {selectedTrack.enriched?.album?.name && (
                          <p className="text-slate-400 mb-4">
                            Album: {selectedTrack.enriched.album.name}
                          </p>
                        )}

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap gap-2 mb-6">
                          {selectedTrack.enriched?.artist?.genre && (
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">
                              {selectedTrack.enriched.artist.genre}
                            </span>
                          )}
                          {selectedTrack.enriched?.album?.year && (
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
                              {selectedTrack.enriched.album.year}
                            </span>
                          )}
                          {selectedTrack.enriched?.album?.label && (
                            <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-sm border border-pink-500/30">
                              {selectedTrack.enriched.album.label}
                            </span>
                          )}
                          {selectedTrack.isrc && (
                            <span className="px-3 py-1 bg-slate-600/50 text-slate-300 rounded-full text-xs font-mono border border-slate-500/30">
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
                              className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl font-semibold shadow-lg shadow-green-600/30 flex items-center justify-center gap-2"
                              whileHover={!isSubmitting ? { scale: 1.02, boxShadow: '0 20px 40px rgba(16, 185, 129, 0.4)' } : {}}
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
                                  <Sparkles className="w-5 h-5" />
                                  Submit for Registration
                                </>
                              )}
                            </motion.button>

                            <motion.button
                              onClick={handleSubmitAndAddAnother}
                              disabled={isSubmitting}
                              className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                              whileHover={!isSubmitting ? { scale: 1.02, boxShadow: '0 20px 40px rgba(59, 130, 246, 0.4)' } : {}}
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
                                  <Music className="w-5 h-5" />
                                  Have another placement?
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
                            className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-xl font-semibold"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            Change Track
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Collaborators & Credits Section */}
                    <div className="mt-8 pt-8 border-t border-slate-700/50">
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
                    <div className="mt-8 pt-8 border-t border-slate-700/50">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700"
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
