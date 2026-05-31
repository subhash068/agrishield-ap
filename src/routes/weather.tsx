import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudSun, CloudRain, Thermometer, Droplets, Wind, AlertTriangle } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { useAppShell } from "@/components/app-shell-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDistricts,
  getWeatherHistory,
  getWeatherLiveSummary,
  getWeatherProjection2027,
} from "@/lib/api";

const FALLBACK_DISTRICTS = [
  "Anantapur",
  "Chittoor",
  "East Godavari",
  "Guntur",
  "Krishna",
  "Kurnool",
  "Nellore",
  "Prakasam",
  "Srikakulam",
  "Visakhapatnam",
  "Vizianagaram",
  "West Godavari",
  "YSR Kadapa",
];

type WeatherMode = "history" | "projection";

export const Route = createFileRoute("/weather")({
  head: () => ({
    meta: [
      { title: "Weather Intelligence · AgriShield AP" },
      {
        name: "description",
        content:
          "Historical weather from 2024 to today and a 2027 projection based on that history.",
      },
    ],
  }),
  component: WeatherPage,
});

function WeatherPage() {
  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });
  const { data: liveSummary } = useQuery({
    queryKey: ["weather-live"],
    queryFn: getWeatherLiveSummary,
  });
  const { selectedDistrict, setSelectedDistrict } = useAppShell();
  const [selectedMode, setSelectedMode] = useState<WeatherMode>("history");

  const { data: historyData = [] } = useQuery({
    queryKey: ["weather-history"],
    queryFn: getWeatherHistory,
    enabled: selectedMode === "history",
  });

  const { data: projectionData = [] } = useQuery({
    queryKey: ["weather-projection-2027"],
    queryFn: getWeatherProjection2027,
    enabled: selectedMode === "projection",
  });

  const weatherData = selectedMode === "history" ? historyData : projectionData;
  const availableDistricts = districts.length ? districts : FALLBACK_DISTRICTS;
  const districtOptions = useMemo(() => ["all", ...availableDistricts], [availableDistricts]);
  const dayOptions = useMemo(() => weatherData.map((point) => point.day), [weatherData]);
  const [selectedDay, setSelectedDay] = useState<string>("");

  const selectedDistrictIndex =
    selectedDistrict === "all" ? 0 : Math.max(availableDistricts.indexOf(selectedDistrict), 0);
  const selectedDistrictPoint = weatherData.length
    ? weatherData[selectedDistrictIndex % weatherData.length]
    : null;
  const selectedWeatherDay = selectedDay || weatherData[0]?.day || "";
  const selectedDayPoint = weatherData.find((point) => point.day === selectedWeatherDay) ?? null;

  const activeDistrictLabel = selectedDistrict === "all" ? "All districts" : selectedDistrict;
  const activeModeLabel = selectedMode === "history" ? "Observed 2024-today" : "Projected 2027";

  const rainHeat = availableDistricts.map((district, index) => {
    const baseRain = weatherData.length
      ? Math.round(weatherData.reduce((sum, point) => sum + point.rainfall, 0))
      : 0;
    const rain = Math.max(
      0,
      baseRain -
        index * 3 +
        Math.round((weatherData[index % Math.max(weatherData.length, 1)]?.rainfall ?? 0) * 2),
    );
    const deficit = weatherData.length
      ? Math.round(weatherData[index % weatherData.length]?.drought ?? 0) - 50
      : 0;
    return { district, rain, deficit };
  });

  const focusedTemp =
    selectedDayPoint?.temp ?? selectedDistrictPoint?.temp ?? liveSummary?.temperature ?? 0;
  const focusedRain =
    selectedDayPoint?.rainfall ?? selectedDistrictPoint?.rainfall ?? liveSummary?.rainfall_24h ?? 0;
  const focusedHumidity =
    selectedDayPoint?.humidity ?? selectedDistrictPoint?.humidity ?? liveSummary?.humidity ?? 0;

  const avgTemp = weatherData.length
    ? (weatherData.reduce((sum, point) => sum + point.temp, 0) / weatherData.length).toFixed(1)
    : (liveSummary?.temperature.toFixed(1) ?? "0.0");
  const totalRain = weatherData.reduce((sum, point) => sum + point.rainfall, 0).toFixed(0);
  const avgHumidity = weatherData.length
    ? Math.round(weatherData.reduce((sum, point) => sum + point.humidity, 0) / weatherData.length)
    : (liveSummary?.humidity ?? 0);
  const windSpeed = liveSummary?.wind_speed.toFixed(0) ?? "0";

  return (
    <div>
      <PageHeader
        icon={<CloudSun className="h-6 w-6 text-accent" />}
        eyebrow="IMD · AgriShield Fusion"
        title="Weather Intelligence"
        description="Historical weather from 2024 to today and a 2027 projection based on that history."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="glass rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Weather mode</p>
            <h3 className="font-semibold text-sm">{activeModeLabel}</h3>
            <p className="text-xs text-muted-foreground">
              Switch between observed history and 2027 projection.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <Button
              type="button"
              variant="default"
              onClick={() => setSelectedMode("projection")}
              className="w-full md:w-auto"
            >
              AI Forecast
            </Button>
            <div className="w-full md:w-[260px]">
              <Select
                value={selectedMode}
                onValueChange={(value) => setSelectedMode(value as WeatherMode)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="history">Observed 2024-today</SelectItem>
                  <SelectItem value="projection">Projected 2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Location filter</p>
            <h3 className="font-semibold text-sm">{activeDistrictLabel}</h3>
            <p className="text-xs text-muted-foreground">
              Switch the weather panels to a specific district.
            </p>
          </div>
          <div className="w-full md:w-[260px]">
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {districtOptions.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district === "all" ? "All districts" : district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="glass rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Date filter</p>
            <h3 className="font-semibold text-sm">{selectedWeatherDay || "Select a date"}</h3>
            <p className="text-xs text-muted-foreground">
              Pick a specific day from the selected weather dataset.
            </p>
          </div>
          <div className="w-full md:w-[260px]">
            <Select value={selectedWeatherDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              icon: Thermometer,
              label: "Temperature",
              value: `${focusedTemp.toFixed(1)}°C`,
              trend: selectedDayPoint ? selectedDayPoint.day : activeModeLabel,
              color: "text-warning",
            },
            {
              icon: CloudRain,
              label: "Rainfall",
              value: `${focusedRain.toFixed(0)} mm`,
              trend: selectedDayPoint
                ? `${selectedDayPoint.day} selected`
                : `${totalRain} mm total`,
              color: "text-info",
            },
            {
              icon: Droplets,
              label: "Humidity",
              value: `${focusedHumidity}%`,
              trend: selectedMode === "projection" ? "Projected" : "Observed",
              color: "text-accent",
            },
            {
              icon: Wind,
              label: "Wind Speed",
              value: `${windSpeed} km/h`,
              trend: liveSummary ? liveSummary.location : "Live",
              color: "text-primary",
            },
          ].map((c) => (
            <div key={c.label} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <c.icon className={`h-5 w-5 ${c.color}`} />
                <Badge variant="outline" className="text-[10px]">
                  {c.trend}
                </Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-1">Rainfall Trend</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Daily rainfall for the active dataset
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weatherData}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.04 200)",
                    border: "1px solid oklch(0.32 0.04 200)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="rainfall" fill="oklch(0.78 0.17 200)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-1">Temperature & Humidity</h3>
            <p className="text-xs text-muted-foreground mb-3">{activeModeLabel}</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weatherData}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.04 200)",
                    border: "1px solid oklch(0.32 0.04 200)",
                    borderRadius: 8,
                  }}
                />
                <Line dataKey="temp" stroke="oklch(0.82 0.17 80)" strokeWidth={2} dot={false} />
                <Line
                  dataKey="humidity"
                  stroke="oklch(0.78 0.17 200)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-1">District Rainfall Heatmap</h3>
          <p className="text-xs text-muted-foreground mb-3">Cumulative rainfall vs LPA deficit</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rainHeat}>
              <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
              <XAxis
                dataKey="district"
                tick={{ fontSize: 9, fill: "oklch(0.68 0.03 200)" }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.21 0.04 200)",
                  border: "1px solid oklch(0.32 0.04 200)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="rain" radius={[6, 6, 0, 0]}>
                {rainHeat.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.deficit < -10
                        ? "oklch(0.68 0.22 25)"
                        : d.deficit < 0
                          ? "oklch(0.82 0.17 80)"
                          : "oklch(0.78 0.17 200)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: "Cyclone Watch · Coastal AP",
              desc: "Low-pressure system tracked. Pre-harvest advisory broadcast to 84,000 farmers.",
              level: "High",
            },
            {
              title: "Drought Watch · Rayalaseema",
              desc: "Rainfall deficit at 18%. Anantapur, Kurnool, Kadapa on amber alert.",
              level: "Medium",
            },
            {
              title: "Heatwave Anomaly · Guntur",
              desc: "Forecast 41°C+ for 3 consecutive days. Irrigation schedule auto-updated.",
              level: "High",
            },
          ].map((a) => (
            <div key={a.title} className="glass rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/15 grid place-items-center">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <Badge
                    variant="outline"
                    className="border-warning/40 text-warning bg-warning/10 mb-1"
                  >
                    {a.level}
                  </Badge>
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
