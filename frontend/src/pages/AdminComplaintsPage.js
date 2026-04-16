import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, X, FileText, Clock, AlertCircle, CheckCircle2, XCircle, Search, ChevronDown, ChevronUp } from 'lucide-react';
import api, { complaintsAPI, getAuthToken } from '@/lib/api';
import { getAllStations } from '@/lib/policeScope';

const AdminComplaintsPage = () => {
  const navigate = useNavigate();
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true';
  const token = getAuthToken();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [forwardId, setForwardId] = useState(null);
  const [forwardStation, setForwardStation] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);
  const [descModal, setDescModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchText, setSearchText] = useState('');

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

  const handleEdit = (id, status) => {
    setEditId(id);
    setEditStatus(status);
  };

  const handleStatusChange = (e) => {
    setEditStatus(e.target.value);
  };

  const handleUpdate = async (id) => {
    try {
      await api.patch(`/complaints/${id}`, { status: editStatus }, { headers: { Authorization: `Bearer ${token}` } });
      setEditId(null);
      fetchComplaints();
    } catch (err) {
      alert('Update failed');
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

  if (!isAdmin) return <div className="min-h-screen pt-4 px-4 text-center text-red-600">Access denied</div>;
  if (loading) return <div className="min-h-screen pt-4 px-4 text-center">Loading complaints...</div>;
  if (error) return <div className="min-h-screen pt-4 px-4 text-center text-red-600">{error}</div>;

  const statusOptions = ['pending', 'investigating', 'approved', 'rejected', 'resolved', 'closed'];

  const filteredComplaints = useMemo(() => {
    if (!searchText.trim()) return complaints;
    const q = searchText.toLowerCase();
    return complaints.filter(c =>
      [c.tracking_number, c.complaint_type, c.description, c.location, c.status, c.station]
        .join(' ').toLowerCase().includes(q)
    );
  }, [complaints, searchText]);

  const hasEvidence = (complaint) => {
    return complaint?.evidence_media || complaint?.evidence || complaint?.media || complaint?.attachments;
  };

  const openMediaModal = (mediaData) => {
    setSelectedMedia(mediaData);
    setShowMediaModal(true);
  };

  const closeMediaModal = () => {
    setShowMediaModal(false);
    setSelectedMedia(null);
  };

  const handleDownloadMedia = (mediaUrl) => {
    if (!mediaUrl) return;
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = mediaUrl.split('/').pop() || 'media';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImageUrl = (url) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const isVideoUrl = (url) => {
    if (!url) return false;
    return /\.(mp4|webm|ogg|avi|mov)$/i.test(url);
  };

  return (
    <div className="min-h-screen pt-4 pb-12 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <AdminPageHero
        title="Complaints"
        description="Track, review, and update all complaints submitted through the portal."
      />
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
            placeholder="Search by tracking #, type, description, location, station..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#CBD5E1] rounded-md outline-none focus:border-[#2563EB]"
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#60A5FA]">
          <Table className="border-collapse">
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow className="hover:bg-[#F8FAFC]">
                <TableHead className="border border-[#60A5FA] px-4 py-3 w-20 text-center font-bold text-[#0F172A]">S.No</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Tracking #</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Complainant</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Type</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A] w-[320px] max-w-[320px]">Description</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Location</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Forward To</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Media</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Documents</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Status</TableHead>
                <TableHead className="border border-[#60A5FA] px-4 py-3 font-bold text-[#0F172A]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="border border-[#60A5FA] px-4 py-10 text-center text-[#64748B]">
                    No complaints found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredComplaints.map((c, index) => (
                  <React.Fragment key={c.id}>
                  <TableRow className="hover:bg-[#F8FAFC]">
                    <TableCell className="border border-[#60A5FA] px-4 py-2 text-center font-semibold text-[#0F172A]">{index + 1}</TableCell>
                    <TableCell className="border border-[#60A5FA] px-4 py-2 font-medium text-[#0F172A]">{c.tracking_number}</TableCell>
                      <TableCell className="border border-[#60A5FA] px-4 py-2">
                      <div className="text-sm font-semibold text-[#0F172A]">{c.complainant_name || '-'}</div>
                      <div className="text-xs text-[#64748B]">{c.complainant_phone || ''}</div>
                      <div className="text-xs text-[#64748B]">{c.complainant_email || ''}</div>
                    </TableCell>
                    <TableCell className="border border-[#60A5FA] px-4 py-2 text-[#334155]">{c.complaint_type}</TableCell>
                    <TableCell className="border border-[#60A5FA] px-4 py-2 max-w-[320px] text-[#334155]"><div className="line-clamp-3 break-words cursor-pointer text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-medium" title="Click to view full description" onClick={() => setDescModal(c.description)}>{c.description}</div></TableCell>
                    <TableCell className="border border-[#60A5FA] px-4 py-2 text-[#334155]">{c.location}</TableCell>
                    <TableCell className="border border-[#60A5FA] px-4 py-2 text-[#334155] min-w-[220px]">
                      {forwardId === c.id ? (
                        <div className="flex gap-2 items-center">
                          <select
                            value={forwardStation}
                            onChange={e => setForwardStation(e.target.value)}
                            className="flex-1 border border-[#CBD5E1] rounded-md px-2 py-1.5 text-sm text-[#0F172A] bg-white"
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
                    <TableCell className="border border-[#60A5FA] px-4 py-2 text-[#334155]">
                      {hasEvidence(c) ? (
                        <button
                          onClick={() => openMediaModal(c.evidence_media || c.evidence || c.media || c.attachments)}
                          className="px-3 py-1 bg-[#2563EB] text-white text-sm font-medium rounded hover:bg-[#1D4ED8] transition-colors"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-[#94A3B8]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="border border-[#60A5FA] px-4 py-2 text-[#334155]">
                      <div className="flex flex-col gap-1">
                        {c.aadhar_file ? (
                          <a href={`http://localhost:8001${c.aadhar_file}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563EB] underline font-medium">Aadhar</a>
                        ) : <span className="text-xs text-[#94A3B8]">No Aadhar</span>}
                        {c.supporting_docs ? (
                          <a href={`http://localhost:8001${c.supporting_docs}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563EB] underline font-medium">Support Doc</a>
                        ) : <span className="text-xs text-[#94A3B8]">No Docs</span>}
                      </div>
                    </TableCell>
                    <TableCell className="border border-[#60A5FA] px-4 py-2 text-[#334155]">
                      {editId === c.id ? (
                        <select value={editStatus} onChange={handleStatusChange} className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 text-sm text-[#0F172A] bg-white">
                          {statusOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <Badge>{c.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="border border-[#60A5FA] px-4 py-2 text-[#334155]">
                      <div className="flex flex-wrap gap-2">
                        {editId === c.id ? (
                          <>
                            <Button size="sm" onClick={() => handleUpdate(c.id)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={() => handleEdit(c.id, c.status)}>Edit</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                          {expandedId === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === c.id && (
                    <TableRow key={`${c.id}-detail`} className="bg-[#F0F9FF]">
                      <TableCell colSpan={10} className="border border-[#60A5FA] px-6 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div><span className="font-semibold text-[#64748B] block text-xs mb-0.5">Aadhar Number</span><span className="text-[#0F172A]">{c.aadhar_number || '-'}</span></div>
                          <div><span className="font-semibold text-[#64748B] block text-xs mb-0.5">Address</span><span className="text-[#0F172A]">{c.address || '-'}</span></div>
                          <div><span className="font-semibold text-[#64748B] block text-xs mb-0.5">Date of Incident</span><span className="text-[#0F172A]">{c.incident_date || '-'}</span></div>
                          <div><span className="font-semibold text-[#64748B] block text-xs mb-0.5">Email</span><span className="text-[#0F172A]">{c.complainant_email || '-'}</span></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
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
              <button onClick={() => setDescModal(null)} className="text-[#64748B] hover:text-[#0F172A] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[#334155] whitespace-pre-wrap leading-relaxed text-sm">{descModal}</p>
          </Card>
        </div>
      )}

      {showMediaModal && selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#60A5FA]">
              <h3 className="text-xl font-bold text-[#0F172A]">Evidence Upload</h3>
              <button
                onClick={closeMediaModal}
                className="text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {Array.isArray(selectedMedia) ? (
                <div className="space-y-4">
                  {selectedMedia.map((media, idx) => (
                    <div
                      key={idx}
                      className="border border-[#60A5FA] rounded-lg p-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex-1">
                        {isImageUrl(media) ? (
                          <img
                            src={media}
                            alt={`Evidence ${idx + 1}`}
                            className="max-w-md h-auto rounded cursor-pointer hover:opacity-90"
                            onClick={() => window.open(media, '_blank')}
                          />
                        ) : isVideoUrl(media) ? (
                          <video
                            src={media}
                            controls
                            className="max-w-md h-auto rounded"
                          />
                        ) : (
                          <div className="bg-[#F1F5F9] p-4 rounded text-[#475569] break-all">
                            <a href={media} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">
                              {media.split('/').pop() || 'Media File'}
                            </a>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownloadMedia(media)}
                        className="ml-4 p-2 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors flex-shrink-0"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : typeof selectedMedia === 'string' ? (
                <div className="space-y-4">
                  {isImageUrl(selectedMedia) ? (
                    <div>
                      <img
                        src={selectedMedia}
                        alt="Evidence"
                        className="max-w-full h-auto rounded cursor-pointer hover:opacity-90"
                        onClick={() => window.open(selectedMedia, '_blank')}
                      />
                    </div>
                  ) : isVideoUrl(selectedMedia) ? (
                    <video
                      src={selectedMedia}
                      controls
                      className="max-w-full h-auto rounded"
                    />
                  ) : (
                    <div className="bg-[#F1F5F9] p-4 rounded text-[#475569] break-all">
                      <a href={selectedMedia} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">
                        {selectedMedia}
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => handleDownloadMedia(selectedMedia)}
                    className="w-full py-2 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>
              ) : (
                <div className="text-[#475569]">
                  {Object.entries(selectedMedia).map(([key, value]) => (
                    <div key={key} className="mb-4">
                      <p className="font-medium text-[#0F172A] capitalize">{key}</p>
                      {isImageUrl(value) ? (
                        <img
                          src={value}
                          alt={key}
                          className="max-w-md h-auto rounded cursor-pointer hover:opacity-90 mt-2"
                          onClick={() => window.open(value, '_blank')}
                        />
                      ) : isVideoUrl(value) ? (
                        <video
                          src={value}
                          controls
                          className="max-w-md h-auto rounded mt-2"
                        />
                      ) : (
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline text-sm mt-2 block">
                          {value}
                        </a>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => handleDownloadMedia(selectedMedia.toString())}
                    className="mt-4 px-4 py-2 bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminComplaintsPage;
