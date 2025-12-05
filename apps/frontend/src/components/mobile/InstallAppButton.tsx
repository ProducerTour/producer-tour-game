import { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share, Plus } from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { cn } from '../../lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * InstallAppButton - Prompts users to install the PWA
 *
 * On Android/Chrome: Shows native install prompt
 * On iOS Safari: Shows instructions modal for "Add to Home Screen"
 * On Desktop: Shows install prompt if supported
 *
 * Automatically hides if:
 * - Already running as installed PWA
 * - Already running in native Capacitor app
 * - User dismissed the prompt before
 */
export function InstallAppButton({
  variant = 'default',
  className
}: {
  variant?: 'default' | 'banner' | 'minimal';
  className?: string;
}) {
  const { isNative, isPWA, platform } = usePlatform();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa-install-dismissed') === 'true';
  });

  // Check if we're on iOS Safari
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !('MSStream' in window) &&
    /Safari/.test(navigator.userAgent) &&
    !/CriOS|FxiOS|OPiOS|EdgiOS/.test(navigator.userAgent);

  useEffect(() => {
    // Listen for the beforeinstallprompt event (Chrome/Edge/Samsung)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // On iOS, we always show the option (manual instructions)
    if (isIOSSafari && !isPWA) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIOSSafari, isPWA]);

  // Don't show if already in app or dismissed
  if (isNative || isPWA || dismissed || !isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOSSafari) {
      // Show iOS instructions modal
      setShowIOSModal(true);
    } else if (deferredPrompt) {
      // Trigger native install prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // iOS Instructions Modal
  const IOSInstructionsModal = () => (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface border-t border-white/10 rounded-t-3xl p-6 pb-10 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-theme-foreground">Install Producer Tour</h3>
          <button
            onClick={() => setShowIOSModal(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-text-secondary">
            Install Producer Tour on your iPhone for the best experience:
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Share className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-theme-foreground">1. Tap the Share button</p>
                <p className="text-sm text-text-secondary">At the bottom of Safari's toolbar</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium text-theme-foreground">2. Tap "Add to Home Screen"</p>
                <p className="text-sm text-text-secondary">Scroll down in the share menu to find it</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-theme-foreground">3. Tap "Add"</p>
                <p className="text-sm text-text-secondary">The app will appear on your home screen!</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowIOSModal(false)}
          className="w-full mt-6 py-3 bg-brand-blue hover:bg-brand-blue/90 text-white font-medium rounded-xl transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );

  // Different button variants
  if (variant === 'banner') {
    return (
      <>
        <div className={cn(
          "fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm z-40",
          "bg-gradient-to-r from-brand-blue/90 to-purple-600/90 backdrop-blur-lg",
          "border border-white/20 rounded-2xl p-4 shadow-2xl",
          className
        )}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">Get the App</p>
              <p className="text-sm text-white/70 truncate">Install for the best experience</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-white text-brand-blue font-medium rounded-xl hover:bg-white/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        </div>
        {showIOSModal && <IOSInstructionsModal />}
      </>
    );
  }

  if (variant === 'minimal') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm",
            "text-text-secondary hover:text-white transition-colors",
            className
          )}
        >
          <Download className="w-4 h-4" />
          <span>Install App</span>
        </button>
        {showIOSModal && <IOSInstructionsModal />}
      </>
    );
  }

  // Default variant
  return (
    <>
      <button
        onClick={handleInstallClick}
        className={cn(
          "flex items-center gap-3 px-6 py-3",
          "bg-gradient-to-r from-brand-blue to-purple-600",
          "hover:from-brand-blue/90 hover:to-purple-600/90",
          "text-white font-medium rounded-xl",
          "shadow-lg shadow-brand-blue/20",
          "transition-all hover:shadow-xl hover:shadow-brand-blue/30",
          className
        )}
      >
        <Smartphone className="w-5 h-5" />
        <span>Get the Mobile App</span>
        <Download className="w-4 h-4 opacity-70" />
      </button>
      {showIOSModal && <IOSInstructionsModal />}
    </>
  );
}

export default InstallAppButton;
