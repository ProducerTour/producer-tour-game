# Character Creator System

A custom 3D character creation system designed as a foundation for a "digital identity platform" with persistent avatars across experiences - similar to Ready Player Me but fully customizable.

## Overview

The character creator allows users to customize their 3D avatar with body type, skin tone, facial features, and hair styles. Configurations are saved to the cloud and sync across the Play experience and multiplayer.

## Current Status

### Completed (MVP)

| Phase | Feature | Status |
|-------|---------|--------|
| A | Database schema (UserAvatar model) | Done |
| A | Backend API routes & service | Done |
| A | Frontend API integration | Done |
| A | React Query hooks | Done |
| B | Base mesh export with morph targets | Done |
| B | Morph target utilities (morphUtils.ts) | Done |
| B | CustomizableAvatar component | Done |
| B | CustomAvatar for gameplay | Done |
| C | AI selfie analysis (GPT-4V) | Done |
| C | Real selfie-to-avatar flow | Done |
| D | Character creator page & UI | Done |
| D | Play menu integration | Done |
| D | Settings page integration | Done |
| - | Hair attachment system (12 styles) | Done |
| - | MB-Lab base meshes with morph targets | Done (Dec 27) |
| **E** | **Multiplayer avatar sync** | **Done** |
| **NEW** | **Extended face morphs (18 additional)** | **Done (Dec 27)** |

### Pending

| Phase | Feature | Status |
|-------|---------|--------|
| - | Higher-quality hair models (CC0) | Pending |
| - | Face preset pre-baked meshes | Pending |
| - | Avatar armature/rigging improvements | Pending |

## Architecture

### File Structure

```
apps/
├── backend/
│   ├── prisma/schema.prisma          # UserAvatar model
│   └── src/
│       ├── routes/avatar.routes.ts   # API endpoints
│       └── services/avatar.service.ts # Business logic
│
└── frontend/
    ├── public/assets/avatars/
    │   ├── base_male.glb             # Male base mesh (~4 MB)
    │   └── base_female.glb           # Female base mesh (~4 MB)
    │
    └── src/
        ├── pages/
        │   └── CharacterCreatorPage.tsx
        │
        ├── components/
        │   ├── character-creator/
        │   │   ├── index.ts              # Barrel exports
        │   │   ├── CharacterPreview3D.tsx    # 3D canvas with avatar
        │   │   ├── CustomizableAvatar.tsx    # Avatar for creator preview
        │   │   ├── HairAttachment.tsx        # Dynamic hair attachment
        │   │   ├── CreatorModeTabs.tsx       # Customize | Selfie toggle
        │   │   ├── CategoryTabs.tsx          # Body | Face | Hair
        │   │   ├── CustomizationPanel.tsx    # Panel container
        │   │   ├── SelfiePanel.tsx           # Camera/upload UI
        │   │   ├── GenerationProgress.tsx    # AI progress overlay
        │   │   ├── panels/
        │   │   │   ├── BodyPanel.tsx         # Body type, skin, height
        │   │   │   ├── FacePanel.tsx         # Face presets & morphs
        │   │   │   └── HairPanel.tsx         # Hair styles & colors
        │   │   └── controls/
        │   │       ├── SliderControl.tsx     # Radix slider
        │   │       ├── ColorPicker.tsx       # Color palette
        │   │       ├── SkinTonePicker.tsx    # Skin tone grid
        │   │       └── PresetGrid.tsx        # Selectable grid
        │   │
        │   └── play/avatars/
        │       └── CustomAvatar.tsx      # Gameplay avatar with animations
        │
        ├── stores/
        │   └── characterCreator.store.ts # Zustand store
        │
        ├── hooks/
        │   └── useAvatar.ts              # React Query hooks
        │
        └── lib/character/
            ├── types.ts                  # CharacterConfig type
            ├── defaults.ts               # Presets & palettes
            └── morphUtils.ts             # Morph target utilities
```

### Data Model

