/**
 * AudioService - Centralized audio management for the entire app
 *
 * Features:
 * - 100% synthesized sounds (no external dependencies)
 * - Handles browser autoplay policies automatically
 * - Notification sounds (chime, pop, ding, etc.)
 * - Ambient sounds (rain, cafe, wind, ocean, etc.) using noise generators
 * - Master volume control
 */

type SoundType = 'chime' | 'pop' | 'ding' | 'bell' | 'subtle' | 'success' | 'error' | 'timer';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  notes?: number[];
}

// Synthesized notification sound configurations
const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  chime: { frequency: 880, duration: 0.3, type: 'sine', volume: 0.3, notes: [880, 1100] },
  pop: { frequency: 600, duration: 0.15, type: 'sine', volume: 0.25 },
  ding: { frequency: 1200, duration: 0.4, type: 'triangle', volume: 0.25 },
  bell: { frequency: 800, duration: 0.5, type: 'sine', volume: 0.2, notes: [800, 1000, 1200] },
  subtle: { frequency: 440, duration: 0.2, type: 'sine', volume: 0.15 },
  success: { frequency: 523, duration: 0.3, type: 'sine', volume: 0.25, notes: [523, 659, 784] },
  error: { frequency: 200, duration: 0.4, type: 'sawtooth', volume: 0.2, notes: [200, 180] },
  timer: { frequency: 1000, duration: 0.5, type: 'sine', volume: 0.35, notes: [1000, 1200, 1000, 1200] },
};

// Ambient sound configurations for synthesized generation
interface AmbientConfig {
  name: string;
  // Noise type: 'white' | 'pink' | 'brown' for different textures
  noiseType: 'white' | 'pink' | 'brown';
  // Low-pass filter frequency (lower = more muffled)
  filterFreq: number;
  // Filter Q (resonance)
  filterQ: number;
  // Base volume
  baseVolume: number;
  // Modulation frequency (for wave-like effects)
  modFreq?: number;
  // Modulation depth (0-1)
  modDepth?: number;
  // Additional oscillator for texture
  toneFreq?: number;
  toneVolume?: number;
}

const AMBIENT_CONFIGS: Record<string, AmbientConfig> = {
  rain: {
    name: 'Rain',
    noiseType: 'white',
    filterFreq: 3000,
    filterQ: 1,
    baseVolume: 0.15,
    modFreq: 0.2,
    modDepth: 0.3,
  },
  cafe: {
    name: 'Café',
    noiseType: 'pink',
    filterFreq: 2000,
    filterQ: 0.5,
    baseVolume: 0.12,
    modFreq: 0.1,
    modDepth: 0.2,
  },
  wind: {
    name: 'Wind',
    noiseType: 'brown',
    filterFreq: 800,
    filterQ: 2,
    baseVolume: 0.2,
    modFreq: 0.05,
    modDepth: 0.5,
  },
  ocean: {
    name: 'Ocean',
    noiseType: 'brown',
    filterFreq: 400,
    filterQ: 1,
    baseVolume: 0.25,
    modFreq: 0.08,
    modDepth: 0.6,
  },
  fire: {
    name: 'Fire',
    noiseType: 'brown',
    filterFreq: 600,
    filterQ: 1.5,
    baseVolume: 0.18,
    modFreq: 3,
    modDepth: 0.4,
  },
  birds: {
    name: 'Birds',
    noiseType: 'white',
    filterFreq: 4000,
    filterQ: 3,
    baseVolume: 0.08,
    modFreq: 2,
    modDepth: 0.7,
    toneFreq: 2000,
    toneVolume: 0.03,
  },
  night: {
    name: 'Night',
    noiseType: 'brown',
    filterFreq: 300,
    filterQ: 0.5,
    baseVolume: 0.1,
    modFreq: 0.5,
    modDepth: 0.3,
    toneFreq: 440,
    toneVolume: 0.02,
  },
  lofi: {
    name: 'Lo-Fi',
    noiseType: 'pink',
    filterFreq: 1500,
    filterQ: 0.7,
    baseVolume: 0.1,
    modFreq: 0.3,
    modDepth: 0.2,
    toneFreq: 220,
    toneVolume: 0.05,
  },
};

