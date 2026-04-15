import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUpRight, Building2, Download, Filter, Search, ShieldCheck, Image as ImageIcon, Eye, LogIn } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dgpAPI } from '@/lib/api';
import { getAllStations, getStationHierarchy } from '@/lib/policeScope';
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
    const values = complaintRows.map((r) => r.hierarchy.division).filter(Boolean);
    return Array.from(new Set(values));
  }, [complaintRows]);

  const subdivisionOptions = useMemo(() => {
    const values = complaintRows
      .filter((r) => !divisionFilter || r.hierarchy.division === divisionFilter)
      .map((r) => r.hierarchy.subdivision)
      .filter(Boolean);
    return Array.from(new Set(values));
  }, [complaintRows, divisionFilter]);

  const circleOptions = useMemo(() => {
    const values = complaintRows
      .filter((r) => {
        if (divisionFilter && r.hierarchy.division !== divisionFilter) return false;
        if (subdivisionFilter && r.hierarchy.subdivision !== subdivisionFilter) return false;
        return true;
      })
      .map((r) => r.hierarchy.circle)
      .filter(Boolean);
    return Array.from(new Set(values));
  }, [complaintRows, divisionFilter, subdivisionFilter]);

  const stationOptions = useMemo(() => {
    const values = complaintRows
      .filter((r) => {
        if (divisionFilter && r.hierarchy.division !== divisionFilter) return false;
        if (subdivisionFilter && r.hierarchy.subdivision !== subdivisionFilter) return false;
        if (circleFilter && r.hierarchy.circle !== circleFilter) return false;
        return true;
      })
      .map((r) => r.station)
      .filter(Boolean);
    return Array.from(new Set(values));
  }, [complaintRows, divisionFilter, subdivisionFilter, circleFilter]);

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
        .filter(Boolean)
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

  const ubByMonthData = useMemo(() => {
    const counts = {};
    filteredUbRecords.forEach(r => { if (r.reported_date) { const m = r.reported_date.substring(0, 7); counts[m] = (counts[m] || 0) + 1; } });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredUbRecords]);

  const handleExport = () => exportToCSV('dgp_complaints.csv', [
    { label: 'Tracking #', key: 'tracking_number' }, { label: 'Station', key: 'station' },
    { label: 'Type', key: 'complaint_type' }, { label: 'Status', key: 'status' },
    { label: 'Date', key: 'incident_date' }, { label: 'Location', key: 'location' },
  ], filteredComplaints);

  const complaintStatusVariant = (status) => {
    if (status === 'resolved') return 'default';
    if (status === 'investigating') return 'secondary';
    if (status === 'closed') return 'outline';
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
              <h1 className="text-3xl font-extrabold text-[#0F172A] heading-font">DGP Unified Dashboard</h1>
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

        <Card className="mb-6 p-4 border border-[#E2E8F0] bg-white">
          <div className="flex items-center gap-2 text-[#0F172A] font-semibold mb-3">
            <Filter className="w-4 h-4" />
            Filters
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => applyDivisionPreset('Vijayawada Division')}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#CBD5E1] bg-[#EFF6FF] text-[#1E40AF] hover:bg-[#DBEAFE]"
            >
              Vijayawada Only
            </button>
            <button
              type="button"
              onClick={() => applyDivisionPreset('Guntakal Division')}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#CBD5E1] bg-[#FEF3C7] text-[#92400E] hover:bg-[#FDE68A]"
            >
              Guntakal Only
            </button>
            <button
              type="button"
              onClick={applyPendingPreset}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#FCD34D] bg-[#FFFBEB] text-[#B45309] hover:bg-[#FEF3C7]"
            >
              Pending Complaints Only
            </button>
            <button
              type="button"
              onClick={applyLast7DaysPreset}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#BFDBFE] bg-[#F8FAFC] text-[#1E3A8A] hover:bg-[#EFF6FF]"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={applyLast30DaysPreset}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#BFDBFE] bg-[#EEF2FF] text-[#3730A3] hover:bg-[#E0E7FF]"
            >
              Last 30 Days
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
            <div className="relative xl:col-span-2">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search complaints and unidentified bodies"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
              />
            </div>
            <select
              value={divisionFilter}
              onChange={(e) => {
                setDivisionFilter(e.target.value);
                setSubdivisionFilter('');
                setCircleFilter('');
                setStationFilter('');
              }}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All SRP (Division)</option>
              {divisionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select
              value={subdivisionFilter}
              onChange={(e) => {
                setSubdivisionFilter(e.target.value);
                setCircleFilter('');
                setStationFilter('');
              }}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All DSRP (Sub Division)</option>
              {subdivisionOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select
              value={circleFilter}
              onChange={(e) => {
                setCircleFilter(e.target.value);
                setStationFilter('');
              }}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All IRP (Circle)</option>
              {circleOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All Stations</option>
              {stationOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            />
            <select
              value={complaintTypeFilter}
              onChange={(e) => setComplaintTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All complaint types</option>
              {crimeTypeOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select
              value={complaintStatusFilter}
              onChange={(e) => setComplaintStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All complaint statuses</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-1.5 text-sm font-semibold rounded-md border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC]"
            >
              Reset Filters
            </button>
          </div>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button type="button" onClick={() => navigate('/police-complaints')} className="text-left">
            <Card className="p-4 border border-[#E2E8F0] hover:border-[#93C5FD] hover:bg-[#F8FAFF] hover:shadow-md active:scale-[0.99] transition-all duration-150 cursor-pointer transform-gpu">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-xs text-[#64748B]">Complaints</p><p className="text-2xl font-bold text-[#0F172A]">{filteredComplaints.length}</p></div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB]">Details <ArrowUpRight className="w-3.5 h-3.5" /></span>
              </div>
            </Card>
          </button>
          <Card className="p-4 border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B]">Pending Complaints</p>
            <p className="text-2xl font-bold text-[#D97706]">{filteredComplaints.filter((c) => c.status === 'pending').length}</p>
          </Card>
          <Card className="p-4 border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B]">Resolved Complaints</p>
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
          <Card className="p-5 border border-[#E2E8F0]">
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
          <Card className="p-5 border border-[#E2E8F0]">
            <p className="text-sm font-semibold text-[#0F172A] mb-4">Complaints by Crime Type</p>
            {crimeTypeBarData.length === 0 ? <p className="text-xs text-[#94A3B8] text-center py-8">No data</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={crimeTypeBarData} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Complaints" radius={[3,3,0,0]}>
                    {crimeTypeBarData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* UB by Month */}
        <Card className="p-5 border border-[#E2E8F0] mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#0F172A]">Unidentified Bodies by Month ({filteredUbRecords.length} total)</p>
            <button type="button" onClick={() => navigate('/unidentified-bodies')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {ubByMonthData.length === 0 ? <p className="text-xs text-[#94A3B8] text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ubByMonthData} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Bodies" fill="#7C3AED" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
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
