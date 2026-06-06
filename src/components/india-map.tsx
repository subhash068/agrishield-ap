import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface IndiaMapProps {
  data: Record<string, number>;
  year: string;
  maxProduction: number;
}

export function IndiaMap({ data, year, maxProduction }: IndiaMapProps) {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // Fetch a public India States GeoJSON
    fetch('https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States')
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error fetching GeoJSON:", err));
  }, []);

  // Function to determine color based on production value
  const getColor = (d: number) => {
    if (!d) return '#f4f4f5'; // default empty state (zinc-100)
    
    // Calculate percentage of max
    const percentage = d / maxProduction;
    
    // Color scale similar to the image (yellow -> orange -> red -> dark green)
    if (percentage > 0.8) return '#0f766e'; // teal-700
    if (percentage > 0.6) return '#10b981'; // emerald-500
    if (percentage > 0.4) return '#eab308'; // yellow-500
    if (percentage > 0.2) return '#ef4444'; // red-500
    return '#fda4af'; // rose-300
  };

  const style = (feature: any) => {
    // Normalizing state name to match our data
    let stateName = feature.properties.NAME_1;
    // Handle aliases
    if (stateName === "Andaman and Nicobar") stateName = "Andaman and Nicobar Islands";
    if (stateName === "Orissa") stateName = "Odisha";
    if (stateName === "Uttaranchal") stateName = "Uttarakhand";
    
    const production = data[stateName] || 0;

    return {
      fillColor: getColor(production),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.8
    };
  };

  if (!geoData) {
    return <div className="w-full h-full flex items-center justify-center bg-muted/20">Loading Map...</div>;
  }

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[21.5937, 78.9629]}
        zoom={3.8}
        zoomSnap={0.1}
        style={{ height: '100%', width: '100%', background: 'transparent' }}
        zoomControl={false}
      >
        <GeoJSON
          key={year + '-' + Object.keys(data).length}
          data={geoData}
          style={style}
          onEachFeature={(feature, layer) => {
            let stateName = feature.properties.NAME_1;
            if (stateName === "Andaman and Nicobar") stateName = "Andaman and Nicobar Islands";
            if (stateName === "Orissa") stateName = "Odisha";
            if (stateName === "Uttaranchal") stateName = "Uttarakhand";

            const production = data[stateName] || 0;
            
            layer.bindTooltip(`
              <div style="background: #2a2a2a; color: white; padding: 10px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-family: sans-serif; font-size: 13px; line-height: 1.4;">
                <div style="border-bottom: 1px solid #444; margin-bottom: 5px; padding-bottom: 4px;">
                  <strong>State: ${stateName}</strong>
                </div>
                <div>Major Crops: Rice</div>
                <div>Production: <strong>${production.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Lakh Tonnes</strong></div>
                <div style="font-size: 11px; color: #aaa; margin-top: 4px;"><em>Click for change over time</em></div>
              </div>
            `, { sticky: true, className: 'custom-tooltip' });
          }}
        />
      </MapContainer>

      {/* Legend */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[1000] bg-white/90 backdrop-blur rounded p-2 shadow-sm text-xs font-medium border border-border/50 flex flex-col gap-1 items-center">
        <span>{Math.round(maxProduction)}</span>
        <div className="w-4 h-32 rounded-full" style={{
          background: 'linear-gradient(to bottom, #0f766e, #10b981, #eab308, #ef4444, #fda4af)'
        }}></div>
        <span>0</span>
      </div>
    </div>
  );
}
