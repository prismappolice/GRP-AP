import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api, { getAuthToken } from '@/lib/api';
import { toast } from 'sonner';
import { Users, Shield, Award, Network, Building2, Search, Plus, X } from 'lucide-react';
import { stations } from '@/data/stations';
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

const emptyNewUser = {
  accountType: 'station',
  name: '',
  email: '',
  phone: '',
  password: '',
  division: '',
  subdivision: '',
  circle: '',
  stationName: '',
};

const getPasswordPolicyError = (value = '') => {
  if (value.length < 12) return 'Password must be at least 12 characters';
  if (/\s/.test(value)) return 'Password cannot contain spaces';
  const checks = [
    [/[A-Z]/, 'uppercase letter'],
    [/[a-z]/, 'lowercase letter'],
    [/[0-9]/, 'number'],
    [/[^A-Za-z0-9]/, 'special character'],
  ];
  const missing = checks.filter(([pattern]) => !pattern.test(value)).map(([, label]) => label);
  return missing.length ? `Password must include ${missing.join(', ')}` : '';
};

const hierarchyRoleLabels = {
  srp: [{ field: 'division', label: 'Under SRP / Division' }],
  dsrp: [{ field: 'division', label: 'Under SRP / Division' }],
  irp: [
    { field: 'subdivision', label: 'Under DSRP / Sub Division' },
    { field: 'division', label: 'Under SRP / Division' },
  ],
  station: [
    { field: 'circle', label: 'Under IRP / Circle' },
    { field: 'subdivision', label: 'Under DSRP / Sub Division' },
    { field: 'division', label: 'Under SRP / Division' },
  ],
};

const getDivisionName = (division) => division?.division || division?.name || '';

const hierarchyOptions = stations.flatMap((division) => {
  const divisionName = getDivisionName(division);
  return (division.subdivisions || []).flatMap((subdivision) =>
    (subdivision.circles || []).flatMap((circle) => {
      const base = {
        division: divisionName,
        subdivision: subdivision.name,
        circle: circle.name,
        circlePhone: circle.phone || '',
      };
      const stationRows = (circle.stations || []).map((station) => ({
        ...base,
        stationName: station.name,
        stationPhone: station.phone || '',
      }));
      return [{ ...base, stationName: '', stationPhone: '' }, ...stationRows];
    })
  );
});

const uniqueHierarchyValues = (field, filters = {}) => {
  const seen = new Set();
  return hierarchyOptions
    .filter((row) =>
      Object.entries(filters).every(([key, value]) => !value || row[key] === value)
    )
    .map((row) => row[field])
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .sort((left, right) => left.localeCompare(right));
};

