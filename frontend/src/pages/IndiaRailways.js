import React from 'react';
import { Card } from '@/components/ui/card';
import { Train, Globe, CalendarCheck, Phone, Info, Link2, Shield, Ticket, Package, BarChart3, PartyPopper } from 'lucide-react';

const indiaRailwaysInfo = [
  {
    title: 'Indian Railways Overview',
    content: `
      Indian Railways is one of the largest railway networks in the world, operated by the Government of India under the Ministry of Railways. It plays a vital role in the country's transportation system by carrying millions of passengers and large volumes of goods across India every day.
    `
  },
];

const services = [
  {
    icon: <Train className="w-8 h-8 text-[#2563EB]" />,
    title: 'Passenger Transport',
    desc: 'Travel across India with long-distance, suburban, and local trains.',
    summary: 'Millions of passengers use Indian Railways daily for safe and affordable journeys.',
    link: 'https://indianrailways.gov.in/',
    linkLabel: 'Learn More',
    cta: 'Learn More',
  },
  {
    icon: <Package className="w-8 h-8 text-[#16A34A]" />,
    title: 'Freight Logistics',
    desc: 'Cargo transport for coal, cement, steel, and more.',
    summary: 'Efficient logistics for industries and businesses nationwide.',
    link: 'https://www.fois.indianrail.gov.in/',
    linkLabel: 'Learn More',
    cta: 'Learn More',
  },
  {
    icon: <Ticket className="w-8 h-8 text-[#D97706]" />,
    title: 'Online Ticket Booking',
    desc: 'Book train tickets online via IRCTC.',
    summary: 'Easy booking for Tatkal, Premium Tatkal, and regular tickets.',
    link: 'https://www.irctc.co.in/',
    linkLabel: 'Book Now',
    cta: 'Book Now',
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-[#A21CAF]" />,
    title: 'Real-Time Train Tracking',
    desc: 'Live train running status and platform info.',
    summary: 'Track your train in real-time and get schedule updates.',
    link: 'https://enquiry.indianrail.gov.in/',
    linkLabel: 'Track Now',
    cta: 'Track Now',
  },
  {
    icon: <Shield className="w-8 h-8 text-[#DC2626]" />,
    title: 'Safety & Security',
    desc: 'RPF & GRP ensure passenger safety. Emergency helpline: 139.',
    summary: '24/7 security and emergency support for all passengers.',
    link: 'https://rpf.indianrailways.gov.in/',
    linkLabel: 'Learn More',
    cta: 'Learn More',
  },
  {
    icon: <Info className="w-8 h-8 text-[#0EA5E9]" />,
    title: 'PNR Status',
    desc: 'Check your PNR status for ticket confirmation.',
    summary: 'Instant PNR enquiry for journey details and confirmation.',
    link: 'https://www.indianrail.gov.in/enquiry/PNR/PnrEnquiry.html',
    linkLabel: 'Check Now',
    cta: 'Check Now',
  },
  {
    icon: <CalendarCheck className="w-8 h-8 text-[#16A34A]" />,
    title: 'Train Schedule',
    desc: 'Find train schedules and timings for all routes.',
    summary: 'Up-to-date train timings and route information.',
    link: 'https://www.indianrail.gov.in/enquiry/TrainSchedule.html',
    linkLabel: 'View Schedule',
    cta: 'View Schedule',
  },
  {
    icon: <Package className="w-8 h-8 text-[#D97706]" />,
    title: 'Parcel Services',
    desc: 'Book and track railway parcel and luggage services.',
    summary: 'Reliable parcel and luggage transport across India.',
    link: 'https://parcel.indianrail.gov.in/',
    linkLabel: 'Book Parcel',
    cta: 'Book Parcel',
  },
  {
    icon: <Phone className="w-8 h-8 text-[#16A34A]" />,
    title: 'Railway App Download',
    desc: 'Download official Indian Railways/IRCTC mobile apps.',
    summary: 'Access railway services on your mobile device.',
    link: 'https://www.irctc.co.in/nget/train-search',
    linkLabel: 'Download App',
    cta: 'Download App',
  },
  {
    icon: <PartyPopper className="w-8 h-8 text-[#F59E42]" />,
    title: 'Tourism & Special Trains',
    desc: 'Tourism packages, luxury trains, and festival specials.',
    summary: 'Explore India with special tourist trains and packages.',
    link: 'https://www.irctctourism.com/',
    linkLabel: 'Explore',
    cta: 'Explore',
  },
];

export default function IndiaRailways() {
  return (
    <div className="min-h-screen pt-20 bg-[#F8FAFC] pb-16">
      {/* Hero Section */}
      <section className="relative z-0 h-[400px] flex items-center justify-center overflow-hidden mb-12">
        <div
          className="absolute inset-0 bg-cover bg-center"
             style={{ backgroundImage: 'url(/railway.png)', filter: 'brightness(1.2)' }}
        />
          <div className="absolute inset-0 bg-black bg-opacity-40" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
            <h1 className="text-4xl sm:text-5xl font-extrabold heading-font mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>Indian Railways</h1>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>One of the world’s largest railway networks, connecting India with safe, reliable, and affordable transport.</p>
        </div>
      </section>

      {/* Overview Section */}
      <section className="max-w-5xl mx-auto px-4 mb-10">
        <Card className="p-8 border border-[#E2E8F0] bg-white mb-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-3 flex items-center gap-2"><Info className="w-6 h-6 text-[#2563EB]" /> Indian Railways Overview</h2>
          <p className="text-base text-[#475569]">Indian Railways is one of the largest railway networks in the world, operated by the Government of India under the Ministry of Railways. It plays a vital role in the country's transportation system by carrying millions of passengers and large volumes of goods across India every day.<br/><br/>It connects major cities, towns, and rural areas, supporting economic growth, tourism, and daily commuting. Indian Railways is known for its extensive network, affordability, and continuous modernization efforts.</p>
        </Card>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-6 flex items-center gap-2"><Train className="w-6 h-6 text-[#2563EB]" /> Indian Railways Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {services.map((service, idx) => (
            <Card key={idx} className="p-6 border border-[#E2E8F0] bg-white flex flex-col gap-2 shadow-sm h-full justify-between">
              <div className="flex items-center gap-3 mb-2">
                {service.icon}
                <h3 className="font-bold text-lg text-[#0F172A]">{service.title}</h3>
              </div>
              <p className="text-xs text-[#64748B] mb-1 italic">{service.summary}</p>
              <p className="text-sm text-[#475569] mb-2">{service.desc}</p>
              <a href={service.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 mt-auto rounded bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors shadow justify-center w-full text-center"><Link2 className="w-4 h-4" /> {service.cta}</a>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border border-[#E2E8F0] bg-white flex flex-col gap-2 shadow-sm">
            <h3 className="font-bold text-lg text-[#0F172A] mb-2 flex items-center gap-2"><Phone className="w-5 h-5 text-[#DC2626]" /> Helpline</h3>
            <p className="text-base text-[#475569]">For any railway-related emergency or enquiry, call <span className="font-bold text-[#2563EB]">139</span>.</p>
          </Card>
          <Card className="p-6 border border-[#E2E8F0] bg-white flex flex-col gap-2 shadow-sm">
            <h3 className="font-bold text-lg text-[#0F172A] mb-2 flex items-center gap-2"><Info className="w-5 h-5 text-[#16A34A]" /> Customer Support</h3>
            <p className="text-base text-[#475569]">For feedback, lost & found, or complaints, visit <a href="https://railmadad.indianrailways.gov.in/" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline">Rail Madad</a> or email <a href="mailto:customercare@indianrailways.gov.in" className="text-[#2563EB] underline">customercare@indianrailways.gov.in</a>.</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
