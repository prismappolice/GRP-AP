import React, { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { stationAPI, unidentifiedBodiesAPI, normalizeMediaUrl } from '@/lib/api';
import { stations } from '@/data/stations';
import { Upload, RefreshCw, Image as ImageIcon, Building2, Video, Eye, Trash2, ArrowLeft, Plus, ChevronDown, ChevronUp, Search, X, ChevronLeft, ChevronRight, Download, FileText, Clock } from 'lucide-react';

async function downloadMediaPDF(group, mediaIndex, normalizeMediaUrl) {
  const url = normalizeMediaUrl(group.mediaUrls[mediaIndex]);
  const isVideo = /\.(mp4|webm|ogg|mov|avi)$/i.test(url);
  const dateStr = group.reported_date || 'unknown';
  const station = group.station || 'station';
  const filename = `unidentified_body_${station.replace(/\s+/g, '_')}_${dateStr}_media${mediaIndex + 1}.pdf`;

  if (isVideo) {
    // For videos, trigger direct download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace('.pdf', '.mp4');
    a.click();
    return;
  }

  try {
    const imgBytes = await fetch(url).then(r => r.arrayBuffer());
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const blue = rgb(0.145, 0.388, 0.922);
    const gray = rgb(0.392, 0.455, 0.545);

    // Embed image
    let img;
    try {
      img = await pdfDoc.embedJpg(imgBytes);
    } catch {
      try { img = await pdfDoc.embedPng(imgBytes); } catch { img = null; }
    }

    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();

    // Header
    page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: blue });
    page.drawText('GRP - Unidentified Body Record', { x: 40, y: height - 38, size: 18, font: fontBold, color: rgb(1,1,1) });
    page.drawText('Government Railway Police, Andhra Pradesh', { x: 40, y: height - 56, size: 10, font: fontRegular, color: rgb(0.85,0.92,1) });

    // Info
    let y = height - 95;
    page.drawText(`Station: ${station}`, { x: 40, y, size: 11, font: fontBold, color: rgb(0.06,0.09,0.16) });
    y -= 18;
    page.drawText(`Reported Date: ${dateStr}`, { x: 40, y, size: 10, font: fontRegular, color: gray });
    y -= 14;
    page.drawText(`Media: ${mediaIndex + 1} of ${group.mediaUrls.length}`, { x: 40, y, size: 10, font: fontRegular, color: gray });
    y -= 20;
    page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.376,0.647,0.980) });
    y -= 16;

    // Image
    if (img) {
      const maxW = width - 80;
      const maxH = y - 60;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const imgW = img.width * scale;
      const imgH = img.height * scale;
      const imgX = (width - imgW) / 2;
      page.drawImage(img, { x: imgX, y: y - imgH, width: imgW, height: imgH });
    }

    // Footer
    page.drawLine({ start: { x: 40, y: 40 }, end: { x: width - 40, y: 40 }, thickness: 0.5, color: rgb(0.376,0.647,0.980) });
    page.drawText('Government Railway Police, Andhra Pradesh  |  Confidential', { x: 40, y: 26, size: 8, font: fontRegular, color: gray });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('PDF download failed:', err);
    alert('Failed to generate PDF. Try again.');
  }
}

function getStationPhone(stationName) {
  for (const div of stations) {
    for (const sub of div.subdivisions || []) {
      for (const circle of sub.circles || []) {
        for (const st of circle.stations || []) {
          if (st.name === stationName) return st.phone || '-';
        }
      }
    }
  }
  return '-';
}

const initialForm = {
  reportedDate: '',
  description: '',
  files: [],
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN');
};

function groupRecords(records) {
  const map = new Map();
  for (const r of records) {
    const key = `${r.station}||${r.reported_date}||${r.description}`;
    const incomingUrls = Array.isArray(r.media_urls) && r.media_urls.length
      ? r.media_urls
      : (r.image_url ? [r.image_url] : []);
    const incomingIds = Array.isArray(r.ids) && r.ids.length
      ? r.ids
      : (r.id ? [r.id] : []);

    if (!map.has(key)) map.set(key, { ...r, mediaUrls: [], ids: [] });
    const grouped = map.get(key);

    incomingUrls.forEach((url) => {
      if (url && !grouped.mediaUrls.includes(url)) grouped.mediaUrls.push(url);
    });
    incomingIds.forEach((id) => {
      if (id && !grouped.ids.includes(id)) grouped.ids.push(id);
    });
  }
  return Array.from(map.values());
}

const StationUnidentifiedBodiesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [form, setForm] = useState(initialForm);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [viewGroup, setViewGroup] = useState(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await stationAPI.getUnidentifiedBodies();
      setRecords(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Failed to load unidentified body records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    return () => {
      previewUrls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files || []);
    setForm((prev) => {
      const merged = [...prev.files, ...newFiles];
      previewUrls.forEach(u => URL.revokeObjectURL(u));
      setPreviewUrls(merged.map(f => URL.createObjectURL(f)));
      return { ...prev, files: merged };
    });
    // reset input so same files can be re-selected
    event.target.value = '';
  };

  const resetForm = () => {
    previewUrls.forEach(u => URL.revokeObjectURL(u));
    setForm(initialForm);
    setPreviewUrls([]);
  };

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch = !searchText ||
        [r.description, r.station].join(' ').toLowerCase().includes(searchText.toLowerCase());
      const matchFrom = !dateFrom || r.reported_date >= dateFrom;
      const matchTo = !dateTo || r.reported_date <= dateTo;
      return matchSearch && matchFrom && matchTo;
    });
  }, [records, searchText, dateFrom, dateTo]);

  const filteredGrouped = useMemo(() => groupRecords(filtered), [filtered]);

  const clearFilters = () => { setSearchText(''); setDateFrom(''); setDateTo(''); };

  const applyDatePreset = (val) => {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    if (val === '7d') { setDateFrom(fmt(new Date(today - 7 * 86400000))); setDateTo(fmt(today)); }
    else if (val === '30d') { setDateFrom(fmt(new Date(today - 30 * 86400000))); setDateTo(fmt(today)); }
    else { setDateFrom(''); setDateTo(''); }
  };

  const exportToExcel = () => {
    if (!filteredGrouped.length) return;
    const headers = [
      { key: 'reported_date', label: 'Reported Date' },
      { key: 'description', label: 'Description' },
      { key: 'station', label: 'Station' },
    ];
    const data = filteredGrouped.map(row =>
      headers.reduce((obj, h) => {
        obj[h.label] = String(row[h.key] || '');
        return obj;
      }, {})
    );
    const ws = XLSX.utils.json_to_sheet(data, { header: headers.map(h => h.label) });
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.label.length, ...data.map(r => String(r[h.label] || '').length)) + 2 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'UnidentifiedBodies');
    XLSX.writeFile(wb, `unidentified_bodies_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`Delete this record (${group.ids.length} file${group.ids.length > 1 ? 's' : ''}) from ${group.station}? This cannot be undone.`)) return;
    try {
      for (const id of group.ids) {
        await unidentifiedBodiesAPI.delete(id);
      }
      setRecords((prev) => prev.filter((r) => !group.ids.includes(r.id)));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Delete failed.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.files.length || !form.reportedDate || !form.description.trim()) {
      setError('Please fill date, description, and select at least one image or video before uploading.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const payload = new FormData();
      form.files.forEach((selectedFile) => payload.append('files', selectedFile));
      payload.append('reported_date', form.reportedDate);
      payload.append('description', form.description.trim());
      const response = await unidentifiedBodiesAPI.create(payload);
      setRecords((prev) => [response.data, ...prev]);
      resetForm();
    } catch (uploadError) {
      setError(uploadError?.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-4 pb-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button type="button" variant="outline" onClick={() => navigate('/station-dashboard')} className="border-[#CBD5E1]">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[#2563EB]" />
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] heading-font">Unidentified Deadbodies</h1>
              <p className="text-sm text-[#64748B]">Welcome, <span className="font-semibold text-[#2563EB]">{user?.name}</span></p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border border-[#60A5FA] bg-white flex items-center gap-4">
            <div className="w-12 h-12 bg-[#2563EB] rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#2563EB]">{filteredGrouped.length}</p>
              <p className="text-xs text-[#64748B] mt-0.5">Total Records</p>
            </div>
          </Card>
          <Card className="p-4 border border-[#60A5FA] bg-white flex items-center gap-4">
            <div className="w-12 h-12 bg-[#F59E0B] rounded-lg flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#F59E0B]">
                {filteredGrouped.filter(r => {
                  const d = new Date(r.reported_date);
                  const now = new Date();
                  return !isNaN(d) && (now - d) <= 7 * 24 * 60 * 60 * 1000;
                }).length}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">Last 7 Days</p>
            </div>
          </Card>
          <Card className="p-4 border border-[#60A5FA] bg-white flex items-center gap-4">
            <div className="w-12 h-12 bg-[#8B5CF6] rounded-lg flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#8B5CF6]">
                {filteredGrouped.filter(r => {
                  const d = new Date(r.reported_date);
                  const now = new Date();
                  return !isNaN(d) && (now - d) <= 30 * 24 * 60 * 60 * 1000;
                }).length}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">Last 30 Days</p>
            </div>
          </Card>
          <Card className="p-4 border border-[#60A5FA] bg-white flex items-center gap-4">
            <div className="w-12 h-12 bg-[#10B981] rounded-lg flex items-center justify-center shrink-0">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#10B981]">
                {filteredGrouped.reduce((sum, r) => sum + (r.mediaUrls?.length || 0), 0)}
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">Total Media Files</p>
            </div>
          </Card>
        </div>

        {/* Records Table */}
        <Card className="overflow-hidden border border-[#60A5FA] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#60A5FA] bg-white px-6 py-4 flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">Uploaded Records</h2>
              <p className="text-sm text-[#64748B]">Latest unidentified deadbody entries uploaded by stations are listed below.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={fetchRecords} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={() => setUploadOpen(prev => !prev)} className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] flex items-center gap-1.5">
                {uploadOpen ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {uploadOpen ? 'Cancel Upload' : 'Upload New Record'}
              </Button>
            </div>
          </div>

          {/* Upload Form — collapsible */}
          {uploadOpen && (
            <div className="border-b border-[#60A5FA] bg-[#F8FAFC] px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#2563EB]" />
                <span className="text-sm font-semibold text-[#0F172A]">Upload New Record</span>
              </div>
              <div className="mb-4 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A8A]">
                Uploading automatically under station account: <span className="font-semibold">{user?.name || 'Current station'}</span>
              </div>
              <form onSubmit={async (e) => { await handleSubmit(e); setUploadOpen(false); }} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F172A]">Reported Date</label>
                    <Input name="reportedDate" type="date" value={form.reportedDate} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F172A]">Image / Video <span className="text-[#64748B] font-normal">(multiple allowed)</span></label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors">
                        <Upload className="h-4 w-4" />
                        {form.files.length ? `${form.files.length} file${form.files.length > 1 ? 's' : ''} selected` : 'Choose Files'}
                        <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
                      </label>
                      {form.files.length > 0 && (
                        <button type="button" onClick={() => { previewUrls.forEach(u => URL.revokeObjectURL(u)); setForm(p => ({ ...p, files: [] })); setPreviewUrls([]); }} className="text-xs text-red-500 hover:underline">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#0F172A]">Description</label>
                  <Textarea
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    placeholder="Enter identifying details, clothing, found location context, or other notes"
                    className="min-h-[120px]"
                  />
                </div>
                {previewUrls.length > 0 && (
                  <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {previewUrls.map((url, i) => (
                        form.files[i]?.type?.startsWith('video/') ? (
                          <video key={i} src={url} controls className="w-full h-24 rounded-lg object-cover" />
                        ) : (
                          <img key={i} src={url} alt={`Preview ${i + 1}`} className="w-full h-24 rounded-lg object-cover" />
                        )
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">{previewUrls.length} file{previewUrls.length > 1 ? 's' : ''} selected — all files will be grouped as one case in the table.</p>
                  </div>
                )}
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <Button type="submit" disabled={submitting} className="bg-[#2563EB] text-white hover:bg-[#1D4ED8]">
                  {submitting ? 'Uploading...' : 'Upload Record'}
                </Button>
              </form>
            </div>
          )}


          {/* Filter Bar */}
          <div className="border-b border-[#60A5FA] bg-white px-4 py-3">
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
                min={dateFrom || undefined}
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
              <div className="relative flex-1 min-w-[140px]">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Search by description or station..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
                />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={fetchRecords} disabled={loading} className="flex items-center gap-1.5 border border-[#CBD5E1]">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={exportToExcel}
                className="ml-auto flex items-center gap-1.5 bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
              >
                <Download className="w-4 h-4" /> Export Excel
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#EFF6FF] hover:bg-[#EFF6FF]">
                <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">S.No</TableHead>
                <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Reported Date</TableHead>
                <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Description</TableHead>
                <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Station</TableHead>
                <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Contact No</TableHead>
                <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Images/Videos</TableHead>
                <TableHead className="px-4 py-3 font-bold text-[#1E3A5F]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-[#64748B]">Loading records...</TableCell>
                </TableRow>
              ) : filteredGrouped.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-[#64748B]">
                    {records.length === 0 ? 'No unidentified deadbody records found.' : 'No records match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredGrouped.map((group, index) => (
                  <TableRow key={`${group.station}-${group.reported_date}-${index}`}>
                    <TableCell className="px-4 py-3 font-semibold text-[#0F172A]">{index + 1}</TableCell>
                    <TableCell className="px-4 py-3">{group.reported_date}</TableCell>
                    <TableCell className="max-w-[320px] px-4 py-3 whitespace-normal break-words">{group.description}</TableCell>
                    <TableCell className="px-4 py-3">{group.station}</TableCell>
                    <TableCell className="px-4 py-3">{getStationPhone(group.station)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Button type="button" size="sm" variant="outline" className="flex items-center gap-1 w-24 justify-center border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF]" onClick={() => { setViewGroup(group); setMediaIndex(0); }}>
                        <Eye className="h-4 w-4" /> View
                        <span className="ml-1 bg-[#DBEAFE] text-[#1D4ED8] text-xs font-bold px-1.5 rounded-full">{group.mediaUrls.length}</span>
                      </Button>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Button type="button" size="sm" variant="outline" className="flex items-center gap-1 border-red-600 text-red-600 hover:bg-red-50" onClick={() => handleDeleteGroup(group)}>
                        <Trash2 className="h-4 w-4" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      </div>

      {/* View Media Dialog */}
      <Dialog open={!!viewGroup} onOpenChange={(open) => { if (!open) { setViewGroup(null); setMediaIndex(0); } }}>
        <DialogContent className="max-w-3xl pb-4 !top-[58%]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-[#0F172A]">
              {viewGroup?.station}
              {viewGroup?.mediaUrls?.length > 1 && (
                <span className="ml-2 text-sm font-normal text-[#64748B]">— {mediaIndex + 1} / {viewGroup.mediaUrls.length}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="relative rounded-xl overflow-hidden bg-[#F1F5F9] flex items-center justify-center" style={{height: '420px', width: '100%'}}>
              {viewGroup?.mediaUrls?.length > 0 ? (
                /\.(mp4|webm|ogg|mov|avi)$/i.test(viewGroup.mediaUrls[mediaIndex]) ? (
                  <video key={viewGroup.mediaUrls[mediaIndex]} src={normalizeMediaUrl(viewGroup.mediaUrls[mediaIndex])} controls className="w-full h-full object-contain" />
                ) : (
                  <img key={viewGroup.mediaUrls[mediaIndex]} src={normalizeMediaUrl(viewGroup.mediaUrls[mediaIndex])} alt={`media-${mediaIndex + 1}`} className="w-full h-full object-contain" />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#94A3B8] py-10">
                  <ImageIcon className="h-10 w-10" />
                  <span className="text-sm">No media available</span>
                </div>
              )}
              {viewGroup?.mediaUrls?.length > 1 && (
                <>
                  <button onClick={() => setMediaIndex((i) => (i - 1 + viewGroup.mediaUrls.length) % viewGroup.mediaUrls.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setMediaIndex((i) => (i + 1) % viewGroup.mediaUrls.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-[#64748B]">
                {viewGroup?.reported_date && `Reported: ${viewGroup.reported_date}`}
              </span>
              {viewGroup?.mediaUrls?.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadMediaPDF(viewGroup, mediaIndex, normalizeMediaUrl)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#2563EB] text-white font-medium rounded-md hover:bg-[#1D4ED8] transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  {/\.(mp4|webm|ogg|mov|avi)$/i.test(viewGroup.mediaUrls[mediaIndex]) ? 'Download Video' : 'Download as PDF'}
                </button>
              )}
            </div>
            {viewGroup?.mediaUrls?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {viewGroup.mediaUrls.map((url, i) => (
                  <button key={i} onClick={() => setMediaIndex(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === mediaIndex ? 'border-[#2563EB]' : 'border-[#60A5FA] hover:border-[#60A5FA]'
                    }`}>
                    {/\.(mp4|webm|ogg|mov|avi)$/i.test(url) ? (
                      <div className="w-full h-full bg-[#E2E8F0] flex items-center justify-center">
                        <span className="text-xs font-bold text-[#64748B]">▶</span>
                      </div>
                    ) : (
                      <img src={normalizeMediaUrl(url)} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StationUnidentifiedBodiesPage;
