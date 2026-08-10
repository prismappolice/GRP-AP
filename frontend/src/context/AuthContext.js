import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { authAPI, securityAPI, setAuthToken as persistAuthToken, getAuthToken } from '@/lib/api';
import { Eye, EyeOff, LoaderCircle, X } from 'lucide-react';

const AuthContext = createContext();

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;   // 30 minutes idle → show warning
const WARNING_DURATION_S = 120;            // 2 minute countdown before auto-logout
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
const getPasswordChecks = (value = '') => ([
  { label: 'Minimum 12 characters', ok: value.length >= 12 },
  { label: 'No spaces', ok: value.length > 0 && !/\s/.test(value) },
  { label: 'One uppercase letter', ok: /[A-Z]/.test(value) },
  { label: 'One lowercase letter', ok: /[a-z]/.test(value) },
  { label: 'One number', ok: /\d/.test(value) },
  { label: 'One special character', ok: /[^A-Za-z0-9]/.test(value) },
]);

const getPasswordStrength = (value = '') => {
  const passed = getPasswordChecks(value).filter(item => item.ok).length;
  if (!value) return { label: '', className: 'text-[#64748B]' };
  if (passed <= 3) return { label: 'Weak', className: 'text-[#DC2626]' };
  if (passed <= 5) return { label: 'Medium', className: 'text-[#D97706]' };
  return { label: 'Strong', className: 'text-[#16A34A]' };
};

