import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, User, Download, X, Undo, Search, Filter, Clock, CheckCircle2, XCircle, AlertCircle, LogIn } from 'lucide-react';
import { complaintsAPI } from '@/lib/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const STATUS_COLORS = {
  pending: '#F59E0B',
  investigating: '#3B82F6',
  resolved: '#10B981',
  approved: '#059669',
  rejected: '#EF4444',
  closed: '#6B7280',
  withdrawn: '#8B5CF6',
};

export const UsersDashboardPage = () => {
  const { user } = useAuth();

  const loginTime = useMemo(() => {
    // Prefer explicit login timestamp stored on login
    const stored = localStorage.getItem('grp_login_time');
    if (stored) {
      return new Date(Number(stored)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    // Fallback: decode iat from JWT
    try {
      const token = localStorage.getItem('grp_auth_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload?.iat) return null;
      const t = new Date(payload.iat * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      // Cache it for future renders
      localStorage.setItem('grp_login_time', (payload.iat * 1000).toString());
      return t;
    } catch { return null; }
  }, []);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await complaintsAPI.getAll();
      setComplaints(res.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter(c => !c.status || String(c.status).toLowerCase() === 'pending').length;
    const active = complaints.filter(c => ['investigating', 'approved'].includes(String(c.status || '').toLowerCase())).length;
    const resolved = complaints.filter(c => ['resolved', 'closed'].includes(String(c.status || '').toLowerCase())).length;
    const rejected = complaints.filter(c => String(c.status || '').toLowerCase() === 'rejected').length;
    return { total, pending, active, resolved, rejected };
  }, [complaints]);

  const pieData = useMemo(() => {
    const counts = {};
    complaints.forEach(c => {
      const s = String(c.status || 'pending').toLowerCase();
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value,
      color: STATUS_COLORS[status] || '#94A3B8',
    }));
  }, [complaints]);

  const barData = useMemo(() => {
    const counts = {};
    complaints.forEach(c => {
      const t = c.complaint_type || 'Other';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchesStatus = statusFilter === 'all' || String(c.status || 'pending').toLowerCase() === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q
        || (c.tracking_number || '').toLowerCase().includes(q)
        || (c.complaint_type || '').toLowerCase().includes(q)
        || (c.description || '').toLowerCase().includes(q)
        || (c.location || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [complaints, searchQuery, statusFilter]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      investigating: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
      withdrawn: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatusLabel = (status) => {
    const value = String(status || '').trim();
    if (!value) return 'Pending';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  const hasEvidence = (complaint) =>
    complaint?.evidence_media || complaint?.evidence || complaint?.media || complaint?.attachments;

  const openMediaModal = (mediaData) => { setSelectedMedia(mediaData); setShowMediaModal(true); };
  const closeMediaModal = () => { setShowMediaModal(false); setSelectedMedia(null); };

  const handleDownloadMedia = (mediaUrl) => {
    if (!mediaUrl) return;
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = mediaUrl.split('/').pop() || 'media';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImageUrl = (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url || '');
  const isVideoUrl = (url) => /\.(mp4|webm|ogg|avi|mov)$/i.test(url || '');

  const handleWithdraw = async (complaintId) => {
    if (window.confirm('Are you sure you want to withdraw this complaint?')) {
      try {
        await complaintsAPI.update(complaintId, { status: 'withdrawn' });
        setComplaints(complaints.filter(c => c.id !== complaintId));
      } catch (error) {
        console.error('Failed to withdraw complaint:', error);
        alert('Failed to withdraw complaint');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Complaints', value: stats.total, icon: FileText, color: 'bg-[#2563EB]', textColor: 'text-[#2563EB]' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#F59E0B]', textColor: 'text-[#F59E0B]' },
    { label: 'Under Investigation', value: stats.active, icon: AlertCircle, color: 'bg-[#8B5CF6]', textColor: 'text-[#8B5CF6]' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'bg-[#10B981]', textColor: 'text-[#10B981]' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'bg-[#EF4444]', textColor: 'text-[#EF4444]' },
  ];

  return (
    <div className="min-h-screen pt-0 bg-[#F1F5F9]">
      {/* Header Banner */}
      <div className="bg-[#0F172A] px-6 py-8 pt-24">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#2563EB] rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold heading-font text-white">My Dashboard</h1>
              <p className="text-sm text-[#94A3B8]">Welcome back, {user?.name}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-[#64748B]">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {loginTime && (
              <p className="text-xs text-[#475569] flex items-center gap-1">
                <LogIn className="w-3 h-3" />
                Logged in at {loginTime}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, textColor }) => (
            <Card key={label} className="p-4 border border-[#E2E8F0] bg-white hover:shadow-md transition-shadow">
              <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className={`text-3xl font-extrabold heading-font ${textColor}`}>{value}</p>
              <p className="text-xs text-[#64748B] mt-0.5 leading-tight">{label}</p>
            </Card>
          ))}
        </div>

        {/* Charts — only show when there is data */}
        {complaints.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 border border-[#E2E8F0] bg-white">
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide mb-4">Complaints by Status</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    paddingAngle={3} dataKey="value"
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 border border-[#E2E8F0] bg-white">
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide mb-4">Complaints by Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Complaints Table */}
        <Card className="border border-[#E2E8F0] bg-white">
          {/* Table Header with Filters */}
          <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h2 className="text-base font-bold heading-font text-[#0F172A]">My Complaints</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search by tracking, type, location..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-full sm:w-64"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="investigating">Investigating</option>
                  <option value="approved">Approved</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="p-14 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-[#64748B] font-medium">
                {complaints.length === 0 ? 'No complaints filed yet' : 'No complaints match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <TableHead className="font-semibold text-[#334155] border-r border-[#E2E8F0] px-4 py-3 w-12">#</TableHead>
                    <TableHead className="font-semibold text-[#334155] border-r border-[#E2E8F0] px-4 py-3">Tracking No</TableHead>
                    <TableHead className="font-semibold text-[#334155] border-r border-[#E2E8F0] px-4 py-3">Date</TableHead>
                    <TableHead className="font-semibold text-[#334155] border-r border-[#E2E8F0] px-4 py-3">Type</TableHead>
                    <TableHead className="font-semibold text-[#334155] border-r border-[#E2E8F0] px-4 py-3">Description</TableHead>
                    <TableHead className="font-semibold text-[#334155] border-r border-[#E2E8F0] px-4 py-3">Location</TableHead>
                    <TableHead className="font-semibold text-[#334155] border-r border-[#E2E8F0] px-4 py-3">Media</TableHead>
                    <TableHead className="font-semibold text-[#334155] border-r border-[#E2E8F0] px-4 py-3">Status</TableHead>
                    <TableHead className="font-semibold text-[#334155] px-4 py-3">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints.map((complaint, index) => (
                    <TableRow key={complaint.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                      <TableCell className="text-[#94A3B8] text-xs border-r border-[#E2E8F0] px-4 py-3">{index + 1}</TableCell>
                      <TableCell className="font-mono font-semibold text-[#D97706] text-sm border-r border-[#E2E8F0] px-4 py-3">{complaint.tracking_number || '-'}</TableCell>
                      <TableCell className="text-[#475569] text-sm border-r border-[#E2E8F0] px-4 py-3 whitespace-nowrap">{complaint.incident_date || '-'}</TableCell>
                      <TableCell className="font-medium text-[#0F172A] text-sm border-r border-[#E2E8F0] px-4 py-3">{complaint.complaint_type || '-'}</TableCell>
                      <TableCell className="max-w-[280px] whitespace-normal break-words text-[#475569] text-sm border-r border-[#E2E8F0] px-4 py-3">{complaint.description || '-'}</TableCell>
                      <TableCell className="max-w-[130px] whitespace-normal break-words text-[#475569] text-sm border-r border-[#E2E8F0] px-4 py-3">{complaint.location || '-'}</TableCell>
                      <TableCell className="border-r border-[#E2E8F0] px-4 py-3">
                        {hasEvidence(complaint) ? (
                          <button
                            onClick={() => openMediaModal(complaint.evidence_media || complaint.evidence || complaint.media || complaint.attachments)}
                            className="px-3 py-1 bg-[#2563EB] text-white text-xs font-medium rounded-full hover:bg-[#1D4ED8] transition-colors"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-[#CBD5E1] text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell className="border-r border-[#E2E8F0] px-4 py-3">
                        <div className="space-y-1">
                          <Badge className={`text-xs ${getStatusColor(complaint.status)}`}>{formatStatusLabel(complaint.status)}</Badge>
                          {complaint.rejection_reason && (
                            <p className="text-xs text-red-500 max-w-[160px] break-words">↳ {complaint.rejection_reason}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <button
                          onClick={() => handleWithdraw(complaint.id)}
                          className="px-2 py-1 bg-[#FEF3C7] text-[#92400E] text-xs font-medium rounded-full hover:bg-[#FDE68A] transition-colors flex items-center gap-1"
                          title="Withdraw Complaint"
                        >
                          <Undo className="w-3 h-3" />
                          Withdraw
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredComplaints.length > 0 && (
            <div className="px-4 py-3 border-t border-[#E2E8F0] text-xs text-[#94A3B8]">
              Showing {filteredComplaints.length} of {complaints.length} complaint{complaints.length !== 1 ? 's' : ''}
            </div>
          )}
        </Card>
      </div>

      {showMediaModal && selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
              <h3 className="text-xl font-bold text-[#0F172A]">Evidence Upload</h3>
              <button
                onClick={closeMediaModal}
                className="text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {Array.isArray(selectedMedia) ? (
                <div className="space-y-4">
                  {selectedMedia.map((media, idx) => (
                    <div
                      key={idx}
                      className="border border-[#E2E8F0] rounded-lg p-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex-1">
                        {isImageUrl(media) ? (
                          <img
                            src={media}
                            alt={`Evidence ${idx + 1}`}
                            className="max-w-md h-auto rounded cursor-pointer hover:opacity-90"
                            onClick={() => window.open(media, '_blank')}
                          />
                        ) : isVideoUrl(media) ? (
                          <video
                            src={media}
                            controls
                            className="max-w-md h-auto rounded"
                          />
                        ) : (
                          <div className="bg-[#F1F5F9] p-4 rounded text-[#475569] break-all">
                            <a href={media} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">
                              {media.split('/').pop() || 'Media File'}
                            </a>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownloadMedia(media)}
                        className="ml-4 p-2 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors flex-shrink-0"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : typeof selectedMedia === 'string' ? (
                <div className="space-y-4">
                  {isImageUrl(selectedMedia) ? (
                    <div>
                      <img
                        src={selectedMedia}
                        alt="Evidence"
                        className="max-w-full h-auto rounded cursor-pointer hover:opacity-90"
                        onClick={() => window.open(selectedMedia, '_blank')}
                      />
                    </div>
                  ) : isVideoUrl(selectedMedia) ? (
                    <video
                      src={selectedMedia}
                      controls
                      className="max-w-full h-auto rounded"
                    />
                  ) : (
                    <div className="bg-[#F1F5F9] p-4 rounded text-[#475569] break-all">
                      <a href={selectedMedia} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">
                        {selectedMedia}
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => handleDownloadMedia(selectedMedia)}
                    className="w-full py-2 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>
              ) : (
                <div className="text-[#475569]">
                  {Object.entries(selectedMedia).map(([key, value]) => (
                    <div key={key} className="mb-4">
                      <p className="font-medium text-[#0F172A] capitalize">{key}</p>
                      {isImageUrl(value) ? (
                        <img
                          src={value}
                          alt={key}
                          className="max-w-md h-auto rounded cursor-pointer hover:opacity-90 mt-2"
                          onClick={() => window.open(value, '_blank')}
                        />
                      ) : isVideoUrl(value) ? (
                        <video
                          src={value}
                          controls
                          className="max-w-md h-auto rounded mt-2"
                        />
                      ) : (
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline text-sm mt-2 block">
                          {value}
                        </a>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => handleDownloadMedia(selectedMedia.toString())}
                    className="mt-4 px-4 py-2 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
