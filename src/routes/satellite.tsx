import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Satellite, Layers, Maximize2, Radio, MapPin, Sprout, Droplets, AlertTriangle, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getParcels, type Parcel } from "@/lib/api";

export const Route = createFileRoute("/satellite")({
  head: () => ({
    meta: [
      { title: "Satellite Monitoring · AgriShield AP" },
      { name: "description", content: "Parcel-level satellite monitoring with NDVI / EVI / NDRE overlays across Andhra Pradesh." },
    ],
  }),
  component: SatellitePage,
});

const LAYERS = ["NDVI", "EVI", "NDRE", "Soil Moisture", "Vegetation Stress", "Anomaly Hotspots", "Disease Probability"];
const DISTRICT_GEOJSON_URL = "/data/ANDHRA_PRADESH_NEW_DISTRICTS.geojson";
const MANDAL_GEOJSON_URL = "/data/ANDHRA_PRADESH_SUBDISTRICTS.geojson";

const DISTRICT_ALIASES: Record<string, string> = {
  "Sri Potti Sriramulu Nellore": "Nellore",
  "Sri Potti Sriramulu Nellore District": "Nellore",
  "Y.S.R.": "YSR Kadapa",
  "Y.S.R": "YSR Kadapa",
  "Y.S.R. Kadapa": "YSR Kadapa",
  "Y.S.R Kadapa": "YSR Kadapa",
};

function normalizeDistrictName(name: string | undefined | null) {
  if (!name) return "";
  const trimmed = name.trim();
  return DISTRICT_ALIASES[trimmed] ?? trimmed;
}

function riskTone(parcel: Parcel) {
  if (parcel.health >= 75) return { label: "Healthy", chip: "bg-success/20 text-success border-success/40" };
  if (parcel.health >= 60) return { label: "Watch", chip: "bg-warning/20 text-warning border-warning/40" };
  return { label: "High Risk", chip: "bg-destructive/15 text-destructive border-destructive/30" };
}

function metricForLayer(parcel: Parcel, activeLayer: string) {
  switch (activeLayer) {
    case "EVI":
      return (parcel.ndvi * 0.88 + 0.07).toFixed(2);
    case "NDRE":
      return (parcel.ndvi * 0.8 + 0.1).toFixed(2);
    case "Soil Moisture":
      return Math.min(1, 0.35 + parcel.ndvi * 0.45).toFixed(2);
    case "Vegetation Stress":
      return (1 - parcel.ndvi).toFixed(2);
    case "Anomaly Hotspots":
    case "Disease Probability":
      return ((100 - parcel.health) / 100).toFixed(2);
    default:
      return parcel.ndvi.toFixed(2);
  }
}

