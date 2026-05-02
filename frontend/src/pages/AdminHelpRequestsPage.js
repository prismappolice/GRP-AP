import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { helpAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, Phone, HelpCircle, Clock, CheckCircle2, XCircle, Search, Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-200 text-gray-600',
  replied: 'bg-indigo-100 text-indigo-800',
};

const AdminHelpRequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [viewTarget, setViewTarget] = useState(null); // for message detail dialog
  const [replySentMap, setReplySentMap] = useState({}); // id -> reply text sent

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

  const openReplyDialog = (req) => {
    setReplyTarget(req);
    setReplyMessage('');
  };

  const closeReplyDialog = () => {
    setReplyTarget(null);
    setReplyMessage('');
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;
    setSendingReply(true);
    try {
      await helpAPI.reply(replyTarget.id, replyMessage.trim());
      // Update local state for replied request
      setRequests(prev => prev.map(r =>
        r.id === replyTarget.id ? { ...r, replied: true } : r
      ));
      setReplySentMap(prev => ({ ...prev, [replyTarget.id]: replyMessage.trim() }));
      toast.success(`Reply sent to ${replyTarget.email}`);
      closeReplyDialog();
    } catch {
      toast.error('Failed to send reply email');
    } finally {
      setSendingReply(false);
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

  // Count replies: assumes each request has a 'replied' boolean or 'reply_count' > 0
  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    closed: requests.filter(r => r.status === 'closed').length,
    replies:
      requests.filter(
        r => r.replied === true || (typeof r.reply_count === 'number' && r.reply_count > 0)
      ).length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (statusFilter === 'replied') {
      list = list.filter(r => r.replied === true);
    } else if (statusFilter) {
      list = list.filter(r => r.status === statusFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter(r => r.created_at && new Date(r.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(r => r.created_at && new Date(r.created_at) <= to);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(r =>
        [r.name, r.phone, r.email, r.message, r.status].join(' ').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, searchText, statusFilter]);

  function exportToExcel() {
    if (!filteredRequests.length) { toast.error('No data to export'); return; }
    const headers = [
      { key: 'sno', label: 'S.No' },
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'message', label: 'Message' },
      { key: 'created_at', label: 'Date' },
      { key: 'status', label: 'Status' },
      { key: 'replied', label: 'Replied' },
    ];
    const data = filteredRequests.map((row, idx) =>
      headers.reduce((obj, h) => {
        if (h.key === 'sno') obj[h.label] = idx + 1;
        else if (h.key === 'replied') obj[h.label] = row[h.key] ? 'Yes' : 'No';
        else obj[h.label] = String(row[h.key] || '');
        return obj;
      }, {})
    );
    const ws = XLSX.utils.json_to_sheet(data, { header: headers.map(h => h.label) });
    ws['!cols'] = headers.map(h => ({
      wch: Math.max(h.label.length, ...data.map(r => String(r[h.label] || '').length)) + 2
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Help Requests');
    XLSX.writeFile(wb, `help_requests_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (loading) return <div className="min-h-screen pt-8 px-4 text-center">Loading help requests...</div>;

  return (
    <>
      <div className="min-h-screen pt-8 pb-12 bg-[#F8FAFC]">
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
            { label: 'Replies', value: stats.replies, icon: Mail, color: 'bg-[#6366F1]', text: 'text-[#6366F1]' },
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
        <Card className="p-4 border border-[#60A5FA] shadow-sm bg-white">
          <div className="flex flex-wrap items-end gap-2 mb-0">
            {/* Date From */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#64748B] mb-1">From</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            </div>
            {/* Date To */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#64748B] mb-1">To</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            </div>
            {/* Quick date buttons */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#64748B] mb-1">&nbsp;</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className={`h-9 px-3 rounded-md border text-xs font-semibold transition-colors ${
                    !dateFrom && !dateTo
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#2563EB] hover:text-[#2563EB]'
                  }`}
                >
                  All
                </button>
                {[
                  { label: 'Last 7 Days', days: 7 },
                  { label: 'Last 30 Days', days: 30 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      from.setDate(from.getDate() - days);
                      setDateFrom(from.toISOString().slice(0, 10));
                      setDateTo(to.toISOString().slice(0, 10));
                    }}
                    className="h-9 px-3 rounded-md border border-[#CBD5E1] bg-white text-xs font-semibold text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Status Dropdown */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#64748B] mb-1">Status</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="replied">Replied</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            {/* Search */}
            <div className="flex flex-col flex-1 min-w-[180px]">
              <span className="text-xs font-semibold text-[#64748B] mb-1">Search</span>
              <div className="relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Name, phone, email..."
                  className="w-full h-9 pl-9 pr-3 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
            {/* Refresh & Export */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#64748B] mb-1">&nbsp;</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { fetchRequests(); setStatusFilter(''); setSearchText(''); setDateFrom(''); setDateTo(''); }}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[#60A5FA] bg-white text-sm font-semibold text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export Excel
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="overflow-x-auto rounded-xl border border-[#60A5FA]">
            <Table className="border-collapse">
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-[#F8FAFC]">
                  <TableHead className="border border-[#60A5FA] px-4 py-3 w-16 text-center font-bold text-[#0F172A]">S.No</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Name</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Contact</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Message</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Date</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Status</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Reply</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="border border-[#60A5FA] px-4 py-10 text-center text-[#64748B]">
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
                        <p
                          className="text-sm text-[#2563EB] line-clamp-2 cursor-pointer hover:text-[#1D4ED8] hover:underline font-medium"
                          onClick={() => setViewTarget(req)}
                          title="Click to view full message"
                        >{req.message || '-'}</p>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3 text-[#334155] whitespace-nowrap text-sm">{formatDate(req.created_at)}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3">
                        <Badge className={`text-xs ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-600'}`}>
                          {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3">
                        {req.replied ? (
                          <Badge className="text-xs bg-indigo-500 text-white">Replied</Badge>
                        ) : req.email ? (
                          <button
                            className="px-3 py-1 bg-[#2563EB] text-white text-xs font-medium rounded hover:bg-[#1D4ED8] transition-colors"
                            onClick={() => openReplyDialog(req)}
                          >
                            Reply
                          </button>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">No email</span>
                        )}
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-3">
                        {req.status !== 'closed' ? (
                          <button
                            className="px-3 py-1 bg-[#6B7280] text-white text-xs font-medium rounded hover:bg-[#4B5563] transition-colors disabled:opacity-50"
                            disabled={updatingId === req.id}
                            onClick={() => handleStatusChange(req.id, 'closed')}
                          >
                            {updatingId === req.id ? '...' : 'Closed'}
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
          </div>
        </Card>
      </div>
      </div>

      {/* Message Detail Dialog */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setViewTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-[#60A5FA] w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#0F172A]">Message Details</h2>
              <button onClick={() => setViewTarget(null)} className="text-[#94A3B8] hover:text-[#0F172A] text-xl font-bold leading-none">&times;</button>
            </div>
            <div className="mb-1">
              <span className="text-xs font-semibold text-[#64748B]">From:</span>
              <span className="ml-2 text-sm text-[#0F172A] font-medium">{viewTarget.name || '-'}</span>
              {viewTarget.phone && <span className="ml-3 text-sm text-[#475569]">📞 {viewTarget.phone}</span>}
              {viewTarget.email && <span className="ml-3 text-sm text-[#2563EB]">✉ {viewTarget.email}</span>}
            </div>
            <div className="mt-3 mb-1">
              <p className="text-xs font-semibold text-[#64748B] mb-1">Message:</p>
              <p className="text-sm text-[#334155] bg-[#F8FAFC] rounded-lg p-3 border border-[#E2E8F0] whitespace-pre-wrap">{viewTarget.message || '-'}</p>
            </div>
            {replySentMap[viewTarget.id] && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-[#6366F1] mb-1">Reply Sent:</p>
                <p className="text-sm text-[#334155] bg-indigo-50 rounded-lg p-3 border border-indigo-200 whitespace-pre-wrap">{replySentMap[viewTarget.id]}</p>
              </div>
            )}
            {!viewTarget.replied && !replySentMap[viewTarget.id] && (
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => { setViewTarget(null); openReplyDialog(viewTarget); }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] transition-colors"
              >
                Reply
              </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Reply Dialog */}
      {replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#60A5FA] w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-bold text-[#0F172A] mb-1">Reply to Help Request</h2>
            <p className="text-sm text-[#475569] mb-4">
              Sending to: <span className="font-medium text-[#2563EB]">{replyTarget.email}</span>
            </p>
            <div className="mb-2">
              <p className="text-xs text-[#64748B] mb-1 font-medium">Original message:</p>
              <p className="text-sm text-[#334155] bg-[#F8FAFC] rounded-lg p-3 border border-[#E2E8F0] line-clamp-3">{replyTarget.message}</p>
            </div>
            <div className="mt-4 mb-4">
              <label className="block text-xs font-medium text-[#475569] mb-1">Your reply</label>
              <textarea
                rows={5}
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full border border-[#CBD5E1] rounded-lg p-3 text-sm outline-none focus:border-[#2563EB] resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeReplyDialog}
                className="px-4 py-2 text-sm font-medium text-[#475569] bg-[#F1F5F9] rounded-lg hover:bg-[#E2E8F0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={sendingReply || !replyMessage.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
              >
                {sendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminHelpRequestsPage;
