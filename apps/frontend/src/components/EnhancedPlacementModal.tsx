import React, { useState, useEffect } from 'react';
import { AudioDBArtistAutocomplete } from './AudioDBArtistAutocomplete';
import { audiodbApi, AudioDBArtist, AudioDBAlbum } from '../lib/audiodbApi';

interface EnhancedPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (placementData: any) => void;
  initialData?: any;
}

export const EnhancedPlacementModal: React.FC<EnhancedPlacementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    platform: 'SPOTIFY',
    releaseDate: '',
    albumName: '',
    genre: '',
    releaseYear: '',
    label: '',
    streams: '0',
    status: 'PENDING',
    isrc: '',
    notes: '',
  });

  const [audioDbData, setAudioDbData] = useState<{
    artist: AudioDBArtist | null;
    album: AudioDBAlbum | null;
  }>({
    artist: null,
    album: null,
  });

  const [albums, setAlbums] = useState<AudioDBAlbum[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [showAlbumPreview, setShowAlbumPreview] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        artist: initialData.artist || '',
        platform: initialData.platform || 'SPOTIFY',
        releaseDate: initialData.releaseDate?.split('T')[0] || '',
        albumName: initialData.albumName || '',
        genre: initialData.genre || '',
        releaseYear: initialData.releaseYear || '',
        label: initialData.label || '',
        streams: initialData.streams?.toString() || '0',
        status: initialData.status || 'PENDING',
        isrc: initialData.isrc || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const handleArtistSelect = async (artist: AudioDBArtist) => {
    setAudioDbData((prev) => ({ ...prev, artist }));

    // Auto-fill genre if available
    if (artist.genre && !formData.genre) {
      setFormData((prev) => ({ ...prev, genre: artist.genre! }));
    }

    // Fetch albums for this artist
    if (artist.id) {
      setIsLoadingAlbums(true);
      const artistAlbums = await audiodbApi.getArtistAlbums(artist.id);
      setAlbums(artistAlbums);
      setIsLoadingAlbums(false);
    }
  };

  const handleAlbumSelect = (album: AudioDBAlbum) => {
    setAudioDbData((prev) => ({ ...prev, album }));
    setFormData((prev) => ({
      ...prev,
      albumName: album.name,
      genre: album.genre || prev.genre,
      releaseYear: album.year || prev.releaseYear,
      label: album.label || prev.label,
    }));
    setShowAlbumPreview(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const placementData = {
      ...formData,
      streams: parseInt(formData.streams) || 0,
      releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
      // AudioDB enrichment data
      albumArtUrl: audioDbData.album?.thumbnail || undefined,
      albumArtHQUrl: audioDbData.album?.thumbnailHQ || undefined,
      artistThumbUrl: audioDbData.artist?.thumbnail || undefined,
      artistBio: audioDbData.artist?.biography || undefined,
      musicbrainzId: audioDbData.album?.musicbrainzId || audioDbData.artist?.musicbrainzId || undefined,
      audioDbArtistId: audioDbData.artist?.id || undefined,
      audioDbAlbumId: audioDbData.album?.id || undefined,
      audioDbData: {
        artist: audioDbData.artist,
        album: audioDbData.album,
      },
    };

    onSave(placementData);
  };

  if (!isOpen) return null;

  const inputClass = "block w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block mb-2 text-sm font-medium text-slate-300";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 border-b border-slate-700 z-10">
          <h2 className="text-2xl font-bold text-white">
            {initialData ? 'Edit Placement' : 'Add New Placement'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Enter artist name to auto-fill metadata from AudioDB
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-5">
              <div>
                <label className={labelClass}>
                  Artist Name <span className="text-red-400">*</span>
                </label>
                <AudioDBArtistAutocomplete
                  value={formData.artist}
                  onChange={(value) => setFormData((prev) => ({ ...prev, artist: value }))}
                  onArtistSelect={handleArtistSelect}
                  placeholder="Search for artist (e.g., Drake, Taylor Swift)..."
                  className={inputClass}
                />
                {audioDbData.artist && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Artist found in AudioDB</span>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Track Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className={inputClass}
                  placeholder="Song or track title"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Album Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.albumName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, albumName: e.target.value }))}
                    onFocus={() => {
                      if (albums.length > 0) setShowAlbumPreview(true);
                    }}
                    className={inputClass}
                    placeholder="Album name (optional)"
                  />
                  {isLoadingAlbums && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                {showAlbumPreview && albums.length > 0 && (
                  <div className="mt-2 bg-slate-700 rounded-lg border border-slate-600 max-h-48 overflow-y-auto">
                    {albums.slice(0, 5).map((album) => (
                      <div
                        key={album.id}
                        onClick={() => handleAlbumSelect(album)}
                        className="flex items-center gap-3 p-3 hover:bg-slate-600 cursor-pointer border-b border-slate-600 last:border-b-0"
                      >
                        {album.thumbnail && (
                          <img
                            src={album.thumbnail}
                            alt={album.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium">{album.name}</div>
                          <div className="text-xs text-slate-400">
                            {album.year} {album.label && `• ${album.label}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Genre</label>
                  <input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => setFormData((prev) => ({ ...prev, genre: e.target.value }))}
                    className={inputClass}
                    placeholder="Hip-Hop, Pop, etc."
                  />
                </div>
                <div>
                  <label className={labelClass}>Release Year</label>
                  <input
                    type="text"
                    value={formData.releaseYear}
                    onChange={(e) => setFormData((prev) => ({ ...prev, releaseYear: e.target.value }))}
                    className={inputClass}
                    placeholder="2024"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Label</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                  className={inputClass}
                  placeholder="Record label"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData((prev) => ({ ...prev, platform: e.target.value }))}
                  className={inputClass}
                >
                  <option value="SPOTIFY">Spotify</option>
                  <option value="APPLE_MUSIC">Apple Music</option>
                  <option value="AMAZON_MUSIC">Amazon Music</option>
                  <option value="YOUTUBE_MUSIC">YouTube Music</option>
                  <option value="TIDAL">Tidal</option>
                  <option value="DEEZER">Deezer</option>
                  <option value="SOUNDCLOUD">SoundCloud</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Release Date</label>
                <input
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, releaseDate: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Streams</label>
                <input
                  type="number"
                  value={formData.streams}
                  onChange={(e) => setFormData((prev) => ({ ...prev, streams: e.target.value }))}
                  className={inputClass}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                  className={inputClass}
                >
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>ISRC</label>
                <input
                  type="text"
                  value={formData.isrc}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isrc: e.target.value }))}
                  className={inputClass}
                  placeholder="ISRC code (optional)"
                />
              </div>

              {/* AudioDB Preview */}
              {(audioDbData.artist || audioDbData.album) && (
                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <div className="text-xs font-semibold text-slate-400 uppercase mb-3">
                    AudioDB Preview
                  </div>
                  <div className="space-y-3">
                    {audioDbData.album?.thumbnail && (
                      <div className="flex items-center gap-3">
                        <img
                          src={audioDbData.album.thumbnail}
                          alt="Album art"
                          className="w-16 h-16 rounded object-cover shadow-lg"
                        />
                        <div className="text-xs text-slate-300">
                          Album art will be displayed on placement card
                        </div>
                      </div>
                    )}
                    {audioDbData.artist?.thumbnail && !audioDbData.album?.thumbnail && (
                      <div className="flex items-center gap-3">
                        <img
                          src={audioDbData.artist.thumbnail}
                          alt="Artist"
                          className="w-16 h-16 rounded-full object-cover shadow-lg"
                        />
                        <div className="text-xs text-slate-300">
                          Artist image available
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label className={labelClass}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className={inputClass}
              rows={3}
              placeholder="Add any additional notes about this placement..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end mt-8 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/30"
            >
              {initialData ? 'Update Placement' : 'Add Placement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
