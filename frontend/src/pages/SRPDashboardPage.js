import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUpRight, Building2, Download, Filter, RefreshCw, Search, Image as ImageIcon, Eye, LogIn } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { srpAPI } from '@/lib/api';
import { getStationHierarchy, getSRPScopeDetails } from '@/lib/policeScope';
import { stations } from '@/data/stations';

const PIE_COLORS = { pending: '#F59E0B', investigating: '#3B82F6', resolved: '#10B981', approved: '#059669', rejected: '#EF4444', closed: '#6B7280' };
const BAR_COLORS = ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#78716C'];

function exportToCSV(filename, colDefs, rows) {
  const headerRow = colDefs.map(h => `"${h.label}"`).join(',');
  const dataRows = rows.map(row => colDefs.map(h => `"${String(row[h.key]||'').replace(/_/g,' ').replace(/"/g,'""')}"`).join(','));
  const csv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
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

const findStationFromLocation = (locationText, fallbackStationNames) => {
  const normalized = String(locationText || '').toLowerCase();
  return fallbackStationNames.find((name) => normalized.includes(name.toLowerCase())) || '';
};

export const SRPDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [ubRecords, setUbRecords] = useState([]);
  const [viewRecord, setViewRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [subdivisionFilter, setSubdivisionFilter] = useState('');
  const [circleFilter, setCircleFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const resetAllFilters = () => {
    setSearchText('');
    setDivisionFilter('');
    setSubdivisionFilter('');
    setCircleFilter('');
    setStationFilter('');
    setDateFrom('');
    setDateTo('');
    setCrimeTypeFilter('');
    setStatusFilter('');
  };

  const applyDivisionPreset = (divisionName) => {
    setDivisionFilter(divisionName);
    setSubdivisionFilter('');
    setCircleFilter('');
    setStationFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchText('');
    setCrimeTypeFilter('');
  };

  const applyPendingPreset = () => {
    setStatusFilter('pending');
    setCrimeTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchText('');
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const complaintsRes = await srpAPI.getComplaints();
        setComplaints(complaintsRes.data || []);
        try {
          const ubRes = await srpAPI.getUnidentifiedBodies();
          setUbRecords(Array.isArray(ubRes.data) ? ubRes.data : []);
        } catch { setUbRecords([]); }
      } catch (err) {
        setError(err?.response?.data?.detail || 'Unable to load SRP dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const complaintRows = useMemo(() => {
    return complaints.map((row) => ({
      ...row,
      hierarchy: getStationHierarchy(row.station),
    }));
  }, [complaints]);

  const srpScope = useMemo(() => getSRPScopeDetails(user), [user]);

  // Scoped dropdown options based on the SRP's division
  const divisionOptions = useMemo(() => srpScope.division ? [srpScope.division] : [], [srpScope]);

  const subdivisionOptions = useMemo(() => {
    if (!srpScope.subdivisions.length) return [];
    if (divisionFilter && divisionFilter !== srpScope.division) return [];
    return srpScope.subdivisions.map(s => s.name);
  }, [srpScope, divisionFilter]);

  const circleOptions = useMemo(() => {
    const subs = srpScope.subdivisions.filter(s => !subdivisionFilter || s.name === subdivisionFilter);
    return subs.flatMap(s => s.circles.map(c => c.name));
  }, [srpScope, subdivisionFilter]);

  const stationOptions = useMemo(() => {
    const subs = srpScope.subdivisions.filter(s => !subdivisionFilter || s.name === subdivisionFilter);
    const circles = subs.flatMap(s => s.circles).filter(c => !circleFilter || c.name === circleFilter);
    return circles.flatMap(c => c.stations);
  }, [srpScope, subdivisionFilter, circleFilter]);

  const crimeTypeOptions = useMemo(() => [...new Set(complaints.map(c => c.complaint_type).filter(Boolean))], [complaints]);

  const applyHierarchyFilters = (hierarchy, stationName) => {
    if (divisionFilter && hierarchy.division !== divisionFilter) return false;
    if (subdivisionFilter && hierarchy.subdivision !== subdivisionFilter) return false;
    if (circleFilter && hierarchy.circle !== circleFilter) return false;
    if (stationFilter && stationName !== stationFilter) return false;
    return true;
  };

  const filteredComplaints = useMemo(() => complaintRows.filter((row) => {
    const matchesHierarchy = applyHierarchyFilters(row.hierarchy, row.station);
    if (!matchesHierarchy) return false;
    if (dateFrom && row.incident_date < dateFrom) return false;
    if (dateTo && row.incident_date > dateTo) return false;
    if (crimeTypeFilter && row.complaint_type !== crimeTypeFilter) return false;
    if (statusFilter && row.status !== statusFilter) return false;
    if (searchText) {
      const haystack = [row.tracking_number, row.station, row.complaint_type, row.description, row.location, row.status, row.hierarchy.division, row.hierarchy.subdivision, row.hierarchy.circle].join(' ').toLowerCase();
      if (!haystack.includes(searchText.toLowerCase())) return false;
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [complaintRows, divisionFilter, subdivisionFilter, circleFilter, stationFilter, dateFrom, dateTo, crimeTypeFilter, statusFilter, searchText]);

  const filteredUbRecords = useMemo(() => ubRecords.filter((r) => {
    const h = getStationHierarchy(r.station);
    if (divisionFilter && h.division !== divisionFilter) return false;
    if (subdivisionFilter && h.subdivision !== subdivisionFilter) return false;
    if (circleFilter && h.circle !== circleFilter) return false;
    if (stationFilter && r.station !== stationFilter) return false;
    if (dateFrom && r.reported_date < dateFrom) return false;
    if (dateTo && r.reported_date > dateTo) return false;
    return true;
  }), [ubRecords, divisionFilter, subdivisionFilter, circleFilter, stationFilter, dateFrom, dateTo]);

  const statusPieData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach(c => { const s = c.status || 'unknown'; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredComplaints]);

  const crimeTypeBarData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach(c => { const t = c.complaint_type || 'unknown'; counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })).sort((a, b) => b.value - a.value);
  }, [filteredComplaints]);

  const crimeTypeByDateData = useMemo(() => {
    const allTypes = [...new Set(filteredComplaints.map(c => (c.complaint_type || 'unknown').replace(/_/g, ' ')))];
    const byDate = {};
    filteredComplaints.forEach(c => {
      const d = (c.incident_date || '').substring(0, 10);
      if (!d) return;
      if (!byDate[d]) byDate[d] = { date: d };
      const t = (c.complaint_type || 'unknown').replace(/_/g, ' ');
      byDate[d][t] = (byDate[d][t] || 0) + 1;
    });
    return { data: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)), types: allTypes };
  }, [filteredComplaints]);

  const ubByMonthData = useMemo(() => {
    const counts = {};
    filteredUbRecords.forEach(r => { if (r.reported_date) { const d = r.reported_date.substring(0, 10); counts[d] = (counts[d] || 0) + 1; } });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredUbRecords]);

  const complaintsByMonthData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach(c => { if (c.incident_date) { const d = c.incident_date.substring(0, 10); counts[d] = (counts[d] || 0) + 1; } });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredComplaints]);

  const handleExport = () => exportToCSV('srp_complaints.csv', [
    { label: 'Tracking #', key: 'tracking_number' }, { label: 'Station', key: 'station' },
    { label: 'Type', key: 'complaint_type' }, { label: 'Status', key: 'status' },
    { label: 'Date', key: 'incident_date' }, { label: 'Location', key: 'location' },
  ], filteredComplaints);

  if (loading) {
    return (
      <div className="min-h-screen pt-4 px-4 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto py-12 text-center text-[#475569]">Loading SRP dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 px-4 pb-10 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-[#2563EB]" />
              <h1 className="text-3xl font-extrabold text-[#0F172A] heading-font">SRP Dashboard</h1>
            </div>
            <p className="text-[#475569]">
              Officer: <span className="font-semibold text-[#0F172A]">{user?.name || '-'}</span>
            </p>
            <p className="text-sm text-[#64748B] mt-1">Complete division view with subdivision, circle, station, and date filters.</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-xs text-[#64748B]">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {(() => {
              const stored = localStorage.getItem('grp_login_time');
              const ts = stored ? Number(stored) : (() => { try { const tok = localStorage.getItem('grp_auth_token'); if (!tok) return null; const p = JSON.parse(atob(tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); return p?.iat ? p.iat * 1000 : null; } catch { return null; } })();
              if (!ts) return null;
              if (!stored) localStorage.setItem('grp_login_time', ts.toString());
              return (
                <p className="text-xs text-[#475569] flex items-center gap-1">
                  <LogIn className="w-3 h-3" />
                  Logged in at {new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </p>
              );
            })()}
          </div>
        </div>

        {error && (
          <Card className="mb-6 p-4 border border-red-200 bg-red-50 text-red-700">{error}</Card>
        )}

        <Card className="mb-6 p-4 border border-[#60A5FA] bg-white">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Crime Type</label>
              <select value={crimeTypeFilter} onChange={e => setCrimeTypeFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]">
                <option value="">All crime types</option>
                {crimeTypeOptions.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            {subdivisionOptions.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#64748B]">Subdivision</label>
                <select value={subdivisionFilter} onChange={(e) => { setSubdivisionFilter(e.target.value); setCircleFilter(''); setStationFilter(''); }} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]">
                  <option value="">All subdivisions</option>
                  {subdivisionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            )}
            {circleOptions.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#64748B]">Circle</label>
                <select value={circleFilter} onChange={(e) => { setCircleFilter(e.target.value); setStationFilter(''); }} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]">
                  <option value="">All circles</option>
                  {circleOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            )}
            {stationOptions.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#64748B]">Station</label>
                <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]">
                  <option value="">All stations</option>
                  {stationOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            )}
            <button type="button" onClick={resetAllFilters} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md bg-white text-[#334155] hover:bg-[#F8FAFC]">
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
            <button type="button" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#2563EB] rounded-md bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button type="button" onClick={() => navigate('/police-complaints')} className="text-left">
            <Card className="p-4 border border-[#60A5FA] hover:border-[#60A5FA] hover:bg-[#F8FAFF] hover:shadow-md active:scale-[0.99] transition-all duration-150 cursor-pointer transform-gpu">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-xs text-[#64748B]">Total Complaints</p><p className="text-2xl font-bold text-[#0F172A]">{filteredComplaints.length}</p></div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB]">Details <ArrowUpRight className="w-3.5 h-3.5" /></span>
              </div>
            </Card>
          </button>
          <Card className="p-4 border border-[#60A5FA]">
            <p className="text-xs text-[#64748B]">Pending</p>
            <p className="text-2xl font-bold text-[#D97706]">{filteredComplaints.filter(c => c.status === 'pending').length}</p>
          </Card>
          <Card className="p-4 border border-[#60A5FA]">
            <p className="text-xs text-[#64748B]">Investigating</p>
            <p className="text-2xl font-bold text-[#3B82F6]">{filteredComplaints.filter(c => c.status === 'investigating').length}</p>
          </Card>
          <Card className="p-4 border border-[#60A5FA]">
            <p className="text-xs text-[#64748B]">Resolved</p>
            <p className="text-2xl font-bold text-[#16A34A]">{filteredComplaints.filter(c => c.status === 'resolved').length}</p>
          </Card>
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-5 border border-[#60A5FA]">
            <p className="text-sm font-semibold text-[#0F172A] mb-4">Complaints by Status</p>
            {statusPieData.length === 0 ? <p className="text-xs text-[#94A3B8] text-center py-8">No data</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {statusPieData.map((entry, i) => <Cell key={i} fill={PIE_COLORS[entry.name] || BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card className="p-5 border border-[#60A5FA]">
            <p className="text-sm font-semibold text-[#0F172A] mb-4">Complaints by Crime Type &amp; Date</p>
            {crimeTypeByDateData.data.length === 0 ? <p className="text-xs text-[#94A3B8] text-center py-8">No data</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={crimeTypeByDateData.data} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {crimeTypeByDateData.types.map((t, i) => (
                    <Bar key={t} dataKey={t} stackId="a" fill={BAR_COLORS[i % BAR_COLORS.length]} radius={i === crimeTypeByDateData.types.length - 1 ? [3,3,0,0] : [0,0,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-5 border border-[#60A5FA]">
            <p className="text-sm font-semibold text-[#0F172A] mb-4">Complaints by Date </p>
            {complaintsByMonthData.length === 0 ? <p className="text-xs text-[#94A3B8] text-center py-8">No data</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={complaintsByMonthData} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Complaints" fill="#2563EB" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card className="p-5 border border-[#60A5FA]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[#0F172A]">Unidentified Bodies by Date </p>
              <button type="button" onClick={() => navigate('/police-unidentified-bodies')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {ubByMonthData.length === 0 ? <p className="text-xs text-[#94A3B8] text-center py-8">No data</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ubByMonthData} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Bodies" fill="#7C3AED" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={!!viewRecord} onOpenChange={(open) => { if (!open) setViewRecord(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Media — {viewRecord?.station}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {viewRecord?.image_url ? (
              /\.(mp4|webm|ogg|mov|avi)$/i.test(viewRecord.image_url) ? (
                <video src={viewRecord.image_url} controls className="max-h-[480px] w-full rounded-lg" />
              ) : (
                <img src={viewRecord.image_url} alt="body" className="max-h-[480px] w-full rounded-lg object-contain" />
              )
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-lg bg-[#E2E8F0] text-[#64748B]">
                <ImageIcon className="h-10 w-10" /><span className="ml-2">No media</span>
              </div>
            )}
            <p className="text-sm text-[#475569] text-center">{viewRecord?.description}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SRPDashboardPage;
