// ECS World - Core entity/component/system manager
export type EntityId = number;
export type ComponentType = string;

export interface Component {
  type: ComponentType;
}

export interface SystemInterface {
  priority: number;
  requiredComponents: ComponentType[];
  update(world: World, dt: number): void;
  init?(world: World): void;
  destroy?(world: World): void;
}

export class World {
  private nextEntityId = 1;
  private entities = new Map<EntityId, Map<ComponentType, Component>>();
  private systems: SystemInterface[] = [];
  private componentIndex = new Map<ComponentType, Set<EntityId>>();
  private entityTags = new Map<EntityId, Set<string>>();
  private tagIndex = new Map<string, Set<EntityId>>();
  private initialized = false;

  // Entity Management
  createEntity(): EntityId {
    const id = this.nextEntityId++;
    this.entities.set(id, new Map());
    this.entityTags.set(id, new Set());
    return id;
  }

  destroyEntity(id: EntityId): void {
    const components = this.entities.get(id);
    if (components) {
      // Remove from component indices
      for (const type of components.keys()) {
        this.componentIndex.get(type)?.delete(id);
      }
      this.entities.delete(id);
    }

    // Remove from tag indices
    const tags = this.entityTags.get(id);
    if (tags) {
      for (const tag of tags) {
        this.tagIndex.get(tag)?.delete(id);
      }
      this.entityTags.delete(id);
    }
  }

  entityExists(id: EntityId): boolean {
    return this.entities.has(id);
  }

  // Component Management
  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    const components = this.entities.get(entityId);
    if (!components) {
      throw new Error(`Entity ${entityId} not found`);
    }

    components.set(component.type, component);

    // Update index
    if (!this.componentIndex.has(component.type)) {
      this.componentIndex.set(component.type, new Set());
    }
    this.componentIndex.get(component.type)!.add(entityId);
  }

  removeComponent(entityId: EntityId, type: ComponentType): void {
    const components = this.entities.get(entityId);
    if (components) {
      components.delete(type);
      this.componentIndex.get(type)?.delete(entityId);
    }
  }

  getComponent<T extends Component>(entityId: EntityId, type: ComponentType): T | undefined {
    return this.entities.get(entityId)?.get(type) as T | undefined;
  }

  hasComponent(entityId: EntityId, type: ComponentType): boolean {
    return this.entities.get(entityId)?.has(type) ?? false;
  }

  hasComponents(entityId: EntityId, types: ComponentType[]): boolean {
    const components = this.entities.get(entityId);
    if (!components) return false;
    return types.every(type => components.has(type));
  }

  // Tag Management (for quick entity lookups)
  addTag(entityId: EntityId, tag: string): void {
    const tags = this.entityTags.get(entityId);
    if (!tags) return;

    tags.add(tag);

    if (!this.tagIndex.has(tag)) {
      this.tagIndex.set(tag, new Set());
    }
    this.tagIndex.get(tag)!.add(entityId);
  }

  removeTag(entityId: EntityId, tag: string): void {
    this.entityTags.get(entityId)?.delete(tag);
    this.tagIndex.get(tag)?.delete(entityId);
  }

  hasTag(entityId: EntityId, tag: string): boolean {
    return this.entityTags.get(entityId)?.has(tag) ?? false;
  }

  getEntitiesWithTag(tag: string): EntityId[] {
    return Array.from(this.tagIndex.get(tag) ?? []);
  }

  // Querying
  query(...types: ComponentType[]): EntityId[] {
    if (types.length === 0) return [];

    // Start with smallest set for efficiency
    const sets = types
      .map(t => this.componentIndex.get(t) ?? new Set<EntityId>())
      .sort((a, b) => a.size - b.size);

    if (sets[0].size === 0) return [];

    const result: EntityId[] = [];
    for (const id of sets[0]) {
      if (sets.every(s => s.has(id))) {
        result.push(id);
      }
    }
    return result;
  }

  // Get all entities
  getAllEntities(): EntityId[] {
    return Array.from(this.entities.keys());
  }

  // System Management
  addSystem(system: SystemInterface): void {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);

    // If world is already initialized, init the new system
    if (this.initialized && system.init) {
      system.init(this);
    }
  }

  removeSystem(system: SystemInterface): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      if (system.destroy) {
        system.destroy(this);
      }
      this.systems.splice(index, 1);
    }
  }

  // Lifecycle
  init(): void {
    if (this.initialized) return;

    for (const system of this.systems) {
      if (system.init) {
        system.init(this);
      }
    }
    this.initialized = true;
  }

  update(dt: number): void {
    for (const system of this.systems) {
      system.update(this, dt);
    }
  }

  destroy(): void {
    for (const system of this.systems) {
      if (system.destroy) {
        system.destroy(this);
      }
    }
    this.entities.clear();
    this.componentIndex.clear();
    this.entityTags.clear();
    this.tagIndex.clear();
    this.initialized = false;
  }

  // Debug
  getStats(): { entities: number; components: number; systems: number } {
    let componentCount = 0;
    for (const components of this.entities.values()) {
      componentCount += components.size;
    }
    return {
      entities: this.entities.size,
      components: componentCount,
      systems: this.systems.length,
    };
  }
}

// Singleton world instance
let worldInstance: World | null = null;

export function getWorld(): World {
  if (!worldInstance) {
    worldInstance = new World();
  }
  return worldInstance;
}

export function resetWorld(): void {
  if (worldInstance) {
    worldInstance.destroy();
    worldInstance = null;
  }
}
