import React from 'react';

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
    <div className="w-[400px] flex-shrink-0 rounded-xl shadow-lg border border-gray-200 bg-white overflow-hidden flex flex-col" style={{height: '460px'}}>

      {/* Section 1 — Heading */}
      <div className="bg-[#183153] px-5 py-3 flex items-center justify-center" style={{minHeight: '52px'}}>
        <span className="text-white font-bold tracking-widest text-base text-center">{heading}</span>
      </div>

      {/* Section 2 — Image */}
      <div className="w-full bg-gray-100" style={{height: '210px', overflow: 'hidden', flexShrink: 0}}>
        {image ? (
          isVideoUrl(image) ? (
            <video src={image} controls style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          ) : (
            <img
              src={image}
              alt={newsTitle}
              style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}
              onError={handleImageError}
            />
          )
        ) : (
          <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '14px'}}>No Image</div>
        )}
      </div>

      {/* Section 3 — News Title + Summary */}
      <div className="px-4 pt-3 pb-2 flex flex-col" style={{flex: 1, overflow: 'hidden'}}>
        <h2 className="font-bold text-[15px] text-[#1a2236] mb-1" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
          {newsTitle}
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed" style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1}}>
          {newsSummary}
        </p>
      </div>

      {/* Section 4 — Date */}
      <div className="px-4 py-2 border-t border-gray-200 flex items-center" style={{minHeight: '36px', flexShrink: 0}}>
        <span className="text-xs text-gray-500">{date}</span>
      </div>

    </div>
  );
}
