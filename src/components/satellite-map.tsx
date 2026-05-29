import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Polygon, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import type { Parcel } from "@/lib/api";

type ParcelMapProps = {
  historic: number;
  activeLayer: string;
  basemap: "Satellite" | "Hybrid" | "Terrain";
  parcels: Parcel[];
  districtFilter: string;
  mandalFilter: string;
  districtGeoJson: unknown;
  mandalGeoJson: unknown;
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
};

const RISK_STYLES: Record<string, { stroke: string; fill: string; opacity: number }> = {
  healthy: { stroke: "oklch(0.78 0.19 145)", fill: "oklch(0.78 0.19 145)", opacity: 0.25 },
  moderate: { stroke: "oklch(0.82 0.17 80)", fill: "oklch(0.82 0.17 80)", opacity: 0.28 },
  warning: { stroke: "oklch(0.68 0.22 25)", fill: "oklch(0.68 0.22 25)", opacity: 0.3 },
};

function geometryToLeafletPositions(parcel: Parcel): [number, number][] {
  if (parcel.geometry?.type === "Polygon") {
    const outerRing = parcel.geometry.coordinates[0] ?? [];
    if (outerRing.length > 0) {
      return outerRing.map(([lng, lat]) => [lat, lng]);
    }
  }

  return parcel.outline;
}

function labelForFeature(feature: GeoJSON.Feature | undefined, fallback: string) {
  const properties = (feature?.properties ?? {}) as Record<string, unknown>;
  return (
    (typeof properties.sdtname === "string" && properties.sdtname) ||
    (typeof properties.NAME === "string" && properties.NAME) ||
    (typeof properties.dtname === "string" && properties.dtname) ||
    fallback
  );
}

function ZoomToSelection({ geoJson, enabled }: { geoJson: unknown; enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !geoJson) return;
    const bounds = L.geoJSON(geoJson as GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.08), { animate: true, duration: 0.8 });
    }
  }, [enabled, geoJson, map]);

  return null;
}

