
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminPageHero } from '@/components/AdminPageHero';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Image, Newspaper, Pencil } from 'lucide-react';
import api, { latestNewsAPI } from '@/lib/api';
import { toast } from 'sonner';

const isVideoUrl = (url) => /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url || '');

const formatGalleryDateTime = (item) => {
  if (item?.created_at) {
    const parsed = new Date(item.created_at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString();
    }
  }

  const heading = String(item?.heading || '');
  if (heading.startsWith('Gallery Upload - ')) {
    return heading.replace('Gallery Upload - ', '').trim();
  }

  return '--';
};

const AdminGalleryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = new URLSearchParams(location.search).get('tab') === 'news' ? 'news' : 'gallery';
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Latest News State ──────────────────────────────────────
  const emptyNewsForm = { heading: '', image: '', newsTitle: '', newsSummary: '', date: '', source: '' };
  const [newsForm, setNewsForm] = useState(emptyNewsForm);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [newsMediaPreview, setNewsMediaPreview] = useState(null);
  const [newsMediaType, setNewsMediaType] = useState('image');
  const [newsMediaUploading, setNewsMediaUploading] = useState(false);
  const [newsItems, setNewsItems] = useState([]);
  const [newsMediaFile, setNewsMediaFile] = useState(null);

  // ── Edit News State ────────────────────────────────────────
  const [editItem, setEditItem] = useState(null); // item being edited
  const [editForm, setEditForm] = useState({});
  const [editMediaPreview, setEditMediaPreview] = useState(null);
  const [editMediaType, setEditMediaType] = useState('image');
  const [editMediaFile, setEditMediaFile] = useState(null);
  const [editMediaUploading, setEditMediaUploading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const handleEditOpen = (item) => {
    setEditItem(item);
    setEditForm({ ...item });
    setEditMediaPreview(item.image || null);
    setEditMediaType(item.image && /\.(mp4|webm|ogg|mov)$/i.test(item.image) ? 'video' : 'image');
    setEditMediaFile(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setEditMediaType(isVideo ? 'video' : 'image');
    setEditMediaPreview(URL.createObjectURL(file));
    setEditMediaFile(file);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      let submitForm = { ...editForm };
      if (editMediaFile) {
        setEditMediaUploading(true);
        const formData = new FormData();
        formData.append('file', editMediaFile);
        const uploadRes = await api.post('/admin/news/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        submitForm = { ...submitForm, image: uploadRes.data.file_url };
        setEditMediaUploading(false);
      }
      const res = await api.put(`/admin/news-items/${encodeURIComponent(editItem.id)}`, submitForm);
      setNewsItems((prev) => prev.map((n) => n.id === editItem.id ? res.data : n));
      setEditItem(null);
      toast.success('News item updated!');
    } catch {
      toast.error('Failed to update news item');
      setEditMediaUploading(false);
    } finally {
      setEditLoading(false);
    }
  };

  React.useEffect(() => {
    const fetchNewsItems = async () => {
      try {
        const res = await api.get('/news-items');
        setNewsItems(Array.isArray(res.data) ? res.data : []);
      } catch {
        setNewsItems([]);
      }
    };
    fetchNewsItems();
  }, []);

  const handleNewsChange = (e) => {
    const { name, value } = e.target;
    setNewsForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewsMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setNewsMediaType(isVideo ? 'video' : 'image');
    setNewsMediaPreview(URL.createObjectURL(file));
    setNewsMediaFile(file);
  };

  const handleNewsSubmit = async (e) => {
    e.preventDefault();
    setNewsLoading(true);
    setNewsError('');
    try {
      let submitForm = { ...newsForm };
      if (newsMediaFile) {
        setNewsMediaUploading(true);
        const formData = new FormData();
        formData.append('file', newsMediaFile);
        const uploadRes = await api.post('/admin/news/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        submitForm = { ...submitForm, image: uploadRes.data.file_url };
        setNewsMediaUploading(false);
      }
      const res = await api.post('/admin/news-items', submitForm);
      setNewsItems((prev) => [res.data, ...prev]);
      setNewsForm(emptyNewsForm);
      setNewsMediaPreview(null);
      setNewsMediaFile(null);
      toast.success('News added!');
    } catch {
      setNewsError('Failed to add news');
      toast.error('Failed to add news');
      setNewsMediaUploading(false);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleNewsRemove = async (itemId) => {
    try {
      await api.delete(`/admin/news-items/${encodeURIComponent(itemId)}`);
      setNewsItems((prev) => prev.filter((n) => n.id !== itemId));
      toast.success('News item removed');
    } catch {
      toast.error('Failed to remove news item');
    }
  };

  // ── Gallery State ──────────────────────────────────────────
  const [gallery, setGallery] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [newsPreviewOpen, setNewsPreviewOpen] = useState(false);
  const [newsPreviewItem, setNewsPreviewItem] = useState(null);

  React.useEffect(() => {
    const loadGalleryItems = async () => {
      try {
        const res = await api.get('/gallery-items');
        setGallery(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Failed to load gallery items');
      }
    };
    loadGalleryItems();
  }, []);

  const handleImageChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newFiles.map((file) => URL.createObjectURL(file))]);
    // reset input so same file can be re-added if needed
    e.target.value = '';
  };

  const handleRemovePreview = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setPreviews([]);
  };

  const handleDone = async () => {
    if (!selectedFiles.length) {
      toast.error('Please upload at least one media file');
      return;
    }
    const uploadedImages = [];
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await api.post('/admin/gallery/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedImages.push({
          url: uploadRes.data?.file_url,
          name: file.name,
          storedFileName: uploadRes.data?.file_name,
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Images upload failed');
      return;
    }
    const timestamp = new Date().toLocaleString();
    const newItem = {
      heading: `Gallery Upload - ${timestamp}`,
      images: uploadedImages,
      content: '',
      id: `${Date.now()}`,
    };
    try {
      const created = await api.post('/admin/gallery-items', newItem);
      setGallery((prev) => [created.data, ...prev]);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save gallery item');
      return;
    }
    handleClear();
    toast.success('Gallery item saved');
  };

  const handleRemove = async (itemId) => {
    try {
      await api.delete(`/admin/gallery-items/${encodeURIComponent(itemId)}`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to remove gallery item');
      return;
    }
    setGallery((prev) => prev.filter((item) => item.id !== itemId));
    toast.success('Gallery item removed');
  };

  const handleView = (item) => {
    setPreviewItem(item);
    setPreviewImages(Array.isArray(item.images) ? [...item.images] : []);
    setPreviewOpen(true);
  };

  const handleRemovePreviewImage = (idx) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveGalleryItemImages = async () => {
    if (!previewItem) return;
    setPreviewSaving(true);
    try {
      const res = await api.put(`/admin/gallery-items/${encodeURIComponent(previewItem.id)}`, { images: previewImages });
      const updated = res.data;
      setGallery((prev) => previewImages.length === 0
        ? prev.filter((item) => item.id !== previewItem.id)
        : prev.map((item) => item.id === previewItem.id ? { ...item, images: previewImages } : item)
      );
      toast.success('Changes saved');
      setPreviewOpen(false);
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setPreviewSaving(false);
    }
  };

  const handleMergeAll = async () => {
    const allImages = gallery.flatMap((item) => Array.isArray(item.images) ? item.images : []);
    if (allImages.length === 0) return;
    const mergedItem = {
      heading: `Gallery Upload - ${new Date().toLocaleString()}`,
      images: allImages,
      content: '',
    };
    try {
      const created = await api.post('/admin/gallery-items', mergedItem);
      setGallery([created.data]);
      toast.success(`Merged ${gallery.length} rows → 1 row (${allImages.length} images)`);
    } catch {
      toast.error('Failed to merge gallery items');
    }
  };

  const handleNewsView = (item) => {
    setNewsPreviewItem(item);
    setNewsPreviewOpen(true);
  };

  return (
    <div className="min-h-screen pt-4 pb-12 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdminPageHero
          title="Gallery"
          description="Manage gallery images and update the latest news shown on the home page."
        />
        <div className="mb-4">
          <button onClick={() => navigate('/admin-dashboard')} className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:underline font-medium">
            ← Back to Dashboard
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex justify-center gap-3 mb-8">
          <Button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all ${
              activeTab === 'gallery'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'bg-white text-[#2563EB] border border-[#2563EB] hover:bg-[#EFF6FF]'
            }`}
          >
            <Image className="w-4 h-4" />
            Gallery
          </Button>
          <Button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all ${
              activeTab === 'news'
                ? 'bg-[#D97706] text-white shadow-md'
                : 'bg-white text-[#D97706] border border-[#D97706] hover:bg-[#FFFBEB]'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Latest News
          </Button>
        </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Gallery Items', value: gallery.length, icon: Image, color: 'bg-[#2563EB]', text: 'text-[#2563EB]' },
            { label: 'News Items', value: newsItems.length, icon: Newspaper, color: 'bg-[#D97706]', text: 'text-[#D97706]' },
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

        {/* ── Gallery Tab ── */}
        {activeTab === 'gallery' && (
          <>
            <Card className="p-8 mb-8 border border-[#60A5FA] shadow-sm bg-white">
              <h2 className="text-2xl font-bold mb-6">Upload Gallery Media</h2>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <input
                    id="gallery-media-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="gallery-media-upload"
                    className="inline-flex w-40 items-center justify-center rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-sm cursor-pointer hover:bg-[#1D4ED8]"
                  >
                    + Add Images
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-36 border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626] hover:text-white"
                    onClick={handleClear}
                    disabled={!selectedFiles.length}
                  >
                    Clear All
                  </Button>
                  <Button
                    type="button"
                    className="w-36 bg-[#16A34A] hover:bg-[#15803D] text-white border border-[#16A34A]"
                    onClick={handleDone}
                    disabled={!selectedFiles.length}
                  >
                    Done
                  </Button>
                  {selectedFiles.length > 0 && (
                    <span className="text-sm font-semibold text-[#2563EB]">{selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected → 1 row</span>
                  )}
                </div>
                {previews.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {previews.map((preview, i) => (
                      <div key={i} className="relative group">
                        <img src={preview} alt={`preview-${i}`} className="w-full h-24 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => handleRemovePreview(i)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold opacity-80 hover:opacity-100"
                          title="Remove"
                        >✕</button>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{selectedFiles[i]?.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-8 border border-[#60A5FA] shadow-sm bg-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Gallery Items</h2>
              </div>
              {gallery.length === 0 ? (
                <p className="text-gray-400">No gallery items yet.</p>
              ) : (
                <div className="overflow-x-auto">
                <Table className="w-full border border-[#CBD5E1]">
                  <TableHeader>
                    <TableRow className="border-b border-[#CBD5E1] bg-[#F8FAFC]">
                      <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">S.No</TableHead>
                      <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">Date & Time</TableHead>
                      <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">Media</TableHead>
                      <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gallery.map((item, idx) => (
                      <TableRow key={item.id} className="border-b border-[#CBD5E1]">
                        <TableCell className="border border-[#CBD5E1] text-center">{idx + 1}</TableCell>
                        <TableCell className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">{formatGalleryDateTime(item)}</TableCell>
                        <TableCell className="border border-[#CBD5E1] text-center">
                          <Button type="button" size="sm" variant="outline" className="inline-flex items-center gap-2" onClick={() => handleView(item)}>
                            <Eye className="w-4 h-4" />
                            View ({Array.isArray(item.images) ? item.images.length : 0})
                          </Button>
                        </TableCell>
                        <TableCell className="border border-[#CBD5E1] text-center">
                          <Button variant="destructive" size="sm" onClick={() => handleRemove(item.id)}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── Latest News Tab ── */}
        {activeTab === 'news' && (
          <>
          <Card className="p-8 border border-[#60A5FA] shadow-sm bg-white">
            <h2 className="text-2xl font-bold mb-6">Update Latest News</h2>
            <form onSubmit={handleNewsSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block font-semibold mb-1">Heading</label>
                <div className="flex items-center gap-2">
                  <input name="heading" value={newsForm.heading} onChange={handleNewsChange} className="flex-1 border rounded px-3 py-2" required />
                  <button type="button" onClick={() => setNewsForm(f => ({ ...f, heading: '' }))} className="text-gray-400 hover:text-red-500 text-lg font-bold px-1">&#x2715;</button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1">Media (Image / Video)</label>
                <div className="flex items-center gap-3">
                  <input
                    id="news-media-upload"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleNewsMediaUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="news-media-upload"
                    className={`inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded font-semibold text-sm text-white ${
                      newsMediaUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#D97706] hover:bg-[#B45309]'
                    }`}
                  >
                    {newsMediaUploading ? 'Uploading...' : 'Upload Image / Video'}
                  </label>
                  {newsForm.image && !newsMediaUploading && (
                    <span className="text-xs text-green-600 font-semibold">&#10003; Media set</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNewsMediaPreview(null);
                      setNewsMediaType('image');
                      setNewsForm(f => ({ ...f, image: '' }));
                      const inp = document.getElementById('news-media-upload');
                      if (inp) inp.value = '';
                    }}
                    style={{
                      backgroundColor: newsMediaPreview ? '#ef4444' : '#d1d5db',
                      cursor: newsMediaPreview ? 'pointer' : 'default',
                      opacity: newsMediaPreview ? 1 : 0.6,
                    }}
                    className="px-3 py-2 rounded font-semibold text-sm text-white transition-opacity"
                  >
                    Clear
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#D97706]">&#9432; Best results: Upload image/video in <strong>landscape (16:9)</strong> orientation for proper display in the news card.</p>
                {newsMediaPreview && (
                  <div className="mt-3">
                    {newsMediaType === 'video' ? (
                      <video src={newsMediaPreview} controls className="w-full max-h-48 rounded border" />
                    ) : (
                      <img src={newsMediaPreview} alt="preview" className="w-full max-h-48 object-cover rounded border" />
                    )}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1">News Title</label>
                <div className="flex items-center gap-2">
                  <input name="newsTitle" value={newsForm.newsTitle} onChange={handleNewsChange} className="flex-1 border rounded px-3 py-2" required />
                  <button type="button" onClick={() => setNewsForm(f => ({ ...f, newsTitle: '' }))} className="text-gray-400 hover:text-red-500 text-lg font-bold px-1">&#x2715;</button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1">News Summary</label>
                <div className="flex items-start gap-2">
                  <textarea name="newsSummary" value={newsForm.newsSummary} onChange={handleNewsChange} className="flex-1 border rounded px-3 py-2 min-h-[80px]" required />
                  <button type="button" onClick={() => setNewsForm(f => ({ ...f, newsSummary: '' }))} className="text-gray-400 hover:text-red-500 text-lg font-bold px-1 mt-1">&#x2715;</button>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Date</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    name="date"
                    value={newsForm.date}
                    onChange={handleNewsChange}
                    className="flex-1 border rounded px-3 py-2"
                    required
                  />
                  <button type="button" onClick={() => setNewsForm(f => ({ ...f, date: '' }))} className="text-gray-400 hover:text-red-500 text-lg font-bold px-1">&#x2715;</button>
                </div>
              </div>
              <div className="md:col-span-2 flex gap-4 mt-2">
                <Button type="submit" className="bg-[#D97706] hover:bg-[#B45309] text-white px-8 py-2" disabled={newsLoading}>
                  {newsLoading ? 'Adding...' : 'Add News'}
                </Button>
                <Button
                  type="button"
                  className="bg-red-500 hover:bg-red-600 text-white px-8 py-2"
                  onClick={() => {
                    setNewsForm(emptyNewsForm);
                    setNewsMediaPreview(null);
                    setNewsMediaType(null);
                    const inp = document.getElementById('news-media-upload');
                    if (inp) inp.value = '';
                  }}
                >
                  Reset
                </Button>
                {newsError && <span className="text-red-600 font-semibold self-center">{newsError}</span>}
              </div>
            </form>
          </Card>

          {/* News Items Table */}
          <Card className="p-8 mt-8 border border-[#60A5FA] shadow-sm bg-white">
            <h2 className="text-xl font-bold mb-4">News Items</h2>
            {newsItems.length === 0 ? (
              <p className="text-gray-400">No news items yet.</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="w-full border border-[#CBD5E1]">
                <TableHeader>
                  <TableRow className="border-b border-[#CBD5E1] bg-[#F8FAFC]">
                    <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">S.No</TableHead>
                    <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">Date</TableHead>
                    <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">News Title</TableHead>
                    <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">View</TableHead>
                    <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">Edit</TableHead>
                    <TableHead className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newsItems.map((item, idx) => (
                    <TableRow key={item.id} className="border-b border-[#CBD5E1]">
                      <TableCell className="border border-[#CBD5E1] text-center">{idx + 1}</TableCell>
                      <TableCell className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">{item.date || '—'}</TableCell>
                      <TableCell className="border border-[#CBD5E1] text-center font-semibold text-[#0F172A]">{item.newsTitle || '—'}</TableCell>
                      <TableCell className="border border-[#CBD5E1] text-center">
                        <Button type="button" size="sm" variant="outline" className="inline-flex items-center gap-2" onClick={() => handleNewsView(item)}>
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell className="border border-[#CBD5E1] text-center">
                        <Button type="button" size="sm" variant="outline" className="inline-flex items-center gap-2 border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF]" onClick={() => handleEditOpen(item)}>
                          <Pencil className="w-4 h-4" />
                          Edit
                        </Button>
                      </TableCell>
                      <TableCell className="border border-[#CBD5E1] text-center">
                        <Button variant="destructive" size="sm" onClick={() => handleNewsRemove(item.id)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </Card>
          </>
        )}

        {/* Edit News Dialog */}
        <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit News Item</DialogTitle>
            </DialogHeader>
            {editItem && (
              <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block font-semibold mb-1 text-sm">Heading</label>
                  <input name="heading" value={editForm.heading || ''} onChange={handleEditChange} className="w-full border rounded px-3 py-2 text-sm" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1 text-sm">Media (Image / Video)</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <input id="edit-media-upload" type="file" accept="image/*,video/*" onChange={handleEditMediaUpload} className="hidden" />
                    <label htmlFor="edit-media-upload" className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded font-semibold text-sm text-white bg-[#D97706] hover:bg-[#B45309]">
                      {editMediaUploading ? 'Uploading...' : 'Change Media'}
                    </label>
                    {editForm.image && <span className="text-xs text-green-600 font-semibold">✓ Media set</span>}
                    <button type="button" onClick={() => { setEditMediaPreview(null); setEditForm(f => ({ ...f, image: '' })); const inp = document.getElementById('edit-media-upload'); if (inp) inp.value = ''; }} className="px-3 py-2 rounded text-sm font-semibold text-white bg-gray-400 hover:bg-red-500 transition">Clear</button>
                  </div>
                  <p className="mt-2 text-xs text-[#D97706]">&#9432; Best results: Upload image/video in <strong>landscape (16:9)</strong> orientation for proper display in the news card.</p>
                  {editMediaPreview && (
                    <div className="mt-3">
                      {editMediaType === 'video'
                        ? <video src={editMediaPreview} controls className="w-full max-h-40 rounded border" />
                        : <img src={editMediaPreview} alt="preview" className="w-full max-h-40 object-cover rounded border" />}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1 text-sm">News Title</label>
                  <input name="newsTitle" value={editForm.newsTitle || ''} onChange={handleEditChange} className="w-full border rounded px-3 py-2 text-sm" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1 text-sm">News Summary</label>
                  <textarea name="newsSummary" value={editForm.newsSummary || ''} onChange={handleEditChange} className="w-full border rounded px-3 py-2 text-sm min-h-[80px]" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-sm">Date</label>
                  <input type="date" name="date" value={editForm.date || ''} onChange={handleEditChange} className="w-full border rounded px-3 py-2 text-sm" required />
                </div>
                <div className="md:col-span-2 flex gap-3 mt-2">
                  <Button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-8" disabled={editLoading || editMediaUploading}>
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* News Preview Dialog */}
        <Dialog open={newsPreviewOpen} onOpenChange={setNewsPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{newsPreviewItem?.heading || 'News Preview'}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[50vh] overflow-y-auto pr-1">
              {newsPreviewItem?.image ? (
                isVideoUrl(newsPreviewItem.image) ? (
                  <video src={newsPreviewItem.image} controls className="w-full max-h-40 rounded border mb-3" />
                ) : (
                  <img src={newsPreviewItem.image} alt={newsPreviewItem.newsTitle} className="w-full max-h-40 object-cover rounded border mb-3" />
                )
              ) : null}
              {newsPreviewItem?.newsTitle && <h3 className="font-bold text-lg mb-2">{newsPreviewItem.newsTitle}</h3>}
              {newsPreviewItem?.newsSummary && <p className="text-gray-700 text-sm mb-3">{newsPreviewItem.newsSummary}</p>}
              {newsPreviewItem?.date && <p className="text-xs text-gray-500">{newsPreviewItem.date}</p>}
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) setPreviewOpen(false); }}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewItem?.heading || 'Gallery Images'} ({previewImages.length} images)</DialogTitle>
            </DialogHeader>
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              {previewImages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {previewImages.map((image, i) => (
                    <div key={`${previewItem?.id || 'preview'}-${i}`} className="relative group">
                      <img
                        src={image?.url}
                        alt={image?.name || `gallery-${i}`}
                        className="w-full h-64 object-cover rounded border border-[#60A5FA]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePreviewImage(i)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg opacity-80 hover:opacity-100 transition-opacity"
                        title="Remove this image"
                      >✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">All images removed. Click Save Changes to confirm.</p>
              )}
            </div>
            <div className="flex items-center gap-3 pt-3 border-t">
              <Button
                type="button"
                className="bg-[#16A34A] hover:bg-[#15803D] text-white px-6"
                onClick={handleSaveGalleryItemImages}
                disabled={previewSaving}
              >
                {previewSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewOpen(false)}
              >
                Cancel
              </Button>
              {previewImages.length === 0 && (
                <span className="text-xs text-red-500 font-semibold">Saving will remove this row entirely</span>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminGalleryPage;
