import React from 'react';

export const ShakthiAppBanner = () => (
  <div className="flex flex-col md:flex-row items-center justify-between bg-white rounded-lg shadow p-8 mb-8 border border-[#E2E8F0]">
    {/* Left: Text Content */}
    <div className="flex-1 md:pr-12 text-left">
      <h3 className="text-2xl font-extrabold heading-font mb-4 text-[#2563EB]">AP Police Shakthi App</h3>
      <p className="text-base text-[#0F172A] mb-3">
        <span className="font-semibold text-[#DC2626]">Shakthi Women and Child Safety App</span> is a significant initiative by the Andhra Pradesh government to enhance the safety and security of women and children. The app provides essential SOS services, enabling users to seek immediate help in emergency situations.
      </p>
      <p className="text-base text-[#475569] mb-6">Download the official Women & Child Safety app for instant help and safety features.</p>
    </div>
    {/* Right: App Icon and Download Button */}
    <div className="flex flex-col items-center justify-center">
      <img
        src="/shakthi-logo.png"
        alt="AP Police Shakthi App"
        className="w-32 h-32 rounded-lg mb-4 border"
        style={{ background: '#fff' }}
      />
      <a
        href=" https://apps.apple.com/in/app/shakti/id6468864301"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-6 py-2 rounded shadow">
          Download iOS
        </button>
      </a>
      <a
        href="https://play.google.com/store/apps/details?id=com.likhatech.disha&hl=en_IN&pli=1"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-6 py-2 rounded shadow mt-2">
          Download Android
        </button>
      </a>
    </div>
  </div>
);
