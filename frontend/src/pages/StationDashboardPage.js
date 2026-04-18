import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building2, FileText, CheckCircle, Clock, Search as SearchIcon, RefreshCw, Download, ArrowUpRight, Upload, X, Check, Search, LogIn, Bell,
} from 'lucide-react';
import { stationAPI, complaintsAPI } from '@/lib/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const PIE_COLORS = {
  pending: '#F59E0B',
  investigating: '#3B82F6',
  resolved: '#10B981',
  approved: '#059669',
  rejected: '#EF4444',
};
const BAR_COLORS = ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#EF4444', '#0EA5E9', '#EC4899', '#78716C'];

function exportToCSV(filename, colDefs, rows) {
  if (!rows.length) return;
  const headerRow = colDefs.map(h => `"${h.label}"`).join(',');
  const dataRows = rows.map(row =>
    colDefs.map(h => `"${String(row[h.key] || '').replace(/_/g, ' ').replace(/"/g, '""')}"`).join(',')
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



function groupUbRecords(records) {
  const map = new Map();
  for (const r of records) {
    const key = `${r.station}||${r.reported_date}||${r.description}`;
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  investigating: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

export const StationDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [ubRecords, setUbRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [inlineReason, setInlineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [stationAlerts, setStationAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_station_alerts') || '[]'); } catch { return []; }
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const cRes = await stationAPI.getComplaints();
      setComplaints(cRes.data || []);
      try {
        const ubRes = await stationAPI.getUnidentifiedBodies();
        setUbRecords(Array.isArray(ubRes.data) ? ubRes.data : []);
      } catch { setUbRecords([]); }
      try {
        const alertsRes = await stationAPI.getAlerts();
        setStationAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      } catch { setStationAlerts([]); }
    } catch {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId) => {
    const updated = [...dismissedAlerts, alertId];
    setDismissedAlerts(updated);
    localStorage.setItem('dismissed_station_alerts', JSON.stringify(updated));
  };

  useEffect(() => { fetchData(); }, []);

  // Poll for new alerts every 30 seconds
  useEffect(() => {
    const pollAlerts = async () => {
      try {
        const alertsRes = await stationAPI.getAlerts();
        setStationAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      } catch { /* silent */ }
    };
    const interval = setInterval(pollAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const crimeTypeOptions = [
    { value: 'theft', label: 'Theft' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'missing_person', label: 'Missing Person' },
    { value: 'nuisance', label: 'Nuisance' },
    { value: 'other', label: 'Other' },
  ];

  const applyDatePreset = (preset) => {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (preset === '7d') { setDateFrom(fmt(new Date(today - 7 * 86400000))); setDateTo(fmt(today)); }
    else if (preset === '30d') { setDateFrom(fmt(new Date(today - 30 * 86400000))); setDateTo(fmt(today)); }
    else if (preset === 'month') { setDateFrom(fmt(new Date(today.getFullYear(), today.getMonth(), 1))); setDateTo(fmt(today)); }
    else { setDateFrom(''); setDateTo(''); }
  };

  const filteredComplaints = useMemo(() => complaints.filter(c => {
    const matchCrime = !crimeTypeFilter || c.complaint_type === crimeTypeFilter;
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchFrom = !dateFrom || c.incident_date >= dateFrom;
    const matchTo = !dateTo || c.incident_date <= dateTo;
    return matchCrime && matchStatus && matchFrom && matchTo;
  }), [complaints, crimeTypeFilter, statusFilter, dateFrom, dateTo]);

  const filteredUbRecords = useMemo(() => ubRecords.filter(r => {
    const matchFrom = !dateFrom || r.reported_date >= dateFrom;
    const matchTo = !dateTo || r.reported_date <= dateTo;
    return matchFrom && matchTo;
  }), [ubRecords, dateFrom, dateTo]);

  const pendingCount = useMemo(() => filteredComplaints.filter(c => c.status === 'pending').length, [filteredComplaints]);
  const investigatingCount = useMemo(() => filteredComplaints.filter(c => c.status === 'investigating').length, [filteredComplaints]);
  const resolvedCount = useMemo(() => filteredComplaints.filter(c => c.status === 'resolved').length, [filteredComplaints]);

  const statusPieData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach(c => { const s = c.status || 'unknown'; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredComplaints]);

  const crimeTypeBarData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach(c => { const t = (c.complaint_type || 'Unknown').replace(/_/g, ' '); counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));
  }, [filteredComplaints]);

  const crimeTypeByDateData = useMemo(() => {
    const allTypes = [...new Set(filteredComplaints.map(c => (c.complaint_type || 'Unknown').replace(/_/g, ' ')))];
    const byDate = {};
    filteredComplaints.forEach(c => {
      const d = (c.incident_date || '').substring(0, 10);
      if (!d) return;
      if (!byDate[d]) byDate[d] = { date: d };
      const t = (c.complaint_type || 'Unknown').replace(/_/g, ' ');
      byDate[d][t] = (byDate[d][t] || 0) + 1;
    });
    return { data: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)), types: allTypes };
  }, [filteredComplaints]);

  const groupedUbRecords = useMemo(() => groupUbRecords(filteredUbRecords), [filteredUbRecords]);

  const ubByMonthData = useMemo(() => {
    const counts = {};
    groupedUbRecords.forEach(r => { const d = (r.reported_date || '').substring(0, 10); if (d) counts[d] = (counts[d] || 0) + 1; });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
  }, [groupedUbRecords]);

  const complaintsByMonthData = useMemo(() => {
    const counts = {};
    filteredComplaints.forEach(c => { if (c.incident_date) { const d = c.incident_date.substring(0, 10); counts[d] = (counts[d] || 0) + 1; } });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
  }, [filteredComplaints]);

  const tableFiltered = useMemo(() => filteredComplaints.filter(c =>
    !tableSearch || [c.complaint_type, c.description, c.location, c.tracking_number, c.status]
      .join(' ').toLowerCase().includes(tableSearch.toLowerCase())
  ), [filteredComplaints, tableSearch]);

  const handleComplaintAction = async (complaintId, status, reason = '') => {
    try {
      setActionLoading(true);
      const res = await complaintsAPI.updateStatus(complaintId, { status, rejection_reason: reason });
      setComplaints(prev => prev.map(c => c.id === complaintId ? res.data : c));
    } catch {
      alert('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportComplaints = () => {
    exportToCSV(`complaints_${new Date().toISOString().slice(0, 10)}.csv`, [
      { key: 'tracking_number', label: 'Tracking #' },
      { key: 'complaint_type', label: 'Crime Type' },
      { key: 'location', label: 'Location' },
      { key: 'incident_date', label: 'Date' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Description' },
    ], filteredComplaints);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-4 pb-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Building2 className="w-8 h-8 text-[#2563EB]" />
              <h1 className="text-3xl font-extrabold text-[#1E3A5F] heading-font">Station Dashboard</h1>
            </div>
            <p className="text-[#64748B] pl-11">Welcome, <span className="font-semibold text-[#2563EB]">{user?.name}</span></p>
          </div>
          <div className="flex flex-col items-end gap-1">
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

        {/* Station Alerts */}
        {stationAlerts.filter(a => !dismissedAlerts.includes(a.id) && a.is_active).length > 0 && (
          <div className="mb-6 space-y-3">
            {stationAlerts
              .filter(a => !dismissedAlerts.includes(a.id) && a.is_active)
              .map(alert => (
                <div key={alert.id} className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 shadow-sm">
                  <Bell className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-amber-900 text-sm">{alert.title}</p>
                    <p className="text-amber-700 text-xs mt-0.5">{alert.description}</p>
                    <p className="text-amber-500 text-xs mt-1">{new Date(alert.created_at).toLocaleString('en-IN')}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-amber-400 hover:text-amber-600 flex-shrink-0 mt-0.5"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            }
          </div>
        )}

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button type="button" onClick={() => navigate('/station-complaints')} className="text-left">
            <Card className="p-4 border border-[#60A5FA] hover:border-[#60A5FA] hover:bg-[#F8FAFF] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-[#64748B]">Total Complaints</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{complaints.length}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB]">
                  Manage <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">Click to view, approve or reject complaints</p>
            </Card>
          </button>
          <button type="button" onClick={() => navigate('/station-complaints?status=pending')} className="text-left">
            <Card className="p-4 border border-[#FCD34D] hover:border-[#FBBF24] hover:bg-[#FFFBEB] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-[#92400E]">Pending Complaints</p>
                  <p className="text-2xl font-bold text-[#B45309]">{complaints.filter(c => String(c.status || '').toLowerCase() === 'pending').length}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B45309]">
                  Review <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xs text-[#92400E] mt-1">Click to view all pending complaints</p>
            </Card>
          </button>
          <button type="button" onClick={() => navigate('/station-unidentified-bodies')} className="text-left">
            <Card className="p-4 border border-[#60A5FA] hover:border-[#60A5FA] hover:bg-[#F8FAFF] hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-[#64748B]">Total Unidentified Bodies</p>
                  <p className="text-2xl font-bold text-[#0F172A]">{groupUbRecords(ubRecords).length}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED]">
                  Upload <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">Click to upload or manage unidentified body records</p>
            </Card>
          </button>
        </div>

        {/* Filters + Export */}
        <Card className="mb-6 p-4 border border-[#60A5FA] bg-white">
          <p className="text-xs font-semibold text-[#475569] mb-3 uppercase tracking-wide">Filter Charts</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Quick Select</label>
              <div className="flex gap-1">
                {[['7d','Last 7d'],['30d','Last 30d'],['month','This Month'],['','All']].map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => applyDatePreset(val)}
                    className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
                      (val === '' && !dateFrom && !dateTo) || (val !== '' && dateFrom === new Date(val === '7d' ? Date.now()-7*86400000 : val === '30d' ? Date.now()-30*86400000 : new Date(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().slice(0,10))
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#2563EB] hover:text-[#2563EB]'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Crime Type</label>
              <select value={crimeTypeFilter} onChange={e => setCrimeTypeFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]">
                <option value="">All Types</option>
                {crimeTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#64748B]">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="investigating">Investigating</option>
                <option value="approved">Approved</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-end gap-2 ml-auto">
              <Button type="button" size="sm" variant="outline" onClick={fetchData} className="flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Charts Row 1: Status Pie + Crime Type Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-5 border border-[#60A5FA]">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" /> Complaint Status Breakdown
            </h3>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {statusPieData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-[#94A3B8] text-sm">No complaint data for selected filters</div>
            )}
          </Card>

          <Card className="p-5 border border-[#60A5FA]">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7C3AED]" /> Complaints by Crime Type &amp; Date
            </h3>
            {crimeTypeByDateData.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={crimeTypeByDateData.data} margin={{ top: 5, right: 10, left: -10, bottom: 55 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                  <XAxis dataKey="date" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {crimeTypeByDateData.types.map((t, i) => (
                    <Bar key={t} dataKey={t} stackId="a" fill={BAR_COLORS[i % BAR_COLORS.length]} radius={i === crimeTypeByDateData.types.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-[#94A3B8] text-sm">No complaint data for selected filters</div>
            )}
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-5 border border-[#60A5FA]">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Complaints by Date </h3>
            {complaintsByMonthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={complaintsByMonthData} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Complaints" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center text-[#94A3B8] text-sm">No complaint data for selected filters</div>
            )}
          </Card>
          <Card className="p-5 border border-[#60A5FA]">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#059669]" />
            Unidentified Bodies by Date 
            <span className="ml-auto text-xs text-[#64748B] font-normal">{groupedUbRecords.length} total</span>
          </h3>
          {ubByMonthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ubByMonthData} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#60A5FA" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Bodies Reported" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-[#94A3B8] text-sm">No unidentified body records for selected date range</div>
          )}
          </Card>
        </div>

      </div>
    </div>
  );
};

export default StationDashboardPage;

