/**
 * Game Provider
 *
 * React context bridge to the game engine.
 * Provides access to the Game instance for components that need it.
 *
 * Usage:
 * ```tsx
 * <GameProvider>
 *   <Canvas>
 *     <GameLoop />
 *     <YourScene />
 *   </Canvas>
 * </GameProvider>
 * ```
 */

import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Game, InputSystem, AnimationSystem, type GameConfig } from '@producer-tour/engine';

// =============================================================================
// CONTEXT
// =============================================================================

interface GameContextValue {
  game: Game | null;
  isReady: boolean;
}

const GameContext = createContext<GameContextValue>({
  game: null,
  isReady: false,
});

// =============================================================================
// PROVIDER
// =============================================================================

interface GameProviderProps {
  children: ReactNode;
  config?: Partial<GameConfig>;
  /** Auto-start the game loop on mount (default: true) */
  autoStart?: boolean;
}

export function GameProvider({
  children,
  config,
  autoStart = true,
}: GameProviderProps) {
  const gameRef = useRef<Game | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Create game instance
    const game = new Game(config);

    // Register core systems
    game.addSystem(new InputSystem());
    game.addSystem(new AnimationSystem());

    // Store reference
    gameRef.current = game;
    setIsReady(true);

    // Auto-start if enabled
    if (autoStart) {
      game.start();
    }

    // Cleanup on unmount
    return () => {
      game.destroy();
      gameRef.current = null;
      setIsReady(false);
    };
  }, []); // Only run once on mount

  return (
    <GameContext.Provider value={{ game: gameRef.current, isReady }}>
      {children}
    </GameContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Get the Game instance.
 * Returns null if not ready yet.
 */
export function useGame(): Game | null {
  const { game } = useContext(GameContext);
  return game;
}

/**
 * Get the Game instance, throwing if not ready.
 * Use this when you're certain the game is initialized.
 */
export function useGameStrict(): Game {
  const { game, isReady } = useContext(GameContext);

  if (!isReady || !game) {
    throw new Error('useGameStrict: Game not initialized. Wrap component in GameProvider.');
  }

  return game;
}

/**
 * Check if the game is ready.
 */
export function useGameReady(): boolean {
  const { isReady } = useContext(GameContext);
  return isReady;
}

/**
 * Start or stop the game loop.
 */
export function useGameControl() {
  const game = useGame();

  return {
    start: () => game?.start(),
    stop: () => game?.stop(),
    isRunning: game?.isRunning() ?? false,
  };
}
