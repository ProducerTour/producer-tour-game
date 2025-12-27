# Patch 001: Avatar Position Fix

## Problem
Avatar feet were clipping through uneven terrain (sinking ~0.1m into the ground).

## Solution
Increased avatar Y offset from 0.1m to 0.2m in the MixamoAnimatedAvatar component.

## File Changed
`apps/frontend/src/components/play/avatars/MixamoAnimatedAvatar.tsx`

## Change
```tsx
// Line 816: Changed from
<primitive object={clonedScene} position={[0, 0.1, 0]} />

// To
<primitive object={clonedScene} position={[0, 0.2, 0]} />
```

## Testing
1. Walk on hilly terrain
2. Check feet don't clip through ground
3. Verify character doesn't appear to float unnaturally
