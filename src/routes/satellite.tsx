import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Satellite, Layers, Maximize2, Radio } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PARCELS } from "@/lib/mock-data";

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

function SatellitePage() {
  const [MapView, setMapView] = useState<null | React.ComponentType<{ historic: number; activeLayer: string }>>(null);
  const [historic, setHistoric] = useState(11);
  const [activeLayer, setActiveLayer] = useState("NDVI");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ NDVI: true });

  useEffect(() => {
    // dynamic import — Leaflet needs window
    import("@/components/satellite-map").then(m => setMapView(() => m.SatelliteMap));
  }, []);

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
            <Button variant="outline" size="sm" className="gap-1.5"><Maximize2 className="h-3.5 w-3.5" /> Full screen</Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-0">
        {/* MAP */}
        <div className="relative h-[calc(100vh-13rem)] min-h-[520px] border-r border-border/60">
          {MapView ? <MapView historic={historic} activeLayer={activeLayer} /> : (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
              Loading satellite layer…
            </div>
          )}

          {/* historic imagery slider overlay */}
          <div className="absolute bottom-3 left-3 right-3 z-[400] glass-strong rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Historical imagery · Month {historic + 1}/12</Label>
              <span className="text-[10px] text-muted-foreground">Drag to scrub time</span>
            </div>
            <Slider value={[historic]} onValueChange={(v) => setHistoric(v[0])} max={11} step={1} />
          </div>

          {/* active layer indicator */}
          <div className="absolute top-3 left-3 z-[400] glass-strong rounded-lg px-3 py-2 text-xs">
            <span className="text-muted-foreground">Active layer: </span>
            <span className="font-semibold text-primary">{activeLayer}</span>
          </div>
        </div>

        {/* LAYER PANEL */}
        <aside className="bg-card/40 backdrop-blur-md p-4 space-y-4 overflow-y-auto h-[calc(100vh-13rem)] min-h-[520px]">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-accent" /> Visualization Layers
            </h3>
            <div className="space-y-2">
              {LAYERS.map(l => (
                <div key={l} className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition ${
                  activeLayer === l ? "border-primary/50 bg-primary/10" : "border-border/60 bg-muted/20 hover:border-primary/30"
                }`} onClick={() => setActiveLayer(l)}>
                  <span className="text-xs font-medium">{l}</span>
                  <Switch
                    checked={enabled[l] ?? false}
                    onCheckedChange={(v) => setEnabled(s => ({ ...s, [l]: v }))}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Basemap</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {["Satellite", "Hybrid", "Terrain"].map((b, i) => (
                <button key={b} className={`text-[10px] py-2 rounded-md border ${i === 0 ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-muted/20"}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Coverage</h3>
            <div className="glass rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Satellite pass</span><span>2h 14m ago</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cloud cover</span><span className="text-success">3.2%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Parcels indexed</span><span>{PARCELS.length} (sample)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">AI confidence</span><span className="text-primary">96%</span></div>
            </div>
          </div>

          <div className="glass rounded-lg p-3 text-xs">
            <h4 className="font-semibold mb-1.5">AI Parcel Summary</h4>
            <p className="text-muted-foreground leading-relaxed">
              78.4% of monitored parcels are in healthy NDVI band (&gt; 0.55).
              <span className="text-warning"> 12,847 stress alerts</span> are concentrated in
              Guntur, Anantapur and Kurnool. Recommend immediate field validation in
              47 high-risk mandals.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
