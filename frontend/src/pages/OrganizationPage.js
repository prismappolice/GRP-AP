import React, { useMemo, useState } from 'react';
import { stations } from '../data/stations';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, MapPin, Building2 } from 'lucide-react';
import { useStaticPageContent } from '@/lib/staticPageContent';

const normalize = (value) => String(value || '').trim().toLowerCase();
const cleanPhone = (value) => String(value || '').trim();
const divisionLabel = (division) => `${division} Division`;

const findCredential = (credentials, role, filters) =>
  credentials.find((credential) => {
    if (normalize(credential.role) !== role) return false;
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      return normalize(credential[key]) === normalize(value);
    });
  });

const displayName = (unitName, credential) => credential?.name || unitName;
const displayPhone = (fallbackPhone, credential) => cleanPhone(credential?.phone) || cleanPhone(fallbackPhone) || '-';

const buildDivisionRows = (division, credentials) => {
  const divisionName = division.division;
  const srpCredential = findCredential(credentials, 'srp', { division: divisionName })
    || findCredential(credentials, 'srp', { division: divisionLabel(divisionName) });
  const rows = [{
    key: `${divisionName}-srp`,
    level: 'division',
    unit: divisionLabel(divisionName),
    name: displayName(`SRP ${divisionName}`, srpCredential),
    incharge: 'SRP',
    phone: displayPhone('', srpCredential),
  }];

  (division.subdivisions || []).forEach((subdivision, subIndex) => {
    const dsrpCredential = findCredential(credentials, 'dsrp', {
      division: divisionName,
      subdivision: subdivision.name,
    }) || findCredential(credentials, 'dsrp', { subdivision: subdivision.name });

    rows.push({
      key: `${divisionName}-${subdivision.name}`,
      level: 'subdivision',
      unit: subdivision.name,
      name: displayName(subdivision.name, dsrpCredential),
      incharge: 'DSRP',
      phone: displayPhone('', dsrpCredential),
      serial: `${subIndex + 1}.`,
    });

    (subdivision.circles || []).forEach((circle, circleIndex) => {
      const irpCredential = findCredential(credentials, 'irp', {
        subdivision: subdivision.name,
        circle: circle.name,
      }) || findCredential(credentials, 'irp', { circle: circle.name });

      rows.push({
        key: `${divisionName}-${subdivision.name}-${circle.name}`,
        level: 'circle',
        unit: circle.name,
        name: displayName(circle.name, irpCredential),
        incharge: 'IRP',
        phone: displayPhone(circle.phone, irpCredential),
        serial: circleIndex + 1,
      });

      (circle.stations || []).forEach((station) => {
        const stationCredential = findCredential(credentials, 'station', {
          circle: circle.name,
          station_name: station.name,
        }) || findCredential(credentials, 'station', { station_name: station.name })
          || findCredential(credentials, 'station', { circle: circle.name, name: station.name });

        rows.push({
          key: `${divisionName}-${subdivision.name}-${circle.name}-${station.name}`,
          level: 'station',
          unit: station.name,
          name: displayName(station.name, stationCredential),
          incharge: station.rank || station.incharge || 'Station',
          phone: displayPhone(station.phone, stationCredential),
        });
      });

      credentials
        .filter((credential) =>
          normalize(credential.role) === 'station'
          && normalize(credential.circle) === normalize(circle.name)
          && !(circle.stations || []).some((station) =>
            normalize(station.name) === normalize(credential.station_name)
            || normalize(station.name) === normalize(credential.name)
          )
        )
        .forEach((credential) => {
          rows.push({
            key: `${divisionName}-${subdivision.name}-${circle.name}-${credential.name}`,
            level: 'station',
            unit: credential.station_name || credential.name,
            name: credential.name,
            incharge: 'Station',
            phone: displayPhone('', credential),
          });
        });
    });
  });

  return rows;
};

