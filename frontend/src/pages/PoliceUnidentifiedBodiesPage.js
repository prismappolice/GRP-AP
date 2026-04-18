import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowUpDown, Download, RefreshCw, Search, ShieldCheck, X, Eye, ChevronLeft, ChevronRight, FileText, Clock, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { irpAPI, dsrpAPI, srpAPI, dgpAPI, normalizeMediaUrl } from '@/lib/api';
import { getOfficerScope, getSRPScopeDetails, getDSRPScopeDetails, getStationHierarchy } from '@/lib/policeScope';
import { stations } from '@/data/stations';

const UB_COLS = [
  { key: 'station', label: 'Station' },
  { key: 'reported_date', label: 'Reported Date' },
  { key: 'description', label: 'Description' },
  { key: 'media_count', label: 'Media' },
];

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
    incomingUrls.forEach(url => { if (url && !grouped.mediaUrls.includes(url)) grouped.mediaUrls.push(url); });
    incomingIds.forEach(id => { if (id && !grouped.ids.includes(id)) grouped.ids.push(id); });
  }
  return Array.from(map.values());
}

function exportToCSV(filename, rows) {
  if (!rows.length) return;
  const headerRow = UB_COLS.map(h => `"${h.label}"`).join(',');
  const dataRows = rows.map(row =>
    UB_COLS.map(h => {
      const val = h.key === 'media_count' ? String(row.mediaUrls?.length || 0) : String(row[h.key] || '');
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',')
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

function getAPIForRole(role) {
  if (role === 'irp') return irpAPI;
  if (role === 'dsrp') return dsrpAPI;
  if (role === 'srp') return srpAPI;
  if (role === 'dgp') return dgpAPI;
  return dgpAPI;
}

export const PoliceUnidentifiedBodiesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [subdivisionFilter, setSubdivisionFilter] = useState('');
  const [circleFilter, setCircleFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [searchText, setSearchText] = useState('');

  // Media viewer state
  const [viewGroup, setViewGroup] = useState(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [descModal, setDescModal] = useState(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  const scope = useMemo(() => getOfficerScope(user), [user]);
  const role = user?.role || '';
  const dashboardPath = scope.dashboardPath || '/irp-dashboard';

  const srpScope = useMemo(() => (role === 'srp' ? getSRPScopeDetails(user) : null), [user, role]);
  const dsrpScope = useMemo(() => (role === 'dsrp' ? getDSRPScopeDetails(user) : null), [user, role]);

  // --- Available hierarchy options from static stations data ---
  const availableDivisions = useMemo(() => {
    if (role === 'dgp') return stations.map(d => d.division).filter(Boolean);
    return [];
  }, [role]);

  const availableSubdivisions = useMemo(() => {
    if (role === 'dgp') {
      const divs = divisionFilter ? stations.filter(d => d.division === divisionFilter) : stations;
      return divs.flatMap(d => (d.subdivisions || []).map(s => s.name)).filter(Boolean);
    }
    if (role === 'srp' && srpScope) return srpScope.subdivisions.map(s => s.name);
    return [];
  }, [role, divisionFilter, srpScope]);

  const availableCircles = useMemo(() => {
    if (role === 'dgp') {
      const divs = divisionFilter ? stations.filter(d => d.division === divisionFilter) : stations;
      return divs.flatMap(d =>
        (d.subdivisions || [])
          .filter(s => !subdivisionFilter || s.name === subdivisionFilter)
          .flatMap(s => (s.circles || []).map(c => c.name))
      ).filter(Boolean);
    }
    if (role === 'srp' && srpScope) {
      return srpScope.subdivisions
        .filter(s => !subdivisionFilter || s.name === subdivisionFilter)
        .flatMap(s => s.circles.map(c => c.name));
    }
    if (role === 'dsrp' && dsrpScope) return dsrpScope.circles.map(c => c.name);
    return [];
  }, [role, divisionFilter, subdivisionFilter, srpScope, dsrpScope]);

  const availableStations = useMemo(() => {
    if (role === 'dgp') {
      const divs = divisionFilter ? stations.filter(d => d.division === divisionFilter) : stations;
      return divs.flatMap(d =>
        (d.subdivisions || [])
          .filter(s => !subdivisionFilter || s.name === subdivisionFilter)
          .flatMap(s =>
            (s.circles || [])
              .filter(c => !circleFilter || c.name === circleFilter)
              .flatMap(c => (c.stations || []).map(st => st.name))
          )
      ).filter(s => Boolean(s) && !/rpo/i.test(s));
    }
    if (role === 'srp' && srpScope) {
      return srpScope.subdivisions
        .filter(s => !subdivisionFilter || s.name === subdivisionFilter)
        .flatMap(s => s.circles)
        .filter(c => !circleFilter || c.name === circleFilter)
        .flatMap(c => c.stations);
    }
    if (role === 'dsrp' && dsrpScope) {
      return dsrpScope.circles
        .filter(c => !circleFilter || c.name === circleFilter)
        .flatMap(c => c.stations);
    }
    if (role === 'irp') return scope.stations || [];
    return [];
  }, [role, divisionFilter, subdivisionFilter, circleFilter, srpScope, dsrpScope, scope]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getAPIForRole(user?.role);
      const res = await api.getUnidentifiedBodies();
      setRecords(res.data || []);
    } catch {
      setError('Failed to load records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const grouped = useMemo(() => groupRecords(records), [records]);

  const filtered = useMemo(() => grouped.filter(r => {
    if (dateFrom && (r.reported_date || '') < dateFrom) return false;
    if (dateTo && (r.reported_date || '') > dateTo) return false;
    if (divisionFilter || subdivisionFilter || circleFilter || stationFilter) {
      const h = getStationHierarchy(r.station);
      if (divisionFilter && h.division !== divisionFilter) return false;
      if (subdivisionFilter && h.subdivision !== subdivisionFilter) return false;
      if (circleFilter && h.circle !== circleFilter) return false;
      if (stationFilter && r.station !== stationFilter) return false;
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      if (
        !(r.station || '').toLowerCase().includes(q) &&
        !(r.description || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [grouped, dateFrom, dateTo, divisionFilter, subdivisionFilter, circleFilter, stationFilter, searchText]);

  const handleSort = (key) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
      setSortDir('asc'); return key;
    });
  };

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] || '').toLowerCase();
      const bv = String(b[sortKey] || '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  function SortHead({ label, col, className = '' }) {
    const active = sortKey === col;
    return (
      <TableHead
        className={`text-xs font-bold text-[#475569] uppercase py-3 border border-[#60A5FA] px-3 cursor-pointer select-none hover:text-[#2563EB] ${className}`}
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          <ArrowUpDown className={`w-3 h-3 ${active ? 'text-[#2563EB]' : 'text-[#CBD5E1]'}`} />
        </span>
      </TableHead>
    );
  }


  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setDivisionFilter('');
    setSubdivisionFilter('');
    setCircleFilter('');
    setStationFilter('');
    setSearchText('');
  };

  const inputCls = 'h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]';
  const labelCls = 'text-xs font-semibold text-[#64748B] mb-1';

  const isVideo = (url) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url || '');

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Page Header */}
        <div className="mb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ShieldCheck className="w-7 h-7 text-[#2563EB]" />
              <h1 className="text-2xl font-extrabold text-[#0F172A] heading-font">Unidentified Dead Bodies</h1>
            </div>
            <p className="text-[#475569] text-sm">
              Officer: <span className="font-semibold text-[#0F172A]">{user?.name || '-'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(dashboardPath)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
              <Card className="p-4 border border-[#60A5FA] bg-white flex items-center gap-4">
                <div className="w-12 h-12 bg-[#2563EB] rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-[#2563EB]">{filtered.length}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Total Records</p>
                </div>
              </Card>
              <Card className="p-4 border border-[#60A5FA] bg-white flex items-center gap-4">
                <div className="w-12 h-12 bg-[#F59E0B] rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-[#F59E0B]">
                    {filtered.filter(r => { const d = new Date(r.reported_date); const now = new Date(); return !isNaN(d) && (now - d) <= 7 * 24 * 60 * 60 * 1000; }).length}
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
                    {filtered.filter(r => { const d = new Date(r.reported_date); const now = new Date(); return !isNaN(d) && (now - d) <= 30 * 24 * 60 * 60 * 1000; }).length}
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
                    {filtered.reduce((sum, r) => sum + (r.mediaUrls?.length || 0), 0)}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">Total Media Files</p>
                </div>
              </Card>
            </div>
        <Card className="p-5 border border-[#60A5FA]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl font-extrabold text-[#0F172A]">Unidentified Dead Bodies</h1>
              <p className="text-sm text-[#64748B] mt-0.5">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#60A5FA] bg-white text-sm font-semibold text-[#0F172A] hover:border-[#2563EB] transition-colors self-start sm:self-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-end gap-3 mb-5">
            <div className="flex flex-col">
              <span className={labelCls}>From</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col">
              <span className={labelCls}>To</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
            </div>

            {/* Division — DGP only */}
            {availableDivisions.length > 0 && (
              <div className="flex flex-col">
                <span className={labelCls}>Division</span>
                <select value={divisionFilter} onChange={e => { setDivisionFilter(e.target.value); setSubdivisionFilter(''); setCircleFilter(''); setStationFilter(''); }} className={inputCls}>
                  <option value="">All Divisions</option>
                  {availableDivisions.map(d => (
                    <option key={d} value={d}>{d === 'Vijayawada' ? 'SRP Vijayawada' : d === 'Guntakal' ? 'SRP Guntakal' : d}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Subdivision — DGP and SRP */}
            {availableSubdivisions.length > 0 && (
              <div className="flex flex-col">
                <span className={labelCls}>Subdivision</span>
                <select value={subdivisionFilter} onChange={e => { setSubdivisionFilter(e.target.value); setCircleFilter(''); setStationFilter(''); }} className={inputCls}>
                  <option value="">All Subdivisions</option>
                  {availableSubdivisions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Circle — DGP, SRP, DSRP */}
            {availableCircles.length > 0 && (
              <div className="flex flex-col">
                <span className={labelCls}>Circle</span>
                <select value={circleFilter} onChange={e => { setCircleFilter(e.target.value); setStationFilter(''); }} className={inputCls}>
                  <option value="">All Circles</option>
                  {availableCircles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* Station — all roles */}
            {availableStations.length > 0 && (
              <div className="flex flex-col">
                <span className={labelCls}>Station</span>
                <select value={stationFilter} onChange={e => setStationFilter(e.target.value)} className={inputCls}>
                  <option value="">All Stations</option>
                  {availableStations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="flex flex-col flex-1 min-w-[160px]">
              <span className={labelCls}>Search</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Station, description…"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className={`${inputCls} pl-8 w-full`}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="self-end inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[#60A5FA] bg-white text-sm font-semibold text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => exportToCSV(`unidentified_bodies_${new Date().toISOString().slice(0, 10)}.csv`, filtered)}
              className="self-end inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-10">
              <p className="text-red-500 font-semibold mb-3">{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
            <div className="overflow-x-auto rounded-lg border border-[#60A5FA]">
              <Table className="border-collapse w-full">
                <TableHeader>
                  <TableRow className="bg-[#F1F5F9]">
                    <TableHead className="text-xs font-bold text-[#475569] uppercase py-3 w-12 border border-[#60A5FA] px-3">S.No</TableHead>
                    <SortHead label="Station" col="station" />
                    <SortHead label="Reported Date" col="reported_date" />
                    <TableHead className="text-xs font-bold text-[#475569] uppercase py-3 border border-[#60A5FA] px-3">Description</TableHead>
                    <TableHead className="text-xs font-bold text-[#475569] uppercase py-3 border border-[#60A5FA] px-3">Media</TableHead>
                    <TableHead className="text-xs font-bold text-[#475569] uppercase py-3 border border-[#60A5FA] px-3">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-[#94A3B8] py-14 text-sm border border-[#60A5FA]">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedFiltered.map((r, i) => (
                      <TableRow key={i} className="hover:bg-[#F8FAFC] transition-colors">
                        <TableCell className="text-sm text-[#94A3B8] py-3 text-center border border-[#60A5FA] px-3">{i + 1}</TableCell>
                        <TableCell className="font-medium text-[#0F172A] text-sm py-3 whitespace-nowrap border border-[#60A5FA] px-3">{r.station || '-'}</TableCell>
                        <TableCell className="text-sm text-[#475569] py-3 whitespace-nowrap border border-[#60A5FA] px-3">{r.reported_date || '-'}</TableCell>
                        <TableCell className="text-sm py-3 max-w-xs border border-[#60A5FA] px-3">
                          <div
                            className="line-clamp-2 break-words cursor-pointer text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-medium"
                            title="Click to view full description"
                            onClick={() => setDescModal(r.description)}
                          >{r.description || '-'}</div>
                        </TableCell>
                        <TableCell className="text-sm text-[#475569] py-3 whitespace-nowrap border border-[#60A5FA] px-3">{r.mediaUrls?.length || 0} file{(r.mediaUrls?.length || 0) !== 1 ? 's' : ''}</TableCell>
                        <TableCell className="py-3 border border-[#60A5FA] px-3">
                          {r.mediaUrls?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => { setViewGroup(r); setMediaIndex(0); }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </Card>
      </div>

      {/* Description Dialog */}
      <Dialog open={!!descModal} onOpenChange={open => { if (!open) setDescModal(null); }}>
        <DialogContent className="max-w-lg mt-16">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-[#0F172A]">Full Description</DialogTitle>
          </DialogHeader>
          <div className="bg-[#F8FAFC] border border-[#60A5FA] rounded-lg p-4 text-sm text-[#334155] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {descModal}
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Viewer Dialog */}
      <Dialog open={!!viewGroup} onOpenChange={open => { if (!open) { setViewGroup(null); setMediaIndex(0); } }}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0F172A]">
              {viewGroup?.station} — {viewGroup?.reported_date}
            </DialogTitle>
          </DialogHeader>
          {viewGroup && (
            <div className="space-y-3">
              <p className="text-sm text-[#475569]">{viewGroup.description}</p>
              <div className="relative flex items-center justify-center bg-[#F1F5F9] rounded-lg overflow-hidden min-h-[300px]">
                {isVideo(viewGroup.mediaUrls[mediaIndex]) ? (
                  <video
                    src={normalizeMediaUrl(viewGroup.mediaUrls[mediaIndex])}
                    controls
                    className="max-h-[420px] max-w-full rounded"
                  />
                ) : (
                  <img
                    src={normalizeMediaUrl(viewGroup.mediaUrls[mediaIndex])}
                    alt={`Media ${mediaIndex + 1}`}
                    className="max-h-[420px] max-w-full object-contain rounded"
                  />
                )}
                {viewGroup.mediaUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMediaIndex(i => (i - 1 + viewGroup.mediaUrls.length) % viewGroup.mediaUrls.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaIndex(i => (i + 1) % viewGroup.mediaUrls.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-center text-[#94A3B8]">{mediaIndex + 1} / {viewGroup.mediaUrls.length}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PoliceUnidentifiedBodiesPage;
