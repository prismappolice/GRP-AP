import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockout, setLockout] = useState(false);
  const navigate = useNavigate();

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
        loginAdmin(response.data.access_token, { name: response.data.name, email: response.data.email });
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
          setTimeout(() => setLockout(false), 15000); // 15s lockout
        }
        return f + 1;
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pt-8 flex items-center justify-center bg-[#F8FAFC] pb-12">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <img src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png" alt="AP Police Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-extrabold heading-font text-[#0F172A]">GRP Portal</h1>
          <p className="text-sm text-[#475569] mt-2">Government Railway Police, Andhra Pradesh</p>
        </div>
        <div className="p-8 border border-[#60A5FA] bg-white rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <Label htmlFor="admin-username">Username</Label>
              <Input
                id="admin-username"
                name="username"
                type="text"
                placeholder="Enter username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            <div>
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-2 text-[#2563EB] hover:text-[#1D4ED8]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="admin-remember"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="accent-[#2563EB]"
              />
              <Label htmlFor="admin-remember" className="text-sm">Remember me</Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || lockout}>
              {lockout ? `Locked (${3 - failedAttempts === 0 ? 15 : 0}s)` : loading ? 'Logging in...' : 'Login'}
            </Button>

            <p className="text-xs text-center text-[#64748B]">
              Enter your assigned username and password.
            </p>

            {lockout && <div className="text-xs text-red-600 text-center">Too many failed attempts. Please wait 15 seconds.</div>}
          </form>
        </div>
      </div>
    </div>
  );
}
