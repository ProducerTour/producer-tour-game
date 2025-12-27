# Patch 003: Rock and Tree Collision

## Problem
Rocks and trees were visual-only - player could walk through them.

## Solution
Added Rapier physics colliders to boulders and tree trunks.

## Files Changed

### 1. ChunkRocks.tsx

**Added import:**
```tsx
import { RigidBody, CylinderCollider } from '@react-three/rapier';
```

**Modified render (lines 250-290):**
- Boulders (scale >= 0.06) now wrapped in RigidBody with CylinderCollider
- Small sand pebbles (scale < 0.06) skip collision for performance
- Collider sized to 70% of visual for better gameplay feel

### 2. ChunkTrees.tsx

**Added import:**
```tsx
import { RigidBody, CylinderCollider } from '@react-three/rapier';
```

**Modified render (lines 294-329):**
- Trees wrapped in RigidBody with trunk-only CylinderCollider
- Trunk radius: 0.4 * scale (smaller than visual for gameplay)
- Trunk height: 2.5 * scale (just trunk, not full tree)
- Player can walk under tree canopy

## Performance Notes
- `type="fixed"` rigid bodies are extremely cheap (no physics simulation)
- Small rocks skip collision entirely
- CylinderCollider is simpler than convex hull = better performance
- Rapier handles hundreds of static colliders efficiently

## Testing
1. Walk into boulders - should be blocked
2. Walk into tree trunks - should be blocked
3. Walk through tiny sand pebbles - should pass through
4. Walk under tree branches - should work (trunk-only collision)
5. Monitor FPS in dense forest areas