// Music track configurations - streamed via backend proxy to avoid CORS issues
interface MusicTrack {
  name: string;
  artist: string;
  category: 'lofi' | 'classical' | 'ambient';
}

// Get the API base URL for the backend proxy
// Uses the same VITE_API_URL environment variable as api.ts for consistency
const getApiBaseUrl = (): string => {
  // Use environment variable if available (same as api.ts)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback for production domains
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'producertour.com' || hostname === 'www.producertour.com') {
      return 'https://website-0qgn.onrender.com';
    }
    if (hostname.includes('vercel.app')) {
      return 'https://website-0qgn.onrender.com';
    }
  }
  // Local development fallback
  return 'http://localhost:3000';
};

// Music tracks available via backend proxy
// The backend handles fetching from external sources and bypasses CORS
export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  // Lo-Fi / Chill Beats
  'lofi-chill': {
    name: 'Chill Vibes',
    artist: 'SoundHelix',
    category: 'lofi',
  },
  'lofi-study': {
    name: 'Study Flow',
    artist: 'SoundHelix',
    category: 'lofi',
  },
  'lofi-jazz': {
    name: 'Smooth Jazz',
    artist: 'SoundHelix',
    category: 'lofi',
  },
  // Classical / Piano
  'classical-piano': {
    name: 'Piano Dreams',
    artist: 'SoundHelix',
    category: 'classical',
  },
  'classical-strings': {
    name: 'String Serenade',
    artist: 'SoundHelix',
    category: 'classical',
  },
  'classical-ambient': {
    name: 'Ambient Space',
    artist: 'SoundHelix',
    category: 'classical',
  },
};

type AudioState = 'locked' | 'unlocking' | 'unlocked';
type AudioEventType = 'stateChange' | 'error';
type AudioEventCallback = (data: { state?: AudioState; error?: string }) => void;

// Node structure for synthesized ambient sounds
interface AmbientNodes {
  noiseSource: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gainNode: GainNode;
  modOsc?: OscillatorNode;
  modGain?: GainNode;
  toneOsc?: OscillatorNode;
  toneGain?: GainNode;
}

