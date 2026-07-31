import React, { useEffect, useMemo, useState } from 'react';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminAPI } from '@/lib/api';
import { Download, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const actionLabels = {
  credential_password_update: 'Password Update',
  credential_username_update: 'Username Update',
  complaint_status_update: 'Complaint Status',
  station_complaint_status_update: 'Station Status',
  complaint_assign: 'Complaint Assign',
  complaint_delete: 'Complaint Delete',
  help_request_reply: 'Help Reply',
};

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
};

const parseDetails = (value) => {
  if (!value) return {};
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return {};
  }
};

const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAuditLogs(300);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actions = useMemo(() => [...new Set(logs.map((log) => log.action).filter(Boolean))], [logs]);
  const filteredLogs = useMemo(() => {
    let next = logs;
    if (actionFilter) next = next.filter((log) => log.action === actionFilter);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      next = next.filter((log) => JSON.stringify(log).toLowerCase().includes(q));
    }
    return next;
  }, [logs, actionFilter, searchText]);

  const exportLogs = () => {
    if (!filteredLogs.length) {
      toast.error('No audit logs to export');
      return;
    }
    const rows = filteredLogs.map((log, idx) => {
      const details = parseDetails(log.details);
      return {
        'S.No': idx + 1,
        Time: formatDate(log.created_at),
        Actor: log.actor_id || '-',
        Role: log.actor_role || '-',
        Action: actionLabels[log.action] || log.action || '-',
        Target: [log.target_type, log.target_id].filter(Boolean).join(': ') || '-',
        IP: log.ip_address || '-',
        Details: JSON.stringify(details),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return <div className="min-h-screen pt-8 px-4 text-center">Loading audit logs...</div>;

  return (
    <div className="min-h-screen pt-8 bg-[#F8FAFC] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <AdminPageHero
          title="Audit Logs"
          description="Review admin actions, credential changes, and complaint workflow activity."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 border border-[#60A5FA] bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0F172A] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#0F172A]">{logs.length}</p>
                <p className="text-xs text-[#64748B]">Total Logs</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-[#60A5FA] bg-white">
            <p className="text-2xl font-extrabold text-[#2563EB]">{actions.length}</p>
            <p className="text-xs text-[#64748B]">Action Types</p>
          </Card>
          <Card className="p-4 border border-[#60A5FA] bg-white">
            <p className="text-2xl font-extrabold text-[#16A34A]">{filteredLogs.length}</p>
            <p className="text-xs text-[#64748B]">Visible Results</p>
          </Card>
        </div>

        <Card className="p-4 border border-[#60A5FA] bg-white">
          <div className="flex flex-wrap gap-3 items-end mb-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#64748B] mb-1">Action</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="">All Actions</option>
                {actions.map((action) => (
                  <option key={action} value={action}>{actionLabels[action] || action}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <span className="text-xs font-semibold text-[#64748B] mb-1 block">Search</span>
              <div className="relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Actor, action, target, IP..."
                  className="w-full h-9 pl-9 pr-3 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={fetchLogs}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-[#60A5FA] bg-white text-sm font-semibold text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              type="button"
              onClick={exportLogs}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8]"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#60A5FA]">
            <Table className="border-collapse">
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow>
                  <TableHead className="border border-[#60A5FA] text-center font-bold">S.No</TableHead>
                  <TableHead className="border border-[#60A5FA] text-center font-bold">Time</TableHead>
                  <TableHead className="border border-[#60A5FA] text-center font-bold">Actor</TableHead>
                  <TableHead className="border border-[#60A5FA] text-center font-bold">Action</TableHead>
                  <TableHead className="border border-[#60A5FA] text-center font-bold">Target</TableHead>
                  <TableHead className="border border-[#60A5FA] text-center font-bold">IP</TableHead>
                  <TableHead className="border border-[#60A5FA] text-center font-bold">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="border border-[#60A5FA] text-center py-8 text-[#64748B]">No audit logs found.</TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, idx) => {
                    const details = parseDetails(log.details);
                    return (
                      <TableRow key={log.id || idx}>
                        <TableCell className="border border-[#60A5FA] text-center">{idx + 1}</TableCell>
                        <TableCell className="border border-[#60A5FA] text-center whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                        <TableCell className="border border-[#60A5FA] text-center">
                          <div className="font-semibold text-[#0F172A]">{log.actor_role || '-'}</div>
                          <div className="text-xs text-[#64748B]">{log.actor_id || '-'}</div>
                        </TableCell>
                        <TableCell className="border border-[#60A5FA] text-center">
                          <Badge className="bg-[#DBEAFE] text-[#1D4ED8]">{actionLabels[log.action] || log.action || '-'}</Badge>
                        </TableCell>
                        <TableCell className="border border-[#60A5FA] text-center">{[log.target_type, log.target_id].filter(Boolean).join(': ') || '-'}</TableCell>
                        <TableCell className="border border-[#60A5FA] text-center">{log.ip_address || '-'}</TableCell>
                        <TableCell className="border border-[#60A5FA] text-sm text-[#334155]">
                          {Object.keys(details).length ? JSON.stringify(details) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;
