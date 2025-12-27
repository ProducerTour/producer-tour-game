/**
 * Death Overlay HUD
 * Shows "YOU DIED" screen with respawn countdown
 */

import { useCombatStore } from '../combat/useCombatStore';

export function DeathOverlay() {
  const isDead = useCombatStore((s) => s.isDead);
  const respawnTimer = useCombatStore((s) => s.respawnTimer);

  if (!isDead) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(139, 0, 0, 0.6)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: '#ff3333',
            textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.5)',
            margin: 0,
            letterSpacing: '8px',
            animation: 'pulse 1s ease-in-out infinite',
          }}
        >
          YOU DIED
        </h1>
        <p
          style={{
            fontSize: '24px',
            color: '#ffffff',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            marginTop: '24px',
          }}
        >
          Respawning in {respawnTimer}...
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

export default DeathOverlay;
