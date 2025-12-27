/**
 * BodyPanel
 * Customization options for body: skin tone, height, build, body type
 */

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useCharacterCreatorStore, useCharacterConfig } from '../../../stores/characterCreator.store';
import { SkinTonePicker } from '../controls/SkinTonePicker';
import { SliderControl } from '../controls/SliderControl';
import { HEIGHT_CONFIG, EYE_COLOR_PALETTE } from '../../../lib/character/defaults';
import { ColorPicker } from '../controls/ColorPicker';
import type { BodyType, BuildType } from '../../../lib/character/types';

const BODY_TYPES: { id: BodyType; label: string; description: string }[] = [
  { id: 'male', label: 'Masculine', description: 'Broader shoulders' },
  { id: 'female', label: 'Feminine', description: 'Softer curves' },
  { id: 'neutral', label: 'Neutral', description: 'Balanced proportions' },
];

const BUILD_TYPES: { id: BuildType; label: string }[] = [
  { id: 'slim', label: 'Slim' },
  { id: 'average', label: 'Average' },
  { id: 'athletic', label: 'Athletic' },
  { id: 'heavy', label: 'Heavy' },
];

export function BodyPanel() {
  const config = useCharacterConfig();
  const {
    setSkinTone,
    setHeight,
    setBuild,
    setBodyType,
    setEyeColor,
    pushHistory,
  } = useCharacterCreatorStore();

  // Debounced history push for sliders
  const handleSliderEnd = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Format height for display
  const formatHeight = useCallback((value: number) => {
    return HEIGHT_CONFIG.format(value);
  }, []);

  return (
    <div className="p-4 space-y-6">
      {/* Body Type */}
      <section>
        <h3 className="text-sm font-semibold text-white/80 mb-3">Body Type</h3>
        <div className="grid grid-cols-3 gap-2">
          {BODY_TYPES.map((type) => {
            const isSelected = config.bodyType === type.id;

            return (
              <button
                key={type.id}
                onClick={() => setBodyType(type.id)}
                className={`
                  relative p-3 rounded-xl border transition-all text-left
                  ${isSelected
                    ? 'bg-violet-600/20 border-violet-500'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                `}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center"
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </motion.div>
                )}
                <p className="text-sm font-medium text-white">{type.label}</p>
                <p className="text-xs text-white/50 mt-0.5">{type.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Skin Tone */}
      <section>
        <SkinTonePicker
          value={config.skinTone}
          onChange={setSkinTone}
          onChangeEnd={pushHistory}
        />
      </section>

      {/* Eye Color */}
      <section>
        <ColorPicker
          label="Eye Color"
          value={config.eyeColor}
          onChange={setEyeColor}
          onChangeEnd={pushHistory}
          palette={EYE_COLOR_PALETTE}
          allowCustom
        />
      </section>

      {/* Height */}
      <section>
        <SliderControl
          label="Height"
          value={config.height}
          min={0}
          max={1}
          step={0.01}
          onChange={setHeight}
          onChangeEnd={handleSliderEnd}
          formatValue={formatHeight}
        />
      </section>

      {/* Build */}
      <section>
        <h3 className="text-sm font-semibold text-white/80 mb-3">Build</h3>
        <div className="grid grid-cols-4 gap-2">
          {BUILD_TYPES.map((build) => {
            const isSelected = config.build === build.id;

            return (
              <button
                key={build.id}
                onClick={() => setBuild(build.id)}
                className={`
                  relative py-2 px-3 rounded-lg border transition-all
                  ${isSelected
                    ? 'bg-violet-600/20 border-violet-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }
                `}
              >
                <span className="text-sm font-medium">{build.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
