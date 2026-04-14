import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { authAPI, setAuthToken as persistAuthToken, getAuthToken } from '@/lib/api';

const AuthContext = createContext();

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;   // 30 minutes idle → show warning
const WARNING_DURATION_S = 120;            // 2 minute countdown before auto-logout
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const detectAdminFromStorage = () => {
    if (typeof window === 'undefined') return false;

    if (localStorage.getItem('isAdmin') === 'true') {
      return true;
    }

    const rawToken = localStorage.getItem('grp_auth_token');
    if (!rawToken) return false;

    try {
      const payloadBase64 = rawToken.split('.')[1];
      if (!payloadBase64) return false;
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      return Boolean(payload?.is_admin || payload?.admin_id || String(payload?.role || '').toLowerCase() === 'admin');
    } catch {
      return false;
    }
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(detectAdminFromStorage());
  const [authToken, setAuthTokenState] = useState(() => getAuthToken());
  const [sessionWarning, setSessionWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION_S);

  const idleTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const logoutRef = useRef(null);

  const emitAuthChange = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('grp-auth-changed'));
    }
  };

  const updateAuthToken = (nextToken) => {
    persistAuthToken(nextToken);
    setAuthTokenState(nextToken);
  };

  useEffect(() => {
    const adminFlag = detectAdminFromStorage();
    setIsAdmin(adminFlag);

    if (!authToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (adminFlag) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requestedToken = authToken;

    setLoading(true);

    if (requestedToken) {
      authAPI.getMe()
        .then(res => {
          if (cancelled) return;
          if (getAuthToken() !== requestedToken || detectAdminFromStorage()) return;
          setUser(res.data);
        })
        .catch(() => {
          if (cancelled) return;
          if (getAuthToken() !== requestedToken) return;
          updateAuthToken(null);
          setUser(null);
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  useEffect(() => {
    const syncAuthState = () => {
      if (typeof window === 'undefined') return;
      setIsAdmin(detectAdminFromStorage());
      setAuthTokenState(getAuthToken());
    };

    window.addEventListener('storage', syncAuthState);
    window.addEventListener('grp-auth-changed', syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('grp-auth-changed', syncAuthState);
    };
  }, []);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    updateAuthToken(response.data.access_token);
    setUser(response.data.user);
    localStorage.setItem('grp_login_time', Date.now().toString());
    return response.data;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    updateAuthToken(response.data.access_token);
    setUser(response.data.user);
    localStorage.setItem('grp_login_time', Date.now().toString());
    return response.data;
  };

  const logout = () => {
    updateAuthToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('admin_display_name');
      localStorage.removeItem('admin_remember');
      localStorage.removeItem('grp_login_time');
      setIsAdmin(false);
      emitAuthChange();
    }
  };

  // Keep logoutRef current so session timer always calls the latest logout
  useEffect(() => { logoutRef.current = logout; });

  // ── Session inactivity expiry ───────────────────────────────────────────────
  const isLoggedIn = Boolean(user || isAdmin);

  const clearSessionTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearInterval(countdownIntervalRef.current);
  }, []);

  const startCountdown = useCallback(() => {
    setSessionWarning(true);
    setCountdown(WARNING_DURATION_S);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          logoutRef.current?.();
          setSessionWarning(false);
          return WARNING_DURATION_S;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (!isLoggedIn) return;
    // Dismiss warning if the user moved
    if (sessionWarning) {
      setSessionWarning(false);
      clearInterval(countdownIntervalRef.current);
    }
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
  }, [isLoggedIn, sessionWarning, startCountdown]);

  useEffect(() => {
    if (!isLoggedIn) {
      clearSessionTimers();
      setSessionWarning(false);
      return;
    }

    // Start the idle timer
    idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));

    return () => {
      clearSessionTimers();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);
  // ── End session expiry ──────────────────────────────────────────────────────

  const loginAdmin = (accessToken, adminInfo = null) => {
    updateAuthToken(accessToken);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('admin_display_name', adminInfo?.name || 'Admin');
      setIsAdmin(true);
      emitAuthChange();
    }
  };

  const loginOfficerViaAdmin = (accessToken, officerUser) => {
    updateAuthToken(accessToken);
    setUser(officerUser);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('admin_display_name');
      setIsAdmin(false);
      emitAuthChange();
    }
  };

  const handleStayLoggedIn = () => {
    setSessionWarning(false);
    clearInterval(countdownIntervalRef.current);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
  };

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const countdownDisplay = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginAdmin, loginOfficerViaAdmin, isAdmin, token: authToken }}>
      {children}

      {/* ── Session expiry warning modal ── */}
      {sessionWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-amber-50 px-6 pt-6 pb-4 flex flex-col items-center text-center border-b border-amber-100">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Session Expiring Soon</h2>
              <p className="text-sm text-gray-500 mt-1">You have been inactive for a while.</p>
            </div>

            {/* Body */}
            <div className="px-6 py-5 text-center">
              <p className="text-sm text-gray-600">Your session will automatically end in</p>
              <div className="my-3 text-4xl font-mono font-bold tracking-widest text-amber-500">
                {countdownDisplay}
              </div>
              <p className="text-sm text-gray-500">Click <span className="font-medium text-gray-700">Stay Logged In</span> to continue your session.</p>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={logout}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Log Out
              </button>
              <button
                onClick={handleStayLoggedIn}
                className="flex-1 py-2.5 rounded-xl bg-[#0F172A] text-sm font-medium text-white hover:bg-[#1e2d40] transition-colors"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
