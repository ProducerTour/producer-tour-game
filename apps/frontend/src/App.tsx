import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';

// ============================================================================
// LAZY-LOADED GAME PAGES
// Heavy 3D pages are loaded on-demand to reduce initial bundle size
// ============================================================================
const PlayPage = lazy(() => import('./pages/PlayPage'));
const CharacterCreatorPage = lazy(() => import('./pages/CharacterCreatorPage'));

// Auth pages (lightweight, can be eager-loaded)
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Loading fallback for lazy-loaded 3D pages
function GameLoadingFallback() {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg font-medium">Loading game...</p>
        <p className="text-slate-400 text-sm mt-1">Preparing 3D assets</p>
      </div>
    </div>
  );
}

// Simple 404 page (inline to avoid import)
function NotFoundPage() {
  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-purple-500 mb-4">404</h1>
        <p className="text-white text-lg mb-6">Page not found</p>
        <a href="/play" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
          Enter Game
        </a>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#1e293b' },
              style: { borderLeft: '4px solid #22c55e' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
              style: { borderLeft: '4px solid #ef4444' },
            },
          }}
        />

        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Game Routes */}
          <Route path="/play" element={
            <Suspense fallback={<GameLoadingFallback />}>
              <PlayPage />
            </Suspense>
          } />

          <Route path="/character-creator" element={
            <Suspense fallback={<GameLoadingFallback />}>
              <CharacterCreatorPage />
            </Suspense>
          } />

          {/* Root redirects to game */}
          <Route path="/" element={<Navigate to="/play" replace />} />

          {/* 404 Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
