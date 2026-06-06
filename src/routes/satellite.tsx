import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Satellite,
  Layers,
  Maximize2,
  Radio,
  MapPin,
  Sprout,
  Droplets,
  AlertTriangle,
  Info,
  Globe,
  Mountain,
  Moon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useAppShell } from "@/components/app-shell-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getParcels, type Parcel } from "@/lib/api";
import { Link } from "@tanstack/react-router";



export const Route = createFileRoute("/satellite")({
  head: () => ({
    meta: [
      { title: "Satellite Monitoring · AgriShield AP" },
      {
        name: "description",
        content:
          "Parcel-level satellite monitoring with NDVI / EVI / NDRE overlays across Andhra Pradesh.",
      },
    ],
  }),
  component: SatellitePage,
});

const LAYERS = [
  "NDVI",
  "EVI",
  "NDRE",
  "Soil Moisture",
  "Vegetation Stress",
  "Anomaly Hotspots",
  "Disease Probability",
] as const;

type LayerName = (typeof LAYERS)[number];
type BasemapOption = "Satellite" | "Dark" | "Terrain";

type LayerEnabledState = Partial<Record<LayerName, boolean>>;

interface LayerGuide {
  title: string;
  summary: string;
  how_to_read: string;
  backend_signal: string;
  action: string;
}

interface GeoJsonFeatureProperties {
  dtname?: string;
  sdtname?: string;
  vilname11?: string;
  vilnam_soi?: string;
}

interface GeoJsonFeature {
  properties?: GeoJsonFeatureProperties;
}

interface GeoJson {
  features?: GeoJsonFeature[];
}

interface SatelliteMapProps {
  historic: number;
  activeLayer: LayerName;
  basemap: BasemapOption;
  parcels: Parcel[];
  districtFilter: string;
  mandalFilter: string;
  villageFilter: string;
  districtGeoJson: GeoJson | null;
  mandalGeoJson: GeoJson | null;
  villageGeoJson: GeoJson | null;
  selectedParcelId: string | null;
  onSelectParcel: (parcelId: string) => void;
  onSelectVillage: (villageName: string) => void;
}

interface RiskTone {
  label: string;
  chip: string;
}

interface SelectedVillageDetails {
  name: string;
  district: string;
  mandal: string;
}

const DISTRICT_GEOJSON_URL = "/data/ANDHRA_PRADESH_NEW_DISTRICTS.geojson";
const MANDAL_GEOJSON_URL = "/data/ANDHRA_PRADESH_SUBDISTRICTS.geojson";
const VILLAGE_GEOJSON_URL = "/data/ANDHRA_PRADESH_VILLAGES.geojson";

const DISTRICT_ALIASES: Record<string, string> = {
  "Sri Potti Sriramulu Nellore": "Nellore",
  "Sri Potti Sriramulu Nellore District": "Nellore",
  "Y.S.R.": "YSR Kadapa",
  "Y.S.R": "YSR Kadapa",
  "Y.S.R. Kadapa": "YSR Kadapa",
  "Y.S.R Kadapa": "YSR Kadapa",
};

function canonicalizeText(value: string | undefined | null) {
  if (!value) return "";
  return value
    .trim()
    // collapse repeated spaces
    .replace(/\s+/g, " ")
    // remove trailing punctuation commonly present in geodata labels
    .replace(/[\.,;:]+$/g, "")
    .toLowerCase();
}

function canonicalDistrictName(name: string | undefined | null) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "";
  return canonicalizeText(DISTRICT_ALIASES[trimmed] ?? trimmed);
}

function canonicalMandalName(name: string | undefined | null) {
  return canonicalizeText(name);
}

function canonicalVillageName(name: string | undefined | null) {
  return canonicalizeText(name);
}

function pointInPolygon(point: [number, number], vs: number[][]) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}


