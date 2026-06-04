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
  villageFilter: string;
  districtGeoJson: unknown;
  mandalGeoJson: unknown;
  villageGeoJson: unknown;
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
  onSelectVillage?: (villageName: string) => void;
};

const RISK_STYLES: Record<string, { stroke: string; fill: string; opacity: number }> = {
  healthy: { stroke: "oklch(0.78 0.19 145)", fill: "oklch(0.78 0.19 145)", opacity: 0.25 },
  moderate: { stroke: "oklch(0.82 0.17 80)", fill: "oklch(0.82 0.17 80)", opacity: 0.28 },
  warning: { stroke: "oklch(0.68 0.22 25)", fill: "oklch(0.68 0.22 25)", opacity: 0.3 },
};

const LAYER_PALETTES: Record<
  string,
  { low: string; mid: string; high: string; glow: string; label: string; unit: string }
> = {
  NDVI: {
    low: "oklch(0.58 0.08 145)",
    mid: "oklch(0.72 0.16 145)",
    high: "oklch(0.84 0.20 145)",
    glow: "oklch(0.78 0.19 145)",
    label: "Vegetation vigor",
    unit: "index",
  },
  EVI: {
    low: "oklch(0.54 0.08 205)",
    mid: "oklch(0.69 0.15 205)",
    high: "oklch(0.83 0.18 205)",
    glow: "oklch(0.78 0.17 200)",
    label: "Canopy enhancement",
    unit: "index",
  },
  NDRE: {
    low: "oklch(0.56 0.10 290)",
    mid: "oklch(0.68 0.17 290)",
    high: "oklch(0.82 0.20 290)",
    glow: "oklch(0.70 0.20 290)",
    label: "Chlorophyll stress",
    unit: "index",
  },
  "Soil Moisture": {
    low: "oklch(0.52 0.10 235)",
    mid: "oklch(0.66 0.16 235)",
    high: "oklch(0.82 0.20 235)",
    glow: "oklch(0.78 0.17 220)",
    label: "Moisture balance",
    unit: "index",
  },
  "Vegetation Stress": {
    low: "oklch(0.60 0.10 85)",
    mid: "oklch(0.76 0.17 55)",
    high: "oklch(0.70 0.22 28)",
    glow: "oklch(0.82 0.17 80)",
    label: "Stress pressure",
    unit: "ratio",
  },
  "Anomaly Hotspots": {
    low: "oklch(0.60 0.10 35)",
    mid: "oklch(0.74 0.18 35)",
    high: "oklch(0.68 0.22 25)",
    glow: "oklch(0.68 0.22 25)",
    label: "Outlier detection",
    unit: "score",
  },
  "Disease Probability": {
    low: "oklch(0.56 0.10 15)",
    mid: "oklch(0.68 0.18 15)",
    high: "oklch(0.60 0.24 20)",
    glow: "oklch(0.68 0.22 25)",
    label: "Disease risk",
    unit: "probability",
  },
};

