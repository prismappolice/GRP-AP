import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { unidentifiedBodiesAPI, normalizeMediaUrl } from '@/lib/api';
import { stations } from '@/data/stations';
import { RefreshCw, Image as ImageIcon, Eye, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filtered records

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch = !searchText ||
        [r.description, r.station].join(' ').toLowerCase().includes(searchText.toLowerCase());
      const matchFrom = !dateFrom || r.reported_date >= dateFrom;
      const matchTo = !dateTo || r.reported_date <= dateTo;
      return matchSearch && matchFrom && matchTo;
    });
  }, [records, searchText, dateFrom, dateTo]);

  const grouped = useMemo(() => groupRecords(filtered), [filtered]);

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

        {/* Redesigned Page heading */}
        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl shadow-xl px-8 py-7 flex flex-col items-center text-center gap-2 mb-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 border border-red-200 shadow mb-2">
            <AlertTriangle className="w-9 h-9 text-red-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Unidentified Deadbodies</h1>
          <p className="text-base text-gray-500 mb-2 font-medium flex flex-wrap items-center justify-center gap-2">
            Records reported by AP Government Railway Police stations.
            {!loading && grouped.length > 0 && (
              <span className="inline-flex items-center bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-300 ml-1">
                {grouped.length} case{grouped.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={fetchRecords} disabled={loading}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-semibold px-5 py-2 mt-2">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>


        {/* Table */}
        <Card className="border border-[#60A5FA] shadow-sm rounded-xl">
          <div className="overflow-x-auto">
                    {/* Filter/Search Bar with Date and Refresh */}
        <div className="flex flex-col sm:flex-row items-center gap-2 mb-4 pt-2 pl-4 pr-2">
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Search by description or station..."
            className="w-full sm:w-64 px-3 py-2 border border-blue-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-2 border border-blue-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="From"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-2 py-2 border border-blue-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="To"
            title="To date"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchRecords}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm font-semibold px-4 py-2"
            title="Refresh"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {(searchText || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setSearchText(''); setDateFrom(''); setDateTo(''); }}
              className="ml-2 text-blue-600 hover:underline text-xs"
            >Clear</button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 text-center">{error}</div>
        )}
          <Table>
            <TableHeader>
              <TableRow className="bg-[#EFF6FF] hover:bg-[#EFF6FF] border-b-2 border-[#60A5FA]">
                {['S.No', 'Reported Date', 'Description', 'Station', 'Contact No', 'Images/Videos'].map((h, idx, arr) => (
                  <TableHead
                    key={h}
                    className={
                      'px-4 py-3 font-bold text-[#1E3A5F] border-r border-[#DBEAFE] last:border-r-0 whitespace-nowrap' +
                      (h === 'Images/Videos' ? ' text-center' : '')
                    }
                    style={h === 'Images/Videos' ? { textAlign: 'center' } : {}}
                  >
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
                    <TableCell className="px-4 py-3 font-bold text-[#0F172A] border-r border-[#DBEAFE] w-12 text-center align-center">
                      {index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#334155] border-r border-[#DBEAFE] whitespace-nowrap align-center">
                      {group.reported_date || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#334155] border-r border-[#DBEAFE] max-w-xs align-top">
                      <div
                        className="line-clamp-2 break-words cursor-pointer text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-medium"
                        title="Click to view full description"
                        onClick={() => setDescModal(group.description)}
                      >{group.description || '-'}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#334155] border-r border-[#DBEAFE] whitespace-nowrap align-center">
                      {group.station || '-'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm border-r border-[#DBEAFE] whitespace-nowrap align-center">
                      <a href={`tel:${getStationPhone(group.station)}`} className="text-[#2563EB] hover:underline font-medium">
                        {getStationPhone(group.station)}
                      </a>
                    </TableCell>
                    <TableCell className="px-4 py-3 flex items-center justify-center text-center align-middle">
                      {group.mediaUrls && group.mediaUrls.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => { openView(group); setMediaIndex(0); }}
                          className="w-24 h-24 rounded-lg overflow-hidden border border-[#60A5FA] hover:border-[#2563EB] transition-all hover:scale-110"
                          title={`View all ${group.mediaUrls.length} media item${group.mediaUrls.length !== 1 ? 's' : ''}`}
                        >
                          {isVideo(group.mediaUrls[0]) ? (
                            <div className="w-full h-full bg-[#E2E8F0] flex items-center justify-center">
                              <span className="text-xl font-bold text-[#64748B]">▶</span>
                            </div>
                          ) : (
                            <img src={normalizeMediaUrl(group.mediaUrls[0])} alt="thumb-0" className="w-full h-full object-cover" />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">No media</span>
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

      {/* Description Dialog */}
      <Dialog open={!!descModal} onOpenChange={(open) => { if (!open) setDescModal(null); }}>
        <DialogContent className="max-w-lg mt-16">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-[#0F172A]">Full Description</DialogTitle>
          </DialogHeader>
          <div className="bg-[#F8FAFC] border border-[#60A5FA] rounded-lg p-4 text-sm text-[#334155] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {descModal}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Media Dialog */}
      <Dialog open={!!viewGroup} onOpenChange={(open) => { if (!open) closeView(); }}>
        <DialogContent className="max-w-3xl pb-4 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-[#93C5FD] shadow-2xl fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1300]">
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
            <div className="relative rounded-xl overflow-hidden bg-[#F1F5F9] flex items-center justify-center" style={{width: '100%', maxHeight: '55vh'}}>
              {viewGroup?.mediaUrls?.length > 0 ? (
                isVideo(viewGroup.mediaUrls[mediaIndex]) ? (
                  <video key={viewGroup.mediaUrls[mediaIndex]} src={normalizeMediaUrl(viewGroup.mediaUrls[mediaIndex])}
                    controls className="w-full h-full object-contain" />
                ) : (
                  <img key={viewGroup.mediaUrls[mediaIndex]} src={normalizeMediaUrl(viewGroup.mediaUrls[mediaIndex])}
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
                      i === mediaIndex ? 'border-[#2563EB]' : 'border-[#60A5FA] hover:border-[#60A5FA]'
                    }`}>
                    {isVideo(url) ? (
                      <div className="w-full h-full bg-[#E2E8F0] flex items-center justify-center">
                        <span className="text-xs font-bold text-[#64748B]">▶</span>
                      </div>
                    ) : (
                      <img src={normalizeMediaUrl(url)} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Download All Button at right bottom */}
            {viewGroup?.mediaUrls?.length > 0 && (
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
                  style={{ position: 'absolute', right: 32, bottom: 24, zIndex: 10 }}
                  onClick={async () => {
                    const zip = new JSZip();
                    for (let i = 0; i < viewGroup.mediaUrls.length; i++) {
                      const url = normalizeMediaUrl(viewGroup.mediaUrls[i]);
                      try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        const ext = url.split('.').pop().split('?')[0];
                        zip.file(`media_${i + 1}.${ext}`, blob);
                      } catch (e) {
                        // skip failed downloads
                      }
                    }
                    const stationName = (viewGroup.station || 'station').replace(/\s+/g, '_');
                    const content = await zip.generateAsync({ type: 'blob' });
                    saveAs(content, `unidentified_${stationName}.zip`);
                  }}
                >
                  Download All
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnidentifiedBodiesPage;
