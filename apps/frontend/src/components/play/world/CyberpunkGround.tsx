import { useMemo, useEffect } from 'react';
import { Grid, useTexture } from '@react-three/drei';
import { useControls, folder } from 'leva';
import * as THREE from 'three';

// Assets URL - load from CDN in production, local in development
const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || '';

// Check if textures should load from local public/textures/ folder
// Set VITE_TEXTURES_LOCAL=true in .env to test local texture files
const TEXTURES_LOCAL = import.meta.env.VITE_TEXTURES_LOCAL === 'true';

// Helper to get texture path with dev/prod switching
function getLocalTexturePath(path: string): string {
  // Use local path if VITE_TEXTURES_LOCAL=true, otherwise use CDN if available
  if (TEXTURES_LOCAL) {
    return `/textures/${path}`;
  }
  return ASSETS_URL ? `${ASSETS_URL}/textures/${path}` : `/textures/${path}`;
}

// PBR texture sets - supports ambientCG naming convention
// Expected naming: {name}_Color.png, {name}_NormalGL.png, {name}_Roughness.png, {name}_AmbientOcclusion.png
// Note: These textures must be uploaded to CDN for production use
const PBR_TEXTURE_SETS = {
  procedural: null, // Use procedural texture (dark asphalt)
  grass: getLocalTexturePath('ground/Grass004_1K-PNG'), // ambientCG grass
  concrete: getLocalTexturePath('terrain/Concrete011_1K-PNG/Concrete011_1K-PNG'), // ambientCG concrete
  road: getLocalTexturePath('terrain/Road003_1K-PNG/Road003_1K-PNG'), // ambientCG road (no AO map)
} as const;

type TextureSetKey = keyof typeof PBR_TEXTURE_SETS;

// Generate procedural concrete texture (fallback)
function createConcreteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base concrete color - dark asphalt
  ctx.fillStyle = '#1a1a22';
  ctx.fillRect(0, 0, 512, 512);

  // Add noise for texture variation
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);

  // Add some cracks and lines
  ctx.strokeStyle = 'rgba(30, 30, 40, 0.3)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);

    let x = startX;
    let y = startY;
    for (let j = 0; j < 8; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Subtle concrete slabs (expansion joints)
  ctx.strokeStyle = 'rgba(40, 40, 50, 0.5)';
  ctx.lineWidth = 2;

  for (let y = 128; y < 512; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 4);
    ctx.lineTo(512, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  for (let x = 128; x < 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() - 0.5) * 4, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Generate procedural normal map
function createProceduralNormalMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Neutral normal (pointing up) - RGB(128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 512, 512);

  // Add subtle variations
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noiseR = (Math.random() - 0.5) * 10;
    const noiseG = (Math.random() - 0.5) * 10;
    data[i] = Math.min(255, Math.max(0, data[i] + noiseR));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noiseG));
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export interface CyberpunkGroundProps {
  size?: number;
}

// Texture sets that have AO maps - others will skip AO loading
const TEXTURE_SETS_WITH_AO = ['grass', 'concrete'];

// PBR Ground component that loads texture maps
function PBRGround({
  basePath,
  textureKey,
  size,
  repeatX,
  repeatY,
  offsetX,
  offsetY,
  rotation,
  roughnessValue,
  metalnessValue,
  normalScale,
  aoIntensity,
  colorTint,
  envMapIntensity,
}: {
  basePath: string;
  textureKey: string;
  size: number;
  repeatX: number;
  repeatY: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  roughnessValue: number;
  metalnessValue: number;
  normalScale: number;
  aoIntensity: number;
  colorTint: string;
  envMapIntensity: number;
}) {
  const hasAO = TEXTURE_SETS_WITH_AO.includes(textureKey);

  // Load PBR texture maps - ambientCG naming convention
  // Some textures (like Road003) don't have AO maps
  const textureConfig: Record<string, string> = {
    map: `${basePath}_Color.png`,
    normalMap: `${basePath}_NormalGL.png`,
    roughnessMap: `${basePath}_Roughness.png`,
  };
  if (hasAO) {
    textureConfig.aoMap = `${basePath}_AmbientOcclusion.png`;
  }

  const textures = useTexture(textureConfig) as Record<string, THREE.Texture>;

  // Configure texture repeating, offset, and rotation
  useEffect(() => {
    Object.values(textures).forEach((texture) => {
      if (texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        texture.offset.set(offsetX, offsetY);
        texture.rotation = rotation * (Math.PI / 180); // Convert degrees to radians
        texture.center.set(0.5, 0.5); // Rotate around center
        texture.needsUpdate = true;
      }
    });
  }, [textures, repeatX, repeatY, offsetX, offsetY, rotation]);

  // Parse color tint
  const tintColor = useMemo(() => new THREE.Color(colorTint), [colorTint]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={textures.map}
        normalMap={textures.normalMap}
        normalScale={new THREE.Vector2(normalScale, normalScale)}
        roughnessMap={textures.roughnessMap}
        roughness={roughnessValue}
        metalness={metalnessValue}
        aoMap={hasAO ? (textures as { aoMap?: THREE.Texture }).aoMap : undefined}
        aoMapIntensity={hasAO ? aoIntensity : 0}
        color={tintColor}
        envMapIntensity={envMapIntensity}
      />
    </mesh>
  );
}

