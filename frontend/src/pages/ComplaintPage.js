import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { complaintsAPI, securityAPI } from '@/lib/api';
import { toast } from 'sonner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_FILE_TYPES_LABEL = 'PDF / DOC / DOCX / JPG / PNG / MP4 / MOV / AVI / WEBM';

const formatErrorDetail = (detail) => {
  if (!detail) return 'Failed to register complaint';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.msg && Array.isArray(item?.loc)) {
          return `${item.loc.slice(1).join(' → ') || 'Field'}: ${item.msg}`;
        }
        if (item?.msg) return item.msg;
        return null;
      })
      .filter(Boolean)
      .join(', ') || 'Failed to register complaint';
  }
  if (typeof detail === 'object' && detail?.msg) return detail.msg;
  return 'Failed to register complaint';
};

export const ComplaintPage = () => {
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(null);
  const [formData, setFormData] = useState({
    complainant_name: '',
    complainant_phone: '',
    complainant_email: '',
    address: '',
    complaint_type: '',
    description: '',
    station: 'Unassigned',
    incident_date: '',
    location: '',
  });
  const [supportingDocs, setSupportingDocs] = useState([]);
  const supportingDocsRef = useRef(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const loadCaptcha = async () => {
    try {
      const response = await securityAPI.getChallenge();
      setCaptcha(response.data);
      setCaptchaAnswer('');
    } catch {
      setCaptcha(null);
      setCaptchaAnswer('');
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const resetComplaintForm = () => {
    setTrackingNumber(null);
    setFormData({
      complainant_name: '',
      complainant_phone: '',
      complainant_email: '',
      address: '',
      complaint_type: '',
      description: '',
      station: 'Unassigned',
      incident_date: '',
      location: '',
    });
    setSupportingDocs([]);
    setCaptchaAnswer('');
    if (supportingDocsRef.current) {
      supportingDocsRef.current.value = '';
    }
  };

  const handleSupportingDocsChange = (e) => {
    const nextFiles = Array.from(e.target.files || []);
    if (!nextFiles.length) return;
    setSupportingDocs((prev) => {
      const existingKeys = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const uniqueNewFiles = nextFiles.filter(
        (file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`)
      );
      return [...prev, ...uniqueNewFiles];
    });
    e.target.value = '';
  };

  const removeSupportingDoc = (indexToRemove) => {
    setSupportingDocs((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.complainant_name.trim()) errors.complainant_name = 'Please fill this field';
    if (!formData.complaint_type) errors.complaint_type = 'Please select a complaint type';
    if (!/^\d{10}$/.test(formData.complainant_phone || '')) errors.complainant_phone = 'Phone number must be exactly 10 digits';
    if (!EMAIL_REGEX.test((formData.complainant_email || '').trim())) errors.complainant_email = 'Please enter a valid email address';
    if (!formData.incident_date) errors.incident_date = 'Please fill this field';
    if (!formData.location.trim()) errors.location = 'Please fill this field';
    if (!formData.address.trim()) errors.address = 'Please fill this field';
    if (!formData.description.trim()) errors.description = 'Please fill this field';
    if (!captchaAnswer.trim()) errors.captcha = 'Security check is required';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries({ ...formData, complainant_email: (formData.complainant_email || '').trim() }).forEach(([k, v]) => data.append(k, v));
      data.append('captcha_id', captcha?.captcha_id || '');
      data.append('captcha_answer', captchaAnswer);
      supportingDocs.forEach(file => data.append('supporting_docs', file));
      const response = await complaintsAPI.create(data);
      setTrackingNumber(response.data.tracking_number);
    } catch (error) {
      toast.error(formatErrorDetail(error?.response?.data?.detail));
      await loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!trackingNumber) return;
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); resetComplaintForm(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [trackingNumber]);

  if (trackingNumber) {
    return (
      <div className="min-h-screen pt-12 bg-[#F8FAFC] pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">

          {/* Section 1: Success Header */}
          <Card className="p-6 border border-[#BBF7D0] bg-[#F0FDF4] text-center">
            <CheckCircle className="w-14 h-14 text-[#16A34A] mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold heading-font text-[#15803D]">e-Complaint Registered!</h2>
            <p className="text-sm text-[#166534] mt-1">Your complaint has been successfully submitted to the GRP portal.</p>
          </Card>

          {/* Section 2: Complaint No */}
          <Card className="p-6 border border-[#60A5FA] bg-white text-center">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-widest mb-2">Your Complaint No</p>
            <p className="text-3xl font-extrabold text-[#2563EB] tracking-widest">{trackingNumber}</p>
            <p className="text-xs text-[#94A3B8] mt-2">Please save this number for future reference.</p>
          </Card>

          {/* Section 3: What Happens Next */}
          <Card className="p-6 border border-[#E2E8F0] bg-white">
            <p className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-3">What Happens Next</p>
            <p className="text-sm text-[#475569]">
              Your complaint will be reviewed by the GRP Admin and forwarded to the concerned police station. You will receive email notifications for any updates on your complaint.
            </p>
          </Card>

          {/* Section 4: Submitted Details Summary */}
          <Card className="p-6 border border-[#E2E8F0] bg-white">
            <p className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-3">Submitted Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-[#64748B] font-medium">Name</span>
              <span className="text-[#0F172A] font-semibold">{formData.complainant_name || '-'}</span>
              <span className="text-[#64748B] font-medium">Phone</span>
              <span className="text-[#0F172A] font-semibold">{formData.complainant_phone || '-'}</span>
              <span className="text-[#64748B] font-medium">Complaint Type</span>
              <span className="text-[#0F172A] font-semibold capitalize">{String(formData.complaint_type || '-').replace(/_/g, ' ')}</span>
              <span className="text-[#64748B] font-medium">Incident Date</span>
              <span className="text-[#0F172A] font-semibold">{formData.incident_date || '-'}</span>
            </div>
          </Card>

          {/* Section 5: Actions */}
          <Card className="p-6 border border-[#E2E8F0] bg-white">
            <p className="text-xs text-[#94A3B8] text-center mb-4">
              This page will reset in <span className="font-bold text-[#2563EB]">{countdown}</span> seconds...
            </p>
            <Button
              onClick={resetComplaintForm}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8]"
            >
              File Another e-Complaint
            </Button>
          </Card>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-12 bg-[#F8FAFC] pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <FileText className="w-12 h-12 text-[#2563EB] mb-4 mx-auto" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">File e-Complaint</h1>
          <p className="text-base text-[#475569] mt-2">Register your complaint with GRP. You will receive an email notification for any updates on your complaint.</p>
          <div className="mt-3 inline-flex items-start gap-2 bg-[#FEF3C7] border border-[#FCD34D] rounded-lg px-4 py-2 text-left max-w-xl mx-auto">
            <span className="text-[#D97706] font-bold text-sm flex-shrink-0 mt-0.5">⚠ Note:</span>
            <p className="text-sm text-[#92400E]">As per BNSS Section 173, you are required to file a physical complaint at the concerned police station within <span className="font-bold">3 days</span> of submitting this e-Complaint.</p>
          </div>
        </div>

        <Card className="p-8 border border-[#60A5FA] bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="complainant_name">1. Full Name *</Label>
                <Input
                  id="complainant_name"
                  className={`mt-2 ${fieldErrors.complainant_name ? 'border-[#DC2626]' : ''}`}
                  placeholder="Your full name"
                  value={formData.complainant_name}
                  onChange={(e) => { setFormData({...formData, complainant_name: e.target.value}); if (fieldErrors.complainant_name) setFieldErrors(p => ({...p, complainant_name: ''})); }}
                />
                {fieldErrors.complainant_name && <p className="mt-1 text-xs text-[#DC2626]">{fieldErrors.complainant_name}</p>}
              </div>
              <div>
                <Label htmlFor="complaint_type">2. Complaint Type *</Label>
                <Select value={formData.complaint_type} onValueChange={(val) => { setFormData({...formData, complaint_type: val}); if (fieldErrors.complaint_type) setFieldErrors(p => ({...p, complaint_type: ''})); }}>
                  <SelectTrigger className="mt-2" data-testid="complaint-type-select">
                    <SelectValue placeholder="Select complaint type" />
                  </SelectTrigger>
                  <SelectContent side="bottom" avoidCollisions={false}>
                    <SelectItem value="theft">Theft</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="missing_person">Missing Person</SelectItem>
                    <SelectItem value="nuisance">Nuisance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.complaint_type && <p className="mt-1 text-xs text-[#DC2626]">{fieldErrors.complaint_type}</p>}
                {formData.complaint_type && (
                  <p className="mt-2 text-xs text-[#64748B]">
                    <span className="font-semibold text-[#0F172A]">Note:</span> Please upload supporting proofs (Images/Videos) in the Supporting Documentation upload section.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="complainant_phone">3. Phone Number *</Label>
                <Input
                  id="complainant_phone"
                  className={`mt-2 ${fieldErrors.complainant_phone ? 'border-[#DC2626]' : ''}`}
                  placeholder="Your mobile number"
                  value={formData.complainant_phone}
                  onChange={(e) => { setFormData({...formData, complainant_phone: e.target.value.replace(/\D/g, '').slice(0, 10)}); if (fieldErrors.complainant_phone) setFieldErrors(p => ({...p, complainant_phone: ''})); }}
                  inputMode="numeric"
                  maxLength={10}
                />
                {fieldErrors.complainant_phone && <p className="mt-1 text-xs text-[#DC2626]">{fieldErrors.complainant_phone}</p>}
              </div>
              <div>
                <Label htmlFor="complainant_email">4. Email Address *</Label>
                <Input
                  id="complainant_email"
                  type="email"
                  className={`mt-2 ${fieldErrors.complainant_email ? 'border-[#DC2626]' : ''}`}
                  placeholder="Your email address"
                  value={formData.complainant_email}
                  onChange={(e) => { setFormData({...formData, complainant_email: e.target.value}); if (fieldErrors.complainant_email) setFieldErrors(p => ({...p, complainant_email: ''})); }}
                />
                {fieldErrors.complainant_email && <p className="mt-1 text-xs text-[#DC2626]">{fieldErrors.complainant_email}</p>}
              </div>
              <div>
                <Label htmlFor="incident_date">5. Date of Incident *</Label>
                <Input
                  id="incident_date"
                  type="date"
                  className={`mt-2 ${fieldErrors.incident_date ? 'border-[#DC2626]' : ''}`}
                  value={formData.incident_date}
                  onChange={(e) => { setFormData({...formData, incident_date: e.target.value}); if (fieldErrors.incident_date) setFieldErrors(p => ({...p, incident_date: ''})); }}
                  data-testid="incident-date-input"
                />
                {fieldErrors.incident_date && <p className="mt-1 text-xs text-[#DC2626]">{fieldErrors.incident_date}</p>}
              </div>
              <div>
                <Label htmlFor="location">6. Location *</Label>
                <Input
                  id="location"
                  className={`mt-2 ${fieldErrors.location ? 'border-[#DC2626]' : ''}`}
                  placeholder="Incident location (station, train, etc.)"
                  value={formData.location}
                  onChange={(e) => { setFormData({...formData, location: e.target.value}); if (fieldErrors.location) setFieldErrors(p => ({...p, location: ''})); }}
                />
                {fieldErrors.location && <p className="mt-1 text-xs text-[#DC2626]">{fieldErrors.location}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="address">7. Address *</Label>
              <Textarea
                id="address"
                className={`mt-2 min-h-[100px] ${fieldErrors.address ? 'border-[#DC2626]' : ''}`}
                placeholder="Your full address including state and pincode. This will help in directing your complaint to the correct police station."
                value={formData.address}
                onChange={(e) => { setFormData({...formData, address: e.target.value}); if (fieldErrors.address) setFieldErrors(p => ({...p, address: ''})); }}
              />
              {fieldErrors.address && <p className="mt-1 text-xs text-[#DC2626]">{fieldErrors.address}</p>}
            </div>

            <div>
              <Label htmlFor="description">8. Description *</Label>
              <Textarea
                id="description"
                className={`mt-2 min-h-[150px] ${fieldErrors.description ? 'border-[#DC2626]' : ''}`}
                placeholder="Provide detailed description of the incident with correct location, date, and time. This will help the authorities in their investigation."
                value={formData.description}
                onChange={(e) => { setFormData({...formData, description: e.target.value}); if (fieldErrors.description) setFieldErrors(p => ({...p, description: ''})); }}
                data-testid="description-textarea"
              />
              {fieldErrors.description && <p className="mt-1 text-xs text-[#DC2626]">{fieldErrors.description}</p>}
            </div>

            <div>
              <Label>9. Supporting Documents</Label>
              <input
                ref={supportingDocsRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mov,.avi,.webm"
                multiple
                className="hidden"
                onChange={handleSupportingDocsChange}
              />
              <button
                type="button"
                onClick={() => supportingDocsRef.current?.click()}
                className="mt-2 w-full flex items-center gap-2 px-4 py-2 border border-dashed border-[#60A5FA] rounded-md text-sm text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
              >
                <Upload className="w-4 h-4" />
                {supportingDocs.length
                  ? `${supportingDocs.length} file(s) selected`
                  : `Upload Supporting Documents (${ALLOWED_FILE_TYPES_LABEL})`}
              </button>
              <p className="mt-2 text-xs text-[#64748B]">
                You can select multiple files at once, or click again to add more files.
              </p>
              {supportingDocs.length > 0 && (
                <div className="mt-2 space-y-1">
                  {supportingDocs.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-md bg-[#F8FAFC] px-3 py-2">
                      <p className="text-xs text-[#64748B] truncate">• {file.name}</p>
                      <button
                        type="button"
                        onClick={() => removeSupportingDoc(index)}
                        className="text-xs font-medium text-[#DC2626] hover:underline flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {supportingDocs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSupportingDocs([])}
                      className="text-xs font-medium text-[#2563EB] hover:underline"
                    >
                      Clear all files
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="complaint-captcha">10. Security Check {captcha?.question ? `(${captcha.question})` : ''} *</Label>
              <Input
                id="complaint-captcha"
                inputMode="numeric"
                className={`mt-2 ${fieldErrors.captcha ? 'border-[#DC2626]' : ''}`}
                placeholder={captcha ? 'Enter answer' : 'Loading security check...'}
                value={captchaAnswer}
                onChange={(e) => {
                  setCaptchaAnswer(e.target.value.replace(/\D/g, '').slice(0, 4));
                  if (fieldErrors.captcha) setFieldErrors(p => ({ ...p, captcha: '' }));
                }}
              />
              {fieldErrors.captcha && <p className="mt-1 text-xs text-[#DC2626]">{fieldErrors.captcha}</p>}
            </div>

            <div className="bg-[#FEF2F2] border border-[#FECACA] p-4 rounded-md flex gap-3">
              <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#991B1B]">
                Your complaint will be reviewed by the GRP Admin and forwarded to the concerned police station. You will receive email notifications for any updates on your complaint.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:flex-1 border-[#60A5FA] text-[#2563EB] hover:bg-[#EFF6FF] py-6 text-lg"
                onClick={resetComplaintForm}
                disabled={loading}
              >
                Clear Form
              </Button>
              <Button
                type="submit"
                className="w-full sm:flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] py-6 text-lg"
                disabled={loading}
                data-testid="submit-complaint-button"
              >
                {loading ? 'Submitting...' : 'Submit e-Complaint'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
