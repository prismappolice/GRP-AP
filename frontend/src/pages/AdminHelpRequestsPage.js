import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { helpAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, Phone, HelpCircle, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-200 text-gray-600',
};

const AdminHelpRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await helpAPI.getAll();
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load help requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await helpAPI.updateStatus(id, newStatus);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return '-';
    try {
      return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return dt;
    }
  };

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    resolved: requests.filter(r => r.status === 'resolved').length,
    closed: requests.filter(r => r.status === 'closed').length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    if (!searchText.trim()) return requests;
    const q = searchText.toLowerCase();
    return requests.filter(r =>
      [r.name, r.phone, r.email, r.message, r.status].join(' ').toLowerCase().includes(q)
    );
  }, [requests, searchText]);

  if (loading) return <div className="min-h-screen pt-4 px-4 text-center">Loading help requests...</div>;

  return (
    <div className="min-h-screen pt-4 pb-12 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminPageHero
          title="Help Requests"
          description="View and manage all public help desk submissions."
        />
          <div className="mb-4">
                  <button onClick={() => navigate('/admin-dashboard')} className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:underline font-medium">
                    ← Back to Dashboard
                  </button>
                </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Requests', value: stats.total, icon: HelpCircle, color: 'bg-[#2563EB]', text: 'text-[#2563EB]' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'bg-[#10B981]', text: 'text-[#10B981]' },
            { label: 'Closed', value: stats.closed, icon: XCircle, color: 'bg-[#6B7280]', text: 'text-[#6B7280]' },
          ].map(({ label, value, icon: Icon, color, text }) => (
            <Card key={label} className="p-4 border border-[#60A5FA] bg-white">
              <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{label}</p>
            </Card>
          ))}
        </div>
        <Card className="p-8 border border-[#60A5FA] shadow-sm bg-white">          <div className="mb-4 relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search by name, phone, email, message..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            />
          </div>          <div className="overflow-x-auto rounded-xl border border-[#60A5FA]">
            <Table className="border-collapse">
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-[#F8FAFC]">
                  <TableHead className="border border-[#60A5FA] px-4 py-3 w-16 text-center font-bold text-[#0F172A]">S.No</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Name</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Contact</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Message</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Date</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Status</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="border border-[#60A5FA] px-4 py-10 text-center text-[#64748B]">
                      No help requests yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((req, index) => (
                    <TableRow key={req.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="border border-[#60A5FA] px-4 py-3 text-center font-semibold text-[#0F172A]">{index + 1}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3 font-medium text-[#0F172A] whitespace-nowrap">{req.name || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3">
                        <div className="space-y-1">
                          {req.phone && (
                            <a href={`tel:${req.phone}`} className="flex items-center gap-1 text-sm text-[#475569] hover:text-[#2563EB]">
                              <Phone className="w-3 h-3 shrink-0" />
                              {req.phone}
                            </a>
                          )}
                          {req.email && (
                            <a href={`mailto:${req.email}`} className="flex items-center gap-1 text-sm text-[#2563EB] hover:underline truncate max-w-[180px]">
                              <Mail className="w-3 h-3 shrink-0" />
                              {req.email}
                            </a>
                          )}
                          {!req.phone && !req.email && <span className="text-[#94A3B8]">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3 max-w-xs">
                        <p className="text-sm text-[#334155] line-clamp-2" title={req.message}>{req.message || '-'}</p>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3 text-[#334155] whitespace-nowrap text-sm">{formatDate(req.created_at)}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-600'}`}>
                          {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3">
                        {req.status === 'pending' ? (
                          <button
                            className="px-3 py-1 bg-[#10B981] text-white text-xs font-medium rounded hover:bg-[#059669] transition-colors disabled:opacity-50"
                            disabled={updatingId === req.id}
                            onClick={() => handleStatusChange(req.id, 'resolved')}
                          >
                            {updatingId === req.id ? '...' : 'Mark Resolved'}
                          </button>
                        ) : req.status === 'resolved' ? (
                          <button
                            className="px-3 py-1 bg-[#F1F5F9] text-[#475569] text-xs font-medium rounded hover:bg-[#E2E8F0] transition-colors border border-[#60A5FA] disabled:opacity-50"
                            disabled={updatingId === req.id}
                            onClick={() => handleStatusChange(req.id, 'closed')}
                          >
                            {updatingId === req.id ? '...' : 'Close'}
                          </button>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">Closed</span>
                        )}
                      </TableCell>
                    </TableRow>
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

export default AdminHelpRequestsPage;
