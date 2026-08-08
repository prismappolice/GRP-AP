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
import { stationAPI, normalizeMediaUrl } from '@/lib/api';
import { sanitizeSpreadsheetRows } from '@/lib/utils';
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
  ['resolved', 'Closed'],
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
  { key: 'tracking_number', label: 'Complaint No' },
  { key: 'complaint_type', label: 'Crime Type' },
  { key: 'incident_date', label: 'Incident Date' },
  { key: 'complainant_name', label: 'Name' },
  { key: 'complainant_phone', label: 'Phone' },
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
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const margin = 50;
  let y = height - 60;

  // Header bar (white with border)
  const headerH = 90;
  page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: rgb(1, 1, 1) });
  page.drawLine({ start: { x: 0, y: height - headerH }, end: { x: width, y: height - headerH }, thickness: 1.5, color: rgb(0.2, 0.2, 0.2) });

  // Police logo on both sides
  try {
    const logoRes = await fetch('/Appolice.png');
    const logoBytes = await logoRes.arrayBuffer();
    const logoImg = await pdfDoc.embedPng(logoBytes);
    const logoSize = 60;
    page.drawImage(logoImg, { x: margin - 10, y: height - headerH + 12, width: logoSize, height: logoSize });
    page.drawImage(logoImg, { x: width - margin - logoSize + 10, y: height - headerH + 12, width: logoSize, height: logoSize });
  } catch (_) {}

  // Centered heading
  const title = 'Government Railways Police';
  const line2 = 'Andhra Pradesh Police Department';
  const subtitle = 'Complaint Report';
  const titleW = boldFont.widthOfTextAtSize(title, 22);
  const line2W = regularFont.widthOfTextAtSize(line2, 12);
  const subtitleW = boldFont.widthOfTextAtSize(subtitle, 11);
  page.drawText(title, { x: (width - titleW) / 2, y: height - 32, size: 22, font: boldFont, color: rgb(0, 0, 0) });
  page.drawText(line2, { x: (width - line2W) / 2, y: height - 52, size: 12, font: regularFont, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(subtitle, { x: (width - subtitleW) / 2, y: height - 70, size: 11, font: boldFont, color: rgb(0, 0, 0) });

  y = height - 110;

  const fmtDate = (d) => { if (!d) return '-'; const p = String(d).split('-'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; };
  const today = new Date(); const dd = String(today.getDate()).padStart(2,'0'); const mm = String(today.getMonth()+1).padStart(2,'0'); const yyyy = today.getFullYear();

  // Fields 1-6: 2-column pairs (matching form layout)
  const pairedFields = [
    [['Full Name', c.complainant_name],            ['Complaint Type', (c.complaint_type || '').replace(/_/g, ' ')]],
    [['Phone Number', c.complainant_phone],         ['Email Address', c.complainant_email]],
    [['Date of Incident', fmtDate(c.incident_date)], ['Location / Station', c.location]],
  ];
  // Fields 7+: full-width rows
  const singleFields = [
    ['Address', c.address],
    ['Description', c.description],
    ['Complaint No', c.tracking_number],
    ['Status', (c.status || '').toUpperCase()],
    ['Generated On', `${dd}-${mm}-${yyyy}`],
  ];

  const col1X = margin;
  const col2X = margin + 250;
  const colW = 245;
  const cellH = 44;
  const cellPad = 7;
  const labelSz = 8;
  const valueSz = 10;
  const maxSingleChars = 70;
  const cellBg = rgb(0.98, 0.99, 1);
  const cellBorder = rgb(0.72, 0.72, 0.72);

  let currentPage = page;
  const addNewPage = () => {
    currentPage = pdfDoc.addPage([595, 842]);
    y = currentPage.getSize().height - margin;
  };
  const ensureY = (neededHeight = 20) => { if (y < margin + neededHeight) addNewPage(); };

  let fieldNum = 1;

  // Render 2-column paired fields
  for (const [[lLabel, lVal], [rLabel, rVal]] of pairedFields) {
    ensureY(cellH + 6);
    // Left cell
    currentPage.drawRectangle({ x: col1X, y: y - cellH, width: colW, height: cellH, borderColor: cellBorder, borderWidth: 0.8, color: cellBg });
    currentPage.drawText(`${fieldNum}. ${lLabel}`, { x: col1X + cellPad, y: y - cellPad - labelSz, size: labelSz, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
    currentPage.drawText(String(lVal || '-').substring(0, 35), { x: col1X + cellPad, y: y - cellPad - labelSz - 15, size: valueSz, font: regularFont, color: rgb(0, 0, 0) });
    fieldNum++;
    // Right cell
    currentPage.drawRectangle({ x: col2X, y: y - cellH, width: colW, height: cellH, borderColor: cellBorder, borderWidth: 0.8, color: cellBg });
    currentPage.drawText(`${fieldNum}. ${rLabel}`, { x: col2X + cellPad, y: y - cellPad - labelSz, size: labelSz, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
    currentPage.drawText(String(rVal || '-').substring(0, 35), { x: col2X + cellPad, y: y - cellPad - labelSz - 15, size: valueSz, font: regularFont, color: rgb(0, 0, 0) });
    fieldNum++;
    y -= (cellH + 4);
  }

  y -= 4;

  // Render full-width single fields
  for (const [label, value] of singleFields) {
    const strVal = String(value || '-');
    const valLines = [];
    for (const paragraph of strVal.split(/\r?\n/)) {
      const words = paragraph.split(' ');
      let current = '';
      for (const word of words) {
        if ((current + ' ' + word).trim().length > maxSingleChars) { valLines.push(current.trim()); current = word; }
        else current = (current + ' ' + word).trim();
      }
      if (current) valLines.push(current.trim());
    }
    const singleCellH = Math.max(cellH, valLines.length * 14 + 20);
    ensureY(singleCellH + 4);
    currentPage.drawRectangle({ x: margin, y: y - singleCellH, width: 495, height: singleCellH, borderColor: cellBorder, borderWidth: 0.8, color: cellBg });
    currentPage.drawText(`${fieldNum}. ${label}`, { x: margin + cellPad, y: y - cellPad - labelSz, size: labelSz, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
    valLines.forEach((line, li) => {
      currentPage.drawText(line, { x: margin + cellPad, y: y - cellPad - labelSz - 15 - li * 14, size: valueSz, font: regularFont, color: rgb(0, 0, 0) });
    });
    fieldNum++;
    y -= (singleCellH + 4);
  }

  // Rejection reason (if any)
  if (c.rejection_reason) {
    const strVal = String(c.rejection_reason);
    const valLines = [];
    const words = strVal.split(' ');
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxSingleChars) { valLines.push(current.trim()); current = word; }
      else current = (current + ' ' + word).trim();
    }
    if (current) valLines.push(current.trim());
    const rejCellH = Math.max(cellH, valLines.length * 14 + 20);
    ensureY(rejCellH + 4);
    currentPage.drawRectangle({ x: margin, y: y - rejCellH, width: 495, height: rejCellH, borderColor: rgb(0.86, 0.19, 0.18), borderWidth: 0.8, color: rgb(1, 0.97, 0.97) });
    currentPage.drawText(`${fieldNum}. Rejection Reason`, { x: margin + cellPad, y: y - cellPad - labelSz, size: labelSz, font: boldFont, color: rgb(0.86, 0.19, 0.18) });
    valLines.forEach((line, li) => {
      currentPage.drawText(line, { x: margin + cellPad, y: y - cellPad - labelSz - 15 - li * 14, size: valueSz, font: regularFont, color: rgb(0.86, 0.19, 0.18) });
    });
    y -= (rejCellH + 4);
  }

  // Footer line
  ensureY(20);
  y -= 16;
  currentPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.8, color: rgb(0.3, 0.3, 0.3) });

  // Supporting documents — append as extra pages
  const parsedDocs = (() => {
    const docs = c.supporting_docs;
    if (!docs) return [];
    if (Array.isArray(docs)) return docs.filter(Boolean).map(String);
    try { const p = JSON.parse(String(docs)); if (Array.isArray(p)) return p.filter(Boolean).map(String); } catch {}
    return [String(docs)];
  })();
  const isImgUrl = (u) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(u || '');
  const isPdfUrl = (u) => /\.pdf$/i.test(u || '');
  const isVideoUrl = (u) => /\.(mp4|webm|ogg|mov|avi)$/i.test(u || '');
  const videoUrls = [];
  for (const docUrl of parsedDocs) {
    const normalized = (() => { try { const p = new URL(normalizeMediaUrl(docUrl)); return p.pathname + p.search; } catch { return normalizeMediaUrl(docUrl); } })();
    try {
      if (isImgUrl(docUrl)) {
        const bytes = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 800;
            canvas.height = img.naturalHeight || 600;
            canvas.getContext('2d').drawImage(img, 0, 0);
            canvas.toBlob(async (blob) => { try { resolve(await blob.arrayBuffer()); } catch (e) { reject(e); } }, 'image/png');
          };
          img.onerror = reject;
          img.src = normalized;
        });
        const embeddedImg = await pdfDoc.embedPng(bytes);
        const A4W = 595, A4H = 842;
        const scale = Math.min(A4W / embeddedImg.width, A4H / embeddedImg.height);
        const imgW = embeddedImg.width * scale;
        const imgH = embeddedImg.height * scale;
        const imgPage = pdfDoc.addPage([A4W, A4H]);
        imgPage.drawImage(embeddedImg, { x: (A4W - imgW) / 2, y: (A4H - imgH) / 2, width: imgW, height: imgH });
      } else if (isPdfUrl(docUrl)) {
        const resp = await fetch(normalized);
        const bytes = await resp.arrayBuffer();
        const srcDoc = await PDFDocument.load(bytes);
        const copied = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
        copied.forEach((p) => pdfDoc.addPage(p));
      } else if (isVideoUrl(docUrl)) {
        videoUrls.push({ normalized, docUrl });
      }
    } catch (_) {}
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GRP_Complaint_${c.tracking_number || c.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Download video files separately
  for (let i = 0; i < videoUrls.length; i++) {
    const { normalized, docUrl } = videoUrls[i];
    try {
      const resp = await fetch(normalized);
      const vblob = await resp.blob();
      const vurl = URL.createObjectURL(vblob);
      const va = document.createElement('a');
      va.href = vurl;
      const ext = docUrl.split('.').pop().split('?')[0] || 'mp4';
      va.download = `GRP_Complaint_${c.tracking_number || c.id}_video${videoUrls.length > 1 ? `_${i + 1}` : ''}.${ext}`;
      document.body.appendChild(va);
      va.click();
      document.body.removeChild(va);
      URL.revokeObjectURL(vurl);
    } catch (_) {}
  }
}

function exportToExcel(filename, rows) {
  if (!rows.length) return;
  const data = sanitizeSpreadsheetRows(rows.map((row, i) => {
    const obj = { 'S.No': i + 1 };
    STATION_EXPORT_COLS.forEach(h => {
      obj[h.label] = String(row[h.key] || '').replace(/_/g, ' ');
    });
    return obj;
  }));
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
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [inlineReason, setInlineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [docsModal, setDocsModal] = useState(null);
  const [pendingStatus, setPendingStatus] = useState({});
  const [viewComplaint, setViewComplaint] = useState(null);
  const [addressModal, setAddressModal] = useState(null);
  const [descriptionModal, setDescriptionModal] = useState(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  // Set statusFilter from query param on mount
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setStatusFilter(status);
  }, [searchParams]);

  const applyDatePreset = (preset) => {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (preset === '7d') { setDateFrom(fmt(new Date(today - 7 * 86400000))); setDateTo(fmt(today)); }
    else if (preset === '30d') { setDateFrom(fmt(new Date(today - 30 * 86400000))); setDateTo(fmt(today)); }
    else { setDateFrom(''); setDateTo(''); }
  };

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setCrimeFilter('');
    setStatusFilter('');
    setSearchText('');
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

  const crimeTypeOptions = [
    { value: 'theft', label: 'Theft' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'missing_person', label: 'Missing Person' },
    { value: 'nuisance', label: 'Nuisance' },
    { value: 'other', label: 'Other' },
  ];

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

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter(c => String(c.status || '').toLowerCase() === 'pending').length,
    approved: filtered.filter(c => String(c.status || '').toLowerCase() === 'approved').length,
    rejected: filtered.filter(c => String(c.status || '').toLowerCase() === 'rejected').length,
    investigating: filtered.filter(c => String(c.status || '').toLowerCase() === 'investigating').length,
    resolved: filtered.filter(c => String(c.status || '').toLowerCase() === 'resolved').length,
  }), [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen pt-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-4 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[#2563EB]" />
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] heading-font">Complaints</h1>
              <p className="text-sm text-[#64748B]">Welcome, <span className="font-semibold text-[#2563EB]">{user?.name}</span></p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate('/station-dashboard')} className="border-[#CBD5E1]">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>

        {error && <Card className="mb-4 p-4 border border-red-200 bg-red-50 text-red-700">{error}</Card>}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'bg-[#2563EB]', text: 'text-[#2563EB]', filter: '' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#F59E0B]', text: 'text-[#F59E0B]', filter: 'pending' },
            { label: 'Approved', value: stats.approved, icon: ThumbsUp, color: 'bg-[#0EA5E9]', text: 'text-[#0EA5E9]', filter: 'approved' },
            { label: 'Rejected', value: stats.rejected, icon: ThumbsDown, color: 'bg-[#EF4444]', text: 'text-[#EF4444]', filter: 'rejected' },
            { label: 'Investigating', value: stats.investigating, icon: AlertCircle, color: 'bg-[#8B5CF6]', text: 'text-[#8B5CF6]', filter: 'investigating' },
            { label: 'Closed', value: stats.resolved, icon: CheckCircle2, color: 'bg-[#6B7280]', text: 'text-[#6B7280]', filter: 'resolved' },
          ].map(({ label, value, icon: Icon, color, text, filter }) => (
            <Card
              key={label}
              className={`p-3 border border-[#60A5FA] bg-white cursor-pointer transition-all hover:shadow-md hover:border-[#2563EB] flex flex-row items-center gap-3 ${
                statusFilter === filter ? 'border-[#2563EB] bg-[#EFF6FF] shadow-md' : ''
              }`}
              onClick={() => setStatusFilter(filter)}
            >
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

        {/* Filters */}
        <Card className="mb-4 p-3 border border-[#60A5FA] bg-white">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-36 px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-36 px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
              />
            </div>
            {[['7d','Last 7d'],['30d','Last 30d'],['','All']].map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => applyDatePreset(val)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  val === '' && !dateFrom && !dateTo ? 'bg-[#2563EB] text-white border-[#2563EB] hover:bg-[#1D4ED8]' : 'bg-white text-[#2563EB] border-[#2563EB] hover:bg-[#EFF6FF]'
                }`}>
                {lbl}
              </button>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Crime Type</label>
              <select
                value={crimeFilter}
                onChange={e => setCrimeFilter(e.target.value)}
                className="w-40 px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
              >
                <option value="">All crime types</option>
                {crimeTypeOptions.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-40 px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Closed</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Search</label>
              <div className="relative w-44">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Search complaints..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
            <button type="button" onClick={resetFilters} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors border border-[#2563EB] whitespace-nowrap">
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </Card>

        {/* Complaints Table */}
        <Card className="p-0 overflow-hidden border border-[#60A5FA]">
          <div className="p-4 border-b border-[#60A5FA] flex items-center justify-between gap-2 bg-white">
            <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
              <FileText className="w-4 h-4" />
              Complaints ({filtered.length})
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={fetchData}
                className="flex items-center gap-1.5 border border-[#CBD5E1]"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => exportToExcel(`complaints_${(user?.name || 'station').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`, filtered)}
                className="flex items-center gap-1.5 bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
              >
                <Download className="w-4 h-4" /> Export Excel
              </Button>
            </div>
          </div>
          <p className="text-xs text-[#64748B] px-4 pt-2 pb-1">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
          <div className="overflow-x-auto rounded-b-xl">
            <Table className="border-collapse">
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-[#F8FAFC]">
                  <TableHead className="border border-[#60A5FA] px-4 py-3 w-16 text-left font-bold text-[#0F172A]">S.No</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[160px]">Complaint No</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[120px]">Type</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[110px]">Date</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[140px]">Name</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[120px]">Phone</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[180px]">Email</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[240px]">Address</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[130px]">Location</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[280px]">Description</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[110px]">Documents</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[180px] whitespace-nowrap">Download Complaint</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[140px]">Status</TableHead>
                  <TableHead className="border border-[#60A5FA] px-4 py-3 text-left font-bold text-[#0F172A] min-w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="border border-[#60A5FA] px-4 py-10 text-center text-[#94A3B8]">
                      No complaints found for this station.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedFiltered.map((c, index) => (
                    <React.Fragment key={c.id}>
                    <TableRow className="hover:bg-[#F8FAFF]">
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left font-semibold text-[#0F172A]">{index + 1}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left font-mono text-base text-[#2563EB] font-semibold whitespace-nowrap">{c.tracking_number}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left capitalize text-base text-[#334155]">{c.complaint_type?.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-base text-[#334155] whitespace-nowrap">{c.incident_date || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-base text-[#334155] whitespace-nowrap">{c.complainant_name || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-base text-[#334155] whitespace-nowrap">{c.complainant_phone || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-base text-[#334155]">{c.complainant_email || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 min-w-[240px]">
                        <button
                          type="button"
                          onClick={() => setAddressModal(c.address || '-')}
                          className="text-left text-sm text-[#2563EB] underline cursor-pointer hover:text-[#1D4ED8] line-clamp-2"
                        >
                          {c.address || '-'}
                        </button>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left text-base text-[#334155] whitespace-nowrap">{c.location || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 min-w-[280px]">
                        <button
                          type="button"
                          onClick={() => setDescriptionModal(c.description || '-')}
                          className="text-left text-sm text-[#2563EB] underline cursor-pointer hover:text-[#1D4ED8] line-clamp-3"
                        >
                          {c.description || '-'}
                        </button>
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
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => downloadComplaintPDF(c, index + 1)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-[#2563EB] text-[#2563EB] font-medium rounded-md hover:bg-[#EFF6FF] transition-colors whitespace-nowrap"
                        >
                          <Download className="h-3.5 w-3.5" /> Download PDF
                        </button>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2 text-left min-w-[140px]">
                        <div className="space-y-1">
                          <span className={`inline-flex text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700'}`}>
                            {c.status === 'resolved' ? 'Closed' : c.status}
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
                    </TableRow>
                    {rejectingId === c.id && (
                      <TableRow className="bg-red-50">
                        <TableCell colSpan={14} className="border border-[#60A5FA] px-4 py-3">
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

      {/* Address Modal */}
      <Dialog open={!!addressModal} onOpenChange={open => { if (!open) setAddressModal(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A]">Address</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 whitespace-pre-wrap">
            {addressModal}
          </div>
        </DialogContent>
      </Dialog>

      {/* Description Modal */}
      <Dialog open={!!descriptionModal} onOpenChange={open => { if (!open) setDescriptionModal(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A]">Description</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
            {descriptionModal}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StationComplaintsPage;
