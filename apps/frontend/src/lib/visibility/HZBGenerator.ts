/**
 * HZBGenerator.ts
 * Generates Hierarchical Z-Buffer (depth pyramid) for GPU-based occlusion culling
 *
 * The HZB is a mipmap chain where each level stores the MAXIMUM depth of its
 * 4 child texels. This allows fast conservative occlusion testing by sampling
 * the appropriate mip level based on object screen size.
 */

import * as THREE from 'three';
import {
  hzbDownsampleVertexShader,
  hzbDownsampleFragmentShader,
  depthOnlyVertexShader,
  depthOnlyFragmentShader,
} from './shaders';

export interface HZBConfig {
  /** Base resolution (width). Height is half. Default: 1024 */
  resolution: 256 | 512 | 1024;
  /** Number of mip levels to generate. Default: 5 */
  mipLevels: number;
  /** Enable debug output */
  debug: boolean;
}

const DEFAULT_HZB_CONFIG: HZBConfig = {
  resolution: 1024,
  mipLevels: 5,
  debug: false,
};

/**
 * Occlusion test result
 */
export interface OcclusionTestResult {
  /** True if object is occluded (hidden behind other geometry) */
  occluded: boolean;
  /** The depth value at the test location (0-1, 0=near, 1=far) */
  depth: number;
  /** Which mip level was sampled */
  mipLevel: number;
}

/**
 * HZB Generator - Creates depth pyramid for occlusion culling
 */
export class HZBGenerator {
  private config: HZBConfig;
  private renderer: THREE.WebGLRenderer | null = null;

  /** Render targets for each mip level */
  private mipTargets: THREE.WebGLRenderTarget[] = [];

  /** Materials for downsampling */
  private downsampleMaterial: THREE.ShaderMaterial | null = null;

  /** Depth-only material for occluder rendering */
  private depthMaterial: THREE.ShaderMaterial | null = null;

  /** Full-screen quad for processing */
  private fullscreenQuad: THREE.Mesh | null = null;
  private quadScene: THREE.Scene | null = null;
  private quadCamera: THREE.OrthographicCamera | null = null;

  /** Current camera matrices for projection */
  private viewMatrix = new THREE.Matrix4();
  private projectionMatrix = new THREE.Matrix4();
  private viewProjectionMatrix = new THREE.Matrix4();

  /** Camera near/far planes */
  private near = 0.1;
  private far = 1000;

  /** Is the system initialized */
  private initialized = false;

  /** Pre-allocated vectors for testing */
  private _testVector = new THREE.Vector4();
  private _minScreen = new THREE.Vector2();
  private _maxScreen = new THREE.Vector2();

  constructor(config?: Partial<HZBConfig>) {
    this.config = { ...DEFAULT_HZB_CONFIG, ...config };
  }

