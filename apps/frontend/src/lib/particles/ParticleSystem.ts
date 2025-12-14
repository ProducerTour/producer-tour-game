// Particle System - GPU-optimized particle effects
import * as THREE from 'three';

export interface ParticleConfig {
  maxParticles: number;
  texture?: THREE.Texture;
  blending?: THREE.Blending;
  transparent?: boolean;
  depthWrite?: boolean;
  size?: number;
  sizeAttenuation?: boolean;
}

export interface EmitterConfig {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  velocitySpread: THREE.Vector3;
  acceleration: THREE.Vector3;
  color: THREE.Color;
  colorEnd?: THREE.Color;
  size: number;
  sizeEnd?: number;
  lifetime: number;
  lifetimeSpread: number;
  rate: number; // particles per second
  burst?: number; // one-time burst count
  loop?: boolean;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  color: THREE.Color;
  colorEnd: THREE.Color;
  size: number;
  sizeEnd: number;
  lifetime: number;
  maxLifetime: number;
  alive: boolean;
}

const DEFAULT_CONFIG: ParticleConfig = {
  maxParticles: 1000,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
  size: 1,
  sizeAttenuation: true,
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private config: ParticleConfig;

  // Buffer attributes
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  // Emitter state
  private emitters: Map<string, { config: EmitterConfig; elapsed: number; active: boolean }> = new Map();

  constructor(config: Partial<ParticleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize particle pool
    for (let i = 0; i < this.config.maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        acceleration: new THREE.Vector3(),
        color: new THREE.Color(),
        colorEnd: new THREE.Color(),
        size: 1,
        sizeEnd: 1,
        lifetime: 0,
        maxLifetime: 1,
        alive: false,
      });
    }

    // Create buffer geometry
    this.positions = new Float32Array(this.config.maxParticles * 3);
    this.colors = new Float32Array(this.config.maxParticles * 3);
    this.sizes = new Float32Array(this.config.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Create material
    this.material = new THREE.PointsMaterial({
      size: this.config.size,
      sizeAttenuation: this.config.sizeAttenuation,
      blending: this.config.blending,
      transparent: this.config.transparent,
      depthWrite: this.config.depthWrite,
      vertexColors: true,
      map: this.config.texture,
    });

    // Create points mesh
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  // Get the THREE.Points object for adding to scene
  getObject(): THREE.Points {
    return this.points;
  }

  // Add an emitter
  addEmitter(id: string, config: EmitterConfig): void {
    this.emitters.set(id, {
      config,
      elapsed: 0,
      active: true,
    });

    // Handle burst
    if (config.burst) {
      this.emit(config, config.burst);
    }
  }

  // Remove an emitter
  removeEmitter(id: string): void {
    this.emitters.delete(id);
  }

  // Stop emitter (lets existing particles die out)
  stopEmitter(id: string): void {
    const emitter = this.emitters.get(id);
    if (emitter) {
      emitter.active = false;
    }
  }

  // Emit particles
  private emit(config: EmitterConfig, count: number): void {
    let emitted = 0;

    for (const particle of this.particles) {
      if (emitted >= count) break;
      if (particle.alive) continue;

      // Initialize particle
      particle.position.copy(config.position);

      particle.velocity.copy(config.velocity);
      particle.velocity.x += (Math.random() - 0.5) * 2 * config.velocitySpread.x;
      particle.velocity.y += (Math.random() - 0.5) * 2 * config.velocitySpread.y;
      particle.velocity.z += (Math.random() - 0.5) * 2 * config.velocitySpread.z;

      particle.acceleration.copy(config.acceleration);
      particle.color.copy(config.color);
      particle.colorEnd.copy(config.colorEnd ?? config.color);
      particle.size = config.size;
      particle.sizeEnd = config.sizeEnd ?? config.size;

      const lifetimeVariation = (Math.random() - 0.5) * 2 * config.lifetimeSpread;
      particle.maxLifetime = Math.max(0.1, config.lifetime + lifetimeVariation);
      particle.lifetime = 0;
      particle.alive = true;

      emitted++;
    }
  }

  // Update all particles
  update(deltaTime: number): void {
    // Update emitters
    for (const [id, emitter] of this.emitters) {
      if (!emitter.active) {
        // Check if all particles from this emitter are dead
        if (!emitter.config.loop) {
          this.emitters.delete(id);
        }
        continue;
      }

      emitter.elapsed += deltaTime;

      // Calculate how many particles to emit
      const interval = 1 / emitter.config.rate;
      while (emitter.elapsed >= interval) {
        this.emit(emitter.config, 1);
        emitter.elapsed -= interval;
      }
    }

    // Update particles
    let aliveCount = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];

      if (!particle.alive) {
        // Move dead particles far away
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = -10000;
        this.positions[i * 3 + 2] = 0;
        this.sizes[i] = 0;
        continue;
      }

      // Update lifetime
      particle.lifetime += deltaTime;

      if (particle.lifetime >= particle.maxLifetime) {
        particle.alive = false;
        continue;
      }

      aliveCount++;

      // Calculate interpolation factor
      const t = particle.lifetime / particle.maxLifetime;

      // Update velocity with acceleration
      particle.velocity.x += particle.acceleration.x * deltaTime;
      particle.velocity.y += particle.acceleration.y * deltaTime;
      particle.velocity.z += particle.acceleration.z * deltaTime;

      // Update position
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.position.z += particle.velocity.z * deltaTime;

      // Update buffers
      this.positions[i * 3] = particle.position.x;
      this.positions[i * 3 + 1] = particle.position.y;
      this.positions[i * 3 + 2] = particle.position.z;

      // Interpolate color
      const r = particle.color.r + (particle.colorEnd.r - particle.color.r) * t;
      const g = particle.color.g + (particle.colorEnd.g - particle.color.g) * t;
      const b = particle.color.b + (particle.colorEnd.b - particle.color.b) * t;
      this.colors[i * 3] = r;
      this.colors[i * 3 + 1] = g;
      this.colors[i * 3 + 2] = b;

      // Interpolate size
      this.sizes[i] = particle.size + (particle.sizeEnd - particle.size) * t;
    }

    // Mark attributes for update
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  // Set texture
  setTexture(texture: THREE.Texture): void {
    this.material.map = texture;
    this.material.needsUpdate = true;
  }

  // Get active particle count
  getActiveCount(): number {
    return this.particles.filter(p => p.alive).length;
  }

  // Dispose
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) {
      this.material.map.dispose();
    }
    this.emitters.clear();
  }
}