const LAYER_GUIDES: Record<LayerName, LayerGuide> = {
  NDVI: {
    title: "NDVI",
    summary: "Measures crop greenness and canopy vigor.",
    how_to_read: "Higher values usually mean stronger biomass and healthier cover.",
    backend_signal: "Backend uses parcel NDVI plus health context to color parcels from low to high vigor.",
    action: "Use this to spot weak patches and compare fields at a glance.",
  },
  EVI: {
    title: "EVI",
    summary: "Highlights vegetation strength in denser crop cover.",
    how_to_read: "Useful when NDVI saturates and you still want canopy detail.",
    backend_signal: "Backend blends parcel EVI with health score to emphasize dense crop areas.",
    action: "Compare EVI with NDVI to detect hidden canopy stress.",
  },
  NDRE: {
    title: "NDRE",
    summary: "Tracks chlorophyll and early stress signals.",
    how_to_read: "Drops often appear before obvious visible symptoms.",
    backend_signal: "Backend prioritizes parcel chlorophyll proxy to surface early nutrient or disease stress.",
    action: "Use this for early intervention and scouting.",
  },
  "Soil Moisture": {
    title: "Soil Moisture",
    summary: "Shows moisture balance across parcels.",
    how_to_read: "Lower values often indicate irrigation gaps or drying soil.",
    backend_signal: "Backend estimates moisture from vegetation response plus health context.",
    action: "Check irrigation timing, drainage, and recent rainfall impact.",
  },
  "Vegetation Stress": {
    title: "Vegetation Stress",
    summary: "Highlights where crop condition is moving away from healthy growth.",
    how_to_read: "Higher values mean more stress pressure across the parcel.",
    backend_signal: "Backend combines spectral movement and health to flag stressed parcels.",
    action: "Prioritise these fields for field inspection.",
  },
  "Anomaly Hotspots": {
    title: "Anomaly Hotspots",
    summary: "Flags parcels that differ sharply from nearby patterns.",
    how_to_read: "Strong colors mean the parcel is behaving unlike its expected norm.",
    backend_signal: "Backend compares parcel spectral spread and health for unusual patterns.",
    action: "Review anomalies before disease spreads.",
  },
  "Disease Probability": {
    title: "Disease Probability",
    summary: "Estimates the chance of disease pressure in the parcel.",
    how_to_read: "Higher values point to stronger disease likelihood.",
    backend_signal: "Backend model combines NDVI, EVI, NDRE, stress, anomaly, and health into one risk score.",
    action: "Use this for triage and immediate extension support.",
  },
};

// Backwards compat alias (kept to avoid touching unrelated code blocks)
function normalizeDistrictName(name: string | undefined | null) {
  return canonicalDistrictName(name);
}


function riskTone(parcel: Parcel): RiskTone {
  if (parcel.health >= 75)
    return { label: "Healthy", chip: "bg-success/20 text-success border-success/40" };
  if (parcel.health >= 60)
    return { label: "Watch", chip: "bg-warning/20 text-warning border-warning/40" };
  return { label: "High Risk", chip: "bg-destructive/15 text-destructive border-destructive/30" };
}

type NumericAnalyticsKey =
  | "ndvi"
  | "evi"
  | "ndre"
  | "soil_moisture"
  | "vegetation_stress"
  | "anomaly_hotspots"
  | "disease_probability";

function metricForLayer(parcel: Parcel, activeLayer: LayerName) {
  const keyMap: Record<LayerName, NumericAnalyticsKey> = {
    NDVI: "ndvi",
    EVI: "evi",
    NDRE: "ndre",
    "Soil Moisture": "soil_moisture",
    "Vegetation Stress": "vegetation_stress",
    "Anomaly Hotspots": "anomaly_hotspots",
    "Disease Probability": "disease_probability",
  };

  const key = keyMap[activeLayer] ?? "ndvi";
  return parcel.analytics[key].toFixed(2);
}

