import React from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Phone, Menu, LogOut, User, Bell } from 'lucide-react';
import api from '@/lib/api';

export const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileMenuOpen]);
  const effectiveIsAdmin = isAdmin || (typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true');
  const adminDisplayName = effectiveIsAdmin && typeof window !== 'undefined'
    ? (localStorage.getItem('admin_display_name') || 'Admin')
    : '';
  const isLoggedInSession = Boolean(effectiveIsAdmin || user);

  const [unassignedCount, setUnassignedCount] = React.useState(0);
  const [stationAlertCount, setStationAlertCount] = React.useState(0);

  React.useEffect(() => {
    if (!effectiveIsAdmin) return;
    const fetchUnassigned = async () => {
      try {
        const res = await api.get('/complaints');
        if (Array.isArray(res.data)) {
          setUnassignedCount(res.data.filter(c => !c.station || c.station === 'Unassigned').length);
        }
      } catch {}
    };
    fetchUnassigned();
    const interval = setInterval(fetchUnassigned, 60000);
    return () => clearInterval(interval);
  }, [effectiveIsAdmin]);

  const isStationUserRole = user?.role === 'station';

  React.useEffect(() => {
    if (!isStationUserRole) return;
    const fetchPendingComplaints = async () => {
      try {
        const res = await api.get('/station/complaints');
        if (Array.isArray(res.data)) {
          setStationAlertCount(res.data.filter(c => String(c.status || '').toLowerCase() === 'pending').length);
        }
      } catch {}
    };
    fetchPendingComplaints();
    const interval = setInterval(fetchPendingComplaints, 60000);
    return () => clearInterval(interval);
  }, [isStationUserRole]);

  const navLinkClass = ({ isActive }) =>
    `whitespace-nowrap text-[11px] lg:text-xs xl:text-sm font-semibold transition-colors px-1 lg:px-1.5 xl:px-2 py-1 rounded-md ${isActive ? 'text-[#2563EB] bg-[#DBEAFE]' : 'text-[#0F172A] hover:text-[#2563EB]'}`;

  const publicLinks = [
    { to: '/', label: 'Home', testId: 'home-link' },
    { to: '/about', label: 'About', testId: 'about-link' },
    { to: '/history', label: 'History', testId: 'history-link' },
    { to: '/organization', label: 'Organization', testId: 'organization-link' },
    { to: '/awareness', label: 'Awareness', testId: 'awareness-link' },
    { to: '/services', label: 'Services', testId: 'services-link' },
  ];

  const isSRPUser = user?.role === 'srp';
  const isDGPUser = user?.role === 'dgp';
  const isDSRPUser = user?.role === 'dsrp';
  const isIRPUser = user?.role === 'irp';
  const isStationUser = user?.role === 'station';
  const isSuperiorPoliceUser = Boolean(isIRPUser || isDSRPUser || isSRPUser || isDGPUser);

  const policeDashboardPath = isDGPUser
    ? '/dgp-dashboard'
    : isSRPUser
      ? '/srp-dashboard'
      : isDSRPUser
        ? '/dsrp-dashboard'
        : isIRPUser
          ? '/irp-dashboard'
          : '/station-dashboard';

  const policeUnidentifiedBodiesPath = isSuperiorPoliceUser
    ? '/police-unidentified-bodies'
    : '/station-unidentified-bodies';

  const policeComplaintsPath = isSuperiorPoliceUser ? '/police-complaints' : '/station-complaints';

  const policeLinks = [
    { to: policeDashboardPath, label: 'Dashboard', testId: 'police-dashboard-link' },
    ...(!isStationUser ? [
      { to: policeComplaintsPath, label: 'Complaints', testId: 'police-complaints-link' },
      { to: policeUnidentifiedBodiesPath, label: 'Unidentified Bodies', testId: 'police-unidentified-link' },
    ] : []),
  ];

  const adminLinks = [
    { to: '/admin-dashboard', label: 'Dashboard', testId: 'admin-dashboard-link' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAdminLogout = () => {
    logout('/admin-login');
  };

  const loggedInDisplayName = effectiveIsAdmin ? adminDisplayName : user?.name || '';
  const isPoliceSession = Boolean(user && ['station', 'srp', 'dsrp', 'irp', 'dgp'].includes(user.role));
  const handleSessionLogout = (effectiveIsAdmin || isPoliceSession) ? handleAdminLogout : handleLogout;

  const navLinks = effectiveIsAdmin
    ? adminLinks
    : (user
      ? (['station', 'srp', 'dsrp', 'irp', 'dgp'].includes(user.role) ? policeLinks : publicLinks)
      : publicLinks);

  return (
    <header ref={menuRef} className="sticky top-0 left-0 right-0 w-full z-[1200] bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 lg:h-[76px] xl:h-20">
          <div className="flex items-center gap-3">

            {isLoggedInSession ? (
              <div className="flex items-center gap-3 select-none" data-testid="logo-link">
                <img 
                  src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png"
                  alt="AP Police Logo"
                  className="w-10 h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 object-contain"
                />
                <div>
                  <h1 className="text-sm lg:text-lg xl:text-2xl font-extrabold text-[#0F172A] heading-font leading-tight">GRP-Andhra Pradesh</h1>
                  <p className="text-xs lg:text-[11px] xl:text-sm font-bold text-gray-900">Government Railway Police</p>
                </div>
              </div>
            ) : (
              <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
                <img 
                  src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png"
                  alt="AP Police Logo"
                  className="w-10 h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 object-contain"
                />
                <div>
                  <h1 className="text-sm lg:text-lg xl:text-2xl font-extrabold text-[#0F172A] heading-font leading-tight">GRP-Andhra Pradesh</h1>
                  <p className="text-xs lg:text-[11px] xl:text-sm font-bold text-gray-900">Government Railway Police</p>
                </div>
              </Link>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-0.5 xl:gap-4">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass} data-testid={link.testId}>
                {link.label}
              </NavLink>
            ))}

            {!effectiveIsAdmin && !user && (
              <a href="tel:139" className="flex items-center gap-2 whitespace-nowrap px-3 xl:px-4 py-2 bg-[#DC2626] text-white rounded-md hover:bg-[#B91C1C] transition-colors font-semibold text-sm xl:text-base" data-testid="emergency-call-button">
                <Phone className="w-4 h-4 xl:w-5 xl:h-5" />
                139
              </a>
            )}

            {effectiveIsAdmin && (
              <Link to="/admin-complaints?unassigned=1" className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#EFF6FF] transition-colors" title="Unassigned Complaints">
                <Bell className="w-5 h-5 text-[#0F172A]" />
                {unassignedCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unassignedCount > 99 ? '99+' : unassignedCount}
                  </span>
                )}
              </Link>
            )}

            {isStationUser && (
              <Link to="/station-complaints?status=pending" className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#EFF6FF] transition-colors" title="Pending Complaints">
                <Bell className="w-5 h-5 text-[#0F172A]" />
                {stationAlertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {stationAlertCount > 99 ? '99+' : stationAlertCount}
                  </span>
                )}
              </Link>
            )}

            {(effectiveIsAdmin || isPoliceSession) ? (
              <div className="flex items-center">
                {loggedInDisplayName ? (
                  <Button
                    onClick={handleSessionLogout}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    data-testid={effectiveIsAdmin ? 'admin-session-button' : isPoliceSession ? 'police-session-button' : 'user-session-button'}
                  >
                    <User className="w-4 h-4" />
                    <span>{loggedInDisplayName}</span>
                    <LogOut className="w-4 h-4 ml-1" />
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button onClick={() => navigate('/admin-login')} variant="outline" size="sm" className="whitespace-nowrap text-xs xl:text-sm px-3 xl:px-4" data-testid="admin-login-button">
                Admin Login
              </Button>
            )}
          </div>

          <button
            className="lg:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-button"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg border-b border-gray-200 lg:hidden z-50" data-testid="mobile-menu">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
              {(effectiveIsAdmin || isPoliceSession) ? (
                <div className="flex items-center gap-2 rounded-md border border-[#60A5FA] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A]">
                  <User className="w-4 h-4" />
                  <span>{loggedInDisplayName}</span>
                </div>
              ) : null}

              {navLinks.map((link) => (
                <NavLink key={`mobile-${link.to}`} to={link.to} className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </NavLink>
              ))}
              {(effectiveIsAdmin || isPoliceSession) ? (
                <button onClick={() => { handleSessionLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 rounded-md border border-[#60A5FA] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors text-left w-fit">
                  <User className="w-4 h-4" />
                  <span>{loggedInDisplayName}</span>
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <Link to="/admin-login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-[#0F172A] hover:text-[#2563EB] px-2 py-1 rounded-md transition-colors">
                  Admin Login
                </Link>
              )}
          </div>
        </div>
      )}
    </header>
  );
};
