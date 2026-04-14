import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';


export const AuthPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockout, setLockout] = useState(false);

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockout) return;
    setLoading(true);
    try {
      await login(loginData);
      toast.success('Login successful!');
      setFailedAttempts(0);
      if (rememberMe) localStorage.setItem('user_remember', 'true');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      setFailedAttempts(f => {
        if (f + 1 >= 3) {
          setLockout(true);
          setTimeout(() => setLockout(false), 15000); // 15s lockout
        }
        return f + 1;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...dataToSend } = registerData;
      await register(dataToSend);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 flex items-center justify-center bg-[#F8FAFC] py-12">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <img src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png" alt="AP Police Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-extrabold heading-font text-[#0F172A]">GRP Portal</h1>
          <p className="text-sm text-[#475569] mt-2">Government Railway Police, Andhra Pradesh</p>
        </div>

        <Card className="p-8 border border-[#E2E8F0] bg-white">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your.email@example.com"
                      className="pl-10"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      data-testid="login-email-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="pl-10"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      data-testid="login-password-input"
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
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="user-remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="accent-[#2563EB]"
                  />
                  <Label htmlFor="user-remember" className="text-sm">Remember me</Label>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8]"
                  disabled={loading || lockout}
                  data-testid="login-submit-button"
                >
                  {lockout ? `Locked (${3 - failedAttempts === 0 ? 15 : 0}s)` : loading ? 'Logging in...' : 'Login'}
                </Button>
                {lockout && <div className="text-xs text-red-600 text-center">Too many failed attempts. Please wait 15 seconds.</div>}
              
                <div className="flex justify-center items-center mt-2">
                  <button
                    type="button"
                    className="text-sm text-[#2563EB] underline bg-transparent border-0 p-0 hover:opacity-80"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Forgot password?
                  </button>
                </div>
                
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="register-name">Full Name</Label>
                  <div className="relative mt-2">
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Enter your full name"
                      className="pl-10"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      required
                      data-testid="register-name-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your.email@example.com"
                      className="pl-10"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                      data-testid="register-email-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-phone">Phone Number</Label>
                  <div className="relative mt-2">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="pl-10"
                      value={registerData.phone}
                      onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                      required
                      data-testid="register-phone-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      className="pl-10 pr-10"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      data-testid="register-password-input"
                    />
                    <button
                      type="button"
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowRegPassword(v => !v)}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-confirm-password">Confirm Password</Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="register-confirm-password"
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      required
                      data-testid="register-confirm-password-input"
                    />
                    <button
                      type="button"
                      aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowRegConfirmPassword(v => !v)}
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8]"
                  disabled={loading}
                  data-testid="register-submit-button"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};
