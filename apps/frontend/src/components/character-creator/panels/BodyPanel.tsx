/**
 * BodyPanel
 * Simplified customization: body type, skin tone, eye color
 * (Height and build removed for MVP)
 */

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useCharacterCreatorStore, useCharacterConfig } from '../../../stores/characterCreator.store';
import { SkinTonePicker } from '../controls/SkinTonePicker';
import { ColorPicker } from '../controls/ColorPicker';
import { EYE_COLOR_PALETTE } from '../../../lib/character/defaults';
import type { BodyType } from '../../../lib/character/types';

const BODY_TYPES: { id: BodyType; label: string; description: string }[] = [
  { id: 'male', label: 'Masculine', description: 'Male body type' },
  { id: 'female', label: 'Feminine', description: 'Female body type' },
];

export function BodyPanel() {
  const config = useCharacterConfig();
  const {
    setSkinTone,
    setBodyType,
    setEyeColor,
    pushHistory,
  } = useCharacterCreatorStore();

  return (
    <div className="p-4 space-y-6">
      {/* Body Type */}
      <section>
        <h3 className="text-sm font-semibold text-white/80 mb-3">Body Type</h3>
        <div className="grid grid-cols-2 gap-3">
          {BODY_TYPES.map((type) => {
            const isSelected = config.bodyType === type.id;

            return (
              <button
                key={type.id}
                onClick={() => setBodyType(type.id)}
                className={`
                  relative p-4 rounded-xl border transition-all text-left
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
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}
                <p className="text-base font-medium text-white">{type.label}</p>
                <p className="text-xs text-white/50 mt-1">{type.description}</p>
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
    </div>
  );
}
