import React from 'react';
import { Card } from '@/components/ui/card';
import { Book, Shield, AlertTriangle, Users, SearchCheck } from 'lucide-react';

export const AwarenessPage = () => {
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 border border-[#60A5FA] bg-white">
            <Shield className="w-10 h-10 text-[#2563EB] mb-4" />
            <h2 className="text-2xl font-bold heading-font text-[#0F172A] mb-4">Railway Safety Tips</h2>
             <ul className="space-y-1.5 text-base text-[#475569]">
              <li>• Always board and alight from trains when they are stationary</li>
              <li>• Keep your luggage within sight at all times</li>
              <li>• Avoid accepting food or drinks from strangers</li>
              <li>• Use the emergency chain only in genuine emergencies</li>
              <li>• Report suspicious activities to GRP immediately</li>
              <li>• Keep important documents and valuables secure</li>
            </ul>
          </Card>

          <Card className="p-8 border border-[#60A5FA] bg-white">
            <AlertTriangle className="w-10 h-10 text-[#D97706] mb-4" />
            <h2 className="text-2xl font-bold heading-font text-[#0F172A] mb-4">Cyber Crime Awareness</h2>
             <ul className="space-y-1.5 text-base text-[#475569]">
              <li>• Be cautious of fake ticket booking websites</li>
              <li>• Never share OTP or personal details with anyone</li>
              <li>• Verify railway helpline numbers before calling</li>
              <li>• Report phishing attempts to authorities</li>
              <li>• Use official railway apps and websites only</li>
              <li>• Keep your mobile and email passwords secure</li>
              <li>• Report cyber crimes immediately to the National Cyber Crime Helpline <span className="font-bold text-[#DC2626]">1930</span></li>
            </ul>
          </Card>

          <Card className="p-8 border border-[#60A5FA] bg-white">
            <Users className="w-10 h-10 text-[#16A34A] mb-4" />
            <h2 className="text-2xl font-bold heading-font text-[#0F172A] mb-4">Anti-Trafficking Information</h2>
             <ul className="space-y-1.5 text-base text-[#475569]">
              <li>• Be alert to suspicious behavior at railway stations</li>
              <li>• Report unaccompanied children or distressed persons</li>
              <li>• Never accept job offers from unknown persons at stations</li>
              <li>• Contact GRP if you suspect trafficking activities</li>
              <li>• Keep emergency helpline numbers handy</li>
              <li>• Educate children about safety and stranger danger</li>
            </ul>
          </Card>

          <Card className="p-8 border border-[#60A5FA] bg-white">
            <Book className="w-10 h-10 text-[#DC2626] mb-4" />
            <h2 className="text-2xl font-bold heading-font text-[#0F172A] mb-4">Important Contacts</h2>
             <ul className="space-y-1.5 text-base text-[#475569]">
              <li>• Emergency Helpline: <span className="font-bold">112</span></li>
              <li>• Railway Helpline: <span className="font-bold">139</span></li>
              <li>• RPF Helpline: <span className="font-bold">182</span></li>
              <li>• Women Helpline: <span className="font-bold">1091</span></li>
              <li>• Child Helpline: <span className="font-bold">1098</span></li>
              <li>• Anti-Human Trafficking: <span className="font-bold">1800-180-5995</span></li>
              <li>• Cyber Crime: <span className="font-bold">1930</span></li>
            </ul>
          </Card>

            <Card className="p-8 border border-[#60A5FA] bg-white">
              <SearchCheck className="w-10 h-10 text-[#16A34A] mb-4" />
              <h2 className="text-2xl font-bold heading-font text-[#0F172A] mb-2">Lost & Found / Reporting Procedures</h2>
               <ul className="space-y-1.5 text-base text-[#475569] mb-2">
                <li>• If you lose an item, immediately report it to the nearest GRP officer or at the GRP help desk on the platform.</li>
                <li>• Provide a detailed description and any proof of ownership.</li>
                <li>• If you find an unclaimed item, hand it over to GRP staff or deposit it at the Lost & Found counter.</li>
                <li>• Always collect a receipt for any item reported or deposited.</li>
                <li>• For complaints, use the <a href="/complaint" className="text-[#2563EB] underline">online complaint form</a> or call the helpline numbers above.</li>
              </ul>
          </Card>

                 {/* Missing/Stolen Electronic Devices Section */}
                  <Card className="p-8 border border-[#60A5FA] bg-white">
                      <AlertTriangle className="w-10 h-10 text-[#D97706] mb-4" />
                        <h2 className="text-2xl font-bold heading-font text-[#0F172A] mb-2">Missing/Stolen Electronic Devices</h2>
                         <ul className="space-y-1.5 text-base text-[#475569] mb-2">
                          <li>• Never leave your mobile or laptop unattended at stations, in trains, or public places.</li>
                          <li>• Always use a strong password, PIN, or biometric lock on your device.</li>
                          <li>• Enable device tracking features (like Find My Device for Android, Find My iPhone for Apple).</li>
                          <li>• Note down your device’s IMEI number and keep it safe for reference.</li>
                          <li>• If your device is lost or stolen:
                            <ul className="list-disc ml-6 mt-1 space-y-1">
                              <li>– Immediately report to the nearest GRP officer or police station.</li>
                              <li>– Provide device details (IMEI, make, model, color, last seen location).</li>
                              <li>– Block your SIM card by contacting your mobile service provider.</li>
                              <li>– Block Your IMEI through <a href="https://www.ceir.gov.in/" className="text-[#2563EB] underline" target="_blank" rel="noopener noreferrer"> ceir.sancharsaathi.gov.in</a> Portal.</li>
                            </ul>
                          </li>
                        </ul>
                    </Card>
          
        </div>
        </div>
      </div>
  );
};
