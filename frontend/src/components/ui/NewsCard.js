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
    <Card className="w-[400px] mx-auto p-0 rounded-xl shadow-lg border bg-white overflow-hidden">
      <div className="bg-[#183153] rounded-t-xl px-6 py-3 flex items-center justify-center">
        <span className="text-white font-bold tracking-widest text-lg">{heading}</span>
      </div>
      {image && (
        <div data-news-media className="w-full h-52 bg-gray-100 flex items-center justify-center">
          {isVideoUrl(image) ? (
            <video
              src={image}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={image}
              alt={newsTitle}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          )}
        </div>
      )}
      <div className="px-5 py-4">
        <h2 className="font-bold text-base mb-2 text-[#1a2236]">{newsTitle}</h2>
        <p className="text-gray-700 text-sm mb-3 leading-relaxed">{newsSummary}</p>
        <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-2">
          <span>{date}</span>
        </div>
      </div>
    </Card>
  );
}
