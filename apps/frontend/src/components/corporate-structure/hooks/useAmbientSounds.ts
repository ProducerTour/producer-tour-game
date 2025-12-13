import { useRef, useCallback, useEffect } from 'react';

// Ambient sound manager hook - Ecosystem soundscape
export function useAmbientSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isInitializedRef = useRef(false);

  const initAudio = useCallback(() => {
    if (isInitializedRef.current) return;

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0.02; // Very quiet ambient ecosystem
      gainNodeRef.current.connect(audioContextRef.current.destination);

      // Create layered ecosystem soundscape

      // 1. Gentle wind/air flow - filtered noise
      const noiseBuffer = audioContextRef.current.createBuffer(1, audioContextRef.current.sampleRate * 2, audioContextRef.current.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
      noiseNodeRef.current = audioContextRef.current.createBufferSource();
      noiseNodeRef.current.buffer = noiseBuffer;
      noiseNodeRef.current.loop = true;

      // Low-pass filter for wind effect
      const windFilter = audioContextRef.current.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 400;
      windFilter.Q.value = 1;

      const windGain = audioContextRef.current.createGain();
      windGain.gain.value = 0.15;

      noiseNodeRef.current.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(gainNodeRef.current);
      noiseNodeRef.current.start();

      // 2. Deep forest ambience - layered low frequencies
      const forestFreqs = [55, 82, 110, 165]; // A1, E2, A2, E3 - natural harmonics
      forestFreqs.forEach((freq, i) => {
        const osc = audioContextRef.current!.createOscillator();
        const oscGain = audioContextRef.current!.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        // Slow LFO modulation for organic feel
        const lfo = audioContextRef.current!.createOscillator();
        const lfoGain = audioContextRef.current!.createGain();
        lfo.frequency.value = 0.05 + i * 0.02; // Very slow modulation
        lfoGain.gain.value = 2 + i; // Subtle frequency wobble
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        oscGain.gain.value = 0.08 / (i + 1); // Lower volume for higher harmonics

        osc.connect(oscGain);
        oscGain.connect(gainNodeRef.current!);
        osc.start();

        oscillatorsRef.current.push(osc);
      });

      // 3. High ethereal shimmer - like distant birds/chimes
      const shimmerFreqs = [880, 1320, 1760]; // A5, E6, A6
      shimmerFreqs.forEach((freq, i) => {
        const osc = audioContextRef.current!.createOscillator();
        const oscGain = audioContextRef.current!.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        // Amplitude modulation for twinkling effect
        const ampLfo = audioContextRef.current!.createOscillator();
        const ampLfoGain = audioContextRef.current!.createGain();
        ampLfo.frequency.value = 0.3 + Math.random() * 0.5;
        ampLfoGain.gain.value = 0.01;

        ampLfo.connect(ampLfoGain);
        ampLfoGain.connect(oscGain.gain);
        ampLfo.start();

        oscGain.gain.value = 0.015 / (i + 1);

        osc.connect(oscGain);
        oscGain.connect(gainNodeRef.current!);
        osc.start();

        oscillatorsRef.current.push(osc);
      });

      isInitializedRef.current = true;
    } catch (e) {
      console.log('Audio not available');
    }
  }, []);

  const playSelectSound = useCallback(() => {
    if (!audioContextRef.current) return;

    try {
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, audioContextRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioContextRef.current.currentTime + 0.1);

      gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);

      osc.start();
      osc.stop(audioContextRef.current.currentTime + 0.2);
    } catch (e) {
      // Silently fail
    }
  }, []);

  const playHoverSound = useCallback(() => {
    if (!audioContextRef.current) return;

    try {
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();

      osc.type = 'sine';
      osc.frequency.value = 600;

      gain.gain.setValueAtTime(0.05, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);

      osc.start();
      osc.stop(audioContextRef.current.currentTime + 0.1);
    } catch (e) {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    return () => {
      // Stop all ecosystem oscillators
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop(); } catch (e) {
          // Silently fail
        }
      });
      // Stop noise node
      if (noiseNodeRef.current) {
        try { noiseNodeRef.current.stop(); } catch (e) {
          // Silently fail
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { initAudio, playSelectSound, playHoverSound };
}

export default useAmbientSounds;
