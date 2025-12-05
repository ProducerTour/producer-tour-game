import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.producertour.app',
  appName: 'Producer Tour',
  webDir: 'dist',

  // Server configuration
  server: {
    // Use localhost in development for hot reload
    // Comment this out for production builds
    // url: 'http://localhost:5173',
    // cleartext: true,

    // Allow navigation to your API domain
    allowNavigation: ['*.producertour.com', 'api.producertour.com'],
  },

  // iOS-specific configuration
  ios: {
    // Allow mixed content for development
    allowsLinkPreview: true,
    scrollEnabled: true,
    // Use WKWebView's preferences
    preferredContentMode: 'mobile',
  },

  // Plugin configuration
  plugins: {
    // Push notification settings
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // Splash screen settings
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // Keyboard settings for better mobile UX
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
