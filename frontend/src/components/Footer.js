import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Shield, Mail, Phone, MapPin, Facebook, Twitter, Youtube } from 'lucide-react';

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
    <footer className="bg-[#0B1121] text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8" strokeWidth={2.5} />
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
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About GRP</Link></li>
              <li><Link to="/history" className="text-gray-400 hover:text-white transition-colors">History</Link></li>
              <li><Link to="/services" className="text-gray-400 hover:text-white transition-colors">Services</Link></li>
              <li><Link to="/awareness" className="text-gray-400 hover:text-white transition-colors">Awareness</Link></li>
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

            <div className="flex gap-3 mt-6">
              <a href="#" className="w-10 h-10 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" aria-label="YouTube">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col items-center justify-center gap-2 text-center text-sm text-gray-400">
          <p>&copy; 2026 Government Railway Police, Andhra Pradesh. All rights reserved.</p>
          <p>@Developed by PRISM (Police Research Institute for Systems Modernization) <a href="https://www.prismappolice.in" className="text-white hover:text-blue-500 transition-colors" target="_blank" rel="noopener noreferrer">www.prismappolice.in</a></p>
        </div>
      </div>
    </footer>
  );
};
