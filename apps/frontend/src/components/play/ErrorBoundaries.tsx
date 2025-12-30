/**
 * Error Boundaries for Play Components
 * Prevents single asset/subsystem failures from crashing the entire game.
 *
 * React error boundaries only catch errors during rendering, lifecycle methods,
 * and constructors. They don't catch errors in event handlers, async code,
 * or server-side rendering.
 */

import { Component, type ReactNode } from 'react';

// Base error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  name?: string; // For logging which boundary caught the error
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Base Error Boundary class
 * Catches rendering errors and displays fallback UI
 */
class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const boundaryName = this.props.name || 'Unknown';
    console.error(`[${boundaryName}ErrorBoundary] Caught error:`, error);
    console.error('Component stack:', errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * Avatar Error Boundary
 * Falls back to a placeholder avatar if the main avatar fails to load
 */
export function AvatarErrorBoundary({
  children,
  fallback,
  onError,
}: {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  return (
    <BaseErrorBoundary name="Avatar" fallback={fallback} onError={onError}>
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * Terrain Error Boundary
 * Falls back to a simple flat plane if terrain rendering fails
 */
export function TerrainErrorBoundary({
  children,
  fallback,
  onError,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  // Default fallback is a simple colored plane
  const defaultFallback = (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial color="#4a5568" />
    </mesh>
  );

  return (
    <BaseErrorBoundary
      name="Terrain"
      fallback={fallback ?? defaultFallback}
      onError={onError}
    >
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * NPC Error Boundary
 * Falls back to null (no NPCs) if NPC system fails
 */
export function NPCErrorBoundary({
  children,
  fallback = null,
  onError,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  return (
    <BaseErrorBoundary name="NPC" fallback={fallback} onError={onError}>
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * VFX Error Boundary
 * Falls back to null (no effects) if VFX system fails
 */
export function VFXErrorBoundary({
  children,
  fallback = null,
  onError,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  return (
    <BaseErrorBoundary name="VFX" fallback={fallback} onError={onError}>
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * Model Error Boundary
 * For individual 3D model loading (weapons, items, etc.)
 */
export function ModelErrorBoundary({
  children,
  fallback = null,
  modelName,
  onError,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  modelName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  return (
    <BaseErrorBoundary
      name={modelName ? `Model:${modelName}` : 'Model'}
      fallback={fallback}
      onError={onError}
    >
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * Environment Error Boundary
 * For skybox, lighting, and environment-related components
 */
export function EnvironmentErrorBoundary({
  children,
  fallback,
  onError,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  // Default fallback is a simple sky color
  const defaultFallback = <color attach="background" args={['#87CEEB']} />;

  return (
    <BaseErrorBoundary
      name="Environment"
      fallback={fallback ?? defaultFallback}
      onError={onError}
    >
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * Physics Error Boundary
 * For physics subsystem - falls back to no physics (objects may fall through)
 */
export function PhysicsErrorBoundary({
  children,
  fallback = null,
  onError,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  return (
    <BaseErrorBoundary name="Physics" fallback={fallback} onError={onError}>
      {children}
    </BaseErrorBoundary>
  );
}

/**
 * Multiplayer Error Boundary
 * For multiplayer/networking components
 */
export function MultiplayerErrorBoundary({
  children,
  fallback = null,
  onError,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}) {
  return (
    <BaseErrorBoundary name="Multiplayer" fallback={fallback} onError={onError}>
      {children}
    </BaseErrorBoundary>
  );
}

// Export base class for custom boundaries
export { BaseErrorBoundary };
