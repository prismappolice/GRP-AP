import React, { useMemo, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, FileText, X } from 'lucide-react';
import { normalizeMediaUrl } from '@/lib/api';

const downloadFile = async (url, filename) => {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || url.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, '_blank');
  }
};

const isVideo = (url) => /\.(mp4|webm|ogg|mov|avi)$/i.test(url || '');
const isImage = (url) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url || '');
const isPdf = (url) => /\.pdf$/i.test(url || '');

const imageToBytes = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 600;
    canvas.getContext('2d').drawImage(img, 0, 0);
    canvas.toBlob(async (blob) => {
      try { resolve(await blob.arrayBuffer()); } catch (e) { reject(e); }
    }, 'image/png');
  };
  img.onerror = reject;
  img.src = src;
});

const downloadAllAsPdf = async (mediaUrls, trackingNumber) => {
  const mergedPdf = await PDFDocument.create();

  for (const url of mediaUrls) {
    const normalized = normalizeMediaUrl(url);
    try {
      if (isImage(url)) {
        const bytes = await imageToBytes(normalized);
        const img = await mergedPdf.embedPng(bytes);
        const { width, height } = img.scale(1);
        const page = mergedPdf.addPage([width, height]);
        page.drawImage(img, { x: 0, y: 0, width, height });
      } else if (isPdf(url)) {
        const resp = await fetch(normalized);
        const bytes = await resp.arrayBuffer();
        const srcDoc = await PDFDocument.load(bytes);
        const copied = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copied.forEach((p) => mergedPdf.addPage(p));
      }
      // videos and other types are skipped
    } catch {
      // skip problematic files silently
    }
  }

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${trackingNumber || 'documents'}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
};

const parseDocs = (docs) => {
  if (!docs) return [];
  if (Array.isArray(docs)) return docs.filter(Boolean).map(String);
  try {
    const parsed = JSON.parse(String(docs));
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch {
    // ignore parse failure and treat as single file path
  }
  return [String(docs)];
};

export const SupportingDocsModal = ({ title = 'Supporting Documents', docs, trackingNumber, onClose }) => {
  const mediaUrls = useMemo(() => parseDocs(docs), [docs]);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!mediaUrls.length) return null;

  const activeUrl = mediaUrls[mediaIndex];
  const normalizedActiveUrl = normalizeMediaUrl(activeUrl);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="bg-white rounded-xl max-w-3xl w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#0F172A]">
            {title}
            {mediaUrls.length > 1 && (
              <span className="ml-2 text-sm font-normal text-[#64748B]">{mediaIndex + 1} / {mediaUrls.length}</span>
            )}
          </h3>
          <button type="button" onClick={onClose} className="text-[#64748B] hover:text-[#0F172A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-[#F1F5F9] flex items-center justify-center min-h-[360px]">
            {isVideo(activeUrl) ? (
              <video key={activeUrl} src={normalizedActiveUrl} controls className="w-full max-h-[420px] object-contain" />
            ) : isImage(activeUrl) ? (
              <img key={activeUrl} src={normalizedActiveUrl} alt={`document-${mediaIndex + 1}`} className="w-full max-h-[420px] object-contain" />
            ) : isPdf(activeUrl) ? (
              <iframe key={activeUrl} src={normalizedActiveUrl} title={`document-${mediaIndex + 1}`} className="w-full h-[420px] border-0" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-[#475569] px-4 text-center">
                <FileText className="w-12 h-12 text-[#2563EB]" />
                <p className="text-sm break-all">{activeUrl.split('/').pop()}</p>
                <a href={normalizedActiveUrl} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline text-sm">
                  Open file in new tab
                </a>
              </div>
            )}

            {mediaUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setMediaIndex(i => (i - 1 + mediaUrls.length) % mediaUrls.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMediaIndex(i => (i + 1) % mediaUrls.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {mediaUrls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {mediaUrls.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setMediaIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === mediaIndex ? 'border-[#2563EB]' : 'border-[#BFDBFE] hover:border-[#60A5FA]'
                  }`}
                >
                  {isVideo(url) ? (
                    <div className="w-full h-full bg-[#E2E8F0] flex items-center justify-center text-xs font-bold text-[#64748B]">▶</div>
                  ) : isImage(url) ? (
                    <img src={normalizeMediaUrl(url)} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                  ) : isPdf(url) ? (
                    <div className="w-full h-full bg-[#FDE68A] flex items-center justify-center text-[10px] font-bold text-[#92400E]">PDF</div>
                  ) : (
                    <div className="w-full h-full bg-[#E2E8F0] flex items-center justify-center text-[10px] font-bold text-[#475569] px-1">DOC</div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {mediaUrls.length > 1 && (
              <Button
                type="button"
                variant="outline"
                disabled={pdfLoading}
                className="border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF]"
                onClick={async () => {
                  setPdfLoading(true);
                  try { await downloadAllAsPdf(mediaUrls, trackingNumber); } finally { setPdfLoading(false); }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                {pdfLoading ? 'Preparing PDF...' : 'Download All as PDF'}
              </Button>
            )}
            <Button
              type="button"
              className="bg-[#2563EB] hover:bg-[#1D4ED8]"
              onClick={() => {
                const ext = activeUrl.split('/').pop().split('.').pop();
                const idx = mediaUrls.length > 1 ? `_${mediaIndex + 1}` : '';
                const fname = trackingNumber ? `${trackingNumber}${idx}.${ext}` : activeUrl.split('/').pop();
                downloadFile(normalizedActiveUrl, fname);
              }}
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SupportingDocsModal;
