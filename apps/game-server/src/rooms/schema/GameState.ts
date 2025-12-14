// Colyseus Schema definitions for game state synchronization
import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';

// Vector3 for positions
export class Vector3 extends Schema {
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') z: number = 0;

  set(x: number, y: number, z: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  distanceTo(other: Vector3): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dz = this.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

// Quaternion for rotations
export class Quaternion extends Schema {
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') z: number = 0;
  @type('number') w: number = 1;

  set(x: number, y: number, z: number, w: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
}

// Player state
export class Player extends Schema {
  @type('string') sessionId: string = '';
  @type('string') name: string = '';
  @type('string') avatarUrl: string = '';
  @type('string') walletAddress: string = '';

  @type(Vector3) position = new Vector3();
  @type(Quaternion) rotation = new Quaternion();
  @type(Vector3) velocity = new Vector3();

  @type('string') animation: string = 'idle';
  @type('number') health: number = 100;
  @type('number') level: number = 1;

  @type('boolean') isReady: boolean = false;
  @type('number') lastUpdate: number = 0;
}

// NPC state (server-controlled)
export class NPC extends Schema {
  @type('string') id: string = '';
  @type('string') npcType: string = '';
  @type('string') name: string = '';

  @type(Vector3) position = new Vector3();
  @type(Quaternion) rotation = new Quaternion();

  @type('string') animation: string = 'idle';
  @type('string') state: string = 'idle';
  @type('string') targetPlayerId: string = '';
}

// World item (pickup, interactable)
export class WorldItem extends Schema {
  @type('string') id: string = '';
  @type('string') itemType: string = '';
  @type(Vector3) position = new Vector3();
  @type(Quaternion) rotation = new Quaternion();
  @type('boolean') active: boolean = true;
  @type('number') respawnTime: number = 0;
}

// Chat message
export class ChatMessage extends Schema {
  @type('string') id: string = '';
  @type('string') senderId: string = '';
  @type('string') senderName: string = '';
  @type('string') message: string = '';
  @type('number') timestamp: number = 0;
  @type('string') channel: string = 'global'; // global, proximity, team
}

// Main game state
export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: NPC }) npcs = new MapSchema<NPC>();
  @type({ map: WorldItem }) items = new MapSchema<WorldItem>();
  @type([ChatMessage]) chatHistory = new ArraySchema<ChatMessage>();

  @type('number') serverTime: number = 0;
  @type('string') worldId: string = 'main';
  @type('number') maxPlayers: number = 50;
}
