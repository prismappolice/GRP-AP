import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { FileText, Heart, HelpCircle, MapPin, Smartphone, Globe2Icon } from 'lucide-react';

export const ServicesPage = () => {
  const services = [
    { icon: FileText, title: 'File Complaint', description: 'Register complaints online and track status', link: '/complaint', color: 'bg-[#2563EB]' },
    { icon: MapPin, title: 'Station Locator', description: 'Find nearest GRP stations', link: '/stations', color: 'bg-[#16A34A]' }, 
    { icon: Heart, title: 'Women Safety', description: 'SOS and safety helplines', link: '/women-safety', color: 'bg-[#DC2626]' },
    { icon: Globe2Icon, title: 'Indian Railways', description: 'Access Indian Railways services and information', link: '/indian-railways', color: 'bg-[#16A34A]' },
    { icon: Smartphone, title: 'Mobile Tracking', description: 'IMEI blocking and CEIR portal access', link: '/mobile-tracking', color: 'bg-[#D97706]' },
    { icon: HelpCircle, title: 'Help Desk', description: 'Get assistance from our team', link: '/help-desk', color: 'bg-[#2563EB]' },
  ];

  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-2">OUR SERVICES</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold heading-font text-[#0F172A]">How Can We Help You?</h1>
          <p className="text-lg text-[#475569] mt-4">Comprehensive railway police services at your fingertips</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, idx) => {
            const Icon = service.icon;
            return (
              <Link key={idx} to={service.link}>
                <Card className="p-8 border border-[#E2E8F0] bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-200 h-full">
                  <div className={`${service.color} w-14 h-14 rounded-md flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold heading-font text-[#0F172A] mb-2">{service.title}</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">{service.description}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
