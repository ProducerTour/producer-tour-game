/**
 * Combat Sounds Hook
 * Plays weapon sounds based on combat state
 * Supports per-weapon sounds and fire tail for smooth sound endings
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCombatStore } from '../combat/useCombatStore';
import { useSoundEffects, SFX } from './useSoundEffects';

interface UseCombatSoundsOptions {
  enabled?: boolean;
  volume?: number;
}

// Weapon-specific sound mappings
const WEAPON_SOUNDS = {
  rifle: {
    fire: SFX.ak47Fire,
    fireTail: SFX.ak47FireTail,
    reload: SFX.ak47Reload,
    empty: SFX.ak47Empty,
  },
  pistol: {
    fire: SFX.pistolShot,
    fireTail: null, // No tail for pistol yet
    reload: SFX.reload,
    empty: SFX.emptyClip,
  },
} as const;

export function useCombatSounds(options: UseCombatSoundsOptions = {}) {
  const { enabled = true, volume = 1.0 } = options;
  const { play, preloadMany } = useSoundEffects();

  // Track previous state to detect changes
  const prevState = useRef({
    isFiring: false,
    isReloading: false,
    reloadSoundTrigger: 0,
    currentWeapon: 'none' as 'none' | 'rifle' | 'pistol',
    ammo: { rifle: 30, pistol: 12 },
  });

  const lastShotTime = useRef(0);
  const fireTailTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFireSounds = useRef<HTMLAudioElement[]>([]);
  const shouldStopFiring = useRef(false); // Flag to stop sounds even if they haven't started yet

  // Preload combat sounds on mount
  useEffect(() => {
    if (!enabled) return;

    preloadMany([
      // AK-47 sounds
      SFX.ak47Fire,
      SFX.ak47FireTail,
      SFX.ak47Reload,
      SFX.ak47Empty,
      // Pistol sounds (generic for now)
      SFX.pistolShot,
      SFX.reload,
      SFX.emptyClip,
      SFX.hitMarker,
    ]);
  }, [enabled, preloadMany]);

  // Stop all active fire sounds immediately (hard stop - tail provides smooth transition)
  const stopFireSounds = useCallback(() => {
    // Set flag to stop any pending sounds that haven't started yet
    shouldStopFiring.current = true;

    activeFireSounds.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeFireSounds.current = [];
  }, []);

  // Play fire tail sound (reverb after burst ends)
  const playFireTail = useCallback((weapon: 'rifle' | 'pistol') => {
    if (!enabled) return;

    const sounds = WEAPON_SOUNDS[weapon];
    if (!sounds.fireTail) return;

    play(sounds.fireTail, {
      volume: volume * 0.5,
    });
  }, [enabled, volume, play]);

  // Play weapon fire sound
  const playFireSound = useCallback(async (weapon: 'rifle' | 'pistol') => {
    if (!enabled) return;

    const now = Date.now();
    // Prevent sound spam (min 50ms between shots)
    if (now - lastShotTime.current < 50) return;
    lastShotTime.current = now;

    // Clear stop flag - we're actively firing
    shouldStopFiring.current = false;

    // Clear any pending fire tail (we're still firing)
    if (fireTailTimeout.current) {
      clearTimeout(fireTailTimeout.current);
      fireTailTimeout.current = null;
    }

    const sounds = WEAPON_SOUNDS[weapon];

    // Add slight pitch variation for realism
    const pitchVariation = 0.97 + Math.random() * 0.06;

    const audio = await play(sounds.fire, {
      volume: volume * (weapon === 'rifle' ? 0.4 : 0.5),
      playbackRate: pitchVariation,
    });

    // Check if we should stop (user released fire while sound was starting)
    if (audio) {
      if (shouldStopFiring.current) {
        // Stop immediately - user already released fire
        audio.pause();
        audio.currentTime = 0;
        return;
      }

      activeFireSounds.current.push(audio);
      // Clean up when sound finishes naturally
      audio.onended = () => {
        activeFireSounds.current = activeFireSounds.current.filter(a => a !== audio);
      };
    }
  }, [enabled, volume, play]);

  // Stop fire sounds and play tail immediately when firing stops
  const handleFireStop = useCallback((weapon: 'rifle' | 'pistol') => {
    if (!enabled) return;

    // Stop current fire sounds with quick fade
    stopFireSounds();

    // Play tail immediately
    playFireTail(weapon);
  }, [enabled, stopFireSounds, playFireTail]);

  // Play reload sound
  const playReloadSound = useCallback((weapon: 'rifle' | 'pistol') => {
    if (!enabled) return;

    const sounds = WEAPON_SOUNDS[weapon];
    play(sounds.reload, {
      volume: volume * 0.7,
    });
  }, [enabled, volume, play]);

  // Play empty clip sound
  const playEmptySound = useCallback((weapon: 'rifle' | 'pistol' = 'rifle') => {
    if (!enabled) return;

    const sounds = WEAPON_SOUNDS[weapon];
    play(sounds.empty, { volume: volume * 0.5 });
  }, [enabled, volume, play]);

  // Play hit marker sound
  const playHitMarker = useCallback((isCritical = false) => {
    if (!enabled) return;
    play(isCritical ? 'criticalHit' : 'hitMarker', {
      volume: volume * 0.6,
    });
  }, [enabled, volume, play]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fireTailTimeout.current) {
        clearTimeout(fireTailTimeout.current);
      }
    };
  }, []);

  // Subscribe to combat store changes
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = useCombatStore.subscribe((state) => {
      const prev = prevState.current;
      const { isFiring, isReloading, reloadSoundTrigger, currentWeapon, ammo } = state;

      // Detect weapon fire (lastFireTime changed while firing)
      if (currentWeapon !== 'none' && isFiring) {
        const currentAmmo = ammo[currentWeapon] || 0;
        const prevAmmo = prev.ammo[currentWeapon] || 0;

        // Ammo decreased = shot fired
        if (currentAmmo < prevAmmo) {
          playFireSound(currentWeapon);
        }
        // Out of ammo and trying to fire
        else if (currentAmmo === 0 && prev.ammo[currentWeapon] === 0) {
          // Only play empty sound once per trigger pull
          if (!prev.isFiring) {
            playEmptySound(currentWeapon);
          }
        }
      }

      // Detect firing stopped - stop fire sounds and play tail immediately
      if (prev.isFiring && !isFiring && prev.currentWeapon !== 'none') {
        handleFireStop(prev.currentWeapon);
      }

      // Stop fire sounds when ammo runs out (even if still holding fire button)
      if (currentWeapon !== 'none' && isFiring) {
        const currentAmmo = ammo[currentWeapon] || 0;
        const prevAmmo = prev.ammo[currentWeapon] || 0;
        if (prevAmmo > 0 && currentAmmo === 0) {
          // Just ran out of ammo - stop fire sounds immediately
          handleFireStop(currentWeapon);
        }
      }

      // Detect reload sound trigger (plays near END of reload, not start)
      // This syncs the "magazine insertion" sound with when the weapon becomes usable
      if (reloadSoundTrigger !== prev.reloadSoundTrigger && reloadSoundTrigger > 0 && currentWeapon !== 'none') {
        playReloadSound(currentWeapon);
      }

      // Update prev state
      prevState.current = {
        isFiring,
        isReloading,
        reloadSoundTrigger,
        currentWeapon,
        ammo: { rifle: ammo.rifle, pistol: ammo.pistol },
      };
    });

    return unsubscribe;
  }, [enabled, playFireSound, playReloadSound, playEmptySound, handleFireStop]);

  return {
    playFireSound,
    playReloadSound,
    playEmptySound,
    playHitMarker,
  };
}

export default useCombatSounds;
