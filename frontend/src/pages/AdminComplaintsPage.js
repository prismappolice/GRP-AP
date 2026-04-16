import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, X, FileText, Clock, AlertCircle, CheckCircle2, XCircle, Search } from 'lucide-react';
import api, { complaintsAPI, getAuthToken } from '@/lib/api';
import { getAllStations } from '@/lib/policeScope';

const BASE_URL = 'http://localhost:8001';

const FileViewModal = ({ title, fileUrl, onClose }) => {
  if (!fileUrl) return null;
  const isImage = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(fileUrl);
  const isPdf = /\.pdf$/i.test(fileUrl);
  const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${BASE_URL}${fileUrl}`;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="bg-white rounded-lg max-w-xl w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#0F172A]"><X className="w-5 h-5" /></button>
        </div>
        <div className="mb-4">
          {isImage ? (
            <img src={fullUrl} alt={title} className="max-w-full h-auto rounded border border-[#E2E8F0]" />
          ) : isPdf ? (
            <iframe src={fullUrl} title={title} className="w-full h-64 rounded border border-[#E2E8F0]" />
          ) : (
            <div className="bg-[#F1F5F9] p-4 rounded text-[#334155] break-all text-sm">
              <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline">{fileUrl.split('/').pop()}</a>
            </div>
          )}
        </div>
        <a href={fullUrl} download className="flex items-center justify-center gap-2 w-full py-2 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors font-medium">
          <Download className="w-4 h-4" /> Download
        </a>
      </Card>
    </div>
  );
};

const AdminComplaintsPage = () => {
  const navigate = useNavigate();
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
  const token = getAuthToken();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forwardId, setForwardId] = useState(null);
  const [forwardStation, setForwardStation] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);
  const [descModal, setDescModal] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [aadharModal, setAadharModal] = useState(null);
  const [docsModal, setDocsModal] = useState(null);

  const allStations = useMemo(() => getAllStations(), []);

  useEffect(() => {
    if (isAdmin) fetchComplaints();
  }, [isAdmin]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints', { headers: { Authorization: `Bearer ${token}` } });
      setComplaints(res.data);
    } catch (err) {
      setError('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async (id) => {
    if (!forwardStation) return;
    setForwardLoading(true);
    try {
      await complaintsAPI.assign(id, forwardStation);
      setForwardId(null);
      setForwardStation('');
      fetchComplaints();
    } catch (err) {
      alert('Failed to forward complaint');
    } finally {
      setForwardLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter(c => String(c.status || '').toLowerCase() === 'pending').length,
    investigating: complaints.filter(c => ['investigating', 'approved'].includes(String(c.status || '').toLowerCase())).length,
    resolved: complaints.filter(c => String(c.status || '').toLowerCase() === 'resolved').length,
    closed: complaints.filter(c => String(c.status || '').toLowerCase() === 'closed').length,
  }), [complaints]);

  const filteredComplaints = useMemo(() => {
    if (!searchText.trim()) return complaints;
    const q = searchText.toLowerCase();
    return complaints.filter(c =>
      [c.tracking_number, c.complaint_type, c.description, c.location, c.status, c.station,
       c.complainant_name, c.complainant_phone, c.complainant_email, c.address]
        .join(' ').toLowerCase().includes(q)
    );
  }, [complaints, searchText]);

  if (!isAdmin) return <div className="min-h-screen pt-4 px-4 text-center text-red-600">Access denied</div>;
  if (loading) return <div className="min-h-screen pt-4 px-4 text-center">Loading complaints...</div>;
  if (error) return <div className="min-h-screen pt-4 px-4 text-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen pt-4 pb-12 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminPageHero title="Complaints" description="Track, review, and update all complaints submitted through the portal." />
        <div className="mb-4">
          <button onClick={() => navigate('/admin-dashboard')} className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:underline font-medium">
            ← Back to Dashboard
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'bg-[#2563EB]', text: 'text-[#2563EB]' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
            { label: 'Investigating', value: stats.investigating, icon: AlertCircle, color: 'bg-[#8B5CF6]', text: 'text-[#8B5CF6]' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'bg-[#10B981]', text: 'text-[#10B981]' },
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
        <Card className="p-8 mb-8 border border-[#60A5FA] shadow-sm bg-white">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-6">All Complaints</h2>
          <div className="mb-4 relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search by tracking #, name, type, email, address..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#60A5FA]">
            <Table className="border-collapse">
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-[#F8FAFC]">
                  <TableHead className="border border-[#60A5FA] px-3 py-3 w-14 text-center font-bold text-[#0F172A]">S.No</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Tracking #</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Type</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Date</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Name</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Phone</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Email</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Address</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Description</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Forwarded To</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Status</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Aadhar Card</TableHead>
                  <TableHead className="border border-[#60A5FA] px-3 py-3 font-bold text-[#0F172A]">Supporting Docs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="border border-[#60A5FA] px-4 py-10 text-center text-[#64748B]">
                      No complaints found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComplaints.map((c, index) => (
                    <TableRow key={c.id} className="hover:bg-[#F8FAFC]">
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-center font-semibold text-[#0F172A]">{index + 1}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 font-medium text-[#0F172A] whitespace-nowrap">{c.tracking_number}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155]">{c.complaint_type || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155] whitespace-nowrap">{c.incident_date || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155] whitespace-nowrap">{c.complainant_name || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155] whitespace-nowrap">{c.complainant_phone || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155]">{c.complainant_email || '-'}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-[#334155] max-w-[160px]">
                        <div className="line-clamp-2 text-sm">{c.address || '-'}</div>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 max-w-[200px]">
                        <div
                          className="line-clamp-3 text-sm cursor-pointer text-[#2563EB] hover:underline"
                          onClick={() => setDescModal(c.description)}
                        >{c.description || '-'}</div>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 min-w-[200px]">
                        {forwardId === c.id ? (
                          <div className="flex gap-1 items-center">
                            <select
                              value={forwardStation}
                              onChange={e => setForwardStation(e.target.value)}
                              className="flex-1 border border-[#CBD5E1] rounded-md px-2 py-1 text-xs text-[#0F172A] bg-white"
                            >
                              <option value="">Select station...</option>
                              {allStations.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <Button size="sm" disabled={!forwardStation || forwardLoading} onClick={() => handleForward(c.id)}>
                              {forwardLoading ? '...' : 'Assign'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setForwardId(null); setForwardStation(''); }}>✕</Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {c.station && c.station !== 'Unassigned' && (
                              <span className="text-xs font-semibold text-[#0F172A]">{c.station}</span>
                            )}
                            <Button size="sm" variant="outline" onClick={() => { setForwardId(c.id); setForwardStation(c.station !== 'Unassigned' ? c.station : ''); }}>
                              {c.station === 'Unassigned' ? 'Forward' : 'Re-assign'}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2">
                        <Badge>{c.status || '-'}</Badge>
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-center">
                        {c.aadhar_file ? (
                          <button
                            onClick={() => setAadharModal(c.aadhar_file)}
                            className="px-3 py-1 bg-[#2563EB] text-white text-xs font-medium rounded hover:bg-[#1D4ED8] transition-colors"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">No File</span>
                        )}
                      </TableCell>
                      <TableCell className="border border-[#60A5FA] px-3 py-2 text-center">
                        {c.supporting_docs ? (
                          <button
                            onClick={() => setDocsModal(c.supporting_docs)}
                            className="px-3 py-1 bg-[#2563EB] text-white text-xs font-medium rounded hover:bg-[#1D4ED8] transition-colors"
                          >
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">No Docs</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {descModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setDescModal(null)}>
          <Card className="bg-white rounded-lg max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F172A]">Full Description</h3>
              <button onClick={() => setDescModal(null)} className="text-[#64748B] hover:text-[#0F172A]"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[#334155] whitespace-pre-wrap leading-relaxed text-sm">{descModal}</p>
          </Card>
        </div>
      )}

      {aadharModal && (
        <FileViewModal title="Aadhar Card" fileUrl={aadharModal} onClose={() => setAadharModal(null)} />
      )}

      {docsModal && (
        <FileViewModal title="Supporting Documents" fileUrl={docsModal} onClose={() => setDocsModal(null)} />
      )}
    </div>
  );
};

export default AdminComplaintsPage;