const DISTRICT_ALIASES: Record<string, string> = {
  "Sri Potti Sriramulu Nellore": "Nellore",
  "Sri Potti Sriramulu Nellore District": "Nellore",
  "Y.S.R.": "YSR Kadapa",
  "Y.S.R": "YSR Kadapa",
  "Y.S.R. Kadapa": "YSR Kadapa",
  "Y.S.R Kadapa": "YSR Kadapa",
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

function normalizeDistrictName(name: string | undefined | null) {
  if (!name) return "";
  const trimmed = name.trim();
  return DISTRICT_ALIASES[trimmed] ?? trimmed;
}

function scoreForLayer(parcel: Parcel, activeLayer: string) {
  switch (activeLayer) {
    case "EVI":
      return parcel.analytics.evi;
    case "NDRE":
      return parcel.analytics.ndre;
    case "Soil Moisture":
      return parcel.analytics.soil_moisture;
    case "Vegetation Stress":
      return parcel.analytics.vegetation_stress;
    case "Anomaly Hotspots":
      return parcel.analytics.anomaly_hotspots;
    case "Disease Probability":
      return parcel.analytics.disease_probability;
    default:
      return parcel.analytics.ndvi;
  }
}

function paletteForLayer(activeLayer: string) {
  return LAYER_PALETTES[activeLayer] ?? LAYER_PALETTES.NDVI;
}

function colorForScore(activeLayer: string, score: number) {
  const palette = paletteForLayer(activeLayer);
  if (score < 0.33) return palette.low;
  if (score < 0.66) return palette.mid;
  return palette.high;
}

function labelForFeature(feature: GeoJSON.Feature | undefined, fallback: string) {
  const properties = (feature?.properties ?? {}) as Record<string, unknown>;
  return (
    (typeof properties.sdtname === "string" && properties.sdtname) ||
    (typeof properties.vilname11 === "string" && properties.vilname11) ||
    (typeof properties.vilnam_soi === "string" && properties.vilnam_soi) ||
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
  villageFilter,
  districtGeoJson,
  mandalGeoJson,
  villageGeoJson,
  selectedParcelId,
  onSelectParcel,
  onSelectVillage,
}: ParcelMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  const [imageryFallback, setImageryFallback] = useState(false);

  const parcelsWithBand = useMemo(() => {
    return parcels.map((parcel, index) => {
      const healthBand = parcel.health >= 75 ? "healthy" : parcel.health >= 60 ? "moderate" : "warning";
      const motion = Math.sin((historic + parcel.lat) * 0.45 + index * 0.17) * 0.015;
      return { ...parcel, healthBand, displayMotion: motion };
    });
  }, [historic, parcels]);

  const layerScale = (parcel: (typeof parcelsWithBand)[number]) => {
    return scoreForLayer(parcel, activeLayer);
  };

  const styleFor = (parcel: (typeof parcelsWithBand)[number]) => {
    const scale = layerScale(parcel);
    const palette = paletteForLayer(activeLayer);
    const selected = selectedParcelId === parcel.id;
    const layerColor = colorForScore(activeLayer, scale);
    const historyBias = parcel.displayMotion ?? 0;

    return {
      color: selected ? palette.glow : layerColor,
      fillColor: selected ? palette.glow : layerColor,
      fillOpacity: selected ? 0.48 : 0.18 + scale * 0.28 + historyBias,
      weight: selected ? 2.7 : 1.25,
    };
  };

  const selectedParcel = parcelsWithBand.find((parcel) => parcel.id === selectedParcelId) ?? null;

  const selectedDistrictGeoJson = useMemo(() => {
    if (!districtGeoJson || districtFilter === "all") return districtGeoJson;
    const geojson = districtGeoJson as { features?: Array<{ properties?: { NAME?: string } }> };
    return {
      ...(districtGeoJson as Record<string, unknown>),
      features: (geojson.features ?? []).filter(
        (feature) => normalizeDistrictName(feature?.properties?.NAME) === districtFilter,
      ),
    };
  }, [districtFilter, districtGeoJson]);

  const selectedMandalGeoJson = useMemo(() => {
    if (!mandalGeoJson) return mandalGeoJson;
    const geojson = mandalGeoJson as { features?: Array<{ properties?: { dtname?: string; sdtname?: string } }> };
    return {
      ...(mandalGeoJson as Record<string, unknown>),
      features: (geojson.features ?? []).filter((feature) => {
        if (districtFilter !== "all" && normalizeDistrictName(feature?.properties?.dtname) !== districtFilter) return false;
        return mandalFilter === "all" || feature?.properties?.sdtname === mandalFilter;
      }),
    };
  }, [districtFilter, mandalFilter, mandalGeoJson]);
  const selectedVillageGeoJson = useMemo(() => {
    if (!villageGeoJson) return villageGeoJson;
    const geojson = villageGeoJson as {
      features?: Array<{ properties?: { dtname?: string; sdtname?: string; vilname11?: string; vilnam_soi?: string } }>;
    };
    return {
      ...(villageGeoJson as Record<string, unknown>),
      features: (geojson.features ?? []).filter((feature) => {
        if (
          districtFilter !== "all" &&
          feature?.properties?.dtname &&
          normalizeDistrictName(feature.properties.dtname) !== districtFilter
        ) {
          return false;
        }
        if (mandalFilter !== "all" && feature?.properties?.sdtname !== mandalFilter) return false;
        return villageFilter === "all" || feature?.properties?.vilname11 === villageFilter || feature?.properties?.vilnam_soi === villageFilter;
      }),
    };
  }, [districtFilter, mandalFilter, villageFilter, villageGeoJson]);

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

  useEffect(() => {
    if (!villageGeoJson || villageFilter === "all") return;
    const bounds = L.geoJSON(selectedVillageGeoJson as GeoJsonObject).getBounds();
    if (bounds.isValid()) {
      mapRef.current?.fitBounds(bounds.pad(0.08), { animate: true, duration: 0.8 });
    }
  }, [selectedVillageGeoJson, villageFilter, villageGeoJson]);

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
            color: normalizeDistrictName(feature?.properties?.NAME) === districtFilter ? "oklch(0.72 0.18 260)" : "oklch(0.7 0.04 250)",
            weight: normalizeDistrictName(feature?.properties?.NAME) === districtFilter ? 2.2 : 1,
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
              districtFilter === "all" || normalizeDistrictName(feature?.properties?.dtname) === districtFilter
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

      {villageGeoJson ? (
        <GeoJSON
          data={selectedVillageGeoJson as GeoJsonObject}
          // Explicitly make the vector interactive for reliable click hit-testing.
          // (Leaflet uses pointer-event capable SVG paths; this helps in some zoom/browser cases.)
          style={(feature) => {
            const isSelectedVillage =
              villageFilter === "all" ||
              feature?.properties?.vilname11 === villageFilter ||
              feature?.properties?.vilnam_soi === villageFilter;

            return {
              color: isSelectedVillage ? "oklch(0.78 0.17 200)" : "oklch(0.7 0.04 250)",
              weight: isSelectedVillage ? 1.3 : 0.8,
              // Non-zero fill so Leaflet can hit-test the polygon.
              fillOpacity: 0.22,
              opacity: 0.75,
              pointerEvents: "auto" as const,
            };
          }}
          onEachFeature={(feature, layer) => {
            const villageName = labelForFeature(feature, "Village");

            layer.bindTooltip(villageName, {
              sticky: true,
              direction: "center",
              opacity: 0.95,
            });

            layer.on({
              click: () => {
                if (!onSelectVillage) return;
                onSelectVillage(villageName);
              },
            });
          }}
        />
      ) : null}


      {parcelsWithBand.map((parcel) => {
        const positions = geometryToLeafletPositions(parcel);
        const canRenderPolygon = positions.length > 2;

        const clickHandler = () => onSelectParcel(parcel.id);

        if (!canRenderPolygon) {
          return (
            <CircleMarker
              key={`${parcel.id}-fallback`}
              center={[parcel.lat, parcel.lng]}
              radius={0.5}
              pathOptions={{
                color: paletteForLayer(activeLayer).glow,
                fillColor: paletteForLayer(activeLayer).glow,
                fillOpacity: 0,
                weight: 0,
              }}
              eventHandlers={{
                click: clickHandler,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1} sticky>
                <div className="text-[11px] space-y-0.5">
                  <div className="font-semibold">
                    {parcel.id} · {parcel.crop}
                  </div>
                  <div>
                    {parcel.risk} risk · Health {parcel.health}%
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        }

        return (
          <Polygon
            key={parcel.id}
            positions={positions as any}
            pathOptions={styleFor(parcel)}
            eventHandlers={{
              click: clickHandler,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} sticky>
              <div className="text-[11px] space-y-0.5">
                <div className="font-semibold">
                  {parcel.id} · {parcel.crop}
                </div>
                <div>
                  {parcel.risk} risk · Health {parcel.health}%
                </div>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}

      {selectedParcel ? (
        <Polygon
          positions={geometryToLeafletPositions(selectedParcel) as any}
          pathOptions={{
            color: paletteForLayer(activeLayer).glow,
            fillColor: paletteForLayer(activeLayer).glow,
            fillOpacity: 0.48,
            weight: 2.7,
          }}
        />
      ) : null}

      {selectedParcel ? (
        <Polygon
          positions={geometryToLeafletPositions(selectedParcel) as any}
          pathOptions={{
            color: paletteForLayer(activeLayer).glow,
            fillColor: "transparent",
            fillOpacity: 0,
            weight: 5,
            dashArray: "6 4",
          }}
        />
      ) : null}
    </MapContainer>
  );
}

