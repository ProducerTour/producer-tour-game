import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productivityApi } from '../../../lib/api';
import { audioService } from '../../../services/audio.service';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import type { WidgetProps, PomodoroConfig, PomodoroStats } from '../../../types/productivity.types';

type TimerMode = 'focus' | 'break' | 'longBreak';

/**
 * PomodoroWidget - Focus timer with session tracking
 *
 * Features:
 * - 25/5/15 minute intervals (customizable)
 * - Start/pause/reset controls
 * - Session completion tracking
 * - Break reminders
 * - Statistics display
 */
export default function PomodoroWidget({ config, isEditing }: WidgetProps) {
  const queryClient = useQueryClient();
  const pomodoroConfig = config as PomodoroConfig;

  // Timer settings from config
  const focusDuration = (pomodoroConfig.duration || 25) * 60; // seconds
  const breakDuration = (pomodoroConfig.breakDuration || 5) * 60;
  const longBreakDuration = (pomodoroConfig.longBreakDuration || 15) * 60;
  const sessionsBeforeLongBreak = pomodoroConfig.sessionsBeforeLongBreak || 4;

  // State
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(focusDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessions] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['productivity-pomodoro-stats'],
    queryFn: async () => {
      const response = await productivityApi.getPomodoroStats(7);
      return response.data as PomodoroStats;
    },
  });

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async ({ duration, isBreak }: { duration: number; isBreak: boolean }) => {
      const response = await productivityApi.startPomodoro(duration, undefined, isBreak);
      return response.data;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await productivityApi.completePomodoro(sessionId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-pomodoro-stats'] });
      setCurrentSessionId(null);
    },
  });

  // Get duration for current mode
  const getDuration = useCallback((timerMode: TimerMode) => {
    switch (timerMode) {
      case 'focus':
        return focusDuration;
      case 'break':
        return breakDuration;
      case 'longBreak':
        return longBreakDuration;
    }
  }, [focusDuration, breakDuration, longBreakDuration]);

  // Handle timer completion
  const handleComplete = useCallback(() => {
    setIsRunning(false);

    // Complete session in backend
    if (currentSessionId) {
      completeSessionMutation.mutate(currentSessionId);
    }

    // Play timer completion sound
    audioService.playNotification('timer');

    if (mode === 'focus') {
      const newSessions = sessionsCompleted + 1;
      setSessions(newSessions);

      // Determine next break type
      if (newSessions % sessionsBeforeLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(longBreakDuration);
      } else {
        setMode('break');
        setTimeLeft(breakDuration);
      }
    } else {
      // Break completed, back to focus
      setMode('focus');
      setTimeLeft(focusDuration);
    }
  }, [mode, sessionsCompleted, sessionsBeforeLongBreak, currentSessionId, focusDuration, breakDuration, longBreakDuration, completeSessionMutation]);

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, handleComplete]);

  // Start/pause timer
  const toggleTimer = () => {
    if (!isRunning && timeLeft === getDuration(mode)) {
      // Starting fresh session
      const durationMinutes = Math.ceil(getDuration(mode) / 60);
      startSessionMutation.mutate({ duration: durationMinutes, isBreak: mode !== 'focus' });
    }
    setIsRunning(!isRunning);
  };

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getDuration(mode));
    setCurrentSessionId(null);
  };

  // Switch mode
  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
    setCurrentSessionId(null);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const progress = ((getDuration(mode) - timeLeft) / getDuration(mode)) * 100;

  return (
    <div className="h-full flex flex-col p-3">
      {/* Mode Tabs */}
      <div className="flex justify-center gap-1 mb-3">
        {(['focus', 'break', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            disabled={isEditing}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              mode === m
                ? m === 'focus'
                  ? 'bg-theme-primary text-white'
                  : 'bg-green-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {m === 'focus' ? 'Focus' : m === 'break' ? 'Break' : 'Long Break'}
          </button>
        ))}
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Progress Ring */}
        <div className="relative w-32 h-32 mb-3">
          <svg className="w-32 h-32 -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              strokeWidth="8"
              stroke="rgba(255,255,255,0.1)"
              fill="none"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              strokeWidth="8"
              stroke={mode === 'focus' ? '#6366f1' : '#22c55e'}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 56}
              strokeDashoffset={2 * Math.PI * 56 * (1 - progress / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-theme-foreground font-mono">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-theme-foreground-muted">
              {mode === 'focus' ? 'Focus Time' : mode === 'break' ? 'Short Break' : 'Long Break'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={resetTimer}
            disabled={isEditing}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4 text-white/60" />
          </button>

          <button
            onClick={toggleTimer}
            disabled={isEditing}
            className={`p-3 rounded-full transition-colors
              ${isRunning
                ? 'bg-red-500 hover:bg-red-600'
                : mode === 'focus'
                  ? 'bg-theme-primary hover:bg-theme-primary/90'
                  : 'bg-green-500 hover:bg-green-600'
              } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRunning ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => switchMode(mode === 'focus' ? 'break' : 'focus')}
            disabled={isEditing}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
            title={mode === 'focus' ? 'Take a break' : 'Back to focus'}
          >
            <Coffee className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/10 mt-2">
        <div className="text-center">
          <span className="text-lg font-bold text-theme-foreground">{sessionsCompleted}</span>
          <span className="text-xs text-theme-foreground-muted block">Today</span>
        </div>
        {stats && (
          <>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <span className="text-lg font-bold text-theme-foreground">{stats.totalSessions}</span>
              <span className="text-xs text-theme-foreground-muted block">This Week</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <span className="text-lg font-bold text-theme-foreground">{stats.totalHours}h</span>
              <span className="text-xs text-theme-foreground-muted block">Focus Time</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
