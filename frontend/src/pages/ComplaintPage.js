import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { complaintsAPI } from '@/lib/api';
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
    aadhar_number: '',
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

  const resetComplaintForm = () => {
    setTrackingNumber(null);
    setFormData({
      complainant_name: '',
      complainant_phone: '',
      aadhar_number: '',
      complainant_email: '',
      address: '',
      complaint_type: '',
      description: '',
      station: 'Unassigned',
      incident_date: '',
    });
    setSupportingDocs([]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(formData.complainant_phone || '')) { toast.error('Phone number must be exactly 10 digits'); return; }
    if (!EMAIL_REGEX.test((formData.complainant_email || '').trim())) { toast.error('Please enter a valid email address'); return; }
    if (!supportingDocs.length) { toast.error('Please upload supporting documents'); return; }
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries({ ...formData, complainant_email: (formData.complainant_email || '').trim() }).forEach(([k, v]) => data.append(k, v));
      supportingDocs.forEach(file => data.append('supporting_docs', file));
      const response = await complaintsAPI.create(data);
      setTrackingNumber(response.data.tracking_number);
    } catch (error) {
      toast.error(formatErrorDetail(error?.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  if (trackingNumber) {
    return (
      <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-10 border border-[#60A5FA] bg-white text-center">
            <CheckCircle className="w-16 h-16 text-[#16A34A] mx-auto mb-4" />
            <h2 className="text-3xl font-extrabold heading-font text-[#0F172A] mb-2">Complaint Registered!</h2>
            <p className="text-[#475569] mb-6">Your complaint has been submitted. Please save your tracking number.</p>
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-6 py-4 inline-block mb-6">
              <p className="text-sm text-[#16A34A] font-semibold mb-1">Tracking Number</p>
              <p className="text-2xl font-extrabold text-[#15803D] tracking-widest">{trackingNumber}</p>
            </div>
            <p className="text-sm text-[#64748B] mb-6">Your complaint will be reviewed by the GRP admin and forwarded to the concerned police station.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-[#2563EB] hover:bg-[#1D4ED8]">
                <Link to={`/track-complaint?tracking=${trackingNumber}`}>Track This Complaint</Link>
              </Button>
              <Button
                onClick={resetComplaintForm}
                variant="outline"
                className="border-[#60A5FA] text-[#2563EB] hover:bg-[#EFF6FF]"
              >
                File Another Complaint
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <FileText className="w-12 h-12 text-[#2563EB] mb-4 mx-auto" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">File a Complaint</h1>
          <p className="text-base text-[#475569] mt-2">Register your complaint with GRP. You will receive a tracking number.</p>
          <p className="text-sm text-[#64748B] mt-3">
            Already have a tracking number?{' '}
            <Link to="/track-complaint" className="text-[#2563EB] font-semibold hover:underline">
              Track complaint status here
            </Link>
          </p>
        </div>

        <Card className="p-8 border border-[#60A5FA] bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="complainant_name">Full Name *</Label>
                <Input
                  id="complainant_name"
                  className="mt-2"
                  placeholder="Your full name"
                  value={formData.complainant_name}
                  onChange={(e) => setFormData({...formData, complainant_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="complaint_type">Complaint Type *</Label>
                <Select value={formData.complaint_type} onValueChange={(val) => setFormData({...formData, complaint_type: val})} required>
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
                {formData.complaint_type && (
                  <p className="mt-2 text-xs text-[#64748B]">
                    <span className="font-semibold text-[#0F172A]">Note:</span> Please upload supporting proofs (Images/Videos) in the Supporting Documentation upload section.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="complainant_phone">Phone Number *</Label>
                <Input
                  id="complainant_phone"
                  className="mt-2"
                  placeholder="Your mobile number"
                  value={formData.complainant_phone}
                  onChange={(e) => setFormData({...formData, complainant_phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  title="Phone number must be exactly 10 digits"
                  required
                />
              </div>
              <div>
                <Label htmlFor="aadhar_number">Aadhaar Number *</Label>
                <Input
                  id="aadhar_number"
                  className="mt-2"
                  placeholder="12-digit Aadhaar number"
                  value={formData.aadhar_number}
                  onChange={(e) => setFormData({...formData, aadhar_number: e.target.value.replace(/\D/g, '').slice(0, 12)})}
                  inputMode="numeric"
                  pattern="[0-9]{12}"
                  maxLength={12}
                  required
                />
              </div>
              <div>
                <Label htmlFor="complainant_email">Email Address *</Label>
                <Input
                  id="complainant_email"
                  type="email"
                  className="mt-2"
                  placeholder="Your email address"
                  value={formData.complainant_email}
                  onChange={(e) => setFormData({...formData, complainant_email: e.target.value})}
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                  title="Please enter a valid email address"
                  required
                />
                {formData.complainant_email && !EMAIL_REGEX.test(formData.complainant_email.trim()) && (
                  <p className="mt-2 text-xs text-[#DC2626]">Please enter a valid email address.</p>
                )}
              </div>
              <div>
                <Label htmlFor="incident_date">Date of Incident *</Label>
                <Input
                  id="incident_date"
                  type="date"
                  className="mt-2"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                  required
                  data-testid="incident-date-input"
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  className="mt-2"
                  placeholder="Incident location (station, train, etc.)"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                className="mt-2 min-h-[100px]"
                placeholder="Your full address including state and pincode. This will help in directing your complaint to the correct police station."
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                className="mt-2 min-h-[150px]"
                placeholder="Provide detailed description of the incident with correct location, date, and time. This will help the authorities in their investigation."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                data-testid="description-textarea"
              />
            </div>

            <div>
              <Label>Supporting Documents *</Label>
              <input
                ref={supportingDocsRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.mov,.avi,.webm"
                multiple
                className="hidden"
                onChange={handleSupportingDocsChange}
                required
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

            <div className="bg-[#F1F5F9] p-4 rounded-md flex gap-3">
              <AlertCircle className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#475569]">
                Your complaint will be reviewed by the GRP central admin and forwarded to the concerned police station. You will receive a tracking number — please save it.
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
                {loading ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
