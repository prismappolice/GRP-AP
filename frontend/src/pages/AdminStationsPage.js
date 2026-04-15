import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Users, Shield, Award, Network, Building2 } from 'lucide-react';
// import removed: adminStationHierarchy, getAdminHierarchyCounts

const normalizeValue = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const hierarchyRowClasses = {
  division: 'bg-[#DBEAFE]',
  subdivision: 'bg-[#EFF6FF]',
  circle: 'bg-[#FFF7ED]',
  station: 'bg-white',
  irp: 'bg-[#DBF4FF]', // unified color for all IRP rows (light blue)
};

// New role mapping
const ROLE_SEQUENCE = ['dgp', 'srp', 'dsrp', 'irp', 'station'];

const getRolePriority = (role) => {
  const index = ROLE_SEQUENCE.indexOf(String(role || '').toLowerCase());
  return index === -1 ? ROLE_SEQUENCE.length : index;
};

const IRP_RPS_NAMES = ['IRP Vijayawada', 'IRP Guntur', 'IRP Rajahmundry', 'IRP Visakhapatnam'];

const sortByRoleSequence = (rows) =>
  [...rows].sort((left, right) => {
    const priorityDiff = getRolePriority(left?.role) - getRolePriority(right?.role);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return String(left?.name || '').localeCompare(String(right?.name || ''));
  });

const sortDisplayRowsByRoleSequence = (rows) =>
  [...rows].sort((left, right) => {
    const priorityDiff = getRolePriority(left?.node?.role) - getRolePriority(right?.node?.role);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return String(left?.node?.name || '').localeCompare(String(right?.node?.name || ''));
  });

const buildPlannedCredential = (node, level) => ({
  scope: 'user',
  id: `planned-${level}-${slugify(node.name)}`,
  name: node.name,
  email: `${slugify(node.name)}@grp.local`,
  password: 'Create in backend',
  isVirtual: true,
});

// Build credential index using both name and role for uniqueness
const buildCredentialIndex = (rows) => {
  const index = new Map();

  rows.forEach((row) => {
    const nameKey = normalizeValue(row.name);
    const roleKey = normalizeValue(row.role);
    const emailKey = normalizeValue(row.email);

    // Key: name + role (for user/IRP/SIRP separation)
    if (nameKey && roleKey) {
      index.set(`${nameKey}__${roleKey}`, row);
    }
    // Key: email (for direct lookup)
    if (emailKey) {
      index.set(emailKey, row);
    }
  });

  return index;
};

// Find all credentials for a node (by name and all possible roles)
const findCredentialsForNode = (index, node) => {
  const names = [node.name, ...(node.aliases || [])]
    .map((value) => normalizeValue(value))
    .filter(Boolean);
  const roles = ['dgp', 'srp', 'dsrp', 'irp', 'station'];
  const found = [];
  // Try all name/role combinations
  for (const name of names) {
    for (const role of roles) {
      const key = `${name}__${role}`;
      if (index.has(key)) {
        found.push(index.get(key));
      }
    }
    // Also try just name (legacy)
    if (index.has(name)) {
      found.push(index.get(name));
    }
  }
  // Also try email
  if (node.email) {
    const emailKey = normalizeValue(node.email);
    if (index.has(emailKey)) {
      found.push(index.get(emailKey));
    }
  }
  // Remove duplicates
  return Array.from(new Set(found));
};

