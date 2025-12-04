import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'WRITER' | 'LEGAL' | 'MANAGER' | 'PUBLISHER' | 'STAFF' | 'VIEWER' | 'CUSTOMER';
  firstName?: string;
  lastName?: string;
  writerIpiNumber?: string;
  publisherIpiNumber?: string;
  canUploadStatements?: boolean;
  profileSlug?: string;
  producer?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  rememberMe: boolean;
  // Impersonation state
  isImpersonating: boolean;
  originalToken: string | null;
  originalUser: User | null;
  // Actions
  setAuth: (user: User, token: string, rememberMe?: boolean) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  // Impersonation actions
  startImpersonation: (impersonatedUser: User, impersonationToken: string) => void;
  stopImpersonation: () => void;
}

// Custom storage that respects "Remember Me" preference
// Uses localStorage for persistent sessions, sessionStorage for browser-session-only
const createDynamicStorage = (): StateStorage => {
  // Check if user previously selected "Remember Me"
  const getRememberMePreference = (): boolean => {
    try {
      // First check localStorage for the preference
      const stored = localStorage.getItem('auth-remember-me');
      return stored === 'true';
    } catch {
      return false;
    }
  };

  return {
    getItem: (name: string): string | null => {
      const rememberMe = getRememberMePreference();
      // Try localStorage first (for remembered sessions), then sessionStorage
      if (rememberMe) {
        return localStorage.getItem(name);
      }
      // For non-remembered sessions, check sessionStorage first, then localStorage
      // (to handle migration from old sessions)
      return sessionStorage.getItem(name) || localStorage.getItem(name);
    },
    setItem: (name: string, value: string): void => {
      const rememberMe = getRememberMePreference();
      if (rememberMe) {
        localStorage.setItem(name, value);
        // Clear sessionStorage if using localStorage
        sessionStorage.removeItem(name);
      } else {
        sessionStorage.setItem(name, value);
        // Clear localStorage auth if not remembering (except the remember-me preference itself)
        localStorage.removeItem(name);
      }
    },
    removeItem: (name: string): void => {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    },
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      rememberMe: localStorage.getItem('auth-remember-me') === 'true',
      isImpersonating: false,
      originalToken: null,
      originalUser: null,

      setAuth: (user, token, rememberMe = false) => {
        // Store the remember me preference
        localStorage.setItem('auth-remember-me', String(rememberMe));

        // Store token in appropriate storage
        if (rememberMe) {
          localStorage.setItem('token', token);
          sessionStorage.removeItem('token');
        } else {
          sessionStorage.setItem('token', token);
          localStorage.removeItem('token');
        }

        set({ user, token, rememberMe });
      },

      updateUser: (user) => {
        set({ user });
      },

      logout: () => {
        // Clear remember me preference
        localStorage.removeItem('auth-remember-me');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        set({
          user: null,
          token: null,
          rememberMe: false,
          isImpersonating: false,
          originalToken: null,
          originalUser: null,
        });
      },

      startImpersonation: (impersonatedUser, impersonationToken) => {
        const currentState = get();
        // Save current admin state
        set({
          originalUser: currentState.user,
          originalToken: currentState.token,
          isImpersonating: true,
          user: impersonatedUser,
          token: impersonationToken,
        });
        // Update token in appropriate storage
        if (currentState.rememberMe) {
          localStorage.setItem('token', impersonationToken);
        } else {
          sessionStorage.setItem('token', impersonationToken);
        }
      },

      stopImpersonation: () => {
        const currentState = get();
        if (currentState.isImpersonating && currentState.originalUser && currentState.originalToken) {
          // Restore original admin state
          set({
            user: currentState.originalUser,
            token: currentState.originalToken,
            isImpersonating: false,
            originalUser: null,
            originalToken: null,
          });
          // Restore original token in appropriate storage
          if (currentState.rememberMe) {
            localStorage.setItem('token', currentState.originalToken);
          } else {
            sessionStorage.setItem('token', currentState.originalToken);
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => createDynamicStorage()),
    }
  )
);
