import React from 'react';

export const AdminPageHero = ({ eyebrow = 'ADMIN DASHBOARD', title, description }) => {
  return (
    <div className="mb-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-2">{eyebrow}</p>
      <h1 className="text-4xl sm:text-5xl font-extrabold heading-font text-[#0F172A]">{title}</h1>
      {description ? <p className="text-lg text-[#475569] mt-4">{description}</p> : null}
    </div>
  );
};
