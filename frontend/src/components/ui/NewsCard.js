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
  // Heights: heading=52, image=210, content=162, date=36 → total=460
  return (
    <div style={{
      width: '400px',
      flexShrink: 0,
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      border: '1px solid #e5e7eb',
      backgroundColor: '#fff',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateRows: '52px 210px 162px 36px',
      height: '460px',
    }}>

      {/* Row 1 — Heading */}
      <div style={{
        backgroundColor: '#183153',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        overflow: 'hidden',
      }}>
        <span style={{color: '#fff', fontWeight: 700, letterSpacing: '0.1em', fontSize: '15px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
          {heading}
        </span>
      </div>

      {/* Row 2 — Image */}
      <div style={{overflow: 'hidden', backgroundColor: '#f3f4f6', height: '100%', maxHeight: '210px'}}>
        {image ? (
          isVideoUrl(image) ? (
            <video src={image} controls style={{width: '100%', height: '210px', objectFit: 'cover', display: 'block'}} />
          ) : (
            <img
              src={image}
              alt={newsTitle}
              style={{width: '100%', height: '210px', objectFit: 'cover', display: 'block'}}
              onError={handleImageError}
            />
          )
        ) : (
          <div style={{width: '100%', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '13px'}}>No Image</div>
        )}
      </div>

      {/* Row 3 — News Title + Summary */}
      <div style={{padding: '12px 16px 8px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', gap: '6px'}}>
        <h2 style={{
          margin: 0, fontWeight: 700, fontSize: '15px', color: '#1a2236',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {newsTitle}
        </h2>
        <p style={{
          margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: '1.5',
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {newsSummary}
        </p>
      </div>

      {/* Row 4 — Date */}
      <div style={{borderTop: '1px solid #e5e7eb', padding: '0 16px', display: 'flex', alignItems: 'center'}}>
        <span style={{fontSize: '12px', color: '#9ca3af'}}>{date}</span>
      </div>

    </div>
  );
}
