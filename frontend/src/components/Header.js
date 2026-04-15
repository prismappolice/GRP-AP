import React from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { STATIC_PAGE_OPTIONS } from '@/data/staticPageContent';
import { Phone, Menu, LogOut, User } from 'lucide-react';

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

  const navLinkClass = ({ isActive }) =>
    `text-sm font-semibold transition-colors px-2 py-1 rounded-md ${isActive ? 'text-[#2563EB] bg-[#DBEAFE]' : 'text-[#0F172A] hover:text-[#2563EB]'}`;

  const publicLinks = [
    { to: '/about', label: 'About', testId: 'about-link' },
    { to: '/history', label: 'History', testId: 'history-link' },
    { to: '/organization', label: 'Organization', testId: 'organization-link' },
    { to: '/awareness', label: 'Awareness', testId: 'awareness-link' },
    { to: '/services', label: 'Services', testId: 'services-link' },

  ];

  const userLinks = [
    { to: '/dashboard', label: 'Dashboard', testId: 'user-dashboard-link' },
    { to: '/complaint', label: 'File Complaint', testId: 'user-complaint-link' },
  ];

  const irpPhones = [
    '9247585710', '9247585711', '9247585716', '9247585717', '9247585726', '9247585727',
    '9247585728', '9247585736', '9247585737', '9247585738', '9247575608', '9247575612',
    '9247575617', '9247575620', '9247575623', '9247575627',
  ];

  const dsrpPhones = [
    '9247585709', '9247585715', '9247585725', '9247585736', '9247575603', '9247575617', '9247575626',
  ];

  const srpPhones = ['9247585800', '9247575601'];

  const normalizedPhone = String(user?.phone || '').replace(/\D+/g, '');
  const normalizedName = String(user?.name || '').toLowerCase();
  const isSRPUser = Boolean(
    user?.role === 'police' && (
      normalizedName.includes('srp') ||
      normalizedName.includes('superintendent') ||
      normalizedName.includes('vijayawada') ||
      normalizedName.includes('guntakal') ||
      srpPhones.includes(normalizedPhone)
    )
  );
  const isDGPUser = Boolean(
    user?.role === 'police' && (
      normalizedName.includes('adgp') ||
      normalizedName.includes('dgp') ||
      normalizedName.includes('dig') ||
      normalizedName.includes('director general') ||
      normalizedName.includes('directorgeneral') ||
      normalizedName.includes('deputy inspector general') ||
      normalizedName.includes('deputyinspectorgeneral')
    )
  );
  const isDSRPUser = Boolean(
    user?.role === 'police' && (
      normalizedName.includes('dsrp') ||
      normalizedName.includes('sub division') ||
      dsrpPhones.includes(normalizedPhone)
    )
  );
  const isIRPUser = Boolean(
    user?.role === 'police' && (
      normalizedName.includes('irp') ||
      normalizedName.includes('circle') ||
      irpPhones.includes(normalizedPhone)
    )
  );
  const isPoliceUser = Boolean(user?.role === 'police');
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
    ? '/unidentified-bodies'
    : '/station-unidentified-bodies';

  const policeComplaintsPath = isSuperiorPoliceUser ? '/police-complaints' : '/station-complaints';

  const policeLinks = [
    { to: policeDashboardPath, label: 'Dashboard', testId: 'police-dashboard-link' },
    { to: policeUnidentifiedBodiesPath, label: 'Unidentified Deadbodies', testId: 'police-unidentified-bodies-link' },
    { to: policeComplaintsPath, label: 'Complaints', testId: 'police-complaints-link' },
  ];

  const adminLinks = [
    { to: '/admin-dashboard', label: 'Dashboard', testId: 'admin-dashboard-link' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAdminLogout = () => {
    logout();
    navigate('/admin-login', { replace: true });
  };

  const loggedInDisplayName = effectiveIsAdmin ? adminDisplayName : user?.name || '';
  const isPoliceSession = Boolean(user && ['police', 'officer', 'station', 'srp', 'dsrp', 'irp', 'dgp', 'adgp', 'dig'].includes(user.role));
  const handleSessionLogout = (effectiveIsAdmin || isPoliceSession) ? handleAdminLogout : handleLogout;

  const navLinks = effectiveIsAdmin
    ? adminLinks
    : (user
      ? ((['police', 'officer', 'station', 'srp', 'dsrp', 'irp', 'dgp', 'adgp', 'dig'].includes(user.role)) ? policeLinks : userLinks)
      : publicLinks);

  return (
    <header ref={menuRef} className="sticky top-0 left-0 right-0 w-full z-[1200] bg-white border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3">
            {effectiveIsAdmin ? (
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] shadow-sm transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                    data-testid="admin-content-sidebar-trigger"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] pt-20 border-r border-[#E2E8F0] bg-[#F8FAFC] px-5">
                  <div className="mt-6 space-y-3">
                    {STATIC_PAGE_OPTIONS.map((page) => {
                      const isActive = location.pathname === page.adminPath;
                      return (
                        <SheetClose asChild key={page.key}>
                          <Link
                            to={page.adminPath}
                            className={`block rounded-2xl border px-4 py-3 transition-colors ${isActive ? 'border-[#2563EB] bg-[#DBEAFE]' : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]'}`}
                          >
                            <div className="text-sm font-bold text-[#0F172A]">{page.label}</div>
                            <div className="mt-1 text-xs text-[#475569]">{page.description}</div>
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            ) : null}

            {isLoggedInSession ? (
              <div className="flex items-center gap-3 select-none" data-testid="logo-link">
                <img 
                  src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png"
                  alt="AP Police Logo"
                  className="w-10 h-10 md:w-16 md:h-16 object-contain"
                />
                <div>
                  <h1 className="text-base md:text-3xl font-extrabold text-[#0F172A] heading-font leading-tight">GRP-Andhra Pradesh</h1>
                  <p className="text-xs md:text-lg font-bold text-gray-900">Government Railway Police</p>
                </div>
              </div>
            ) : (
              <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
                <img 
                  src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png"
                  alt="AP Police Logo"
                  className="w-10 h-10 md:w-16 md:h-16 object-contain"
                />
                <div>
                  <h1 className="text-base md:text-2xl font-extrabold text-[#0F172A] heading-font leading-tight">GRP-Andhra Pradesh</h1>
                  <p className="text-xs md:text-lg font-bold text-gray-900">Government Railway Police</p>
                </div>
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass} data-testid={link.testId}>
                {link.label}
              </NavLink>
            ))}

            {!effectiveIsAdmin && !user && (
              <a href="tel:139" className="flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white rounded-md hover:bg-[#B91C1C] transition-colors font-semibold" data-testid="emergency-call-button">
                <Phone className="w-4 h-4" />
                139
              </a>
            )}

            {effectiveIsAdmin || user ? (
              <div className="flex items-center">
                {loggedInDisplayName ? (
                  <Button
                    onClick={handleSessionLogout}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    data-testid={effectiveIsAdmin ? 'admin-session-button' : isPoliceUser ? 'police-session-button' : 'user-session-button'}
                  >
                    <User className="w-4 h-4" />
                    <span>{loggedInDisplayName}</span>
                    <LogOut className="w-4 h-4 ml-1" />
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button onClick={() => navigate('/admin-login')} variant="outline" size="sm" data-testid="admin-login-button">
                Admin Login
              </Button>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-button"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg border-b border-gray-200 md:hidden z-50" data-testid="mobile-menu">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
              {effectiveIsAdmin || user ? (
                <div className="flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A]">
                  <User className="w-4 h-4" />
                  <span>{loggedInDisplayName}</span>
                </div>
              ) : null}

              {navLinks.map((link) => (
                <NavLink key={`mobile-${link.to}`} to={link.to} className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  {link.label}
                </NavLink>
              ))}
              {effectiveIsAdmin || user ? (
                <button onClick={() => { handleSessionLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors text-left w-fit">
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
