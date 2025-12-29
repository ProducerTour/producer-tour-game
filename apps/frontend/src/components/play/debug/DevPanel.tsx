/**
 * Dev Panel Component
 * Quick access floating panel for dev controls
 * Toggle with F1 key
 */

import { useState, useEffect } from 'react';
import { useDevStore } from './useDevStore';
import { useCombatStore } from '../combat/useCombatStore';

export function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const devStore = useDevStore();
  const combatStore = useCombatStore();

  // Toggle panel with F2 key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 right-4 z-40 bg-gray-900/95 border border-gray-700 rounded-lg p-4 font-mono text-sm w-64 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-green-400 font-bold">Dev Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          X
        </button>
      </div>

      {/* Cheats Section */}
      <div className="mb-4">
        <h4 className="text-gray-400 text-xs uppercase mb-2">Cheats</h4>
        <div className="space-y-2">
          <ToggleButton
            label="God Mode"
            active={devStore.godMode}
            onClick={devStore.toggleGodMode}
            hotkey="G"
          />
          <ToggleButton
            label="Noclip"
            active={devStore.noclip}
            onClick={devStore.toggleNoclip}
            hotkey="N"
          />
          <ToggleButton
            label="Unlimited Ammo"
            active={devStore.unlimitedAmmo}
            onClick={devStore.toggleUnlimitedAmmo}
            hotkey="U"
          />
        </div>
      </div>

      {/* Debug Visuals */}
      <div className="mb-4">
        <h4 className="text-gray-400 text-xs uppercase mb-2">Debug Visuals</h4>
        <div className="space-y-2">
          <ToggleButton
            label="Hitboxes"
            active={devStore.showHitboxes}
            onClick={devStore.toggleHitboxes}
          />
          <ToggleButton
            label="Wireframe"
            active={devStore.showWireframe}
            onClick={() => {
              devStore.toggleWireframe();
              window.dispatchEvent(new CustomEvent('devConsole:wireframe', {
                detail: { enabled: !devStore.showWireframe }
              }));
            }}
          />
          <ToggleButton
            label="Colliders"
            active={devStore.showColliders}
            onClick={() => {
              devStore.toggleColliders();
              window.dispatchEvent(new CustomEvent('devConsole:colliders', {
                detail: { enabled: !devStore.showColliders }
              }));
            }}
          />
          <ToggleButton
            label="Stats"
            active={devStore.showStats}
            onClick={devStore.toggleStats}
          />
        </div>
      </div>

      {/* Speed Controls */}
      <div className="mb-4">
        <h4 className="text-gray-400 text-xs uppercase mb-2">Speed: {devStore.speedMultiplier}x</h4>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={devStore.speedMultiplier}
          onChange={(e) => devStore.setSpeedMultiplier(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Time Scale */}
      <div className="mb-4">
        <h4 className="text-gray-400 text-xs uppercase mb-2">Time: {devStore.timeScale}x</h4>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={devStore.timeScale}
          onChange={(e) => {
            const scale = parseFloat(e.target.value);
            devStore.setTimeScale(scale);
            window.dispatchEvent(new CustomEvent('devConsole:timescale', { detail: { scale } }));
          }}
          className="w-full"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-4">
        <h4 className="text-gray-400 text-xs uppercase mb-2">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            label="Full Heal"
            onClick={() => combatStore.setPlayerHealth(combatStore.playerMaxHealth)}
          />
          <ActionButton
            label="Max Ammo"
            onClick={() => {
              useCombatStore.setState({
                ammo: { rifle: 999, pistol: 999 }
              });
            }}
          />
          <ActionButton
            label="Give Rifle"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('devConsole:weapon', { detail: { weapon: 'rifle' } }));
            }}
          />
          <ActionButton
            label="Reset"
            onClick={() => {
              devStore.reset();
              combatStore.reset();
            }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="border-t border-gray-700 pt-2 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Health:</span>
          <span className="text-white">{combatStore.playerHealth}/{combatStore.playerMaxHealth}</span>
        </div>
        <div className="flex justify-between">
          <span>Weapon:</span>
          <span className="text-white">{combatStore.currentWeapon}</span>
        </div>
        <div className="flex justify-between">
          <span>Press ` for console</span>
        </div>
      </div>
    </div>
  );
}

// Toggle button component
function ToggleButton({
  label,
  active,
  onClick,
  hotkey,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  hotkey?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors ${
        active
          ? 'bg-green-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs opacity-60">
        {active ? 'ON' : 'OFF'}
        {hotkey && ` (${hotkey})`}
      </span>
    </button>
  );
}

// Action button component
function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
    >
      {label}
    </button>
  );
}

export default DevPanel;
