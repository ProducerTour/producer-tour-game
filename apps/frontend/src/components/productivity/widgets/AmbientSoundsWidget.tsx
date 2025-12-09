import { useState, useEffect } from 'react';
import {
  Volume2, VolumeX, CloudRain, Coffee, Wind,
  Waves, Music, Flame, Bird, Moon, AlertCircle, Loader2, VolumeOff,
  Headphones, Piano
} from 'lucide-react';
import { useAudio, MUSIC_TRACKS } from '../../../hooks/useAudio';
import type { WidgetProps, AmbientSoundConfig } from '../../../types/productivity.types';

type TabType = 'ambient' | 'music';

interface SoundOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface MusicOption {
  id: string;
  name: string;
  category: 'lofi' | 'classical';
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

/**
 * AmbientSoundsWidget - Focus-enhancing ambient audio & music
 *
 * Features:
 * - Synthesized ambient sounds (rain, wind, ocean, etc.)
 * - Streaming music tracks (lo-fi beats, classical piano)
 * - Tabbed interface for easy navigation
 * - Volume control with visual slider
 * - Mix multiple sounds together
 */
export default function AmbientSoundsWidget({ config, onConfigChange }: WidgetProps) {
  const soundConfig = config as AmbientSoundConfig;
  const {
    audioState,
    isUnlocked,
    masterVolume,
    setMasterVolume,
    startSound,
    stopSound,
    stopAll,
    isPlaying,
    allActiveSounds,
  } = useAudio();

  const [activeTab, setActiveTab] = useState<TabType>('ambient');
  const [loadingSound, setLoadingSound] = useState<string | null>(null);
  const [errorSound, setErrorSound] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.5);

  // Initialize volume from config
  useEffect(() => {
    if (soundConfig?.volume !== undefined) {
      setMasterVolume(soundConfig.volume);
    }
  }, []);

