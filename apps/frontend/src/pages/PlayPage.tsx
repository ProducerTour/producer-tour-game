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
  Star
} from 'lucide-react';
import { PlayWorld } from '../components/play/PlayWorld';
import { AvatarCreator } from '../components/play/AvatarCreator';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { userApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAvatarCreatorOpen, setIsAvatarCreatorOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  // Skip welcome modal if returning from an interior (sessionStorage flag set on entry)
  const [showWelcome, setShowWelcome] = useState(() => {
    const hasEnteredBefore = sessionStorage.getItem('producerTour_hasEnteredWorld');
    return !hasEnteredBefore;
  });
  const [onlineCount] = useState(Math.floor(Math.random() * 500) + 150);
  const [playerCoords, setPlayerCoords] = useState({ x: 0, y: 0, z: 5 });

  // Player stats (placeholder)
  const playerStats = { level: 5, xp: 2450, maxXp: 5000 };

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
              <span className="text-white/60 font-medium">Arrow Keys</span> also work
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
    </div>
  );
}
