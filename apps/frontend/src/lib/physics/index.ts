/**
 * Physics System Exports
 */

export { PhysicsWorld } from './PhysicsWorld';

// Re-export commonly used Rapier components
export {
  RigidBody,
  CuboidCollider,
  BallCollider,
  CapsuleCollider,
  CylinderCollider,
  TrimeshCollider,
  HeightfieldCollider,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
