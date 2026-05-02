import React from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Phone, Shield, AlertCircle, Hash, Lock, Database, CheckCircle, MapPin } from 'lucide-react';

const steps = [
  { num: 1, title: 'Visit CEIR Portal', desc: 'Go to ceir.sancharsaathi.gov.in', href: 'https://ceir.sancharsaathi.gov.in' },
  { num: 2, title: 'Block Stolen/Lost Mobile', desc: 'Click on the "Block Stolen/Lost Mobile" option' },
  { num: 3, title: 'Verify with OTP', desc: 'Enter your mobile number and verify using OTP' },
  { num: 4, title: 'Provide IMEI Number', desc: 'Dial *#06# to find your IMEI and enter it' },
  { num: 5, title: 'Submit Request', desc: 'Your device will be blocked across all networks in India' },
];

const imeiTips = [
  { Icon: Hash, text: 'Dial *#06# on your phone' },
  { Icon: Smartphone, text: 'Settings → About Phone' },
  { Icon: Database, text: 'Check your original phone box' },
  { Icon: Lock, text: 'Look under the SIM tray' },
];

const preventionTips = [
  'Note down your IMEI number and keep it safe',
  'Enable phone lock with strong password/PIN',
  'Enable Find My Device feature',
  'Keep backup of important data',
  'Register your mobile on CEIR portal',
];

export const MobileTrackingPage = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-8 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-4">
        <h1 className="text-4xl font-extrabold heading-font text-[#0F172A] flex items-center justify-center gap-3">
          <Smartphone className="w-9 h-9 text-[#2563EB]" />
          Mobile Tracking Support
        </h1>
      </div>

       {/* Find My Device Section */}

<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div className="flex flex-col lg:flex-row items-center gap-8 bg-[#fdfefe] rounded-2xl border border-[#2b3338] shadow-sm p-6 sm:p-8">

          {/* Left — Image */}
          <div className="w-full lg:w-1/2 flex-shrink-0">
            <img
              src="/findmymobile.png"
              alt="Find My Mobile"
              className="w-full h-600px object-contain contain [filter:contrast(1.2)_brightness(1.1)_drop-shadow(0_4px_12px_rgba(37,99,235,0.3))_drop-shadow(0_0_8px_rgba(37,99,235,0.2))]"
            />
          </div>

          {/* Right — Content */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center lg:px-6 overflow-y-auto">
            <h1 className="text-3xl sm:text-4xl font-extrabold heading-font text-[#0F172A] leading-tight mb-2">
              Lost Your Phone on a <span className="text-[#145dfa]">Railway Journey?</span>
            </h1>

            {/* Find My Device steps */}
            <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-3 mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#0369A1] mb-2">How to Find Your Device (Android)</p>
              <ol className="space-y-1">
                <li className="flex items-start gap-2 text-sm text-[#334155]">
                  <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
                  Go to <a href="https://www.google.com/android/find" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline font-medium ml-1">google.com/android/find</a>
                </li>
                <li className="flex items-start gap-2 text-sm text-[#334155]">
                  <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
                  Sign in with the Google account linked to your lost phone
                </li>
                <li className="flex items-start gap-2 text-sm text-[#334155]">
                  <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
                  Select your device — its location will appear on the map
                </li>
                <li className="flex items-start gap-2 text-sm text-[#334155]">
                  <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">4</span>
                  <div>
                    <span className="block mb-1 justify-center items-center">Choose one of the actions:</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 bg-[#DBEAFE] text-[#1D4ED8] text-xs font-semibold px-3 py-1 rounded-full">🔔 Play Sound</span>
                      <span className="inline-flex items-center gap-1 bg-[#D1FAE5] text-[#065F46] text-xs font-semibold px-3 py-1 rounded-full">🔒 Secure Device</span>
                      <span className="inline-flex items-center gap-1 bg-[#FEE2E2] text-[#991B1B] text-xs font-semibold px-3 py-1 rounded-full">🗑️ Erase Device</span>
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          </div>
          </div>
</div>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-10">

        {/* CEIR Banner Card */}
        <div className="rounded-2xl overflow-hidden shadow-lg border border-[#BFDBFE]">
          <div className="bg-[#1d60f1] px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#BFDBFE] mb-1">Government of India Initiative</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold heading-font text-white">CEIR Portal</h2>
              <p className="text-[#DBEAFE] text-sm mt-1">Central Equipment Identity Register — Sanchar Saathi</p>
            </div>
            <a
              href="https://ceir.sancharsaathi.gov.in/Home/index.jsp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-[#2563EB] font-bold px-6 py-3 rounded-lg hover:bg-[#EFF6FF] transition-colors text-sm shadow"
            >
              <Phone className="w-4 h-4" />
              Visit CEIR Portal
            </a>
          </div>
          <div className="bg-white px-8 py-6">
            <p className="text-[#475569] text-base leading-relaxed">
              If your mobile phone is lost or stolen, report it on the CEIR portal. This blocks your device's IMEI across all telecom networks in India, preventing its misuse — even with a different SIM card.
            </p>
          </div>
        </div>

        {/* How to Block Steps */}
        <div>
          <h3 className="text-2xl font-extrabold heading-font text-[#0F172A] mb-6">How to Block Your Lost / Stolen Mobile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {steps.map((step) => (
              <div key={step.num} className="relative bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 flex flex-col items-start gap-3 hover:border-[#2563EB] hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-lg font-extrabold flex-shrink-0">
                  {step.num}
                </div>
                <div>
                  <p className="font-bold text-[#0F172A] text-sm mb-1">{step.title}</p>
                  {step.href
                    ? <a href={step.href} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563EB] underline">{step.desc}</a>
                    : <p className="text-xs text-[#64748B]">{step.desc}</p>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IMEI + Prevention two-column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#16A34A]" />
              </div>
              <h3 className="text-lg font-bold heading-font text-[#0F172A]">What is IMEI?</h3>
            </div>
            <p className="text-sm text-[#475569] mb-5 leading-relaxed">
              IMEI is a unique 15-digit code identifying your mobile device. You need it to block your phone on CEIR. Find yours by:
            </p>
            <div className="space-y-3">
              {imeiTips.map(({ Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#334155]">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <h3 className="text-lg font-bold heading-font text-[#0F172A]">Before You Lose Your Phone</h3>
            </div>
            <p className="text-sm text-[#475569] mb-5 leading-relaxed">Preventive measures to take right now:</p>
            <div className="space-y-3">
              {preventionTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#334155]">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