  /**
   * Initialize the HZB system with a WebGL renderer
   */
  initialize(renderer: THREE.WebGLRenderer): void {
    if (this.initialized) return;

    this.renderer = renderer;

    // Create render targets for each mip level
    this.createRenderTargets();

    // Create downsample material
    this.downsampleMaterial = new THREE.ShaderMaterial({
      vertexShader: hzbDownsampleVertexShader,
      fragmentShader: hzbDownsampleFragmentShader,
      uniforms: {
        uPreviousLevel: { value: null },
        uTexelSize: { value: new THREE.Vector2() },
      },
      depthTest: false,
      depthWrite: false,
    });

    // Create depth-only material
    this.depthMaterial = new THREE.ShaderMaterial({
      vertexShader: depthOnlyVertexShader,
      fragmentShader: depthOnlyFragmentShader,
      uniforms: {
        uNear: { value: 0.1 },
        uFar: { value: 1000.0 },
      },
    });

    // Create fullscreen quad for processing
    this.createFullscreenQuad();

    this.initialized = true;

    if (this.config.debug) {
      console.log('[HZBGenerator] Initialized with config:', this.config);
    }
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Create render targets for the mip chain
   */
  private createRenderTargets(): void {
    let width: number = this.config.resolution;
    let height: number = this.config.resolution / 2;

    for (let i = 0; i < this.config.mipLevels; i++) {
      const target = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RedFormat,
        type: THREE.FloatType,
        depthBuffer: i === 0, // Only base level needs depth
        stencilBuffer: false,
      });

      this.mipTargets.push(target);

      if (this.config.debug) {
        console.log(`[HZBGenerator] Created mip ${i}: ${width}x${height}`);
      }

      width = Math.max(1, Math.floor(width / 2));
      height = Math.max(1, Math.floor(height / 2));
    }
  }

  /**
   * Create fullscreen quad for shader processing
   */
  private createFullscreenQuad(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fullscreenQuad = new THREE.Mesh(geometry, this.downsampleMaterial!);

    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.fullscreenQuad);

    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  /**
   * Generate HZB from the current depth buffer
   * Call this after rendering occluders but before occlusion testing
   *
   * @param camera - The camera used for rendering
   * @param occluders - Objects to render as occluders (terrain, large buildings)
   */
  generate(camera: THREE.Camera, occluders: THREE.Object3D[]): void {
    if (!this.initialized || !this.renderer) {
      console.warn('[HZBGenerator] Not initialized');
      return;
    }

    // Store camera matrices for later projection
    this.updateCameraMatrices(camera);

    // Store original state
    const originalRenderTarget = this.renderer.getRenderTarget();
    const originalClearColor = this.renderer.getClearColor(new THREE.Color());
    const originalClearAlpha = this.renderer.getClearAlpha();

    // Pass 1: Render occluders to base level with depth
    this.renderDepthPass(camera, occluders);

    // Pass 2-N: Generate mip chain
    this.generateMipChain();

    // Restore original state
    this.renderer.setRenderTarget(originalRenderTarget);
    this.renderer.setClearColor(originalClearColor, originalClearAlpha);
  }

  /**
   * Update camera matrices for projection calculations
   */
  private updateCameraMatrices(camera: THREE.Camera): void {
    camera.updateMatrixWorld();
    this.viewMatrix.copy(camera.matrixWorldInverse);
    this.projectionMatrix.copy(camera.projectionMatrix);
    this.viewProjectionMatrix.multiplyMatrices(
      this.projectionMatrix,
      this.viewMatrix
    );

    // Extract near/far from perspective camera
    if (camera instanceof THREE.PerspectiveCamera) {
      this.near = camera.near;
      this.far = camera.far;
    }
  }

  /**
   * Render occluders to the base HZB level
   */
  private renderDepthPass(
    camera: THREE.Camera,
    occluders: THREE.Object3D[]
  ): void {
    if (!this.renderer || !this.depthMaterial) return;

    // Set depth material uniforms
    this.depthMaterial.uniforms.uNear.value = this.near;
    this.depthMaterial.uniforms.uFar.value = this.far;

    // Create temp scene for depth rendering
    const depthScene = new THREE.Scene();

    // Store original materials and add objects
    const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

    for (const obj of occluders) {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          originalMaterials.set(child, child.material);
          child.material = this.depthMaterial!;
        }
      });
      depthScene.add(obj.clone());
    }

    // Render to base level
    this.renderer.setRenderTarget(this.mipTargets[0]);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(depthScene, camera);

    // Restore original materials
    for (const [mesh, material] of originalMaterials) {
      mesh.material = material;
    }

    // Clean up temp scene
    depthScene.clear();
  }

  /**
   * Generate the mip chain from the base level
   */
  private generateMipChain(): void {
    if (
      !this.renderer ||
      !this.downsampleMaterial ||
      !this.fullscreenQuad ||
      !this.quadScene ||
      !this.quadCamera
    ) {
      return;
    }

    for (let i = 1; i < this.mipTargets.length; i++) {
      const prevTarget = this.mipTargets[i - 1];
      const currentTarget = this.mipTargets[i];

      // Set uniforms
      this.downsampleMaterial.uniforms.uPreviousLevel.value = prevTarget.texture;
      this.downsampleMaterial.uniforms.uTexelSize.value.set(
        1.0 / prevTarget.width,
        1.0 / prevTarget.height
      );

      // Render downsample pass
      this.renderer.setRenderTarget(currentTarget);
      this.renderer.render(this.quadScene, this.quadCamera);
    }
  }

  /**
   * Test if a bounding box is occluded
   *
   * @param bounds - World-space bounding box to test
   * @returns OcclusionTestResult with occluded status
   */
  testBoundingBox(bounds: THREE.Box3): OcclusionTestResult {
    if (!this.initialized) {
      return { occluded: false, depth: 0, mipLevel: 0 };
    }

    // Project bounding box corners to screen space
    const corners = [
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
      new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
      new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
      new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
      new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
      new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
      new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
    ];

    // Initialize screen bounds
    this._minScreen.set(Infinity, Infinity);
    this._maxScreen.set(-Infinity, -Infinity);

    let minDepth = Infinity;
    let behindCamera = true;

    for (const corner of corners) {
      // Project to clip space
      this._testVector.set(corner.x, corner.y, corner.z, 1);
      this._testVector.applyMatrix4(this.viewProjectionMatrix);

      // Check if in front of camera
      if (this._testVector.w > 0) {
        behindCamera = false;

        // Perspective divide to NDC
        const ndcX = this._testVector.x / this._testVector.w;
        const ndcY = this._testVector.y / this._testVector.w;
        const ndcZ = this._testVector.z / this._testVector.w;

        // Convert NDC to screen space [0, 1]
        const screenX = (ndcX + 1) * 0.5;
        const screenY = (ndcY + 1) * 0.5;

        // Update screen bounds
        this._minScreen.x = Math.min(this._minScreen.x, screenX);
        this._minScreen.y = Math.min(this._minScreen.y, screenY);
        this._maxScreen.x = Math.max(this._maxScreen.x, screenX);
        this._maxScreen.y = Math.max(this._maxScreen.y, screenY);

        // Track minimum depth (closest point)
        const linearDepth = (ndcZ + 1) * 0.5; // Convert from [-1,1] to [0,1]
        minDepth = Math.min(minDepth, linearDepth);
      }
    }

    // If entirely behind camera, not visible (but not occluded)
    if (behindCamera) {
      return { occluded: false, depth: 0, mipLevel: 0 };
    }

    // Clamp screen bounds
    this._minScreen.x = Math.max(0, this._minScreen.x);
    this._minScreen.y = Math.max(0, this._minScreen.y);
    this._maxScreen.x = Math.min(1, this._maxScreen.x);
    this._maxScreen.y = Math.min(1, this._maxScreen.y);

    // Calculate screen size
    const screenWidth = this._maxScreen.x - this._minScreen.x;
    const screenHeight = this._maxScreen.y - this._minScreen.y;

    // Skip if too small on screen
    if (screenWidth < 0.001 || screenHeight < 0.001) {
      return { occluded: false, depth: minDepth, mipLevel: 0 };
    }

    // Select appropriate mip level based on screen coverage
    // Larger screen coverage = lower mip (finer detail)
    const maxScreenDim = Math.max(screenWidth, screenHeight);
    const mipLevel = Math.min(
      this.config.mipLevels - 1,
      Math.max(0, Math.floor(-Math.log2(maxScreenDim)))
    );

    // For now, we can't read back GPU texture efficiently in WebGL
    // This would require readPixels which causes stalls
    // Instead, we return the projected info and let the caller decide
    // In a production system, you'd use occlusion queries or compute shaders

    return {
      occluded: false, // Would need GPU readback to determine
      depth: minDepth,
      mipLevel,
    };
  }

  /**
   * Test if a bounding sphere is occluded
   */
  testBoundingSphere(sphere: THREE.Sphere): OcclusionTestResult {
    // Convert sphere to approximate bounding box
    const box = new THREE.Box3(
      new THREE.Vector3(
        sphere.center.x - sphere.radius,
        sphere.center.y - sphere.radius,
        sphere.center.z - sphere.radius
      ),
      new THREE.Vector3(
        sphere.center.x + sphere.radius,
        sphere.center.y + sphere.radius,
        sphere.center.z + sphere.radius
      )
    );
    return this.testBoundingBox(box);
  }

  /**
   * Get the HZB texture at a specific mip level (for debug visualization)
   */
  getHZBTexture(mipLevel: number = 0): THREE.Texture | null {
    if (mipLevel < 0 || mipLevel >= this.mipTargets.length) {
      return null;
    }
    return this.mipTargets[mipLevel].texture;
  }

  /**
   * Get all mip textures (for debug visualization)
   */
  getAllHZBTextures(): THREE.Texture[] {
    return this.mipTargets.map((t) => t.texture);
  }

  /**
   * Get the HZB resolution
   */
  getResolution(): number {
    return this.config.resolution;
  }

  /**
   * Get number of mip levels
   */
  getMipLevelCount(): number {
    return this.config.mipLevels;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<HZBConfig>): void {
    const needsRebuild =
      config.resolution !== undefined &&
      config.resolution !== this.config.resolution;

    this.config = { ...this.config, ...config };

    if (needsRebuild && this.initialized) {
      this.dispose();
      this.initialized = false;
      if (this.renderer) {
        this.initialize(this.renderer);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): HZBConfig {
    return { ...this.config };
  }

  /**
   * Dispose of all GPU resources
   */
  dispose(): void {
    for (const target of this.mipTargets) {
      target.dispose();
    }
    this.mipTargets = [];

    this.downsampleMaterial?.dispose();
    this.downsampleMaterial = null;

    this.depthMaterial?.dispose();
    this.depthMaterial = null;

    if (this.fullscreenQuad) {
      this.fullscreenQuad.geometry.dispose();
      this.fullscreenQuad = null;
    }
    this.quadScene = null;
    this.quadCamera = null;

    this.renderer = null;
    this.initialized = false;

    if (this.config.debug) {
      console.log('[HZBGenerator] Disposed');
    }
  }
}
