import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { 
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, ZAxis
} from "recharts";
import { BarChart2, LineChart as LineChartIcon, Activity, PieChart as PieChartIcon, Droplet, Sprout } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/ap-production")({
  head: () => ({
    meta: [
      { title: "AP Crop Production · AgriShield AP" },
      { name: "description", content: "Andhra Pradesh Crop Yield Dashboard." },
    ],
  }),
  component: ApProductionPage,
});

type CSVRow = Record<string, string>;

function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const obj: CSVRow = {};
    headers.forEach((h, i) => {
      if (values[i] !== undefined) {
        obj[h] = values[i];
      }
    });
    return obj;
  });
}

const COLORS = [
  "#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ec4899", 
  "#14b8a6", "#eab308", "#06b6d4", "#6366f1", "#8b5cf6"
];

function ApProductionPage() {
  const [data, setData] = useState<CSVRow[]>([]);
  const [activeTab, setActiveTab] = useState("BAR");

  useEffect(() => {
    fetch("/data/crop_yield_ap.csv")
      .then(res => res.text())
      .then(csv => {
        setData(parseCSV(csv));
      })
      .catch(console.error);
  }, []);

  const topCropsData = useMemo(() => {
    const prodMap: Record<string, number> = {};
    data.forEach(row => {
      const crop = row.Crop;
      const prod = Number(row.Production);
      if (crop && !isNaN(prod)) {
        prodMap[crop] = (prodMap[crop] || 0) + prod;
      }
    });
    return Object.entries(prodMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  const yearlyData = useMemo(() => {
    const yearMap: Record<string, number> = {};
    data.forEach(row => {
      const year = row.Crop_Year;
      const prod = Number(row.Production);
      if (year && !isNaN(prod)) {
        yearMap[year] = (yearMap[year] || 0) + prod;
      }
    });
    return Object.entries(yearMap)
      .map(([year, production]) => ({ year, production }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [data]);

  const scatterData = useMemo(() => {
    const cropMap: Record<string, { area: number; prod: number; count: number }> = {};
    data.forEach(row => {
      const crop = row.Crop;
      const area = Number(row.Area);
      const prod = Number(row.Production);
      if (crop && !isNaN(area) && !isNaN(prod) && area > 0 && prod > 0) {
        if (!cropMap[crop]) cropMap[crop] = { area: 0, prod: 0, count: 0 };
        cropMap[crop].area += area;
        cropMap[crop].prod += prod;
        cropMap[crop].count += 1;
      }
    });

    return Object.entries(cropMap).map(([crop, val], index) => ({
      crop,
      area: val.area / val.count,
      production: val.prod / val.count,
      yield: (val.prod / val.area) * 1000,
      fill: COLORS[index % COLORS.length]
    }));
  }, [data]);

  const seasonData = useMemo(() => {
    const seasonMap: Record<string, number> = {};
    data.forEach(row => {
      const season = row.Season?.trim();
      const prod = Number(row.Production);
      if (season && !isNaN(prod)) {
        seasonMap[season] = (seasonMap[season] || 0) + prod;
      }
    });
    return Object.entries(seasonMap).map(([name, value]) => ({ name, value }));
  }, [data]);

  const inputsData = useMemo(() => {
    const cropMap: Record<string, { fert: number; pest: number; count: number; area: number; prod: number }> = {};
    data.forEach(row => {
      const crop = row.Crop;
      const area = Number(row.Area);
      const fert = Number(row.Fertilizer);
      const pest = Number(row.Pesticide);
      const prod = Number(row.Production);
      if (crop && !isNaN(area) && !isNaN(fert) && !isNaN(pest) && fert > 0 && pest > 0 && area > 0) {
        if (!cropMap[crop]) cropMap[crop] = { fert: 0, pest: 0, count: 0, area: 0, prod: 0 };
        cropMap[crop].fert += fert;
        cropMap[crop].pest += pest;
        cropMap[crop].prod += (isNaN(prod) ? 0 : prod);
        cropMap[crop].area += area;
        cropMap[crop].count += 1;
      }
    });

    return Object.entries(cropMap).map(([crop, val], index) => ({
      crop,
      fertilizer: val.fert / val.area,
      pesticide: val.pest / val.area,
      production: val.prod / val.count,
      yield: (val.prod / val.area) * 1000,
      fill: COLORS[index % COLORS.length]
    }));
  }, [data]);

  const rainfallData = useMemo(() => {
    const yearMap: Record<string, { totalRain: number; count: number }> = {};
    data.forEach(row => {
      const year = row.Crop_Year;
      const rain = Number(row.Annual_Rainfall);
      if (year && !isNaN(rain)) {
        if (!yearMap[year]) yearMap[year] = { totalRain: 0, count: 0 };
        yearMap[year].totalRain += rain;
        yearMap[year].count += 1;
      }
    });
    return Object.entries(yearMap)
      .map(([year, val]) => ({ year, rainfall: val.totalRain / val.count }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [data]);

  const tabs = [
    { id: "BAR", icon: BarChart2, label: "TOP CROPS" },
    { id: "LINE", icon: LineChartIcon, label: "YEARLY TREND" },
    { id: "SCATTER", icon: Activity, label: "AREA VS PROD" },
    { id: "SEASON", icon: PieChartIcon, label: "SEASON" },
    { id: "RAINFALL", icon: Droplet, label: "RAINFALL" },
    { id: "INPUTS", icon: Sprout, label: "INPUTS" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <PageHeader
        icon={<BarChart2 className="h-6 w-6 text-primary" />}
        eyebrow="State Analytics"
        title="Andhra Pradesh Crop Dashboard"
        description="Visualizing Area, Production, Yield, and Inputs data for Andhra Pradesh."
      />

      <div className="flex-1 overflow-hidden px-6 lg:px-10 py-6 flex flex-col">
        <div className="glass rounded-xl border border-border/60 flex flex-col flex-1 overflow-hidden">
          
          <div className="flex justify-between items-center p-5 border-b border-border/40">
            <h3 className="text-xl font-bold">Andhra Pradesh Crop Analytics</h3>
          </div>

          <div className="flex-1 relative overflow-hidden flex flex-col p-4">
            {activeTab === "BAR" && (
              <div className="w-full h-full pb-8">
                <h4 className="text-center font-medium mb-4">Top 10 Crops by Total Production</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCropsData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="oklch(0.32 0.04 200 / 30%)" />
                    <XAxis type="number" tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <RechartsTooltip 
                      cursor={{fill: 'oklch(0.32 0.04 200 / 10%)'}}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#2a2a2a] text-[#f1f1f1] border border-[#444] rounded p-3 shadow-xl text-[13px]">
                              <p className="font-bold mb-1">{payload[0].payload.name}</p>
                              <p>Production: {Number(payload[0].value).toLocaleString()} Tonnes</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {topCropsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === "LINE" && (
              <div className="w-full h-full pb-8">
                <h4 className="text-center font-medium mb-4">Total Production Over the Years</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.04 200 / 30%)" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} />
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#2a2a2a] text-[#f1f1f1] border border-[#444] rounded p-3 shadow-xl text-[13px]">
                              <p className="font-bold mb-1">Year: {payload[0].payload.year}</p>
                              <p>Production: {Number(payload[0].value).toLocaleString()} Tonnes</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line type="monotone" dataKey="production" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === "SCATTER" && (
              <div className="w-full h-full pb-8">
                <h4 className="text-center font-medium mb-4">Area vs Production</h4>
                <div className="w-full flex h-full">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.04 200 / 30%)" vertical={false} />
                        <XAxis 
                          type="number" dataKey="area" name="Area" scale="log" domain={['auto', 'auto']} 
                          tick={{ fontSize: 12 }} label={{ value: 'Area (Ha)', position: 'insideBottom', offset: -10, fontSize: 14, fontWeight: 600 }}
                        />
                        <YAxis 
                          type="number" dataKey="production" name="Production" scale="log" domain={['auto', 'auto']} 
                          tick={{ fontSize: 12 }} label={{ value: 'Production (Tonnes)', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                        />
                        <ZAxis type="number" dataKey="yield" range={[100, 5000]} name="Yield" />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-[#2a2a2a] text-[#f1f1f1] border border-[#444] rounded p-3 shadow-xl text-[13px] leading-snug">
                                  <p className="font-bold mb-2 text-[15px]">{data.crop}</p>
                                  <p>Avg Area: {data.area.toLocaleString('en-US', {maximumFractionDigits: 1})} Ha</p>
                                  <p>Avg Production: {data.production.toLocaleString('en-US', {maximumFractionDigits: 1})} Tonnes</p>
                                  <p>Avg Yield: {data.yield.toFixed(2)} Kg/Ha</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter data={scatterData} shape="circle">
                          {scatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div className="text-right text-xs text-muted-foreground mr-6 mt-2">
                      Size of bubble represents Avg Yield (Kg/Ha)
                    </div>
                  </div>

                  <div className="w-48 ml-4 pl-4 border-l border-border/40 flex flex-col">
                    <h4 className="text-sm font-semibold mb-3">Crops</h4>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {scatterData.map(d => (
                        <div key={d.crop} className="flex items-center gap-2 text-xs">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.fill }}></span>
                          <span className="truncate">{d.crop}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "SEASON" && (
              <div className="w-full h-full pb-8">
                <h4 className="text-center font-medium mb-4">Production by Season</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#2a2a2a] text-[#f1f1f1] border border-[#444] rounded p-3 shadow-xl text-[13px]">
                              <p className="font-bold mb-1">{payload[0].name}</p>
                              <p>Production: {Number(payload[0].value).toLocaleString()} Tonnes</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie 
                      data={seasonData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={120} 
                      fill="#8884d8" 
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {seasonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === "RAINFALL" && (
              <div className="w-full h-full pb-8">
                <h4 className="text-center font-medium mb-4">Average Annual Rainfall Over Years</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rainfallData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.04 200 / 30%)" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#2a2a2a] text-[#f1f1f1] border border-[#444] rounded p-3 shadow-xl text-[13px]">
                              <p className="font-bold mb-1">Year: {payload[0].payload.year}</p>
                              <p>Rainfall: {Number(payload[0].value).toFixed(2)} mm</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line type="step" dataKey="rainfall" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === "INPUTS" && (
              <div className="w-full h-full pb-8">
                <h4 className="text-center font-medium mb-4">Fertilizer vs Pesticide Usage</h4>
                <div className="w-full flex h-full">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.04 200 / 30%)" vertical={false} />
                        <XAxis 
                          type="number" dataKey="fertilizer" name="Fertilizer" scale="log" domain={['auto', 'auto']} 
                          tick={{ fontSize: 12 }} label={{ value: 'Fertilizer (kg/ha)', position: 'insideBottom', offset: -10, fontSize: 14, fontWeight: 600 }}
                        />
                        <YAxis 
                          type="number" dataKey="pesticide" name="Pesticide" scale="log" domain={['auto', 'auto']} 
                          tick={{ fontSize: 12 }} label={{ value: 'Pesticide (kg/ha)', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                        />
                        <ZAxis type="number" dataKey="yield" range={[100, 5000]} name="Yield" />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-[#2a2a2a] text-[#f1f1f1] border border-[#444] rounded p-3 shadow-xl text-[13px] leading-snug">
                                  <p className="font-bold mb-2 text-[15px]">{data.crop}</p>
                                  <p>Avg Fertilizer: {data.fertilizer.toLocaleString('en-US', {maximumFractionDigits: 1})} kg/ha</p>
                                  <p>Avg Pesticide: {data.pesticide.toLocaleString('en-US', {maximumFractionDigits: 1})} kg/ha</p>
                                  <p>Avg Production: {data.production.toLocaleString('en-US', {maximumFractionDigits: 1})} Tonnes</p>
                                  <p>Avg Yield: {data.yield.toFixed(2)} Kg/Ha</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter data={inputsData} shape="circle">
                          {inputsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    <div className="text-right text-xs text-muted-foreground mr-6 mt-2">
                      Size of bubble represents Avg Yield (Kg/Ha)
                    </div>
                  </div>

                  <div className="w-48 ml-4 pl-4 border-l border-border/40 flex flex-col">
                    <h4 className="text-sm font-semibold mb-3">Crops</h4>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {inputsData.map(d => (
                        <div key={d.crop} className="flex items-center gap-2 text-xs">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.fill }}></span>
                          <span className="truncate">{d.crop}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tab Bar Row */}
          <div className="flex border-t border-border/40 bg-muted/5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold tracking-wider transition-all
                  ${activeTab === tab.id 
                    ? 'bg-primary/10 text-primary border-t-2 border-primary -mt-[1px]' 
                    : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground border-t-2 border-transparent -mt-[1px]'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
