/**
 * VFX Manager Component
 * Renders all active visual effects
 */

import { useVFXStore } from './useVFXStore';
import { VFXRenderer } from './ParticleEffects';

export function VFXManager() {
  const { effects, isEnabled } = useVFXStore();

  if (!isEnabled) return null;

  return (
    <group name="VFXManager">
      {effects.map((effect) => (
        <VFXRenderer key={effect.id} effect={effect} />
      ))}
    </group>
  );
}

export default VFXManager;