const matchSearch = (term, node, credential) => {
  if (!term) {
    return true;
  }

  const haystack = [
    node.name,
    ...(node.aliases || []),
    node.phone,
    node.role,
    credential?.email,
    credential?.name,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(term);
};

const filterStationNode = (station, searchTerm, index) => {
  const credentials = findCredentialsForNode(index, station);
  // If any credential matches, include the station
  if (credentials.some((credential) => matchSearch(searchTerm, station, credential))) {
    return station;
  }
  return null;
};

const filterCircleNode = (circle, searchTerm, index) => {
  const credentials = findCredentialsForNode(index, circle);
  const stations = circle.stations
    .map((station) => filterStationNode(station, searchTerm, index))
    .filter(Boolean);

  if (!searchTerm || credentials.some((credential) => matchSearch(searchTerm, circle, credential))) {
    return { ...circle, stations: circle.stations };
  }

  return stations.length > 0 ? { ...circle, stations } : null;
};

const filterSubdivisionNode = (subdivision, searchTerm, index) => {
  const credentials = findCredentialsForNode(index, subdivision);
  const circles = subdivision.circles
    .map((circle) => filterCircleNode(circle, searchTerm, index))
    .filter(Boolean);

  if (!searchTerm || credentials.some((credential) => matchSearch(searchTerm, subdivision, credential))) {
    return { ...subdivision, circles: subdivision.circles };
  }

  return circles.length > 0 ? { ...subdivision, circles } : null;
};

const filterDivisionNode = (division, searchTerm, index) => {
  const credentials = findCredentialsForNode(index, division);
  const subdivisions = division.subdivisions
    .map((subdivision) => filterSubdivisionNode(subdivision, searchTerm, index))
    .filter(Boolean);

  if (!searchTerm || credentials.some((credential) => matchSearch(searchTerm, division, credential))) {
    return { ...division, subdivisions: division.subdivisions };
  }

  return subdivisions.length > 0 ? { ...division, subdivisions } : null;
};

// Flatten hierarchy and show all credentials for each node (including SIRP/IRP for same station)
const flattenHierarchyRows = (division, credentialIndex) => {
  const rows = [];

  // Division
  const divisionCreds = findCredentialsForNode(credentialIndex, division);
  if (divisionCreds.length > 0) {
    divisionCreds.forEach((cred) => {
      rows.push({
        type: 'division',
        indent: 0,
        node: division,
        credential: cred,
      });
    });
  } else {
    rows.push({
      type: 'division',
      indent: 0,
      node: division,
      credential: buildPlannedCredential(division, 'srp'),
    });
  }

  sortByRoleSequence(division.subdivisions).forEach((subdivision) => {
    const subdivisionCreds = findCredentialsForNode(credentialIndex, subdivision);
    if (subdivisionCreds.length > 0) {
      subdivisionCreds.forEach((cred) => {
        rows.push({
          type: 'subdivision',
          indent: 1,
          node: subdivision,
          credential: cred,
        });
      });
    } else {
      rows.push({
        type: 'subdivision',
        indent: 1,
        node: subdivision,
        credential: buildPlannedCredential(subdivision, 'dsrp'),
      });
    }

    sortByRoleSequence(subdivision.circles).forEach((circle) => {
      const circleRowType = circle.renderAsStation ? 'station' : 'circle';
      const circleRowIndent = circle.renderAsStation ? 3 : 2;
      const circleCreds = findCredentialsForNode(credentialIndex, circle);
      if (circleCreds.length > 0) {
        circleCreds.forEach((cred) => {
          rows.push({
            type: circleRowType,
            indent: circleRowIndent,
            node: circle,
            credential: cred,
          });
        });
      } else {
        rows.push({
          type: circleRowType,
          indent: circleRowIndent,
          node: circle,
          credential: circle.renderAsStation ? null : buildPlannedCredential(circle, 'irp'),
        });
      }

      sortByRoleSequence(circle.stations).forEach((station) => {
        const stationCreds = findCredentialsForNode(credentialIndex, station);
        if (stationCreds.length > 0) {
          stationCreds.forEach((cred) => {
            rows.push({
              type: 'station',
              indent: circle.renderAsStation ? 4 : 3,
              node: station,
              credential: cred,
            });
          });
        } else {
          rows.push({
            type: 'station',
            indent: circle.renderAsStation ? 4 : 3,
            node: station,
            credential: null,
          });
        }
      });
    });
  });

  return rows;
};

export const AdminStationsPage = () => {
  const navigate = useNavigate();
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pwdDrafts, setPwdDrafts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const credsRes = await api.get('/admin/credentials');
      setCredentials(credsRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const onDraftChange = (key, value) => {
    setPwdDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const centralAdmins = credentials.filter((c) => c.scope === 'admin');
  const superiorOfficerCredentials = credentials
    .filter((c) => c.scope === 'officer')
    .sort((left, right) => {
      const order = { dgp: -1, adgp: 0, dig: 1 };
      return (order[String(left.role || '').toLowerCase()] ?? 99) - (order[String(right.role || '').toLowerCase()] ?? 99);
    });

  // SRPs Table
  const srpNames = ['SRP Vijayawada', 'SRP Guntakal'];
  const srpCredentials = credentials.filter(
    (c) => c.scope === 'srp' || String(c.role || '').toLowerCase() === 'srp'
  );

  // DSRPs Table
  const dsrpNames = [
    'DSRP Vijayawada', 'DSRP Guntur', 'DSRP Rajahmundry', 'DSRP Visakhapatnam',
    'DSRP Guntakal', 'DSRP Tirupati', 'DSRP Nellore',
  ];
  const dsrpCredentials = credentials.filter(
    (c) => c.scope === 'dsrp' || String(c.role || '').toLowerCase() === 'dsrp'
  );

  // IRPs Table
  const irpNames = [
    'IRP Vijayawada', 'Vijayawada Circle',
    'IRP Guntur', 'Guntur Circle',
    'IRP Rajahmundry', 'Kakinada Circle', 'Bhimavaram Circle',
    'IRP Visakhapatnam', 'Vizianagaram Circle',
    'Guntakal Circle', 'Kurnool Circle', 'Dharmavaram Circle',
    'Tirupati Circle', 'Renigunta Circle', 'Kadapa Circle',
    'Nellore Circle', 'Ongole Circle',
  ];
  const irpCredentials = credentials.filter(
    (c) => c.scope === 'irp' || String(c.role || '').toLowerCase() === 'irp'
  );

  // Station Table (SIRP & HC - all from stations DB table)
  const stationCredentials = credentials.filter(
    (c) => c.scope === 'station' || String(c.role || '').toLowerCase() === 'station'
  );

  // Hierarchy credentials
  let hierarchyCredentials = credentials.filter(
    (c) =>
      (c.scope === 'user' && ['dgp', 'srp', 'dsrp', 'irp', 'station'].includes(String(c.role || '').toLowerCase())) ||
      (c.scope === 'officer' && String(c.role || '').toLowerCase() === 'dgp')
  );

  // Move IRP RPS stations to the top of the IRP list
  const irpRpsRows = hierarchyCredentials.filter(
    (c) => String(c.role || '').toLowerCase() === 'irp' && IRP_RPS_NAMES.includes(c.name)
  );
  const otherRows = hierarchyCredentials.filter(
    (c) => !(String(c.role || '').toLowerCase() === 'irp' && IRP_RPS_NAMES.includes(c.name))
  );
  hierarchyCredentials = [...irpRpsRows, ...otherRows];

  const updatePassword = async (scope, id) => {
    const key = `${scope}:${id}`;
    const newPassword = (pwdDrafts[key] || '').trim();
    if (!newPassword) {
      toast.error('Enter a new password');
      return;
    }

    try {
      await api.patch(`/admin/credentials/${scope}/${id}/password`, { new_password: newPassword });
      toast.success('Password updated successfully');
      setPwdDrafts((prev) => ({ ...prev, [key]: '' }));
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Password update failed');
    }
  };

  const renderFlatAdminTable = (title, rows, roleLabel, emptyLabel) => {
    return (
      <div className="mb-8">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold text-[#0F172A]">{title}</h3>
          <div className="inline-flex items-center rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-bold text-[#1D4ED8]">
            Count: {rows.length}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <Table className="border-collapse border border-[#E2E8F0]">
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow className="hover:bg-[#F8FAFC] border border-[#E2E8F0]">
                <TableHead className="border border-[#E2E8F0] px-4 py-3 w-20 text-left font-bold text-[#0F172A]">S.No</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Role</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Name</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Email</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Password</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Change Password</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="border border-[#E2E8F0]">
                  <TableCell colSpan={6} className="border border-[#E2E8F0] text-center py-4 text-[#64748B]">{emptyLabel}</TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  const credentialKey = `${row.scope}:${row.id}`;
                  const canUpdatePassword = Boolean(row.scope && row.id);
                  // Show 'ADGP' for DIG row in Superior Officers Table
                  let displayRole = row.role;
                  if (typeof roleLabel === 'function') {
                    displayRole = roleLabel(row);
                  }
                  if (row.scope === 'officer' && String(row.role).toLowerCase() === 'adgp') {
                    displayRole = 'ADGP';
                  }
                  return (
                    <TableRow key={row.id || idx} className="border border-[#E2E8F0]">
                      <TableCell className="border border-[#E2E8F0]">{idx + 1}</TableCell>
                      <TableCell className="border border-[#E2E8F0]">{displayRole}</TableCell>
                      <TableCell className="border border-[#E2E8F0]">{row.name}</TableCell>
                      <TableCell className="border border-[#E2E8F0]">{row.email || '--'}</TableCell>
                      <TableCell className="border border-[#E2E8F0]">{row.password || '--'}</TableCell>
                      <TableCell className="border border-[#E2E8F0]">
                        <div className="flex min-w-[200px] gap-2">
                          <Input
                            placeholder={canUpdatePassword ? 'New password' : 'Unavailable'}
                            type="password"
                            autoComplete="new-password"
                            value={pwdDrafts[credentialKey] || ''}
                            onChange={(e) => onDraftChange(credentialKey, e.target.value)}
                            className="text-sm"
                            disabled={!canUpdatePassword}
                          />
                          <Button disabled={!canUpdatePassword} onClick={() => updatePassword(row.scope, row.id)}>
                            Update
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (

    <div className="min-h-screen pt-4 bg-[#F8FAFC] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <AdminPageHero
          title="Admin Credentials"
          description="Manage central admin credentials, the DGP login, and station hierarchy logins in the same structure shown on the organization page."
        />
                <div className="mb-4">
                  <button onClick={() => navigate('/admin-dashboard')} className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:underline font-medium">
                    ← Back to Dashboard
                  </button>
                </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total Credentials', value: credentials.length, icon: Users, color: 'bg-[#2563EB]', text: 'text-[#2563EB]' },
            { label: 'SRP', value: srpCredentials.length, icon: Shield, color: 'bg-[#7C3AED]', text: 'text-[#7C3AED]' },
            { label: 'DSRP', value: dsrpCredentials.length, icon: Award, color: 'bg-[#D97706]', text: 'text-[#D97706]' },
            { label: 'IRP', value: irpCredentials.length, icon: Network, color: 'bg-[#0891B2]', text: 'text-[#0891B2]' },
            { label: 'Station', value: stationCredentials.length, icon: Building2, color: 'bg-[#10B981]', text: 'text-[#10B981]' },
          ].map(({ label, value, icon: Icon, color, text }) => (
            <Card key={label} className="p-4 border border-[#E2E8F0] bg-white">
              <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{label}</p>
            </Card>
          ))}
        </div>
        <Card className="p-6 border border-[#E2E8F0] shadow-sm bg-white">
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A]">Admin Credentials</h2>
              <p className="text-sm text-[#475569] mt-2">Central logins, the DGP account, and station hierarchy credentials.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-bold text-[#1D4ED8]">
                Configured: {centralAdmins.length + superiorOfficerCredentials.length}
              </div>
            </div>
          </div>

          {renderFlatAdminTable(
            '1. Central Admin Table',
            centralAdmins.map((c) => ({ ...c, name: 'Central admin' })),
            'admin',
            'No central admin credentials available.'
          )}
          {renderFlatAdminTable(
            '2. Superior Officers Table',
            superiorOfficerCredentials,
            (row) => (String(row.role || '').toLowerCase() === 'adgp' ? 'ADGP' : String(row.role || '').toUpperCase()),
            'No superior officer credentials available.'
          )}
          {renderFlatAdminTable(
            '3. SRPs Table',
            srpCredentials,
            'SRP',
            'No SRP credentials available.'
          )}
          {renderFlatAdminTable(
            '4. DSRPs Table',
            dsrpCredentials,
            'DSRP',
            'No DSRP credentials available.'
          )}
          {renderFlatAdminTable(
            '5. IRPs Table',
            irpCredentials,
            'IRP',
            'No IRP credentials available.'
          )}
          {renderFlatAdminTable(
            '6. Station Table',
            stationCredentials,
            'Station',
            'No station credentials available.'
          )}
        </Card>
      </div>
    </div>
  );
}

export default AdminStationsPage;

