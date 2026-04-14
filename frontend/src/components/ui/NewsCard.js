import React from 'react';
import { Card } from './card';

const isVideoUrl = (url) => /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url || '');
const handleImageError = (event) => {
  event.currentTarget.onerror = null;
  const wrapper = event.currentTarget.closest('[data-news-media]');
  if (wrapper) {
    wrapper.style.display = 'none';
  } else {
    event.currentTarget.style.display = 'none';
  }
};

export default function NewsCard({
  heading = 'DAILY NEWS UPDATE',
  image,
  newsTitle,
  newsSummary,
  date = '',
  source = '',
}) {
  return (
    <Card className="max-w-xl mx-auto p-0 rounded-xl shadow-lg border bg-white">
      <div className="bg-[#183153] rounded-t-xl px-6 py-2 flex items-center justify-center">
        <span className="text-white font-bold tracking-widest text-lg">{heading}</span>
      </div>
      {image && (
        <div data-news-media className="w-full h-36 bg-gray-100 flex items-center justify-center border-b">
          {isVideoUrl(image) ? (
            <video
              src={image}
              controls
              className="w-full h-full rounded-b-none rounded-t-none"
              style={{ maxHeight: '144px' }}
            />
          ) : (
            <img
              src={image}
              alt={newsTitle}
              className="object-cover w-full h-full rounded-b-none rounded-t-none"
              style={{ maxHeight: '144px' }}
              onError={handleImageError}
            />
          )}
        </div>
      )}
      <div className="px-4 py-3">
        <h2 className="font-bold text-base mb-1 text-[#1a2236]">{newsTitle}</h2>
        <p className="text-gray-700 text-sm mb-3">{newsSummary}</p>
        <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-2">
          <span>{date}</span>
        </div>
      </div>
    </Card>
  );
}
