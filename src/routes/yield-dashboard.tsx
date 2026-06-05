import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";


type Risk = "Low" | "Medium" | "High" | "Critical";

const riskBadgeClass: Record<Risk, string> = {
  Low: "border-success/40 text-success bg-success/10",
  Medium: "border-info/40 text-info bg-info/10",
  High: "border-warning/40 text-warning bg-warning/10",
  Critical: "border-destructive/40 text-destructive bg-destructive/10",
};

export const Route = createFileRoute("/yield-dashboard")({
  head: () => ({
    meta: [
      { title: "AI Yield Prediction · AgriShield AP" },
      {
        name: "description",
        content: "ICRISAT-backed yield prediction dashboard (district, crop, year, rainfall).",
      },
    ],
  }),
  component: YieldDashboardPage,
});

type YieldDistrictsAndCropsResponse = { districts: string[]; crops: string[] };

type YieldHistoryPoint = {
  year: number;
  yieldKgPerHa: number;
  production1000Tons: number;
  area1000Ha: number;
};

type YieldPredictResponse = {
  district: string;
  crop: string;
  input_year: number;
  rainfall_mm: number;
  predicted_yield_kg_per_ha: number;
  predicted_production_1000_tons: number;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  yield_reduction_percent: number;
  explanation: string;
};

async function fetchYieldDistrictsAndCrops(): Promise<YieldDistrictsAndCropsResponse> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/yield/districts-and-crops`);
  return (await res.json()) as YieldDistrictsAndCropsResponse;
}

async function fetchYieldHistory(district: string, crop: string): Promise<YieldHistoryPoint[]> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
  const url = `${base}/yield/history?district=${encodeURIComponent(district)}&crop=${encodeURIComponent(crop)}`;
  const res = await fetch(url);
  return (await res.json()) as YieldHistoryPoint[];
}

async function postPredictYield(payload: {
  district: string;
  crop: string;
  year: number;
  rainfall_mm: number;
}): Promise<YieldPredictResponse> {
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
  const res = await fetch(`${base}/yield/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as YieldPredictResponse;
}

function YieldDashboardPage() {
  const { data: options } = useQuery({
    queryKey: ["yield-districts-crops"],
    queryFn: fetchYieldDistrictsAndCrops,
  });
  const districts: string[] = options?.districts ?? [];
  const crops: string[] = options?.crops ?? [];


  const [district, setDistrict] = useState("West Godavari");
  const [crop, setCrop] = useState("RICE");
  const [year, setYear] = useState(2015);
  const [rainfall, setRainfall] = useState(300);

  const historyQuery = useQuery({
    queryKey: ["yield-history", district, crop],
    queryFn: () => fetchYieldHistory(district, crop),
    enabled: Boolean(district && crop),
  });

  const history = historyQuery.data ?? [];

  const chartData = useMemo(() => {
    // normalize for recharts
    return history.map((p) => ({
      year: p.year,
      yield: p.yieldKgPerHa,
      production: p.production1000Tons,
    }));
  }, [history]);

  const predictMutation = useMutation<YieldPredictResponse, unknown, void>({
    mutationFn: () => postPredictYield({ district, crop, year, rainfall_mm: rainfall }),
  });

  const result = predictMutation.data;

  const onPredict = () => {
    predictMutation.mutate();
  };

  const risk: Risk | undefined = result?.risk_level as Risk | undefined;

  return (
    <div>
      <PageHeader
        icon={<Sparkles className="h-6 w-6 text-primary" />}
        eyebrow="AI Yield Intelligence"
        title="ICRISAT Crop Yield Prediction"
        description="Demo uses ICRISAT district-level history + rainfall signal to forecast yield, production and risk."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="grid lg:grid-cols-[1fr_0.95fr] gap-5">
          <div className="glass rounded-xl p-5 border border-border/60">
            <h3 className="font-semibold mb-2">Inputs</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">District</span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  {(districts.length ? districts : [district]).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Crop</span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                >
                  {(crops.length ? crops : [crop]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Year</span>
                <input
                  type="number"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Rainfall (mm)</span>
                <input
                  type="number"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={rainfall}
                  onChange={(e) => setRainfall(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={onPredict} disabled={predictMutation.isPending} className="gap-2 glow-primary">
                <Sparkles className="h-4 w-4" />
                {predictMutation.isPending ? "Predicting..." : "Run AI Prediction"}
              </Button>
              {historyQuery.isFetching ? <Badge variant="outline">Loading history...</Badge> : null}
              {predictMutation.error ? (
                <div className="w-full">
                  <Badge variant="destructive">Prediction failed</Badge>
                </div>
              ) : null}
            </div>

            {result ? (
              <div className="mt-5 grid md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Predicted yield</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">{result.predicted_yield_kg_per_ha.toFixed(0)} kg/ha</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Predicted production</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">{result.predicted_production_1000_tons.toFixed(0)} 1000 tons</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-4 md:col-span-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Risk level</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums">{result.risk_level}</p>
                    </div>
                    <Badge variant="outline" className={risk ? riskBadgeClass[risk] : ""}>
                      Yield reduction: {result.yield_reduction_percent.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-6">{result.explanation}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">Input: {district} / {crop}</Badge>
                    <Badge variant="outline">Year: {result.input_year}</Badge>
                    <Badge variant="outline">Rainfall: {result.rainfall_mm.toFixed(1)}mm</Badge>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="glass rounded-xl p-5 border border-border/60">
            <h3 className="font-semibold mb-2">AI Insight Summary</h3>
            <p className="text-sm text-muted-foreground">
              Baseline is a moving average of historical yields from ICRISAT for the selected district & crop.
              Rainfall is normalized into a drought/adequate signal for a simple demo heuristic.
            </p>

            <div className="mt-4 space-y-3">
              <Card className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">What you’re seeing</p>
                <p className="mt-1 text-sm">
                  Forecast yield (kg/ha), production (1000 tons) and a risk badge for the specified year.
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Why rainfall?</p>
                <p className="mt-1 text-sm">Low rainfall reduces predicted yield; high rainfall gives a small uplift.</p>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">
          <div className="glass rounded-xl p-5 border border-border/60">
            <h3 className="font-semibold mb-2">Yield history (ICRISAT)</h3>
            <p className="text-xs text-muted-foreground mb-3">Line chart for the selected district and crop.</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.04 200)",
                    border: "1px solid oklch(0.32 0.04 200)",
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="yield" stroke="oklch(0.78 0.19 145)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5 border border-border/60">
            <h3 className="font-semibold mb-2">Production trend</h3>
            <p className="text-xs text-muted-foreground mb-3">Bars represent production (1000 tons) for historical years.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.04 200)",
                    border: "1px solid oklch(0.32 0.04 200)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="production" radius={[6, 6, 0, 0]} fill="oklch(0.82 0.17 80)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

