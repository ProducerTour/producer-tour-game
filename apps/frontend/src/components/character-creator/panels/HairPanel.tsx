/**
 * HairPanel
 * Customization options for hair: styles and colors
 */

import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Scissors } from 'lucide-react';
import { useCharacterCreatorStore, useCharacterConfig } from '../../../stores/characterCreator.store';
import { ColorPicker } from '../controls/ColorPicker';
import { HAIR_STYLES, HAIR_COLOR_PALETTE } from '../../../lib/character/defaults';

export function HairPanel() {
  const config = useCharacterConfig();
  const { setHairStyle, setHairColor, setHairHighlight, pushHistory } = useCharacterCreatorStore();

  // Filter hair styles compatible with current body type
  const compatibleStyles = useMemo(() => {
    return HAIR_STYLES.filter(
      (style) => style.compatibleWith.includes(config.bodyType)
    );
  }, [config.bodyType]);

  // Check if current style supports highlights
  const currentStyle = useMemo(() => {
    return HAIR_STYLES.find((s) => s.id === config.hairStyleId);
  }, [config.hairStyleId]);

  const handleStyleChange = useCallback(
    (styleId: string) => {
      setHairStyle(styleId === 'bald' ? null : styleId);
    },
    [setHairStyle]
  );

  return (
    <div className="p-4 space-y-6">
      {/* Hair Style Grid */}
      <section>
        <h3 className="text-sm font-semibold text-white/80 mb-3">Hair Style</h3>
        <div className="grid grid-cols-3 gap-2">
          {compatibleStyles.map((style) => {
            const isSelected = (config.hairStyleId === style.id) ||
              (style.id === 'bald' && !config.hairStyleId);

            return (
              <button
                key={style.id}
                onClick={() => handleStyleChange(style.id)}
                className={`
                  relative aspect-square rounded-xl overflow-hidden transition-all
                  ${isSelected
                    ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-[#0a0a0f]'
                    : 'hover:scale-105'
                  }
                `}
              >
                {/* Thumbnail or placeholder */}
                <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex flex-col items-center justify-center p-2">
                  <div
                    className="w-10 h-10 rounded-full mb-1 flex items-center justify-center"
                    style={{
                      backgroundColor: style.id === 'bald' ? 'transparent' : config.hairColor,
                      border: style.id === 'bald' ? '2px dashed rgba(255,255,255,0.2)' : 'none',
                    }}
                  >
                    {style.id === 'bald' ? (
                      <Scissors className="w-4 h-4 text-white/40" />
                    ) : (
                      <span className="text-xs">💇</span>
                    )}
                  </div>
                  <span className="text-xs text-white/60 text-center truncate w-full">
                    {style.name}
                  </span>
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

      {/* Hair Color (only show if not bald) */}
      {config.hairStyleId && config.hairStyleId !== 'bald' && (
        <>
          <section>
            <ColorPicker
              label="Hair Color"
              value={config.hairColor}
              onChange={setHairColor}
              onChangeEnd={pushHistory}
              palette={HAIR_COLOR_PALETTE}
              allowCustom
            />
          </section>

          {/* Highlight Color (if style supports it) */}
          {currentStyle?.supportsHighlights && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white/80">Highlights</h3>
                {config.hairHighlightColor && (
                  <button
                    onClick={() => {
                      setHairHighlight(undefined);
                      pushHistory();
                    }}
                    className="text-xs text-white/50 hover:text-white/70"
                  >
                    Remove
                  </button>
                )}
              </div>
              <ColorPicker
                value={config.hairHighlightColor || config.hairColor}
                onChange={setHairHighlight}
                onChangeEnd={pushHistory}
                palette={HAIR_COLOR_PALETTE}
                allowCustom
              />
            </section>
          )}
        </>
      )}

      {/* Info for bald */}
      {(!config.hairStyleId || config.hairStyleId === 'bald') && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-white/50 text-center">
            No hair style selected. Choose a style above to customize color.
          </p>
        </div>
      )}
    </div>
  );
}
