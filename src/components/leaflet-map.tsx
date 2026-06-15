// This component is intentionally lazy-loaded to avoid Leaflet's
// "window is not defined" SSR error. Never import it at the top level.
import { useEffect, useMemo } from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface DistrictData {
  district: string;
  color: string;
  status: string;
  [key: string]: any;
}

interface LeafletMapProps {
  geoData: any;
  districtData: DistrictData[];
  onDistrictClick: (district: string) => void;
}

/**
 * Maps the 26 new AP districts (post-2022 reorganisation) to the 13 old
 * district names used in the surveillance/disease dataset.
 * Keys are lowercase for case-insensitive lookup.
 */
const NEW_TO_OLD_DISTRICT: Record<string, string> = {
  "ananthapuram": "Anantapur",
  "anantapur": "Anantapur",
  "ysr kadapa": "Y.S.R.",
  "y.s.r.": "Y.S.R.",
  "ys r": "Y.S.R.",
  "sri potti sriramulu nellore": "Sri Potti Sriramulu Nellore",
  "nellore": "Sri Potti Sriramulu Nellore",
  "alluri sitharama raju": "Srikakulam",
  "allurisitharama raju": "Srikakulam",
  "manyam": "Srikakulam",
  "anakapalli": "Visakhapatnam",
  "kakinada": "East Godavari",
  "konaseema": "East Godavari",
  "eluru": "West Godavari",
  "ntr": "Krishna",
  "palnadu": "Guntur",
  "bapatla": "Guntur",
  "nandyal": "Kurnool",
  "annamayya": "Chittoor",
  "sri balaji": "Chittoor",
  "sri satyasai": "Anantapur",
};

/** Extracts and normalises a district name from a GeoJSON feature's properties. */
function getDistrictName(feature: any): string {
  const raw =
    feature.properties?.dtname ||
    feature.properties?.district_name ||
    feature.properties?.NAME ||
    feature.properties?.name ||
    feature.properties?.District ||
    feature.properties?.NAME_2 ||
    "";
  return raw.replace(/ dist\.?$/i, "").replace(/ district\.?$/i, "").trim();
}

/**
 * Resolves a single district name to a DistrictData entry.
 * Uses the mapping table first, then falls back to fuzzy matching.
 * This is called once at build-time of the lookup cache, not on every render.
 */
function resolveDistrict(
  geoName: string,
  districtData: DistrictData[]
): DistrictData | undefined {
  const key = geoName.toLowerCase();
  const mappedName = NEW_TO_OLD_DISTRICT[key];
  if (mappedName) {
    const found = districtData.find(
      (d) => d.district.toLowerCase() === mappedName.toLowerCase()
    );
    if (found) return found;
  }
  return districtData.find(
    (d) =>
      key === d.district.toLowerCase() ||
      key.includes(d.district.toLowerCase()) ||
      d.district.toLowerCase().includes(key)
  );
}

/** Forces Leaflet to recalculate its size after the lazy component mounts. */
function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function LeafletMap({ geoData, districtData, onDistrictClick }: LeafletMapProps) {
  /**
   * Pre-build a cache of geoName → DistrictData so that mapStyle and
   * onEachFeature are both O(1) lookups instead of O(n) searches per render.
   * Only recomputes when geoData or districtData actually changes.
   */
  const districtCache = useMemo<Map<string, DistrictData | null>>(() => {
    const cache = new Map<string, DistrictData | null>();
    if (!geoData?.features) return cache;
    for (const feature of geoData.features) {
      const name = getDistrictName(feature);
      if (name && !cache.has(name)) {
        cache.set(name, resolveDistrict(name, districtData) ?? null);
      }
    }
    return cache;
  }, [geoData, districtData]);

  const mapStyle = (feature: any) => {
    const name = getDistrictName(feature);
    const match = districtCache.get(name);
    return {
      fillColor: match?.color ?? "#334155",
      weight: 1,
      opacity: 1,
      color: "#fff",
      fillOpacity: 1,
    };
  };

  return (
    <div style={{ height: "350px", width: "100%" }}>
      <MapContainer
        center={[15.9129, 79.74]}
        zoom={6.5}
        zoomControl={false}
        style={{ height: "100%", width: "100%", background: "#0B1121" }}
      >
        <ResizeHandler />
        {geoData && (
          <GeoJSON
            key="ap-districts"
            data={geoData}
            style={mapStyle}
            onEachFeature={(feature, layer) => {
              const name = getDistrictName(feature);
              // O(1) cache hit — no repeated linear search
              const match = districtCache.get(name) ?? undefined;

              layer.on({
                click: () => {
                  if (match) onDistrictClick(match.district);
                },
              });

              layer.bindTooltip(
                `<div style="background: #1f2937; color: white; padding: 6px; border-radius: 4px; font-family: sans-serif; font-size: 12px; border: 1px solid #374151;">
                  <strong>${match ? match.district : name || "Unknown"}</strong><br/>
                  ${match ? match.status : "No Data"}
                </div>`,
                { sticky: true, className: "bg-transparent border-0 shadow-none p-0" }
              );
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
