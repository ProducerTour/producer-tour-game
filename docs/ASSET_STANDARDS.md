# Asset Standards & Technical Art Direction

This document establishes asset acceptance criteria, naming conventions, and validation requirements for the web-based multiplayer game.

## Quick Reference

| Asset Type | Format | Max Size | Key Requirements |
|------------|--------|----------|------------------|
| Characters | GLB | 5MB | 1 unit = 1m, feet at origin, +Z forward |
| Animations | GLB | 500KB | No scale tracks, no root motion (except crouch) |
| Textures | PNG/JPG | 2048px | sRGB for color, Linear for data maps |
| LOD Models | GLB | Varies | Named `{name}_lod{0-3}.glb` |

---

## 1. GLB Model Requirements

### Character Models

| Requirement | Specification | Why |
|-------------|---------------|-----|
| **Unit Scale** | 1 unit = 1 meter | Physics and collision consistency |
| **Pivot Point** | Feet at origin (0, 0, 0) | Ground placement without offset |
| **Forward Direction** | +Z forward, +Y up | Three.js coordinate system |
| **Bone Naming** | No prefix (not `mixamorig:`) | Animation retargeting compatibility |
| **Max Triangles** | 50,000 for characters | WebGPU performance |
| **Materials** | PBR (MeshStandardMaterial) | Three.js compatibility |

### Validation Checklist

```
[ ] Bounding box min.y is approximately 0 (feet at origin)
[ ] Height is 1.5-2.0 meters for humanoid characters
[ ] No bones with `mixamorig:` or `mixamorig` prefix
[ ] No bones with `_1` suffix (dual skeleton issue)
[ ] Materials use standard PBR workflow
[ ] File size under 5MB for characters
```

---

## 2. Animation Requirements

### General Rules

| Requirement | Specification | Notes |
|-------------|---------------|-------|
| **Format** | GLB | Pre-converted from Mixamo FBX |
| **Frame Rate** | 30 FPS | Mixamo default |
| **Scale Tracks** | REMOVED | Prevents character stretching |
| **Root Motion** | REMOVED | Prevents character drift |
| **Bone Prefix** | None | Strip `mixamorig:` before export |

### Root Motion Exceptions

These animations MUST preserve Hips Y-position for proper lowering effect:

- `crouch_idle`, `crouch_walk`, `crouch_strafe_*`
- `stand_to_crouch`, `crouch_to_stand`
- All `rifle_crouch_*` and `pistol_crouch_*` variants
- `kneel_*`, `prone_*` animations

### Animation Track Rules

```
REMOVE: *.scale tracks (all bones)
REMOVE: Hips.position.x tracks
REMOVE: Hips.position.z tracks
KEEP:   Hips.position.y (ONLY for crouch/kneel/prone animations)
KEEP:   *.quaternion tracks (all rotations)
```

---

## 3. Folder Structure

```
public/assets/
├── animations/
│   ├── locomotion/           # Unarmed movement
│   │   ├── idle.glb
│   │   ├── walk.glb
│   │   ├── run.glb
│   │   ├── jump.glb
│   │   ├── crouch_idle.glb
│   │   ├── crouch_walk.glb
│   │   ├── strafe_left_run.glb
│   │   ├── strafe_right_run.glb
│   │   └── turn_{left|right}.glb
│   │
│   ├── rifle/                # Primary weapon
│   │   ├── rifle_idle.glb
│   │   ├── rifle_aim_idle.glb
│   │   ├── rifle_{walk|run|sprint}_{fwd|back|left|right}.glb
│   │   ├── rifle_crouch_{idle|walk|strafe_left|strafe_right}.glb
│   │   ├── rifle_jump_{up|loop|down}.glb
│   │   └── rifle_death_{front|back|right|headshot}.glb
│   │
│   └── pistol/               # Secondary weapon
│       ├── pistol_idle.glb
│       ├── pistol_{walk|run}_{fwd|back|left|right}.glb
│       └── pistol_crouch_{idle|walk}.glb
│
├── avatars/
│   ├── base_{male|female}.glb
│   └── hair/{style_name}.glb
│
├── models/
│   ├── weapons/{weapon_name}/
│   ├── foliage/trees/{tree_type}_lod{0-3}.glb
│   └── props/{prop_name}.glb
│
└── textures/
    └── terrain/{material_name}/
        ├── {name}_Color.png
        ├── {name}_Normal.png
        ├── {name}_Roughness.png
        └── {name}_AO.png
```

---

## 4. Naming Conventions

### Animation Files

Pattern: `{weapon}_{action}_{direction}.glb`

| Component | Options | Examples |
|-----------|---------|----------|
| weapon | (none), rifle, pistol | `walk.glb`, `rifle_walk.glb` |
| action | idle, walk, run, sprint, crouch, jump, fire, death | |
| direction | fwd, back, left, right, up, down, loop | |

Examples:
- `rifle_walk_fwd.glb` - Rifle equipped, walking forward
- `pistol_run_back.glb` - Pistol equipped, running backward
- `crouch_strafe_left.glb` - Unarmed, crouching, strafing left

### LOD Models

Pattern: `{name}_lod{level}.glb`