function SatellitePage() {
  const { data: parcels = [] } = useQuery({ queryKey: ["parcels"], queryFn: getParcels });
  const [MapView, setMapView] = useState<null | ComponentType<{
    historic: number;
    activeLayer: string;
    parcels: Parcel[];
    districtFilter: string;
    mandalFilter: string;
    districtGeoJson: unknown;
    mandalGeoJson: unknown;
    selectedParcelId: string | null;
    onSelectParcel: (parcelId: string) => void;
  }>>(null);
  const [historic, setHistoric] = useState(11);
  const [activeLayer, setActiveLayer] = useState("NDVI");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ NDVI: true });
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [districtFilter, setDistrictFilter] = useState("all");
  const [mandalFilter, setMandalFilter] = useState("all");
  const [districtGeoJson, setDistrictGeoJson] = useState<unknown>(null);
  const [mandalGeoJson, setMandalGeoJson] = useState<unknown>(null);

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

  const districtOptions = useMemo(() => Array.from(new Set(parcels.map((parcel) => parcel.district))).sort((a, b) => a.localeCompare(b)), [parcels]);
  const mandalOptions = useMemo(() => {
    const geojson = mandalGeoJson as { features?: Array<{ properties?: { dtname?: string; sdtname?: string } }> } | null;
    const features = geojson?.features ?? [];
    return Array.from(
      new Set(
        features
          .filter((feature) => {
            if (districtFilter === "all") return true;
            return normalizeDistrictName(feature.properties?.dtname) === districtFilter;
          })
          .map((feature) => feature.properties?.sdtname)
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [districtFilter, mandalGeoJson]);
  const filteredParcels = useMemo(
    () =>
      parcels.filter((parcel) => {
        const districtMatches = districtFilter === "all" || parcel.district === districtFilter;
        const mandalMatches = mandalFilter === "all" || parcel.mandal === mandalFilter;
        return districtMatches && mandalMatches;
      }),
    [districtFilter, mandalFilter, parcels],
  );
  const filteredSelectedParcel = useMemo(() => filteredParcels.find((parcel) => parcel.id === selectedParcelId) ?? null, [filteredParcels, selectedParcelId]);
  const selectedRisk = filteredSelectedParcel ? riskTone(filteredSelectedParcel) : null;

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

  return (
    <div>
      <PageHeader
        icon={<Satellite className="h-6 w-6 text-accent" />}
        eyebrow="GIS Console"
        title="Satellite Monitoring · Andhra Pradesh"
        description="Parcel polygons, vegetation indices and AI hotspots over Sentinel-2 imagery."
        actions={
          <>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary gap-1.5 self-center">
              <Radio className="h-3 w-3 animate-pulse" /> LIVE
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Maximize2 className="h-3.5 w-3.5" /> Full screen
            </Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-0">
        <div className="relative h-[calc(100vh-13rem)] min-h-[520px] border-r border-border/60">
          {MapView ? (
            <MapView
              historic={historic}
              activeLayer={activeLayer}
              parcels={filteredParcels}
              districtFilter={districtFilter}
              mandalFilter={mandalFilter}
              districtGeoJson={districtGeoJson}
              mandalGeoJson={mandalGeoJson}
              selectedParcelId={selectedParcelId}
              onSelectParcel={setSelectedParcelId}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">Loading satellite layer…</div>
          )}

          <div className="absolute top-3 left-3 z-[400] glass-strong rounded-lg px-3 py-2 text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Active layer: </span>
              <span className="font-semibold text-primary">{activeLayer}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> Click a parcel to inspect crop health
            </div>
          </div>

          <div className="absolute top-3 right-3 z-[400] glass-strong rounded-lg p-3 text-[11px] space-y-2 min-w-[180px]">
            <div className="font-semibold flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary" /> Legend
            </div>
            <div className="space-y-1.5">
              <LegendRow color="bg-slate-400/80" label="District boundaries" />
              <LegendRow color="bg-cyan-400/80" label="Mandal boundaries" />
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
                    activeLayer === layer ? "border-primary/50 bg-primary/10" : "border-border/60 bg-muted/20 hover:border-primary/30"
                  }`}
                  onClick={() => setActiveLayer(layer)}
                >
                  <span className="text-xs font-medium">{layer}</span>
                  <Switch
                    checked={enabled[layer] ?? false}
                    onCheckedChange={(value) => setEnabled((current) => ({ ...current, [layer]: value }))}
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">District Filter</h3>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="bg-muted/20 border-border/60">
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All districts</SelectItem>
                {districtOptions.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Showing {filteredParcels.length} of {parcels.length} parcels
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Mandal Filter</h3>
            <Select value={mandalFilter} onValueChange={setMandalFilter}>
              <SelectTrigger className="bg-muted/20 border-border/60">
                <SelectValue placeholder="All mandals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All mandals</SelectItem>
                {mandalOptions.map((mandal) => (
                  <SelectItem key={mandal} value={mandal}>
                    {mandal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {mandalOptions.length} mandals available in the selected district
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Basemap</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {["Satellite", "Hybrid", "Terrain"].map((basemap, index) => (
                <button
                  key={basemap}
                  className={`text-[10px] py-2 rounded-md border ${index === 0 ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-muted/20"}`}
                >
                  {basemap}
                </button>
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
            <h4 className="font-semibold">Parcel detail</h4>
            {filteredSelectedParcel ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{filteredSelectedParcel.id}</p>
                    <p className="text-muted-foreground">{filteredSelectedParcel.crop} · {filteredSelectedParcel.farmer}</p>
                  </div>
                  {selectedRisk ? <Badge className={selectedRisk.chip}>{selectedRisk.label}</Badge> : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <InfoCard icon={<Sprout className="h-3.5 w-3.5" />} label="Health" value={`${filteredSelectedParcel.health}%`} />
                  <InfoCard icon={<Droplets className="h-3.5 w-3.5" />} label="NDVI" value={filteredSelectedParcel.ndvi.toFixed(2)} />
                  <InfoCard icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Risk" value={filteredSelectedParcel.risk} />
                  <InfoCard icon={<MapPin className="h-3.5 w-3.5" />} label="Area" value={`${filteredSelectedParcel.acreage} ac`} />
                </div>

                <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs space-y-1.5">
                  <p><span className="text-muted-foreground">District:</span> {filteredSelectedParcel.district}</p>
                  <p><span className="text-muted-foreground">Mandal:</span> {filteredSelectedParcel.mandal}</p>
                  <p><span className="text-muted-foreground">Layer value:</span> {metricForLayer(filteredSelectedParcel, activeLayer)}</p>
                </div>

                <Button size="sm" variant="outline" className="w-full" onClick={() => setSelectedParcelId(null)}>
                  Clear selection
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground leading-relaxed">
                Click any crop parcel on the map to inspect field health, risk level, and layer-specific values.
              </p>
            )}
          </div>

          <div className="glass rounded-lg p-3 text-xs">
            <h4 className="font-semibold mb-1.5">AI Parcel Summary</h4>
            <p className="text-muted-foreground leading-relaxed">
              78.4% of monitored parcels are in healthy NDVI band (&gt; 0.55).
              <span className="text-warning"> 12,847 stress alerts</span> are concentrated in Guntur, Anantapur and Kurnool. Recommend immediate field validation in 47 high-risk mandals.
            </p>
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
