import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'WRITER' | 'LEGAL' | 'MANAGER' | 'PUBLISHER' | 'STAFF' | 'VIEWER' | 'CUSTOMER';
  firstName?: string;
  lastName?: string;
  writerIpiNumber?: string;
  publisherIpiNumber?: string;
  canUploadStatements?: boolean;
  producer?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  // Impersonation state
  isImpersonating: boolean;
  originalToken: string | null;
  originalUser: User | null;
  // Actions
  setAuth: (user: User, token: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  // Impersonation actions
  startImpersonation: (impersonatedUser: User, impersonationToken: string) => void;
  stopImpersonation: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isImpersonating: false,
      originalToken: null,
      originalUser: null,

      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },

      updateUser: (user) => {
        set({ user });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
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
        // Update localStorage with impersonation token
        localStorage.setItem('token', impersonationToken);
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
          // Restore original token in localStorage
          localStorage.setItem('token', currentState.originalToken);
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
