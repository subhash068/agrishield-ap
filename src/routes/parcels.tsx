import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Map as MapIcon, Search } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getParcels, getSpectralTrend, getWeatherForecast } from "@/lib/api";

export const Route = createFileRoute("/parcels")({
  head: () => ({
    meta: [
      { title: "Parcel Intelligence · AgriShield AP" },
      { name: "description", content: "Drill into parcel-level health scores, growth analytics, stress probability and weather correlation." },
    ],
  }),
  component: ParcelsPage,
});

function ParcelsPage() {
  const { data: parcels = [] } = useQuery({ queryKey: ["parcels"], queryFn: getParcels });
  const { data: spectralTrend = [] } = useQuery({ queryKey: ["spectral-trend"], queryFn: getSpectralTrend });
  const { data: weatherForecast = [] } = useQuery({ queryKey: ["weather"], queryFn: getWeatherForecast });

  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!parcels.length) return null;
    return parcels.find((p) => p.id === selectedId) ?? parcels[0];
  }, [parcels, selectedId]);

  const filtered = useMemo(
    () =>
      parcels
        .filter(
          (p) =>
            !q ||
            p.id.toLowerCase().includes(q.toLowerCase()) ||
            p.farmer.toLowerCase().includes(q.toLowerCase()) ||
            p.district.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 80),
    [parcels, q],
  );

  return (
    <div>
      <PageHeader
        icon={<MapIcon className="h-6 w-6 text-accent" />}
        eyebrow="Parcel Intelligence"
        title="Parcel-Level Crop Analytics"
        description="Per-parcel health, AI confidence, growth timelines and weather correlation."
      />

      <div className="px-6 lg:px-10 py-6 grid lg:grid-cols-[360px_1fr] gap-5">
        <div className="glass rounded-xl overflow-hidden flex flex-col h-[calc(100vh-13rem)] min-h-[520px]">
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-9 bg-muted/40" placeholder="Search parcel / farmer / district" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">{filtered.length} of {parcels.length} parcels</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3 hover:bg-muted/30 transition ${selected?.id === p.id ? "bg-primary/10 border-l-2 border-primary" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{p.id}</span>
                  <Badge variant="outline" className={`text-[10px] ${
                    p.risk === "High" ? "border-destructive/40 text-destructive" :
                    p.risk === "Medium" ? "border-warning/40 text-warning" :
                    "border-success/40 text-success"
                  }`}>{p.risk}</Badge>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{p.farmer} · {p.crop} · {p.district}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={p.health} className="h-1 flex-1" />
                  <span className="text-[10px] tabular-nums">{p.health}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Parcel</p>
                <h2 className="text-2xl font-bold">{selected?.id ?? "--"}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selected ? `${selected.farmer} · ${selected.crop} · ${selected.acreage} acres · ${selected.mandal}, ${selected.district}` : "No parcel selected"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="glass rounded-lg p-2.5 min-w-[80px]">
                  <p className="text-[10px] text-muted-foreground">Health</p>
                  <p className="text-lg font-bold text-primary">{selected?.health ?? 0}%</p>
                </div>
                <div className="glass rounded-lg p-2.5 min-w-[80px]">
                  <p className="text-[10px] text-muted-foreground">AI Conf.</p>
                  <p className="text-lg font-bold text-accent">{selected?.confidence ?? 0}%</p>
                </div>
                <div className="glass rounded-lg p-2.5 min-w-[80px]">
                  <p className="text-[10px] text-muted-foreground">NDVI</p>
                  <p className="text-lg font-bold">{selected?.ndvi ?? 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="glass rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-2">Spectral growth timeline</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={spectralTrend}>
                  <defs><linearGradient id="pg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="oklch(0.78 0.19 145)" stopOpacity={0.5} /><stop offset="100%" stopColor="oklch(0.78 0.19 145)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "oklch(0.68 0.03 200)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                  <Tooltip contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="ndvi" stroke="oklch(0.78 0.19 145)" fill="url(#pg)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="glass rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-2">Weather correlation · next 14d</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weatherForecast}>
                  <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "oklch(0.68 0.03 200)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                  <Tooltip contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8 }} />
                  <Line dataKey="rainfall" stroke="oklch(0.78 0.17 200)" strokeWidth={2} dot={false} />
                  <Line dataKey="temp" stroke="oklch(0.82 0.17 80)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-sm mb-3">Latest advisory</h3>
            <p className="text-sm">Maintain irrigation at <span className="text-primary font-semibold">2.4 cm</span> over next 5 days. Apply
              Tricyclazole if blast symptoms emerge. Forecast indicates 12 mm rainfall on Day 9 — defer top-dressing accordingly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
