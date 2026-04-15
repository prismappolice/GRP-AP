import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building2, ChevronDown, Download, FileText, RefreshCw, Search, X, Check } from 'lucide-react';
import { stationAPI, complaintsAPI } from '@/lib/api';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  investigating: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-700',
};

function exportToCSV(filename, rows) {
  if (!rows.length) return;
  const headers = [
    { key: 'tracking_number', label: 'Tracking #' },
    { key: 'complaint_type', label: 'Crime Type' },
    { key: 'location', label: 'Location' },
    { key: 'incident_date', label: 'Date' },
    { key: 'status', label: 'Status' },
    { key: 'rejection_reason', label: 'Rejection Reason' },
    { key: 'description', label: 'Description' },
  ];
  const headerRow = headers.map(h => `"${h.label}"`).join(',');
  const dataRows = rows.map(row =>
    headers.map(h => `"${String(row[h.key] || '').replace(/_/g, ' ').replace(/"/g, '""')}"`).join(',')
  );
  const csv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const StationComplaintsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [crimeFilter, setCrimeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [inlineReason, setInlineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await stationAPI.getComplaints();
      setComplaints(res.data || []);
    } catch {
      setError('Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleComplaintAction = async (complaintId, status, reason = '') => {
    try {
      setActionLoading(true);
      const res = await complaintsAPI.updateStatus(complaintId, { status, rejection_reason: reason });
      setComplaints(prev => prev.map(c => c.id === complaintId ? res.data : c));
    } catch {
      alert('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectRow = (id) => {
    setRejectingId(id);
    setInlineReason('');
  };

  const cancelReject = () => {
    setRejectingId(null);
    setInlineReason('');
  };

  const submitRejection = async (complaintId) => {
    const reason = inlineReason.trim();
    if (!reason) return;
    await handleComplaintAction(complaintId, 'rejected', reason);
    cancelReject();
  };

  const crimeTypeOptions = useMemo(() => {
    return [...new Set(complaints.map(c => c.complaint_type).filter(Boolean))];
  }, [complaints]);

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const matchSearch = [c.complaint_type, c.description, c.location, c.tracking_number, c.status]
        .join(' ').toLowerCase().includes(searchText.toLowerCase());
      const matchDate = !dateFilter || c.incident_date === dateFilter;
      const matchCrime = !crimeFilter || c.complaint_type === crimeFilter;
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchDate && matchCrime && matchStatus;
    });
  }, [complaints, searchText, dateFilter, crimeFilter, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen pt-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-4 pb-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <Button type="button" variant="outline" onClick={() => navigate('/station-dashboard')} className="border-[#CBD5E1]">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[#2563EB]" />
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] heading-font">Complaints</h1>
              <p className="text-sm text-[#64748B]">Welcome, <span className="font-semibold text-[#2563EB]">{user?.name}</span></p>
            </div>
          </div>
        </div>

        {error && <Card className="mb-4 p-4 border border-red-200 bg-red-50 text-red-700">{error}</Card>}

        {/* Filters */}
        <Card className="mb-4 p-4 border border-[#E2E8F0] bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <div className="relative xl:col-span-2">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search complaints..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            />
            <select
              value={crimeFilter}
              onChange={e => setCrimeFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All crime types</option>
              {crimeTypeOptions.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>
            <Button type="button" size="sm" variant="ghost" onClick={fetchData} className="flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => exportToCSV(`complaints_${new Date().toISOString().slice(0, 10)}.csv`, filtered)}
              className="ml-auto flex items-center gap-1.5 bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </Card>

        {/* Complaints Table */}
        <Card className="p-0 overflow-hidden border border-[#E2E8F0]">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-2 font-semibold text-[#0F172A] bg-white">
            <FileText className="w-4 h-4" />
            Complaints ({filtered.length})
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#EFF6FF]">
                  <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">S.No</TableHead>
                  <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Tracking #</TableHead>
                  <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Type</TableHead>
                  <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Description</TableHead>
                  <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Location</TableHead>
                  <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Date</TableHead>
                  <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Status</TableHead>
                  <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-[#94A3B8]">
                      No complaints found for this station.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c, index) => (
                    <React.Fragment key={c.id}>
                    <TableRow className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <TableCell className="px-4 py-3 text-sm font-semibold text-[#0F172A]">{index + 1}</TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-[#2563EB] font-semibold">{c.tracking_number}</TableCell>
                      <TableCell className="px-4 py-3 capitalize text-sm">{c.complaint_type?.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="px-4 py-3 text-sm max-w-[220px] whitespace-normal break-words text-[#475569]">{c.description || '-'}</TableCell>
                      <TableCell className="px-4 py-3 text-sm max-w-[160px] truncate">{c.location}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">{c.incident_date}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={`inline-flex text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700'}`}>
                            {c.status}
                          </span>
                          {c.rejection_reason && (
                            <p className="max-w-[220px] whitespace-normal break-words text-xs text-red-600">
                              Reason: {c.rejection_reason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-[#2563EB] px-3 text-xs text-[#2563EB] hover:bg-[#EFF6FF]"
                            >
                              Action <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleComplaintAction(c.id, 'approved')}>
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRejectRow(c.id)}>
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {rejectingId === c.id && (
                      <TableRow className="bg-red-50 border-b border-red-200">
                        <TableCell colSpan={8} className="px-4 py-3">
                          <div className="flex items-start gap-2 flex-wrap">
                            <div className="flex-1 min-w-[240px]">
                              <p className="text-xs font-semibold text-red-700 mb-1">Rejection reason <span className="text-red-500">*</span> — visible to the public user on their dashboard</p>
                              <textarea
                                autoFocus
                                value={inlineReason}
                                onChange={e => setInlineReason(e.target.value)}
                                placeholder="Mention why this complaint is being rejected..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-red-300 rounded-md outline-none focus:border-red-500 resize-none bg-white"
                              />
                            </div>
                            <div className="flex gap-2 pt-5">
                              <Button
                                size="sm"
                                disabled={!inlineReason.trim() || actionLoading}
                                onClick={() => submitRejection(c.id)}
                                className="bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
                              >
                                <Check className="h-3.5 w-3.5" /> {actionLoading ? 'Submitting...' : 'Confirm Reject'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelReject} className="flex items-center gap-1">
                                <X className="h-3.5 w-3.5" /> Cancel
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default StationComplaintsPage;
