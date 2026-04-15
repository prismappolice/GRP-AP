import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const startResendTimer = () => {
    setResendCountdown(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      setStep(2);
      startResendTimer();
      toast.success('OTP sent! Please check your email.');
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      toast.success('OTP verified! Set your new password.');
      window.location.href = `/reset-password?token=${res.data.token}`;
    } catch (err) {
      toast.error('Invalid or expired OTP. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      startResendTimer();
      toast.success('New OTP sent!');
    } catch {
      toast.error('Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] py-12">
      <div className="text-center mb-8">
        <img src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png" alt="AP Police Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
        <h1 className="text-3xl font-extrabold heading-font text-[#0F172A]">GRP Portal</h1>
        <p className="text-sm text-[#475569] mt-2">Government Railway Police, Andhra Pradesh</p>
      </div>

      <div className="max-w-md w-full mx-4 p-8 border border-[#E2E8F0] bg-white rounded-lg">
        {step === 1 ? (
          <>
            <h2 className="text-2xl font-bold mb-2 text-center">Forgot Password?</h2>
            <p className="text-sm text-[#475569] text-center mb-6">Enter your email and we'll send you a 6-digit OTP.</p>
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Email address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full bg-[#0F172A] hover:bg-[#1e2d40]" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-2 text-center">Enter OTP</h2>
            <p className="text-sm text-[#475569] text-center mb-6">
              A 6-digit OTP was sent to <span className="font-semibold text-[#0F172A]">{email}</span>.<br />
              It expires in 10 minutes.
            </p>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <Label htmlFor="otp-input">6-digit OTP</Label>
                <Input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                  className="mt-1 text-center text-2xl font-bold tracking-[0.4em]"
                />
              </div>
              <Button type="submit" className="w-full bg-[#0F172A] hover:bg-[#1e2d40]" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-[#475569]">
              {resendCountdown > 0 ? (
                <span>Resend OTP in {resendCountdown}s</span>
              ) : (
                <button
                  type="button"
                  className="text-[#0F172A] font-semibold underline hover:opacity-70"
                  onClick={handleResend}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              )}
              <span className="mx-2">·</span>
              <button
                type="button"
                className="text-[#475569] underline hover:opacity-70"
                onClick={() => { setStep(1); setOtp(''); }}
              >
                Change email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

