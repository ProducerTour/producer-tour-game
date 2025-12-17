/**
 * Ammo Display Component
 * HUD overlay showing current weapon ammo
 */

import { useCombatStore } from '../combat/useCombatStore';

export function AmmoDisplay() {
  const { currentWeapon, ammo, isReloading } = useCombatStore();

  if (currentWeapon === 'none') return null;

  const currentAmmo = ammo[currentWeapon] || 0;

  return (
    <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
      <div className="relative bg-black/80 rounded-lg border border-gray-700 p-3">
        {/* Weapon name */}
        <div className="text-xs text-gray-400 uppercase mb-1">{currentWeapon}</div>

        {/* Ammo count */}
        <div className="text-3xl font-bold text-white font-mono">
          {isReloading ? (
            <span className="text-yellow-400 animate-pulse">RELOADING...</span>
          ) : (
            <>
              <span className={currentAmmo <= 5 ? 'text-red-400' : 'text-white'}>
                {currentAmmo}
              </span>
              <span className="text-gray-500 text-lg"> / {
                currentWeapon === 'rifle' ? 30 : 12
              }</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AmmoDisplay;
