import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  User,
  Map,
  MessageCircle,
  Users,
  Music,
  Sparkles,
  Volume2,
  VolumeX,
  Gamepad2,
  Wallet,
  ChevronRight,
  Zap,
  Crown,
  Star,
  Pause,
  Play,
  Save
} from 'lucide-react';
import { PlayWorld } from '../components/play/PlayWorld';
import { AvatarCreator } from '../components/play/AvatarCreator';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { PlayerHealthBar, AmmoDisplay, Crosshair } from '../components/play/combat/HealthBar';
import { QuestTracker } from '../components/play/quest/QuestTracker';
import { DevConsole } from '../components/play/debug';
import { UpdateOverlay } from '../components/play/UpdateOverlay';
import { userApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useGameSettings, SHADOW_MAP_SIZES } from '../store/gameSettings.store';
import { useSocket } from '../hooks/useSocket';
import { useServerVersion } from '../hooks/useServerVersion';

// Auto-save storage key
const WORLD_STATE_KEY = 'producerTour_worldState';

// World state interface for auto-save
interface WorldState {
  playerPosition: { x: number; y: number; z: number };
  avatarUrl: string | null;
  settings: {
    isMuted: boolean;
    showMiniMap: boolean;
  };
  stats: {
    level: number;
    xp: number;
  };
  lastSaved: number;
}

