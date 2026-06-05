import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CloudRain,
  Droplets,
  Gauge,
  Landmark,
  LineChart,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { getNearestSupportCenters } from "@/lib/api";
import { DISTRICTS } from "@/lib/mock-data";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/government")({
  head: () => ({
    meta: [
      { title: "Government Dashboard - AgriShield AP" },
      {
        name: "description",
        content: "Executive view for the Department of Agriculture, Government of Andhra Pradesh.",
      },
    ],
  }),
  component: () => (
    <div>
      <PageHeader
        icon={<Landmark className="h-6 w-6 text-accent" />}
        eyebrow="Department of Agriculture"
        title="Executive Government Dashboard"
        description="Hon'ble Minister view - Commissioner view - cross-department KPIs."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Annual Outlay (Cr)"
            value={12_450}
            unit=""
            trend={4.1}
            confidence={98}
            index={0}
          />
          <KpiCard
            label="Farmers Benefitted"
            value={3_904_212}
            unit=""
            trend={2.6}
            confidence={96}
            index={1}
          />
          <KpiCard
            label="Crop Loss Averted (Cr)"
            value={1_864}
            unit=""
            trend={9.1}
            confidence={92}
            index={2}
          />
          <KpiCard label="Schemes Active" value={47} unit="" trend={1.0} confidence={100} index={3} />
        </div>

        <NearestSupportCentersSection />

        <div className="glass rounded-xl p-5 border border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Multi-model AI architecture</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                For the hackathon, do not force one AI model to solve every problem. Use
                specialized models for satellite monitoring, photo analytics, anomaly detection,
                risk prediction, and future forecasting.
              </p>
            </div>
            <Badge variant="outline" className="border-success/40 text-success bg-success/10">
              5 AI tasks, 1 platform
            </Badge>
          </div>

          <div className="mt-5 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-primary">Recommended hackathon stack</h4>
            </div>
            <div className="mt-3 grid gap-2 text-sm xl:grid-cols-5 lg:grid-cols-3 sm:grid-cols-2">
              {[
                { title: "Satellite crop health", model: "XGBoost", note: "NDVI + EVI + NDRE + weather" },
                { title: "Photo disease detection", model: "YOLOv11 + EfficientNet", note: "Regions + class" },
                { title: "Anomaly detection", model: "Isolation Forest", note: "No labeled anomalies needed" },
                { title: "Outbreak prediction", model: "LightGBM", note: "Disease risk before symptoms" },
                { title: "Future forecast", model: "LSTM", note: "15-day health projection" },
              ].map((item) => (
                <div key={item.title} className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-primary font-semibold">{item.model}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">1. Plant disease detection</h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Use YOLOv11 to detect diseased leaf regions, pest activity, and multiple diseases in
                one photo. Then use EfficientNet-B3/B4 for healthy vs diseased and disease
                category classification.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                {[
                  "Disease: Leaf Blast",
                  "Confidence: 94%",
                  "Bounding Box: Detected",
                  "Severity: Medium",
                ].map((label) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["High accuracy", "Fast inference", "Mobile-friendly", "Android deployment"].map((tag) => (
                  <Badge key={tag} variant="outline" className="border-border/60 bg-background/60">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <h4 className="font-semibold">2. Satellite crop health monitoring</h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Use XGBoost on NDVI, EVI, NDRE, temperature, humidity, rainfall, soil moisture,
                and historical crop data to predict field status.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: "NDVI", icon: <Sprout className="h-3.5 w-3.5" /> },
                  { label: "EVI", icon: <BarChart3 className="h-3.5 w-3.5" /> },
                  { label: "NDRE", icon: <Activity className="h-3.5 w-3.5" /> },
                  { label: "Weather", icon: <CloudRain className="h-3.5 w-3.5" /> },
                  { label: "Historical crop data", icon: <BrainCircuit className="h-3.5 w-3.5" /> },
                  { label: "Soil moisture", icon: <Droplets className="h-3.5 w-3.5" /> },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                  >
                    <span className="text-primary">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {["Healthy", "Moderate Stress", "Severe Stress"].map((label, index) => (
                  <div
                    key={label}
                    className={`rounded-lg border px-3 py-2 font-medium ${
                      index === 0
                        ? "border-success/40 bg-success/10 text-success"
                        : index === 1
                          ? "border-warning/40 bg-warning/10 text-warning"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h4 className="font-semibold">3. Crop stress anomaly detection</h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Detect parcels deviating from historical norms using Isolation Forest. It is fast,
                unsupervised, and does not need a labeled anomaly dataset.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium">
                  Anomaly Score = 0.87
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium">
                  Status = Abnormal
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <h4 className="font-semibold">4. Disease outbreak prediction</h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Use LightGBM to predict disease risk before symptoms appear, based on weather,
                crop age, and past disease incidents.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                {["Low", "Medium", "High"].map((label) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium"
                  >
                    {label}
                  </div>
                ))}
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium text-primary">
                  Example: Leaf Blast Risk = 82%
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-accent" />
                <h4 className="font-semibold">5. Future crop health prediction</h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Use LSTM on NDVI time series, rainfall, and weather to forecast future health and
                create proactive alerts.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium">
                  Current = 82
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium">
                  Predicted = 71
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">6. Unified crop health index</h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Instead of exposing separate raw values, generate a single Crop Health Index from
                0 to 100 so the challenge is easy to understand.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium">
                  40% NDVI
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium">
                  30% EVI
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium">
                  20% NDRE
                </div>
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 font-medium">
                  10% Weather Score
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 font-semibold text-primary">
                  Health Index = 84
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">Commissioner's brief</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The platform should combine immediate detection, crop health scoring, anomaly
              surfacing, outbreak prediction, and forward-looking health forecasts in one decision
              layer.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">Cross-department sync</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>APRTGS</span>
                <span className="text-success">Synced</span>
              </li>
              <li className="flex justify-between">
                <span>Revenue Dept - Land records</span>
                <span className="text-success">Synced</span>
              </li>
              <li className="flex justify-between">
                <span>IMD weather feed</span>
                <span className="text-success">Live</span>
              </li>
              <li className="flex justify-between">
                <span>NRSC satellite ingest</span>
                <span className="text-success">99.2%</span>
              </li>
              <li className="flex justify-between">
                <span>PMFBY insurance API</span>
                <span className="text-warning">Degraded</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-4">Recommended AI pipeline</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <PipelineCard
              title="Satellite data"
              steps={["NDVI + EVI + NDRE", "XGBoost", "Crop health score", "Isolation Forest", "Stress detection", "Alert generation"]}
            />
            <PipelineCard
              title="Farmer photo"
              steps={["YOLOv11", "Disease detection", "EfficientNet", "Disease classification", "Confidence score"]}
            />
            <PipelineCard
              title="Weather + historical data"
              steps={["LightGBM", "Disease risk prediction"]}
            />
            <PipelineCard
              title="NDVI history"
              steps={["LSTM", "Future health forecast"]}
            />
          </div>
          <div className="mt-4 rounded-xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
            If time is limited, implement the hackathon version first: YOLOv11, EfficientNet-B3,
            XGBoost, Isolation Forest, and LSTM.
          </div>
        </div>
      </div>
    </div>
  ),
});

function NearestSupportCentersSection() {
  const [district, setDistrict] = useState<string>("West Godavari");
  const [mandal, setMandal] = useState<string>("");

  const query = useQuery({
    queryKey: ["nearest-support-centers", district, mandal],
    queryFn: () => getNearestSupportCenters({ district, mandal: mandal.trim() ? mandal : undefined }),
    enabled: Boolean(district),
  });

  return (
    <div className="glass rounded-xl p-5 border border-border/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Nearest Support Centers</h3>
          <p className="text-sm text-muted-foreground mt-1">
            View RSK/ATMA and Helpdesk contacts prioritized for your selected district/mandal.
          </p>
        </div>
        <Badge variant="outline" className="border-border/60 bg-background/60">
          Mock “nearest” ranking
        </Badge>
      </div>

      <div className="mt-4 grid md:grid-cols-[1fr_0.9fr] gap-3">
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">District</span>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Mandal (optional)</span>
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={mandal}
            placeholder="e.g., Eluru"
            onChange={(e) => setMandal(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-4">
        {query.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading support centers...</div>
        ) : query.error ? (
          <div className="text-sm text-destructive font-medium">Failed to load support centers.</div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-background/40 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Center</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>District / Mandal</TableHead>
                  <TableHead>Distance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{c.address}</div>
                      {c.phone ? <div className="text-xs mt-1">{c.phone}</div> : null}
                      {c.hours ? <div className="text-xs text-muted-foreground mt-1">{c.hours}</div> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-border/60 bg-background/60">
                        {c.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.district} / {c.mandal ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.distance_km !== null ? `${c.distance_km.toFixed(1)} km` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <h4 className="font-semibold">{title}</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <span
            key={`${title}-${step}`}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs"
          >
            <span className="text-primary font-semibold">{index + 1}</span>
            <span>{step}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
