import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ChatBot } from '@/components/ChatBot';
import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import { HistoryPage } from '@/pages/HistoryPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import { seedData } from '@/lib/api';
import '@/App.css';

class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    if (error && error.name === 'ChunkLoadError') {
      window.location.reload();
      return { hasError: true };
    }
    return { hasError: false };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load heavy pages
const ComplaintPage = React.lazy(() => import('@/pages/ComplaintPage').then(m => ({ default: m.ComplaintPage })));
const WomenSafetyPage = React.lazy(() => import('@/pages/WomenSafetyPage').then(m => ({ default: m.WomenSafetyPage })));
const HelpDeskPage = React.lazy(() => import('@/pages/HelpDeskPage').then(m => ({ default: m.HelpDeskPage })));
const StationsPage = React.lazy(() => import('@/pages/StationsPage').then(m => ({ default: m.StationsPage })));
const AdminLoginPage = React.lazy(() => import('@/pages/AdminLoginPage'));
const AwarenessPage = React.lazy(() => import('@/pages/AwarenessPage').then(m => ({ default: m.AwarenessPage })));
const ServicesPage = React.lazy(() => import('@/pages/ServicesPage').then(m => ({ default: m.ServicesPage })));
const OrganizationPage = React.lazy(() => import('@/pages/OrganizationPage').then(m => ({ default: m.OrganizationPage })));
const MobileTrackingPage = React.lazy(() => import('@/pages/MobileTrackingPage').then(m => ({ default: m.MobileTrackingPage })));
const AdminUsersPage = React.lazy(() => import('@/pages/AdminUsersPage'));
const AdminGalleryPage = React.lazy(() => import('@/pages/AdminGalleryPage'));
const AdminDashboardPage = React.lazy(() => import('@/pages/AdminDashboardPage'));
const AdminHelpRequestsPage = React.lazy(() => import('@/pages/AdminHelpRequestsPage'));
const AdminStationsPage = React.lazy(() => import('@/pages/AdminStationsPage'));
const AdminStaticContentPage = React.lazy(() => import('@/pages/AdminStaticContentPage'));
const AdminComplaintsPage = React.lazy(() => import('@/pages/AdminComplaintsPage'));
const StationDashboardPage = React.lazy(() => import('@/pages/StationDashboardPage').then(m => ({ default: m.StationDashboardPage })));
const IRPDashboardPage = React.lazy(() => import('@/pages/IRPDashboardPage').then(m => ({ default: m.IRPDashboardPage })));
const DSRPDashboardPage = React.lazy(() => import('@/pages/DSRPDashboardPage').then(m => ({ default: m.DSRPDashboardPage })));
const SRPDashboardPage = React.lazy(() => import('@/pages/SRPDashboardPage').then(m => ({ default: m.SRPDashboardPage })));
const DGPDashboardPage = React.lazy(() => import('@/pages/DGPDashboardPage').then(m => ({ default: m.DGPDashboardPage })));
const PoliceComplaintsPage = React.lazy(() => import('@/pages/PoliceComplaintsPage').then(m => ({ default: m.PoliceComplaintsPage })));
const StationComplaintsPage = React.lazy(() => import('@/pages/StationComplaintsPage'));
const PoliceReportItemsPage = React.lazy(() => import('@/pages/PoliceReportItemsPage').then(m => ({ default: m.PoliceReportItemsPage })));
const IndiaRailwaysPage = React.lazy(() => import('@/pages/IndiaRailways'));

