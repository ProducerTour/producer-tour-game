// Audio Manager - spatial audio, ambient sounds, music
import * as THREE from 'three';

export interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  spatialRolloff: number;
  maxDistance: number;
}

export interface SoundConfig {
  url: string;
  volume?: number;
  loop?: boolean;
  spatial?: boolean;
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
}

const DEFAULT_CONFIG: AudioConfig = {
  masterVolume: 1.0,
  musicVolume: 0.7,
  sfxVolume: 1.0,
  ambientVolume: 0.5,
  spatialRolloff: 1.0,
  maxDistance: 50,
};

export class AudioManager {
  private listener: THREE.AudioListener;
  private audioLoader: THREE.AudioLoader;
  private sounds = new Map<string, THREE.Audio | THREE.PositionalAudio>();
  private buffers = new Map<string, AudioBuffer>();
  private config: AudioConfig;
  private musicPlaying: string | null = null;
  private initialized = false;
  private pendingPlay: Array<{ id: string; spatial: boolean; position?: THREE.Vector3 }> = [];

  constructor(camera: THREE.Camera, config: Partial<AudioConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.audioLoader = new THREE.AudioLoader();

    // Handle user interaction requirement
    this.setupUserInteractionHandler();
  }

  private setupUserInteractionHandler(): void {
    const initAudio = () => {
      if (this.initialized) return;

      // Resume audio context
      const ctx = this.listener.context;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.initialized = true;
          console.log('🔊 Audio initialized');

          // Play any pending sounds
          this.pendingPlay.forEach(({ id, spatial, position }) => {
            if (spatial && position) {
              this.playSpatial(id, position);
            } else {
              this.play(id);
            }
          });
          this.pendingPlay = [];
        });
      } else {
        this.initialized = true;
      }

      // Remove listeners
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
  }

  // Preload sounds
  async preload(sounds: Record<string, string>): Promise<void> {
    const promises = Object.entries(sounds).map(async ([id, url]) => {
      try {
        const buffer = await this.loadBuffer(url);
        this.buffers.set(id, buffer);
      } catch (e) {
        console.warn(`Failed to load sound: ${id}`, e);
      }
    });

    await Promise.all(promises);
  }

  private loadBuffer(url: string): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(url, resolve, undefined, reject);
    });
  }

  // Play a non-spatial sound
  play(id: string, config: Partial<SoundConfig> = {}): THREE.Audio | null {
    if (!this.initialized) {
      this.pendingPlay.push({ id, spatial: false });
      return null;
    }

    const buffer = this.buffers.get(id);
    if (!buffer) {
      console.warn(`Sound not found: ${id}`);
      return null;
    }

    // Create audio
    const sound = new THREE.Audio(this.listener);
    sound.setBuffer(buffer);
    sound.setVolume((config.volume ?? 1) * this.config.sfxVolume * this.config.masterVolume);
    sound.setLoop(config.loop ?? false);

    // Store and play
    const soundId = `${id}-${Date.now()}`;
    this.sounds.set(soundId, sound);
    sound.play();

    // Clean up after playing (if not looping)
    if (!config.loop) {
      sound.onEnded = () => {
        this.sounds.delete(soundId);
      };
    }

    return sound;
  }

  // Play a spatial/3D sound
  playSpatial(
    id: string,
    position: THREE.Vector3,
    config: Partial<SoundConfig> = {}
  ): THREE.PositionalAudio | null {
    if (!this.initialized) {
      this.pendingPlay.push({ id, spatial: true, position });
      return null;
    }

    const buffer = this.buffers.get(id);
    if (!buffer) {
      console.warn(`Sound not found: ${id}`);
      return null;
    }

    // Create positional audio
    const sound = new THREE.PositionalAudio(this.listener);
    sound.setBuffer(buffer);
    sound.setVolume((config.volume ?? 1) * this.config.sfxVolume * this.config.masterVolume);
    sound.setLoop(config.loop ?? false);
    sound.setRefDistance(config.refDistance ?? 1);
    sound.setMaxDistance(config.maxDistance ?? this.config.maxDistance);
    sound.setRolloffFactor(config.rolloffFactor ?? this.config.spatialRolloff);
    sound.position.copy(position);

    // Store and play
    const soundId = `${id}-${Date.now()}`;
    this.sounds.set(soundId, sound);
    sound.play();

    // Clean up after playing (if not looping)
    if (!config.loop) {
      sound.onEnded = () => {
        this.sounds.delete(soundId);
      };
    }

    return sound;
  }

  // Play music (crossfades between tracks)
  playMusic(id: string, fadeTime: number = 1): void {
    if (this.musicPlaying === id) return;

    // Fade out current music
    if (this.musicPlaying) {
      const current = this.sounds.get(`music-${this.musicPlaying}`);
      if (current) {
        this.fadeOut(current, fadeTime);
      }
    }

    // Fade in new music
    const buffer = this.buffers.get(id);
    if (!buffer) {
      console.warn(`Music not found: ${id}`);
      return;
    }

    const music = new THREE.Audio(this.listener);
    music.setBuffer(buffer);
    music.setLoop(true);
    music.setVolume(0);

    this.sounds.set(`music-${id}`, music);
    this.musicPlaying = id;

    if (this.initialized) {
      music.play();
      this.fadeIn(music, this.config.musicVolume * this.config.masterVolume, fadeTime);
    }
  }

  // Stop music
  stopMusic(fadeTime: number = 1): void {
    if (!this.musicPlaying) return;

    const current = this.sounds.get(`music-${this.musicPlaying}`);
    if (current) {
      this.fadeOut(current, fadeTime, () => {
        current.stop();
        this.sounds.delete(`music-${this.musicPlaying}`);
        this.musicPlaying = null;
      });
    }
  }

  // Fade helpers
  private fadeIn(audio: THREE.Audio | THREE.PositionalAudio, targetVolume: number, duration: number): void {
    const startVolume = audio.getVolume();
    const startTime = Date.now();

    const fade = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      audio.setVolume(startVolume + (targetVolume - startVolume) * t);

      if (t < 1) {
        requestAnimationFrame(fade);
      }
    };

    fade();
  }

  private fadeOut(audio: THREE.Audio | THREE.PositionalAudio, duration: number, onComplete?: () => void): void {
    const startVolume = audio.getVolume();
    const startTime = Date.now();

    const fade = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      audio.setVolume(startVolume * (1 - t));

      if (t < 1) {
        requestAnimationFrame(fade);
      } else {
        onComplete?.();
      }
    };

    fade();
  }

  // Play ambient sound (loops, lower volume)
  playAmbient(id: string, position?: THREE.Vector3): THREE.Audio | THREE.PositionalAudio | null {
    const config = {
      volume: this.config.ambientVolume,
      loop: true,
    };

    if (position) {
      return this.playSpatial(id, position, config);
    } else {
      return this.play(id, config);
    }
  }

  // Stop a specific sound
  stop(soundId: string): void {
    const sound = this.sounds.get(soundId);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
    this.sounds.delete(soundId);
  }

  // Stop all sounds
  stopAll(): void {
    this.sounds.forEach((sound) => {
      if (sound.isPlaying) {
        sound.stop();
      }
    });
    this.sounds.clear();
    this.musicPlaying = null;
  }

  // Volume controls
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setMusicVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicPlaying) {
      const music = this.sounds.get(`music-${this.musicPlaying}`);
      if (music) {
        music.setVolume(this.config.musicVolume * this.config.masterVolume);
      }
    }
  }

  setSFXVolume(volume: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setAmbientVolume(volume: number): void {
    this.config.ambientVolume = Math.max(0, Math.min(1, volume));
  }

  private updateAllVolumes(): void {
    // Update music volume
    if (this.musicPlaying) {
      const music = this.sounds.get(`music-${this.musicPlaying}`);
      if (music) {
        music.setVolume(this.config.musicVolume * this.config.masterVolume);
      }
    }
  }

  // Get listener for external use
  getListener(): THREE.AudioListener {
    return this.listener;
  }

  // Update listener position (call each frame)
  updateListenerPosition(position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    this.listener.position.copy(position);
    this.listener.quaternion.copy(quaternion);
  }

  // Cleanup
  dispose(): void {
    this.stopAll();
    this.buffers.clear();
    this.listener.parent?.remove(this.listener);
  }
}

// Singleton
let audioManagerInstance: AudioManager | null = null;

export function initAudioManager(camera: THREE.Camera, config?: Partial<AudioConfig>): AudioManager {
  if (audioManagerInstance) {
    audioManagerInstance.dispose();
  }
  audioManagerInstance = new AudioManager(camera, config);
  return audioManagerInstance;
}

export function getAudioManager(): AudioManager | null {
  return audioManagerInstance;
}

export function disposeAudioManager(): void {
  if (audioManagerInstance) {
    audioManagerInstance.dispose();
    audioManagerInstance = null;
  }
}
