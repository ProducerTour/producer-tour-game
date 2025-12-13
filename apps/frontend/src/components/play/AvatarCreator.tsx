import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, User, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';

interface AvatarCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarCreated: (avatarUrl: string) => void;
}

// Ready Player Me configuration
const RPM_SUBDOMAIN = import.meta.env.VITE_RPM_SUBDOMAIN || 'producer-tour-play';

export function AvatarCreator({ isOpen, onClose, onAvatarCreated }: AvatarCreatorProps) {
  const [showIframe, setShowIframe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle messages from Ready Player Me iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    // Only accept messages from Ready Player Me
    if (!event.origin.includes('readyplayer.me')) {
      return;
    }

    try {
      const json = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

      if (json?.source !== 'readyplayerme') {
        return;
      }

      console.log('🎮 RPM Event:', json.eventName, json.data);

      switch (json.eventName) {
        case 'v1.frame.ready':
          console.log('🖼️ RPM frame ready - subscribing to events');
          // Subscribe to all events
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({
              target: 'readyplayerme',
              type: 'subscribe',
              eventName: 'v1.**'
            }),
            '*'
          );
          setIsLoading(false);
          break;

        case 'v1.avatar.exported':
          // Get the avatar URL and add optimization parameters
          const baseUrl = json.data.url;
          const optimizedUrl = `${baseUrl}?quality=medium&textureAtlas=1024&lod=1`;
          console.log('✅ Avatar exported:', optimizedUrl);
          setAvatarUrl(optimizedUrl);
          setShowIframe(false);
          onAvatarCreated(optimizedUrl);
          break;

        case 'v1.user.set':
          console.log('👤 RPM user authenticated');
          break;
      }
    } catch (e) {
      // Not a JSON message, might be a direct URL
      if (typeof event.data === 'string' && event.data.includes('models.readyplayer.me')) {
        const optimizedUrl = `${event.data}?quality=medium&textureAtlas=1024&lod=1`;
        setAvatarUrl(optimizedUrl);
        setShowIframe(false);
        onAvatarCreated(optimizedUrl);
      }
    }
  }, [onAvatarCreated]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowIframe(false);
      setIsLoading(false);
      setAvatarUrl(null);
    }
  }, [isOpen]);

  // Open the iframe avatar creator
  const openAvatarCreator = () => {
    setIsLoading(true);
    setShowIframe(true);
  };

  // Go back from iframe to initial screen
  const goBack = () => {
    setShowIframe(false);
    setIsLoading(false);
  };

  // The iframe URL with Frame API enabled
  const iframeUrl = `https://${RPM_SUBDOMAIN}.readyplayer.me/avatar?frameApi`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`relative w-full ${showIframe ? 'max-w-4xl h-[85vh]' : 'max-w-md'}`}
          >
            {/* Gradient border */}
            <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 rounded-3xl" />

            <div className={`relative bg-[#12121a] rounded-3xl overflow-hidden ${showIframe ? 'h-full flex flex-col' : 'p-8'}`}>
              {/* Background decoration (only show when not in iframe mode) */}
              {!showIframe && (
                <>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl" />
                </>
              )}

              {/* Header for iframe mode */}
              {showIframe && (
                <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-[#12121a]">
                  <button
                    onClick={goBack}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">Create Your Avatar</h3>
                    <p className="text-white/50 text-xs">Customize and click "Done" when finished</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Close button (only for non-iframe mode) */}
              {!showIframe && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Iframe Container */}
              {showIframe && (
                <div className="flex-1 relative">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#12121a] z-10">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
                        <p className="text-white/70">Loading Avatar Creator...</p>
                      </div>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src={iframeUrl}
                    className="w-full h-full border-0"
                    allow="camera *; microphone *; clipboard-write"
                    title="Ready Player Me Avatar Creator"
                  />
                </div>
              )}

              {/* Content (when not in iframe mode) */}
              {!showIframe && (
                <div className="relative z-10">
                  {/* Success State */}
                  {avatarUrl ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center"
                    >
                      <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mx-auto">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <Sparkles className="w-6 h-6 text-yellow-400 absolute top-0 right-1/4 animate-bounce" />
                      </div>

                      <h3 className="text-2xl font-black text-white mb-2">AVATAR CREATED!</h3>
                      <p className="text-white/50 mb-8">Your avatar is ready to explore Producer Tour</p>

                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={openAvatarCreator}
                          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all"
                        >
                          Edit Avatar
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={onClose}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold transition-all flex items-center gap-2 shadow-lg shadow-violet-500/25"
                        >
                          <Sparkles className="w-4 h-4" />
                          Enter World
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Initial State */
                    <div className="text-center">
                      {/* Logo */}
                      <div className="w-20 h-20 mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl rotate-12" />
                        <div className="absolute inset-1 bg-[#12121a] rounded-xl rotate-12" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <User className="w-8 h-8 text-white" />
                        </div>
                      </div>

                      <h2 className="text-2xl font-black text-white mb-2">CREATE YOUR AVATAR</h2>
                      <p className="text-white/50 mb-8">
                        Customize your Producer Tour identity with Ready Player Me
                      </p>

                      {/* Features */}
                      <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                        {[
                          { label: 'Full Body', desc: '3D avatar' },
                          { label: 'Custom Look', desc: 'Face & style' },
                          { label: 'Accessories', desc: 'Hats & more' },
                          { label: 'Animations', desc: 'Coming soon' },
                        ].map((feature) => (
                          <div
                            key={feature.label}
                            className="p-3 rounded-xl bg-white/5 border border-white/5"
                          >
                            <p className="text-white font-medium text-sm">{feature.label}</p>
                            <p className="text-white/40 text-xs">{feature.desc}</p>
                          </div>
                        ))}
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={openAvatarCreator}
                        className="w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
                      >
                        <Sparkles className="w-5 h-5" />
                        Create Avatar
                      </motion.button>

                      <p className="text-white/30 text-xs mt-4">
                        Powered by Ready Player Me
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
