import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, FileSearch, Clock3, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { complaintsAPI } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_STYLES = {
  pending: 'bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]',
  approved: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]',
  investigating: 'bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]',
  resolved: 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]',
  closed: 'bg-[#E5E7EB] text-[#374151] border-[#D1D5DB]',
  rejected: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]',
};

const formatErrorDetail = (detail) => {
  if (!detail) return 'Unable to track complaint right now';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(item => item?.msg || item).filter(Boolean).join(', ') || 'Unable to track complaint right now';
  }
  if (detail?.msg) return detail.msg;
  return 'Unable to track complaint right now';
};

const prettyStatus = (status) => {
  const value = String(status || 'pending').replace(/_/g, ' ');
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const ComplaintTrackingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTrackingNumber = (searchParams.get('tracking') || '').trim().toUpperCase();
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const statusClassName = useMemo(() => {
    const key = String(result?.status || 'pending').toLowerCase();
    return STATUS_STYLES[key] || 'bg-[#E5E7EB] text-[#374151] border-[#D1D5DB]';
  }, [result]);

  const handleTrack = async (numberToTrack) => {
    const normalizedTracking = String(numberToTrack || '').trim().toUpperCase();
    if (!normalizedTracking) {
      toast.error('Please enter a tracking number');
      return;
    }

    setLoading(true);
    setSearched(true);
    setResult(null);
    try {
      const response = await complaintsAPI.track(normalizedTracking);
      setResult(response.data);
      setSearchParams({ tracking: normalizedTracking });
    } catch (error) {
      toast.error(formatErrorDetail(error?.response?.data?.detail));
      setSearchParams(normalizedTracking ? { tracking: normalizedTracking } : {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingNumber) {
      handleTrack(initialTrackingNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <FileSearch className="w-12 h-12 text-[#2563EB] mb-4 mx-auto" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">Track Complaint Status</h1>
          <p className="text-base text-[#475569] mt-2">
            Enter your GRP tracking number to check the latest complaint status updates.
          </p>
        </div>

        <Card className="p-6 sm:p-8 border border-[#60A5FA] bg-white shadow-sm mb-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="tracking_number">Tracking Number</Label>
              <Input
                id="tracking_number"
                className="mt-2 uppercase"
                placeholder="Example: GRP1234ABCD"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                className="w-full sm:flex-1 bg-[#2563EB] hover:bg-[#1D4ED8]"
                onClick={() => handleTrack(trackingNumber)}
                disabled={loading}
              >
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Searching...' : 'Track Complaint'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto border-[#60A5FA] text-[#2563EB] hover:bg-[#EFF6FF]"
                onClick={() => {
                  setTrackingNumber('');
                  setResult(null);
                  setSearched(false);
                  setSearchParams({});
                }}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
            <p className="text-xs text-[#64748B]">
              You can find this tracking number in your complaint submission confirmation.
            </p>
          </div>
        </Card>

        {result && (
          <Card className="p-6 sm:p-8 border border-[#60A5FA] bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-[#2563EB] mb-1">Tracking Number</p>
                <h2 className="text-2xl font-extrabold text-[#0F172A] tracking-wide">{result.tracking_number}</h2>
              </div>
              <span className={`inline-flex items-center gap-2 border px-3 py-1.5 rounded-full text-sm font-semibold ${statusClassName}`}>
                {String(result.status).toLowerCase() === 'resolved' ? <CheckCircle2 className="w-4 h-4" /> :
                 String(result.status).toLowerCase() === 'rejected' ? <XCircle className="w-4 h-4" /> :
                 <Clock3 className="w-4 h-4" />}
                {prettyStatus(result.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
              <div className="rounded-xl bg-[#F8FAFC] p-4">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Complaint Type</p>
                <p className="text-[#0F172A] font-medium">{String(result.complaint_type || '-').replace(/_/g, ' ')}</p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] p-4">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Assigned Station</p>
                <p className="text-[#0F172A] font-medium">{result.station || 'Unassigned'}</p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] p-4">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Incident Date</p>
                <p className="text-[#0F172A] font-medium">{result.incident_date || '-'}</p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] p-4">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-[#0F172A] font-medium">{result.updated_at ? new Date(result.updated_at).toLocaleString() : '-'}</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F8FAFC] p-4 mb-4">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Complaint Description</p>
              <p className="text-sm leading-6 text-[#334155] whitespace-pre-wrap">{result.description || '-'}</p>
            </div>

            {result.rejection_reason && (
              <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#B91C1C] mb-1">Rejection Reason</p>
                  <p className="text-sm text-[#7F1D1D]">{result.rejection_reason}</p>
                </div>
              </div>
            )}
          </Card>
        )}

        {searched && !loading && !result && (
          <Card className="p-8 border border-dashed border-[#CBD5E1] bg-white text-center">
            <AlertCircle className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
            <p className="text-[#475569]">No complaint found for this tracking number.</p>
          </Card>
        )}

        <div className="mt-6 text-center text-sm text-[#64748B]">
          Need a new complaint?{' '}
          <Link to="/complaint" className="text-[#2563EB] font-semibold hover:underline">
            File one here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ComplaintTrackingPage;
