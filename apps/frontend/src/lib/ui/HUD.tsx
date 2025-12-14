// HUD Component - Game heads-up display
import { useQuestStore } from '../quest/questStore';

interface HUDProps {
  health?: number;
  maxHealth?: number;
  stamina?: number;
  maxStamina?: number;
  currency?: number;
  showMinimap?: boolean;
  playerPosition?: { x: number; z: number };
  onMenuClick?: () => void;
  className?: string;
}

// Progress Bar Component
function ProgressBar({
  value,
  max,
  color,
  backgroundColor = 'rgba(0, 0, 0, 0.5)',
  height = 8,
  width = 200,
  showText = false,
  label,
}: {
  value: number;
  max: number;
  color: string;
  backgroundColor?: string;
  height?: number;
  width?: number;
  showText?: boolean;
  label?: string;
}) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && (
        <span style={{ color: 'white', fontSize: 12, minWidth: 50 }}>{label}</span>
      )}
      <div
        style={{
          width,
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: height / 2,
            transition: 'width 0.2s ease-out',
          }}
        />
        {showText && (
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 10,
              color: 'white',
              textShadow: '0 0 2px black',
            }}
          >
            {Math.round(value)}/{max}
          </span>
        )}
      </div>
    </div>
  );
}

// Minimap Component
function Minimap({
  playerPosition,
  size = 150,
}: {
  playerPosition: { x: number; z: number };
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '50%',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Grid lines */}
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 20}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 40}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
        <line
          x1={size / 2}
          y1={0}
          x2={size / 2}
          y2={size}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
        <line
          x1={0}
          y1={size / 2}
          x2={size}
          y2={size / 2}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />
      </svg>

      {/* Player marker */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 12,
          height: 12,
        }}
      >
        <svg width={12} height={12} viewBox="0 0 12 12">
          <polygon
            points="6,0 12,12 6,9 0,12"
            fill="rgba(100, 200, 255, 1)"
            stroke="white"
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* Coordinates */}
      <div
        style={{
          position: 'absolute',
          bottom: 5,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 9,
          color: 'rgba(255, 255, 255, 0.6)',
          whiteSpace: 'nowrap',
        }}
      >
        {Math.round(playerPosition.x)}, {Math.round(playerPosition.z)}
      </div>
    </div>
  );
}

// Quest Objective Display
function QuestObjectiveHUD() {
  const trackedQuest = useQuestStore((state) => state.getTrackedQuest());

  if (!trackedQuest) return null;

  const currentObjective = trackedQuest.objectives.find((o) => !o.completed);

  return (
    <div
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: '12px 16px',
        borderRadius: 8,
        borderLeft: '3px solid rgba(255, 200, 50, 0.8)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'rgba(255, 200, 50, 0.9)',
          marginBottom: 4,
          fontWeight: 'bold',
        }}
      >
        {trackedQuest.title}
      </div>
      {currentObjective && (
        <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)' }}>
          {currentObjective.description}
          {currentObjective.required > 1 && (
            <span style={{ marginLeft: 8, color: 'rgba(255, 255, 255, 0.6)' }}>
              ({currentObjective.current}/{currentObjective.required})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Main HUD Component
export function HUD({
  health = 100,
  maxHealth = 100,
  stamina = 100,
  maxStamina = 100,
  currency = 0,
  showMinimap = true,
  playerPosition = { x: 0, z: 0 },
  onMenuClick,
  className = '',
}: HUDProps) {
  return (
    <div
      className={`game-hud ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 100,
      }}
    >
      {/* Top Left - Health & Stamina */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <ProgressBar
          value={health}
          max={maxHealth}
          color="#e74c3c"
          label="HP"
          width={180}
          height={10}
          showText
        />
        <ProgressBar
          value={stamina}
          max={maxStamina}
          color="#2ecc71"
          label="SP"
          width={180}
          height={6}
        />
      </div>

      {/* Top Right - Menu & Currency */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Currency */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 12px',
            borderRadius: 20,
          }}
        >
          <span style={{ fontSize: 16 }}>💰</span>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
            {currency.toLocaleString()}
          </span>
        </div>

        {/* Menu Button */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            style={{
              pointerEvents: 'auto',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ☰
          </button>
        )}
      </div>

      {/* Top Center - Quest Objective */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <QuestObjectiveHUD />
      </div>

      {/* Bottom Right - Minimap */}
      {showMinimap && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
          }}
        >
          <Minimap playerPosition={playerPosition} />
        </div>
      )}

      {/* Bottom Center - Interaction Hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        {/* Interaction hints would be shown here dynamically */}
      </div>
    </div>
  );
}

// Interaction Hint Component
export function InteractionHint({
  text,
  keyHint = 'E',
  visible = true,
}: {
  text: string;
  keyHint?: string;
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px 16px',
        borderRadius: 8,
        zIndex: 100,
      }}
    >
      <span
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          padding: '4px 10px',
          borderRadius: 4,
          color: 'white',
          fontWeight: 'bold',
          fontSize: 14,
          fontFamily: 'monospace',
        }}
      >
        {keyHint}
      </span>
      <span style={{ color: 'white', fontSize: 14 }}>{text}</span>
    </div>
  );
}

// Notification Toast
export function NotificationToast({
  message,
  type = 'info',
  onClose,
}: {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
}) {
  const colors = {
    info: '#3498db',
    success: '#2ecc71',
    warning: '#f1c40f',
    error: '#e74c3c',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderLeft: `4px solid ${colors[type]}`,
        padding: '12px 16px',
        borderRadius: 8,
        color: 'white',
        fontSize: 14,
        maxWidth: 300,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 200,
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            fontSize: 18,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
