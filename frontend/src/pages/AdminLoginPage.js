import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import api, { authAPI, securityAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';

const LOCKOUT_SECONDS = 120;
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
  if (!value) return { label: '', className: 'text-[#64748B]', passed };
  if (passed <= 3) return { label: 'Weak', className: 'text-[#DC2626]', passed };
  if (passed <= 5) return { label: 'Medium', className: 'text-[#D97706]', passed };
  return { label: 'Strong', className: 'text-[#16A34A]', passed };
};



const getOtpCooldownMessage = (error) => {
  const detail = error?.response?.data?.detail;
  if (detail && typeof detail === 'object') {
    return detail.message || '';
  }
  if (typeof detail === 'string' && error?.response?.status === 429) {
    return detail;
  }
  return '';
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

export default function AdminLoginPage() {
  const { loginAdmin, loginOfficerViaAdmin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginFieldError, setLoginFieldError] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_remember') === 'true';
    }
    return false;
  });
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetId, setResetId] = useState('');
  const [resetMaskedEmail, setResetMaskedEmail] = useState('');
  const [resetCaptcha, setResetCaptcha] = useState(null);
  const [resetCaptchaAnswer, setResetCaptchaAnswer] = useState('');
  const [resetFieldError, setResetFieldError] = useState('');
  const [resetOtpCooldownError, setResetOtpCooldownError] = useState('');
  const [resetForm, setResetForm] = useState({
    identifier: '',
    otp: '',
    new_password: '',
    confirm_password: '',
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockout, setLockout] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [loginOtpStep, setLoginOtpStep] = useState(false);
  const [loginResetId, setLoginResetId] = useState('');
  const [loginMaskedEmail, setLoginMaskedEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginCaptcha, setLoginCaptcha] = useState(null);
  const [loginCaptchaAnswer, setLoginCaptchaAnswer] = useState('');
  const [loginOtpCooldownError, setLoginOtpCooldownError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!lockout) return undefined;
    setLockoutRemaining(LOCKOUT_SECONDS);
    const timer = setInterval(() => {
      setLockoutRemaining((remaining) => {
        if (remaining <= 1) {
          clearInterval(timer);
          setLockout(false);
          setFailedAttempts(0);
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockout]);

  const loadLoginCaptcha = async () => {
    try {
      const response = await securityAPI.getChallenge();
      setLoginCaptcha(response.data);
      setLoginCaptchaAnswer('');
    } catch {
      setLoginCaptcha(null);
      toast.error('Failed to load security check');
    }
  };

  const loadResetCaptcha = async () => {
    try {
      const response = await securityAPI.getChallenge();
      setResetCaptcha(response.data);
      setResetCaptchaAnswer('');
    } catch {
      setResetCaptcha(null);
      toast.error('Failed to load security check');
    }
  };

  const completeLogin = (data) => {
      if (!data?.access_token) {
        throw new Error('Invalid admin login response');
      }

      if (data?.portal_role === 'admin') {
        localStorage.setItem('isAdmin', 'true');
        loginAdmin(data.access_token, {
          name: data.name,
          email: data.email,
          last_login_at: data.user?.last_login_at,
          must_change_password: data.user?.must_change_password,
        });
        if (rememberMe) localStorage.setItem('admin_remember', 'true');
        toast.success('Admin login successful!');
        setFailedAttempts(0);
        navigate('/admin-dashboard', { replace: true });
      } else if (data?.portal_role === 'officer' && data?.user) {
        const officerRole = data.officer_role || '';
        // Normalise role so Header.js policeLinks condition fires immediately
        const roleMap = { station: 'station', srp: 'srp', dsrp: 'dsrp', irp: 'irp', dgp: 'dgp', sirp: 'station' };
        const normalisedRole = roleMap[officerRole] || 'police';
        loginOfficerViaAdmin(data.access_token, { ...data.user, role: normalisedRole });
        if (rememberMe) localStorage.setItem('user_remember', 'true');
        toast.success('Officer login successful!');
        setFailedAttempts(0);
        const roleToDashboard = {
          station: '/station-dashboard',
          srp: '/srp-dashboard',
          dsrp: '/dsrp-dashboard',
          irp: '/irp-dashboard',
          dgp: '/dgp-dashboard',
        };
        const dashboardPath = roleToDashboard[normalisedRole] || '/dashboard';
        navigate(dashboardPath, { replace: true });
      } else {
        throw new Error('Unsupported login response');
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockout) return;
    setLoginFieldError('');
    setLoginOtpCooldownError('');
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      toast.error('Please enter username');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/admin/login', { identifier: trimmedIdentifier, password });
      if (response.data?.login_pending) {
        setLoginResetId(response.data.reset_id || '');
        setLoginMaskedEmail(response.data.masked_email || '');
        setLoginOtpStep(true);
        setLoginOtp('');
        await loadLoginCaptcha();
        setLoginOtpCooldownError('');
        toast.success(response.data.message || 'OTP sent to registered email');
      } else {
        completeLogin(response.data);
      }
    } catch (error) {
      const cooldownMessage = getOtpCooldownMessage(error);
      if (cooldownMessage) setLoginOtpCooldownError(cooldownMessage);
      const detail = error?.response?.data?.detail || '';
      const invalidCredentials = error?.response?.status === 401 || /invalid|credential|username|email|password/i.test(detail);
      if (invalidCredentials) {
        setLoginFieldError('Invalid username or password');
      } else if (cooldownMessage) {
        toast.error(cooldownMessage);
      } else {
        toast.error(detail || 'Admin login failed');
      }
      setFailedAttempts(f => {
        if (f + 1 >= 3) {
          setLockout(true);
        }
        return f + 1;
      });
    }
    setLoading(false);
  };

  const verifyLoginOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/admin/login/verify', {
        reset_id: loginResetId,
        otp: loginOtp,
        captcha_id: loginCaptcha?.captcha_id || '',
        captcha_answer: loginCaptchaAnswer,
      });
      completeLogin(response.data);
      setLoginOtpStep(false);
      setLoginResetId('');
      setLoginMaskedEmail('');
      setLoginOtp('');
      setLoginCaptcha(null);
      setLoginCaptchaAnswer('');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Login verification failed');
      await loadLoginCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const cancelLoginOtp = () => {
    setLoginOtpStep(false);
    setLoginResetId('');
    setLoginMaskedEmail('');
    setLoginOtp('');
    setLoginCaptcha(null);
    setLoginCaptchaAnswer('');
  };

  const openResetMode = () => {
    setResetMode(true);
    setLoginFieldError('');
    setResetFieldError('');
    setResetId('');
    setResetMaskedEmail('');
    setResetCaptcha(null);
    setResetCaptchaAnswer('');
    setResetForm({
      identifier: identifier.trim(),
      otp: '',
      new_password: '',
      confirm_password: '',
    });
    loadResetCaptcha();
  };

  const requestResetOtp = async (e) => {
    e.preventDefault();
    setResetFieldError('');
    setResetOtpCooldownError('');
    const trimmedIdentifier = resetForm.identifier.trim();
    if (!trimmedIdentifier) {
      toast.error('Please enter username or email');
      return;
    }
    setResetLoading(true);
    try {
      const response = await authAPI.requestPasswordReset({
        identifier: trimmedIdentifier,
        captcha_id: resetCaptcha?.captcha_id || '',
        captcha_answer: resetCaptchaAnswer,
      });
      setResetId(response.data.reset_id);
      setResetMaskedEmail(response.data.masked_email || '');
      setResetOtpCooldownError('');
      toast.success(response.data.message || 'OTP sent to registered email');
    } catch (error) {
      const cooldownMessage = getOtpCooldownMessage(error);
      if (cooldownMessage) setResetOtpCooldownError(cooldownMessage);
      const detail = error?.response?.data?.detail || '';
      const invalidIdentifier = error?.response?.status === 401 || error?.response?.status === 404 || /invalid|not found|username|email|credential/i.test(detail);
      if (invalidIdentifier) {
        setResetFieldError('Invalid username or password');
      } else if (cooldownMessage) {
        toast.error(cooldownMessage);
      } else {
        toast.error(detail || 'Failed to send reset OTP');
      }
      await loadResetCaptcha();
    } finally {
      setResetLoading(false);
    }
  };

  const completeReset = async (e) => {
    e.preventDefault();
    if (resetForm.new_password !== resetForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    setResetLoading(true);
    try {
      await authAPI.completePasswordReset({
        reset_id: resetId,
        otp: resetForm.otp,
        new_password: resetForm.new_password,
      });
      toast.success('Password reset successfully. Please login.');
      setIdentifier(resetForm.identifier.trim());
      setPassword('');
      setResetMode(false);
      setResetId('');
      setResetMaskedEmail('');
      setResetCaptcha(null);
      setResetCaptchaAnswer('');
      setResetForm({ identifier: '', otp: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-8 flex items-center justify-center bg-[#F8FAFC] pb-12">
      <div className="max-w-[430px] w-full mx-4">
        <div className="text-center mb-8">
          <img src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png" alt="AP Police Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-extrabold heading-font text-[#0F172A]">GRP Portal</h1>
          <p className="text-sm text-[#475569] mt-2">Government Railway Police, Andhra Pradesh</p>
        </div>
        <div className="p-7 sm:p-8 border border-[#60A5FA] bg-white rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold mb-7 text-center text-[#0F172A]">{resetMode ? 'Reset Password' : 'Admin Login'}</h2>
          {resetMode ? (
          <form onSubmit={resetId ? completeReset : requestResetOtp} className="space-y-4" autoComplete="off">
            <div>
              <Label htmlFor="reset-identifier" className="text-sm font-semibold text-[#0F172A]">Username or Email</Label>
              <Input
                id="reset-identifier"
                type="text"
                placeholder="Enter username or email"
                className={`mt-2 h-12 ${resetFieldError ? 'border-[#DC2626] focus-visible:ring-[#FCA5A5]' : ''}`}
                value={resetForm.identifier}
                onChange={(e) => {
                  setResetForm(prev => ({ ...prev, identifier: e.target.value }));
                  if (resetFieldError) setResetFieldError('');
                }}
                disabled={Boolean(resetId)}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(resetFieldError)}
              />
              {resetFieldError && (
                <p className="mt-1 text-sm font-medium text-[#DC2626]">Invalid username or password</p>
              )}
            </div>
            {!resetId && (
              <div>
                <Label htmlFor="reset-captcha" className="text-sm font-semibold text-[#0F172A]">
                  Security Check {resetCaptcha?.question ? `(${resetCaptcha.question})` : ''}
                </Label>
                <Input
                  id="reset-captcha"
                  inputMode="numeric"
                  placeholder="Answer"
                  className="mt-2 h-12"
                  value={resetCaptchaAnswer}
                  onChange={(e) => setResetCaptchaAnswer(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                />
              </div>
            )}
            {resetId && (
              <>
                <p className="text-xs text-[#64748B]">
                  OTP sent to {resetMaskedEmail || 'the registered email'}. It expires in 5 minutes.
                </p>
                <div>
                  <Label htmlFor="reset-otp" className="text-sm font-semibold text-[#0F172A]">Email OTP</Label>
                  <Input
                    id="reset-otp"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    className="mt-2 h-12"
                    value={resetForm.otp}
                    onChange={(e) => setResetForm(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    required
                  />
                  <PasswordStrengthHint password={resetForm.new_password} />
                </div>
                <div>
                  <Label htmlFor="reset-new-password" className="text-sm font-semibold text-[#0F172A]">New Password</Label>
                  <Input
                    id="reset-new-password"
                    type="password"
                    placeholder="New strong password"
                    className="mt-2 h-12"
                    value={resetForm.new_password}
                    onChange={(e) => setResetForm(prev => ({ ...prev, new_password: e.target.value }))}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label htmlFor="reset-confirm-password" className="text-sm font-semibold text-[#0F172A]">Confirm Password</Label>
                  <Input
                    id="reset-confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    className="mt-2 h-12"
                    value={resetForm.confirm_password}
                    onChange={(e) => setResetForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-xs text-[#64748B]">
                  Use at least 12 characters with uppercase, lowercase, number, and special character.
                </p>
              </>
            )}
            <Button type="submit" className="w-full h-12 bg-[#0F172A] hover:bg-[#1E293B] text-base font-semibold" disabled={resetLoading}>
              {resetLoading ? 'Please wait...' : resetId ? 'Reset Password' : 'Send OTP'}
            </Button>
            {resetId && (
              <button
                type="button"
                className="w-full text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                onClick={() => {
                  setResetId('');
                  setResetMaskedEmail('');
                  loadResetCaptcha();
                }}
                disabled={resetLoading}
              >
                Request new OTP
              </button>
            )}
            <button
              type="button"
              className="w-full text-sm text-[#64748B] hover:text-[#0F172A]"
              onClick={() => {
                setResetMode(false);
                setResetCaptcha(null);
                setResetCaptchaAnswer('');
              }}
              disabled={resetLoading}
            >
              Back to login
            </button>
          </form>
          ) : loginOtpStep ? (
          <form onSubmit={verifyLoginOtp} className="space-y-4" autoComplete="off">
            <p className="rounded-md border border-[#DBEAFE] bg-[#EFF6FF] p-3 text-sm text-[#1E3A8A]">
              Email OTP sent to {loginMaskedEmail || 'the registered email'}.
            </p>
            <div>
              <Label htmlFor="login-otp" className="text-sm font-semibold text-[#0F172A]">Email OTP</Label>
              <Input
                id="login-otp"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit OTP"
                className="mt-2 h-12"
                value={loginOtp}
                onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>
            <div>
              <Label htmlFor="login-captcha" className="text-sm font-semibold text-[#0F172A]">
                Security Check {loginCaptcha?.question ? `(${loginCaptcha.question})` : ''}
              </Label>
              <Input
                id="login-captcha"
                inputMode="numeric"
                placeholder="Answer"
                className="mt-2 h-12"
                value={loginCaptchaAnswer}
                onChange={(e) => setLoginCaptchaAnswer(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 bg-[#0F172A] hover:bg-[#1E293B] text-base font-semibold" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </Button>
            <button
              type="button"
              className="w-full text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
              onClick={async () => {
                setLoading(true);
                try {
                  const response = await api.post('/admin/login', { identifier: identifier.trim(), password });
                  setLoginResetId(response.data.reset_id || '');
                  setLoginMaskedEmail(response.data.masked_email || '');
                  setLoginOtp('');
                  await loadLoginCaptcha();
                  toast.success(response.data.message || 'OTP resent');
                } catch (error) {
                  toast.error(error?.response?.data?.detail || 'Failed to resend OTP');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              Resend OTP
            </button>
            <button
              type="button"
              className="w-full text-sm text-[#64748B] hover:text-[#0F172A]"
              onClick={cancelLoginOtp}
              disabled={loading}
            >
              Back to login
            </button>
          </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <Label htmlFor="admin-username" className="text-sm font-semibold text-[#0F172A]">Username</Label>
              <Input
                id="admin-username"
                name="username"
                type="text"
                placeholder="Enter username or email"
                className="mt-2 h-12"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (loginFieldError) setLoginFieldError('');
                }}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            <div>
              <Label htmlFor="admin-password" className="text-sm font-semibold text-[#0F172A]">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  className={`mt-2 h-12 pr-11 ${loginFieldError ? 'border-[#DC2626] focus-visible:ring-[#FCA5A5]' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginFieldError) setLoginFieldError('');
                  }}
                  required
                  autoComplete="current-password"
                  aria-invalid={Boolean(loginFieldError)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2563EB] hover:text-[#1D4ED8]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {loginFieldError && (
                <p className="mt-1 text-sm font-medium text-[#DC2626]">Invalid username or password</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <label htmlFor="admin-remember" className="inline-flex items-center gap-2 text-sm font-medium text-[#0F172A] cursor-pointer">
                <input
                  id="admin-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 accent-[#2563EB]"
                />
                Remember me
              </label>
              <button
                type="button"
                className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] whitespace-nowrap"
                onClick={openResetMode}
              >
                Reset password
              </button>
            </div>
            <Button type="submit" className="w-full h-12 bg-[#0F172A] hover:bg-[#1E293B] text-base font-semibold" disabled={loading || lockout}>
              {lockout ? (
                `Locked (${lockoutRemaining}s)`
              ) : loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Sending OTP...
                </span>
              ) : 'Continue'}
            </Button>

            {lockout && <div className="text-xs text-red-600 text-center">Too many failed attempts. Please wait 2 minutes.</div>}
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
