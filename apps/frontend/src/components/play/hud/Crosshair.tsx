/**
 * Crosshair Component
 * SVG-based crosshair with multiple styles
 */

import { useCombatStore } from '../combat/useCombatStore';

export type CrosshairStyle = 'dot' | 'cross' | 'circle' | 'crossDot';

interface CrosshairProps {
  style?: CrosshairStyle;
  color?: string;       // Default color (when not firing)
  fireColor?: string;   // Color when firing
  size?: number;        // Base size in pixels
}

export function Crosshair({
  style = 'dot',
  color = '#ffffff',
  fireColor = '#ef4444',
  size = 4,
}: CrosshairProps) {
  const { currentWeapon, isReloading, isFiring } = useCombatStore();

  if (currentWeapon === 'none') return null;

  // Dynamic color based on firing state
  const currentColor = isFiring ? fireColor : color;
  const opacity = isReloading ? 0.5 : 1;

  // SVG viewBox size (centered around 0,0)
  const viewSize = size * 6;
  const half = viewSize / 2;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <svg
        width={viewSize}
        height={viewSize}
        viewBox={`${-half} ${-half} ${viewSize} ${viewSize}`}
        style={{
          opacity,
          transition: 'opacity 100ms, transform 100ms',
          transform: isFiring ? 'scale(1.15)' : 'scale(1)',
          filter: `drop-shadow(0 0 2px ${currentColor}80)`,
        }}
      >
        {/* Dot style - simple center dot */}
        {style === 'dot' && (
          <circle cx={0} cy={0} r={size / 2} fill={currentColor} />
        )}

        {/* Cross style - simple + shape */}
        {style === 'cross' && (
          <>
            {/* Vertical line */}
            <rect
              x={-1}
              y={-size * 1.5}
              width={2}
              height={size * 3}
              fill={currentColor}
            />
            {/* Horizontal line */}
            <rect
              x={-size * 1.5}
              y={-1}
              width={size * 3}
              height={2}
              fill={currentColor}
            />
          </>
        )}

        {/* Circle style - hollow circle */}
        {style === 'circle' && (
          <circle
            cx={0}
            cy={0}
            r={size}
            fill="none"
            stroke={currentColor}
            strokeWidth={1.5}
          />
        )}

        {/* CrossDot style - cross with center dot */}
        {style === 'crossDot' && (
          <>
            {/* Vertical line */}
            <rect
              x={-1}
              y={-size * 1.5}
              width={2}
              height={size * 3}
              fill={currentColor}
            />
            {/* Horizontal line */}
            <rect
              x={-size * 1.5}
              y={-1}
              width={size * 3}
              height={2}
              fill={currentColor}
            />
            {/* Center dot */}
            <circle cx={0} cy={0} r={size / 3} fill={currentColor} />
          </>
        )}
      </svg>
    </div>
  );
}

export default Crosshair;
