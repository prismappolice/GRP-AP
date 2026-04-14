import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api, { getAuthToken } from '@/lib/api';
import { Users, Phone, UserX } from 'lucide-react';

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
  const token = getAuthToken();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        setError('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    if (isAdmin) fetchUsers();
  }, [isAdmin, token]);

  if (!isAdmin) return <div className="min-h-screen pt-28 px-4 text-center text-red-600">Access denied</div>;
  if (loading) return <div className="min-h-screen pt-28 px-4 text-center">Loading users...</div>;
  if (error) return <div className="min-h-screen pt-28 px-4 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen pt-28 pb-12 bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <AdminPageHero
        title="Public Users"
        description="View all registered public users with contact information and account details."
      />
      <div className="mb-4">
        <button onClick={() => navigate('/admin-dashboard')} className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:underline font-medium">
          ← Back to Dashboard
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Registered', value: users.length, icon: Users, color: 'bg-[#2563EB]', text: 'text-[#2563EB]' },
          { label: 'With Phone', value: users.filter(u => u.phone).length, icon: Phone, color: 'bg-[#10B981]', text: 'text-[#10B981]' },
          { label: 'No Phone', value: users.filter(u => !u.phone).length, icon: UserX, color: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
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
      <Card className="p-8 border border-[#E2E8F0] shadow-sm bg-white">
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <Table className="border-collapse">
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow className="hover:bg-[#F8FAFC]">
                <TableHead className="border border-[#E2E8F0] px-4 py-3 w-20 text-center font-bold text-[#0F172A]">S.No</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Name</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Email</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Phone</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Role</TableHead>
                <TableHead className="border border-[#E2E8F0] px-4 py-3 font-bold text-[#0F172A]">Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="border border-[#E2E8F0] px-4 py-10 text-center text-[#64748B]">
                    No registered public users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user, index) => (
                  <TableRow key={user.id} className="hover:bg-[#F8FAFC]">
                    <TableCell className="border border-[#E2E8F0] px-4 py-3 text-center font-semibold text-[#0F172A]">{index + 1}</TableCell>
                    <TableCell className="border border-[#E2E8F0] px-4 py-3 font-medium text-[#0F172A]">{user.name}</TableCell>
                    <TableCell className="border border-[#E2E8F0] px-4 py-3 text-[#334155]">{user.email}</TableCell>
                    <TableCell className="border border-[#E2E8F0] px-4 py-3 text-[#334155]">{user.phone || '-'}</TableCell>
                    <TableCell className="border border-[#E2E8F0] px-4 py-3 capitalize text-[#334155]">{user.role}</TableCell>
                    <TableCell className="border border-[#E2E8F0] px-4 py-3 text-[#334155]">{new Date(user.created_at).toLocaleString()}</TableCell>
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

export default AdminUsersPage;
