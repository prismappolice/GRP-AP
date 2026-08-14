import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, X, FileText, Clock, AlertCircle, CheckCircle2, XCircle, Search, RefreshCw, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import api, { complaintsAPI, getAuthToken } from '@/lib/api';
import { isSensitiveExportKey, sanitizeSpreadsheetRows, sanitizeWorksheetCells } from '@/lib/csv';
import { getAllStations } from '@/lib/policeScope';
import SupportingDocsModal from '@/components/SupportingDocsModal';
import { useSearchParams } from 'react-router-dom';

const AdminComplaintsPage = () => {
  const navigate = useNavigate();
  const token = getAuthToken();
  const isAdmin = Boolean(token && typeof window !== 'undefined' && sessionStorage.getItem('isAdmin') === 'true');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forwardId, setForwardId] = useState(null);
  const [forwardStation, setForwardStation] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);
  const [descModal, setDescModal] = useState(null);
  const [addrModal, setAddrModal] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [docsModal, setDocsModal] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const tableScrollRef = useRef(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [crimeFilter, setCrimeFilter] = useState('');
  const [stationFilter, setStationFilter] = useState(
    () => new URLSearchParams(window.location.search).get('unassigned') === '1' ? 'Unassigned' : ''
  );
  const [searchParams] = useSearchParams();

  // Clear the ?unassigned=1 param from URL immediately after reading it
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('unassigned') === '1') {
      navigate('/admin-complaints', { replace: true });
    }
  }, []);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setStatusFilter(status);
  }, [searchParams]);

  const allStations = useMemo(() => getAllStations().filter(s => s.toUpperCase().endsWith('RPS')), []);

  useEffect(() => {
    if (isAdmin) fetchComplaints();
  }, [isAdmin]);

  useEffect(() => {
    if (!loading && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = tableScrollRef.current.scrollWidth;
    }
  }, [loading]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints', { headers: { Authorization: `Bearer ${token}` } });
      setComplaints(Array.isArray(res.data) ? res.data.map(stripSensitiveComplaintFields) : []);
    } catch (err) {
      setError('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  const stripSensitiveComplaintFields = (complaint) => (
    Object.fromEntries(
      Object.entries(complaint || {}).filter(([key]) => !isSensitiveExportKey(key))
    )
  );

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/complaints/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setDeleteConfirmId(null);
      fetchComplaints();
    } catch (err) {
      alert('Failed to delete complaint');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleForward = async (id) => {
    if (!forwardStation) return;
    setForwardLoading(true);
    try {
      await complaintsAPI.assign(id, forwardStation);
      setForwardId(null);
      setForwardStation('');
      fetchComplaints();
    } catch (err) {
      alert('Failed to forward complaint');
    } finally {
      setForwardLoading(false);
    }
  };

  const crimeTypeOptions = [
    { value: 'theft', label: 'Theft' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'missing_person', label: 'Missing Person' },
    { value: 'nuisance', label: 'Nuisance' },
    { value: 'other', label: 'Other' },
  ];

  const filteredComplaints = useMemo(() => {
    const list = complaints.filter(c => {
      if (dateFrom && (c.incident_date || '') < dateFrom) return false;
      if (dateTo && (c.incident_date || '') > dateTo) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (crimeFilter && c.complaint_type !== crimeFilter) return false;
      if (stationFilter === 'Unassigned') {
        if (c.station && c.station !== 'Unassigned') return false;
      } else if (stationFilter === 'assigned') {
        if (!c.station || c.station === 'Unassigned') return false;
      } else if (stationFilter) {
        if ((c.station || 'Unassigned') !== stationFilter) return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const match = [c.tracking_number, c.complaint_type, c.description, c.status, c.station,
          c.complainant_name, c.complainant_phone, c.complainant_email, c.address, c.location]
          .join(' ').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
    // Sort: unassigned first, then by submitted date desc
    return list.sort((a, b) => {
      const aUnassigned = !a.station || a.station === 'Unassigned';
      const bUnassigned = !b.station || b.station === 'Unassigned';
      if (aUnassigned && !bUnassigned) return -1;
      if (!aUnassigned && bUnassigned) return 1;
      return new Date(b.created_at || b.incident_date || 0) - new Date(a.created_at || a.incident_date || 0);
    });
  }, [complaints, searchText, dateFrom, dateTo, statusFilter, crimeFilter, stationFilter]);

  const assignedStationOptions = useMemo(() => {
    const names = complaints.map(c => c.station).filter(s => s && s !== 'Unassigned');
    return Array.from(new Set(names)).sort();
  }, [complaints]);

  const stats = useMemo(() => ({
    total: filteredComplaints.length,
    pending: filteredComplaints.filter(c => String(c.status || '').toLowerCase() === 'pending').length,
    investigating: filteredComplaints.filter(c => String(c.status || '').toLowerCase() === 'investigating').length,
    resolved: filteredComplaints.filter(c => String(c.status || '').toLowerCase() === 'resolved').length,
    approved: filteredComplaints.filter(c => String(c.status || '').toLowerCase() === 'approved').length,
    rejected: filteredComplaints.filter(c => String(c.status || '').toLowerCase() === 'rejected').length,
    assigned: filteredComplaints.filter(c => c.station && c.station !== 'Unassigned').length,
    unassigned: filteredComplaints.filter(c => !c.station || c.station === 'Unassigned').length,
  }), [filteredComplaints]);

  function exportToExcel(filename, rows) {
    if (!rows.length) return;
    const headers = [
      { key: 'tracking_number', label: 'Complaint No' },
      { key: 'complaint_type', label: 'Crime Type' },
      { key: 'incident_date', label: 'Date' },
      { key: 'complainant_name', label: 'Name' },
      { key: 'complainant_phone', label: 'Phone' },
      { key: 'complainant_email', label: 'Email' },
      { key: 'address', label: 'Address' },
      { key: 'location', label: 'Location' },
      { key: 'description', label: 'Description' },
      { key: 'station', label: 'Forwarded To' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Submitted At' },
    ];
    const data = rows.map(row =>
      headers.reduce((obj, h) => {
        obj[h.label] = String(row[h.key] || '').replace(/_/g, ' ');
        return obj;
      }, {})
    );
    const ws = sanitizeWorksheetCells(XLSX.utils.json_to_sheet(sanitizeSpreadsheetRows(data), { header: headers.map(h => h.label) }));
    // Auto-width columns
    const colWidths = headers.map(h => ({
      wch: Math.max(h.label.length, ...data.map(r => String(r[h.label] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
    XLSX.writeFile(wb, filename);
  }

  if (!isAdmin) return <div className="min-h-screen pt-8 px-4 text-center text-red-600">Access denied</div>;
  if (loading) return <div className="min-h-screen pt-8 px-4 text-center">Loading complaints...</div>;
  if (error) return <div className="min-h-screen pt-8 px-4 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen pt-8 pb-12 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminPageHero title="Complaints" description="Track, review, and update all complaints submitted through the portal." />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'bg-[#2563EB]', text: 'text-[#2563EB]',
              onClick: () => { setStatusFilter(''); setStationFilter(''); },
              isActive: !statusFilter && !stationFilter },
            { label: 'Unassigned', value: stats.unassigned, icon: XCircle, color: 'bg-[#fbbf24]', text: 'text-[#fbbf24]',
              onClick: () => { setStatusFilter(''); setStationFilter('Unassigned'); },
              isActive: stationFilter === 'Unassigned' },
            { label: 'Assigned', value: stats.assigned, icon: CheckCircle2, color: 'bg-[#38bdf8]', text: 'text-[#38bdf8]',
              onClick: () => { setStatusFilter(''); setStationFilter('assigned'); },
              isActive: stationFilter === 'assigned' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#F59E0B]', text: 'text-[#F59E0B]',
              onClick: () => { setStationFilter(''); setStatusFilter('pending'); },
              isActive: statusFilter === 'pending' },
          ].map(({ label, value, icon: Icon, color, text, onClick, isActive }) => (
            <Card key={label} onClick={onClick} className={`p-3 border cursor-pointer transition-all flex flex-row items-center gap-3 ${isActive ? 'border-[#2563EB] bg-[#EFF6FF] shadow-md' : 'border-[#60A5FA] bg-white hover:shadow-md hover:border-[#2563EB]'}`}>
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className={`text-xl font-extrabold leading-tight ${text}`}>{value}</p>
                <p className="text-xs text-[#64748B]">{label}</p>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Approved', value: stats.approved, icon: ThumbsUp, color: 'bg-[#0EA5E9]', text: 'text-[#0EA5E9]',
              onClick: () => { setStationFilter(''); setStatusFilter('approved'); },
              isActive: statusFilter === 'approved' },
            { label: 'Rejected', value: stats.rejected, icon: ThumbsDown, color: 'bg-[#EF4444]', text: 'text-[#EF4444]',
              onClick: () => { setStationFilter(''); setStatusFilter('rejected'); },
              isActive: statusFilter === 'rejected' },
            { label: 'Investigating', value: stats.investigating, icon: AlertCircle, color: 'bg-[#8B5CF6]', text: 'text-[#8B5CF6]',
              onClick: () => { setStationFilter(''); setStatusFilter('investigating'); },
              isActive: statusFilter === 'investigating' },
            { label: 'Closed', value: stats.resolved, icon: CheckCircle2, color: 'bg-[#6B7280]', text: 'text-[#6B7280]',
              onClick: () => { setStationFilter(''); setStatusFilter('resolved'); },
              isActive: statusFilter === 'resolved' },
          ].map(({ label, value, icon: Icon, color, text, onClick, isActive }) => (
            <Card key={label} onClick={onClick} className={`p-3 border cursor-pointer transition-all flex flex-row items-center gap-3 ${isActive ? 'border-[#2563EB] bg-[#EFF6FF] shadow-md' : 'border-[#60A5FA] bg-white hover:shadow-md hover:border-[#2563EB]'}`}>
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className={`text-xl font-extrabold leading-tight ${text}`}>{value}</p>
                <p className="text-xs text-[#64748B]">{label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <Card className="mb-6 p-3 border border-[#60A5FA] bg-white">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#64748B]">From</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-32 h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#64748B]">To</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-32 h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#64748B]">Crime Type</span>
              <select value={crimeFilter} onChange={e => setCrimeFilter(e.target.value)} className="w-36 h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
                <option value="">All crime types</option>
                {crimeTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#64748B]">Status</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36 h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
                <option value="">All statuses</option>
                {['pending','approved','rejected','investigating','resolved'].map(s => (
                  <option key={s} value={s}>{s === 'resolved' ? 'Closed' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#64748B]">Station</span>
              <select value={['assigned','Unassigned',''].includes(stationFilter) ? '' : stationFilter} onChange={e => setStationFilter(e.target.value || 'assigned')} className="w-36 h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
                <option value="">All Stations</option>
                {assignedStationOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#64748B]">Assignment</span>
              <select value={['assigned','Unassigned'].includes(stationFilter) ? stationFilter : stationFilter ? 'assigned' : ''} onChange={e => setStationFilter(e.target.value)} className="w-32 h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
                <option value="">All</option>
                <option value="assigned">Assigned</option>
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[#64748B]">Search</span>
              <div className="relative w-46">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 h-9 text-sm border border-[#60A5FA] rounded-md outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter(''); setCrimeFilter(''); setStationFilter(''); setSearchText(''); }}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          </div>
        </Card>

        {/* Complaints Table */}
        <Card className="p-0 overflow-hidden border border-[#60A5FA] bg-white">
          <div className="p-4 border-b border-[#60A5FA] flex items-center justify-between gap-2 bg-white">
            <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
              <FileText className="w-4 h-4" />
              All Complaints ({filteredComplaints.length})
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={fetchComplaints}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[#60A5FA] bg-white text-sm font-semibold text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button
                type="button"
                onClick={() => exportToExcel(`complaints_${new Date().toISOString().slice(0,10)}.xlsx`, filteredComplaints)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel
              </button>
            </div>
          </div>
          <p className="text-xs text-[#64748B] px-4 pt-2 pb-1">{filteredComplaints.length} record{filteredComplaints.length !== 1 ? 's' : ''} found</p>
          <div className="overflow-x-auto rounded-b-xl" ref={tableScrollRef}>
            <Table className="border-collapse">
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-[#F8FAFC]">
                  <TableHead className="border border-[#60A5FA] px-3 py-3 w-14 text-center font-bold text-[#0F172A]">S.No</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Complaint No</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Type</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Date</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Name</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Phone</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Email</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A] min-w-[220px]">Address</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Location</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A] min-w-[260px]">Description</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Forwarded To</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Status</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Documents</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A] w-32 text-center sticky right-0 bg-[#F8FAFC] shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="border border-[#60A5FA] px-4 py-10 text-center text-[#64748B]">
                      No complaints found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComplaints.map((c, index) => (
                    <TableRow key={c.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-center font-semibold text-[#0F172A]">{index + 1}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 font-medium text-[#0F172A] whitespace-nowrap">{c.tracking_number}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155]">{c.complaint_type || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155] whitespace-nowrap">{c.incident_date || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155] whitespace-nowrap">{c.complainant_name || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155] whitespace-nowrap">{c.complainant_phone || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155]">{c.complainant_email || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155] min-w-[220px]">
                        <div
                          className="line-clamp-2 text-sm cursor-pointer text-[#2563EB] hover:underline"
                          onClick={() => setAddrModal(c.address)}
                        >{c.address || '-'}</div>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155] whitespace-nowrap">{c.location || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 min-w-[260px]">
                        <div
                          className="line-clamp-3 text-sm cursor-pointer text-[#2563EB] hover:underline"
                          onClick={() => setDescModal(c.description)}
                        >{c.description || '-'}</div>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 min-w-[200px]">
                        {forwardId === c.id ? (
                          <div className="flex gap-1 items-center">
                            <select
                              value={forwardStation}
                              onChange={e => setForwardStation(e.target.value)}
                              className="flex-1 border border-[#CBD5E1] rounded-md px-2 py-1 text-xs text-[#0F172A] bg-white"
                            >
                              <option value="">Select station...</option>
                              {allStations.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <Button size="sm" disabled={!forwardStation || forwardLoading} onClick={() => handleForward(c.id)}>
                              {forwardLoading ? '...' : 'Assign'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setForwardId(null); setForwardStation(''); }}>✕</Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {c.station && c.station !== 'Unassigned' && (
                              <span className="text-xs font-semibold text-[#0F172A]">{c.station}</span>
                            )}
                            {['pending', 'unassigned', null, undefined, ''].includes(String(c.status || '').toLowerCase()) || c.station === 'Unassigned' ? (
                              <Button size="sm" variant="outline" onClick={() => { setForwardId(c.id); setForwardStation(c.station !== 'Unassigned' ? c.station : ''); }}>
                                {c.station === 'Unassigned' ? 'Forward' : 'Re-assign'}
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2">
                        {{
                          pending:      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 capitalize">{c.status}</span>,
                          investigating:<span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">{c.status}</span>,
                          resolved:     <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Closed</span>,
                          approved:     <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 capitalize">{c.status}</span>,
                          rejected:     <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 capitalize">{c.status}</span>,
                          closed:       <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 capitalize">{c.status}</span>,
                        }[String(c.status || '').toLowerCase()] || <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 capitalize">{c.status || '-'}</span>}
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-center">
                        {c.supporting_docs?.length ? (
                          <button
                            onClick={() => setDocsModal({ docs: c.supporting_docs, tracking: c.tracking_number })}
                            className="px-3 py-1 bg-[#2563EB] text-white text-xs font-medium rounded hover:bg-[#1D4ED8] transition-colors"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">No Docs</span>
                        )}
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-center sticky right-0 bg-white shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)]">
                        {deleteConfirmId === c.id ? (
                          <div className="flex gap-1 items-center justify-center">
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deleteLoading}
                              className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                            >{deleteLoading ? '...' : 'Yes'}</button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 transition-colors"
                            >No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(c.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete complaint"
                          ><Trash2 className="w-4 h-4" /></button>
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

      {addrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setAddrModal(null)}>
          <Card className="bg-white rounded-lg max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F172A]">Full Address</h3>
              <button onClick={() => setAddrModal(null)} className="text-[#64748B] hover:text-[#0F172A]"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[#334155] whitespace-pre-wrap leading-relaxed text-sm">{addrModal}</p>
          </Card>
        </div>
      )}

      {descModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setDescModal(null)}>
          <Card className="bg-white rounded-lg max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F172A]">Full Description</h3>
              <button onClick={() => setDescModal(null)} className="text-[#64748B] hover:text-[#0F172A]"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[#334155] whitespace-pre-wrap leading-relaxed text-sm">{descModal}</p>
          </Card>
        </div>
      )}

      {docsModal && (
        <SupportingDocsModal title="Supporting Documents" docs={docsModal?.docs} trackingNumber={docsModal?.tracking} onClose={() => setDocsModal(null)} />
      )}
    </div>
  );
};

export default AdminComplaintsPage;
