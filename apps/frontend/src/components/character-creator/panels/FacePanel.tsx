/**
 * FacePanel
 * Customization options for face: presets and fine-tuning sliders
 */

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useCharacterCreatorStore, useCharacterConfig } from '../../../stores/characterCreator.store';
import { SliderControl } from '../controls/SliderControl';
import { FACE_PRESETS } from '../../../lib/character/defaults';

// Face morph sliders configuration
const FACE_MORPHS: { key: string; label: string; category: string }[] = [
  { key: 'eyeSize', label: 'Eye Size', category: 'Eyes' },
  { key: 'eyeSpacing', label: 'Eye Spacing', category: 'Eyes' },
  { key: 'noseWidth', label: 'Nose Width', category: 'Nose' },
  { key: 'noseLength', label: 'Nose Length', category: 'Nose' },
  { key: 'jawWidth', label: 'Jaw Width', category: 'Jaw' },
  { key: 'chinLength', label: 'Chin Length', category: 'Jaw' },
  { key: 'lipFullness', label: 'Lip Fullness', category: 'Mouth' },
  { key: 'cheekboneHeight', label: 'Cheekbones', category: 'Cheeks' },
];

export function FacePanel() {
  const config = useCharacterConfig();
  const { setFacePreset, setFaceMorph, pushHistory } = useCharacterCreatorStore();

  const handleSliderChange = useCallback(
    (key: string, value: number) => {
      setFaceMorph(key, value);
    },
    [setFaceMorph]
  );

  const handleSliderEnd = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Group morphs by category
  const morphsByCategory = FACE_MORPHS.reduce((acc, morph) => {
    if (!acc[morph.category]) {
      acc[morph.category] = [];
    }
    acc[morph.category].push(morph);
    return acc;
  }, {} as Record<string, typeof FACE_MORPHS>);

  return (
    <div className="p-4 space-y-6">
      {/* Face Presets */}
      <section>
        <h3 className="text-sm font-semibold text-white/80 mb-3">Face Preset</h3>
        <div className="grid grid-cols-3 gap-2">
          {FACE_PRESETS.map((preset) => {
            const isSelected = config.facePreset === preset.id;

            return (
              <button
                key={preset.id}
                onClick={() => setFacePreset(preset.id)}
                className={`
                  relative aspect-square rounded-xl overflow-hidden transition-all
                  ${isSelected
                    ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-[#0a0a0f]'
                    : 'hover:scale-105'
                  }
                `}
              >
                {/* Placeholder - would show face preview thumbnail */}
                <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-1 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-lg">😊</span>
                    </div>
                    <span className="text-xs text-white/60">{preset.name}</span>
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Fine-tuning Sliders */}
      <section>
        <h3 className="text-sm font-semibold text-white/80 mb-4">Fine-Tune</h3>

        <div className="space-y-6">
          {Object.entries(morphsByCategory).map(([category, morphs]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                {category}
              </h4>
              <div className="space-y-4">
                {morphs.map((morph) => (
                  <SliderControl
                    key={morph.key}
                    label={morph.label}
                    value={(config as unknown as Record<string, number>)[morph.key] || 0}
                    min={-1}
                    max={1}
                    step={0.01}
                    onChange={(value) => handleSliderChange(morph.key, value)}
                    onChangeEnd={handleSliderEnd}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
