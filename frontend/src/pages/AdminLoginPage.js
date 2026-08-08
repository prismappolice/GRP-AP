import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import api, { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

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
      <div className="grid grid-cols-1 gap-1">
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
  const [resetForm, setResetForm] = useState({
    identifier: '',
    otp: '',
    new_password: '',
    confirm_password: '',
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockout, setLockout] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockout) return;
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      toast.error('Please enter username');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/admin/login', { identifier: trimmedIdentifier, password });
      if (!response.data?.access_token) {
        throw new Error('Invalid admin login response');
      }

      if (response.data?.portal_role === 'admin') {
        localStorage.setItem('isAdmin', 'true');
        loginAdmin(response.data.access_token, {
          name: response.data.name,
          email: response.data.email,
          last_login_at: response.data.user?.last_login_at,
          must_change_password: response.data.user?.must_change_password,
        });
        if (rememberMe) localStorage.setItem('admin_remember', 'true');
        toast.success('Admin login successful!');
        setFailedAttempts(0);
        navigate('/admin-dashboard', { replace: true });
      } else if (response.data?.portal_role === 'officer' && response.data?.user) {
        const officerRole = response.data.officer_role || '';
        // Normalise role so Header.js policeLinks condition fires immediately
        const roleMap = { station: 'station', srp: 'srp', dsrp: 'dsrp', irp: 'irp', dgp: 'dgp', sirp: 'station' };
        const normalisedRole = roleMap[officerRole] || 'police';
        loginOfficerViaAdmin(response.data.access_token, { ...response.data.user, role: normalisedRole });
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
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Admin login failed');
      setFailedAttempts(f => {
        if (f + 1 >= 3) {
          setLockout(true);
        }
        return f + 1;
      });
    }
    setLoading(false);
  };

  const openResetMode = () => {
    setResetMode(true);
    setResetId('');
    setResetMaskedEmail('');
    setResetForm({
      identifier: identifier.trim(),
      otp: '',
      new_password: '',
      confirm_password: '',
    });
  };

  const requestResetOtp = async (e) => {
    e.preventDefault();
    const trimmedIdentifier = resetForm.identifier.trim();
    if (!trimmedIdentifier) {
      toast.error('Please enter username or email');
      return;
    }
    setResetLoading(true);
    try {
      const response = await authAPI.requestPasswordReset({ identifier: trimmedIdentifier });
      setResetId(response.data.reset_id);
      setResetMaskedEmail(response.data.masked_email || '');
      toast.success(response.data.message || 'OTP sent to registered email');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to send reset OTP');
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
                className="mt-2 h-12"
                value={resetForm.identifier}
                onChange={(e) => setResetForm(prev => ({ ...prev, identifier: e.target.value }))}
                disabled={Boolean(resetId)}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            {resetId && (
              <>
                <p className="text-xs text-[#64748B]">
                  OTP sent to {resetMaskedEmail || 'the registered email'}. It expires in 10 minutes.
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
                onClick={requestResetOtp}
                disabled={resetLoading}
              >
                Resend OTP
              </button>
            )}
            <button
              type="button"
              className="w-full text-sm text-[#64748B] hover:text-[#0F172A]"
              onClick={() => setResetMode(false)}
              disabled={resetLoading}
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
                onChange={(e) => setIdentifier(e.target.value)}
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
                  className="mt-2 h-12 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
              {lockout ? `Locked (${lockoutRemaining}s)` : loading ? 'Logging in...' : 'Login'}
            </Button>

            {lockout && <div className="text-xs text-red-600 text-center">Too many failed attempts. Please wait 2 minutes.</div>}
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
