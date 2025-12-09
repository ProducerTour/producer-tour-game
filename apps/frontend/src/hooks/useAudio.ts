/**
 * useAudio - React hook for audio playback
 *
 * Provides easy access to the AudioService with React state management
 * Supports both synthesized ambient sounds and streaming music tracks
 */

import { useState, useEffect, useCallback } from 'react';
import { audioService, MUSIC_TRACKS, type SoundType, type AudioState } from '../services/audio.service';

interface UseAudioReturn {
  // State
  audioState: AudioState;
  isUnlocked: boolean;
  masterVolume: number;

  // Notifications
  playNotification: (soundType?: SoundType, volume?: number) => Promise<boolean>;

  // Ambient sounds (synthesized)
  startAmbientSound: (soundId: string, urls?: string[], volume?: number) => Promise<boolean>;
  stopAmbientSound: (soundId: string) => void;
  stopAllAmbientSounds: () => void;
  setAmbientVolume: (soundId: string, volume: number) => void;
  isAmbientPlaying: (soundId: string) => boolean;
  activeAmbientSounds: string[];

  // Music tracks (streaming)
  startMusic: (trackId: string, volume?: number) => Promise<boolean>;
  stopMusic: (trackId: string) => void;
  stopAllMusic: () => void;
  isMusicPlaying: (trackId: string) => boolean;
  activeMusicTracks: string[];

  // Unified controls
  startSound: (soundId: string, volume?: number) => Promise<boolean>;
  stopSound: (soundId: string) => void;
  stopAll: () => void;
  isPlaying: (soundId: string) => boolean;
  allActiveSounds: string[];

  // Volume control
  setMasterVolume: (volume: number) => void;
}

export function useAudio(): UseAudioReturn {
  const [audioState, setAudioState] = useState<AudioState>(audioService.getState());
  const [masterVolume, setMasterVolumeState] = useState(audioService.getMasterVolume());
  const [activeAmbientSounds, setActiveAmbientSounds] = useState<string[]>(
    audioService.getActiveAmbientSounds()
  );
  const [activeMusicTracks, setActiveMusicTracks] = useState<string[]>(
    audioService.getActiveMusicTracks()
  );

  // Subscribe to audio state changes
  useEffect(() => {
    const unsubscribe = audioService.on('stateChange', ({ state }) => {
      if (state) setAudioState(state);
    });

    return unsubscribe;
  }, []);

  // Sync active sounds (ambient + music)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAmbientSounds(audioService.getActiveAmbientSounds());
      setActiveMusicTracks(audioService.getActiveMusicTracks());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Notification playback
  const playNotification = useCallback(async (soundType?: SoundType, volume?: number) => {
    return audioService.playNotification(soundType, volume);
  }, []);

  // Ambient sound controls
  const startAmbientSound = useCallback(async (soundId: string, urls?: string[], volume?: number) => {
    const result = await audioService.startAmbientSound(soundId, urls, volume);
    setActiveAmbientSounds(audioService.getActiveAmbientSounds());
    return result;
  }, []);

  const stopAmbientSound = useCallback((soundId: string) => {
    audioService.stopAmbientSound(soundId);
    setActiveAmbientSounds(audioService.getActiveAmbientSounds());
  }, []);

  const stopAllAmbientSounds = useCallback(() => {
    audioService.stopAllAmbientSounds();
    setActiveAmbientSounds([]);
  }, []);

  const setAmbientVolume = useCallback((soundId: string, volume: number) => {
    audioService.setAmbientVolume(soundId, volume);
  }, []);

  const isAmbientPlaying = useCallback((soundId: string) => {
    return audioService.isAmbientPlaying(soundId);
  }, []);

  // Music track controls
  const startMusic = useCallback(async (trackId: string, volume?: number) => {
    const result = await audioService.startMusic(trackId, volume);
    setActiveMusicTracks(audioService.getActiveMusicTracks());
    return result;
  }, []);

  const stopMusic = useCallback((trackId: string) => {
    audioService.stopMusic(trackId);
    setActiveMusicTracks(audioService.getActiveMusicTracks());
  }, []);

  const stopAllMusic = useCallback(() => {
    audioService.stopAllMusic();
    setActiveMusicTracks([]);
  }, []);

  const isMusicPlaying = useCallback((trackId: string) => {
    return audioService.isMusicPlaying(trackId);
  }, []);

  // Unified controls (auto-detect ambient vs music)
  const startSound = useCallback(async (soundId: string, volume?: number) => {
    const result = await audioService.startSound(soundId, volume);
    setActiveAmbientSounds(audioService.getActiveAmbientSounds());
    setActiveMusicTracks(audioService.getActiveMusicTracks());
    return result;
  }, []);

  const stopSound = useCallback((soundId: string) => {
    audioService.stopSound(soundId);
    setActiveAmbientSounds(audioService.getActiveAmbientSounds());
    setActiveMusicTracks(audioService.getActiveMusicTracks());
  }, []);

  const stopAll = useCallback(() => {
    audioService.stopAll();
    setActiveAmbientSounds([]);
    setActiveMusicTracks([]);
  }, []);

  const isPlaying = useCallback((soundId: string) => {
    return audioService.isPlaying(soundId);
  }, []);

  // Master volume
  const setMasterVolume = useCallback((volume: number) => {
    audioService.setMasterVolume(volume);
    setMasterVolumeState(volume);
  }, []);

  return {
    // State
    audioState,
    isUnlocked: audioState === 'unlocked',
    masterVolume,

    // Notifications
    playNotification,

    // Ambient sounds
    startAmbientSound,
    stopAmbientSound,
    stopAllAmbientSounds,
    setAmbientVolume,
    isAmbientPlaying,
    activeAmbientSounds,

    // Music tracks
    startMusic,
    stopMusic,
    stopAllMusic,
    isMusicPlaying,
    activeMusicTracks,

    // Unified controls
    startSound,
    stopSound,
    stopAll,
    isPlaying,
    allActiveSounds: [...activeAmbientSounds, ...activeMusicTracks],

    // Volume
    setMasterVolume,
  };
}

// Re-export types and constants
export type { SoundType, AudioState };
export { MUSIC_TRACKS };
