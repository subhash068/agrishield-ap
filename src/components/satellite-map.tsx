import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from "react-leaflet";
import L from "leaflet";

type Parcel = {
  id: string;
  crop: string;
  farmer: string;
  district: string;
  mandal: string;
  acreage: number;
  ndvi: number;
  health: number;
  risk: string;
  lat: number;
  lng: number;
};

export function SatelliteMap({ historic, activeLayer, parcels: inputParcels }: { historic: number; activeLayer: string; parcels: Parcel[] }) {
  const mapRef = useRef<L.Map | null>(null);

  // colour parcels based on the active layer + historic offset
  const parcels = useMemo(() => {
    return inputParcels.map(p => {
      const drift = Math.sin((historic + p.lat) * 0.6) * 0.1;
      const v = Math.max(0, Math.min(1, p.ndvi + drift));
      return { ...p, v };
    });
  }, [historic, inputParcels]);

  const colorFor = (v: number) => {
    if (activeLayer === "Disease Probability" || activeLayer === "Anomaly Hotspots") {
      // invert: higher = more red
      const t = 1 - v;
      return t > 0.7 ? "oklch(0.68 0.22 25)" : t > 0.4 ? "oklch(0.82 0.17 80)" : "oklch(0.78 0.19 145)";
    }
    return v > 0.6 ? "oklch(0.78 0.19 145)" : v > 0.4 ? "oklch(0.78 0.17 200)" : v > 0.25 ? "oklch(0.82 0.17 80)" : "oklch(0.68 0.22 25)";
  };

  useEffect(() => {
    // ensure map invalidates after mount (sidebar shrinks container)
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <MapContainer
      center={[16.5, 80.5]}
      zoom={7}
      zoomControl={false}
      ref={(m) => { if (m) mapRef.current = m; }}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />

      {parcels.map(p => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={5 + p.v * 6}
          pathOptions={{
            color: colorFor(p.v),
            fillColor: colorFor(p.v),
            fillOpacity: 0.55,
            weight: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={1}>
            <div className="text-[11px]">
              <div className="font-semibold">{p.id} · {p.crop}</div>
              <div>Farmer: {p.farmer}</div>
              <div>{p.district} · {p.mandal} · {p.acreage} ac</div>
              <div>NDVI: {p.v.toFixed(2)} · Health {p.health}% · {p.risk}</div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
