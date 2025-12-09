import { useState, useRef, useEffect } from 'react';
import {
  Volume2, VolumeX, CloudRain, Coffee, Wind,
  Waves, Music, Flame, Bird, Moon
} from 'lucide-react';
import type { WidgetProps, AmbientSoundConfig } from '../../../types/productivity.types';

interface SoundOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  // Using free ambient sound URLs from various sources
  url: string;
}

/**
 * AmbientSoundsWidget - Focus-enhancing ambient audio
 *
 * Features:
 * - Multiple ambient sound options (rain, café, lo-fi, nature)
 * - Volume control
 * - Mix multiple sounds together
 * - Save preferred sounds in config
 *
 * Note: Uses free ambient sound APIs/streams.
 * Some sounds may require external audio files to be hosted.
 */
export default function AmbientSoundsWidget({ config, onConfigChange, isEditing }: WidgetProps) {
  const soundConfig = config as AmbientSoundConfig;
  const [activeSounds, setActiveSounds] = useState<Set<string>>(
    new Set(soundConfig.activeSounds || [])
  );
  const [masterVolume, setMasterVolume] = useState(soundConfig.volume || 0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Sound options with free audio stream URLs
  // These use creative commons or royalty-free sources
  const soundOptions: SoundOption[] = [
    {
      id: 'rain',
      name: 'Rain',
      icon: <CloudRain className="w-5 h-5" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      url: 'https://cdn.pixabay.com/audio/2022/05/16/audio_58d6d4d0bb.mp3', // Pixabay free rain sound
    },
    {
      id: 'cafe',
      name: 'Café',
      icon: <Coffee className="w-5 h-5" />,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_7bdb3f6c9e.mp3', // Pixabay café ambience
    },
    {
      id: 'wind',
      name: 'Wind',
      icon: <Wind className="w-5 h-5" />,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      url: 'https://cdn.pixabay.com/audio/2022/02/22/audio_9a48b52b6e.mp3', // Pixabay wind
    },
    {
      id: 'ocean',
      name: 'Ocean',
      icon: <Waves className="w-5 h-5" />,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/20',
      url: 'https://cdn.pixabay.com/audio/2022/06/25/audio_0f04bcbda6.mp3', // Pixabay ocean waves
    },
    {
      id: 'lofi',
      name: 'Lo-Fi',
      icon: <Music className="w-5 h-5" />,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_67d2c7d0bd.mp3', // Pixabay lo-fi beat
    },
    {
      id: 'fire',
      name: 'Fireplace',
      icon: <Flame className="w-5 h-5" />,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      url: 'https://cdn.pixabay.com/audio/2022/02/23/audio_4aade2c0f3.mp3', // Pixabay fire crackling
    },
    {
      id: 'birds',
      name: 'Birds',
      icon: <Bird className="w-5 h-5" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      url: 'https://cdn.pixabay.com/audio/2022/03/09/audio_ad3b25cec3.mp3', // Pixabay birds
    },
    {
      id: 'night',
      name: 'Night',
      icon: <Moon className="w-5 h-5" />,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/20',
      url: 'https://cdn.pixabay.com/audio/2022/04/27/audio_cf6c5a6b8f.mp3', // Pixabay night crickets
    },
  ];

  // Initialize and manage audio elements
  useEffect(() => {
    // Clean up audio elements on unmount
    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  // Update volumes when master volume or mute changes
  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      audio.volume = isMuted ? 0 : masterVolume;
    });
  }, [masterVolume, isMuted]);

  // Toggle sound on/off
  const toggleSound = (soundId: string) => {
    if (isEditing) return;

    const newActiveSounds = new Set(activeSounds);
    const sound = soundOptions.find((s) => s.id === soundId);
    if (!sound) return;

    if (activeSounds.has(soundId)) {
      // Stop sound
      newActiveSounds.delete(soundId);
      const audio = audioRefs.current.get(soundId);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audioRefs.current.delete(soundId);
      }
    } else {
      // Start sound
      newActiveSounds.add(soundId);
      let audio = audioRefs.current.get(soundId);

      if (!audio) {
        audio = new Audio(sound.url);
        audio.loop = true;
        audio.volume = isMuted ? 0 : masterVolume;
        audioRefs.current.set(soundId, audio);
      }

      audio.play().catch((err) => {
        console.error('Audio playback failed:', err);
        // Remove from active if failed
        newActiveSounds.delete(soundId);
      });
    }

    setActiveSounds(newActiveSounds);
    onConfigChange?.({
      ...config,
      activeSounds: Array.from(newActiveSounds),
    });
  };

  // Stop all sounds
  const stopAll = () => {
    if (isEditing) return;

    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    audioRefs.current.clear();
    setActiveSounds(new Set());
    onConfigChange?.({
      ...config,
      activeSounds: [],
    });
  };

  // Toggle mute
  const toggleMute = () => {
    if (isEditing) return;
    setIsMuted(!isMuted);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditing) return;
    const newVolume = parseFloat(e.target.value);
    setMasterVolume(newVolume);
    onConfigChange?.({
      ...config,
      volume: newVolume,
    });
  };

  const hasActiveSounds = activeSounds.size > 0;

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/20 rounded">
            <Volume2 className="w-3 h-3 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-theme-foreground">Ambient Sounds</span>
        </div>

        {hasActiveSounds && (
          <button
            onClick={stopAll}
            disabled={isEditing}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Stop All
          </button>
        )}
      </div>

      {/* Sound Grid */}
      <div className="flex-1 grid grid-cols-4 gap-2 mb-3">
        {soundOptions.map((sound) => {
          const isActive = activeSounds.has(sound.id);

          return (
            <button
              key={sound.id}
              onClick={() => toggleSound(sound.id)}
              disabled={isEditing}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                isActive
                  ? `${sound.bgColor} ring-1 ring-white/20`
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              title={sound.name}
            >
              <div className={isActive ? sound.color : 'text-theme-foreground-muted'}>
                {sound.icon}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isActive ? sound.color : 'text-theme-foreground-muted'
                }`}
              >
                {sound.name}
              </span>
              {isActive && (
                <div className="mt-1">
                  <div className="flex gap-0.5">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-0.5 ${sound.bgColor.replace('/20', '')} rounded-full animate-pulse`}
                        style={{
                          height: `${6 + Math.random() * 6}px`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Volume Control */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            disabled={isEditing}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-theme-foreground-muted" />
            ) : (
              <Volume2 className="w-4 h-4 text-theme-foreground-muted" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={handleVolumeChange}
            disabled={isEditing}
            className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-purple-400
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-purple-400
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer"
          />

          <span className="text-xs text-theme-foreground-muted w-8 text-right">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-theme-foreground-muted">
          {hasActiveSounds ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {activeSounds.size} sound{activeSounds.size > 1 ? 's' : ''} playing
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
