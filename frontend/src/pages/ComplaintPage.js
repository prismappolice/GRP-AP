import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, AlertCircle } from 'lucide-react';
import { complaintsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getAllStations, getOfficerScope } from '@/lib/policeScope';
import { toast } from 'sonner';

export const ComplaintPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    complaint_type: '',
    description: '',
    location: '',
    station: user?.role === 'police' ? '' : 'Unassigned',
    incident_date: '',
  });

  const allStations = useMemo(() => getAllStations(), []);
  const officerScope = useMemo(() => getOfficerScope(user), [user]);
  const stationOptions = useMemo(() => {
    if (user?.role !== 'police') return allStations;
    return officerScope.stations.length > 0 ? officerScope.stations : allStations;
  }, [allStations, officerScope, user]);

  useEffect(() => {
    if (user?.role !== 'police') return;
    if (formData.station) return;
    if (!officerScope.defaultStation) return;
    setFormData((prev) => ({ ...prev, station: officerScope.defaultStation }));
  }, [formData.station, officerScope.defaultStation, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await complaintsAPI.create(formData);
      toast.success(`Complaint registered! Tracking number: ${response.data.tracking_number}`);
      navigate(officerScope.dashboardPath || '/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to register complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <FileText className="w-12 h-12 text-[#2563EB] mb-4" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">File a Complaint</h1>
          <p className="text-base text-[#475569] mt-2">Register your complaint with GRP. You will receive a tracking number.</p>
        </div>

        <Card className="p-8 border border-[#E2E8F0] bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {user?.role === 'police' && (
              <div>
                <Label htmlFor="station">GRP Station *</Label>
                <Select value={formData.station} onValueChange={(val) => setFormData({...formData, station: val})} required>
                  <SelectTrigger className="mt-2" data-testid="station-select">
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent side="bottom" avoidCollisions={false}>
                    {stationOptions.map((stationName, idx) => (
                      <SelectItem key={stationName + idx} value={stationName}>{stationName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-xs text-[#64748B]">
                  Station list filtered by your assigned jurisdiction.
                </p>
              </div>
            )}

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
                {user?.role === 'police'
                  ? 'You will receive a tracking number after submitting this complaint. Please save it for future reference.'
                  : 'Your complaint will be reviewed by the GRP central admin and forwarded to the concerned police station. You will receive a tracking number — please save it.'
                }
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