const findHierarchyRow = (field, value, filters = {}) =>
  hierarchyOptions.find((row) =>
    row[field] === value && Object.entries(filters).every(([key, filterValue]) => !filterValue || row[key] === filterValue)
  );

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
  const isAdmin = Boolean(getAuthToken() && typeof window !== 'undefined' && sessionStorage.getItem('isAdmin') === 'true');
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [officerSearch, setOfficerSearch] = useState('');
  const [srpSearch, setSrpSearch] = useState('');
  const [dsrpSearch, setDsrpSearch] = useState('');
  const [irpSearch, setIrpSearch] = useState('');

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
  const centralAdmins = credentials.filter((c) => c.scope === 'admin');
  const superiorOfficerCredentials = credentials
    .filter((c) => c.scope === 'officer')
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));

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
    'IRP Visakhapatnam', 'Visakhapatnam Circle',
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
  const updateStatus = async (scope, id, nextActive) => {
    try {
      await api.patch(`/admin/credentials/${scope}/${id}/status`, { is_active: nextActive });
      toast.success(nextActive ? 'Account enabled successfully' : 'Account disabled successfully');
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Status update failed');
    }
  };

  const updateNewUser = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  const updateNewUserRole = (accountType) => {
    setNewUser((prev) => ({
      ...prev,
      accountType,
      division: '',
      subdivision: '',
      circle: '',
      stationName: '',
    }));
  };

  const updateNewUserHierarchy = (field, value) => {
    setNewUser((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'stationName') {
        const row = findHierarchyRow('stationName', value);
        if (row) {
          next.circle = row.circle;
          next.subdivision = row.subdivision;
          next.division = row.division;
          next.name = value || next.name;
          next.phone = row.stationPhone || next.phone;
        }
      } else if (field === 'circle') {
        const row = findHierarchyRow('circle', value, { subdivision: next.subdivision, division: next.division })
          || findHierarchyRow('circle', value);
        if (row) {
          next.subdivision = row.subdivision;
          next.division = row.division;
          if (prev.accountType === 'irp') {
            next.name = value || next.name;
            next.phone = row.circlePhone || next.phone;
          }
        }
        if (!value) {
          next.stationName = '';
        }
      } else if (field === 'subdivision') {
        const row = findHierarchyRow('subdivision', value, { division: next.division }) || findHierarchyRow('subdivision', value);
        if (row) {
          next.division = row.division;
          if (prev.accountType === 'dsrp') {
            next.name = value || next.name;
          }
        }
        if (!value) {
          next.circle = '';
          next.stationName = '';
        }
      } else if (field === 'division' && prev.accountType === 'srp') {
        next.name = value ? `SRP ${value}` : next.name;
      }
      return next;
    });
  };

  const requireHierarchySelection = () => {
    const fields = hierarchyRoleLabels[newUser.accountType] || [];
    const missing = fields.find(({ field }) => !String(newUser[field] || '').trim());
    if (missing) {
      toast.error(`Select ${missing.label}`);
      return false;
    }
    return true;
  };

  const getHierarchySelectOptions = (field) => {
    if (field === 'stationName') {
      return uniqueHierarchyValues('stationName');
    }
    if (field === 'circle') {
      return uniqueHierarchyValues('circle', {
        stationName: newUser.stationName,
        subdivision: newUser.subdivision,
        division: newUser.division,
      });
    }
    if (field === 'subdivision') {
      return uniqueHierarchyValues('subdivision', {
        stationName: newUser.stationName,
        circle: newUser.circle,
        division: newUser.division,
      });
    }
    if (field === 'division') {
      return uniqueHierarchyValues('division', {
        stationName: newUser.stationName,
        circle: newUser.circle,
        subdivision: newUser.subdivision,
      });
    }
    return [];
  };

  const hierarchyPlaceholder = {
    stationName: 'Select station',
    circle: 'Select IRP / circle',
    subdivision: 'Select DSRP / sub division',
    division: 'Select SRP / division',
  };

  const renderHierarchySelect = ({ field, label }) => {
    const options = getHierarchySelectOptions(field);
    return (
      <label key={field} className="space-y-1">
        <span className="text-xs font-bold uppercase text-[#475569]">{label}</span>
        <select
          value={newUser[field]}
          onChange={(e) => updateNewUserHierarchy(field, e.target.value)}
          className="h-10 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE] disabled:bg-white disabled:text-[#94A3B8]"
          required
        >
          <option value="">{hierarchyPlaceholder[field]}</option>
          {options.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </label>
    );
  };

  const createCredential = async (event) => {
    event.preventDefault();
    if (!requireHierarchySelection()) {
      return;
    }
    const superiorRoles = new Set(['dgp']);
    const scope = superiorRoles.has(newUser.accountType) ? 'officer' : newUser.accountType;
    const role = superiorRoles.has(newUser.accountType) ? 'dgp' : undefined;
    const passwordError = getPasswordPolicyError(newUser.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setCreateLoading(true);
    try {
      await api.post('/admin/credentials', {
        scope,
        role,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || 'N/A',
        password: newUser.password,
        division: newUser.division || null,
        subdivision: newUser.subdivision || null,
        circle: newUser.circle || null,
        station_name: newUser.stationName || (newUser.accountType === 'station' ? newUser.name : null),
      });
      toast.success('User added successfully');
      setNewUser(emptyNewUser);
      setIsCreateOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add user');
    } finally {
      setCreateLoading(false);
    }
  };

  const adminTableRef = useRef(null);
  const officerTableRef = useRef(null);
  const srpTableRef = useRef(null);
  const dsrpTableRef = useRef(null);
  const irpTableRef = useRef(null);
  const stationTableRef = useRef(null);

  const scrollTo = (ref) => ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const matchesUsernameSearch = (row, value) => {
    const term = value.trim().toLowerCase();
    if (!term) return true;
    return String(row.email || row.id || '').toLowerCase().includes(term);
  };

  const renderFlatAdminTable = (title, rows, roleLabel, emptyLabel, extraHeader, tableRef) => {
    return (
      <div className="mb-8" ref={tableRef}>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold text-[#0F172A]">{title}</h3>
          <div className="flex items-center gap-3">
            {extraHeader}
            <div className="inline-flex items-center rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-bold text-[#1D4ED8]">
              Count: {rows.length}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#60A5FA]">
          <Table className="border-collapse border border-[#60A5FA]">
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow className="hover:bg-[#F8FAFC] border border-[#60A5FA]">
                <TableHead className="border border-[#60A5FA] px-4 py-3 w-20 text-center font-bold text-[#0F172A]">S.No</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 text-center font-bold text-[#0F172A]">Role</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 text-center font-bold text-[#0F172A]">Name</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 text-center font-bold text-[#0F172A]">Username</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 text-center font-bold text-[#0F172A]">Phone</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 text-center font-bold text-[#0F172A]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="border border-[#60A5FA]">
                  <TableCell colSpan={6} className="border border-[#60A5FA] text-center py-4 text-[#64748B]">{emptyLabel}</TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  const currentUsername = row.email || row.id || '';
                  const isActive = row.is_active !== false;
                  let displayRole = row.role;
                  if (typeof roleLabel === 'function') {
                    displayRole = roleLabel(row);
                  }
                  return (
                    <TableRow key={row.id || idx} className={`border border-[#60A5FA] ${isActive ? '' : 'bg-[#F8FAFC] text-[#94A3B8]'}`}>
                      <TableCell className="border border-[#60A5FA] text-center align-middle">{idx + 1}</TableCell>
                      <TableCell className="border border-[#60A5FA] text-center align-middle">{displayRole}</TableCell>
                      <TableCell className="border border-[#60A5FA] text-center align-middle">{row.name || '--'}</TableCell>
                      <TableCell className="border border-[#60A5FA] text-center align-middle">{currentUsername || '--'}</TableCell>
                      <TableCell className="border border-[#60A5FA] text-center align-middle whitespace-nowrap">{row.phone || '--'}</TableCell>
                      <TableCell className="border border-[#60A5FA] text-center align-middle">
                        <Button
                          variant="outline"
                          className={isActive
                            ? 'border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2]'
                            : 'border-[#16A34A] text-[#166534] hover:bg-[#F0FDF4]'
                          }
                          onClick={() => updateStatus(row.scope, row.id, !isActive)}
                        >
                          {isActive ? 'Disable' : 'Enable'}
                        </Button>
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

    <div className="min-h-screen pt-8 bg-[#F8FAFC] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <AdminPageHero
          title="Admin Credentials"
          description="Manage central admin credentials, the DGP login, and station hierarchy logins in the same structure shown on the organization page."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: 'Total', value: credentials.length, icon: Users, color: 'bg-[#2563EB]', text: 'text-[#2563EB]', ref: null },
            { label: 'Admin', value: centralAdmins.length, icon: Users, color: 'bg-[#0F172A]', text: 'text-[#0F172A]', ref: adminTableRef },
            { label: 'Officers', value: superiorOfficerCredentials.length, icon: Award, color: 'bg-[#DC2626]', text: 'text-[#DC2626]', ref: officerTableRef },
            { label: 'SRP', value: srpCredentials.length, icon: Shield, color: 'bg-[#7C3AED]', text: 'text-[#7C3AED]', ref: srpTableRef },
            { label: 'DSRP', value: dsrpCredentials.length, icon: Award, color: 'bg-[#D97706]', text: 'text-[#D97706]', ref: dsrpTableRef },
            { label: 'IRP', value: irpCredentials.length, icon: Network, color: 'bg-[#0891B2]', text: 'text-[#0891B2]', ref: irpTableRef },
            { label: 'Station', value: stationCredentials.length, icon: Building2, color: 'bg-[#10B981]', text: 'text-[#10B981]', ref: stationTableRef },
          ].map(({ label, value, icon: Icon, color, text, ref: cardRef }) => (
            <Card
              key={label}
              className={`flex items-center gap-3 px-4 py-3 border border-[#60A5FA] bg-white transition-all duration-150 ${cardRef ? 'cursor-pointer hover:shadow-md hover:border-[#2563EB]' : ''}`}
              onClick={() => cardRef && scrollTo(cardRef)}
            >
              <div className={`w-9 h-9 shrink-0 ${color} rounded-lg flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className={`text-xl font-extrabold leading-tight ${text}`}>{value}</p>
                <p className="text-xs text-[#64748B] leading-tight">{label}</p>
              </div>
            </Card>
          ))}
        </div>
        <Card className="p-6 border border-[#60A5FA] shadow-sm bg-white">
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

          <div className="mb-8 rounded-lg border border-[#BFDBFE] bg-[#F8FAFC] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#0F172A]">Add User</h3>
                <p className="mt-1 text-sm text-[#64748B]">Create temporary credentials for a new login.</p>
              </div>
              <Button
                type="button"
                variant={isCreateOpen ? 'outline' : 'default'}
                onClick={() => setIsCreateOpen((prev) => !prev)}
                className={isCreateOpen ? 'border-[#CBD5E1] text-[#334155] hover:bg-white' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'}
              >
                {isCreateOpen ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {isCreateOpen ? 'Close' : 'Add User'}
              </Button>
            </div>

            {isCreateOpen && (
              <form onSubmit={createCredential} className="mt-5 border-t border-[#DBEAFE] pt-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase text-[#475569]">Role</span>
                    <select
                      value={newUser.accountType}
                      onChange={(e) => updateNewUserRole(e.target.value)}
                      className="h-10 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE] disabled:bg-white disabled:text-[#94A3B8]"
                    >
                      <option value="admin">Admin</option>
                      <option value="dgp">DGP</option>
                      <option value="srp">SRP</option>
                      <option value="dsrp">DSRP</option>
                      <option value="irp">IRP</option>
                      <option value="station">Station</option>
                    </select>
                  </label>
                  {(hierarchyRoleLabels[newUser.accountType] || []).map(renderHierarchySelect)}
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase text-[#475569]">Name</span>
                    <Input className="bg-white text-[#0F172A]" value={newUser.name} onChange={(e) => updateNewUser('name', e.target.value)} placeholder="Display name" required />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase text-[#475569]">Username / Email</span>
                    <Input className="bg-white text-[#0F172A]" value={newUser.email} onChange={(e) => updateNewUser('email', e.target.value)} placeholder="Login username" type="email" required />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase text-[#475569]">Phone</span>
                    <Input className="bg-white text-[#0F172A]" value={newUser.phone} onChange={(e) => updateNewUser('phone', e.target.value)} placeholder="Optional" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase text-[#475569]">Temporary Password</span>
                    <Input className="bg-white text-[#0F172A]" value={newUser.password} onChange={(e) => updateNewUser('password', e.target.value)} placeholder="Strong password" type="password" autoComplete="new-password" required />
                  </label>
                  <div className="flex items-end">
                    <Button type="submit" disabled={createLoading} className="h-10 w-full bg-[#2563EB] hover:bg-[#1D4ED8]">
                      {createLoading ? 'Adding...' : 'Create User'}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {renderFlatAdminTable(
            '1. Central Admin Table',
            centralAdmins.filter(r => matchesUsernameSearch(r, adminSearch)),
            'admin',
            'No central admin credentials available.',
            <div className="relative"><Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" value={adminSearch} onChange={e => setAdminSearch(e.target.value)} placeholder="Search by username..." className="pl-9 pr-3 h-8 text-sm border border-[#60A5FA] rounded-md outline-none focus:border-[#2563EB] w-52" /></div>,
            adminTableRef
          )}
          {renderFlatAdminTable(
            '2. Superior Officers Table',
            superiorOfficerCredentials.filter(r => matchesUsernameSearch(r, officerSearch)),
            () => 'DGP',
            'No superior officer credentials available.',
            <div className="relative"><Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" value={officerSearch} onChange={e => setOfficerSearch(e.target.value)} placeholder="Search by username..." className="pl-9 pr-3 h-8 text-sm border border-[#60A5FA] rounded-md outline-none focus:border-[#2563EB] w-52" /></div>,
            officerTableRef
          )}
          {renderFlatAdminTable(
            '3. SRPs Table',
            srpCredentials.filter(r => matchesUsernameSearch(r, srpSearch)),
            'SRP',
            'No SRP credentials available.',
            <div className="relative"><Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" value={srpSearch} onChange={e => setSrpSearch(e.target.value)} placeholder="Search by username..." className="pl-9 pr-3 h-8 text-sm border border-[#60A5FA] rounded-md outline-none focus:border-[#2563EB] w-52" /></div>,
            srpTableRef
          )}
          {renderFlatAdminTable(
            '4. DSRPs Table',
            dsrpCredentials.filter(r => matchesUsernameSearch(r, dsrpSearch)),
            'DSRP',
            'No DSRP credentials available.',
            <div className="relative"><Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" value={dsrpSearch} onChange={e => setDsrpSearch(e.target.value)} placeholder="Search by username..." className="pl-9 pr-3 h-8 text-sm border border-[#60A5FA] rounded-md outline-none focus:border-[#2563EB] w-52" /></div>,
            dsrpTableRef
          )}
          {renderFlatAdminTable(
            '5. IRPs Table',
            irpCredentials.filter(r => matchesUsernameSearch(r, irpSearch)),
            'IRP',
            'No IRP credentials available.',
            <div className="relative"><Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" /><input type="text" value={irpSearch} onChange={e => setIrpSearch(e.target.value)} placeholder="Search by username..." className="pl-9 pr-3 h-8 text-sm border border-[#60A5FA] rounded-md outline-none focus:border-[#2563EB] w-52" /></div>,
            irpTableRef
          )}
          {renderFlatAdminTable(
            '6. Station Table',
            stationCredentials.filter(r => matchesUsernameSearch(r, stationSearch)),
            'Station',
            'No station credentials available.',
            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={stationSearch}
                onChange={e => setStationSearch(e.target.value)}
                placeholder="Search by username..."
                className="pl-9 pr-3 h-8 text-sm border border-[#60A5FA] rounded-md outline-none focus:border-[#2563EB] w-52"
              />
            </div>,
            stationTableRef
          )}
        </Card>
      </div>
    </div>
  );
}

export default AdminStationsPage;

