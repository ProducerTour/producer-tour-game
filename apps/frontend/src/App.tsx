import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import WriterDashboard from './pages/WriterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import OpportunitiesPage from './pages/OpportunitiesPage';
import ApplicationPage from './pages/ApplicationPage';
import PubDealSimulatorPage from './pages/PubDealSimulatorPage';
import ConsultationFormPage from './pages/ConsultationFormPage';
import CaseStudyPage from './pages/CaseStudyPage';
import RoyaltyPortalPage from './pages/RoyaltyPortalPage';
import OpportunitiesToolPage from './pages/OpportunitiesToolPage';
import PublishingTrackerToolPage from './pages/PublishingTrackerToolPage';
import AdvanceEstimatorToolPage from './pages/AdvanceEstimatorToolPage';

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
        <Route path="/apply" element={<ApplicationPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />

        {/* Tool Routes */}
        <Route path="/tools/pub-deal-simulator" element={<PubDealSimulatorPage />} />
        <Route path="/tools/consultation" element={<ConsultationFormPage />} />
        <Route path="/tools/case-study" element={<CaseStudyPage />} />
        <Route path="/tools/royalty-portal" element={<RoyaltyPortalPage />} />
        <Route path="/tools/opportunities" element={<OpportunitiesToolPage />} />
        <Route path="/tools/publishing-tracker" element={<PublishingTrackerToolPage />} />
        <Route path="/tools/advance-estimator" element={<AdvanceEstimatorToolPage />} />

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

        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
