import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle } from 'lucide-react';
import { helpAPI, securityAPI } from '@/lib/api';
import { toast } from 'sonner';

const UNSAFE_TEXT_REGEX = /[<>]|javascript:|vbscript:|data:text\/html|onerror\s*=|onload\s*=/i;

const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const validateTextField = (value, label, minLength, maxLength) => {
  const normalized = normalizeText(value);
  if (normalized.length < minLength) return `${label} must be at least ${minLength} characters.`;
  if (normalized.length > maxLength) return `${label} must be ${maxLength} characters or less.`;
  if (UNSAFE_TEXT_REGEX.test(normalized)) return `${label} contains unsafe content.`;
  return '';
};

export const HelpDeskPage = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [errors, setErrors] = useState({});

  const loadCaptcha = async () => {
    try {
      const response = await securityAPI.getChallenge();
      setCaptcha(response.data);
      setCaptchaAnswer('');
    } catch (error) {
      setCaptcha(null);
      setCaptchaAnswer('');
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const validate = () => {
    const newErrors = {};
    const phoneRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameError = validateTextField(formData.name, 'Name', 2, 100);
    const messageError = validateTextField(formData.message, 'Message', 10, 2000);
    if (nameError) {
      newErrors.name = nameError;
    } else if (!/^[A-Za-z][A-Za-z0-9 .'-]*$/.test(normalizeText(formData.name))) {
      newErrors.name = 'Name contains invalid characters.';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (messageError) newErrors.message = messageError;
    if (!captcha?.captcha_id) {
      newErrors.captcha = 'Security check could not be loaded. Please refresh and try again.';
    } else if (!captchaAnswer.trim()) {
      newErrors.captcha = 'Security check is required.';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await helpAPI.create({
        name: normalizeText(formData.name),
        phone: formData.phone.replace(/\D/g, ''),
        email: formData.email.trim().toLowerCase(),
        message: normalizeText(formData.message),
        captcha_id: captcha?.captcha_id || '',
        captcha_answer: captchaAnswer,
      });
      toast.success('Help request submitted successfully');
      setFormData({ name: '', phone: '', email: '', message: '' });
      await loadCaptcha();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || 'Failed to submit request');
      await loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-12 bg-[#F8FAFC] pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <HelpCircle className="w-12 h-12 text-[#D97706] mb-4" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">Help Desk</h1>
          <p className="text-base text-[#475569] mt-2">Get assistance from our team</p>
        </div>

        <Card className="p-8 border border-[#60A5FA] bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>Name *</Label>
              <Input
                className={`mt-2 ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({...formData, name: e.target.value});
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                maxLength={100}
                required
                data-testid="name-input"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                type="tel"
                className={`mt-2 ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formData.phone}
                onChange={(e) => {
                  setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)});
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                }}
                inputMode="numeric"
                maxLength={10}
                required
                data-testid="phone-input"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                className={`mt-2 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formData.email}
                onChange={(e) => {
                  setFormData({...formData, email: e.target.value});
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                maxLength={254}
                required
                data-testid="email-input"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea
                className={`mt-2 min-h-[150px] ${errors.message ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formData.message}
                onChange={(e) => {
                  setFormData({...formData, message: e.target.value});
                  if (errors.message) setErrors(prev => ({ ...prev, message: undefined }));
                }}
                maxLength={2000}
                required
                data-testid="message-textarea"
              />
              {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
            </div>
            <div>
              <Label htmlFor="help-captcha">Security Check *</Label>
              {captcha?.image && (
                <img src={captcha.image} alt="Security check" className="mt-2 h-12 rounded border border-[#CBD5E1] bg-white" />
              )}
              <Input
                id="help-captcha"
                inputMode="numeric"
                className={`mt-2 ${errors.captcha ? 'border-red-500 focus:border-red-500' : ''}`}
                value={captchaAnswer}
                onChange={(e) => {
                  setCaptchaAnswer(e.target.value.replace(/\D/g, '').slice(0, 5));
                  if (errors.captcha) setErrors(prev => ({ ...prev, captcha: undefined }));
                }}
                placeholder={captcha ? 'Enter answer' : 'Loading security check...'}
                data-testid="captcha-input"
                required
              />
              {errors.captcha && <p className="text-xs text-red-500 mt-1">{errors.captcha}</p>}
            </div>
            <Button type="submit" className="w-full bg-[#D97706] hover:bg-[#B45309]" disabled={loading || !captcha} data-testid="submit-help-button">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