function PasswordStrengthHint({ password }) {
  const checks = getPasswordChecks(password);
  const strength = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#0F172A]">Password strength</p>
        <p className={`text-xs font-bold ${strength.className}`}>{strength.label}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        {checks.map(item => (
          <p key={item.label} className={`text-xs ${item.ok ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
            {item.ok ? '✓' : '•'} {item.label}
          </p>
        ))}
      </div>
    </div>
  );
}

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

    // If admin_remember is set and token exists, persist admin session
    if (localStorage.getItem('admin_remember') === 'true' && localStorage.getItem('grp_auth_token')) {
      localStorage.setItem('isAdmin', 'true');
      return true;
    }

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
  const [passwordChangeForm, setPasswordChangeForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeOtp, setPasswordChangeOtp] = useState('');
  const [passwordChangeOtpLoading, setPasswordChangeOtpLoading] = useState(false);
  const [passwordChangeOtpSentTo, setPasswordChangeOtpSentTo] = useState('');
  const [passwordChangeCaptcha, setPasswordChangeCaptcha] = useState(null);
  const [passwordChangeCaptchaAnswer, setPasswordChangeCaptchaAnswer] = useState('');
  const [passwordChangeVerificationStep, setPasswordChangeVerificationStep] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });

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

  const logout = (redirectTo) => {
    authAPI.logout().catch(() => {});
    updateAuthToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('admin_display_name');
      localStorage.removeItem('admin_email');
      localStorage.removeItem('admin_remember');
      localStorage.removeItem('admin_last_login_at');
      localStorage.removeItem('admin_must_change_password');
      localStorage.removeItem('grp_login_time');
      setIsAdmin(false);
      emitAuthChange();
      if (redirectTo) {
        window.location.replace(redirectTo);
      }
    }
  };

  // Helper to detect if current session is a police/admin session (used by session timer)
  const _isAdminOrPoliceSession = () => {
    const POLICE_ROLES = ['police', 'officer', 'station', 'srp', 'dsrp', 'irp', 'dgp', 'adgp', 'dig'];
    return isAdmin || Boolean(user && POLICE_ROLES.includes(user.role));
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
          setSessionWarning(false);
          logoutRef.current?.(_isAdminOrPoliceSession() ? '/admin-login' : undefined);
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
      if (adminInfo?.email) localStorage.setItem('admin_email', adminInfo.email);
      if (adminInfo?.last_login_at) localStorage.setItem('admin_last_login_at', adminInfo.last_login_at);
      if (adminInfo?.must_change_password) localStorage.setItem('admin_must_change_password', 'true');
      else localStorage.removeItem('admin_must_change_password');
      setIsAdmin(true);
      emitAuthChange();
    }
  };

  const loginOfficerViaAdmin = (accessToken, officerUser) => {
    updateAuthToken(accessToken);
    setUser(officerUser);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('admin_remember');
      localStorage.removeItem('admin_display_name');
      localStorage.removeItem('admin_email');
      setIsAdmin(false);
      emitAuthChange();
    }
  };

  const updateCurrentUser = (nextUser) => {
    if (!nextUser) return;
    if (isAdmin || detectAdminFromStorage()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_display_name', nextUser.name || 'Admin');
        if (nextUser.email) localStorage.setItem('admin_email', nextUser.email);
        emitAuthChange();
      }
      return;
    }
    setUser(nextUser);
    emitAuthChange();
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
  const mustChangePassword = Boolean(
    user?.must_change_password ||
    (isAdmin && typeof window !== 'undefined' && localStorage.getItem('admin_must_change_password') === 'true')
  );
  const passwordMismatch = Boolean(
    passwordChangeForm.confirm_password &&
    passwordChangeForm.new_password !== passwordChangeForm.confirm_password
  );

  const loadPasswordChangeCaptcha = useCallback(async () => {
    try {
      const response = await securityAPI.getChallenge();
      setPasswordChangeCaptcha(response.data);
      setPasswordChangeCaptchaAnswer('');
    } catch {
      setPasswordChangeCaptcha(null);
    }
  }, []);

  const requestPasswordChangeOtp = async () => {
    setPasswordChangeError('');
    setPasswordChangeOtpLoading(true);
    try {
      const response = await authAPI.requestChangePasswordOtp();
      setPasswordChangeOtpSentTo(response.data.masked_email || 'registered email');
      await loadPasswordChangeCaptcha();
      setPasswordChangeVerificationStep(true);
      return true;
    } catch (error) {
      setPasswordChangeError(error?.response?.data?.detail || 'Failed to send email OTP.');
      return false;
    } finally {
      setPasswordChangeOtpLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (event) => {
    event.preventDefault();
    setPasswordChangeError('');
    if (passwordMismatch) {
      setPasswordChangeError('Passwords do not match.');
      return;
    }
    if (!passwordChangeVerificationStep) {
      setPasswordChangeLoading(true);
      await requestPasswordChangeOtp();
      setPasswordChangeLoading(false);
      return;
    }
    setPasswordChangeLoading(true);
    try {
      await authAPI.changePassword({
        current_password: passwordChangeForm.current_password,
        new_password: passwordChangeForm.new_password,
        otp: passwordChangeOtp,
        captcha_id: passwordChangeCaptcha?.captcha_id || '',
        captcha_answer: passwordChangeCaptchaAnswer,
      });
      setPasswordChangeForm({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordChangeOtp('');
      setPasswordChangeOtpSentTo('');
      setPasswordChangeCaptcha(null);
      setPasswordChangeCaptchaAnswer('');
      setPasswordChangeVerificationStep(false);
      if (typeof window !== 'undefined') localStorage.removeItem('admin_must_change_password');
      setUser(prev => prev ? { ...prev, must_change_password: false } : prev);
      logout('/admin-login');
    } catch (error) {
      setPasswordChangeError(error?.response?.data?.detail || 'Failed to change password.');
      loadPasswordChangeCaptcha();
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginAdmin, loginOfficerViaAdmin, updateCurrentUser, isAdmin, token: authToken }}>
      {children}

      {mustChangePassword && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4">
          <form onSubmit={handlePasswordChangeSubmit} className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-md p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              aria-label="Close and logout"
              onClick={() => logout('/admin-login')}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="pr-8">
              <h2 className="text-xl font-extrabold text-[#0F172A]">Set a New Password</h2>
              <p className="mt-1 text-sm text-[#475569]">For account security, please update your temporary password before continuing.</p>
            </div>
            {!passwordChangeVerificationStep && [
              ['current_password', 'Current Password', 'Current password', 'current-password'],
              ['new_password', 'New Password', 'New password', 'new-password'],
              ['confirm_password', 'Confirm Password', 'Confirm new password', 'new-password'],
            ].map(([field, label, placeholder, autoComplete]) => (
              <div key={field}>
                <label htmlFor={`change-${field}`} className="mb-1.5 block text-sm font-semibold text-[#0F172A]">
                  {label}
                </label>
                <div className="relative">
                  <input
                    id={`change-${field}`}
                    type={passwordVisibility[field] ? 'text' : 'password'}
                    className={`w-full rounded-md border px-3 py-3 pr-11 text-sm outline-none focus:border-[#2563EB] ${
                      field === 'confirm_password' && passwordMismatch ? 'border-[#DC2626]' : 'border-[#CBD5E1]'
                    }`}
                    placeholder={placeholder}
                    value={passwordChangeForm[field]}
                    onChange={(e) => {
                      setPasswordChangeForm(prev => ({ ...prev, [field]: e.target.value }));
                      if (passwordChangeError) setPasswordChangeError('');
                    }}
                    autoComplete={autoComplete}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2563EB] hover:text-[#1D4ED8]"
                    aria-label={passwordVisibility[field] ? `Hide ${label}` : `Show ${label}`}
                    onClick={() => setPasswordVisibility(prev => ({ ...prev, [field]: !prev[field] }))}
                  >
                    {passwordVisibility[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {field === 'confirm_password' && passwordMismatch && (
                  <p className="mt-1 text-sm font-medium text-[#DC2626]">Passwords do not match.</p>
                )}
                {field === 'new_password' && (
                  <PasswordStrengthHint password={passwordChangeForm.new_password} />
                )}
              </div>
            ))}
            {passwordChangeVerificationStep && <div>
              <label htmlFor="change-password-otp" className="mb-1.5 block text-sm font-semibold text-[#0F172A]">
                Email OTP
              </label>
              <div className="flex gap-2">
                <input
                  id="change-password-otp"
                  inputMode="numeric"
                  maxLength={6}
                  className="min-w-0 flex-1 rounded-md border border-[#CBD5E1] px-3 py-3 text-sm outline-none focus:border-[#2563EB]"
                  placeholder="6-digit OTP"
                  value={passwordChangeOtp}
                  onChange={(e) => {
                    setPasswordChangeOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (passwordChangeError) setPasswordChangeError('');
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={requestPasswordChangeOtp}
                  disabled={passwordChangeOtpLoading}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-[#2563EB] px-3 py-2 text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF] disabled:opacity-60"
                >
                  {passwordChangeOtpLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {passwordChangeOtpLoading ? 'Sending...' : passwordChangeOtpSentTo ? 'Resend' : 'Send OTP'}
                </button>
              </div>
              {passwordChangeOtpLoading && (
                <p className="mt-2 flex items-center gap-2 text-xs font-medium text-[#2563EB]">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Sending email OTP...
                </p>
              )}
              {passwordChangeOtpSentTo && (
                <p className="mt-1 text-xs text-[#64748B]">OTP sent to {passwordChangeOtpSentTo}.</p>
              )}
            </div>}
            {passwordChangeVerificationStep && <div>
              <label htmlFor="change-password-captcha" className="mb-1.5 block text-sm font-semibold text-[#0F172A]">
                Security Check
              </label>
              <input
                id="change-password-captcha"
                inputMode="numeric"
                className="w-full rounded-md border border-[#CBD5E1] px-3 py-3 text-sm outline-none focus:border-[#2563EB]"
                placeholder={passwordChangeCaptcha ? `${passwordChangeCaptcha.question} = ?` : 'Loading security check...'}
                value={passwordChangeCaptchaAnswer}
                onChange={(e) => {
                  setPasswordChangeCaptchaAnswer(e.target.value.replace(/\D/g, '').slice(0, 3));
                  if (passwordChangeError) setPasswordChangeError('');
                }}
                required
              />
            </div>}
            {passwordChangeError && <p className="text-sm text-[#DC2626]">{passwordChangeError}</p>}
            <button
              type="submit"
              disabled={passwordChangeLoading || passwordMismatch || (passwordChangeVerificationStep && (passwordChangeOtp.length !== 6 || !passwordChangeCaptchaAnswer.trim()))}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                passwordChangeVerificationStep ? 'bg-[#16A34A] hover:bg-[#15803D]' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
              }`}
            >
              {passwordChangeLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {passwordChangeLoading
                ? (passwordChangeVerificationStep ? 'Please wait...' : 'Sending email OTP...')
                : passwordChangeVerificationStep ? 'Submit' : 'Update Password'}
            </button>
            {passwordChangeLoading && !passwordChangeVerificationStep && (
              <p className="flex items-center justify-center gap-2 text-xs font-medium text-[#2563EB]">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Sending email OTP...
              </p>
            )}
          </form>
        </div>
      )}

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
                onClick={() => logout(_isAdminOrPoliceSession() ? '/admin-login' : undefined)}
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