function SatellitePage() {
  const { data: rawParcels = [] } = useQuery({ queryKey: ["parcels"], queryFn: getParcels });
  const [MapView, setMapView] = useState<null | ComponentType<SatelliteMapProps>>(null);
  const [historic, setHistoric] = useState(11);
  const [activeLayer, setActiveLayer] = useState<LayerName>("NDVI");
  const [basemap, setBasemap] = useState<BasemapOption>("Satellite");
  const [enabled, setEnabled] = useState<LayerEnabledState>({ NDVI: true });
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null);
  const { selectedDistrict: districtFilter, setSelectedDistrict: setDistrictFilter } =
    useAppShell();
  const [mandalFilter, setMandalFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");
  const [districtGeoJson, setDistrictGeoJson] = useState<GeoJson | null>(null);
  const [mandalGeoJson, setMandalGeoJson] = useState<GeoJson | null>(null);
  const [villageGeoJson, setVillageGeoJson] = useState<GeoJson | null>(null);

  useEffect(() => {
    import("@/components/satellite-map").then((m) => setMapView(() => m.SatelliteMap));
  }, []);

  useEffect(() => {
    fetch(DISTRICT_GEOJSON_URL)
      .then((response) => response.json())
      .then((data) => setDistrictGeoJson(data))
      .catch(() => setDistrictGeoJson(null));
  }, []);

  useEffect(() => {
    fetch(MANDAL_GEOJSON_URL)
      .then((response) => response.json())
      .then((data) => setMandalGeoJson(data))
      .catch(() => setMandalGeoJson(null));
  }, []);

  useEffect(() => {
    fetch(VILLAGE_GEOJSON_URL)
      .then((response) => response.json())
      .then((data) => setVillageGeoJson(data))
      .catch(() => setVillageGeoJson(null));
  }, []);

  const parcels = useMemo(() => {
    if (!villageGeoJson || rawParcels.length === 0) return rawParcels;

    const features = (villageGeoJson as any).features || [];
    
    return rawParcels.map(p => {
      if (p.village && p.village !== "Unknown Village") return p;

      const pt: [number, number] = [p.lng, p.lat];
      let foundVillage = "Unknown Village";
      
      for (const f of features) {
        const mandalMatch = canonicalMandalName(f.properties?.sdtname) === canonicalizeText(p.mandal);
        if (!mandalMatch) continue;

        if (!f.geometry) continue;
        const type = f.geometry.type;
        const coords = f.geometry.coordinates;
        
        let inside = false;
        if (type === "Polygon") {
          inside = pointInPolygon(pt, coords[0]);
        } else if (type === "MultiPolygon") {
          for (const poly of coords) {
            if (pointInPolygon(pt, poly[0])) {
              inside = true;
              break;
            }
          }
        }
        
        if (inside) {
          foundVillage = f.properties?.vilname11 || f.properties?.vilnam_soi || "Unknown Village";
          break;
        }
      }
      
      return { ...p, village: foundVillage };
    });
  }, [rawParcels, villageGeoJson]);

  const districtOptions = useMemo(
    () =>
      Array.from(new Set(parcels.map((parcel) => parcel.district))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [parcels],
  );
const mandalOptions = useMemo(() => {
    const geojson = mandalGeoJson as {
      features?: Array<{ properties?: { dtname?: string; sdtname?: string } }>;
    } | null;
    const features = geojson?.features ?? [];

    const filtered = features.filter((feature) => {
      if (districtFilter === "all") return true;
      return canonicalDistrictName(feature.properties?.dtname) === canonicalizeText(districtFilter);
    });

    return Array.from(
      new Set(filtered.map((feature) => feature.properties?.sdtname).filter((name): name is string => Boolean(name))),
    ).sort((a, b) => a.localeCompare(b));
  }, [districtFilter, mandalGeoJson]);

const villageOptions = useMemo(() => {
    const geojson = villageGeoJson as {
      features?: Array<{
        properties?: {
          dtname?: string;
          sdtname?: string;
          vilname11?: string;
          vilnam_soi?: string;
        };
      }>;
    } | null;
    const features = geojson?.features ?? [];

    const filtered = features.filter((feature) => {
      if (districtFilter !== "all") {
        if (canonicalDistrictName(feature.properties?.dtname) !== canonicalizeText(districtFilter)) return false;
      }
      if (mandalFilter !== "all") {
        if (canonicalMandalName(feature.properties?.sdtname) !== canonicalizeText(mandalFilter)) return false;
      }
      return true;
    });

    return Array.from(
      new Set(
        filtered
          .map((feature) => feature.properties?.vilname11 ?? feature.properties?.vilnam_soi)
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [districtFilter, mandalFilter, villageGeoJson]);

  const filteredParcels = useMemo(
    () =>
      parcels.filter((parcel) => {
        const districtMatches = districtFilter === "all" || parcel.district === districtFilter;
        const mandalMatches = mandalFilter === "all" || parcel.mandal === mandalFilter;
        const villageMatches = villageFilter === "all" || parcel.village === villageFilter;
        return districtMatches && mandalMatches && villageMatches;
      }),
    [districtFilter, mandalFilter, villageFilter, parcels],
  );
  const selectedParcelFromAll = useMemo(
    () => parcels.find((parcel) => parcel.id === selectedParcelId) ?? null,
    [parcels, selectedParcelId],
  );

  const activeLayerValue = useMemo(() => {
    if (!selectedParcelFromAll) return 0;
    switch (activeLayer) {
      case "EVI": return selectedParcelFromAll.analytics.evi;
      case "NDRE": return selectedParcelFromAll.analytics.ndre;
      case "Soil Moisture": return selectedParcelFromAll.analytics.soil_moisture;
      case "Vegetation Stress": return selectedParcelFromAll.analytics.vegetation_stress;
      case "Anomaly Hotspots": return selectedParcelFromAll.analytics.anomaly_hotspots;
      case "Disease Probability": return selectedParcelFromAll.analytics.disease_probability;
      default: return selectedParcelFromAll.analytics.ndvi;
    }
  }, [selectedParcelFromAll, activeLayer]);

  const aiSummary = useMemo(() => {
    if (filteredParcels.length === 0) return null;

    let healthyNdviCount = 0;
    const highRiskParcels: typeof filteredParcels = [];
    
    filteredParcels.forEach(p => {
      const ndvi = p.ndvi ?? p.analytics?.ndvi ?? 0;
      if (ndvi > 0.55) healthyNdviCount++;
      if (p.risk === "High" || p.risk === "Critical" || p.health < 50) highRiskParcels.push(p);
    });

    const healthyPct = ((healthyNdviCount / filteredParcels.length) * 100).toFixed(1);
    const stressCount = highRiskParcels.length;

    const districtRiskCounts: Record<string, number> = {};
    const riskMandals = new Set<string>();

    highRiskParcels.forEach(p => {
      districtRiskCounts[p.district] = (districtRiskCounts[p.district] || 0) + 1;
      riskMandals.add(p.mandal);
    });

    const topDistricts = Object.entries(districtRiskCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(d => d[0])
      .join(", ");
    
    return {
      healthyPct,
      stressCount,
      topDistricts: topDistricts || "the selected region",
      mandalCount: riskMandals.size
    };
  }, [filteredParcels]);


  const selectedVillageDetails = useMemo(() => {
    if (!selectedVillage || !villageGeoJson) return null;

    const geojson = villageGeoJson as {
      features?: Array<{
        properties?: {
          dtname?: string;
          sdtname?: string;
          vilname11?: string;
          vilnam_soi?: string;
        };
      }>;
    };

    const features = geojson.features ?? [];

    const wantedVillageCanon = canonicalVillageName(selectedVillage);

    const match = features.find((f) => {
      const p = f.properties;
      const name = p?.vilname11 ?? p?.vilnam_soi;
      if (canonicalVillageName(name) !== wantedVillageCanon) return false;
      
      if (districtFilter !== "all" && canonicalDistrictName(p?.dtname) !== canonicalizeText(districtFilter)) {
        return false;
      }
      if (mandalFilter !== "all" && canonicalMandalName(p?.sdtname) !== canonicalizeText(mandalFilter)) {
        return false;
      }
      return true;
    }) ?? features.find((f) => {
      const p = f.properties;
      const name = p?.vilname11 ?? p?.vilnam_soi;
      return canonicalVillageName(name) === wantedVillageCanon;
    });

    if (!match?.properties) {
      return {
        name: selectedVillage,
        district: "",
        mandal: "",
      };
    }

    return {
      name: selectedVillage,
      district: match.properties.dtname ? canonicalDistrictName(match.properties.dtname).replace(/\b\w/g, l => l.toUpperCase()) : "",
      mandal: match.properties.sdtname ? match.properties.sdtname : "",
    };
  }, [selectedVillage, villageGeoJson, districtFilter, mandalFilter]);

  const villageSummary = useMemo(() => {
    if (!selectedVillageDetails) return null;
    const villageNameCanon = canonicalVillageName(selectedVillageDetails.name);
    
    // Find parcels in this village
    const villageParcels = parcels.filter(p => canonicalVillageName(p.village) === villageNameCanon);
    
    if (villageParcels.length === 0) return null;

    let totalAcreage = 0;
    let totalHealth = 0;
    let highRiskCount = 0;
    const cropAcreage: Record<string, number> = {};

    villageParcels.forEach(p => {
      totalAcreage += p.acreage;
      totalHealth += p.health;
      cropAcreage[p.crop] = (cropAcreage[p.crop] || 0) + p.acreage;
      if (p.risk === "High" || p.risk === "Critical") {
        highRiskCount++;
      }
    });

    let primaryCrop = "None";
    let maxAcreage = -1;
    for (const [crop, acreage] of Object.entries(cropAcreage)) {
      if (acreage > maxAcreage) {
        maxAcreage = acreage;
        primaryCrop = crop;
      }
    }

    const averageHealth = (totalHealth / villageParcels.length).toFixed(1);

    return {
      parcelCount: villageParcels.length,
      totalAcreage: totalAcreage.toFixed(1),
      primaryCrop: primaryCrop,
      averageHealth: averageHealth,
      highRiskCount: highRiskCount,
    };
  }, [parcels, selectedVillageDetails]);

  const selectedRisk = selectedParcelFromAll ? riskTone(selectedParcelFromAll) : null;


  useEffect(() => {
    if (selectedParcelId && !filteredParcels.some((parcel) => parcel.id === selectedParcelId)) {
      setSelectedParcelId(null);
    }
  }, [filteredParcels, selectedParcelId]);

  useEffect(() => {
    if (mandalFilter !== "all" && !mandalOptions.includes(mandalFilter)) {
      setMandalFilter("all");
    }
  }, [mandalFilter, mandalOptions]);

  useEffect(() => {
    if (villageFilter !== "all" && !villageOptions.includes(villageFilter)) {
      setVillageFilter("all");
    }
  }, [villageFilter, villageOptions]);

  useEffect(() => {
    if (selectedVillageDetails?.mandal) {
      const canonMandal = canonicalizeText(selectedVillageDetails.mandal);
      const properMandal = mandalOptions.find(m => canonicalizeText(m) === canonMandal);
      if (properMandal && mandalFilter !== properMandal) {
        setMandalFilter(properMandal);
      }
    }
  }, [selectedVillageDetails, mandalFilter, mandalOptions]);

  return (
    <div>
      <PageHeader
        icon={<Satellite className="h-6 w-6 text-accent" />}
        eyebrow="GIS Console"
        title="Satellite Monitoring · Andhra Pradesh"
        description="Interactive map for field-level crop health, AI-driven stress alerts, and advanced spectral indices."
        actions={
          <>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="h-8 w-[140px] bg-muted/20 border-border/60 text-xs">
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent className="z-[1000]" position="popper">
                <SelectItem value="all">All districts</SelectItem>
                {districtOptions.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={mandalFilter} onValueChange={setMandalFilter}>
              <SelectTrigger className="h-8 w-[140px] bg-muted/20 border-border/60 text-xs">
                <SelectValue placeholder="All mandals" />
              </SelectTrigger>
              <SelectContent className="z-[1000]" position="popper">
                <SelectItem value="all">All mandals</SelectItem>
                {mandalOptions.map((mandal) => (
                  <SelectItem key={mandal} value={mandal}>
                    {mandal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={villageFilter} 
              onValueChange={(val) => {
                setVillageFilter(val);
                setSelectedVillage(val === "all" ? null : val);
              }}
            >
              <SelectTrigger className="h-8 w-[140px] bg-muted/20 border-border/60 text-xs">
                <SelectValue placeholder="All villages" />
              </SelectTrigger>
              <SelectContent className="z-[1000]" position="popper">
                <SelectItem value="all">All villages</SelectItem>
                {villageOptions.map((village) => (
                  <SelectItem key={village} value={village}>
                    {village}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* <Badge
              variant="outline"
              className="rounded-full border-success/40 bg-success/10 text-success gap-1.5 self-center ml-2 px-3 py-1"
            >
              <Radio className="h-3.5 w-3.5 animate-pulse" /> LIVE */}
            {/* </Badge> */}
            {/* <Button variant="outline" size="sm" className="rounded-full gap-1.5 h-8 px-4">
              <Maximize2 className="h-3.5 w-3.5" /> Full screen
            </Button> */}
          </>
        }
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-0">
        <div className="relative h-[calc(100vh-13rem)] min-h-[520px] border-r border-border/60">
          {MapView ? (
              <MapView
              historic={historic}
              activeLayer={activeLayer}
              basemap={basemap}
              parcels={filteredParcels}
              districtFilter={districtFilter}
              mandalFilter={mandalFilter}
              villageFilter={villageFilter}
              districtGeoJson={districtGeoJson}
              mandalGeoJson={mandalGeoJson}
              villageGeoJson={villageGeoJson}
              selectedParcelId={selectedParcelId}
              onSelectParcel={setSelectedParcelId}
              onSelectVillage={(villageName) => {
                setSelectedVillage(villageName);
                // Selecting a village should focus the map and update the left-side filter
                setVillageFilter(villageName);

                // Auto-select a parcel when a village is clicked.
                // Rule: first matching parcel found in the filtered parcels list.
                // Use the same canonicalization rules as geojson filtering to avoid label mismatches.
                const clickedVillageCanon = canonicalVillageName(villageName);

                const matchingCount = parcels.filter(
                  (p) => canonicalVillageName(p.village) === clickedVillageCanon,
                ).length;

                if (matchingCount === 0) {
                  // Dev-only: helps verify villages exist consistently between parcel data and geojson layer.
                  // eslint-disable-next-line no-console
                  console.warn("[Satellite] Village label mismatch:", {
                    clickedVillageRaw: villageName,
                    clickedVillageCanonical: clickedVillageCanon,
                  });
                }

                const firstParcelInVillage =
                  filteredParcels.find((p) => canonicalVillageName(p.village) === clickedVillageCanon) ??
                  parcels.find((p) => canonicalVillageName(p.village) === clickedVillageCanon) ??
                  null;

                setSelectedParcelId(firstParcelInVillage ? firstParcelInVillage.id : null);


              }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
              Loading satellite layer…
            </div>
          )}

          <div className="absolute top-3 left-3 z-[400] glass-strong rounded-lg px-3 py-2 text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Active layer: </span>
              <span className="font-semibold text-primary">{activeLayer}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> Hover for a quick preview, click for full details
            </div>
          </div>

          <div className="absolute top-3 right-3 z-[400] glass-strong rounded-lg p-3 text-[11px] space-y-2 min-w-[180px]">
            <div className="font-semibold flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary" /> Legend
            </div>
            <div className="space-y-1.5">
              <LegendRow color="bg-slate-400/80" label="District boundaries" />
              <LegendRow color="bg-cyan-400/80" label="Mandal boundaries" />
              <LegendRow color="bg-info/80" label="Village boundaries" />
              <LegendRow color="bg-success/80" label="Healthy parcels" />
              <LegendRow color="bg-warning/80" label="Moderate stress" />
              <LegendRow color="bg-destructive/80" label="High disease risk" />
              <LegendRow color="bg-primary/80" label="Selected parcel" />
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 z-[400] glass-strong rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Historical imagery · Month {historic + 1}/12</Label>
              <span className="text-[10px] text-muted-foreground">Drag to scrub time</span>
            </div>
            <Slider value={[historic]} onValueChange={(v) => setHistoric(v[0])} max={11} step={1} />
          </div>
        </div>

        <aside className="bg-card/40 backdrop-blur-md p-4 space-y-4 overflow-y-auto h-[calc(100vh-13rem)] min-h-[520px]">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-accent" /> Visualization Layers
            </h3>
            <div className="space-y-2">
              {LAYERS.map((layer) => (
                <div
                  key={layer}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition ${
                    activeLayer === layer
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 bg-muted/20 hover:border-primary/30"
                  }`}
                  onClick={() => setActiveLayer(layer)}
                >
                  <span className="text-xs font-medium">{layer}</span>
                  <Switch
                    checked={enabled[layer] ?? false}
                    onCheckedChange={(value) =>
                      setEnabled((current) => ({ ...current, [layer]: value }))
                    }
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">Layer Guide</h3>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                Backend model
              </Badge>
            </div>
            <p className="font-medium text-sm text-foreground">{LAYER_GUIDES[activeLayer]?.title}</p>
            <p className="text-muted-foreground">{LAYER_GUIDES[activeLayer]?.summary}</p>
            <div className="rounded-lg border border-border/60 bg-background/40 p-2.5 space-y-1.5">
              <p><span className="text-muted-foreground">Read it as:</span> {LAYER_GUIDES[activeLayer]?.how_to_read}</p>
              <p><span className="text-muted-foreground">Backend signal:</span> {LAYER_GUIDES[activeLayer]?.backend_signal}</p>
              <p><span className="text-muted-foreground">Action:</span> {LAYER_GUIDES[activeLayer]?.action}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Basemap</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {(["Satellite", "Dark", "Terrain"] as const).map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={basemap === option ? "default" : "outline"}
                  className="w-full text-xs font-medium justify-center h-8"
                  onClick={() => setBasemap(option)}
                >
                  {option === "Satellite" && <Satellite className="mr-1.5 h-3.5 w-3.5" />}
                  {option === "Dark" && <Moon className="mr-1.5 h-3.5 w-3.5" />}
                  {option === "Terrain" && <Mountain className="mr-1.5 h-3.5 w-3.5" />}
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Coverage</h3>
            <div className="glass rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Satellite pass</span>
                <span>2h 14m ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cloud cover</span>
                <span className="text-success">3.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcels indexed</span>
                <span>{parcels.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI confidence</span>
                <span className="text-primary">96%</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-lg p-3 text-xs space-y-3">
            <h4 className="font-semibold">Village detail</h4>
            {selectedVillageDetails ? (
              <>
                <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs space-y-1.5">
                  <p>
                    <span className="text-muted-foreground">District:</span>{" "}
                    {selectedVillageDetails.district || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Mandal:</span>{" "}
                    {selectedVillageDetails.mandal || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Village:</span>{" "}
                    {selectedVillageDetails.name || "—"}
                  </p>
                  {villageSummary ? (
                    <>
                      <div className="my-1.5 border-t border-border/40" />
                      <p>
                        <span className="text-muted-foreground">Parcels Monitored:</span>{" "}
                        {villageSummary.parcelCount}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Total Area:</span>{" "}
                        {villageSummary.totalAcreage} ac
                      </p>
                      <p>
                        <span className="text-muted-foreground">Primary Crop:</span>{" "}
                        <span className="font-medium text-primary">{villageSummary.primaryCrop}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Avg Health:</span>{" "}
                        {villageSummary.averageHealth}%
                      </p>
                      <p>
                        <span className="text-muted-foreground">High Risk Parcels:</span>{" "}
                        {villageSummary.highRiskCount > 0 ? (
                          <span className="text-destructive font-medium">{villageSummary.highRiskCount}</span>
                        ) : (
                          <span className="text-success font-medium">None</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="my-1.5 border-t border-border/40" />
                      <p className="text-muted-foreground italic">
                        No active parcels monitored in this village.
                      </p>
                    </>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-red-400 border-red-900/50 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => {
                    setSelectedVillage(null);
                    setVillageFilter("all");
                    setSelectedParcelId(null);
                  }}
                >
                  Clear village
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground leading-relaxed">
                Click any village polygon on the map to open village details.
              </p>
            )}
          </div>

          <div className="glass rounded-lg p-3 text-xs space-y-3">
            <h4 className="font-semibold">Parcel detail</h4>
            {selectedParcelFromAll ? (

              <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{selectedParcelFromAll.id}</p>

                    <p className="text-muted-foreground">
                      {selectedParcelFromAll.crop} · {selectedParcelFromAll.farmer}

                    </p>
                  </div>
                  {selectedRisk ? (
                    <Badge className={selectedRisk.chip}>{selectedRisk.label}</Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <InfoCard
                    icon={<Sprout className="h-3.5 w-3.5" />}
                    label="Health"
                    value={`${selectedParcelFromAll.health}%`}

                  />
                  <InfoCard
                    icon={<Droplets className="h-3.5 w-3.5" />}
                    label={activeLayer}
                    value={activeLayerValue.toFixed(2)}

                  />
                  <InfoCard
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                    label="Risk"
                    value={selectedParcelFromAll.risk}

                  />
                  <InfoCard
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    label="Area"
                    value={`${selectedParcelFromAll.acreage} ac`}

                  />
                </div>

                <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs space-y-1.5">
                  <p>
                    <span className="text-muted-foreground">District:</span>{" "}
                    {selectedParcelFromAll.district}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Mandal:</span>{" "}
                    {selectedParcelFromAll.mandal}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Layer value:</span>{" "}
                    {metricForLayer(selectedParcelFromAll, activeLayer)}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Insight:</span>{" "}
                    {selectedParcelFromAll.analytics.insight}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Model:</span>{" "}
                    {selectedParcelFromAll.analytics.model}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Recommendation:</span>{" "}
                    {selectedParcelFromAll.analytics.recommendation}
                  </p>

                </div>

                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full mb-2"
                >
                  <Link
                    to="/field-advisory/$fieldId"
                    params={{ fieldId: selectedParcelFromAll.id }}

                    onClick={() => {
                    }}
                  >
                    Open Field Advisory
                  </Link>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-red-400 border-red-900/50 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => {
                    setSelectedParcelId(null);
                    setSelectedVillage(null);
                  }}
                >
                  Clear selection
                </Button>

              </>
            ) : (
              <p className="text-muted-foreground leading-relaxed">
                Click any crop parcel on the map to open the full field details, including
                health, risk level, and layer-specific values.
              </p>
            )}
          </div>

          <div className="glass rounded-lg p-3 text-xs">
            <h4 className="font-semibold mb-1.5">AI Parcel Summary</h4>
            {aiSummary ? (
              <p className="text-muted-foreground leading-relaxed">
                {aiSummary.healthyPct}% of monitored parcels are in healthy NDVI band (&gt; 0.55).
                {aiSummary.stressCount > 0 ? (
                  <>
                    <span className="text-warning"> {aiSummary.stressCount.toLocaleString()} stress alerts</span> are concentrated in {aiSummary.topDistricts}. Recommend immediate field validation in {aiSummary.mandalCount} high-risk {aiSummary.mandalCount === 1 ? 'mandal' : 'mandals'}.
                  </>
                ) : (
                  <> No critical stress alerts detected in the current selection.</>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground italic">No parcel data available for summary.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-medium text-sm">{value}</div>
    </div>
  );
}
