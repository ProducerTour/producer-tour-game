import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth.store';
import { ThemeProvider } from './contexts/ThemeContext';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Components
import CommandPalette from './components/CommandPalette';
import { ChatWidget } from './components/chat';
import { BugReportButton } from './components/BugReportButton';
import { MobileLayout } from './components/mobile/MobileLayout';

// ============================================================================
// LAZY-LOADED PAGES
// Heavy 3D pages are loaded on-demand to reduce initial bundle size
// These include Three.js, Rapier physics, terrain generation, etc.
// ============================================================================
const PlayPage = lazy(() => import('./pages/PlayPage'));
const HoldingsInteriorPage = lazy(() => import('./pages/HoldingsInteriorPage'));
const ThumbnailGenerator = lazy(() => import('./utils/ThumbnailGenerator'));

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

// ============================================================================
// STANDARD PAGES (loaded immediately)
// ============================================================================
import { PublisherCassetteLandingPage as LandingPage } from './components/landing-page-templates/template-11-publisher-cassette';
import LandingPreview from './pages/LandingPreview';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import WriterDashboard from './pages/WriterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerTourMilesPage from './pages/CustomerTourMilesPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import ApplicationPage from './pages/ApplicationPage';
import PubDealSimulatorPage from './pages/PubDealSimulatorPage';
import ConsultationFormPage from './pages/ConsultationFormPage';
import CaseStudyPage from './pages/CaseStudyPage';
import OpportunitiesToolPage from './pages/OpportunitiesToolPage';
import AdvanceEstimatorToolPage from './pages/AdvanceEstimatorToolPage';
import SettingsPage from './pages/SettingsPage';
import WorkRegistrationTool from './pages/WorkRegistrationTool';
import MySubmissions from './pages/MySubmissions';
import ProducerTourMilesPage from './pages/ProducerTourMilesPage';
import WriterMarketplacePage from './pages/WriterMarketplacePage';
import ActivityFeedPage from './pages/ActivityFeedPage';
import WriterProfilePage from './pages/WriterProfilePage';
import MetadataIndexPage from './pages/MetadataIndexPage';
import PricingPage from './pages/PricingPage';
import TypeBeatVideoMakerPage from './pages/TypeBeatVideoMakerPage';
import SessionPayoutTool from './pages/SessionPayoutTool';
import LeakScannerPage from './pages/LeakScannerPage';
import BorderPreview from './components/test/BorderPreview';
import BrandKitPage from './pages/BrandKitPage';
import AffiliatesDashboard from './pages/AffiliatesDashboard';
import AffiliateManagement from './pages/AffiliateManagement';
import MyStorePage from './pages/MyStorePage';
import InsightsPage from './pages/InsightsPage';
import SinglePostPage from './pages/SinglePostPage';
import CustomerSupportPage from './pages/CustomerSupportPage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import ToolsPage from './pages/ToolsPage';
import TrifectaPlannerPage from './pages/TrifectaPlannerPage';
import CorporateStructurePage from './pages/CorporateStructurePage';

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Global UI components that should be hidden on game pages
function GlobalUI() {
  const { user } = useAuthStore();
  const location = useLocation();

  // Hide chat widget and bug report button on game pages
  const isGamePage = location.pathname === '/play';

  if (isGamePage) return null;

  return (
    <>
      {/* Chat Widget - visible when logged in, hidden on game pages */}
      <ChatWidget />

      {/* Bug Report Button - visible when logged in (beta), hidden on game pages */}
      {user && <BugReportButton />}

      {/* React Query Devtools - hidden on game pages */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}

function App() {
  const { user } = useAuthStore();

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
            iconTheme: {
              primary: '#22c55e',
              secondary: '#1e293b',
            },
            style: {
              borderLeft: '4px solid #22c55e',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1e293b',
            },
            style: {
              borderLeft: '4px solid #ef4444',
            },
          },
        }}
      />

      {/* Command Palette - Cmd+K / Ctrl+K */}
      <CommandPalette />

      {/* Chat Widget & Bug Report - hidden on game pages */}
      <GlobalUI />

      {/* Mobile Layout wrapper - provides bottom tab bar on mobile/native */}
      <MobileLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/apply" element={<ApplicationPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Tool Routes */}
        <Route path="/tools" element={<PrivateRoute><ToolsPage /></PrivateRoute>} />
        <Route path="/tools/pub-deal-simulator" element={<PubDealSimulatorPage />} />
        <Route path="/tools/consultation" element={<ConsultationFormPage />} />
        <Route path="/tools/case-study" element={<CaseStudyPage />} />
        <Route path="/tools/opportunities" element={<OpportunitiesToolPage />} />
        <Route path="/tools/advance-estimator" element={<AdvanceEstimatorToolPage />} />
        <Route path="/tools/metadata-index" element={<MetadataIndexPage />} />
        <Route
          path="/tools/type-beat-video-maker"
          element={
            <PrivateRoute roles={['WRITER', 'ADMIN', 'CUSTOMER']}>
              <TypeBeatVideoMakerPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/tools/session-payout"
          element={
            <PrivateRoute roles={['ADMIN', 'WRITER']}>
              <SessionPayoutTool />
            </PrivateRoute>
          }
        />
        <Route
          path="/tools/leak-scanner"
          element={
            <PrivateRoute roles={['ADMIN', 'WRITER', 'MANAGER']}>
              <LeakScannerPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/tools/trifecta-planner"
          element={
            <PrivateRoute roles={['ADMIN', 'WRITER']}>
              <TrifectaPlannerPage />
            </PrivateRoute>
          }
        />

        {/* Work Registration Routes */}
        <Route
          path="/work-registration"
          element={
            <PrivateRoute>
              <WorkRegistrationTool />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-submissions"
          element={
            <PrivateRoute>
              <MySubmissions />
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              {user?.role === 'ADMIN' ? (
                <AdminDashboard />
              ) : user?.role === 'CUSTOMER' ? (
                <CustomerDashboard />
              ) : (
                <WriterDashboard />
              )}
            </PrivateRoute>
          }
        />

        {/* Customer Routes */}
        <Route
          path="/customer"
          element={
            <PrivateRoute roles={['CUSTOMER']}>
              <CustomerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/tour-miles"
          element={
            <PrivateRoute roles={['CUSTOMER']}>
              <CustomerTourMilesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/support"
          element={
            <PrivateRoute roles={['CUSTOMER']}>
              <CustomerSupportPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer/orders"
          element={
            <PrivateRoute roles={['CUSTOMER']}>
              <CustomerOrdersPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute roles={['ADMIN']}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        {/* Affiliate Routes */}
        <Route
          path="/affiliates"
          element={
            <PrivateRoute roles={['WRITER']}>
              <AffiliatesDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/affiliates"
          element={
            <PrivateRoute roles={['ADMIN']}>
              <AffiliateManagement />
            </PrivateRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/tour-miles"
          element={
            <PrivateRoute>
              <ProducerTourMilesPage />
            </PrivateRoute>
          }
        />

        {/* My Profile - Activity Feed */}
        <Route
          path="/my-profile"
          element={
            <PrivateRoute roles={['WRITER', 'CUSTOMER', 'ADMIN']}>
              <ActivityFeedPage />
            </PrivateRoute>
          }
        />

        {/* My Store - Marketplace management */}
        <Route
          path="/my-store"
          element={
            <PrivateRoute roles={['WRITER', 'CUSTOMER', 'ADMIN']}>
              <MyStorePage />
            </PrivateRoute>
          }
        />

        {/* Insights Page - Industry news and sources */}
        <Route
          path="/insights"
          element={
            <PrivateRoute roles={['WRITER', 'CUSTOMER', 'ADMIN']}>
              <InsightsPage />
            </PrivateRoute>
          }
        />

        {/* Single Post View (for shared links) */}
        <Route path="/post/:id" element={<SinglePostPage />} />

        {/* Public User Profile (by slug or ID) */}
        <Route path="/user/:slug" element={<WriterProfilePage />} />
        <Route path="/user/id/:userId" element={<WriterProfilePage />} />

        {/* User Marketplace Shop */}
        <Route path="/user/:slug/shop" element={<WriterMarketplacePage />} />

        <Route path="/" element={<LandingPage />} />

        {/* Producer Tour Play - Music Industry Metaverse */}
        {/* Lazy-loaded 3D game pages - wrapped in Suspense for code splitting */}
        <Route path="/play" element={
          <Suspense fallback={<GameLoadingFallback />}>
            <PlayPage />
          </Suspense>
        } />

        {/* Landing Page Templates Preview */}
        <Route path="/landing-preview" element={<LandingPreview />} />

        {/* Corporate Structure (Admin Only) */}
        <Route
          path="/tools/corporate-structure"
          element={
            <PrivateRoute roles={['ADMIN']}>
              <CorporateStructurePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/tools/corporate-structure/holdings"
          element={
            <PrivateRoute roles={['ADMIN']}>
              <Suspense fallback={<GameLoadingFallback />}>
                <HoldingsInteriorPage />
              </Suspense>
            </PrivateRoute>
          }
        />

        {/* Dev/Test Routes */}
        <Route path="/test/borders" element={<BorderPreview />} />
        <Route path="/test/brand-kit" element={<BrandKitPage />} />
        <Route path="/dev/thumbnails" element={
          <div style={{ backgroundColor: '#111827', minHeight: '100vh' }}>
            <Suspense fallback={<GameLoadingFallback />}>
              <ThumbnailGenerator />
            </Suspense>
          </div>
        } />

        {/* 404 Catch-all - must be last */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </MobileLayout>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
