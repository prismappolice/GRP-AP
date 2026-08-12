import React from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, LoaderCircle, Mail, ShieldCheck, UserCircle } from 'lucide-react';
import { authAPI, securityAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const OTP_EXPIRY_SECONDS = 180;
const formatOtpCountdown = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return mins + ':' + String(secs).padStart(2, '0');
};

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

const emptyPasswordForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
  otp: '',
  captcha_answer: '',
};

const emptyUsernameForm = {
  new_username: '',
  otp: '',
  captcha_answer: '',
};

export default function ProfilePage() {
  const { user, isAdmin, logout, updateCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = React.useState('profile');
  const [account, setAccount] = React.useState(null);
  const [loadingAccount, setLoadingAccount] = React.useState(false);
  const [nameEditMode, setNameEditMode] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState('');
  const [nameLoading, setNameLoading] = React.useState(false);
  const [passwordForm, setPasswordForm] = React.useState(emptyPasswordForm);
  const [usernameForm, setUsernameForm] = React.useState(emptyUsernameForm);
  const [passwordOtpSentTo, setPasswordOtpSentTo] = React.useState('');
  const [usernameOtpSentTo, setUsernameOtpSentTo] = React.useState('');
  const [passwordOtpCooldownError, setPasswordOtpCooldownError] = React.useState('');
  const [usernameOtpCooldownError, setUsernameOtpCooldownError] = React.useState('');
  const [passwordCaptcha, setPasswordCaptcha] = React.useState(null);
  const [usernameCaptcha, setUsernameCaptcha] = React.useState(null);
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [usernameLoading, setUsernameLoading] = React.useState(false);
  const [passwordOtpLoading, setPasswordOtpLoading] = React.useState(false);
  const [usernameOtpLoading, setUsernameOtpLoading] = React.useState(false);
  const [visible, setVisible] = React.useState({});
  const [usernameChangeMode, setUsernameChangeMode] = React.useState(false);

  const displayAccount = account || user || {};
  const storedAdminName = isAdmin && typeof window !== 'undefined' ? localStorage.getItem('admin_display_name') : '';
  const storedAdminEmail = isAdmin && typeof window !== 'undefined' ? localStorage.getItem('admin_email') : '';
  const displayName = displayAccount.name || storedAdminName || (isAdmin ? 'Admin' : 'User');
  const displayEmail = displayAccount.email || storedAdminEmail || '';
  const roleLabel = isAdmin ? 'Admin' : (displayAccount.role || 'User').toUpperCase();
  const passwordMismatch = Boolean(passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password);

  const loadCaptcha = React.useCallback(async (kind) => {
    try {
      const response = await securityAPI.getChallenge();
      if (kind === 'password') {
        setPasswordCaptcha(response.data);
        setPasswordForm(prev => ({ ...prev, captcha_answer: '' }));
      } else {
        setUsernameCaptcha(response.data);
        setUsernameForm(prev => ({ ...prev, captcha_answer: '' }));
      }
    } catch {
      if (kind === 'password') setPasswordCaptcha(null);
      else setUsernameCaptcha(null);
    }
  }, []);

  React.useEffect(() => {
    setActiveTab('profile');
    setPasswordForm(emptyPasswordForm);
    setUsernameForm(prev => ({ ...emptyUsernameForm, new_username: displayEmail || prev.new_username }));
    setPasswordOtpSentTo('');
    setUsernameOtpSentTo('');
    setPasswordCaptcha(null);
    setUsernameCaptcha(null);
    setUsernameChangeMode(false);
    setNameEditMode(false);
    setNameDraft('');
    setLoadingAccount(true);
    authAPI.getMe()
      .then((response) => {
        setAccount(response.data);
        setNameDraft(response.data?.name || '');
        setUsernameForm(prev => ({ ...prev, new_username: response.data?.email || '' }));
      })
      .catch(() => {
        setAccount(user || null);
        setNameDraft(user?.name || '');
      })
      .finally(() => setLoadingAccount(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePasswordField = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  const updateUsernameField = (field, value) => {
    setUsernameForm(prev => ({ ...prev, [field]: value }));
  };

  const startUsernameChange = () => {
    setUsernameChangeMode(true);
    setUsernameForm(prev => ({
      ...emptyUsernameForm,
      new_username: prev.new_username === displayEmail ? '' : prev.new_username,
    }));
    setUsernameOtpSentTo('');
    setUsernameCaptcha(null);
  };

  const cancelUsernameChange = () => {
    setUsernameChangeMode(false);
    setUsernameForm(emptyUsernameForm);
    setUsernameOtpSentTo('');
    setUsernameCaptcha(null);
  };

  const startNameEdit = () => {
    setNameDraft(displayName || '');
    setNameEditMode(true);
  };

  const cancelNameEdit = () => {
    setNameDraft(displayName || '');
    setNameEditMode(false);
  };

  const submitName = async () => {
    setNameLoading(true);
    try {
      const response = await authAPI.updateProfileName({ name: nameDraft });
      setAccount(response.data);
      updateCurrentUser?.(response.data);
      setNameEditMode(false);
      toast.success('Name updated successfully');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to update name');
    } finally {
      setNameLoading(false);
    }
  };

  const requestPasswordOtp = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error('Enter current password and new password first');
      return;
    }
    if (passwordMismatch) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordOtpCooldownError('');
    setPasswordOtpLoading(true);
    try {
      const response = await authAPI.requestChangePasswordOtp();
      setPasswordOtpSentTo(response.data.masked_email || 'registered email');
      setPasswordOtpCooldownError('');
      await loadCaptcha('password');
      toast.success('OTP sent to registered email');
    } catch (error) {
      const cooldownMessage = getOtpCooldownMessage(error);
      if (cooldownMessage) setPasswordOtpCooldownError(cooldownMessage);
      toast.error(cooldownMessage || error?.response?.data?.detail || 'Failed to send email OTP');
    } finally {
      setPasswordOtpLoading(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    if (passwordMismatch) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        otp: passwordForm.otp,
        captcha_id: passwordCaptcha?.captcha_id || '',
        captcha_answer: passwordForm.captcha_answer,
      });
      toast.success('Password changed. Please log in again.');
      logout('/admin-login');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to change password');
      loadCaptcha('password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const requestUsernameOtp = async () => {
    if (!usernameForm.new_username) {
      toast.error('Enter new login email first');
      return;
    }
    setUsernameOtpCooldownError('');
    setUsernameOtpLoading(true);
    try {
      const response = await authAPI.requestChangeUsernameOtp();
      setUsernameOtpSentTo(response.data.masked_email || 'registered email');
      setUsernameOtpCooldownError('');
      await loadCaptcha('username');
      toast.success('OTP sent to registered email');
    } catch (error) {
      const cooldownMessage = getOtpCooldownMessage(error);
      if (cooldownMessage) setUsernameOtpCooldownError(cooldownMessage);
      toast.error(cooldownMessage || error?.response?.data?.detail || 'Failed to send email OTP');
    } finally {
      setUsernameOtpLoading(false);
    }
  };

  const submitUsername = async (event) => {
    event.preventDefault();
    setUsernameLoading(true);
    try {
      await authAPI.changeUsername({
        new_username: usernameForm.new_username,
        otp: usernameForm.otp,
        captcha_id: usernameCaptcha?.captcha_id || '',
        captcha_answer: usernameForm.captcha_answer,
      });
      toast.success('Username changed. Please log in again.');
      logout('/admin-login');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to change username');
      loadCaptcha('username');
    } finally {
      setUsernameLoading(false);
    }
  };

  const passwordInputType = (field) => visible[field] ? 'text' : 'password';
  const toggleVisible = (field) => setVisible(prev => ({ ...prev, [field]: !prev[field] }));

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <div className="mx-auto w-full max-w-4xl rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
        <div className="border-b border-[#E2E8F0] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]">
              <UserCircle className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold text-[#0F172A]">{displayName}</h2>
              <p className="truncate text-sm text-[#64748B]">{loadingAccount ? 'Loading profile...' : displayEmail}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-b border-[#E2E8F0] text-sm font-semibold">
          {[
            ['profile', UserCircle, 'Profile'],
            ['username', Mail, 'Change Username'],
            ['password', KeyRound, 'Change Password'],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex h-11 items-center justify-center gap-2 border-b-2 ${
                activeTab === key ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-[#E2E8F0] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase text-[#64748B]">Name</p>
                    {!nameEditMode && (
                      <button
                        type="button"
                        onClick={startNameEdit}
                        className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8]"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {nameEditMode ? (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                        className="w-full rounded-md border border-[#CBD5E1] px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
                        maxLength={120}
                        autoComplete="name"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelNameEdit}
                          className="flex-1 rounded-md border border-[#CBD5E1] px-3 py-2 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={submitName}
                          disabled={nameLoading}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                        >
                          {nameLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 break-words text-sm font-bold text-[#0F172A]">{displayName}</p>
                  )}
                </div>
                <div className="rounded-md border border-[#E2E8F0] p-3">
                  <p className="text-xs font-semibold uppercase text-[#64748B]">Role</p>
                  <p className="mt-1 text-sm font-bold text-[#0F172A]">{roleLabel}</p>
                </div>
                <div className="rounded-md border border-[#E2E8F0] p-3 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-[#64748B]">Username / Email</p>
                  <p className="mt-1 break-words text-sm font-bold text-[#0F172A]">{displayEmail || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-sm text-[#166534]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Username changes require email OTP and security check. Password changes also require current password.</p>
              </div>
            </div>
          )}

          {activeTab === 'username' && (
            <form onSubmit={submitUsername} className="space-y-4">
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <p className="text-xs font-semibold uppercase text-[#64748B]">Current Login Email</p>
                <p className="mt-1 break-words text-sm font-bold text-[#0F172A]">{displayEmail || '-'}</p>
              </div>
              {!usernameChangeMode && (
                <button
                  type="button"
                  onClick={startUsernameChange}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  Change Username
                </button>
              )}
              {usernameChangeMode && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-[#0F172A]" htmlFor="profile-new-username">New Login Email</label>
                    <input
                      id="profile-new-username"
                      type="email"
                      value={usernameForm.new_username}
                      onChange={(event) => updateUsernameField('new_username', event.target.value)}
                      className="w-full rounded-md border border-[#CBD5E1] px-3 py-3 text-sm outline-none focus:border-[#2563EB]"
                      autoComplete="username"
                      placeholder="Enter new email"
                      required
                    />
                  </div>
                  <OtpBlock
                    otp={usernameForm.otp}
                    onOtpChange={(value) => updateUsernameField('otp', value)}
                    captcha={usernameCaptcha}
                    captchaAnswer={usernameForm.captcha_answer}
                    onCaptchaAnswerChange={(value) => updateUsernameField('captcha_answer', value)}
                    sentTo={usernameOtpSentTo}
                    loading={usernameOtpLoading}
                    onRequestOtp={requestUsernameOtp}
                    cooldownMessage={usernameOtpCooldownError}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={cancelUsernameChange}
                      className="inline-flex flex-1 items-center justify-center rounded-md border border-[#CBD5E1] px-4 py-3 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                    >
                      Cancel
                    </button>
                    <SubmitButton loading={usernameLoading} label="Submit Change" loadingLabel="Updating username..." />
                  </div>
                </>
              )}
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={submitPassword} className="space-y-4">
              <SecurePasswordInput
                id="profile-current-password"
                label="Current Password"
                value={passwordForm.current_password}
                onChange={(value) => updatePasswordField('current_password', value)}
                type={passwordInputType('current_password')}
                onToggle={() => toggleVisible('current_password')}
                visible={Boolean(visible.current_password)}
              />
              <div>
                <SecurePasswordInput
                  id="profile-new-password"
                  label="New Password"
                  value={passwordForm.new_password}
                  onChange={(value) => updatePasswordField('new_password', value)}
                  type={passwordInputType('new_password')}
                  onToggle={() => toggleVisible('new_password')}
                  visible={Boolean(visible.new_password)}
                  autoComplete="new-password"
                />
                <PasswordStrengthHint password={passwordForm.new_password} />
              </div>
              <div>
                <SecurePasswordInput
                  id="profile-confirm-password"
                  label="Confirm Password"
                  value={passwordForm.confirm_password}
                  onChange={(value) => updatePasswordField('confirm_password', value)}
                  type={passwordInputType('confirm_password')}
                  onToggle={() => toggleVisible('confirm_password')}
                  visible={Boolean(visible.confirm_password)}
                  autoComplete="new-password"
                />
                {passwordMismatch && <p className="mt-1 text-sm font-medium text-[#DC2626]">Passwords do not match.</p>}
              </div>
              <OtpBlock
                otp={passwordForm.otp}
                onOtpChange={(value) => updatePasswordField('otp', value)}
                captcha={passwordCaptcha}
                captchaAnswer={passwordForm.captcha_answer}
                onCaptchaAnswerChange={(value) => updatePasswordField('captcha_answer', value)}
                sentTo={passwordOtpSentTo}
                loading={passwordOtpLoading}
                onRequestOtp={requestPasswordOtp}
                cooldownMessage={passwordOtpCooldownError}
              />
              <SubmitButton loading={passwordLoading} label="Change Password" loadingLabel="Updating password..." />
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function SecurePasswordInput({ id, label, value, onChange, type, onToggle, visible, autoComplete = 'current-password' }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-[#0F172A]" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-md border border-[#CBD5E1] px-3 py-3 pr-11 text-sm outline-none focus:border-[#2563EB]"
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2563EB] hover:text-[#1D4ED8]"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function OtpBlock({ otp, onOtpChange, captcha, captchaAnswer, onCaptchaAnswerChange, sentTo, loading, onRequestOtp, cooldownMessage }) {
  const [remaining, setRemaining] = React.useState(0);

  React.useEffect(() => {
    if (sentTo) setRemaining(OTP_EXPIRY_SECONDS);
    else setRemaining(0);
  }, [sentTo]);

  React.useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onRequestOtp}
        disabled={loading || Boolean(sentTo)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#2563EB] px-4 text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF] disabled:opacity-60"
      >
        {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {loading ? 'Sending...' : 'Send Email OTP'}
      </button>
      {loading && (
        <p className="flex items-center gap-2 text-xs font-medium text-[#2563EB]">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          Sending email OTP...
        </p>
      )}
      {sentTo && <p className="text-xs text-[#64748B]">OTP sent to {sentTo}.</p>}
      {cooldownMessage && (
        <p className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-sm font-semibold text-[#B91C1C]">{cooldownMessage}</p>
      )}
      {sentTo && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#0F172A]" htmlFor={`otp-${sentTo}`}>Email OTP</label>
            <input
              id={`otp-${sentTo}`}
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-md border border-[#CBD5E1] px-3 py-3 text-sm outline-none focus:border-[#2563EB]"
              placeholder="6-digit OTP"
              required
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#B91C1C]">
                {remaining > 0 ? <>OTP will expire in {formatOtpCountdown(remaining)}</> : 'OTP expired. Please request a new OTP.'}
              </p>
              <button
                type="button"
                onClick={onRequestOtp}
                disabled={loading || remaining > 0}
                className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] disabled:cursor-not-allowed disabled:text-[#94A3B8]"
              >
                Resend OTP?
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#0F172A]" htmlFor={`captcha-${sentTo}`}>Security Check</label>
            <input
              id={`captcha-${sentTo}`}
              inputMode="numeric"
              value={captchaAnswer}
              onChange={(event) => onCaptchaAnswerChange(event.target.value.replace(/\D/g, '').slice(0, 3))}
              className="w-full rounded-md border border-[#CBD5E1] px-3 py-3 text-sm outline-none focus:border-[#2563EB]"
              placeholder={captcha ? `${captcha.question} = ?` : 'Loading...'}
              required
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitButton({ loading, label, loadingLabel }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {loading ? loadingLabel : label}
    </button>
  );
}

