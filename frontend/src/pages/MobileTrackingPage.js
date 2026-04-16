import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Phone, Shield, AlertCircle } from 'lucide-react';

export const MobileTrackingPage = () => {
  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Smartphone className="w-12 h-12 text-[#2563EB] mb-4" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">Mobile Tracking Support</h1>
          <p className="text-base text-[#475569] mt-2">Block your lost or stolen mobile device</p>
        </div>

        {/* CEIR Portal Section */}
        <Card className="p-8 border border-[#60A5FA] bg-white mb-8">
          <div className="bg-[#F8FAFC] border-2 border-[#2563EB] rounded-lg p-6 mb-6">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <a 
                  href="https://ceir.sancharsaathi.gov.in/Home/index.jsp" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block hover:opacity-80 transition-opacity"
                >
                  <img 
                    src="https://ceir.sancharsaathi.gov.in/images/ceir_logo.png"
                    alt="CEIR Portal"
                    className="w-32 h-32 object-contain border border-[#60A5FA] rounded-md bg-white p-2"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%232563EB" stroke-width="2"%3E%3Crect x="5" y="2" width="14" height="20" rx="2" ry="2"%3E%3C/rect%3E%3Cline x1="12" y1="18" x2="12.01" y2="18"%3E%3C/line%3E%3C/svg%3E';
                    }}
                  />
                </a>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold heading-font text-[#0F172A] mb-3">CEIR - Central Equipment Identity Register</h2>
                <p className="text-base text-[#475569] mb-4 leading-relaxed">
                  If your mobile phone is lost or stolen, you can report it on the CEIR portal. This will block your device across all networks in India, preventing misuse.
                </p>
                <a 
                  href="https://ceir.sancharsaathi.gov.in/Home/index.jsp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-6 py-3 rounded-md hover:bg-[#1D4ED8] transition-colors font-semibold"
                  data-testid="ceir-portal-link"
                >
                  <Phone className="w-5 h-5" />
                  Visit CEIR Portal
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold heading-font text-[#0F172A]">How to Block Your Lost/Stolen Mobile:</h3>
            <div className="space-y-3 text-base text-[#475569]">
              <div className="flex gap-3">
                <span className="font-bold text-[#2563EB] flex-shrink-0">Step 1:</span>
                <p>Visit <a href="https://ceir.sancharsaathi.gov.in" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline">ceir.sancharsaathi.gov.in</a></p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-[#2563EB] flex-shrink-0">Step 2:</span>
                <p>Click on "Block Stolen/Lost Mobile"</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-[#2563EB] flex-shrink-0">Step 3:</span>
                <p>Enter your mobile number and verify with OTP</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-[#2563EB] flex-shrink-0">Step 4:</span>
                <p>Provide IMEI number (dial *#06# on your phone to get IMEI)</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-[#2563EB] flex-shrink-0">Step 5:</span>
                <p>Submit the request - Your device will be blocked across all networks</p>
              </div>
            </div>

            <div className="bg-[#FFF7ED] border-l-4 border-[#D97706] p-4 mt-6">
              <p className="text-sm text-[#475569]">
                <strong className="text-[#D97706]">Important:</strong> Also file a complaint with GRP immediately and keep the complaint tracking number for CEIR registration.
              </p>
            </div>
          </div>
        </Card>

        {/* Additional Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border border-[#60A5FA] bg-white">
            <Shield className="w-10 h-10 text-[#16A34A] mb-4" />
            <h3 className="text-xl font-bold heading-font text-[#0F172A] mb-3">What is IMEI?</h3>
            <p className="text-sm text-[#475569] leading-relaxed mb-4">
              IMEI (International Mobile Equipment Identity) is a unique 15-digit code that identifies your mobile device. You can find it by:
            </p>
            <ul className="space-y-2 text-sm text-[#475569] list-disc list-inside">
              <li>Dialing *#06# on your phone</li>
              <li>Checking phone settings (About Phone)</li>
              <li>Looking at the original phone box</li>
              <li>Checking the phone's SIM tray</li>
            </ul>
          </Card>

          <Card className="p-6 border border-[#60A5FA] bg-white">
            <AlertCircle className="w-10 h-10 text-[#DC2626] mb-4" />
            <h3 className="text-xl font-bold heading-font text-[#0F172A] mb-3">Before You Lose Your Phone</h3>
            <p className="text-sm text-[#475569] leading-relaxed mb-4">
              Take these preventive measures:
            </p>
            <ul className="space-y-2 text-sm text-[#475569] list-disc list-inside">
              <li>Note down your IMEI number and keep it safe</li>
              <li>Enable phone lock with strong password/PIN</li>
              <li>Enable Find My Device feature</li>
              <li>Keep backup of important data</li>
              <li>Register your mobile on CEIR portal</li>
            </ul>
          </Card>
        </div>

        {/* Emergency Contact */}
        <Card className="p-8 border-2 border-[#DC2626] bg-[#FEF2F2] mt-8">
          <div className="text-center">
            <Phone className="w-12 h-12 text-[#DC2626] mx-auto mb-4" />
            <h3 className="text-2xl font-bold heading-font text-[#0F172A] mb-2">Lost Your Phone?</h3>
            <p className="text-base text-[#475569] mb-4">Report to GRP immediately</p>
            <a href="tel:112">
              <Button size="lg" className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-8 py-6 text-lg">
                Call 139 - Railway Helpline
              </Button>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};
