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
    <Card className="w-[400px] mx-auto p-0 rounded-xl shadow-lg border bg-white overflow-hidden flex flex-col h-[480px]">
      {/* Heading */}
      <div className="bg-[#183153] rounded-t-xl px-6 py-3 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold tracking-widest text-lg">{heading}</span>
      </div>
      {/* Image */}
      <div data-news-media className="w-full h-[220px] flex-shrink-0 bg-gray-100 overflow-hidden">
        {image ? (
          isVideoUrl(image) ? (
            <video src={image} controls className="w-full h-full object-cover" />
          ) : (
            <img
              src={image}
              alt={newsTitle}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No Image</div>
        )}
      </div>
      {/* Content */}
      <div className="px-5 py-4 flex flex-col flex-1 overflow-hidden">
        <h2 className="font-bold text-base mb-2 text-[#1a2236] line-clamp-2">{newsTitle}</h2>
        <p className="text-gray-700 text-sm leading-relaxed flex-1 overflow-hidden line-clamp-4">{newsSummary}</p>
        <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-2 mt-2 flex-shrink-0">
          <span>{date}</span>
        </div>
      </div>
    </Card>
  );
}