// Cyberpunk ground - concrete street with grid overlay
export function CyberpunkGround(_props: CyberpunkGroundProps) {
  // Leva controls for ground texture
  const groundControls = useControls('🗺️ World', {
    'Ground': folder({
      groundVisible: { value: true, label: 'Show Ground' },
      groundYOffset: { value: 0, min: -20, max: 10, step: 0.5, label: 'Y Offset' },
      textureSet: {
        value: 'procedural' as TextureSetKey,
        options: Object.keys(PBR_TEXTURE_SETS) as TextureSetKey[],
        label: 'Texture',
      },
      groundSize: { value: 500, min: 100, max: 2000, step: 50, label: 'Size' },
      'UV Transform': folder({
        repeatX: { value: 50, min: 1, max: 200, step: 1, label: 'Repeat X' },
        repeatY: { value: 50, min: 1, max: 200, step: 1, label: 'Repeat Y' },
        offsetX: { value: 0, min: -1, max: 1, step: 0.01, label: 'Offset X' },
        offsetY: { value: 0, min: -1, max: 1, step: 0.01, label: 'Offset Y' },
        uvRotation: { value: 0, min: 0, max: 360, step: 1, label: 'Rotation°' },
      }, { collapsed: true }),
      'Material': folder({
        roughness: { value: 0.9, min: 0, max: 1, step: 0.01, label: 'Roughness' },
        metalness: { value: 0.1, min: 0, max: 1, step: 0.01, label: 'Metalness' },
        normalScale: { value: 1.0, min: 0, max: 3, step: 0.05, label: 'Normal Scale' },
        aoIntensity: { value: 1.0, min: 0, max: 3, step: 0.05, label: 'AO Intensity' },
        colorTint: { value: '#ffffff', label: 'Color Tint' },
        envMapIntensity: { value: 1.0, min: 0, max: 3, step: 0.1, label: 'Env Map' },
      }, { collapsed: true }),
      'Grid Overlay': folder({
        showGrid: { value: true, label: 'Show Grid' },
        gridColor: { value: '#8b5cf6', label: 'Grid Color' },
        gridCellSize: { value: 2, min: 0.5, max: 20, step: 0.5, label: 'Cell Size' },
        gridSectionSize: { value: 10, min: 5, max: 50, step: 5, label: 'Section Size' },
        gridFadeDistance: { value: 60, min: 10, max: 200, step: 5, label: 'Fade Distance' },
      }, { collapsed: true }),
    }, { collapsed: true }),
  }, { collapsed: false });

  // Procedural textures (memoized - only recreate when truly needed)
  const proceduralTextures = useMemo(() => {
    const diffuse = createConcreteTexture();
    const normal = createProceduralNormalMap();
    return { diffuse, normal };
  }, []);

  // Update procedural texture UV transforms when controls change
  useEffect(() => {
    const { repeatX, repeatY, offsetX, offsetY, uvRotation } = groundControls;
    [proceduralTextures.diffuse, proceduralTextures.normal].forEach((texture) => {
      texture.repeat.set(repeatX, repeatY);
      texture.offset.set(offsetX, offsetY);
      texture.rotation = uvRotation * (Math.PI / 180);
      texture.center.set(0.5, 0.5);
      texture.needsUpdate = true;
    });
  }, [groundControls.repeatX, groundControls.repeatY, groundControls.offsetX, groundControls.offsetY, groundControls.uvRotation, proceduralTextures]);

  // Parse color tint for procedural
  const proceduralTintColor = useMemo(() => new THREE.Color(groundControls.colorTint), [groundControls.colorTint]);

  const textureKey = groundControls.textureSet as TextureSetKey;
  const basePath = PBR_TEXTURE_SETS[textureKey];
  const usePBR = basePath !== null;

  const actualSize = groundControls.groundSize;
  const yOffset = groundControls.groundYOffset;

  // Don't render if not visible
  if (!groundControls.groundVisible) {
    return null;
  }

  return (
    <group position={[0, yOffset, 0]}>
      {/* Ground surface - PBR or procedural */}
      {usePBR ? (
        <PBRGround
          basePath={basePath}
          textureKey={textureKey}
          size={actualSize}
          repeatX={groundControls.repeatX}
          repeatY={groundControls.repeatY}
          offsetX={groundControls.offsetX}
          offsetY={groundControls.offsetY}
          rotation={groundControls.uvRotation}
          roughnessValue={groundControls.roughness}
          metalnessValue={groundControls.metalness}
          normalScale={groundControls.normalScale}
          aoIntensity={groundControls.aoIntensity}
          colorTint={groundControls.colorTint}
          envMapIntensity={groundControls.envMapIntensity}
        />
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[actualSize, actualSize]} />
          <meshStandardMaterial
            map={proceduralTextures.diffuse}
            normalMap={proceduralTextures.normal}
            normalScale={new THREE.Vector2(groundControls.normalScale, groundControls.normalScale)}
            metalness={groundControls.metalness}
            roughness={groundControls.roughness}
            color={proceduralTintColor}
            envMapIntensity={groundControls.envMapIntensity}
          />
        </mesh>
      )}

      {/* Grid overlay - neon lines on the concrete */}
      {groundControls.showGrid && (
        <Grid
          position={[0, 0.008, 0]}
          args={[200, 200]}
          cellSize={groundControls.gridCellSize}
          cellThickness={0.4}
          cellColor="#1a1a2e"
          sectionSize={groundControls.gridSectionSize}
          sectionThickness={1}
          sectionColor={groundControls.gridColor}
          fadeDistance={groundControls.gridFadeDistance}
          fadeStrength={1.5}
          infiniteGrid
        />
      )}
    </group>
  );
}
