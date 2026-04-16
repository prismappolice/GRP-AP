import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { complaintsAPI } from '@/lib/api';
import { toast } from 'sonner';

export const ComplaintPage = () => {
  const [loading, setLoading] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(null);
  const [formData, setFormData] = useState({
    complainant_name: '',
    complainant_phone: '',
    complaint_type: '',
    description: '',
    location: '',
    station: 'Unassigned',
    incident_date: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await complaintsAPI.create(formData);
      setTrackingNumber(response.data.tracking_number);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to register complaint');
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
            <Button
              onClick={() => { setTrackingNumber(null); setFormData({ complainant_name: '', complainant_phone: '', complaint_type: '', description: '', location: '', station: 'Unassigned', incident_date: '' }); }}
              className="bg-[#2563EB] hover:bg-[#1D4ED8]"
            >
              File Another Complaint
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <FileText className="w-12 h-12 text-[#2563EB] mb-4" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">File a Complaint</h1>
          <p className="text-base text-[#475569] mt-2">Register your complaint with GRP. You will receive a tracking number.</p>
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
                <Label htmlFor="complainant_phone">Phone Number *</Label>
                <Input
                  id="complainant_phone"
                  className="mt-2"
                  placeholder="Your mobile number"
                  value={formData.complainant_phone}
                  onChange={(e) => setFormData({...formData, complainant_phone: e.target.value})}
                  required
                />
              </div>
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
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location/Place of Incident *</Label>
              <Input
                id="location"
                className="mt-2"
                placeholder="E.g., Platform 2, Waiting Room"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                required
                data-testid="location-input"
              />
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
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                className="mt-2 min-h-[150px]"
                placeholder="Provide detailed description of the incident..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                data-testid="description-textarea"
              />
            </div>

            <div className="bg-[#F1F5F9] p-4 rounded-md flex gap-3">
              <AlertCircle className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#475569]">
                Your complaint will be reviewed by the GRP central admin and forwarded to the concerned police station. You will receive a tracking number — please save it.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] py-6 text-lg"
              disabled={loading}
              data-testid="submit-complaint-button"
            >
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