// Auto-save hook - saves world state continuously
function useAutoSave(state: Partial<WorldState>, interval = 5000) {
  const lastSaveRef = useRef<number>(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Save function
  const saveState = useCallback(() => {
    try {
      const existingState = localStorage.getItem(WORLD_STATE_KEY);
      const existing = existingState ? JSON.parse(existingState) : {};

      const newState: WorldState = {
        ...existing,
        ...state,
        lastSaved: Date.now(),
      };

      localStorage.setItem(WORLD_STATE_KEY, JSON.stringify(newState));
      lastSaveRef.current = Date.now();
      setSaveStatus('saved');

      // Reset status after a moment
      setTimeout(() => setSaveStatus('idle'), 1000);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [state]);

  // Auto-save on interval
  useEffect(() => {
    const timer = setInterval(() => {
      setSaveStatus('saving');
      saveState();
    }, interval);

    return () => clearInterval(timer);
  }, [saveState, interval]);

  // Save immediately when important state changes (position moved significantly)
  useEffect(() => {
    const now = Date.now();
    // Debounce: only save if more than 1 second since last save
    if (now - lastSaveRef.current > 1000) {
      saveState();
    }
  }, [state.playerPosition?.x, state.playerPosition?.z, saveState]);

  return { saveStatus, saveState };
}

// Load saved world state
function loadWorldState(): Partial<WorldState> | null {
  try {
    const saved = localStorage.getItem(WORLD_STATE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load world state:', error);
  }
  return null;
}

// Sandbox-style loading screen
function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'pulse 4s ease-in-out infinite'
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center z-10"
      >
        {/* Logo */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl rotate-45 animate-pulse" />
            <div className="absolute inset-2 bg-[#0a0a0f] rounded-xl rotate-45" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Music className="w-10 h-10 text-white" />
            </div>
          </div>
          <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 right-1/3 animate-bounce" />
        </div>

        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
          PRODUCER TOUR
        </h1>
        <p className="text-violet-400 font-medium mb-8">THE MUSIC METAVERSE</p>

        {/* Progress bar */}
        <div className="w-64 mx-auto">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-white/50 text-sm mt-3">
            {progress < 100 ? 'Loading world...' : 'Ready!'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Sandbox-style HUD button
function HudButton({
  icon: Icon,
  label,
  onClick,
  badge,
  active,
  gradient
}: {
  icon: typeof Map;
  label: string;
  onClick: () => void;
  badge?: number;
  active?: boolean;
  gradient?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative group p-3 rounded-xl backdrop-blur-xl transition-all duration-300
        ${active
          ? 'bg-violet-600/30 border-violet-500/50'
          : 'bg-black/40 border-white/10 hover:bg-white/10 hover:border-white/20'
        }
        border
      `}
      title={label}
    >
      {gradient ? (
        <div className={`w-5 h-5 rounded bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
      ) : (
        <Icon className={`w-5 h-5 ${active ? 'text-violet-400' : 'text-white/70 group-hover:text-white'}`} />
      )}
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </motion.button>
  );
}

// Mini map with Sandbox styling
function MiniMap({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative">
      {/* Gradient border effect */}
      <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500/50 via-fuchsia-500/50 to-cyan-500/50 rounded-2xl" />
      <div className="relative w-44 h-44 bg-[#12121a] rounded-2xl p-3 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">World Map</span>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xs">×</button>
        </div>

        {/* Map area */}
        <div className="w-full h-[120px] bg-black/50 rounded-lg relative overflow-hidden">
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />

          {/* Zone markers */}
          <div className="absolute top-[20%] right-[25%] w-2.5 h-2.5 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50" />
          <div className="absolute top-[20%] left-[25%] w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
          <div className="absolute bottom-[30%] left-[20%] w-2.5 h-2.5 rounded-full bg-pink-500 shadow-lg shadow-pink-500/50" />
          <div className="absolute bottom-[30%] right-[20%] w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50" />

          {/* Player marker */}
          <div className="absolute bottom-[40%] left-1/2 -translate-x-1/2">
            <div className="w-3 h-3 rounded-full bg-white shadow-lg shadow-white/50 animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-white/30 animate-ping" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Pause Menu
function PauseMenu({
  onResume,
  onSettings,
  onQuit,
  stats,
}: {
  onResume: () => void;
  onSettings: () => void;
  onQuit: () => void;
  stats: { level: number; xp: number; maxXp: number; playTime: number };
}) {
  const formatPlayTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="max-w-sm w-full mx-4"
      >
        {/* Gradient border */}
        <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 rounded-2xl opacity-50" />

        <div className="relative bg-[#12121a] rounded-2xl p-6 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/20 rounded-full blur-2xl" />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-6">
              <Pause className="w-12 h-12 text-violet-400 mx-auto mb-2" />
              <h2 className="text-2xl font-black text-white">PAUSED</h2>
              <p className="text-white/40 text-sm">Your progress is auto-saved</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{stats.level}</div>
                <div className="text-white/40 text-xs">Level</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{formatPlayTime(stats.playTime)}</div>
                <div className="text-white/40 text-xs">Play Time</div>
              </div>
            </div>

            {/* Menu buttons */}
            <div className="space-y-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onResume}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Resume
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSettings}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Settings
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onQuit}
                className="w-full py-3 px-4 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Exit to Home
              </motion.button>
            </div>

            {/* Auto-save indicator */}
            <div className="flex items-center justify-center gap-2 mt-4 text-white/30 text-xs">
              <Save className="w-3 h-3" />
              <span>World saves automatically</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Settings Panel
function SettingsPanel({ onBack }: { onBack: () => void }) {
  const {
    shadowQuality,
    renderDistance,
    fov,
    showFps,
    masterVolume,
    musicVolume,
    sfxVolume,
    mouseSensitivity,
    invertY,
    setShadowQuality,
    setRenderDistance,
    setFov,
    setShowFps,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    setMouseSensitivity,
    setInvertY,
    resetToDefaults,
  } = useGameSettings();

  const [activeTab, setActiveTab] = useState<'graphics' | 'audio' | 'controls'>('graphics');

  const tabs = [
    { id: 'graphics' as const, label: 'Graphics', icon: '🎮' },
    { id: 'audio' as const, label: 'Audio', icon: '🔊' },
    { id: 'controls' as const, label: 'Controls', icon: '🎯' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="max-w-lg w-full mx-4"
      >
        {/* Gradient border */}
        <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 rounded-2xl opacity-50" />

        <div className="relative bg-[#12121a] rounded-2xl p-6 overflow-hidden max-h-[80vh] flex flex-col">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBack}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </motion.button>
                <h2 className="text-xl font-bold text-white">Settings</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetToDefaults}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Reset to Defaults
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <span className="mr-1.5">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {activeTab === 'graphics' && (
                <>
                  {/* Shadow Quality */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm">Shadow Quality</label>
                      <span className="text-violet-400 text-xs font-mono">
                        {SHADOW_MAP_SIZES[shadowQuality]}px
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {(['off', 'low', 'medium', 'high'] as const).map((quality) => (
                        <button
                          key={quality}
                          onClick={() => setShadowQuality(quality)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all ${
                            shadowQuality === quality
                              ? 'bg-violet-600 text-white'
                              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                          }`}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Render Distance */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm">Render Distance</label>
                      <span className="text-violet-400 text-xs font-mono">{renderDistance}m</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="200"
                      value={renderDistance}
                      onChange={(e) => setRenderDistance(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>

                  {/* FOV */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm">Field of View</label>
                      <span className="text-violet-400 text-xs font-mono">{fov}°</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="120"
                      value={fov}
                      onChange={(e) => setFov(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>

                  {/* Show FPS */}
                  <div className="flex items-center justify-between py-2">
                    <label className="text-white/70 text-sm">Show FPS Counter</label>
                    <button
                      onClick={() => setShowFps(!showFps)}
                      className={`w-12 h-6 rounded-full transition-all ${
                        showFps ? 'bg-violet-600' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          showFps ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'audio' && (
                <>
                  {/* Master Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm">Master Volume</label>
                      <span className="text-violet-400 text-xs font-mono">
                        {Math.round(masterVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={masterVolume * 100}
                      onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>

                  {/* Music Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm">Music Volume</label>
                      <span className="text-violet-400 text-xs font-mono">
                        {Math.round(musicVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={musicVolume * 100}
                      onChange={(e) => setMusicVolume(Number(e.target.value) / 100)}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>

                  {/* SFX Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm">Sound Effects</label>
                      <span className="text-violet-400 text-xs font-mono">
                        {Math.round(sfxVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sfxVolume * 100}
                      onChange={(e) => setSfxVolume(Number(e.target.value) / 100)}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>

                  {/* Volume indicator */}
                  <div className="mt-4 p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 text-white/40 text-xs">
                      <Volume2 className="w-4 h-4" />
                      <span>
                        Effective music: {Math.round(masterVolume * musicVolume * 100)}% |
                        Effective SFX: {Math.round(masterVolume * sfxVolume * 100)}%
                      </span>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'controls' && (
                <>
                  {/* Mouse Sensitivity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm">Mouse Sensitivity</label>
                      <span className="text-violet-400 text-xs font-mono">
                        {mouseSensitivity.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      value={mouseSensitivity * 100}
                      onChange={(e) => setMouseSensitivity(Number(e.target.value) / 100)}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                  </div>

                  {/* Invert Y */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="text-white/70 text-sm">Invert Y-Axis</label>
                      <p className="text-white/30 text-xs">Inverts vertical camera movement</p>
                    </div>
                    <button
                      onClick={() => setInvertY(!invertY)}
                      className={`w-12 h-6 rounded-full transition-all ${
                        invertY ? 'bg-violet-600' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          invertY ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Controls reference */}
                  <div className="mt-4 p-4 bg-white/5 rounded-xl space-y-2">
                    <h3 className="text-white/70 text-sm font-medium mb-3">Controls</h3>
                    {[
                      { keys: 'WASD', action: 'Move' },
                      { keys: 'Shift', action: 'Sprint' },
                      { keys: 'Space', action: 'Jump' },
                      { keys: 'C', action: 'Crouch' },
                      { keys: 'E', action: 'Dance' },
                      { keys: 'Q', action: 'Toggle Weapon' },
                      { keys: 'Mouse', action: 'Look Around' },
                      { keys: 'ESC', action: 'Pause' },
                    ].map(({ keys, action }) => (
                      <div key={keys} className="flex items-center justify-between text-xs">
                        <span className="text-white/40">{action}</span>
                        <span className="px-2 py-0.5 bg-white/10 rounded text-white/60 font-mono">
                          {keys}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Player stats panel
function PlayerStats({ level, xp, maxXp }: { level: number; xp: number; maxXp: number }) {
  return (
    <div className="flex items-center gap-3">
      {/* Level badge */}
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <span className="text-white font-black text-sm">{level}</span>
        </div>
        <Crown className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1" />
      </div>

      {/* XP bar */}
      <div className="hidden sm:block">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white/50 text-xs">Level {level}</span>
          <span className="text-white/30 text-xs">•</span>
          <span className="text-violet-400 text-xs font-medium">{xp}/{maxXp} XP</span>
        </div>
        <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
            style={{ width: `${(xp / maxXp) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Welcome modal with Sandbox styling
function WelcomeModal({
  onEnter,
  onlineCount
}: {
  onEnter: () => void;
  onlineCount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="max-w-md w-full relative"
      >
        {/* Gradient border */}
        <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 rounded-3xl opacity-50" />

        <div className="relative bg-[#12121a] rounded-3xl p-8 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl rotate-12" />
                <div className="absolute inset-1 bg-[#12121a] rounded-xl rotate-12" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Gamepad2 className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-black text-white mb-1">PRODUCER TOUR</h1>
              <p className="text-violet-400 font-medium text-sm">THE MUSIC INDUSTRY METAVERSE</p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {[
                { icon: Music, color: 'violet', label: 'Create & Collaborate', desc: 'Build beats with other producers' },
                { icon: Users, color: 'emerald', label: 'Network & Connect', desc: 'Meet artists, A&Rs, and labels' },
                { icon: Zap, color: 'amber', label: 'Play & Earn', desc: 'Compete in challenges for rewards' },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className={`p-2 rounded-lg bg-${feature.color}-500/20`}>
                    <feature.icon className={`w-4 h-4 text-${feature.color}-400`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{feature.label}</h3>
                    <p className="text-white/40 text-xs">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Enter button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEnter}
              className="w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
            >
              ENTER WORLD
              <ChevronRight className="w-5 h-5" />
            </motion.button>

            {/* Online count */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white/50 text-sm">{onlineCount} players online</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PlayPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Socket connection for multiplayer and server version checks
  const { socket, isConnected } = useSocket();

  // Server version check - auto-refreshes when server is redeployed
  const { isUpdateAvailable, secondsUntilRefresh, refreshNow } = useServerVersion({
    socket,
    isConnected,
  });

  // Load saved state on mount
  const savedState = useRef(loadWorldState());

  const [avatarUrl, setAvatarUrl] = useState<string | null>(savedState.current?.avatarUrl || null);
  const [isAvatarCreatorOpen, setIsAvatarCreatorOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(savedState.current?.settings?.isMuted ?? false);
  const [showMiniMap, setShowMiniMap] = useState(savedState.current?.settings?.showMiniMap ?? true);
  const [showSettings, setShowSettings] = useState(false);

  // Skip welcome modal if returning from an interior (sessionStorage flag set on entry)
  const [showWelcome, setShowWelcome] = useState(() => {
    const hasEnteredBefore = sessionStorage.getItem('producerTour_hasEnteredWorld');
    return !hasEnteredBefore;
  });
  const [onlineCount] = useState(Math.floor(Math.random() * 500) + 150);

  // Player position - restore from save or use default
  const [playerCoords, setPlayerCoords] = useState(
    savedState.current?.playerPosition || { x: 0, y: 0, z: 5 }
  );

  // Player stats - restore from save or use defaults
  const [playerStats, setPlayerStats] = useState({
    level: savedState.current?.stats?.level ?? 1,
    xp: savedState.current?.stats?.xp ?? 0,
    maxXp: 1000,
    playTime: 0,
  });

  // Track play time
  useEffect(() => {
    if (showWelcome || isPaused) return;

    const timer = setInterval(() => {
      setPlayerStats(prev => ({ ...prev, playTime: prev.playTime + 1 }));
    }, 1000);

    return () => clearInterval(timer);
  }, [showWelcome, isPaused]);

  // Auto-save hook - saves every 5 seconds and on position change
  const { saveStatus } = useAutoSave({
    playerPosition: playerCoords,
    avatarUrl,
    settings: { isMuted, showMiniMap },
    stats: { level: playerStats.level, xp: playerStats.xp },
  }, 5000);

  // Handle ESC key for pause menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't pause if welcome modal or avatar creator is open
        if (showWelcome || isAvatarCreatorOpen) return;
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, isAvatarCreatorOpen]);

  // Focus container when modals close to capture keyboard events
  const focusContainer = useCallback(() => {
    // Small delay to ensure modal animations complete
    setTimeout(() => {
      containerRef.current?.focus();
    }, 100);
  }, []);

  // Load avatar on mount - from API if logged in, otherwise from localStorage
  useEffect(() => {
    const loadAvatar = async () => {
      if (user) {
        // User is logged in - load from backend
        try {
          const response = await userApi.getAvatar();
          if (response.data.avatarUrl) {
            setAvatarUrl(response.data.avatarUrl);
            console.log('Avatar loaded from backend:', response.data.avatarUrl);
          }
        } catch (error) {
          console.error('Failed to load avatar from backend:', error);
          // Fallback to localStorage
          const savedAvatar = localStorage.getItem('producerTour_avatarUrl');
          if (savedAvatar) {
            setAvatarUrl(savedAvatar);
          }
        }
      } else {
        // Guest user - load from localStorage
        const savedAvatar = localStorage.getItem('producerTour_avatarUrl');
        if (savedAvatar) {
          setAvatarUrl(savedAvatar);
        }
      }
    };
    loadAvatar();
  }, [user]);

  // Handle avatar creation - save to API if logged in, otherwise to localStorage
  const handleAvatarCreated = async (url: string) => {
    setAvatarUrl(url);
    setIsAvatarCreatorOpen(false);

    if (user) {
      // User is logged in - save to backend
      try {
        await userApi.updateAvatar(url);
        console.log('Avatar saved to backend');
      } catch (error) {
        console.error('Failed to save avatar to backend:', error);
        // Fallback to localStorage
        localStorage.setItem('producerTour_avatarUrl', url);
      }
    } else {
      // Guest user - save to localStorage
      localStorage.setItem('producerTour_avatarUrl', url);
    }
  };

  // Handle entering the world
  const handleEnterWorld = useCallback(() => {
    setShowWelcome(false);
    // Remember that user has entered the world (persists for session)
    sessionStorage.setItem('producerTour_hasEnteredWorld', 'true');
    focusContainer();
  }, [focusContainer]);

  // Handle closing avatar creator
  const handleCloseAvatarCreator = useCallback(() => {
    setIsAvatarCreatorOpen(false);
    focusContainer();
  }, [focusContainer]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="w-full h-screen bg-[#0a0a0f] relative overflow-hidden outline-none"
    >
      {/* Update Overlay - shows when server has been redeployed */}
      <UpdateOverlay
        isVisible={isUpdateAvailable}
        secondsUntilRefresh={secondsUntilRefresh}
        onRefreshNow={refreshNow}
      />

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeModal onEnter={handleEnterWorld} onlineCount={onlineCount} />
        )}
      </AnimatePresence>

      {/* Avatar Creator Modal */}
      <AvatarCreator
        isOpen={isAvatarCreatorOpen}
        onClose={handleCloseAvatarCreator}
        onAvatarCreated={handleAvatarCreated}
      />

      {/* Pause Menu */}
      <AnimatePresence>
        {isPaused && !showSettings && (
          <PauseMenu
            onResume={() => {
              setIsPaused(false);
              focusContainer();
            }}
            onSettings={() => setShowSettings(true)}
            onQuit={() => navigate('/')}
            stats={playerStats}
          />
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            onBack={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Auto-save indicator */}
      <AnimatePresence>
        {saveStatus === 'saving' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg"
          >
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-white/60 text-xs">Saving...</span>
          </motion.div>
        )}
        {saveStatus === 'saved' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg"
          >
            <Save className="w-3 h-3 text-emerald-400" />
            <span className="text-white/60 text-xs">Saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: showWelcome ? 0 : 1, y: showWelcome ? -20 : 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-0 left-0 right-0 z-50"
      >
        {/* Gradient top border */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        <div className="flex items-center justify-between p-4">
          {/* Left: Back & Stats */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="p-2.5 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>

            <PlayerStats {...playerStats} />
          </div>

          {/* Center: Logo */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">PRODUCER TOUR</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-white/40 text-xs">{onlineCount} online</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <HudButton
              icon={Wallet}
              label="Wallet"
              onClick={() => {}}
              gradient="from-amber-500 to-orange-500"
            />
            <HudButton
              icon={User}
              label="Avatar"
              onClick={() => setIsAvatarCreatorOpen(true)}
              active={!!avatarUrl}
            />
            <HudButton
              icon={MessageCircle}
              label="Chat"
              onClick={() => {}}
              badge={3}
            />
            <HudButton
              icon={Settings}
              label="Settings"
              onClick={() => {}}
            />
          </div>
        </div>
      </motion.div>

      {/* Left sidebar - Quick actions */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: showWelcome ? 0 : 1, x: showWelcome ? -20 : 0 }}
        transition={{ delay: 0.5 }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2"
      >
        {[
          { icon: Map, label: 'Map', active: showMiniMap, onClick: () => setShowMiniMap(!showMiniMap) },
          { icon: Star, label: 'Quests', onClick: () => {} },
          { icon: Users, label: 'Friends', onClick: () => {} },
        ].map((item) => (
          <HudButton
            key={item.label}
            icon={item.icon}
            label={item.label}
            onClick={item.onClick}
            active={item.active}
          />
        ))}
      </motion.div>

      {/* Mini map */}
      <AnimatePresence>
        {showMiniMap && !showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            className="absolute bottom-4 right-4 z-50"
          >
            <MiniMap onClose={() => setShowMiniMap(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom HUD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showWelcome ? 0 : 1, y: showWelcome ? 20 : 0 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-0 left-0 right-0 z-50"
      >
        <div className="flex items-center justify-between p-4">
          {/* Sound toggle */}
          <HudButton
            icon={isMuted ? VolumeX : Volume2}
            label={isMuted ? 'Unmute' : 'Mute'}
            onClick={() => setIsMuted(!isMuted)}
          />

          {/* Controls hint */}
          <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10">
            <span className="text-white/40 text-xs">
              <span className="text-white/60 font-medium">WASD</span> move •{' '}
              <span className="text-white/60 font-medium">Shift</span> sprint •{' '}
              <span className="text-white/60 font-medium">ESC</span> pause
            </span>
          </div>

          {/* Coordinates */}
          <div className="px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-xl border border-white/10">
            <span className="text-white/40 text-xs font-mono">
              X: {playerCoords.x.toFixed(0)} Y: {playerCoords.y.toFixed(0)} Z: {playerCoords.z.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Gradient bottom border */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
      </motion.div>

      {/* 3D Canvas */}
      <ErrorBoundary fallback="fullPage">
        <Suspense fallback={<LoadingScreen />}>
          <Canvas
            camera={{ position: [0, 8, 20], fov: 50 }}
            shadows
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance'
            }}
            dpr={[1, 2]}
          >
            <PlayWorld
              avatarUrl={avatarUrl || undefined}
              onPlayerPositionChange={(pos) => setPlayerCoords({ x: pos.x, y: pos.y, z: pos.z })}
            />
          </Canvas>
        </Suspense>
      </ErrorBoundary>

      {/* Game HUD Overlays */}
      <PlayerHealthBar />
      <AmmoDisplay />
      <Crosshair />
      <QuestTracker />

      {/* Dev Console - Toggle with ` key */}
      <DevConsole />
    </div>
  );
}
