/**
 * Server Version Hook
 * Detects when server has been redeployed and auto-refreshes the page
 * to ensure all clients are on the latest version.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseServerVersionProps {
  socket: Socket | null;
  isConnected: boolean;
}

interface UseServerVersionReturn {
  isUpdateAvailable: boolean;
  secondsUntilRefresh: number;
  refreshNow: () => void;
}

// How long to show the "Update available" message before auto-refresh (seconds)
const AUTO_REFRESH_DELAY = 5;

export function useServerVersion({ socket, isConnected }: UseServerVersionProps): UseServerVersionReturn {
  const initialVersion = useRef<string | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(AUTO_REFRESH_DELAY);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshNow = useCallback(() => {
    console.log('🔄 Refreshing page for update...');
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleServerVersion = (version: string) => {
      console.log('📡 Server version received:', version);

      if (initialVersion.current === null) {
        // First time receiving version - store it
        initialVersion.current = version;
        console.log('📡 Initial server version stored:', version);
      } else if (initialVersion.current !== version) {
        // Version changed! Server was redeployed
        console.log('🆕 Server update detected! Old:', initialVersion.current, 'New:', version);
        setIsUpdateAvailable(true);

        // Start countdown to auto-refresh
        let countdown = AUTO_REFRESH_DELAY;
        setSecondsUntilRefresh(countdown);

        countdownRef.current = setInterval(() => {
          countdown -= 1;
          setSecondsUntilRefresh(countdown);

          if (countdown <= 0) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            refreshNow();
          }
        }, 1000);
      }
    };

    socket.on('server:version', handleServerVersion);

    return () => {
      socket.off('server:version', handleServerVersion);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [socket, isConnected, refreshNow]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  return {
    isUpdateAvailable,
    secondsUntilRefresh,
    refreshNow,
  };
}

export default useServerVersion;
