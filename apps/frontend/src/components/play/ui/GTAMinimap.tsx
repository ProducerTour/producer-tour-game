/**
 * GTAMinimap.tsx
 * GTA V-style minimap with polygonal shape, player indicator, and integrated health/armor bars
 */

import { useRef, useEffect, useMemo } from 'react';
import { useCombatStore } from '../combat/useCombatStore';

export interface GTAMinimapProps {
  /** Player X position in world coordinates */
  playerX: number;
  /** Player Z position in world coordinates */
  playerZ: number;
  /** Player rotation (Y axis, radians) - direction player is facing */
  playerRotation: number;
  /** World size for scaling */
  worldSize?: number;
}

/**
 * GTA V-style minimap with distinctive wedge shape
 */
export function GTAMinimap({
  playerX,
  playerZ,
  playerRotation,
  worldSize = 512,
}: GTAMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use selectors to prevent re-renders when unrelated state changes
  const playerHealth = useCombatStore((s) => s.playerHealth);
  const playerMaxHealth = useCombatStore((s) => s.playerMaxHealth);

  // Health percentage for the bar
  const healthPercent = (playerHealth / playerMaxHealth) * 100;

  // Convert rotation to degrees for display (0 = North, 90 = East, etc.)
  const rotationDegrees = useMemo(() => {
    const degrees = (-playerRotation * 180) / Math.PI + 180;
    return ((degrees % 360) + 360) % 360;
  }, [playerRotation]);

  // Cardinal direction
  const cardinalDirection = useMemo(() => {
    const d = rotationDegrees;
    if (d >= 337.5 || d < 22.5) return 'N';
    if (d >= 22.5 && d < 67.5) return 'NE';
    if (d >= 67.5 && d < 112.5) return 'E';
    if (d >= 112.5 && d < 157.5) return 'SE';
    if (d >= 157.5 && d < 202.5) return 'S';
    if (d >= 202.5 && d < 247.5) return 'SW';
    if (d >= 247.5 && d < 292.5) return 'W';
    return 'NW';
  }, [rotationDegrees]);

  // Draw the minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Create the GTA V-style clipping path (polygon with angled top-right)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width - 40, 0);
    ctx.lineTo(width, 40);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.clip();

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid/terrain representation
    const gridSize = 20;
    const halfWorld = worldSize / 2;

    // Calculate offset based on player position
    const offsetX = (playerX / halfWorld) * (width / 2);
    const offsetZ = (playerZ / halfWorld) * (height / 2);

    ctx.strokeStyle = 'rgba(80, 80, 80, 0.4)';
    ctx.lineWidth = 1;

    // Vertical grid lines
    for (let i = -10; i <= 10; i++) {
      const x = width / 2 + i * gridSize - (offsetX % gridSize);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = -10; i <= 10; i++) {
      const y = height / 2 + i * gridSize - (offsetZ % gridSize);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw "roads" for visual interest
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.lineWidth = 2;

    const roadOffset = ((playerX + playerZ) * 0.1) % gridSize;

    ctx.beginPath();
    ctx.moveTo(0, height / 2 - roadOffset);
    ctx.lineTo(width, height / 2 - roadOffset);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width / 2 + roadOffset, 0);
    ctx.lineTo(width / 2 + roadOffset, height);
    ctx.stroke();

    ctx.restore();

    // Draw the border
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width - 40, 0);
    ctx.lineTo(width, 40);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.stroke();

    // Inner highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(width - 41, 1);
    ctx.lineTo(width - 1, 41);
    ctx.stroke();

    // Draw player indicator
    const centerX = width / 2;
    const centerY = height / 2;
    const arrowSize = 10;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotationDegrees * Math.PI) / 180);

    // Player arrow
    ctx.beginPath();
    ctx.moveTo(0, -arrowSize);
    ctx.lineTo(-arrowSize * 0.6, arrowSize * 0.6);
    ctx.lineTo(0, arrowSize * 0.2);
    ctx.lineTo(arrowSize * 0.6, arrowSize * 0.6);
    ctx.closePath();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    // Draw view cone
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotationDegrees * Math.PI) / 180);

    const coneLength = 35;
    const coneAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(-coneAngle) * coneLength, -Math.cos(-coneAngle) * coneLength);
    ctx.arc(0, 0, coneLength, -Math.PI / 2 - coneAngle, -Math.PI / 2 + coneAngle);
    ctx.closePath();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    ctx.restore();

  }, [playerX, playerZ, rotationDegrees, worldSize]);

  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-none">
      <div className="relative">
        {/* Canvas minimap */}
        <canvas
          ref={canvasRef}
          width={200}
          height={150}
          className="block"
          style={{
            clipPath: 'polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 0 100%)',
          }}
        />

        {/* Cardinal direction indicator */}
        <div
          className="absolute top-2 left-2 text-white font-bold text-xs"
          style={{
            textShadow: '0 0 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.9)',
          }}
        >
          {cardinalDirection}
        </div>

        {/* North indicator */}
        <div
          className="absolute top-2 right-12 text-xs font-bold"
          style={{
            color: cardinalDirection === 'N' ? '#ffffff' : 'rgba(255,255,255,0.5)',
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
          }}
        >
          N
        </div>

        {/* Health bar - GTA V style */}
        <div className="mt-1.5 relative">
          <div
            className="h-[5px] bg-black/80"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 100%, 0 100%)',
            }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${healthPercent}%`,
                background:
                  healthPercent > 50
                    ? 'linear-gradient(180deg, #86c06b 0%, #5a9340 100%)'
                    : healthPercent > 25
                    ? 'linear-gradient(180deg, #c9a227 0%, #8a6e1a 100%)'
                    : 'linear-gradient(180deg, #c04040 0%, #802020 100%)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default GTAMinimap;
