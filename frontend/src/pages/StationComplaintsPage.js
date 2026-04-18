import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowUpDown, Building2, ChevronDown, Download, Eye, FileText, RefreshCw, Search, X, Check, Clock, AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { stationAPI } from '@/lib/api';
import SupportingDocsModal from '@/components/SupportingDocsModal';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  investigating: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-700',
};

function ActionPortalDropdown({ options, onSelect, onClose, anchorRef }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
  }, [anchorRef]);
  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
        className="w-36 bg-white border border-[#E2E8F0] rounded-md shadow-xl"
      >
        {options.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => { onSelect(val); onClose(); }}
            className="w-full text-left px-3 py-2 text-xs hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </>,
    document.body
  );
}

const ACTION_OPTIONS = [
  ['approved', 'Approve'],
  ['investigating', 'Investigating'],
  ['resolved', 'Resolved'],
  ['rejected', 'Reject'],
];

function ActionCell({ complaintId, pendingStatus, setPendingStatus, actionLoading, onDone }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const selected = pendingStatus[complaintId];
  return (
    <div className="flex items-center gap-2">
      <div>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#2563EB] text-white font-medium rounded-md hover:bg-[#1D4ED8] transition-colors whitespace-nowrap"
        >
          {selected ? <span className="capitalize">{selected}</span> : 'Action'}
          <ChevronDown className="h-3 w-3" />
        </button>
        {open && (
          <ActionPortalDropdown
            options={ACTION_OPTIONS}
            anchorRef={btnRef}
            onSelect={val => setPendingStatus(prev => ({ ...prev, [complaintId]: val }))}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
      {selected && (
        <Button
          size="sm"
          disabled={actionLoading}
          onClick={onDone}
          className="h-7 px-3 text-xs bg-[#16A34A] text-white hover:bg-[#15803D]"
        >
          {actionLoading ? '...' : 'Done'}
        </Button>
      )}
    </div>
  );
}

const STATION_EXPORT_COLS = [
  { key: 'tracking_number', label: 'Tracking #' },
  { key: 'complaint_type', label: 'Crime Type' },
  { key: 'incident_date', label: 'Incident Date' },
  { key: 'complainant_name', label: 'Name' },
  { key: 'complainant_phone', label: 'Phone' },
  { key: 'aadhar_number', label: 'Aadhaar Number' },
  { key: 'complainant_email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'location', label: 'Location' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
];

async function downloadComplaintPDF(c, index) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const blue = rgb(0.145, 0.388, 0.922);
  const dark = rgb(0.059, 0.090, 0.165);
  const gray = rgb(0.392, 0.455, 0.545);
  const red = rgb(0.863, 0.196, 0.184);
  const lightBlue = rgb(0.376, 0.647, 0.980);

  // Header bar
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: blue });
  page.drawText('GRP - Complaint Report', { x: 40, y: height - 38, size: 20, font: fontBold, color: rgb(1,1,1) });
  page.drawText('Government Railway Police, Andhra Pradesh', { x: 40, y: height - 56, size: 10, font: fontRegular, color: rgb(0.85,0.92,1) });

  // Tracking number badge
  page.drawRectangle({ x: width - 200, y: height - 62, width: 160, height: 24, color: rgb(1,1,1), opacity: 0.15 });
  page.drawText(`Tracking: ${c.tracking_number || '-'}`, { x: width - 196, y: height - 54, size: 9, font: fontBold, color: rgb(1,1,1) });

  let y = height - 95;

  // S.No and generated date
  page.drawText(`S.No: ${index}`, { x: 40, y, size: 9, font: fontRegular, color: gray });
  page.drawText(`Generated: ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`, { x: width - 200, y, size: 9, font: fontRegular, color: gray });
  y -= 18;

  // Divider
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: lightBlue });
  y -= 20;

  const fields = [
    ['Tracking Number', c.tracking_number],
    ['Crime Type', (c.complaint_type || '').replace(/_/g, ' ')],
    ['Incident Date', c.incident_date],
    ['Status', (c.status || '').toUpperCase()],
    ['Complainant Name', c.complainant_name],
    ['Phone', c.complainant_phone],
    ['Aadhaar Number', c.aadhar_number],
    ['Email', c.complainant_email],
    ['Address', c.address],
    ['Location / Station', c.location],
  ];

  // Two-column layout for fields
  const col1x = 40;
  const col2x = 310;
  let leftY = y;
  let rightY = y;

  fields.forEach(([label, value], i) => {
    const isLeft = i % 2 === 0;
    const cx = isLeft ? col1x : col2x;
    const cy = isLeft ? leftY : rightY;
    const displayVal = value ? String(value) : '-';

    page.drawText(label, { x: cx, y: cy, size: 8, font: fontBold, color: gray });
    // Wrap long values
    const maxChars = 38;
    const lines = [];
    let remaining = displayVal;
    while (remaining.length > maxChars) {
      lines.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
    }
    lines.push(remaining);
    lines.forEach((line, li) => {
      page.drawText(line, { x: cx, y: cy - 12 - li * 12, size: 10, font: fontRegular, color: dark });
    });
    const rowHeight = 14 + lines.length * 12;
    if (isLeft) leftY -= rowHeight;
    else rightY -= rowHeight;
  });

  y = Math.min(leftY, rightY) - 16;

  // Description section
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightBlue });
  y -= 16;
  page.drawText('Description', { x: 40, y, size: 9, font: fontBold, color: gray });
  y -= 14;
  const desc = c.description || '-';
  const descWords = desc.split(' ');
  let descLine = '';
  const descLines = [];
  descWords.forEach(word => {
    const test = descLine ? `${descLine} ${word}` : word;
    if (test.length > 90) { descLines.push(descLine); descLine = word; }
    else descLine = test;
  });
  if (descLine) descLines.push(descLine);
  descLines.forEach(line => {
    page.drawText(line, { x: 40, y, size: 10, font: fontRegular, color: dark });
    y -= 14;
  });

  // Rejection reason (if any)
  if (c.rejection_reason) {
    y -= 8;
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: lightBlue });
    y -= 16;
    page.drawText('Rejection Reason', { x: 40, y, size: 9, font: fontBold, color: red });
    y -= 14;
    page.drawText(c.rejection_reason, { x: 40, y, size: 10, font: fontRegular, color: red });
    y -= 14;
  }

  // Footer
  page.drawLine({ start: { x: 40, y: 40 }, end: { x: width - 40, y: 40 }, thickness: 0.5, color: lightBlue });
  page.drawText('Government Railway Police, Andhra Pradesh  |  Confidential', { x: 40, y: 26, size: 8, font: fontRegular, color: gray });
  page.drawText(`Page 1 of 1`, { x: width - 80, y: 26, size: 8, font: fontRegular, color: gray });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `complaint_${c.tracking_number || c.id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToExcel(filename, rows) {
  if (!rows.length) return;
  const data = rows.map((row, i) => {
    const obj = { 'S.No': i + 1 };
    STATION_EXPORT_COLS.forEach(h => {
      obj[h.label] = String(row[h.key] || '').replace(/_/g, ' ');
    });
    return obj;
  });
  const allLabels = ['S.No', ...STATION_EXPORT_COLS.map(h => h.label)];
  const ws = XLSX.utils.json_to_sheet(data, { header: allLabels });
  ws['!cols'] = allLabels.map(label => ({
    wch: Math.max(label.length, ...data.map(r => String(r[label] || '').length)) + 2
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
  XLSX.writeFile(wb, filename);
}

const StationComplaintsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [crimeFilter, setCrimeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [rejectingId, setRejectingId] = useState(null);
  const [inlineReason, setInlineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [docsModal, setDocsModal] = useState(null);
  const [pendingStatus, setPendingStatus] = useState({});
  const [viewComplaint, setViewComplaint] = useState(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const applyDatePreset = (preset) => {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (preset === '7d') { setDateFrom(fmt(new Date(today - 7 * 86400000))); setDateTo(fmt(today)); }
    else if (preset === '30d') { setDateFrom(fmt(new Date(today - 30 * 86400000))); setDateTo(fmt(today)); }
    else { setDateFrom(''); setDateTo(''); }
  };

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
      const res = await stationAPI.updateStatus(complaintId, { status, rejection_reason: reason });
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
      const matchSearch = [c.complaint_type, c.description, c.tracking_number, c.status]
        .join(' ').toLowerCase().includes(searchText.toLowerCase());
      const matchDate = (!dateFrom || c.incident_date >= dateFrom) && (!dateTo || c.incident_date <= dateTo);
      const matchCrime = !crimeFilter || c.complaint_type === crimeFilter;
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchDate && matchCrime && matchStatus;
    });
  }, [complaints, searchText, dateFrom, dateTo, crimeFilter, statusFilter]);

  const handleSort = (key) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
      setSortDir('asc');
      return key;
    });
  };

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = String(a[sortKey] || '').toLowerCase();
      const vb = String(b[sortKey] || '').toLowerCase();
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [filtered, sortKey, sortDir]);

  const SortHead = ({ col, label, className }) => (
    <TableHead
      className={`border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] cursor-pointer select-none hover:bg-[#EFF6FF] ${className || ''}`}
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className={`w-3 h-3 ${sortKey === col ? 'text-[#2563EB]' : 'text-[#CBD5E1]'}`} /></span>
    </TableHead>
  );

  const stats = useMemo(() => {
    const APPROVED_STATUSES = ['approved', 'investigating', 'resolved'];
    return {
      total: filtered.length,
      pending: filtered.filter(c => String(c.status || '').toLowerCase() === 'pending').length,
      investigating: filtered.filter(c => String(c.status || '').toLowerCase() === 'investigating').length,
      resolved: filtered.filter(c => String(c.status || '').toLowerCase() === 'resolved').length,
      approved: filtered.filter(c => APPROVED_STATUSES.includes(String(c.status || '').toLowerCase())).length,
      rejected: filtered.filter(c => String(c.status || '').toLowerCase() === 'rejected').length,
    };
  }, [filtered]);

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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'bg-[#2563EB]', text: 'text-[#2563EB]' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
            { label: 'Approved', value: stats.approved, icon: ThumbsUp, color: 'bg-[#0EA5E9]', text: 'text-[#0EA5E9]' },
            { label: 'Rejected', value: stats.rejected, icon: ThumbsDown, color: 'bg-[#EF4444]', text: 'text-[#EF4444]' },
            { label: 'Investigating', value: stats.investigating, icon: AlertCircle, color: 'bg-[#8B5CF6]', text: 'text-[#8B5CF6]' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'bg-[#10B981]', text: 'text-[#10B981]' },
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

        {/* Filters */}
        <Card className="mb-4 p-3 border border-[#60A5FA] bg-white">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              title="From date"
              className="px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              title="To date"
              className="px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            />
            {[['7d','Last 7d'],['30d','Last 30d'],['','All']].map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => applyDatePreset(val)}
                className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
                  val === '' && !dateFrom && !dateTo ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#2563EB] hover:text-[#2563EB]'
                }`}>
                {lbl}
              </button>
            ))}
            <select
              value={crimeFilter}
              onChange={e => setCrimeFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All crime types</option>
              {crimeTypeOptions.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
            <div className="relative flex-1 min-w-[140px]">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search complaints..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
              />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={fetchData} className="flex items-center gap-1.5 border border-[#CBD5E1]">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => exportToExcel(`complaints_${(user?.name || 'station').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`, filtered)}
              className="ml-auto flex items-center gap-1.5 bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
            >
              <Download className="w-4 h-4" /> Export Excel
            </Button>
          </div>
        </Card>

        {/* Complaints Table */}
        <Card className="p-0 overflow-hidden border border-[#60A5FA]">
          <div className="p-4 border-b border-[#60A5FA] flex items-center gap-2 font-semibold text-[#0F172A] bg-white">
            <FileText className="w-4 h-4" />
            Complaints ({filtered.length})
          </div>
          <p className="text-xs text-[#64748B] px-4 pt-2 pb-1">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
          <div className="overflow-x-auto rounded-b-xl">
            <Table className="border-collapse">
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-[#F8FAFC]">
                  <TableHead className="border border-[#60A5FA] px-4 py-3 w-16 text-left font-bold text-[#0F172A]">S.No</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[160px]">Tracking #</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[120px]">Type</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[110px]">Date</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[140px]">Name</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[120px]">Phone</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[140px]">Aadhaar</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[180px]">Email</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[240px]">Address</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[130px]">Location</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[280px]">Description</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[110px]">Documents</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[140px]">Status</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[180px]">Actions</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[160px]">Download Complaint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="border border-[#60A5FA] px-4 py-10 text-center text-[#94A3B8]">
                      No complaints found for this station.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedFiltered.map((c, index) => (
                    <React.Fragment key={c.id}>
                    <TableRow className="hover:bg-[#F8FAFF] cursor-pointer" onClick={(e) => { if (e.target.closest('button,select,textarea,a')) return; setViewComplaint(c); }}>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left font-semibold text-[#0F172A]">{index + 1}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left font-mono text-xs text-[#2563EB] font-semibold whitespace-nowrap">{c.tracking_number}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left capitalize text-sm text-[#334155]">{c.complaint_type?.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-sm text-[#334155] whitespace-nowrap">{c.incident_date || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-sm text-[#334155] whitespace-nowrap">{c.complainant_name || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-sm text-[#334155] whitespace-nowrap">{c.complainant_phone || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-sm text-[#334155] whitespace-nowrap">{c.aadhar_number || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-sm text-[#334155]">{c.complainant_email || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 min-w-[240px]">
                        <div className="line-clamp-2 text-sm text-[#334155]">{c.address || '-'}</div>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-sm text-[#334155] whitespace-nowrap">{c.location || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 min-w-[280px]">
                        <div className="line-clamp-3 text-sm text-[#475569]">{c.description || '-'}</div>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left">
                        {c.supporting_docs?.length ? (
                          <button
                            type="button"
                            onClick={() => setDocsModal({ docs: c.supporting_docs, tracking: c.tracking_number })}
                            className="px-3 py-1 bg-[#2563EB] text-white text-xs font-medium rounded hover:bg-[#1D4ED8] transition-colors"
                          >
                            View
                          </button>
                        ) : <span className="text-xs text-[#94A3B8]">No Docs</span>}
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left min-w-[140px]">
                        <div className="space-y-1">
                          <span className={`inline-flex text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700'}`}>
                            {c.status}
                          </span>
                          {c.rejection_reason && (
                            <p className="whitespace-normal break-words text-xs text-red-600">Reason: {c.rejection_reason}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left min-w-[180px]">
                        {!['resolved', 'rejected'].includes(c.status) && (
                          <ActionCell
                            complaintId={c.id}
                            pendingStatus={pendingStatus}
                            setPendingStatus={setPendingStatus}
                            actionLoading={actionLoading}
                            onDone={() => {
                              if (pendingStatus[c.id] === 'rejected') {
                                openRejectRow(c.id);
                                setPendingStatus(prev => ({ ...prev, [c.id]: '' }));
                              } else {
                                handleComplaintAction(c.id, pendingStatus[c.id]);
                                setPendingStatus(prev => ({ ...prev, [c.id]: '' }));
                              }
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => downloadComplaintPDF(c, index + 1)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-[#2563EB] text-[#2563EB] font-medium rounded-md hover:bg-[#EFF6FF] transition-colors whitespace-nowrap"
                        >
                          <Download className="h-3.5 w-3.5" /> Download PDF
                        </button>
                      </TableCell>
                    </TableRow>
                    {rejectingId === c.id && (
                      <TableRow className="bg-red-50">
                        <TableCell colSpan={15} className="border border-[#60A5FA] px-4 py-3">
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

      {docsModal && (
        <SupportingDocsModal title="Supporting Documents" docs={docsModal?.docs} trackingNumber={docsModal?.tracking} onClose={() => setDocsModal(null)} />
      )}

      {viewComplaint && (
        <Dialog open onOpenChange={() => setViewComplaint(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#0F172A]">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                Complaint Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3 p-3 bg-[#EFF6FF] rounded-lg">
                <span className="font-mono text-sm font-bold text-[#2563EB]">{viewComplaint.tracking_number}</span>
                <span className={`ml-auto inline-flex text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[viewComplaint.status] || 'bg-gray-100 text-gray-700'}`}>{viewComplaint.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Crime Type', (viewComplaint.complaint_type || '').replace(/_/g, ' ')],
                  ['Incident Date', viewComplaint.incident_date || '-'],
                  ['Complainant Name', viewComplaint.complainant_name || '-'],
                  ['Phone', viewComplaint.complainant_phone || '-'],
                  ['Aadhaar Number', viewComplaint.aadhar_number || '-'],
                  ['Email', viewComplaint.complainant_email || '-'],
                  ['Location', viewComplaint.location || '-'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-[#64748B] mb-0.5">{label}</p>
                    <p className="font-medium text-[#0F172A]">{value}</p>
                  </div>
                ))}
                <div className="col-span-2">
                  <p className="text-xs text-[#64748B] mb-0.5">Address</p>
                  <p className="font-medium text-[#0F172A]">{viewComplaint.address || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-[#64748B] mb-0.5">Description</p>
                  <p className="text-[#334155] whitespace-pre-wrap">{viewComplaint.description || '-'}</p>
                </div>
                {viewComplaint.rejection_reason && (
                  <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 font-semibold mb-0.5">Rejection Reason</p>
                    <p className="text-red-700 text-sm">{viewComplaint.rejection_reason}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => downloadComplaintPDF(viewComplaint, 1)} className="flex items-center gap-1.5 bg-[#2563EB] text-white hover:bg-[#1D4ED8]">
                  <Download className="w-4 h-4" /> Download PDF
                </Button>
                {viewComplaint.supporting_docs?.length ? (
                  <Button size="sm" variant="outline" onClick={() => { setDocsModal({ docs: viewComplaint.supporting_docs, tracking: viewComplaint.tracking_number }); setViewComplaint(null); }} className="border-[#2563EB] text-[#2563EB]">
                    <Eye className="w-4 h-4 mr-1" /> View Documents
                  </Button>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default StationComplaintsPage;
