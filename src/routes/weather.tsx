import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CloudSun, CloudRain, Thermometer, Droplets, Wind, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getDistricts, getWeatherForecast } from "@/lib/api";

export const Route = createFileRoute("/weather")({
  head: () => ({
    meta: [
      { title: "Weather Intelligence · AgriShield AP" },
      { name: "description", content: "Rainfall, humidity, temperature and drought analytics across Andhra Pradesh districts." },
    ],
  }),
  component: WeatherPage,
});

function WeatherPage() {
  const { data: weatherForecast = [] } = useQuery({ queryKey: ["weather"], queryFn: getWeatherForecast });
  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });
  const rainHeat = districts.map(d => ({ district: d, rain: Math.floor(Math.random() * 220), deficit: Math.floor(Math.random() * 40 - 20) }));

  return (
    <div>
      <PageHeader
        icon={<CloudSun className="h-6 w-6 text-accent" />}
        eyebrow="IMD · AgriShield Fusion"
        title="Weather Intelligence"
        description="Hyper-local rainfall, drought forecasting and climate anomaly detection."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        {/* current */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Thermometer, label: "Avg Temperature", value: "31.4°C", trend: "+0.6°", color: "text-warning" },
            { icon: CloudRain, label: "Rainfall (7d)", value: "84 mm", trend: "-12%", color: "text-info" },
            { icon: Droplets, label: "Humidity", value: "72%", trend: "+4%", color: "text-accent" },
            { icon: Wind, label: "Wind Speed", value: "14 km/h", trend: "+2", color: "text-primary" },
          ].map(c => (
            <div key={c.label} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <c.icon className={`h-5 w-5 ${c.color}`} />
                <Badge variant="outline" className="text-[10px]">{c.trend}</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            </div>
          ))}
        </div>

        {/* forecast */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-1">14-Day Rainfall Forecast</h3>
            <p className="text-xs text-muted-foreground mb-3">Predicted precipitation (mm) — statewide weighted</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weatherForecast}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8 }} />
                <Bar dataKey="rainfall" fill="oklch(0.78 0.17 200)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-1">Temperature & Humidity</h3>
            <p className="text-xs text-muted-foreground mb-3">14-day outlook</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weatherForecast}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8 }} />
                <Line dataKey="temp" stroke="oklch(0.82 0.17 80)" strokeWidth={2} dot={false} />
                <Line dataKey="humidity" stroke="oklch(0.78 0.17 200)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* rainfall heatmap by district */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-1">District Rainfall Heatmap</h3>
          <p className="text-xs text-muted-foreground mb-3">Cumulative rainfall vs LPA deficit (last 30 days)</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rainHeat}>
              <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
              <XAxis dataKey="district" tick={{ fontSize: 9, fill: "oklch(0.68 0.03 200)" }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
              <Tooltip contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8 }} />
              <Bar dataKey="rain" radius={[6, 6, 0, 0]}>
                {rainHeat.map((d, i) => (
                  <Cell key={i} fill={d.deficit < -10 ? "oklch(0.68 0.22 25)" : d.deficit < 0 ? "oklch(0.82 0.17 80)" : "oklch(0.78 0.17 200)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* severe alerts */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Cyclone Watch · Coastal AP", desc: "Low-pressure system tracked. Pre-harvest advisory broadcast to 84,000 farmers.", level: "High" },
            { title: "Drought Watch · Rayalaseema", desc: "Rainfall deficit at 18%. Anantapur, Kurnool, Kadapa on amber alert.", level: "Medium" },
            { title: "Heatwave Anomaly · Guntur", desc: "Forecast 41°C+ for 3 consecutive days. Irrigation schedule auto-updated.", level: "High" },
          ].map(a => (
            <div key={a.title} className="glass rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/15 grid place-items-center"><AlertTriangle className="h-5 w-5 text-warning" /></div>
                <div>
                  <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10 mb-1">{a.level}</Badge>
                  <h4 className="font-semibold text-sm">{a.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