  // Ambient sound options (synthesized)
  const ambientOptions: SoundOption[] = [
    { id: 'rain', name: 'Rain', icon: <CloudRain className="w-5 h-5" />, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    { id: 'cafe', name: 'Café', icon: <Coffee className="w-5 h-5" />, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    { id: 'wind', name: 'Wind', icon: <Wind className="w-5 h-5" />, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
    { id: 'ocean', name: 'Ocean', icon: <Waves className="w-5 h-5" />, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
    { id: 'fire', name: 'Fire', icon: <Flame className="w-5 h-5" />, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    { id: 'birds', name: 'Birds', icon: <Bird className="w-5 h-5" />, color: 'text-green-400', bgColor: 'bg-green-500/20' },
    { id: 'night', name: 'Night', icon: <Moon className="w-5 h-5" />, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
    { id: 'lofi', name: 'Noise', icon: <Music className="w-5 h-5" />, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  ];

  // Music track options (streaming)
  const musicOptions: MusicOption[] = [
    { id: 'lofi-chill', name: 'Chill Beats', category: 'lofi', icon: <Headphones className="w-5 h-5" />, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
    { id: 'lofi-study', name: 'Study Vibes', category: 'lofi', icon: <Headphones className="w-5 h-5" />, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
    { id: 'lofi-jazz', name: 'Jazz Lo-Fi', category: 'lofi', icon: <Headphones className="w-5 h-5" />, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    { id: 'classical-piano', name: 'Piano', category: 'classical', icon: <Piano className="w-5 h-5" />, color: 'text-slate-300', bgColor: 'bg-slate-500/20' },
    { id: 'classical-strings', name: 'Strings', category: 'classical', icon: <Piano className="w-5 h-5" />, color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
    { id: 'classical-ambient', name: 'Ambient', category: 'classical', icon: <Piano className="w-5 h-5" />, color: 'text-sky-400', bgColor: 'bg-sky-500/20' },
  ];

  // Toggle sound on/off
  const toggleSound = async (soundId: string) => {
    setErrorSound(null);

    if (isPlaying(soundId)) {
      stopSound(soundId);
      onConfigChange?.({
        ...config,
        activeSounds: allActiveSounds.filter(s => s !== soundId),
      });
    } else {
      setLoadingSound(soundId);

      try {
        const success = await startSound(soundId);
        if (!success) {
          setErrorSound(soundId);
        } else {
          onConfigChange?.({
            ...config,
            activeSounds: [...allActiveSounds, soundId],
          });
        }
      } catch {
        setErrorSound(soundId);
      } finally {
        setLoadingSound(null);
      }
    }
  };

  // Stop all sounds
  const handleStopAll = () => {
    stopAll();
    setErrorSound(null);
    onConfigChange?.({
      ...config,
      activeSounds: [],
    });
  };

  // Toggle mute
  const toggleMute = () => {
    if (isMuted) {
      setMasterVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(masterVolume);
      setMasterVolume(0);
      setIsMuted(true);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMasterVolume(newVolume);
    setIsMuted(false);
    onConfigChange?.({
      ...config,
      volume: newVolume,
    });
  };

  const hasActiveSounds = allActiveSounds.length > 0;
  const effectiveVolume = isMuted ? 0 : masterVolume;

  // Get tooltip text for music tracks
  const getMusicTooltip = (trackId: string): string => {
    const track = MUSIC_TRACKS[trackId];
    if (!track) return 'Unknown track';
    return `${track.name} by ${track.artist}`;
  };

  // Render sound button
  const renderSoundButton = (sound: SoundOption | MusicOption, isMusic = false) => {
    const isActive = isPlaying(sound.id);
    const isLoading = loadingSound === sound.id;
    const hasError = errorSound === sound.id;

    return (
      <button
        key={sound.id}
        onClick={() => toggleSound(sound.id)}
        disabled={isLoading}
        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all relative ${
          isActive
            ? `${sound.bgColor} ring-1 ring-white/20`
            : hasError
            ? 'bg-red-500/10 ring-1 ring-red-500/30'
            : 'bg-white/5 hover:bg-white/10'
        } ${isLoading ? 'opacity-50' : ''}`}
        title={hasError ? 'Failed to load - click to retry' : (isMusic ? getMusicTooltip(sound.id) : sound.name)}
      >
        <div className={`${isActive ? sound.color : hasError ? 'text-red-400' : 'text-theme-foreground-muted'}`}>
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : hasError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            sound.icon
          )}
        </div>
        <span
          className={`text-xs mt-1 truncate w-full text-center ${
            isActive ? sound.color : hasError ? 'text-red-400' : 'text-theme-foreground-muted'
          }`}
        >
          {sound.name}
        </span>
        {isActive && !isLoading && (
          <div className="mt-1">
            <div className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 rounded-full ${sound.color.replace('text-', 'bg-')}`}
                  style={{
                    height: `${4 + Math.random() * 8}px`,
                    animation: 'pulse 0.5s ease-in-out infinite',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/20 rounded">
            <Volume2 className="w-3 h-3 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-theme-foreground">Focus Audio</span>
        </div>

        {hasActiveSounds && (
          <button
            onClick={handleStopAll}
            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
          >
            Stop All
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setActiveTab('ambient')}
          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'ambient'
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-white/5 text-theme-foreground-muted hover:bg-white/10'
          }`}
        >
          🌧️ Ambient
        </button>
        <button
          onClick={() => setActiveTab('music')}
          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === 'music'
              ? 'bg-pink-500/20 text-pink-400'
              : 'bg-white/5 text-theme-foreground-muted hover:bg-white/10'
          }`}
        >
          🎵 Music
        </button>
      </div>

      {/* Audio State Warning */}
      {!isUnlocked && (
        <div className="mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-amber-400 text-xs">
            <VolumeOff className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {audioState === 'unlocking' ? 'Enabling audio...' : 'Click anywhere to enable audio'}
            </span>
          </div>
        </div>
      )}

      {/* Sound Grid */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'ambient' ? (
          <div className="grid grid-cols-4 gap-2">
            {ambientOptions.map((sound) => renderSoundButton(sound))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Lo-Fi Section */}
            <div>
              <div className="text-xs text-theme-foreground-muted mb-1.5 flex items-center gap-1">
                <Headphones className="w-3 h-3" /> Lo-Fi Beats
              </div>
              <div className="grid grid-cols-3 gap-2">
                {musicOptions.filter(m => m.category === 'lofi').map((music) => renderSoundButton(music, true))}
              </div>
            </div>

            {/* Classical Section */}
            <div>
              <div className="text-xs text-theme-foreground-muted mb-1.5 flex items-center gap-1">
                <Piano className="w-3 h-3" /> Classical Focus
              </div>
              <div className="grid grid-cols-3 gap-2">
                {musicOptions.filter(m => m.category === 'classical').map((music) => renderSoundButton(music, true))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Volume Control */}
      <div className="pt-2 border-t border-white/10 mt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-1.5 hover:bg-white/10 rounded transition-colors flex-shrink-0"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || effectiveVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-theme-foreground-muted" />
            )}
          </button>

          {/* Custom styled range slider */}
          <div className="flex-1 relative h-6 flex items-center">
            <div className="absolute inset-x-0 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${effectiveVolume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={effectiveVolume}
              onChange={handleVolumeChange}
              className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer z-10"
            />
            {/* Custom thumb */}
            <div
              className="absolute w-4 h-4 bg-purple-400 rounded-full shadow-lg border-2 border-white/20 pointer-events-none transition-all"
              style={{ left: `calc(${effectiveVolume * 100}% - 8px)` }}
            />
          </div>

          <span className="text-xs text-theme-foreground-muted w-10 text-right flex-shrink-0">
            {Math.round(effectiveVolume * 100)}%
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-theme-foreground-muted">
          {hasActiveSounds ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {allActiveSounds.length} sound{allActiveSounds.length > 1 ? 's' : ''} playing
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
              Select sounds to play
            </>
          )}
        </div>
      </div>
    </div>
  );
}
