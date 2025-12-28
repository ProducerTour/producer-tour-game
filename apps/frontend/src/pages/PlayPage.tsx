import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, Stats } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  User,
  Users,
  Music,
  Volume2,
  Gamepad2,
  ChevronRight,
  Zap,
  Pause,
  Play,
  Save,
  UserRoundCog,
} from 'lucide-react';
import { Leva } from 'leva';
import { PlayWorld, type PlayerInfo } from '../components/play/PlayWorld';
import { useTerrainPreloader } from '../components/play/hooks/useTerrainPreloader';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Crosshair, HotbarHUD, DeathOverlay } from '../components/play/hud';
import { GTAMinimap, CreatorWorldLoadingScreen } from '../components/play/ui';
import { DevConsole, DevPanel } from '../components/play/debug';
import { UpdateOverlay } from '../components/play/UpdateOverlay';
import { KeybindsMenu } from '../components/play/settings';
import { WorldMap } from '../components/play/ui/WorldMap';
import { InventorySystem } from '../components/play/inventory';
import { useInventoryStore } from '../lib/economy/inventoryStore';
import { addSampleItemsToInventory, getItemById } from '../lib/economy/itemDatabase';
import { userApi, avatarApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import type { CharacterConfig } from '../lib/character/types';
import { useGameSettings, SHADOW_MAP_SIZES } from '../store/gameSettings.store';
import { useSocket } from '../hooks/useSocket';
import { useServerVersion } from '../hooks/useServerVersion';
import { DEFAULT_WORLD_CONFIG } from '../lib/config';
// Grass now loads progressively - store no longer needed for blocking

// Auto-save storage key
const WORLD_STATE_KEY = 'producerTour_worldState';

// World state interface for auto-save
interface WorldState {
  playerPosition: { x: number; y: number; z: number };
  avatarUrl: string | null;
  settings: {
    isMuted: boolean;
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






// Pause Menu
function PauseMenu({
  onResume,
  onSettings,
  onCustomize,
  onQuit,
  stats,
}: {
  onResume: () => void;
  onSettings: () => void;
  onCustomize: () => void;
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
                onClick={onCustomize}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <UserRoundCog className="w-5 h-5" />
                Customize Character
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
    fogEnabled,
    fov,
    showFps,
    masterVolume,
    musicVolume,
    sfxVolume,
    mouseSensitivity,
    invertY,
    setShadowQuality,
    setRenderDistance,
    setFogEnabled,
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
  const [showKeybinds, setShowKeybinds] = useState(false);

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

                  {/* Fog Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-white/70 text-sm">Distance Fog</label>
                    <button
                      onClick={() => setFogEnabled(!fogEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        fogEnabled ? 'bg-violet-600' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          fogEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Render Distance (controls fog far) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 text-sm">Render Distance</label>
                      <span className="text-violet-400 text-xs font-mono">{renderDistance}m</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="400"
                      step="10"
                      value={renderDistance}
                      onChange={(e) => setRenderDistance(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      disabled={!fogEnabled}
                    />
                    <p className="text-white/40 text-xs">
                      {fogEnabled ? 'Controls how far you can see before fog appears' : 'Enable fog to adjust render distance'}
                    </p>
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
                  {/* Customize Keybinds Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowKeybinds(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mb-4"
                  >
                    <Gamepad2 className="w-5 h-5" />
                    Customize Keybinds
                  </motion.button>

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

                  {/* Quick reference - non-editable info */}
                  <div className="mt-4 p-4 bg-white/5 rounded-xl space-y-2">
                    <h3 className="text-white/70 text-sm font-medium mb-3">Quick Reference</h3>
                    <p className="text-white/30 text-xs">Click "Customize Keybinds" above to change these controls</p>
                    <div className="flex items-center justify-between text-xs mt-2">
                      <span className="text-white/40">Aim</span>
                      <span className="px-2 py-0.5 bg-white/10 rounded text-white/60 font-mono">
                        Right Click
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Fire</span>
                      <span className="px-2 py-0.5 bg-white/10 rounded text-white/60 font-mono">
                        Left Click
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/40">Pause</span>
                      <span className="px-2 py-0.5 bg-white/10 rounded text-white/60 font-mono">
                        ESC
                      </span>
                    </div>
                  </div>

                  {/* Keybinds Menu */}
                  <KeybindsMenu isOpen={showKeybinds} onClose={() => setShowKeybinds(false)} />
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
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

  // Admin check for debug panel access
  const isAdmin = user?.role === 'ADMIN';

  // Game settings - for weapon editor visibility
  const { showWeaponEditor, toggleWeaponEditor } = useGameSettings();

  // F1 key to toggle debug panel (Leva) - admin only
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' && isAdmin) {
        e.preventDefault();
        toggleWeaponEditor();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleWeaponEditor, isAdmin]);

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
  const [avatarConfig, setAvatarConfig] = useState<CharacterConfig | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  // Adaptive DPR - starts at 1.5, scales down on low FPS, up on high FPS
  const [dpr, setDpr] = useState(1);
  const [isMuted, _setIsMuted] = useState(savedState.current?.settings?.isMuted ?? false);
  void _setIsMuted; // Reserved for future use
  const [showSettings, setShowSettings] = useState(false);
  const [showFps, setShowFps] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [playerRotation, setPlayerRotation] = useState(0); // Y-axis rotation in radians
  // Use WorldConfig defaults to ensure physics preload matches visual terrain
  const [terrainSettings, setTerrainSettings] = useState({
    seed: DEFAULT_WORLD_CONFIG.terrainSeed,
    terrainRadius: DEFAULT_WORLD_CONFIG.terrainRadius,
  });

  // Preload exact terrain geometry for physics - shows real loading progress
  const {
    progress: terrainProgress,
    message: terrainMessage,
    isReady: terrainReady,
    terrain: preloadedTerrain,
  } = useTerrainPreloader({
    seed: terrainSettings.seed,
    chunkRadius: terrainSettings.terrainRadius,
    autoStart: true,
  });

  // Track shader preloading (done in hidden Canvas during loading screen)
  const [weaponsReady, setWeaponsReady] = useState(false);
  const [grassReady, setGrassReady] = useState(false);
  const [grassGenerationProgress, setGrassGenerationProgress] = useState(0);

  const handleWeaponsReady = useCallback(() => {
    setWeaponsReady(true);
    console.log('🔫 Weapon shaders ready');
  }, []);

  const handleGrassReady = useCallback(() => {
    setGrassReady(true);
    console.log('🌾 Grass shaders ready');
  }, []);

  const handleGrassGenerationProgress = useCallback((percent: number) => {
    setGrassGenerationProgress(percent);
    if (percent === 100) {
      console.log('🌾 Grass generation complete');
    }
  }, []);

  // Shaders ready = can mount Canvas (so GrassManager can start generating)
  const shadersReady = terrainReady && weaponsReady && grassReady;

  // Game fully ready when shaders compiled AND grass has generated enough
  // Wait for 80% grass generation to minimize lag after loading screen
  // (higher threshold = longer load but smoother gameplay start)
  const isFullyLoaded = shadersReady && grassGenerationProgress >= 80;

  // Listen for /fps command from DevConsole
  useEffect(() => {
    const handleToggleFps = () => setShowFps(prev => !prev);
    window.addEventListener('devConsole:toggleFps', handleToggleFps);
    return () => window.removeEventListener('devConsole:toggleFps', handleToggleFps);
  }, []);

  // Populate sample items on first load (for testing)
  useEffect(() => {
    const slots = useInventoryStore.getState().slots;
    // Only add sample items if inventory is empty
    if (slots.size === 0) {
      const addItem = useInventoryStore.getState().addItem;
      addSampleItemsToInventory(addItem);
      console.log('Added sample items to inventory for testing');
    }
  }, []);

  // Migrate existing items to ensure they have proper metadata from the database
  // This fixes items that were persisted before their metadata (e.g., placeableConfig) was added
  useEffect(() => {
    const { slots, hotbarSlots, setHotbarSlot } = useInventoryStore.getState();
    let updated = false;

    // Update hotbar items with latest metadata from database
    const newHotbarSlots = hotbarSlots.map((slot) => {
      if (!slot?.item) return slot;
      const dbItem = getItemById(slot.item.id);
      if (dbItem && dbItem.metadata && JSON.stringify(dbItem.metadata) !== JSON.stringify(slot.item.metadata)) {
        console.log(`[Migration] Updating hotbar item "${slot.item.name}" with latest metadata`);
        updated = true;
        return { ...slot, item: { ...slot.item, metadata: dbItem.metadata } };
      }
      return slot;
    });

    if (updated) {
      newHotbarSlots.forEach((slot, index) => {
        if (slot !== hotbarSlots[index]) {
          setHotbarSlot(index, slot);
        }
      });
    }

    // Update inventory items with latest metadata from database
    const newSlots = new Map(slots);
    for (const [slotId, slot] of slots) {
      const dbItem = getItemById(slot.item.id);
      if (dbItem && dbItem.metadata && JSON.stringify(dbItem.metadata) !== JSON.stringify(slot.item.metadata)) {
        console.log(`[Migration] Updating inventory item "${slot.item.name}" with latest metadata`);
        newSlots.set(slotId, { ...slot, item: { ...slot.item, metadata: dbItem.metadata } });
        updated = true;
      }
    }

    if (updated && newSlots.size > 0) {
      useInventoryStore.setState({ slots: newSlots });
    }
  }, []);

  // Skip welcome modal if returning from an interior (sessionStorage flag set on entry)
  const [showWelcome, setShowWelcome] = useState(() => {
    const hasEnteredBefore = sessionStorage.getItem('producerTour_hasEnteredWorld');
    return !hasEnteredBefore;
  });
  const [onlineCount] = useState(Math.floor(Math.random() * 500) + 150);
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerInfo[]>([]);

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
  useAutoSave({
    playerPosition: playerCoords,
    avatarUrl,
    settings: { isMuted },
    stats: { level: playerStats.level, xp: playerStats.xp },
  }, 5000);

  // Handle ESC key for pause menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't pause if welcome modal is open
        if (showWelcome) return;
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome]);

  // Handle M key for world map toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        // Don't toggle map if welcome modal or pause is open
        if (showWelcome || isPaused) return;
        e.preventDefault();
        setShowWorldMap(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, isPaused]);

  // Sync inventory open state with the inventory store
  const setInventoryOpen = useInventoryStore((s) => s.setInventoryOpen);

  // Handle Tab/I key for inventory toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab' || e.code === 'KeyI') {
        // Don't toggle inventory if welcome modal or pause is open
        if (showWelcome || isPaused) return;
        e.preventDefault();
        setShowInventory(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, isPaused]);

  // Sync showInventory state with store for other components to read
  useEffect(() => {
    setInventoryOpen(showInventory);
  }, [showInventory, setInventoryOpen]);

  // Release pointer lock when inventory opens (show cursor)
  useEffect(() => {
    if (showInventory) {
      // Exit pointer lock to show cursor
      document.exitPointerLock?.();
    }
  }, [showInventory]);

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
          // Load RPM avatar URL (legacy)
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

        // Load custom avatar config (new system)
        try {
          const configResponse = await avatarApi.getConfig();
          if (configResponse.data.config) {
            setAvatarConfig(configResponse.data.config as CharacterConfig);
            console.log('Custom avatar config loaded from backend');
          }
        } catch (error) {
          // Custom avatar config is optional - don't log error if not found
          console.log('No custom avatar config found, using RPM avatar if available');
        }
      } else {
        // Guest user - load from localStorage
        const savedAvatar = localStorage.getItem('producerTour_avatarUrl');
        if (savedAvatar) {
          setAvatarUrl(savedAvatar);
        }
        // Load custom avatar config from localStorage for guests
        const savedConfig = localStorage.getItem('producerTour_avatarConfig');
        if (savedConfig) {
          try {
            setAvatarConfig(JSON.parse(savedConfig) as CharacterConfig);
          } catch (e) {
            console.error('Failed to parse saved avatar config:', e);
          }
        }
      }
    };
    loadAvatar();
  }, [user]);

  // Navigate to character creator
  const openCharacterCreator = useCallback(() => {
    navigate('/character-creator');
  }, [navigate]);

  // Handle entering the world
  const handleEnterWorld = useCallback(() => {
    setShowWelcome(false);
    // Remember that user has entered the world (persists for session)
    sessionStorage.setItem('producerTour_hasEnteredWorld', 'true');
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

      {/* Leva debug panel - admin only, toggle with F1 key or /weaponedit command */}
      <Leva
        hidden={!isAdmin || !showWeaponEditor}
        collapsed={false}
        titleBar={{ drag: true }}
        theme={{
          sizes: {
            rootWidth: '380px',
            controlWidth: '200px',
          },
        }}
      />

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeModal onEnter={handleEnterWorld} onlineCount={onlineCount} />
        )}
      </AnimatePresence>

      {/* Pause Menu */}
      <AnimatePresence>
        {isPaused && !showSettings && (
          <PauseMenu
            onResume={() => {
              setIsPaused(false);
              focusContainer();
            }}
            onSettings={() => setShowSettings(true)}
            onCustomize={() => navigate('/character-creator')}
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

      {/* Character Creator Button - Top Right */}
      {!showWelcome && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-4 right-4 z-50"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCharacterCreator}
            className={`
              p-3 rounded-xl backdrop-blur-xl transition-all duration-300
              ${avatarConfig
                ? 'bg-violet-600/30 border-violet-500/50'
                : 'bg-black/40 border-white/10 hover:bg-white/10 hover:border-white/20'
              }
              border
            `}
            title="Customize Character"
          >
            <User className={`w-5 h-5 ${avatarConfig ? 'text-violet-400' : 'text-white/70'}`} />
          </motion.button>
        </motion.div>
      )}

      {/* Loading Screen - shows until terrain, shaders, AND grass generation are ready */}
      {!isFullyLoaded && (
        <CreatorWorldLoadingScreen
          progress={
            !shadersReady
              ? terrainProgress
              : Math.min(100, 50 + grassGenerationProgress / 2)  // Show 50-100% during grass gen
          }
          message={
            !terrainReady ? terrainMessage :
            !weaponsReady ? 'Compiling weapon shaders...' :
            !grassReady ? 'Compiling grass shaders...' :
            grassGenerationProgress < 50 ? `Generating grass... ${grassGenerationProgress}%` :
            'Ready!'
          }
          shouldPreloadWeapons={terrainReady && !weaponsReady}
          onWeaponsReady={handleWeaponsReady}
          shouldPreloadGrass={terrainReady && weaponsReady && !grassReady}
          onGrassReady={handleGrassReady}
        />
      )}

      {/* 3D Canvas - mounts when shaders ready so grass can generate in background */}
      {shadersReady && (
        <ErrorBoundary fallback="fullPage">
          <Suspense fallback={<CreatorWorldLoadingScreen progress={100} message="Initializing 3D..." />}>
            <Canvas
              camera={{ position: [0, 8, 20], fov: 50, far: 800 }}
              shadows="soft"
              gl={{
                antialias: false,
                alpha: false,
                powerPreference: 'high-performance',
                depth: true,
                stencil: false,
              }}
              dpr={dpr}
            >
              {/* Auto-adjust quality based on frame rate */}
              <PerformanceMonitor
                onIncline={() => setDpr(Math.min(2, dpr + 0.25))}
                onDecline={() => setDpr(Math.max(0.75, dpr - 0.25))}
                flipflops={3}
                onFallback={() => setDpr(1)}
              />
              {/* FPS/Performance stats - toggle via settings or /fps command */}
              {showFps && <Stats />}
              <PlayWorld
                avatarUrl={avatarUrl || undefined}
                avatarConfig={avatarConfig || undefined}
                isPaused={showInventory || isPaused}
                onPlayerPositionChange={(pos) => setPlayerCoords({ x: pos.x, y: pos.y, z: pos.z })}
                onPlayerRotationChange={setPlayerRotation}
                onTerrainSettingsChange={setTerrainSettings}
                onPlayersChange={setOnlinePlayers}
                preloadedTerrain={preloadedTerrain}
                onGrassGenerationProgress={handleGrassGenerationProgress}
              />
            </Canvas>
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Game HUD Overlays - only show when fully loaded */}
      {!showWelcome && isFullyLoaded && (
        <>
          <GTAMinimap
            playerX={playerCoords.x}
            playerZ={playerCoords.z}
            playerRotation={playerRotation}
          />
          {/* Hotbar with ammo display - always visible during gameplay */}
          <HotbarHUD />
        </>
      )}
      <Crosshair />

      {/* Death Screen Overlay */}
      <DeathOverlay />

      {/* Dev Tools */}
      <DevConsole onlinePlayers={onlinePlayers} />
      <DevPanel />

      {/* World Map Overlay - Press M to toggle */}
      <WorldMap
        isOpen={showWorldMap}
        onClose={() => setShowWorldMap(false)}
        playerX={playerCoords.x}
        playerZ={playerCoords.z}
        playerRotation={playerRotation}
        terrainRadius={terrainSettings.terrainRadius}
        seed={terrainSettings.seed}
      />

      {/* Inventory System - Press Tab or I to toggle */}
      {/* Conditionally mounted to prevent background subscriptions */}
      {showInventory && (
        <InventorySystem
          isOpen={true}
          onClose={() => setShowInventory(false)}
          avatarUrl={avatarUrl || undefined}
        />
      )}
    </div>
  );
}
