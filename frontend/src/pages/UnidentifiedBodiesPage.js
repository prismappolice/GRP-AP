import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { unidentifiedBodiesAPI } from '@/lib/api';
import { stations } from '@/data/stations';
import { RefreshCw, Image as ImageIcon, Eye, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

function getStationPhone(stationName) {
  for (const div of stations) {
    for (const sub of div.subdivisions || []) {
      for (const circle of sub.circles || []) {
        for (const st of circle.stations || []) {
          if (st.name === stationName) return st.phone || '-';
        }
      }
    }
  }
  return '-';
}

const isVideo = (url) => /\.(mp4|webm|ogg|mov|avi)$/i.test(url || '');

// Group records sharing same station + reported_date + description into one row
function groupRecords(records) {
  const map = new Map();
  for (const r of records) {
    const key = `${r.station}||${r.reported_date}||${r.description}`;
    const incomingUrls = Array.isArray(r.media_urls) && r.media_urls.length
      ? r.media_urls
      : (r.image_url ? [r.image_url] : []);
    if (!map.has(key)) map.set(key, { ...r, mediaUrls: [] });
    const grouped = map.get(key);
    incomingUrls.forEach((url) => {
      if (url && !grouped.mediaUrls.includes(url)) grouped.mediaUrls.push(url);
    });
  }
  return Array.from(map.values());
}

const UnidentifiedBodiesPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewGroup, setViewGroup] = useState(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [descModal, setDescModal] = useState(null);

  const grouped = useMemo(() => groupRecords(records), [records]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await unidentifiedBodiesAPI.getAll();
      setRecords(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Failed to load records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const openView = (group) => { setViewGroup(group); setMediaIndex(0); };
  const closeView = () => { setViewGroup(null); setMediaIndex(0); };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-4 pb-16 px-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page heading */}
        <div className="bg-white border border-[#BFDBFE] rounded-2xl shadow-sm px-8 py-6 flex flex-col items-center text-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
            <AlertTriangle className="w-6 h-6 text-[#DC2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] heading-font leading-tight">Unidentified Deadbodies</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Records reported by AP Government Railway Police stations.
              {!loading && grouped.length > 0 && (
                <span className="ml-2 inline-flex items-center bg-[#EFF6FF] text-[#1D4ED8] text-xs font-bold px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                  {grouped.length} case{grouped.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fetchRecords} disabled={loading}
            className="border-[#CBD5E1] text-[#475569]">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 text-center">{error}</div>
        )}

        {/* Table */}
        <Card className="border border-[#BFDBFE] shadow-sm rounded-xl">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#EFF6FF] hover:bg-[#EFF6FF] border-b-2 border-[#BFDBFE]">
                {['S.No', 'Reported Date', 'Description', 'Station', 'Contact No', 'Images/Videos'].map((h) => (
                  <TableHead key={h} className="px-4 py-3 font-bold text-[#1E3A5F] border-r border-[#DBEAFE] last:border-r-0 whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center text-[#64748B]">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB]" />
                      <span className="text-sm">Loading records...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : grouped.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-sm">No unidentified deadbody records found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                grouped.map((group, index) => (
                  <TableRow key={`${group.station}-${group.reported_date}-${index}`}
                    className="border-b border-[#DBEAFE] hover:bg-[#F8FAFC] transition-colors">
                    <TableCell className="px-4 py-3 font-bold text-[#0F172A] border-r border-[#DBEAFE] w-12 text-center">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#334155] border-r border-[#DBEAFE] whitespace-nowrap">
                      {group.reported_date || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#334155] border-r border-[#DBEAFE] max-w-xs">
                      <div
                        className="line-clamp-2 break-words cursor-pointer text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-medium"
                        title="Click to view full description"
                        onClick={() => setDescModal(group.description)}
                      >{group.description || '-'}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#334155] border-r border-[#DBEAFE] whitespace-nowrap">
                      {group.station || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm border-r border-[#DBEAFE] whitespace-nowrap">
                      <a href={`tel:${getStationPhone(group.station)}`} className="text-[#2563EB] hover:underline font-medium">
                        {getStationPhone(group.station)}
                      </a>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Button type="button" size="sm"
                        className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] flex items-center gap-1.5"
                        onClick={() => openView(group)}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      </div>

      {/* Description Dialog */}
      <Dialog open={!!descModal} onOpenChange={(open) => { if (!open) setDescModal(null); }}>
        <DialogContent className="max-w-lg mt-16">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-[#0F172A]">Full Description</DialogTitle>
          </DialogHeader>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 text-sm text-[#334155] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {descModal}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Media Dialog */}
      <Dialog open={!!viewGroup} onOpenChange={(open) => { if (!open) closeView(); }}>
        <DialogContent className="max-w-2xl pb-4 !top-[58%]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-[#0F172A]">
              {viewGroup?.station}
              {viewGroup?.mediaUrls?.length > 1 && (
                <span className="ml-2 text-sm font-normal text-[#64748B]">
                  — {mediaIndex + 1} / {viewGroup.mediaUrls.length}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Media viewer */}
            <div className="relative rounded-xl overflow-hidden bg-[#F1F5F9] flex items-center justify-center" style={{height: '240px', width: '100%'}}>
              {viewGroup?.mediaUrls?.length > 0 ? (
                isVideo(viewGroup.mediaUrls[mediaIndex]) ? (
                  <video key={viewGroup.mediaUrls[mediaIndex]} src={viewGroup.mediaUrls[mediaIndex]}
                    controls className="w-full h-full object-contain" />
                ) : (
                  <img key={viewGroup.mediaUrls[mediaIndex]} src={viewGroup.mediaUrls[mediaIndex]}
                    alt={`media-${mediaIndex + 1}`}
                    className="w-full h-full object-contain" />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#94A3B8] py-10">
                  <ImageIcon className="h-10 w-10" />
                  <span className="text-sm">No media available</span>
                </div>
              )}

              {/* Prev / Next nav */}
              {viewGroup?.mediaUrls?.length > 1 && (
                <>
                  <button onClick={() => setMediaIndex((i) => (i - 1 + viewGroup.mediaUrls.length) % viewGroup.mediaUrls.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setMediaIndex((i) => (i + 1) % viewGroup.mediaUrls.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip for multiple media */}
            {viewGroup?.mediaUrls?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {viewGroup.mediaUrls.map((url, i) => (
                  <button key={i} onClick={() => setMediaIndex(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === mediaIndex ? 'border-[#2563EB]' : 'border-[#E2E8F0] hover:border-[#93C5FD]'
                    }`}>
                    {isVideo(url) ? (
                      <div className="w-full h-full bg-[#E2E8F0] flex items-center justify-center">
                        <span className="text-xs font-bold text-[#64748B]">▶</span>
                      </div>
                    ) : (
                      <img src={url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnidentifiedBodiesPage;
