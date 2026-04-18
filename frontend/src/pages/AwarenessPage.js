import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Book, Shield, AlertTriangle, Users, SearchCheck, X, Expand } from 'lucide-react';

export const AwarenessPage = () => {
  const awarenessPosterSrc = '/laptopz.png';
  const cardClassName = 'p-5 sm:p-6 border-2 border-[#93C5FD] bg-white rounded-[28px] shadow-[0_4px_18px_rgba(37,99,235,0.08)] flex flex-col gap-3 h-auto md:h-[460px] lg:h-[410px] xl:h-[390px]';
  const titleClassName = 'text-xl sm:text-2xl font-bold heading-font text-[#0F172A] leading-tight';
  const listClassName = 'space-y-1 text-sm sm:text-[15px] leading-6 text-[#475569]';
  const iconBaseClassName = 'w-8 h-8 sm:w-9 sm:h-9';
  const featureBannerClassName = 'w-full overflow-hidden rounded-[32px] border-2 border-[#93C5FD] bg-white shadow-[0_10px_28px_rgba(37,99,235,0.08)]';
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Book className="w-12 h-12 text-[#2563EB] mb-4" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">Awareness</h1>
          <p className="text-base text-[#475569] mt-2">
            Awareness is the first step to safety. By staying informed and vigilant, you can protect yourself and others from potential dangers while traveling by train. Please review the tips and resources below to ensure a safe and secure journey for everyone.
          </p>
        </div>

        {/* Lightbox Modal */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/40 rounded-full p-2 transition"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-7 h-7" />
            </button>
            <div className="flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
              <img
                src={awarenessPosterSrc}
                alt="Laptop Loss Theft Awareness"
                className="max-h-[80vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
              />
              <a
                href={awarenessPosterSrc}
                download="laptop-awareness-poster.png"
                className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-6 py-2 rounded-full transition text-sm shadow-lg"
                onClick={e => e.stopPropagation()}
              >
                ⬇ Download Poster
              </a>
            </div>
          </div>
        )}

        <div className="mb-10">
          <div className={featureBannerClassName}>
            <div className="flex flex-col lg:flex-row lg:items-stretch">
              {/* Image — click to fullscreen */}
              <div
                className="relative w-full overflow-hidden cursor-pointer group lg:w-[42%] bg-[#F1F5F9] flex items-center justify-center p-4 sm:p-5"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={awarenessPosterSrc}
                  alt="Laptop Loss Theft Awareness"
                  className="h-auto w-auto max-w-full max-h-[420px] lg:max-h-[320px] object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  <Expand className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>

              {/* Right side content about the image */}
              <div className="flex w-full items-center px-5 py-5 sm:px-6 lg:w-[58%] lg:px-8 lg:py-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#D97706] flex-shrink-0" />
                    <span className="text-[10px] font-bold tracking-widest text-[#D97706] uppercase">Awareness Poster</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold heading-font text-[#0F172A] leading-tight">
                    Laptop Loss / Theft — Passenger Awareness
                  </h2>
                  <p className="text-sm leading-6 text-[#475569]">
                    If your laptop is lost or stolen in a train, act within the first <span className="font-semibold text-[#DC2626]">24–48 hours</span>. Report to GRP officer, use device tracking tools, and block via <a href="https://www.ceir.gov.in/" className="text-[#2563EB] underline" target="_blank" rel="noopener noreferrer">CEIR Portal</a>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  <Card className={cardClassName}>
                      <AlertTriangle className={`${iconBaseClassName} text-[#D97706]`} />
                        <h2 className={titleClassName}>Missing/Stolen Electronic Devices</h2>
                         <ul className={listClassName}>
                          <li>• Always use a strong password, PIN, or biometric lock on your device.</li>
                          <li>• Enable device tracking features (like Find My Device for Android, Find My iPhone for Apple).</li>
                          <li>• Note down your device’s IMEI number and keep it safe for reference.</li>
                          <li>• If your device is lost or stolen:
                            <ul className="list-disc ml-5 mt-1 space-y-1 text-sm sm:text-[15px] leading-6">
                              <li>– Immediately report to the nearest GRP officer or police station.</li>
                              <li>– Provide device details (IMEI, make, model, color, last seen location).</li>
                              <li>– Block your SIM card by contacting your mobile service provider.</li>
                              <li>– Block Your IMEI through <a href="https://www.ceir.gov.in/" className="text-[#2563EB] underline" target="_blank" rel="noopener noreferrer"> ceir.sancharsaathi.gov.in</a> Portal.</li>
                            </ul>
                          </li>
                        </ul>
                    </Card>

          <Card className={cardClassName}>
            <AlertTriangle className={`${iconBaseClassName} text-[#D97706]`} />
            <h2 className={titleClassName}>Cyber Crime Awareness</h2>
             <ul className={listClassName}>
              <li>• Be cautious of fake ticket booking websites</li>
              <li>• Never share OTP or personal details with anyone</li>
              <li>• Verify railway helpline numbers before calling</li>
              <li>• Report phishing attempts to authorities</li>
              <li>• Use official railway apps and websites only</li>
              <li>• Keep your mobile and email passwords secure</li>
              <li>• Report cyber crimes immediately to the National Cyber Crime Helpline <span className="font-bold text-[#DC2626]">1930</span></li>
            </ul>
          </Card>

                <Card className={cardClassName}>
              <SearchCheck className={`${iconBaseClassName} text-[#16A34A]`} />
              <h2 className={titleClassName}>Lost & Found / Reporting Procedures</h2>
               <ul className={listClassName}>
                <li>• If you lose an item, immediately report it to the nearest GRP officer or at the GRP help desk on the platform.</li>
                <li>• Provide a detailed description and any proof of ownership.</li>
                <li>• If you find an unclaimed item, hand it over to GRP staff or deposit it at the Lost & Found counter.</li>
                <li>• Always collect a receipt for any item reported or deposited.</li>
                <li>• For complaints, use the <a href="/complaint" className="text-[#2563EB] underline">online complaint form</a> or call the helpline numbers above.</li>
              </ul>
          </Card>

                    <Card className={cardClassName}>
            <Shield className={`${iconBaseClassName} text-[#2563EB]`} />
            <h2 className={titleClassName}>Railway Safety Tips</h2>
             <ul className={listClassName}>
              <li>• Always board and alight from trains when they are stationary</li>
              <li>• Keep your luggage within sight at all times</li>
              <li>• Avoid accepting food or drinks from strangers</li>
              <li>• Use the emergency chain only in genuine emergencies</li>
              <li>• Report suspicious activities to GRP immediately</li>
              <li>• Keep important documents and valuables secure</li>
            </ul>
          </Card>

          <Card className={cardClassName}>
            <Users className={`${iconBaseClassName} text-[#16A34A]`} />
            <h2 className={titleClassName}>Anti-Trafficking Information</h2>
             <ul className={listClassName}>
              <li>• Be alert to suspicious behavior at railway stations</li>
              <li>• Report unaccompanied children or distressed persons</li>
              <li>• Never accept job offers from unknown persons at stations</li>
              <li>• Contact GRP if you suspect trafficking activities</li>
              <li>• Keep emergency helpline numbers handy</li>
              <li>• Educate children about safety and stranger danger</li>
            </ul>
          </Card>

          <Card className={cardClassName}>
            <Book className={`${iconBaseClassName} text-[#DC2626]`} />
            <h2 className={titleClassName}>Important Contacts</h2>
             <ul className={listClassName}>
              <li>• Emergency Helpline: <span className="font-bold">112</span></li>
              <li>• Railway Helpline: <span className="font-bold">139</span></li>
              <li>• RPF Helpline: <span className="font-bold">182</span></li>
              <li>• Women Helpline: <span className="font-bold">1091</span></li>
              <li>• Child Helpline: <span className="font-bold">1098</span></li>
              <li>• Anti-Human Trafficking: <span className="font-bold">1800-180-5995</span></li>
            </ul>
          </Card>
        </div>
        </div>
      </div>
  );
};