const UnidentifiedBodiesPage = React.lazy(() => import('@/pages/UnidentifiedBodiesPage'));
const StationUnidentifiedBodiesPage = React.lazy(() => import('@/pages/StationUnidentifiedBodiesPage'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

const OFFICER_ROLES = ['police', 'officer', 'station', 'srp', 'dsrp', 'irp', 'dgp', 'adgp', 'dig'];

const PoliceRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!OFFICER_ROLES.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const StationPoliceRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Superior officers see the public unidentified bodies page
  if (['srp', 'dsrp', 'irp', 'dgp', 'adgp', 'dig'].includes(user.role)) {
    return <Navigate to="/unidentified-bodies" replace />;
  }

  // Only station users and legacy police role can access station upload page
  if (!['police', 'officer', 'station'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ScrollManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

const AppContent = () => {
  const { isAdmin } = useAuth();
  const effectiveIsAdmin = isAdmin || (typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true');

  useEffect(() => {
    // Seed initial data
    seedData().catch(err => console.log('Seed data already exists or error:', err));
  }, []);

  return (
    <div className="App" style={{overflowX: 'hidden', maxWidth: '100vw'}}>
      <ScrollManager />
      <Header />
      <ChunkErrorBoundary>
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
        </div>
      }>
        <Routes>
          <Route path="/unidentified-bodies" element={<UnidentifiedBodiesPage />} />
          <Route path="/station-unidentified-bodies" element={<StationPoliceRoute><StationUnidentifiedBodiesPage /></StationPoliceRoute>} />
          <Route
            path="/"
            element={
              effectiveIsAdmin ? (
                <Navigate to="/admin-dashboard" replace />
              ) : (
                <HomePage />
              )
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/admin-dashboard"
            element={
              effectiveIsAdmin ? (
                <AdminDashboardPage />
              ) : (
                <Navigate to="/admin-login" replace />
              )
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/organization" element={<OrganizationPage />} />
          <Route path="/mobile-tracking" element={<MobileTrackingPage />} />
          <Route path="/complaint" element={<ComplaintPage />} />
          <Route path="/login" element={<Navigate to="/complaint" replace />} />
          <Route path="/dashboard" element={<Navigate to="/complaint" replace />} />
          <Route path="/station-dashboard" element={<PoliceRoute><StationDashboardPage /></PoliceRoute>} />
          <Route path="/irp-dashboard" element={<PoliceRoute><IRPDashboardPage /></PoliceRoute>} />
          <Route path="/dsrp-dashboard" element={<PoliceRoute><DSRPDashboardPage /></PoliceRoute>} />
          <Route path="/srp-dashboard" element={<PoliceRoute><SRPDashboardPage /></PoliceRoute>} />
          <Route path="/dgp-dashboard" element={<PoliceRoute><DGPDashboardPage /></PoliceRoute>} />
          <Route path="/police-complaints" element={<PoliceRoute><PoliceComplaintsPage /></PoliceRoute>} />
          <Route path="/station-complaints" element={<PoliceRoute><StationComplaintsPage /></PoliceRoute>} />
          <Route path="/police-report-items" element={<PoliceRoute><PoliceReportItemsPage /></PoliceRoute>} />
          <Route path="/women-safety" element={<WomenSafetyPage />} />
          <Route path="/help-desk" element={<HelpDeskPage />} />
          <Route path="/stations" element={<StationsPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route
            path="/admin-users"
            element={
              effectiveIsAdmin ? (
                <AdminUsersPage />
              ) : (
                <Navigate to="/admin-login" replace />
              )
            }
          />
          <Route
            path="/admin-gallery"
            element={
              effectiveIsAdmin ? (
                <AdminGalleryPage />
              ) : (
                <Navigate to="/admin-login" replace />
              )
            }
          />
          <Route
            path="/admin/help-requests"
            element={
              effectiveIsAdmin ? (
                <AdminHelpRequestsPage />
              ) : (
                <Navigate to="/admin-login" replace />
              )
            }
          />
          <Route path="/awareness" element={<AwarenessPage />} />
          <Route
            path="/admin/stations"
            element={
              effectiveIsAdmin ? (
                <AdminStationsPage />
              ) : (
                <Navigate to="/admin-login" replace />
              )
            }
          />
          <Route
            path="/admin-complaints"
            element={
              effectiveIsAdmin ? (
                <AdminComplaintsPage />
              ) : (
                <Navigate to="/admin-login" replace />
              )
            }
          />
          <Route
            path="/admin/content"
            element={
              effectiveIsAdmin ? (
                <Navigate to="/admin/content/home" replace />
              ) : (
                <Navigate to="/admin-login" replace />
              )
            }
          />
          <Route
            path="/admin/content/:pageKey"
            element={
              effectiveIsAdmin ? (
                <AdminStaticContentPage />
              ) : (
                <Navigate to="/admin-login" replace />
              )
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/indian-railways" element={<IndiaRailwaysPage />} />
        </Routes>
      </React.Suspense>
      </ChunkErrorBoundary>
      <Footer />
      <ChatBot />
      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
