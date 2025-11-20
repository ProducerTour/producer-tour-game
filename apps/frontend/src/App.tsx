import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import WriterDashboard from './pages/WriterDashboard';
import AdminDashboard from './pages/AdminDashboard';
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
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/apply" element={<ApplicationPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />

        {/* Tool Routes */}
        <Route path="/tools/pub-deal-simulator" element={<PubDealSimulatorPage />} />
        <Route path="/tools/consultation" element={<ConsultationFormPage />} />
        <Route path="/tools/case-study" element={<CaseStudyPage />} />
        <Route path="/tools/royalty-portal" element={<RoyaltyPortalPage />} />
        <Route path="/tools/opportunities" element={<OpportunitiesToolPage />} />
        <Route path="/tools/advance-estimator" element={<AdvanceEstimatorToolPage />} />

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
              {user?.role === 'ADMIN' ? <AdminDashboard /> : <WriterDashboard />}
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

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />

        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
