import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth.store';

// Components
import CommandPalette from './components/CommandPalette';
import { ChatWidget } from './components/chat';

// Pages
import LandingPage from './pages/LandingPageNew';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import WriterDashboard from './pages/WriterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerTourMilesPage from './pages/CustomerTourMilesPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import ApplicationPage from './pages/ApplicationPage';
import PubDealSimulatorPage from './pages/PubDealSimulatorPage';
import ConsultationFormPage from './pages/ConsultationFormPage';
import CaseStudyPage from './pages/CaseStudyPage';
import RoyaltyPortalPage from './pages/RoyaltyPortalPage';
import OpportunitiesToolPage from './pages/OpportunitiesToolPage';
import AdvanceEstimatorToolPage from './pages/AdvanceEstimatorToolPage';
import SettingsPage from './pages/SettingsPage';
import WorkRegistrationTool from './pages/WorkRegistrationTool';
import MySubmissions from './pages/MySubmissions';
import ProducerTourMilesPage from './pages/ProducerTourMilesPage';
import WriterTourHubPage from './pages/WriterTourHubPage';
import MetadataIndexPage from './pages/MetadataIndexPage';
import PricingPage from './pages/PricingPage';
import TypeBeatVideoMakerPage from './pages/TypeBeatVideoMakerPage';
import AffiliatesDashboard from './pages/AffiliatesDashboard';
import AffiliateManagement from './pages/AffiliateManagement';
import CustomerSupportPage from './pages/CustomerSupportPage';

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

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/apply" element={<ApplicationPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />

        {/* Tool Routes */}
        <Route path="/tools/pub-deal-simulator" element={<PubDealSimulatorPage />} />
        <Route path="/tools/consultation" element={<ConsultationFormPage />} />
        <Route path="/tools/case-study" element={<CaseStudyPage />} />
        <Route path="/tools/royalty-portal" element={<RoyaltyPortalPage />} />
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

        {/* Public Writer Profile */}
        <Route path="/writer/:slug" element={<WriterTourHubPage />} />

        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