export function SatelliteMap({
  historic,
  activeLayer,
  basemap,
  parcels,
  districtFilter,
  mandalFilter,
  districtGeoJson,
  mandalGeoJson,
  selectedParcelId,
  onSelectParcel,
}: ParcelMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [imageryFallback, setImageryFallback] = useState(false);

  const parcelsWithBand = useMemo(() => {
    return parcels.map((parcel, index) => {
      const drift = Math.sin((historic + parcel.lat) * 0.6 + index * 0.17) * 0.08;
      const ndvi = Math.max(0, Math.min(1, parcel.ndvi + drift));
      const healthBand = parcel.health >= 75 ? "healthy" : parcel.health >= 60 ? "moderate" : "warning";
      return { ...parcel, ndvi, healthBand };
    });
  }, [historic, parcels]);

  const layerScale = (parcel: (typeof parcelsWithBand)[number]) => {
    if (activeLayer === "Disease Probability" || activeLayer === "Anomaly Hotspots") {
      return 1 - parcel.health / 100;
    }
    if (activeLayer === "Vegetation Stress") {
      return 1 - parcel.ndvi;
    }
    if (activeLayer === "Soil Moisture") {
      return Math.min(1, 0.35 + parcel.ndvi * 0.45);
    }
    if (activeLayer === "EVI") {
      return Math.min(1, parcel.evi);
    }
    if (activeLayer === "NDRE") {
      return Math.min(1, parcel.ndre);
    }
    return parcel.ndvi;
  };

  const styleFor = (parcel: (typeof parcelsWithBand)[number]) => {
    const scale = layerScale(parcel);
    const base = RISK_STYLES[parcel.healthBand];
    const selected = selectedParcelId === parcel.id;

    return {
      color: selected ? "oklch(0.72 0.18 260)" : base.stroke,
      fillColor: selected ? "oklch(0.72 0.18 260)" : base.fill,
      fillOpacity: selected ? 0.42 : base.opacity + scale * 0.18,
      weight: selected ? 2.5 : 1.3,
    };
  };

  const selectedParcel = parcelsWithBand.find((parcel) => parcel.id === selectedParcelId) ?? null;

  const selectedDistrictGeoJson = useMemo(() => {
    if (!districtGeoJson || districtFilter === "all") return districtGeoJson;
    const geojson = districtGeoJson as { features?: Array<{ properties?: { NAME?: string } }> };
    return {
      ...(districtGeoJson as Record<string, unknown>),
      features: (geojson.features ?? []).filter((feature) => feature?.properties?.NAME === districtFilter),
    };
  }, [districtFilter, districtGeoJson]);

  const selectedMandalGeoJson = useMemo(() => {
    if (!mandalGeoJson) return mandalGeoJson;
    const geojson = mandalGeoJson as { features?: Array<{ properties?: { dtname?: string; sdtname?: string } }> };
    return {
      ...(mandalGeoJson as Record<string, unknown>),
      features: (geojson.features ?? []).filter((feature) => {
        if (districtFilter !== "all" && feature?.properties?.dtname !== districtFilter) return false;
        return mandalFilter === "all" || feature?.properties?.sdtname === mandalFilter;
      }),
    };
  }, [districtFilter, mandalFilter, mandalGeoJson]);

  useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setImageryFallback(false);
  }, [basemap]);

  useEffect(() => {
    if (!selectedParcel) return;
    const bounds = L.polygon(geometryToLeafletPositions(selectedParcel)).getBounds();
    if (bounds.isValid()) {
      mapRef.current?.fitBounds(bounds.pad(0.18), { animate: true, duration: 0.8 });
    }
  }, [selectedParcel]);

  return (
    <MapContainer
      className={`basemap-${basemap.toLowerCase()}`}
      center={[16.5, 80.5]}
      zoom={7}
      zoomControl={false}
      ref={(map) => {
        if (map) mapRef.current = map;
      }}
      style={{ height: "100%", width: "100%" }}
    >
      {basemap === "Satellite" && !imageryFallback ? (
        <>
          <TileLayer
            key="satellite-imagery"
            attribution='Tiles &copy; Esri'
            url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            crossOrigin="anonymous"
            eventHandlers={{
              tileerror: () => setImageryFallback(true),
            }}
          />
          <TileLayer
            key="satellite-labels"
            attribution='Labels &copy; Esri'
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.95}
            crossOrigin="anonymous"
            eventHandlers={{
              tileerror: () => setImageryFallback(true),
            }}
          />
        </>
      ) : null}

      {basemap === "Hybrid" && !imageryFallback ? (
        <>
          <TileLayer
            key="hybrid-satellite"
            attribution='Tiles &copy; Esri'
            url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            crossOrigin="anonymous"
            eventHandlers={{
              tileerror: () => setImageryFallback(true),
            }}
          />
          <TileLayer
            key="hybrid-labels"
            attribution='Labels &copy; Esri'
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.9}
            crossOrigin="anonymous"
            eventHandlers={{
              tileerror: () => setImageryFallback(true),
            }}
          />
        </>
      ) : null}

      {imageryFallback && (basemap === "Satellite" || basemap === "Hybrid") ? (
        <TileLayer
          key={`${basemap.toLowerCase()}-fallback`}
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
        />
      ) : null}

      {basemap === "Terrain" ? (
        <TileLayer
          key="terrain"
          attribution='Map data &copy; OpenStreetMap contributors, Tiles &copy; OpenTopoMap'
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
        />
      ) : null}
      <ZoomControl position="topright" />

      <ZoomToSelection geoJson={selectedDistrictGeoJson} enabled={districtFilter !== "all"} />
      <ZoomToSelection geoJson={selectedMandalGeoJson} enabled={mandalFilter !== "all"} />

      {districtGeoJson ? (
        <GeoJSON
          data={districtGeoJson as GeoJsonObject}
          style={(feature) => ({
            color: feature?.properties?.NAME === districtFilter ? "oklch(0.72 0.18 260)" : "oklch(0.7 0.04 250)",
            weight: feature?.properties?.NAME === districtFilter ? 2.2 : 1,
            fillOpacity: 0.02,
            opacity: 0.55,
          })}
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(labelForFeature(feature, "District"), {
              sticky: true,
              direction: "center",
              opacity: 0.95,
            });
          }}
        />
      ) : null}

      {mandalGeoJson ? (
        <GeoJSON
          data={mandalGeoJson as GeoJsonObject}
          style={(feature) => ({
            color:
              districtFilter === "all" || feature?.properties?.dtname === districtFilter
                ? feature?.properties?.sdtname === mandalFilter
                  ? "oklch(0.72 0.18 260)"
                  : "oklch(0.72 0.08 230)"
                : "oklch(0.7 0.04 250)",
            weight: mandalFilter === "all" ? 0.9 : feature?.properties?.sdtname === mandalFilter ? 1.6 : 0.9,
            fillOpacity: 0,
            opacity: 0.28,
          })}
          onEachFeature={(feature, layer) => {
            layer.bindTooltip(labelForFeature(feature, "Mandal"), {
              sticky: true,
              direction: "center",
              opacity: 0.95,
            });
          }}
        />
      ) : null}

      {parcelsWithBand.map((parcel) => (
        <Polygon
          key={parcel.id}
          positions={geometryToLeafletPositions(parcel)}
          pathOptions={styleFor(parcel)}
          eventHandlers={{
            click: () => onSelectParcel(parcel.id),
          }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={1} sticky>
            <div className="text-[11px] space-y-0.5">
              <div className="font-semibold">
                {parcel.id} · {parcel.crop}
              </div>
              <div>Farmer: {parcel.farmer}</div>
              <div>
                {parcel.district} · {parcel.mandal} · {parcel.acreage} ac
              </div>
              <div>
                Health {parcel.health}% · NDVI {parcel.ndvi.toFixed(2)} · {parcel.risk}
              </div>
            </div>
          </Tooltip>
        </Polygon>
      ))}

      {selectedParcel ? (
        <CircleMarker
          center={[selectedParcel.lat, selectedParcel.lng]}
          radius={5}
          pathOptions={{
            color: "oklch(0.72 0.18 260)",
            fillColor: "oklch(0.72 0.18 260)",
            fillOpacity: 1,
            weight: 1,
          }}
        />
      ) : null}
    </MapContainer>
  );
}