```typescript
interface CharacterConfig {
  version: number;
  bodyType: 'male' | 'female' | 'neutral';

  // Body
  skinTone: string;           // Hex color
  height: number;             // 0.0-1.0 (maps to 1.55m-1.95m)
  build: 'slim' | 'average' | 'athletic' | 'heavy';

  // Face - Basic
  facePreset: number;         // 1-6
  eyeSize: number;            // -1 to 1
  eyeSpacing: number;         // -1 to 1
  noseWidth: number;          // -1 to 1
  noseLength: number;         // -1 to 1
  jawWidth: number;           // -1 to 1
  chinLength: number;         // -1 to 1
  lipFullness: number;        // -1 to 1
  cheekboneHeight: number;    // -1 to 1

  // Face - Extended (RPM-like detail)
  eyeTilt: number;            // -1 to 1
  eyeDepth: number;           // -1 to 1
  upperEyelid: number;        // -1 to 1
  lowerEyelid: number;        // -1 to 1
  eyebrowHeight: number;      // -1 to 1
  eyebrowArch: number;        // -1 to 1
  noseBridge: number;         // -1 to 1
  noseTip: number;            // -1 to 1
  nostrilFlare: number;       // -1 to 1
  noseProfile: number;        // -1 to 1
  mouthWidth: number;         // -1 to 1
  upperLipSize: number;       // -1 to 1
  lowerLipSize: number;       // -1 to 1
  mouthCorners: number;       // -1 to 1
  chinProtrusion: number;     // -1 to 1
  chinCleft: number;          // 0 to 1
  faceLength: number;         // -1 to 1
  foreheadHeight: number;     // -1 to 1

  // Hair
  hairStyleId: string | null;
  hairColor: string;          // Hex color
  hairHighlightColor?: string;

  // Eyes
  eyeColor: string;           // Hex color

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

### Morph Targets (29 total)

**Face Morphs - Basic (8):**
- `EyeSize`, `EyeSpacing`
- `NoseWidth`, `NoseLength`
- `JawWidth`, `ChinLength`
- `LipFullness`, `CheekboneHeight`

**Face Morphs - Extended (18):**
- Eyes: `EyeTilt`, `EyeDepth`, `UpperEyelid`, `LowerEyelid`
- Eyebrows: `EyebrowHeight`, `EyebrowArch`
- Nose: `NoseBridge`, `NoseTip`, `NostrilFlare`, `NoseProfile`
- Mouth: `MouthWidth`, `UpperLipSize`, `LowerLipSize`, `MouthCorners`
- Jaw/Face: `ChinProtrusion`, `ChinCleft`, `FaceLength`, `ForeheadHeight`

**Body Morphs (3):**
- `Build_Slim`, `Build_Athletic`, `Build_Heavy`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/avatar/config` | Get current user's avatar config |
| PUT | `/api/avatar/config` | Save avatar config |
| DELETE | `/api/avatar/config` | Delete avatar config |
| GET | `/api/avatar/player/:userId` | Get another player's avatar |
| POST | `/api/avatar/players` | Batch get player configs |

## Multiplayer Sync (Complete)

The system already syncs custom avatars across multiplayer:

```typescript
// usePlayMultiplayer.ts - sends avatarConfig on join
socket.emit('3d:join', {
  username,
  color,
  avatarConfig,  // CharacterConfig sent to server
});

// OtherPlayers.tsx - renders CustomAvatar for remote players
if (player.avatarConfig) {
  return <CustomAvatar config={player.avatarConfig} ... />
}

// socket/index.ts - server stores and broadcasts
avatarConfig: data.avatarConfig,  // Stored per player
```

## Entry Points

1. **Direct URL**: `/character-creator`
2. **Play Menu**: Pause game → "Customize Character" button
3. **Settings**: Settings → "3D Avatar" section → "Open Character Creator"

## Hair Styles (12 total)

Located in `/public/models/Characters/Hair/`:
- `bald` (no model), `buzzcut`, `short_fade`, `short_textured`
- `curly_short`, `medium_wavy`, `medium_straight`, `afro_medium`
- `long_straight`, `long_wavy`, `ponytail`, `braids`, `mohawk`

**Note:** Current hair models are procedurally generated placeholders. Quality CC0 models can be sourced from:
- [Quaternius Ultimate Modular Characters](https://quaternius.com/packs/ultimatemodularcharacters.html) (CC0)
- [Sketchfab CC0 Hair Models](https://sketchfab.com/tags/lowpoly-hair)

## Zustand Store Features

- **Undo/Redo**: 50-state history with Ctrl+Z / Ctrl+Y
- **Auto-save**: LocalStorage persistence during editing
- **Cloud sync**: Save to server via API
- **Dirty tracking**: Warn on unsaved changes
- **Randomize**: Generate random configurations

## Color Palettes

### Skin Tones (12 options)
```
#FFE0BD, #FFCD94, #EAC086, #DFAD69,
#D09B5C, #C68642, #B07B47, #A66E3D,
#8D5524, #6B4423, #4A3021, #3B2417
```

### Hair Colors (16 options)
Natural: Black, Dark Brown, Brown, Light Brown, Blonde, Platinum, Ginger, Auburn, Gray, White
Fashion: Purple, Blue, Pink, Red, Green, Teal

### Eye Colors (8 options)
Brown, Dark Brown, Hazel, Green, Blue, Gray, Amber, Black

## Next Steps

### Phase F: Hair Assets (Next Priority)

1. Download Quaternius Ultimate Modular Characters (CC0)
2. Process 12 hair styles in Blender:
   - Import → Clean up → Optimize → Export
3. Replace placeholder GLBs in `/public/models/Characters/Hair/`
4. Test each style in character creator

### Future Improvements

1. **Face preset meshes** - Pre-bake 6 distinct face shapes for better variety
2. **Clothing system** - Add shirt/pants/shoes attachment points
3. **Animation blending** - Smooth transitions between idle/walk/run
4. **Cross-game export** - RPM-style avatar export for other games

## Blender Workflow for Hair Assets

### Requirements
- Single mesh object (no hierarchy)
- No bones/armature (attached dynamically to Head bone)
- Under 5,000 triangles
- Material named "Hair" (tintable)
- Origin at hair attachment point (top of head)
- GLB format under 500KB

### Export Settings
```
File > Export > glTF 2.0 (.glb)
- Format: glTF Binary (.glb)
- Include: Selected Objects only
- Transform: +Y Up
- Geometry: Apply Modifiers, UVs, Normals
```
