import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth.store';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import CommandPalette from './components/CommandPalette';
import { ChatWidget } from './components/chat';
import { BugReportButton } from './components/BugReportButton';

// Pages
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
import AffiliatesDashboard from './pages/AffiliatesDashboard';
import AffiliateManagement from './pages/AffiliateManagement';
import MyStorePage from './pages/MyStorePage';
import InsightsPage from './pages/InsightsPage';
import CustomerSupportPage from './pages/CustomerSupportPage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';

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

      {/* Chat Widget - visible when logged in */}
      <ChatWidget />

      {/* Bug Report Button - visible when logged in (beta) */}
      {user && <BugReportButton />}

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

        {/* Public User Profile (by slug or ID) */}
        <Route path="/user/:slug" element={<WriterProfilePage />} />
        <Route path="/user/id/:userId" element={<WriterProfilePage />} />

        {/* User Marketplace Shop */}
        <Route path="/user/:slug/shop" element={<WriterMarketplacePage />} />

        <Route path="/" element={<LandingPage />} />

        {/* Landing Page Templates Preview */}
        <Route path="/landing-preview" element={<LandingPreview />} />

        {/* 404 Catch-all - must be last */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
