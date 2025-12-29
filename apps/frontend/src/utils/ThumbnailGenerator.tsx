/**
 * Thumbnail Generator Utility
 *
 * Dev tool for generating 2D thumbnail images from 3D models.
 * Renders each model with orthographic camera and exports as PNG.
 *
 * Usage: Import and render this component in a dev route (e.g., /dev/thumbnails)
 */

import { useRef, useState, Suspense, useCallback, useLayoutEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Environment } from '@react-three/drei';
import { Color } from 'three';
import { getModelPath } from '@/config/assetPaths';

// Dark background color for canvas - prevents white flash
const CANVAS_BG_COLOR = new Color('#111827'); // gray-900
const DARK_BG = '#111827';

interface ModelConfig {
  id: string;
  name: string;
  modelPath: string;
  rotation?: [number, number, number];
  scale?: number;
  offsetY?: number; // Vertical offset to adjust model position
  flameOffsetY?: number; // Offset for flame/fire meshes specifically
}

// Models to generate thumbnails for
// NOTE: Only include models that exist locally or on CDN
const MODELS_TO_GENERATE: ModelConfig[] = [
  // Weapons
  {
    id: 'rifle',
    name: 'AK-47 Rifle',
    modelPath: 'weapons/ak47fbx_gltf/scene.gltf',
    rotation: [0, Math.PI / 4, 0],
    scale: 1,
  },
  {
    id: 'pistol',
    name: 'Orange Pistol',
    modelPath: 'weapons/pistolorange_gltf/scene.gltf',
    rotation: [0, Math.PI / 4, 0],
    scale: 1,
  },
  // Placeables
  {
    id: 'campfire',
    name: 'Campfire',
    modelPath: 'Campfire/campfire.glb',
    rotation: [0, Math.PI / 6, 0],
    scale: 1,
    offsetY: 0,
    flameOffsetY: 2.5, // Raise flame up into the base
  },
];

// Component to render a single 3D model
function ModelPreview({ modelPath, rotation = [0, 0, 0], scale = 1, offsetY = 0, flameOffsetY = 0 }: {
  modelPath: string;
  rotation?: [number, number, number];
  scale?: number;
  offsetY?: number;
  flameOffsetY?: number;
}) {
  const { scene } = useGLTF(getModelPath(modelPath));

  // Clone scene and adjust flame meshes if needed
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();

    // Log all mesh names for debugging
    console.log(`[ThumbnailGenerator] Meshes in ${modelPath}:`);
    cloned.traverse((child) => {
      if (child.type === 'Mesh' || child.type === 'Group') {
        console.log(`  - "${child.name}" (${child.type}) pos: ${child.position.y.toFixed(2)}`);
      }
    });

    if (flameOffsetY !== 0) {
      // Find and offset flame/fire meshes (check various naming conventions)
      cloned.traverse((child) => {
        const name = child.name.toLowerCase();
        if (
          name.includes('flame') ||
          name.includes('fire') ||
          name.includes('ember') ||
          name.includes('particle') ||
          name.includes('glow') ||
          name.includes('light')
        ) {
          console.log(`[ThumbnailGenerator] Moving "${child.name}" up by ${flameOffsetY}`);
          child.position.y += flameOffsetY;
        }
      });
    }

    return cloned;
  }, [scene, flameOffsetY, modelPath]);

  return (
    <Center>
      <group position={[0, offsetY, 0]}>
        <primitive
          object={clonedScene}
          rotation={rotation}
          scale={scale}
        />
      </group>
    </Center>
  );
}

// Single thumbnail generator card
function ThumbnailCard({ model }: { model: ModelConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateThumbnail = useCallback(() => {
    if (!canvasRef.current) return;

    setIsGenerating(true);

    // Small delay to ensure model is fully loaded and rendered
    setTimeout(() => {
      if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setThumbnail(dataUrl);
        setIsGenerating(false);
      }
    }, 500);
  }, []);

  const downloadThumbnail = useCallback(() => {
    if (!thumbnail) return;

    const link = document.createElement('a');
    link.href = thumbnail;
    link.download = `${model.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [thumbnail, model.id]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-4">
      <h3 className="text-white font-semibold">{model.name}</h3>
      <p className="text-gray-400 text-sm font-mono">{model.modelPath}</p>

      {/* 3D Preview Canvas */}
      <div className="w-64 h-64 bg-gray-900 rounded-lg overflow-hidden">
        <Canvas
          ref={canvasRef}
          gl={{ preserveDrawingBuffer: true, alpha: false }}
          camera={{ position: [2, 1, 2], fov: 45 }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(CANVAS_BG_COLOR);
            scene.background = CANVAS_BG_COLOR;
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, 3, -5]} intensity={0.5} />

          <Suspense fallback={null}>
            <ModelPreview
              modelPath={model.modelPath}
              rotation={model.rotation}
              scale={model.scale}
              offsetY={model.offsetY}
              flameOffsetY={model.flameOffsetY}
            />
            <Environment preset="studio" />
          </Suspense>

          <OrbitControls enablePan={false} />
        </Canvas>
      </div>

      {/* Generated Thumbnail Preview */}
      {thumbnail && (
        <div className="flex flex-col gap-2">
          <p className="text-gray-400 text-sm">Generated thumbnail:</p>
          <div className="w-32 h-32 bg-gray-900 rounded border border-gray-600 flex items-center justify-center">
            <img
              src={thumbnail}
              alt={`${model.name} thumbnail`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={generateThumbnail}
          disabled={isGenerating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>

        {thumbnail && (
          <button
            onClick={downloadThumbnail}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            Download PNG
          </button>
        )}
      </div>
    </div>
  );
}

// Main thumbnail generator page
export function ThumbnailGenerator() {
  // Set dark background on body immediately to prevent white flash
  useLayoutEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;

    document.body.style.backgroundColor = DARK_BG;
    document.documentElement.style.backgroundColor = DARK_BG;

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          Item Thumbnail Generator
        </h1>
        <p className="text-gray-400 mb-8">
          Generate 2D thumbnail images from 3D models for inventory display.
          Adjust the camera angle using orbit controls, then click Generate to capture.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODELS_TO_GENERATE.map((model) => (
            <ThumbnailCard key={model.id} model={model} />
          ))}
        </div>

        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-2">Instructions</h2>
          <ol className="text-gray-300 list-decimal list-inside space-y-2">
            <li>Use orbit controls to rotate the model to desired angle</li>
            <li>Click "Generate" to capture the current view as a thumbnail</li>
            <li>Click "Download PNG" to save the image</li>
            <li>Save thumbnails to <code className="bg-gray-700 px-2 py-0.5 rounded">/public/icons/weapons/</code></li>
            <li>Update item definitions with the thumbnail path</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
          <h3 className="text-yellow-400 font-semibold mb-2">Adding New Models</h3>
          <p className="text-yellow-200/80 text-sm">
            Edit the <code className="bg-gray-700 px-2 py-0.5 rounded">MODELS_TO_GENERATE</code> array
            in this file to add more models. Each entry needs an id, name, and modelPath.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ThumbnailGenerator;
