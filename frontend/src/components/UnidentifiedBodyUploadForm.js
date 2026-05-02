import React, { useState } from 'react';
import { unidentifiedBodiesAPI } from '@/lib/api';
import { Card } from '@/components/ui/card';

const initialState = {
  reported_date: '',
  description: '',
  files: [],
};

const UnidentifiedBodyUploadForm = ({ onSuccess }) => {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'files') {
      setForm((prev) => ({ ...prev, files: files }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('reported_date', form.reported_date);
      formData.append('description', form.description);
      for (let i = 0; i < form.files.length; i++) {
        formData.append('files', form.files[i]);
      }
      await unidentifiedBodiesAPI.create(formData);
      setSuccess('Upload successful!');
      setForm(initialState);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 border border-[#60A5FA] mb-6">
      <h2 className="text-lg font-bold mb-3 text-[#0F172A]">Upload Unidentified Dead Body</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">Reported Date</label>
          <input
            type="date"
            name="reported_date"
            value={form.reported_date}
            onChange={handleChange}
            required
            className="h-9 rounded-md border border-[#60A5FA] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={3}
            className="w-full rounded-md border border-[#60A5FA] bg-white px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">Media Files (Images/Videos)</label>
          <input
            type="file"
            name="files"
            accept="image/*,video/*"
            multiple
            onChange={handleChange}
            required
            className="block w-full text-sm text-[#0F172A]"
          />
        </div>
        {error && <div className="text-red-500 text-sm font-semibold">{error}</div>}
        {success && <div className="text-green-600 text-sm font-semibold">{success}</div>}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </Card>
  );
};

export default UnidentifiedBodyUploadForm;
