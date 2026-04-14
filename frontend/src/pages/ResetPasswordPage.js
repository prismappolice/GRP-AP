import React, { useState } from 'react';
import api from '@/lib/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const query = new URLSearchParams(useLocation().search);
  const token = query.get('token');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setSubmitted(true);
      toast.success('Password reset successful!');
      setTimeout(() => { window.location.href = '/login'; }, 2500);
    } catch (err) {
      toast.error('Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] py-12 pt-32">
      <div className="text-center mb-8">
        <img src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png" alt="AP Police Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
        <h1 className="text-3xl font-extrabold heading-font text-[#0F172A]">GRP Portal</h1>
        <p className="text-sm text-[#475569] mt-2">Government Railway Police, Andhra Pradesh</p>
      </div>
      <div className="max-w-md w-full mx-4 p-8 border border-[#E2E8F0] bg-white rounded-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Reset Password</h2>
        {submitted ? (
          <div className="text-green-700 text-center">
            Password reset successful!<br />Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="reset-password">New Password</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-[#0F172A] hover:bg-[#1e2d40]" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