// Preset effect configs
export const ParticlePresets = {
  sparkle: (position: THREE.Vector3): EmitterConfig => ({
    position,
    velocity: new THREE.Vector3(0, 2, 0),
    velocitySpread: new THREE.Vector3(1, 1, 1),
    acceleration: new THREE.Vector3(0, -1, 0),
    color: new THREE.Color(1, 1, 0.5),
    colorEnd: new THREE.Color(1, 0.5, 0),
    size: 0.3,
    sizeEnd: 0,
    lifetime: 1,
    lifetimeSpread: 0.3,
    rate: 20,
    loop: true,
  }),

  explosion: (position: THREE.Vector3): EmitterConfig => ({
    position,
    velocity: new THREE.Vector3(0, 0, 0),
    velocitySpread: new THREE.Vector3(5, 5, 5),
    acceleration: new THREE.Vector3(0, -5, 0),
    color: new THREE.Color(1, 0.8, 0.2),
    colorEnd: new THREE.Color(0.5, 0.1, 0),
    size: 0.5,
    sizeEnd: 0,
    lifetime: 1.5,
    lifetimeSpread: 0.5,
    rate: 0,
    burst: 50,
    loop: false,
  }),

  dust: (position: THREE.Vector3): EmitterConfig => ({
    position,
    velocity: new THREE.Vector3(0, 0.5, 0),
    velocitySpread: new THREE.Vector3(0.5, 0.2, 0.5),
    acceleration: new THREE.Vector3(0, 0, 0),
    color: new THREE.Color(0.6, 0.5, 0.4),
    colorEnd: new THREE.Color(0.6, 0.5, 0.4),
    size: 0.1,
    sizeEnd: 0.05,
    lifetime: 3,
    lifetimeSpread: 1,
    rate: 5,
    loop: true,
  }),

  fire: (position: THREE.Vector3): EmitterConfig => ({
    position,
    velocity: new THREE.Vector3(0, 3, 0),
    velocitySpread: new THREE.Vector3(0.5, 0.5, 0.5),
    acceleration: new THREE.Vector3(0, 1, 0),
    color: new THREE.Color(1, 0.6, 0),
    colorEnd: new THREE.Color(0.5, 0, 0),
    size: 0.4,
    sizeEnd: 0,
    lifetime: 1,
    lifetimeSpread: 0.3,
    rate: 30,
    loop: true,
  }),

  smoke: (position: THREE.Vector3): EmitterConfig => ({
    position,
    velocity: new THREE.Vector3(0, 1, 0),
    velocitySpread: new THREE.Vector3(0.3, 0.2, 0.3),
    acceleration: new THREE.Vector3(0, 0.5, 0),
    color: new THREE.Color(0.3, 0.3, 0.3),
    colorEnd: new THREE.Color(0.1, 0.1, 0.1),
    size: 0.3,
    sizeEnd: 1,
    lifetime: 3,
    lifetimeSpread: 1,
    rate: 10,
    loop: true,
  }),

  confetti: (position: THREE.Vector3): EmitterConfig => ({
    position,
    velocity: new THREE.Vector3(0, 8, 0),
    velocitySpread: new THREE.Vector3(4, 2, 4),
    acceleration: new THREE.Vector3(0, -10, 0),
    color: new THREE.Color(Math.random(), Math.random(), Math.random()),
    colorEnd: new THREE.Color(Math.random(), Math.random(), Math.random()),
    size: 0.2,
    sizeEnd: 0.2,
    lifetime: 3,
    lifetimeSpread: 0.5,
    rate: 0,
    burst: 100,
    loop: false,
  }),

  heal: (position: THREE.Vector3): EmitterConfig => ({
    position,
    velocity: new THREE.Vector3(0, 2, 0),
    velocitySpread: new THREE.Vector3(0.5, 0.5, 0.5),
    acceleration: new THREE.Vector3(0, 0, 0),
    color: new THREE.Color(0.2, 1, 0.2),
    colorEnd: new THREE.Color(0.5, 1, 0.5),
    size: 0.2,
    sizeEnd: 0,
    lifetime: 1.5,
    lifetimeSpread: 0.3,
    rate: 15,
    loop: true,
  }),

  levelUp: (position: THREE.Vector3): EmitterConfig => ({
    position,
    velocity: new THREE.Vector3(0, 5, 0),
    velocitySpread: new THREE.Vector3(2, 1, 2),
    acceleration: new THREE.Vector3(0, -2, 0),
    color: new THREE.Color(1, 1, 0),
    colorEnd: new THREE.Color(1, 0.5, 0),
    size: 0.4,
    sizeEnd: 0,
    lifetime: 2,
    lifetimeSpread: 0.5,
    rate: 0,
    burst: 80,
    loop: false,
  }),
};

