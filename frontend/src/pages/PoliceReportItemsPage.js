import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building2, MapPinned, Search } from 'lucide-react';
import { irpAPI, dsrpAPI, srpAPI, dgpAPI } from '@/lib/api';
import { getAllStations, getOfficerScope, getStationHierarchy } from '@/lib/policeScope';

const scopeLabel = {
  irp: 'IRP',
  dsrp: 'DSRP',
  srp: 'SRP',
  dgp: 'DGP',
};

const apiByScope = {
  irp: irpAPI.getLostItems,
  dsrp: dsrpAPI.getLostItems,
  srp: srpAPI.getLostItems,
  dgp: dgpAPI.getLostItems,
};

export const PoliceReportItemsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { scope, dashboardPath } = getOfficerScope(user);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const stationCatalog = useMemo(() => getAllStations(), []);

  const mapLostStation = (lostLocation) => {
    const normalizedLocation = String(lostLocation || '').toLowerCase();
    return stationCatalog.find((stationName) => normalizedLocation.includes(stationName.toLowerCase())) || '';
  };

  useEffect(() => {
    if (!['irp', 'dsrp', 'srp', 'dgp'].includes(scope)) {
      navigate(dashboardPath || '/dashboard', { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const fetcher = apiByScope[scope];
        const response = await fetcher();
        setRows(response.data || []);
      } catch (err) {
        setError(err?.response?.data?.detail || 'Unable to load reported items data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [scope, dashboardPath, navigate]);

  const enhancedRows = useMemo(() => {
    return rows.map((row) => {
      const stationName = mapLostStation(row.lost_location);
      return {
        ...row,
        stationName,
        hierarchy: stationName ? getStationHierarchy(stationName) : getStationHierarchy(''),
      };
    });
  }, [rows, stationCatalog]);

  const stationOptions = useMemo(() => {
    return Array.from(new Set(enhancedRows.map((row) => row.stationName).filter(Boolean)));
  }, [enhancedRows]);

  const filteredRows = enhancedRows.filter((row) => {
    const matchesSearch = [
      row.item_type,
      row.description,
      row.lost_location,
      row.contact_phone,
      row.status,
      row.stationName,
      row.hierarchy.division,
      row.hierarchy.subdivision,
      row.hierarchy.circle,
    ]
      .join(' ')
      .toLowerCase()
      .includes(searchText.toLowerCase());

    const matchesStation = !stationFilter || row.stationName === stationFilter;
    const matchesDate = !dateFilter || row.lost_date === dateFilter;
    const matchesStatus = !statusFilter || row.status === statusFilter;

    return matchesSearch && matchesStation && matchesDate && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto py-12 text-center text-[#475569]">Loading reported items...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-10 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(dashboardPath)}
            className="border-[#CBD5E1]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[#2563EB]" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F172A] heading-font">
                {scopeLabel[scope]} Report Items
              </h1>
              <p className="text-sm text-[#64748B]">Filtered lost and found reporting view for superior officers.</p>
            </div>
          </div>
        </div>

        {error && (
          <Card className="mb-6 p-4 border border-red-200 bg-red-50 text-red-700">{error}</Card>
        )}

        <Card className="mb-6 p-4 border border-[#E2E8F0] bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <div className="relative xl:col-span-2">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search reported items"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
              />
            </div>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All stations</option>
              {stationOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="mt-2 w-full md:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="claimed">Claimed</option>
            </select>
          </div>
        </Card>

        <Card className="p-0 border border-[#E2E8F0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] bg-white flex items-center gap-2 text-[#0F172A] font-semibold">
            <MapPinned className="w-4 h-4" />
            Reported Items ({filteredRows.length})
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#EFF6FF]">
                  <TableHead>Item Type</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Sub Division</TableHead>
                  <TableHead>Circle</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-[#94A3B8] py-8">No reported items found</TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm capitalize">{row.item_type || '-'}</TableCell>
                      <TableCell className="text-sm">{row.hierarchy.division || '-'}</TableCell>
                      <TableCell className="text-sm">{row.hierarchy.subdivision || '-'}</TableCell>
                      <TableCell className="text-sm">{row.hierarchy.circle || '-'}</TableCell>
                      <TableCell className="text-sm">{row.stationName || '-'}</TableCell>
                      <TableCell className="text-sm">{row.lost_date || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{row.status || '-'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PoliceReportItemsPage;
