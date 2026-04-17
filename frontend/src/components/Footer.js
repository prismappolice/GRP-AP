import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Mail, Phone, MapPin } from 'lucide-react';

const CopyrightBar = () => (
  <div className="bg-[#0B1121] text-gray-200 text-xs py-4 text-center flex flex-col gap-1">
    <p>&copy; 2026 Government Railway Police, Andhra Pradesh. All rights reserved.</p>
    <p>@Developed by PRISM (Police Research Institute for Systems Modernization) <a href="https://prismappolice.in" className="text-yellow-400 hover:text-blue-400 transition-colors" target="_blank" rel="noopener noreferrer">www.prismappolice.in</a></p>
  </div>
);

export const Footer = () => {
  const { user, isAdmin } = useAuth();
  const hasActiveSession = Boolean(isAdmin || user);

  if (hasActiveSession) {
    return <CopyrightBar />;
  }

  return (
    <footer className="bg-[#0B1121] text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/1do5egdn_Appolice-Logo.png"
                alt="AP Police Logo"
                className="w-12 h-12 object-contain [filter:contrast(1.5)_brightness(1.5)_drop-shadow(0_4px_12px_rgba(255,255,255,0.6))_drop-shadow(0_0_8px_rgba(255,255,255,0.5))]"
              />
              <div>
                <h3 className="font-bold text-lg heading-font">GRP-Andhra Pradesh</h3>
                <p className="text-xs text-gray-400">Government Railway Police</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Government Railway Police, Andhra Pradesh - Ensuring passenger safety and security across railway premises.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 heading-font">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
              <li><Link to="/history" className="text-gray-400 hover:text-white transition-colors">History</Link></li>
              <li><Link to="/organization" className="text-gray-400 hover:text-white transition-colors">Organization</Link></li>
              <li><Link to="/awareness" className="text-gray-400 hover:text-white transition-colors">Awareness</Link></li>
              <li><Link to="/services" className="text-gray-400 hover:text-white transition-colors">Services</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 heading-font">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/complaint" className="text-gray-400 hover:text-white transition-colors">File Complaint</Link></li>
              <li><Link to="/indian-railways" className="text-gray-400 hover:text-white transition-colors">Indian Railways</Link></li>
              <li><Link to="/women-safety" className="text-gray-400 hover:text-white transition-colors">Women Safety</Link></li>
              <li><Link to="/help-desk" className="text-gray-400 hover:text-white transition-colors">Help Desk</Link></li>
              <li><Link to="/stations" className="text-gray-400 hover:text-white transition-colors">Station Locator</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 heading-font">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-gray-400">
                <Phone className="w-4 h-4" />
                <span>Railway Helpline: 139</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <Mail className="w-4 h-4" />
                <span>andhrapradeshgrp@gmail.com</span>
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <MapPin className="w-4 h-4" />
                <span>Andhra Pradesh</span>
              </li>
            </ul>


          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col items-center justify-center gap-1 text-center text-sm text-gray-400">
          <p>&copy; 2026 Government Railway Police, Andhra Pradesh. All rights reserved.</p>
          <p>@Developed by PRISM (Police Research Institute for Systems Modernization) <a href="https://www.prismappolice.in" className="text-white hover:text-blue-500 transition-colors" target="_blank" rel="noopener noreferrer">www.prismappolice.in</a></p>
        </div>
      </div>
    </footer>
  );
};
