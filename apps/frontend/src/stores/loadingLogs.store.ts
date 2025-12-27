/**
 * Loading Logs Store
 * Captures console logs during loading for display in loading screen terminal
 * Allows users to copy logs for bug reporting
 */

import { create } from 'zustand';

export interface LogEntry {
  id: number;
  timestamp: Date;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

interface LoadingLogsState {
  logs: LogEntry[];
  isCapturing: boolean;
  addLog: (type: LogEntry['type'], message: string) => void;
  startCapturing: () => void;
  stopCapturing: () => void;
  clearLogs: () => void;
  getLogsAsText: () => string;
}

let logId = 0;

// Recursion guard - prevents infinite loops when logging triggers more logs
let isLogging = false;

export const useLoadingLogsStore = create<LoadingLogsState>((set, get) => ({
  logs: [],
  isCapturing: false,

  addLog: (type, message) => {
    // Prevent recursion from state updates triggering logs
    if (isLogging) return;
    isLogging = true;

    try {
      set(state => ({
        logs: [
          ...state.logs.slice(-100), // Keep last 100 logs
          {
            id: ++logId,
            timestamp: new Date(),
            type,
            message,
          },
        ],
      }));
    } finally {
      isLogging = false;
    }
  },

  startCapturing: () => {
    if (get().isCapturing) return;

    // DISABLED: Console interception was causing infinite recursion and performance issues
    // Just mark as capturing but don't intercept - logs will be added manually if needed
    set({ isCapturing: true });
  },

  stopCapturing: () => {
    if (!get().isCapturing) return;
    // Console interception is disabled, so no restoration needed
    set({ isCapturing: false });
  },

  clearLogs: () => {
    set({ logs: [] });
    logId = 0;
  },

  getLogsAsText: () => {
    const { logs } = get();
    const lines = [
      '=== Producer Tour Loading Logs ===',
      `Generated: ${new Date().toISOString()}`,
      `User Agent: ${navigator.userAgent}`,
      `URL: ${window.location.href}`,
      '================================',
      '',
      ...logs.map(log => {
        const time = log.timestamp.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const ms = String(log.timestamp.getMilliseconds()).padStart(3, '0');
        const prefix = log.type === 'error' ? '[ERR]' :
                      log.type === 'warn' ? '[WRN]' :
                      log.type === 'success' ? '[OK]' : '[LOG]';
        return `${time}.${ms} ${prefix} ${log.message}`;
      }),
    ];
    return lines.join('\n');
  },
}));
