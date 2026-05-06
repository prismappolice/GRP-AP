import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HelpCircle } from 'lucide-react';
import { helpAPI } from '@/lib/api';
import { toast } from 'sonner';

export const HelpDeskPage = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    const phoneRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (formData.email.trim() && !emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address.';
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
      await helpAPI.create(formData);
      toast.success('Help request submitted successfully');
      setFormData({ name: '', phone: '', email: '', message: '' });
    } catch (error) {
      toast.error('Failed to submit request');
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
              <Input className="mt-2" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required data-testid="name-input" />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                type="tel"
                className={`mt-2 ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formData.phone}
                onChange={(e) => {
                  setFormData({...formData, phone: e.target.value});
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                }}
                maxLength={10}
                data-testid="phone-input"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                className={`mt-2 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                value={formData.email}
                onChange={(e) => {
                  setFormData({...formData, email: e.target.value});
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                data-testid="email-input"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea className="mt-2 min-h-[150px]" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} required data-testid="message-textarea" />
            </div>
            <Button type="submit" className="w-full bg-[#D97706] hover:bg-[#B45309]" disabled={loading} data-testid="submit-help-button">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
