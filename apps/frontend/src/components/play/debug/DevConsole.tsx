/**
 * In-Game Dev Console
 * Toggle with backtick (`) key
 * Shows console logs, allows commands
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'info' | 'cmd';
  message: string;
  timestamp: Date;
}

interface DevConsoleProps {
  onCommand?: (command: string, args: string[]) => void;
}

// Built-in commands
const BUILT_IN_COMMANDS: Record<string, { description: string; handler: (args: string[], addLog: (entry: LogEntry) => void) => void }> = {
  help: {
    description: 'Show available commands',
    handler: (_, addLog) => {
      addLog({ type: 'info', message: '=== Available Commands ===', timestamp: new Date() });
      Object.entries(BUILT_IN_COMMANDS).forEach(([name, { description }]) => {
        addLog({ type: 'info', message: `  /${name} - ${description}`, timestamp: new Date() });
      });
    },
  },
  clear: {
    description: 'Clear the console',
    handler: () => {}, // Handled specially
  },
  fps: {
    description: 'Toggle FPS display',
    handler: (_, addLog) => {
      const event = new CustomEvent('devConsole:toggleFps');
      window.dispatchEvent(event);
      addLog({ type: 'info', message: 'FPS display toggled', timestamp: new Date() });
    },
  },
  pos: {
    description: 'Show current player position',
    handler: (_, addLog) => {
      const event = new CustomEvent('devConsole:getPos');
      window.dispatchEvent(event);
    },
  },
  tp: {
    description: 'Teleport to coordinates (x y z)',
    handler: (args, addLog) => {
      if (args.length < 3) {
        addLog({ type: 'error', message: 'Usage: /tp x y z', timestamp: new Date() });
        return;
      }
      const [x, y, z] = args.map(Number);
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        addLog({ type: 'error', message: 'Invalid coordinates', timestamp: new Date() });
        return;
      }
      const event = new CustomEvent('devConsole:teleport', { detail: { x, y, z } });
      window.dispatchEvent(event);
      addLog({ type: 'info', message: `Teleporting to (${x}, ${y}, ${z})`, timestamp: new Date() });
    },
  },
  weapon: {
    description: 'Equip weapon (rifle/pistol/none)',
    handler: (args, addLog) => {
      const weapon = args[0]?.toLowerCase();
      if (!['rifle', 'pistol', 'none'].includes(weapon)) {
        addLog({ type: 'error', message: 'Usage: /weapon rifle|pistol|none', timestamp: new Date() });
        return;
      }
      const event = new CustomEvent('devConsole:weapon', { detail: { weapon: weapon === 'none' ? null : weapon } });
      window.dispatchEvent(event);
      addLog({ type: 'info', message: `Weapon set to: ${weapon}`, timestamp: new Date() });
    },
  },
  players: {
    description: 'List online players',
    handler: (_, addLog) => {
      const event = new CustomEvent('devConsole:listPlayers');
      window.dispatchEvent(event);
    },
  },
  debug: {
    description: 'Toggle debug info overlay',
    handler: (_, addLog) => {
      const event = new CustomEvent('devConsole:toggleDebug');
      window.dispatchEvent(event);
      addLog({ type: 'info', message: 'Debug overlay toggled', timestamp: new Date() });
    },
  },
};

export function DevConsole({ onCommand }: DevConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev.slice(-200), entry]); // Keep last 200 logs
  }, []);

  // Intercept console methods
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    console.log = (...args) => {
      originalLog(...args);
      addLog({ type: 'log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: new Date() });
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog({ type: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: new Date() });
    };

    console.error = (...args) => {
      originalError(...args);
      addLog({ type: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: new Date() });
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog({ type: 'info', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: new Date() });
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    };
  }, [addLog]);

  // Toggle console with backtick key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle command submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const trimmed = input.trim();
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Add command to logs
    addLog({ type: 'cmd', message: `> ${trimmed}`, timestamp: new Date() });

    // Parse command
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (cmd === 'clear') {
        setLogs([]);
      } else if (BUILT_IN_COMMANDS[cmd]) {
        BUILT_IN_COMMANDS[cmd].handler(args, addLog);
      } else {
        addLog({ type: 'error', message: `Unknown command: ${cmd}. Type /help for available commands.`, timestamp: new Date() });
      }
    } else {
      // Custom command handler
      onCommand?.(trimmed, trimmed.split(' '));
    }

    setInput('');
  };

  // Handle history navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-cyan-400';
      case 'cmd': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed top-2 left-2 z-50 text-white/50 text-xs font-mono pointer-events-none">
        Press ` for console
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 h-1/2 bg-black/90 z-50 flex flex-col font-mono text-sm border-b-2 border-green-500">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <span className="text-green-400 font-bold">Dev Console</span>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>Type /help for commands</span>
          <button onClick={() => setIsOpen(false)} className="text-red-400 hover:text-red-300">
            [ESC to close]
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {logs.map((log, i) => (
          <div key={i} className={`${getLogColor(log.type)} break-all`}>
            <span className="text-gray-500 text-xs mr-2">
              {log.timestamp.toLocaleTimeString()}
            </span>
            {log.message}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex border-t border-gray-700">
        <span className="px-2 py-2 text-green-400">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-white outline-none py-2 pr-4"
          placeholder="Enter command (start with / for built-in commands)"
          autoComplete="off"
        />
      </form>
    </div>
  );
}

export default DevConsole;