const rowClass = {
  division: 'bg-[#DBEAFE] font-bold text-[#1D4ED8]',
  subdivision: 'bg-[#EFF6FF] font-bold text-[#2563EB]',
  circle: 'bg-[#FFF7ED] font-bold text-[#D97706]',
  station: 'bg-white hover:bg-[#F8FAFC] text-[#0F172A]',
};

const OrganizationTable = ({ division, credentials, search }) => {
  const rows = useMemo(() => buildDivisionRows(division, credentials), [division, credentials]);
  const filteredRows = rows.filter((row) => {
    const query = normalize(search);
    if (!query) return true;
    return [row.unit, row.name, row.incharge, row.phone].some((value) => normalize(value).includes(query));
  });

  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full divide-y divide-[#2563EB] border-2 border-blue-500 rounded-md" data-testid="organization-table">
        <thead>
          <tr className="font-sans bg-[#F8FAFC]">
            <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">S.No</th>
            <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Unit</th>
            <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Name</th>
            <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Incharge</th>
            <th className="px-4 py-2 text-left font-extrabold text-[#0F172A] border border-blue-500">Mobile No</th>
          </tr>
        </thead>
        <tbody className="font-sans">
          {filteredRows.map((row, index) => (
            <tr key={row.key} className={rowClass[row.level]}>
              <td className="px-4 py-2 border border-blue-500">{row.serial || (row.level === 'station' ? '' : index + 1)}</td>
              <td className="px-4 py-2 border border-blue-500">{row.unit}</td>
              <td className="px-4 py-2 border border-blue-500 font-semibold">{row.name}</td>
              <td className="px-4 py-2 border border-blue-500">{row.incharge}</td>
              <td className="px-4 py-2 border border-blue-500">
                {row.phone !== '-' ? (
                  <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 text-[#2563EB] font-semibold">
                    <Phone className="w-4 h-4" />
                    {row.phone}
                  </a>
                ) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const OrganizationPage = () => {
  const pageContent = useStaticPageContent('organization');
  const credentials = [];
  const [searchByDivision, setSearchByDivision] = useState({});

  return (
    <div className="min-h-screen pt-12 bg-[#F8FAFC] pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Building2 className="w-12 h-12 text-[#2563EB] mb-4" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">{pageContent.title}</h1>
          <p className="text-base text-[#475569] mt-2">{pageContent.subtitle}</p>
        </div>

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

        <Tabs defaultValue={normalize(stations[0]?.division)} className="w-full">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#D97706] mb-4">{pageContent.divisionEyebrow}</p>
            <TabsList className="grid w-full grid-cols-2 gap-3 sm:gap-6 bg-transparent h-auto p-0">
              {stations.map((division) => (
                <TabsTrigger
                  key={division.division}
                  value={normalize(division.division)}
                  className="data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-[#0F172A] border-2 border-[#60A5FA] data-[state=active]:border-[#2563EB] rounded-lg px-2 py-2 sm:px-6 sm:py-3 text-xs sm:text-lg font-bold heading-font hover:border-[#2563EB] transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">GRP {division.division}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {stations.map((division) => {
            const search = searchByDivision[division.division] || '';
            return (
              <TabsContent key={division.division} value={normalize(division.division)}>
                <Card className="p-4 sm:p-6 border-2 border-[#2563EB] bg-gradient-to-br from-[#EFF6FF] to-white mb-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl sm:text-3xl font-extrabold heading-font text-[#0F172A] mb-2">GRP {division.division}</h2>
                      <p className="text-sm sm:text-base text-[#475569]">Public organization structure and station contact details.</p>
                    </div>
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearchByDivision((prev) => ({ ...prev, [division.division]: event.target.value }))}
                      placeholder="Search..."
                      className="w-full rounded-md border border-blue-500 bg-white px-4 py-2 text-[#0F172A] outline-none focus:border-[#2563EB] sm:w-80"
                    />
                  </div>
                </Card>

                <Card className="mb-6 p-4 bg-[#F1F5F9] rounded-md">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1E3A5F] mb-4">GRP {division.division} Structure</h3>
                  <OrganizationTable division={division} credentials={credentials} search={search} />
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};
