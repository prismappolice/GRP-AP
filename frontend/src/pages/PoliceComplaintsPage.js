import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, RefreshCw, Search, ShieldCheck, X, ChevronDown, ChevronUp, FileText, Clock, AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown, XCircle } from 'lucide-react';
import { irpAPI, dsrpAPI, srpAPI, dgpAPI } from '@/lib/api';
import { getOfficerScope, getSRPScopeDetails, getDSRPScopeDetails, getStationHierarchy } from '@/lib/policeScope';
import { stations } from '@/data/stations';
import SupportingDocsModal from '@/components/SupportingDocsModal';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  investigating: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-700',
};

const COMPLAINT_COLS = [
  { key: 'tracking_number', label: 'Tracking #' },
  { key: 'complaint_type', label: 'Crime Type' },
  { key: 'aadhar_number', label: 'Aadhaar Number' },
  { key: 'station', label: 'Station' },
  { key: 'incident_date', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
];

function exportToCSV(filename, rows) {
  if (!rows.length) return;
  const headerRow = COMPLAINT_COLS.map(h => `"${h.label}"`).join(',');
  const dataRows = rows.map(row =>
    COMPLAINT_COLS.map(h => `"${String(row[h.key] || '').replace(/_/g, ' ').replace(/"/g, '""')}"`).join(',')
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

export const PoliceComplaintsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [subdivisionFilter, setSubdivisionFilter] = useState('');
  const [circleFilter, setCircleFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [docsModal, setDocsModal] = useState(null);

  const scope = useMemo(() => getOfficerScope(user), [user]);
  const role = user?.role || '';
  const dashboardPath = scope.dashboardPath || '/station-dashboard';

  // Hierarchy scope details per role
  const srpScope = useMemo(() => (role === 'srp' ? getSRPScopeDetails(user) : null), [user, role]);
  const dsrpScope = useMemo(() => (role === 'dsrp' ? getDSRPScopeDetails(user) : null), [user, role]);

  // --- Available options from static stations data (not from complaint data) ---
  const availableDivisions = useMemo(() => {
    if (role === 'dgp') return stations.map(d => d.division).filter(Boolean);
    return [];
  }, [role]);

  const availableSubdivisions = useMemo(() => {
    if (role === 'dgp') {
      const divs = divisionFilter ? stations.filter(d => d.division === divisionFilter) : stations;
      return divs.flatMap(d => (d.subdivisions || []).map(s => s.name)).filter(Boolean);
    }
    if (role === 'srp' && srpScope) {
      return srpScope.subdivisions.map(s => s.name);
    }
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
    if (role === 'dsrp' && dsrpScope) {
      return dsrpScope.circles.map(c => c.name);
    }
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
    if (role === 'irp') {
      return scope.stations || [];
    }
    return [];
  }, [role, divisionFilter, subdivisionFilter, circleFilter, srpScope, dsrpScope, scope]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getAPIForRole(user?.role);
      const res = await api.getComplaints();
      setComplaints(res.data || []);
    } catch {
      setError('Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const crimeTypeOptions = useMemo(() => (
    [...new Set(complaints.map(c => c.complaint_type).filter(Boolean))]
  ), [complaints]);

  const filtered = useMemo(() => complaints.filter(c => {
    if (dateFrom && (c.incident_date || '') < dateFrom) return false;
    if (dateTo && (c.incident_date || '') > dateTo) return false;
    if (crimeTypeFilter && c.complaint_type !== crimeTypeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    // Hierarchy filtering
    if (divisionFilter || subdivisionFilter || circleFilter || stationFilter) {
      const h = getStationHierarchy(c.station);
      if (divisionFilter && h.division !== divisionFilter) return false;
      if (subdivisionFilter && h.subdivision !== subdivisionFilter) return false;
      if (circleFilter && h.circle !== circleFilter) return false;
      if (stationFilter && c.station !== stationFilter) return false;
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      const inTracking = (c.tracking_number || '').toLowerCase().includes(q);
      const inDesc = (c.description || '').toLowerCase().includes(q);
      if (!inTracking && !inDesc) return false;
    }
    return true;
  }), [complaints, dateFrom, dateTo, crimeTypeFilter, statusFilter, divisionFilter, subdivisionFilter, circleFilter, stationFilter, searchText]);

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter(c => String(c.status || '').toLowerCase() === 'pending').length,
    investigating: filtered.filter(c => String(c.status || '').toLowerCase() === 'investigating').length,
    resolved: filtered.filter(c => String(c.status || '').toLowerCase() === 'resolved').length,
    approved: filtered.filter(c => String(c.status || '').toLowerCase() === 'approved').length,
    rejected: filtered.filter(c => String(c.status || '').toLowerCase() === 'rejected').length,
    closed: filtered.filter(c => String(c.status || '').toLowerCase() === 'closed').length,
  }), [filtered]);

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setCrimeTypeFilter('');
    setStatusFilter('');
    setDivisionFilter('');
    setSubdivisionFilter('');
    setCircleFilter('');
    setStationFilter('');
    setSearchText('');
  };

  const inputCls = 'h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]';
  const labelCls = 'text-xs font-semibold text-[#64748B] mb-1';

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Page Header */}
        <div className="mb-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ShieldCheck className="w-7 h-7 text-[#2563EB]" />
              <h1 className="text-2xl font-extrabold text-[#0F172A] heading-font">Complaints</h1>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'bg-[#2563EB]', text: 'text-[#2563EB]' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
            { label: 'Investigating', value: stats.investigating, icon: AlertCircle, color: 'bg-[#8B5CF6]', text: 'text-[#8B5CF6]' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'bg-[#10B981]', text: 'text-[#10B981]' },
            { label: 'Approved', value: stats.approved, icon: ThumbsUp, color: 'bg-[#0EA5E9]', text: 'text-[#0EA5E9]' },
            { label: 'Rejected', value: stats.rejected, icon: ThumbsDown, color: 'bg-[#EF4444]', text: 'text-[#EF4444]' },
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

        <Card className="p-5 border border-[#60A5FA]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl font-extrabold text-[#0F172A]">Complaints</h1>
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
            <div className="flex flex-col">
              <span className={labelCls}>Crime Type</span>
              <select value={crimeTypeFilter} onChange={e => setCrimeTypeFilter(e.target.value)} className={inputCls}>
                <option value="">All Types</option>
                {crimeTypeOptions.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <span className={labelCls}>Status</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
                <option value="">All Status</option>
                {['pending', 'investigating', 'resolved', 'approved', 'rejected', 'closed'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Division — DGP only */}
            {availableDivisions.length > 0 && (
              <div className="flex flex-col">
                <span className={labelCls}>Division</span>
                <select value={divisionFilter} onChange={e => { setDivisionFilter(e.target.value); setSubdivisionFilter(''); setCircleFilter(''); setStationFilter(''); }} className={inputCls}>
                  <option value="">All divisions</option>
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
                  <option value="">All subdivisions</option>
                  {availableSubdivisions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Circle — DGP, SRP, DSRP */}
            {availableCircles.length > 0 && (
              <div className="flex flex-col">
                <span className={labelCls}>Circle</span>
                <select value={circleFilter} onChange={e => { setCircleFilter(e.target.value); setStationFilter(''); }} className={inputCls}>
                  <option value="">All circles</option>
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
                  placeholder="Tracking #, description…"
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
              onClick={() => exportToCSV(`complaints_${new Date().toISOString().slice(0, 10)}.csv`, filtered)}
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#60A5FA] bg-white text-sm font-semibold text-[#0F172A] hover:border-[#2563EB] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto rounded-lg border border-[#60A5FA]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F1F5F9]">
                    <TableHead className="text-xs font-bold text-[#64748B]">S.No</TableHead>
                    <TableHead className="text-xs font-bold text-[#64748B]">Tracking #</TableHead>
                    <TableHead className="text-xs font-bold text-[#64748B]">Crime Type</TableHead>
                    <TableHead className="text-xs font-bold text-[#64748B]">Complainant</TableHead>
                    <TableHead className="text-xs font-bold text-[#64748B]">Station</TableHead>
                    <TableHead className="text-xs font-bold text-[#64748B]">Date</TableHead>
                    <TableHead className="text-xs font-bold text-[#64748B]">Location</TableHead>
                    <TableHead className="text-xs font-bold text-[#64748B]">Status</TableHead>
                    <TableHead className="text-xs font-bold text-[#64748B]">Description</TableHead>
                    <TableHead className="text-xs font-bold text-[#64748B]">Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-[#94A3B8]">
                        No complaints found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c, i) => (
                      <React.Fragment key={c.id || i}>
                      <TableRow className="hover:bg-[#F8FAFC]">
                        <TableCell className="text-sm text-[#64748B]">{i + 1}</TableCell>
                        <TableCell className="text-sm font-mono font-semibold text-[#2563EB]">{c.tracking_number || '-'}</TableCell>
                        <TableCell className="text-sm text-[#0F172A]">{(c.complaint_type || '-').replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-semibold text-[#0F172A]">{c.complainant_name || '-'}</div>
                          <div className="text-xs text-[#64748B]">{c.complainant_phone || ''}</div>
                          <div className="text-xs text-[#64748B]">Aadhaar: {c.aadhar_number || '-'}</div>
                          <div className="text-xs text-[#64748B]">{c.complainant_email || ''}</div>
                        </TableCell>
                        <TableCell className="text-sm text-[#0F172A]">{c.station || '-'}</TableCell>
                        <TableCell className="text-sm text-[#0F172A]">{c.incident_date || '-'}</TableCell>
                        <TableCell className="text-sm text-[#0F172A]">{c.location || '-'}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-700'}`}>
                            {c.status || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-[#475569] max-w-[220px] truncate" title={c.description || ''}>
                          {c.description || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col gap-1">
                            {c.supporting_docs?.length ? (
                              <button
                                type="button"
                                onClick={() => setDocsModal(c.supporting_docs)}
                                className="text-xs text-[#2563EB] underline text-left"
                              >
                                View Docs ({c.supporting_docs.length})
                              </button>
                            ) : <span className="text-xs text-[#94A3B8]">No Docs</span>}
                            <button
                              type="button"
                              onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                              className="text-xs text-[#64748B] flex items-center gap-0.5 hover:text-[#2563EB]"
                            >
                              {expandedId === c.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              Details
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === c.id && (
                        <TableRow key={`${c.id}-detail`} className="bg-[#F0F9FF]">
                          <TableCell colSpan={9} className="px-6 py-4 border-b border-[#60A5FA]">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div><span className="font-semibold text-[#64748B] block text-xs mb-0.5">Aadhaar Number</span><span className="text-[#0F172A]">{c.aadhar_number || '-'}</span></div>
                              <div><span className="font-semibold text-[#64748B] block text-xs mb-0.5">Address</span><span className="text-[#0F172A]">{c.address || '-'}</span></div>
                              <div><span className="font-semibold text-[#64748B] block text-xs mb-0.5">Date of Incident</span><span className="text-[#0F172A]">{c.incident_date || '-'}</span></div>
                              <div><span className="font-semibold text-[#64748B] block text-xs mb-0.5">Email</span><span className="text-[#0F172A]">{c.complainant_email || '-'}</span></div>
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
          )}
        </Card>
      </div>

      {docsModal && (
        <SupportingDocsModal title="Supporting Documents" docs={docsModal} onClose={() => setDocsModal(null)} />
      )}
    </div>
  );
};

export default PoliceComplaintsPage;
