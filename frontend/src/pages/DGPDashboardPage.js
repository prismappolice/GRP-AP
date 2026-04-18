import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUpRight, Building2, Download, ShieldCheck, Image as ImageIcon, Eye, LogIn } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dgpAPI } from '@/lib/api';
import { getAllStations, getStationHierarchy } from '@/lib/policeScope';
import { stations } from '@/data/stations';

const PIE_COLORS = { pending: '#F59E0B', investigating: '#3B82F6', resolved: '#10B981', approved: '#059669', rejected: '#EF4444' };
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

const inDateRange = (value, fromDate, toDate) => {
  if (!value) return false;
  if (fromDate && value < fromDate) return false;
  if (toDate && value > toDate) return false;
  return true;
};

const normalize = (value) => String(value || '').trim().toLowerCase();

export const DGPDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [ubRecords, setUbRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [subdivisionFilter, setSubdivisionFilter] = useState('');
  const [circleFilter, setCircleFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [complaintTypeFilter, setComplaintTypeFilter] = useState('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('');
  const [viewRecord, setViewRecord] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const complaintsRes = await dgpAPI.getComplaints();
        setComplaints(complaintsRes.data || []);
        try {
          const ubRes = await dgpAPI.getUnidentifiedBodies();
          setUbRecords(Array.isArray(ubRes.data) ? ubRes.data : []);
        } catch { setUbRecords([]); }
      } catch (err) {
        setError(err?.response?.data?.detail || 'Unable to load DGP dashboard data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const allStations = useMemo(() => getAllStations(), []);

  const complaintRows = useMemo(() => {
    return complaints.map((row) => ({
      ...row,
      hierarchy: getStationHierarchy(row.station),
    }));
  }, [complaints]);

  const divisionOptions = useMemo(() => {
    return stations.map((d) => d.division).filter(Boolean);
  }, []);

  const subdivisionOptions = useMemo(() => {
    const divs = divisionFilter ? stations.filter((d) => d.division === divisionFilter) : stations;
    return divs.flatMap((d) => (d.subdivisions || []).map((s) => s.name)).filter(Boolean);
  }, [divisionFilter]);

  const circleOptions = useMemo(() => {
    const divs = divisionFilter ? stations.filter((d) => d.division === divisionFilter) : stations;
    return divs.flatMap((d) =>
      (d.subdivisions || [])
        .filter((s) => !subdivisionFilter || s.name === subdivisionFilter)
        .flatMap((s) => (s.circles || []).map((c) => c.name))
    ).filter(Boolean);
  }, [divisionFilter, subdivisionFilter]);

  const stationOptions = useMemo(() => {
    const divs = divisionFilter ? stations.filter((d) => d.division === divisionFilter) : stations;
    return divs.flatMap((d) =>
      (d.subdivisions || [])
        .filter((s) => !subdivisionFilter || s.name === subdivisionFilter)
        .flatMap((s) =>
          (s.circles || [])
            .filter((c) => !circleFilter || c.name === circleFilter)
            .flatMap((c) => (c.stations || []).map((st) => st.name))
        )
    ).filter((s) => Boolean(s) && !/rpo/i.test(s));
  }, [divisionFilter, subdivisionFilter, circleFilter]);

  const crimeTypeOptions = useMemo(() => Array.from(new Set(complaintRows.map((r) => r.complaint_type).filter(Boolean))), [complaintRows]);

  const ubStationOptions = useMemo(() => {
    return Array.from(new Set(
      ubRecords
        .filter((r) => {
          const h = getStationHierarchy(r.station);
          if (divisionFilter && h.division !== divisionFilter) return false;
          if (subdivisionFilter && h.subdivision !== subdivisionFilter) return false;
          if (circleFilter && h.circle !== circleFilter) return false;
          return true;
        })
        .map((r) => r.station)
        .filter((s) => Boolean(s) && !s.toUpperCase().endsWith('RPOP'))
    ));
  }, [ubRecords, divisionFilter, subdivisionFilter, circleFilter]);

  const filteredUbRecords = useMemo(() => {
    return ubRecords.filter((r) => {
      const h = getStationHierarchy(r.station);
      if (divisionFilter && h.division !== divisionFilter) return false;
      if (subdivisionFilter && h.subdivision !== subdivisionFilter) return false;
      if (circleFilter && h.circle !== circleFilter) return false;
      if (stationFilter && r.station !== stationFilter) return false;
      if (searchText && ![r.station, r.district, r.description, r.uploaded_by].join(' ').toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [ubRecords, divisionFilter, subdivisionFilter, circleFilter, stationFilter, searchText]);

  const applyHierarchyFilters = (hierarchy, stationName) => {
    if (divisionFilter && hierarchy.division !== divisionFilter) return false;
    if (subdivisionFilter && hierarchy.subdivision !== subdivisionFilter) return false;
    if (circleFilter && hierarchy.circle !== circleFilter) return false;
    if (stationFilter && stationName !== stationFilter) return false;
    return true;
  };

  const filteredComplaints = useMemo(() => complaintRows.filter((row) => {
    const matchesHierarchy = applyHierarchyFilters(row.hierarchy, row.station);
    const matchesDate = inDateRange(row.incident_date, fromDate, toDate);
    const matchesType = !complaintTypeFilter || row.complaint_type === complaintTypeFilter;
    const matchesStatus = !complaintStatusFilter || row.status === complaintStatusFilter;
    const matchesSearch = [row.tracking_number, row.station, row.complaint_type, row.description, row.location, row.status, row.hierarchy.division, row.hierarchy.subdivision, row.hierarchy.circle].join(' ').toLowerCase().includes(searchText.toLowerCase());
    return matchesHierarchy && matchesDate && matchesType && matchesStatus && matchesSearch;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [complaintRows, divisionFilter, subdivisionFilter, circleFilter, stationFilter, fromDate, toDate, complaintTypeFilter, complaintStatusFilter, searchText]);

  const resetFilters = () => {
    setSearchText('');
    setDivisionFilter('');
    setSubdivisionFilter('');
    setCircleFilter('');
    setStationFilter('');
    setFromDate('');
    setToDate('');
    setComplaintTypeFilter('');
    setComplaintStatusFilter('');
  };

  const applyDivisionPreset = (divisionName) => {
    setDivisionFilter(divisionName);
    setSubdivisionFilter('');
    setCircleFilter('');
    setStationFilter('');
    setFromDate('');
    setToDate('');
    setSearchText('');
    setComplaintTypeFilter('');
    setComplaintStatusFilter('');
  };

  const applyPendingPreset = () => {
    setComplaintStatusFilter('pending');
    setComplaintTypeFilter('');
    setFromDate('');
    setToDate('');
    setSearchText('');
  };

  const applyLast7DaysPreset = () => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromDateObj = new Date(today);
    fromDateObj.setDate(fromDateObj.getDate() - 6);
    setFromDate(fromDateObj.toISOString().slice(0, 10));
    setToDate(to);
    setSearchText('');
  };

  const applyLast30DaysPreset = () => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromDateObj = new Date(today);
    fromDateObj.setDate(fromDateObj.getDate() - 29);
    setFromDate(fromDateObj.toISOString().slice(0, 10));
    setToDate(to);
    setSearchText('');
  };

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

  const handleExport = () => exportToCSV('dgp_complaints.csv', [
    { label: 'Tracking #', key: 'tracking_number' }, { label: 'Station', key: 'station' },
    { label: 'Type', key: 'complaint_type' }, { label: 'Status', key: 'status' },
    { label: 'Date', key: 'incident_date' }, { label: 'Location', key: 'location' },
  ], filteredComplaints);

  const complaintStatusVariant = (status) => {
    if (status === 'resolved') return 'default';
    if (status === 'investigating') return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-4 px-4 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto py-12 text-center text-[#475569]">Loading DGP dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 px-4 pb-10 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-8 h-8 text-[#2563EB]" />
              <h1 className="text-3xl font-extrabold text-[#0F172A] heading-font">DGP Dashboard</h1>
            </div>
            <p className="text-[#475569]">
              Officer: <span className="font-semibold text-[#0F172A]">{user?.name || '-'}</span>
            </p>
            <p className="text-sm text-[#64748B] mt-1">Statewide dashboard across Vijayawada and Guntakal divisions with advanced operational filters.</p>
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
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Crime Type</label>
              <select value={complaintTypeFilter} onChange={(e) => setComplaintTypeFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]">
                <option value="">All crime types</option>
                {crimeTypeOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Division</label>
              <select value={divisionFilter} onChange={(e) => { setDivisionFilter(e.target.value); setSubdivisionFilter(''); setCircleFilter(''); setStationFilter(''); }} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]">
                <option value="">All divisions</option>
                {divisionOptions.map((name) => (
                  <option key={name} value={name}>
                    {name === 'Vijayawada' ? 'SRP Vijayawada' : name === 'Guntakal' ? 'SRP Guntakal' : name}
                  </option>
                ))}
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
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Status</label>
              <select value={complaintStatusFilter} onChange={(e) => setComplaintStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <button type="button" onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md bg-white text-[#334155] hover:bg-[#F8FAFC]">
              Reset
            </button>
            <button type="button" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#2563EB] rounded-md bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button type="button" onClick={() => navigate('/police-complaints')} className="text-left">
            <Card className="p-4 border border-[#60A5FA] hover:border-[#60A5FA] hover:bg-[#F8FAFF] hover:shadow-md active:scale-[0.99] transition-all duration-150 cursor-pointer transform-gpu">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-xs text-[#64748B]">Total Complaints</p><p className="text-2xl font-bold text-[#0F172A]">{filteredComplaints.length}</p></div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB]">Details <ArrowUpRight className="w-3.5 h-3.5" /></span>
              </div>
            </Card>
          </button>
          <Card className="p-4 border border-[#60A5FA]">
            <p className="text-xs text-[#64748B]">Total Pending Complaints</p>
            <p className="text-2xl font-bold text-[#D97706]">{filteredComplaints.filter((c) => c.status === 'pending').length}</p>
          </Card>
          <Card className="p-4 border border-[#60A5FA]">
            <p className="text-xs text-[#64748B]">Total Resolved Complaints</p>
            <p className="text-2xl font-bold text-[#16A34A]">{filteredComplaints.filter((c) => c.status === 'resolved').length}</p>
          </Card>
        </div>

        {/* Export button */}
        <div className="flex justify-end mb-4">
          <button type="button" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#2563EB] rounded-md bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]">
            <Download className="w-3.5 h-3.5" /> Export Complaints CSV
          </button>
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

export default DGPDashboardPage;
