/**
 * GamePauseContext - Global pause state for all game animations
 *
 * When isPaused is true, all useFrame hooks should early-return
 * to prevent unnecessary calculations (e.g., when inventory is open)
 */

import { createContext, useContext, type ReactNode } from 'react';

interface GamePauseContextValue {
  isPaused: boolean;
}

const GamePauseContext = createContext<GamePauseContextValue>({ isPaused: false });

export function GamePauseProvider({
  isPaused,
  children
}: {
  isPaused: boolean;
  children: ReactNode;
}) {
  return (
    <GamePauseContext.Provider value={{ isPaused }}>
      {children}
    </GamePauseContext.Provider>
  );
}

/**
 * Hook to check if game is paused
 * Use this in useFrame hooks to skip expensive calculations
 *
 * @example
 * useFrame((_, delta) => {
 *   if (isPaused) return;
 *   // ... expensive calculations
 * });
 */
export function useGamePause(): boolean {
  return useContext(GamePauseContext).isPaused;
}
