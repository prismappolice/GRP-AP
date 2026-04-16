import React, { useEffect, useState } from 'react';
import { stations } from '../data/stations';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, MapPin, Users, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStaticPageContent } from '@/lib/staticPageContent';

const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-[#60A5FA] rounded-md mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors"
        data-testid={`toggle-${title}`}
      >
        <h3 className="font-bold text-lg text-[#0F172A]">{title}</h3>
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
};

export const OrganizationPage = () => {
  const pageContent = useStaticPageContent('organization');
  const [vijayawadaSearch, setVijayawadaSearch] = useState('');
  const [guntakalSearch, setGuntakalSearch] = useState('');

  const applyNameSearch = (tableId, query) => {
    const table = document.querySelector(`[data-table-id="${tableId}"]`);
    if (!table) return;

    const normalizedQuery = String(query || '').trim().toLowerCase();
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach((row) => {
      const nameCell = row.querySelector('td:nth-child(2)');
      if (!nameCell) return;

      const nameText = nameCell.textContent?.toLowerCase() || '';
      row.style.display = !normalizedQuery || nameText.includes(normalizedQuery) ? '' : 'none';
    });
  };

  useEffect(() => {
    applyNameSearch('vijayawada', vijayawadaSearch);
  }, [vijayawadaSearch]);

  useEffect(() => {
    applyNameSearch('guntakal', guntakalSearch);
  }, [guntakalSearch]);

  return (
    <div className="min-h-screen pt-4 bg-[#F8FAFC] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Building2 className="w-12 h-12 text-[#2563EB] mb-4" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">{pageContent.title}</h1>
          <p className="text-base text-[#475569] mt-2">{pageContent.subtitle}</p>
        </div>

        {/* Organization Chart */}
        <Card className="p-6 border border-[#60A5FA] bg-white mb-8">
          <h2 className="text-2xl font-bold heading-font text-[#0F172A] mb-4">{pageContent.chartTitle}</h2>
          <div className="bg-[#F8FAFC] p-4 rounded-md overflow-x-auto">
            <img 
              src={pageContent.chartImageUrl}
              alt="GRP Andhra Pradesh Organization Chart - Complete Hierarchy"
              className="w-full h-auto rounded-md min-w-[320px]"
            />
          </div>
        </Card>

        <Tabs defaultValue="vijayawada" className="w-full">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-4">{pageContent.divisionEyebrow}</p>
            <TabsList className="grid w-full grid-cols-2 gap-3 sm:gap-6 bg-transparent h-auto p-0">
              <TabsTrigger 
                value="vijayawada" 
                data-testid="vijayawada-tab"
                className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-[#0F172A] border-2 border-[#60A5FA] data-[state=active]:border-[#2563EB] rounded-lg px-2 py-2 sm:px-6 sm:py-3 text-xs sm:text-lg font-bold heading-font hover:border-[#2563EB] transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">{pageContent.vijayawadaDivisionLabel}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="guntakal" 
                data-testid="guntakal-tab"
                className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-[#0F172A] border-2 border-[#60A5FA] data-[state=active]:border-[#2563EB] rounded-lg px-2 py-2 sm:px-6 sm:py-3 text-xs sm:text-lg font-bold heading-font hover:border-[#2563EB] transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">{pageContent.guntakalDivisionLabel}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Vijayawada Railway Division */}
          <TabsContent value="vijayawada">
            <Card className="p-4 sm:p-6 border-2 border-[#2563EB] bg-gradient-to-br from-[#EFF6FF] to-white mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <img 
                  src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/79jx7n52_WhatsApp%20Image%202026-03-26%20at%202.27.40%20PM%20%281%29.jpeg"
                  alt="GRP Vijayawada Official Logo"
                  className="w-24 h-24 sm:w-32 sm:h-32 object-contain flex-shrink-0"
                />
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl sm:text-3xl font-extrabold heading-font text-[#0F172A] mb-2">GRP Vijayawada</h2>
                  <p className="text-sm sm:text-base text-[#475569] mb-3">Superintendent of Railway Police</p>
                  <a href="tel:9247585800" className="inline-flex items-center gap-2 text-[#2563EB] font-bold text-base sm:text-lg">
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>9247585800</span>
                  </a>
                </div>
              </div>
            </Card>

            {/* Vijayawada Sub Division */}
            {/* All Sub Divisions in One Table */}
            <Card className="mb-6 p-4 bg-[#F1F5F9] rounded-md">

              <div className="mb-4 justify-between items-center flex">
                <h2 className="text-xl sm:text-3xl font-bold text-[#1E3A5F] mb-3">GRP Vijayawada Stations</h2>
                <input
                  type="text"
                  value={vijayawadaSearch}
                  onChange={(e) => setVijayawadaSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full md:w-96 rounded-md border border-blue-500 bg-white px-4 py-2 text-[#0F172A] outline-none focus:border-[#2563EB]"
                  data-testid="vijayawada-table-search"
                />
              </div>
              <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-[#2563EB] border-2 border-blue-500 rounded-md" data-testid="organization-table" data-table-id="vijayawada">
                <thead>
                  <tr className="font-sans">
                    <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">S.No</th>
                    <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Name</th>
                    <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Incharge</th>
                    <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Mobile No</th>
                  </tr>
                </thead>
                <tbody className="font-sans">
                  {/* Vijayawada Sub Division */}
                  <tr className="bg-[#F1F5F9] font-bold text-[#2563EB]">
                    <td className="px-4 py-2 border border-blue-500">1.</td>
                    <td className="px-4 py-2 border border-blue-500">Vijayawada Sub Division</td>
                    <td className="px-4 py-2 border border-blue-500">DSRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585709</td>
                  </tr>
                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">1</td>
                    <td className="px-4 py-2 border border-blue-500">Vijayawada RPS</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585710</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Vijayawada RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585712</td>
                  </tr>
                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">2</td>
                    <td className="px-4 py-2 border border-blue-500">Vijayawada Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585711</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Gudivada RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585713</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Machilipatnam RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585714</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Eluru RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585769</td>
                  </tr>

                  {/* Guntur Sub Division */}
                  <tr className="bg-[#F1F5F9] font-bold text-[#2563EB]">
                    <td className="px-4 py-2 border border-blue-500">2.</td>
                    <td className="px-4 py-2 border border-blue-500">Guntur Sub Division</td>
                    <td className="px-4 py-2 border border-blue-500">DSRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585715</td>
                  </tr>
                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">1</td>
                    <td className="px-4 py-2 border border-blue-500">Guntur RPS</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585716</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Guntur RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585718</td>
                  </tr>
                   <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">2</td>
                    <td className="px-4 py-2 border border-blue-500">Guntur Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585717</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Narasaraopet RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585720</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Tenali RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585721</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Bapatla RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585722</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Nadikudi RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585723</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Repalle RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585724</td>
                  </tr>

                  {/* Rajahmundry Sub Division */}
                  <tr className="bg-[#F1F5F9] font-bold text-[#2563EB]">
                    <td className="px-4 py-2 border border-blue-500">3.</td>
                    <td className="px-4 py-2 border border-blue-500">Rajahmundry Sub Division</td>
                    <td className="px-4 py-2 border border-blue-500">DSRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585725</td>
                  </tr>
                    <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">1</td>
                    <td className="px-4 py-2 border border-blue-500">Rajahmundry RPS</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585726</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Rajahmundry RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585726</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Godavari RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585734</td>
                  </tr>
                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">2</td>
                    <td className="px-4 py-2 border border-blue-500">Kakinada Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585727</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Samarlakota RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585729</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Kakinada RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585730</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Tuni RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585731</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Annavaram RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585734</td>
                  </tr>
                    <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">3</td>
                    <td className="px-4 py-2 border border-blue-500">Bhimavaram Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585728</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Bhimavaram RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585732</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Tadepalligudem RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585733</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Nidavole RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585735</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Narsapur RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585732</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Tanuku RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585733</td>
                  </tr>

                  {/* Visakhapatnam Sub Division */}
                  <tr className="bg-[#F1F5F9] font-bold text-[#2563EB]">
                    <td className="px-4 py-2 border border-blue-500">4.</td>
                    <td className="px-4 py-2 border border-blue-500">Visakhapatnam Sub Division</td>
                    <td className="px-4 py-2 border border-blue-500">DSRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585736</td>
                  </tr>
                   <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">1</td>
                    <td className="px-4 py-2 border border-blue-500">Visakhapatnam RPS</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585737</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Visakhapatnam RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585739</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Duvvada RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585741</td>
                  </tr>
                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">2</td>
                    <td className="px-4 py-2 border border-blue-500">Visakhapatnam Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585738</td>
                  </tr>

                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Vizianagaram RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585742</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Parvathipuram RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585746</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Bobbili RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585745</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Palasa RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585743</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Srikakulam RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247585744</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </Card>

            {/* Special Units */}}
            <Card className="p-6 border-2 border-[#D97706] bg-[#FFF7ED] mt-6">
              <h3 className="text-xl font-bold heading-font text-[#0F172A] mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#D97706]" />
                Special Units - GRP Vijayawada
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">IRP RCRB</span>
                  <a href="tel:9247585755" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585755</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">RCRB Vijayawada</span>
                  <a href="tel:9247585749" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585749</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">SB Vijayawada</span>
                  <a href="tel:9247585750" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585750</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">IT Core Team</span>
                  <a href="tel:9247585751" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585751 / 5752</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">RI RPAR Vijayawada</span>
                  <a href="tel:9247585747" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585747</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">RI RPAR Duty ORSI</span>
                  <a href="tel:9247585748" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585748</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">SRP CC Vijayawada</span>
                  <a href="tel:9247585758" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585758</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">SRP AO Vijayawada</span>
                  <a href="tel:9247585760" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585760</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">SRP B Supdt Vijayawada</span>
                  <a href="tel:9247585759" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585759</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">SRP A Supdt Vijayawada</span>
                  <a href="tel:9247585761" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585761</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA] col-span-1 md:col-span-2">
                  <span className="font-semibold text-[#0F172A]">SRP Store Supdt Vijayawada</span>
                  <a href="tel:9247585753" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247585753</span>
                  </a>
                </div>
              </div>
            </Card>
          </TabsContent>


          {/* Guntakal District */}
          <TabsContent value="guntakal">
            <Card className="p-4 sm:p-6 border-2 border-blue-500 bg-gradient-to-br from-[#FEF2F3] to-white mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <img 
                  src="https://customer-assets.emergentagent.com/job_railway-security-app/artifacts/xtv6zw6n_WhatsApp%20Image%202026-03-26%20at%202.46.38%20PM.jpeg"
                  alt="GRP Guntakal Official Logo"
                  className="w-24 h-24 sm:w-32 sm:h-32 object-contain bg-white p-2 rounded-md flex-shrink-0"
                />
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl sm:text-3xl font-extrabold heading-font text-[#0F172A] mb-2">GRP Guntakal</h2>
                  <p className="text-sm sm:text-base text-[#475569] mb-3">Superintendent of Railway Police</p>
                  <div className="space-y-2">
                    <a href="tel:9247575601" className="inline-flex items-center gap-2 text-[#2563EB] font-bold text-base sm:text-lg">
                      <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>SRP: 9247575601</span>
                    </a>
                  </div>
                </div>
              </div>
            </Card>

            {/* All Sub Divisions in One Table */}
            <Card className="mb-6 p-4 bg-[#F1F5F9] rounded-md">
              <div className="mb-4 justify-between items-center flex">
                <h2 className="text-xl sm:text-3xl font-bold text-[#1E3A5F] mb-3">GRP Guntakal Stations</h2>
                <input
                  type="text"
                  value={guntakalSearch}
                  onChange={(e) => setGuntakalSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full md:w-96 rounded-md border border-blue-500 bg-white px-4 py-2 text-[#0F172A] outline-none focus:border-[#2563EB]"
                  data-testid="guntakal-table-search"
                />
              </div>
              <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-[#2563EB] border-2 border-blue-500 rounded-md" data-testid="organization-table" data-table-id="guntakal">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">S.No</th>
                    <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Name</th>
                    <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Incharge</th>
                    <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Mobile No</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Guntakal Sub Division */}
                  <tr className="bg-[#F1F5F9] font-bold text-[#2563EB]">
                    <td className="px-4 py-2 border border-blue-500">1.</td>
                    <td className="px-4 py-2 border border-blue-500">Guntakal Sub Division</td>
                    <td className="px-4 py-2 border border-blue-500">DSRP</td>
                    <td className="px-4 py-2 border border-blue-500"><a href="tel:9247575603" className="text-[#2563EB] underline">9247575603</a></td>
                  </tr>
                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">1</td>
                    <td className="px-4 py-2 border border-blue-500">Guntakal Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575604</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Guntakal RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575605</td>
                  </tr>
                      <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Rayadurgam RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575614</td>
                  </tr>  
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Gooty RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575606</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Tadipatri RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575647</td>
                  </tr>  
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Adoni RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575607</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Mantralayam RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575640</td>
                  </tr>  

                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">2</td>
                    <td className="px-4 py-2 border border-blue-500">Kurnool Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575608</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Kurnool RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575609</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Dhone RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575610</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Nandyala RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575611</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Markapuram RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575643</td>
                  </tr>     
                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">3</td>
                    <td className="px-4 py-2 border border-blue-500">Dharmavaram Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575612</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Ananthapuram RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575613</td>
                  </tr>
  
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Dharmavaram RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575614</td>
                  </tr>
                     <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Kadiri RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575616</td>
                  </tr> 
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Hindhupuram RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575615</td>
                  </tr>
                         
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Puttaparthi RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575644</td>
                  </tr>  


                  {/* Tirupati Sub Division */}
                  <tr className="bg-[#F1F5F9] font-bold text-[#2563EB]">
                    <td className="px-4 py-2 border border-blue-500">2.</td>
                    <td className="px-4 py-2 border border-blue-500">Tirupati Sub Division</td>
                    <td className="px-4 py-2 border border-blue-500">DSRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575617</td>
                  </tr>
                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">1</td>
                    <td className="px-4 py-2 border border-blue-500">Tirupati Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575618</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Tirupati RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575619</td>
                  </tr>
                  <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">2</td>
                    <td className="px-4 py-2 border border-blue-500">Renigunta Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575620</td>
                  </tr>
                      <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Renigunta RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575621</td>
                  </tr>
                                          <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Putturu RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585724</td>
                  </tr>
                    
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Srikalahasthi RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575649</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Chittoor RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575622</td>
                  </tr> 
              
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Pakala RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575650</td>
                  </tr>
                      <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Kuppam RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575642</td>
                  </tr> 
                   
                    <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">3</td>
                    <td className="px-4 py-2 border border-blue-500">Kadapa Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575623</td>
                  </tr>
        
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Kadapa RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575624</td>
                  </tr>

                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Yerraguntla RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575625</td>
                  </tr>


                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Nandaluru RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247585724</td>
                  </tr>


                  {/* Nellore Sub Division */}
                  <tr className="bg-[#F1F5F9] font-bold text-[#2563EB]">
                    <td className="px-4 py-2 border border-blue-500">3.</td>
                    <td className="px-4 py-2 border border-blue-500">Nellore Sub Division</td>
                    <td className="px-4 py-2 border border-blue-500">DSRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575626</td>
                  </tr>
                    <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">1</td>
                    <td className="px-4 py-2 border border-blue-500">Nellore Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575627</td>
                  </tr>
                                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Nellore RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575628</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Krishnapatnam RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575628</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Gudur RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575629</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Sullurupet RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575648</td>
                  </tr>
                  
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Kavali RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575630</td>
                  </tr>
                    <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Bitragunta RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575628</td>
                  </tr>

                    <tr className="bg-[#F1F5F9] font-bold text-[#D97706]">
                    <td className="px-4 py-2 border border-blue-500">2</td>
                    <td className="px-4 py-2 border border-blue-500">Ongole Circle</td>
                    <td className="px-4 py-2 border border-blue-500">IRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575631</td>
                  </tr>

                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Ongole RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575632</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Singarayakonda RPOP</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">HC</td>
                    <td className="px-4 py-2 border border-blue-500">9247575632</td>
                  </tr>
                  <tr className="bg-white hover:bg-[#F8FAFC] text-[#0F172A]">
                    <td className="px-4 py-2 border border-blue-500"></td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">Chirala RPS</td>
                    <td className="px-4 py-2 border border-blue-500 font-semibold">SIRP</td>
                    <td className="px-4 py-2 border border-blue-500">9247575633</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </Card>

            {/* Special Units Guntakal */}
            <Card className="p-6 border-2 border-[#D97706] bg-[#FFF7ED] mt-6">
              <h3 className="text-xl font-bold heading-font text-[#0F172A] mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#D97706]" />
                Special Units - GRP Guntakal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">RI, RPAR, GTL (GRP DAR)</span>
                  <a href="tel:9247575634" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575634</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">RSI Kadapa (VIP/NRO duties)</span>
                  <a href="tel:9247575635" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575635</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">RSI Dhone (VIP/NRO duties)</span>
                  <a href="tel:9247575636" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575636</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">RSI NDL (VIP/NRO duties)</span>
                  <a href="tel:9247575637" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575637</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">RSI TPT (VIP/NRO duties)</span>
                  <a href="tel:9247575638" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575638</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">RSI DMM (VIP/NRO duties)</span>
                  <a href="tel:9247575639" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575639</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">CC to SRP, GTL (Control Room)</span>
                  <a href="tel:9247575645" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575645</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">IT Core Team, GTL</span>
                  <a href="tel:9247575646" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575646</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">Special Branch (RSB, GTL)</span>
                  <a href="tel:9247575640" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575640</span>
                  </a>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-[#60A5FA]">
                  <span className="font-semibold text-[#0F172A]">Crime Records Bureau (RCRB, GTL)</span>
                  <a href="tel:9247575641" className="flex items-center gap-1 text-[#2563EB]">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">9247575641</span>
                  </a>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