class AudioService {
  private audioContext: AudioContext | null = null;
  private state: AudioState = 'locked';
  private listeners: Map<AudioEventType, Set<AudioEventCallback>> = new Map();
  private activeAmbientNodes: Map<string, AmbientNodes> = new Map();
  private activeMusicTracks: Map<string, HTMLAudioElement> = new Map();
  private noiseBuffers: Map<string, AudioBuffer> = new Map();
  private masterVolume: number = 0.5;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupUserInteractionListener();
    }
  }

  private setupUserInteractionListener(): void {
    const unlockAudio = async () => {
      if (this.state === 'unlocked') return;

      this.state = 'unlocking';
      this.emit('stateChange', { state: 'unlocking' });

      try {
        await this.init();
        this.state = 'unlocked';
        this.emit('stateChange', { state: 'unlocked' });

        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);

        console.log('[AudioService] Audio unlocked successfully');
      } catch (error) {
        this.state = 'locked';
        this.emit('error', { error: 'Failed to unlock audio' });
        console.warn('[AudioService] Failed to unlock audio:', error);
      }
    };

    document.addEventListener('click', unlockAudio, { once: false });
    document.addEventListener('touchstart', unlockAudio, { once: false });
    document.addEventListener('keydown', unlockAudio, { once: false });
  }

  async init(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (!this.audioContext) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) {
            console.warn('[AudioService] Web Audio API not supported');
            return false;
          }
          this.audioContext = new AudioContextClass();
        }

        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        // Pre-generate noise buffers
        this.generateNoiseBuffers();

        return this.audioContext.state === 'running';
      } catch (error) {
        console.error('[AudioService] Failed to initialize:', error);
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Generate noise buffers for ambient sounds
   */
  private generateNoiseBuffers(): void {
    if (!this.audioContext || this.noiseBuffers.size > 0) return;

    const sampleRate = this.audioContext.sampleRate;
    const bufferLength = sampleRate * 2; // 2 seconds of noise (will loop)

    // White noise
    const whiteBuffer = this.audioContext.createBuffer(1, bufferLength, sampleRate);
    const whiteData = whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffers.set('white', whiteBuffer);

    // Pink noise (1/f noise) - approximation
    const pinkBuffer = this.audioContext.createBuffer(1, bufferLength, sampleRate);
    const pinkData = pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.noiseBuffers.set('pink', pinkBuffer);

    // Brown noise (1/f² noise) - integration of white noise
    const brownBuffer = this.audioContext.createBuffer(1, bufferLength, sampleRate);
    const brownData = brownBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      brownData[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = brownData[i];
      brownData[i] *= 3.5; // Boost volume
    }
    this.noiseBuffers.set('brown', brownBuffer);
  }

  getState(): AudioState {
    return this.state;
  }

  isUnlocked(): boolean {
    return this.state === 'unlocked' && this.audioContext?.state === 'running';
  }

  on(event: AudioEventType, callback: AudioEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: AudioEventType, data: { state?: AudioState; error?: string }): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    this.activeAmbientNodes.forEach(({ gainNode }) => {
      if (this.audioContext) {
        gainNode.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
      }
    });
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Play a synthesized notification sound
   */
  async playNotification(soundType: SoundType = 'chime', volume?: number): Promise<boolean> {
    if (!await this.init()) {
      console.warn('[AudioService] Cannot play notification - audio not initialized');
      return false;
    }

    try {
      const config = SOUND_CONFIGS[soundType] || SOUND_CONFIGS.chime;
      const notes = config.notes || [config.frequency];
      const effectiveVolume = (volume ?? config.volume) * this.masterVolume;

      notes.forEach((freq, index) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        oscillator.frequency.value = freq;
        oscillator.type = config.type;

        const startTime = this.audioContext!.currentTime + (index * 0.1);
        gainNode.gain.setValueAtTime(effectiveVolume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + config.duration);
      });

      return true;
    } catch (error) {
      console.error('[AudioService] Failed to play notification:', error);
      this.emit('error', { error: 'Failed to play notification sound' });
      return false;
    }
  }

  /**
   * Start a synthesized ambient sound
   */
  async startAmbientSound(soundId: string, _urls?: string[], volume?: number): Promise<boolean> {
    if (!await this.init()) {
      console.warn('[AudioService] Cannot start ambient sound - audio not initialized');
      return false;
    }

    // Stop if already playing
    if (this.activeAmbientNodes.has(soundId)) {
      this.stopAmbientSound(soundId);
    }

    const config = AMBIENT_CONFIGS[soundId];
    if (!config) {
      console.warn(`[AudioService] Unknown ambient sound: ${soundId}`);
      return false;
    }

    const noiseBuffer = this.noiseBuffers.get(config.noiseType);
    if (!noiseBuffer) {
      console.error(`[AudioService] Noise buffer not found: ${config.noiseType}`);
      return false;
    }

    try {
      const ctx = this.audioContext!;

      // Create noise source
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Create filter for shaping the noise
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = config.filterFreq;
      filter.Q.value = config.filterQ;

      // Create gain node for volume control
      const gainNode = ctx.createGain();
      const effectiveVolume = (volume ?? 1) * config.baseVolume * this.masterVolume;
      gainNode.gain.value = effectiveVolume;

      // Connect: noise -> filter -> gain -> destination
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      const nodes: AmbientNodes = { noiseSource, filter, gainNode };

      // Add modulation for more natural sound
      if (config.modFreq && config.modDepth) {
        const modOsc = ctx.createOscillator();
        const modGain = ctx.createGain();

        modOsc.frequency.value = config.modFreq;
        modOsc.type = 'sine';
        modGain.gain.value = config.modDepth * effectiveVolume;

        modOsc.connect(modGain);
        modGain.connect(gainNode.gain);
        modOsc.start();

        nodes.modOsc = modOsc;
        nodes.modGain = modGain;
      }

      // Add optional tone for texture (birds chirping, cricket sounds, etc.)
      if (config.toneFreq && config.toneVolume) {
        const toneOsc = ctx.createOscillator();
        const toneGain = ctx.createGain();

        toneOsc.frequency.value = config.toneFreq;
        toneOsc.type = 'sine';
        toneGain.gain.value = config.toneVolume * this.masterVolume;

        // Add slight frequency modulation for more natural sound
        const freqMod = ctx.createOscillator();
        const freqModGain = ctx.createGain();
        freqMod.frequency.value = 0.5 + Math.random();
        freqModGain.gain.value = config.toneFreq * 0.1;
        freqMod.connect(freqModGain);
        freqModGain.connect(toneOsc.frequency);
        freqMod.start();

        toneOsc.connect(toneGain);
        toneGain.connect(ctx.destination);
        toneOsc.start();

        nodes.toneOsc = toneOsc;
        nodes.toneGain = toneGain;
      }

      noiseSource.start();
      this.activeAmbientNodes.set(soundId, nodes);

      console.log(`[AudioService] Started ambient sound: ${soundId}`);
      return true;
    } catch (error) {
      console.error(`[AudioService] Failed to start ambient sound ${soundId}:`, error);
      return false;
    }
  }

  /**
   * Stop an ambient sound
   */
  stopAmbientSound(soundId: string): void {
    const nodes = this.activeAmbientNodes.get(soundId);
    if (nodes) {
      try {
        nodes.noiseSource.stop();
        nodes.noiseSource.disconnect();
        nodes.filter.disconnect();
        nodes.gainNode.disconnect();
        nodes.modOsc?.stop();
        nodes.modOsc?.disconnect();
        nodes.modGain?.disconnect();
        nodes.toneOsc?.stop();
        nodes.toneOsc?.disconnect();
        nodes.toneGain?.disconnect();
      } catch {
        // Ignore errors if already stopped
      }
      this.activeAmbientNodes.delete(soundId);
      console.log(`[AudioService] Stopped ambient sound: ${soundId}`);
    }
  }

  /**
   * Set volume for a specific ambient sound
   */
  setAmbientVolume(soundId: string, volume: number): void {
    const nodes = this.activeAmbientNodes.get(soundId);
    const config = AMBIENT_CONFIGS[soundId];
    if (nodes && this.audioContext && config) {
      const effectiveVolume = volume * config.baseVolume * this.masterVolume;
      nodes.gainNode.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
    }
  }

  /**
   * Check if an ambient sound is currently playing
   */
  isAmbientPlaying(soundId: string): boolean {
    return this.activeAmbientNodes.has(soundId);
  }

  /**
   * Stop all ambient sounds
   */
  stopAllAmbientSounds(): void {
    this.activeAmbientNodes.forEach((_, soundId) => {
      this.stopAmbientSound(soundId);
    });
  }

  /**
   * Get list of currently playing ambient sounds
   */
  getActiveAmbientSounds(): string[] {
    return Array.from(this.activeAmbientNodes.keys());
  }

  /**
   * Get available ambient sound IDs
   */
  getAvailableAmbientSounds(): string[] {
    return Object.keys(AMBIENT_CONFIGS);
  }

  // ==========================================
  // MUSIC TRACK METHODS (streaming audio)
  // ==========================================

  /**
   * Start playing a music track via backend proxy
   */
  async startMusic(trackId: string, volume?: number): Promise<boolean> {
    if (!await this.init()) {
      console.warn('[AudioService] Cannot start music - audio not initialized');
      return false;
    }

    // Stop if already playing
    if (this.activeMusicTracks.has(trackId)) {
      this.stopMusic(trackId);
    }

    const track = MUSIC_TRACKS[trackId];
    if (!track) {
      console.warn(`[AudioService] Unknown music track: ${trackId}`);
      return false;
    }

    // Build the proxy URL - requires authentication
    const baseUrl = getApiBaseUrl();
    const proxyUrl = `${baseUrl}/api/audio/stream/${trackId}`;

    // Get auth token from sessionStorage or localStorage (matching api.ts pattern)
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      console.warn('[AudioService] Cannot play music - not authenticated');
      return false;
    }

    try {
      const audio = new Audio();
      // Don't set crossOrigin for same-origin or authenticated requests
      audio.loop = true;
      audio.volume = (volume ?? 1) * this.masterVolume;
      audio.preload = 'auto';

      // For authenticated requests, we need to fetch with auth header and create blob URL
      const response = await fetch(proxyUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Create a blob URL from the response
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Wait for the audio to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);

        audio.oncanplaythrough = () => {
          clearTimeout(timeout);
          resolve();
        };

        audio.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load audio`));
        };

        audio.src = blobUrl;
      });

      await audio.play();
      this.activeMusicTracks.set(trackId, audio);
      console.log(`[AudioService] Started music track: ${trackId} (${track.name} by ${track.artist})`);
      return true;
    } catch (error) {
      console.error(`[AudioService] Failed to load music track ${trackId}:`, error);
      return false;
    }
  }

  /**
   * Stop a music track
   */
  stopMusic(trackId: string): void {
    const audio = this.activeMusicTracks.get(trackId);
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        // Revoke blob URL to prevent memory leak
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        audio.src = '';
      } catch {
        // Ignore errors
      }
      this.activeMusicTracks.delete(trackId);
      console.log(`[AudioService] Stopped music track: ${trackId}`);
    }
  }

  /**
   * Stop all music tracks
   */
  stopAllMusic(): void {
    this.activeMusicTracks.forEach((_, trackId) => {
      this.stopMusic(trackId);
    });
  }

  /**
   * Set volume for a music track
   */
  setMusicVolume(trackId: string, volume: number): void {
    const audio = this.activeMusicTracks.get(trackId);
    if (audio) {
      audio.volume = volume * this.masterVolume;
    }
  }

  /**
   * Check if a music track is playing
   */
  isMusicPlaying(trackId: string): boolean {
    return this.activeMusicTracks.has(trackId);
  }

  /**
   * Get list of currently playing music tracks
   */
  getActiveMusicTracks(): string[] {
    return Array.from(this.activeMusicTracks.keys());
  }

  /**
   * Get available music track IDs
   */
  getAvailableMusicTracks(): string[] {
    return Object.keys(MUSIC_TRACKS);
  }

  /**
   * Get music track info
   */
  getMusicTrackInfo(trackId: string): MusicTrack | undefined {
    return MUSIC_TRACKS[trackId];
  }

  /**
   * Stop all audio (ambient + music)
   */
  stopAll(): void {
    this.stopAllAmbientSounds();
    this.stopAllMusic();
  }

  /**
   * Get all active sounds (ambient + music)
   */
  getAllActiveSounds(): string[] {
    return [...this.getActiveAmbientSounds(), ...this.getActiveMusicTracks()];
  }

  /**
   * Check if any sound is playing (ambient or music)
   */
  isPlaying(soundId: string): boolean {
    return this.isAmbientPlaying(soundId) || this.isMusicPlaying(soundId);
  }

  /**
   * Start any sound (auto-detects if it's ambient or music)
   */
  async startSound(soundId: string, volume?: number): Promise<boolean> {
    // Check if it's an ambient sound
    if (AMBIENT_CONFIGS[soundId]) {
      return this.startAmbientSound(soundId, undefined, volume);
    }
    // Check if it's a music track
    if (MUSIC_TRACKS[soundId]) {
      return this.startMusic(soundId, volume);
    }
    console.warn(`[AudioService] Unknown sound: ${soundId}`);
    return false;
  }

  /**
   * Stop any sound (auto-detects if it's ambient or music)
   */
  stopSound(soundId: string): void {
    if (this.activeAmbientNodes.has(soundId)) {
      this.stopAmbientSound(soundId);
    }
    if (this.activeMusicTracks.has(soundId)) {
      this.stopMusic(soundId);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAllAmbientSounds();
    this.stopAllMusic();
    this.noiseBuffers.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const audioService = new AudioService();

// Export types
export type { SoundType, AudioState };

// Legacy export for compatibility
export const AMBIENT_SOUND_URLS: Record<string, string[]> = {};
