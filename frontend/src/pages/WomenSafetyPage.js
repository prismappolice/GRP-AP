import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Phone, Shield, AlertCircle } from 'lucide-react';
import { ShakthiAppBanner } from '@/components/ShakthiAppBanner';

export const WomenSafetyPage = () => {
  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Heart className="w-12 h-12 text-[#DC2626] mb-4" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">Women Safety</h1>
          <p className="text-base text-[#475569] mt-2">Your safety is our priority</p>
        </div>


        <ShakthiAppBanner />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border border-[#E2E8F0] bg-white text-center">
            <Phone className="w-10 h-10 text-[#DC2626] mx-auto mb-4" />
            <h3 className="font-bold text-lg text-[#0F172A] mb-2">Emergency Helpline</h3>
            <p className="text-2xl font-bold text-[#DC2626]">112</p>
          </Card>
          <Card className="p-6 border border-[#E2E8F0] bg-white text-center">
            <Phone className="w-10 h-10 text-[#DC2626] mx-auto mb-4" />
            <h3 className="font-bold text-lg text-[#0F172A] mb-2">Women Helpline</h3>
            <p className="text-2xl font-bold text-[#DC2626]">1091</p>
          </Card>
          <Card className="p-6 border border-[#E2E8F0] bg-white text-center">
            <Phone className="w-10 h-10 text-[#DC2626] mx-auto mb-4" />
            <h3 className="font-bold text-lg text-[#0F172A] mb-2">Child Helpline</h3>
            <p className="text-2xl font-bold text-[#DC2626]">1098</p>
          </Card>
        </div>

        <Card className="p-8 border border-[#E2E8F0] bg-white mb-8">
          <h2 className="text-2xl font-bold heading-font text-[#0F172A] mb-6">Safety Guidelines</h2>
          <div className="space-y-4 text-base text-[#475569]">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-1" />
              <p>Travel in well-lit and crowded compartments, especially during night journeys</p>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-1" />
              <p>Keep emergency contacts saved on your phone and inform family about your journey</p>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-1" />
              <p>Don't hesitate to approach GRP officers or railway staff if you feel unsafe</p>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-1" />
              <p>Use the chain-pulling facility only in case of genuine emergency</p>
            </div>
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-1" />
              <p>Report any suspicious activity or harassment immediately to authorities</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
