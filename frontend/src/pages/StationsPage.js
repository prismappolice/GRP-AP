import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Navigation } from 'lucide-react';
import { stationsList } from '../data/stations';

export const StationsPage = () => {
  const [search, setSearch] = useState('');

  // No need to load stations from API, using static data

  const filteredStations = stationsList.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.district.toLowerCase().includes(search.toLowerCase())
  );

  const openInMaps = (station) => {
    const lat = station.lat ?? station.latitude;
    const lng = station.lng ?? station.longitude;
    const query = lat != null && lng != null
      ? `${lat},${lng}`
      : station.address;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <div className="min-h-screen pt-24 bg-[#F8FAFC] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <MapPin className="w-12 h-12 text-[#2563EB] mb-4" />
          <h1 className="text-4xl font-extrabold heading-font text-[#0F172A]">GRP Station Locator</h1>
          <p className="text-base text-[#475569] mt-2">Find your nearest GRP station</p>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Search by station name or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
            data-testid="search-station-input"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStations.map((station) => (
            <Card key={station.id} className="p-6 border border-[#E2E8F0] bg-white hover:shadow-lg transition-shadow" data-testid="station-card">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-[#2563EB] rounded-md flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-[#0F172A]">{station.name}</h3>
                  <p className="text-sm text-[#475569]">{station.district}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-[#475569] mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{station.address}</p>
                </div>
                {station.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${station.phone}`} className="text-[#2563EB] hover:underline">{station.phone}</a>
                  </div>
                )}
                {/* Email removed as requested */}
              </div>
              <Button 
                onClick={() => openInMaps(station)}
                className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white"
                data-testid="view-on-map-button"
              >
                <Navigation className="w-4 h-4 mr-2" />
                View on Map
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