| Level | Distance | Triangles | Use |
|-------|----------|-----------|-----|
| lod0 | 0-30m | 100% | Close-up |
| lod1 | 30-60m | 40% | Medium |
| lod2 | 60-100m | 15% | Far |
| lod3 | 100m+ | Billboard | Very far |

### Textures

Pattern: `{name}_{mapType}.{ext}`

| Map Type | Color Space | Bits | Notes |
|----------|-------------|------|-------|
| Color / BaseColor | sRGB | 8 | Albedo/diffuse |
| Normal | Linear | 8 | OpenGL format (+Y up) |
| Roughness | Linear | 8 | Grayscale |
| Metallic | Linear | 8 | Grayscale |
| AO | Linear | 8 | Ambient occlusion |
| Emissive | sRGB | 8 | Optional glow |

---

## 5. Mixamo Export Workflow

### Step 1: Download from Mixamo

1. Select character or animation
2. Download as FBX (.fbx)
3. Settings: FBX Binary, With Skin (for characters)

### Step 2: Prepare in Blender

1. Import FBX file
2. Run `mixamo_export_prep.py` script (see `tools/blender/`)
3. Script automatically:
   - Strips `mixamorig:` prefix from bones
   - Removes all scale tracks
   - Removes root motion (preserves Y for crouch)
   - Applies -90° X rotation for +Z forward
   - Validates bone hierarchy

### Step 3: Export as GLB

Export settings:
- Format: GLB
- Apply Transform: **ENABLED**
- Animation: Include (for animated assets)
- Compression: DRACO (optional, for size)

### Step 4: Validate

```bash
npm run validate:assets -- public/assets/your_file.glb
```

---

## 6. Common Issues & Fixes

### Character Stretching

**Symptom**: Limbs elongate randomly during animation
**Cause**: Scale tracks in animation clips
**Fix**: Remove all `.scale` tracks in Blender before export

### T-Pose / Animation Not Playing

**Symptom**: Character stuck in T-pose
**Cause**: Bone name mismatch between model and animation
**Fix**: Ensure bone names match (strip all `mixamorig` prefixes)

### Character Facing Wrong Direction

**Symptom**: Character walks sideways
**Cause**: Model exported with -Y forward
**Fix**: Apply -90° X rotation before export

### Floating Feet in Crouch

**Symptom**: Character crouches but feet stay at standing height
**Cause**: Hips Y-position stripped from crouch animation
**Fix**: Preserve Hips Y-position for crouch/kneel/prone animations

### Character Drifts During Loop

**Symptom**: Character slowly slides across ground
**Cause**: Hips XZ position not stripped
**Fix**: Remove Hips X/Z position tracks (keep only Y for crouch)

### Half-Invisible Character

**Symptom**: Body parts disappear
**Cause**: Dual skeleton export (bones with `_1` suffix)
**Fix**: Remove duplicate armature in Blender before export

---

## 7. Automated Validation

### Local Validation

```bash
# Validate all assets
npm run validate:assets

# Validate specific file
npm run validate:assets -- public/assets/animations/rifle/rifle_idle.glb

# Validate directory
npm run validate:assets -- public/assets/animations/
```

### CI Pipeline

Asset validation runs automatically on PRs that modify:
- `public/assets/**`
- `public/models/**`

Validation failures block merge.

### Validation Checks

| Check | Severity | Description |
|-------|----------|-------------|
| Scale | Error | Height must be 0.5-3.0m |
| Pivot | Warning | min.y should be ~0 |
| Bone Names | Warning | mixamorig prefix detected |
| Scale Tracks | Error | .scale tracks found |
| File Size | Warning | Animation > 500KB |
| Dual Skeleton | Error | _1 suffix bones found |

---

## 8. Performance Guidelines

### Triangle Budgets

| Asset Type | Max Triangles | Notes |
|------------|---------------|-------|
| Player Character | 50,000 | Includes clothing/accessories |
| NPC | 30,000 | Shared across instances |
| Weapon | 10,000 | Attached to hand bone |
| Tree (LOD0) | 5,000 | Per tree type |
| Prop | 2,000 | General objects |

### Texture Budgets

| Asset Type | Max Resolution | Format |
|------------|----------------|--------|
| Character | 2048x2048 | PNG |
| Weapon | 1024x1024 | PNG |
| Environment | 2048x2048 | JPG (color), PNG (data) |
| UI Elements | 512x512 | PNG |

### Memory Considerations

- Characters share animation clips via AnimationClipPool
- LOD system reduces draw calls at distance
- Textures should use power-of-2 dimensions
- Consider compressed formats (DRACO, KTX2) for large assets

---

## 9. Tools Reference

### Blender Scripts

Located in `tools/blender/`:

| Script | Purpose |
|--------|---------|
| `mixamo_export_prep.py` | Prepare Mixamo assets for export |

### npm Scripts

| Command | Purpose |
|---------|---------|
| `npm run validate:assets` | Run asset validation |
| `npm run validate:assets -- <path>` | Validate specific file/directory |

### VS Code Extensions (Recommended)

- **glTF Tools** - Preview and validate GLB/GLTF files
- **Shader Toy** - Preview shader code
- **Three.js Snippets** - Code completion for Three.js

---

## Changelog

| Date | Change |
|------|--------|
| 2024-12-30 | Initial documentation |