// Singleton manager
class ParticleManager {
  private systems: Map<string, ParticleSystem> = new Map();
  private scene: THREE.Scene | null = null;

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  createSystem(id: string, config?: Partial<ParticleConfig>): ParticleSystem {
    const system = new ParticleSystem(config);
    this.systems.set(id, system);

    if (this.scene) {
      this.scene.add(system.getObject());
    }

    return system;
  }

  getSystem(id: string): ParticleSystem | undefined {
    return this.systems.get(id);
  }

  removeSystem(id: string): void {
    const system = this.systems.get(id);
    if (system) {
      if (this.scene) {
        this.scene.remove(system.getObject());
      }
      system.dispose();
      this.systems.delete(id);
    }
  }

  update(deltaTime: number): void {
    for (const system of this.systems.values()) {
      system.update(deltaTime);
    }
  }

  // Quick effect spawn
  spawnEffect(
    preset: keyof typeof ParticlePresets,
    position: THREE.Vector3,
    systemId: string = 'default'
  ): void {
    let system = this.systems.get(systemId);
    if (!system) {
      system = this.createSystem(systemId);
    }

    const config = ParticlePresets[preset](position);
    const effectId = `${preset}-${Date.now()}`;
    system.addEmitter(effectId, config);
  }

  dispose(): void {
    for (const [id] of this.systems) {
      this.removeSystem(id);
    }
  }
}

let particleManagerInstance: ParticleManager | null = null;

export function getParticleManager(): ParticleManager {
  if (!particleManagerInstance) {
    particleManagerInstance = new ParticleManager();
  }
  return particleManagerInstance;
}

export function resetParticleManager(): void {
  if (particleManagerInstance) {
    particleManagerInstance.dispose();
    particleManagerInstance = null;
  }
}
