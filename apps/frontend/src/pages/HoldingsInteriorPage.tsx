import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { HoldingsInterior } from '../components/corporate-structure/HoldingsInterior';

// Loading screen during 3D scene initialization
function LoadingScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Entering Holdings...</h2>
        <p className="text-slate-400">Initializing corporate interior</p>
      </motion.div>
    </div>
  );
}

export default function HoldingsInteriorPage() {
  const navigate = useNavigate();

  const handleExit = () => {
    // Navigate back to the corporate structure page
    navigate('/tools/corporate-structure');
  };

  return (
    <div className="w-full h-screen bg-slate-950 relative">
      {/* Back button overlay */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        onClick={handleExit}
        className="absolute top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-lg text-white hover:bg-slate-700/80 transition-colors border border-slate-600/50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Space
      </motion.button>

      {/* Title overlay */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
      >
        <h1 className="text-2xl font-bold text-white">
          <span className="text-blue-400">Producer Tour Holdings, Inc.</span>
        </h1>
        <p className="text-center text-slate-400 text-sm">Delaware C-Corporation • Parent Company</p>
      </motion.div>

      {/* 3D Canvas */}
      <Suspense fallback={<LoadingScreen />}>
        <Canvas
          camera={{ position: [0, 5, 15], fov: 60 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
        >
          <HoldingsInterior isActive={true} onExit={handleExit} />
        </Canvas>
      </Suspense>

      {/* Instructions overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-center"
      >
        <p className="text-slate-500 text-sm">
          Click on stations to view compliance tasks and documents
        </p>
      </motion.div>
    </div>
  );
}
