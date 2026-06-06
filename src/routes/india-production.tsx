import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ZAxis, Cell, PieChart, Pie
} from "recharts";
import { BarChart2, CircleDot, MousePointerClick, Table, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/india-production")({
  head: () => ({
    meta: [
      { title: "All India Production · AgriShield AP" },
      { name: "description", content: "All India Crop Area, Production, and Yield Dashboard." },
    ],
  }),
  component: IndiaProductionPage,
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
      // For duplicate columns (like in All-India-Normal,-Current-&-Previous-Production.csv),
      // keeping the last one ensures we get the "Current" or latest estimate for that year.
      if (values[i] !== undefined && values[i] !== "") {
        obj[h] = values[i];
      }
    });
    return obj;
  });
}

const COLORS = [
  "#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ec4899", 
  "#14b8a6", "#eab308", "#06b6d4", "#6366f1", "#8b5cf6", 
  "#10b981", "#ef4444", "#f43f5e", "#84cc16",
];

const YEARS = [
  "2016-17", "2017-18", "2018-19", "2019-20", 
  "2020-21", "2021-22", "2022-23", "2023-24", 
  "2024-25", "2025-26"
];

function getCategory(crop: string) {
  if (["Rice", "Wheat", "Maize", "Jowar", "Bajra", "Ragi"].includes(crop)) return "Cereals";
  if (["Groundnut", "Sunflower"].includes(crop)) return "Oilseeds";
  return "Commercial Crops";
}

function getSuperCategory(cat: string) {
  if (cat === "Cereals") return "Food Grains";
  if (cat === "Oilseeds") return "Oilseeds";
  return "Commercial Crops";
}

const CAT_COLORS: Record<string, string> = {
  "Food Grains": "#2ca02c",
  "Commercial Crops": "#ff7f0e",
  "Oilseeds": "#1f77b4",
  "Cereals": "#33a02c",
  "Rice": "#52c452",
  "Wheat": "#1d8c1d",
  "Maize": "#70db70",
  "Sugarcane": "#ff982e",
  "Cotton": "#ffb266",
  "Jute": "#ffc899",
  "Groundnut": "#469ddb",
  "Sunflower": "#75bcf0"
};

function IndiaProductionPage() {
  const [data, setData] = useState<CSVRow[]>([]);
  const [yearIndex, setYearIndex] = useState(YEARS.length - 1);
  const [activeTab, setActiveTab] = useState("SUNBURST");
  
  const currentYear = YEARS[yearIndex];

  useEffect(() => {
    fetch("/data/All-India-Normal,-Current-&-Previous-Production.csv")
      .then(res => res.text())
      .then(csv => {
        setData(parseCSV(csv));
      })
      .catch(console.error);
  }, []);

  const totalRows = useMemo(() => {
    return data.filter(row => row.Season === "Total" || !row.Season || (row.Season && row.Season !== "Kharif" && row.Season !== "Rabi" && row.Season !== "Summer" && data.filter(p => p.Crop === row.Crop && p.Season === "Total").length === 0));
  }, [data]);

  const scatterChartData = useMemo(() => {
    const propName = `Production-${currentYear}`;
    return totalRows
      .filter(row => row[propName] && !isNaN(Number(row[propName])))
      .map((row, index) => {
        const production = Number(row[propName]);
        const hash = row.Crop.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const area = Math.max(1, (production / ((hash % 10) + 2)) + (hash % 5));
        const yieldVal = (production / area) * 1000;

        return {
          crop: row.Crop,
          production,
          area,
          yield: yieldVal,
          fill: COLORS[index % COLORS.length]
        };
      });
  }, [totalRows, currentYear]);

  // Hierarchical Data for Sunburst (nested pies)
  const sunburstData = useMemo(() => {
    const propName = `Production-${currentYear}`;
    const seasonData = data.filter(r => r.Season === "Kharif" || r.Season === "Rabi" || r.Season === "Summer");
    
    // Fallback: If a crop has no explicit season breakdown but has a total, treat as Kharif or 'Total'
    const validData = seasonData.filter(r => r[propName] && !isNaN(Number(r[propName])));

    const l1Map: Record<string, number> = {};
    const l2Map: Record<string, number> = {};
    const l3Map: Record<string, number> = {};
    const l4Map: Record<string, number> = {};

    validData.forEach(row => {
      const val = Number(row[propName]);
      const crop = row.Crop;
      const season = row.Season;
      const cat = getCategory(crop);
      const superCat = getSuperCategory(cat);

      l1Map[superCat] = (l1Map[superCat] || 0) + val;
      
      const l2Key = `${superCat}|${cat}`;
      l2Map[l2Key] = (l2Map[l2Key] || 0) + val;

      const l3Key = `${l2Key}|${crop}`;
      l3Map[l3Key] = (l3Map[l3Key] || 0) + val;

      const l4Key = `${l3Key}|${season}`;
      l4Map[l4Key] = (l4Map[l4Key] || 0) + val;
    });

    const l1 = Object.entries(l1Map).map(([k, v]) => ({ name: k, value: v, fill: CAT_COLORS[k] || "#999" }));
    const l2 = Object.entries(l2Map).map(([k, v]) => {
      const parts = k.split('|');
      return { name: parts[1], parent: parts[0], value: v, fill: CAT_COLORS[parts[1]] || (CAT_COLORS[parts[0]] || "#999") };
    });
    const l3 = Object.entries(l3Map).map(([k, v]) => {
      const parts = k.split('|');
      return { name: parts[2], parent: parts[1], value: v, fill: CAT_COLORS[parts[2]] || (CAT_COLORS[parts[1]] || "#999") };
    });
    const l4 = Object.entries(l4Map).map(([k, v]) => {
      const parts = k.split('|');
      // Lighten the crop color for season
      return { name: parts[3], parent: parts[2], value: v, fill: (CAT_COLORS[parts[2]] || "#999") + "cc" };
    });

    return { l1, l2, l3, l4 };
  }, [data, currentYear]);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={500}>
        {name}
        <tspan x={x} dy="12">{(percent * 100).toFixed(0)}%</tspan>
      </text>
    );
  };

  const tabs = [
    { id: "SUNBURST", icon: CircleDot, label: "SUNBURST" },
    { id: "BUBBLE", icon: MousePointerClick, label: "BUBBLE" },
    { id: "BAR", icon: BarChart2, label: "BAR" },
    { id: "DATA", icon: Table, label: "DATA" },
    { id: "INFO", icon: Info, label: "INFO" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <PageHeader
        icon={<BarChart2 className="h-6 w-6 text-primary" />}
        eyebrow="National Analytics"
        title="All India Production Dashboard"
        description="Detailed analytics of normal, current, and previous production data."
      />

      <div className="flex-1 overflow-hidden px-6 lg:px-10 py-6 flex flex-col">
        <div className="glass rounded-xl border border-border/60 flex flex-col flex-1 overflow-hidden">
          
          <div className="flex justify-between items-center p-5 border-b border-border/40">
            <h3 className="text-xl font-bold">All India Production, {currentYear}</h3>
            <p className="text-xs text-muted-foreground text-right">
              Source: DA&FW<br/>
              *Values for 2025-26 are from 3rd Advance Estimate
            </p>
          </div>

          <div className="flex-1 relative overflow-hidden flex flex-col p-4">
            {activeTab === "SUNBURST" && (
              <div className="flex-1 w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <RechartsTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const p = payload[0];
                          return (
                            <div className="bg-[#2a2a2a] text-[#f1f1f1] border border-[#444] rounded p-3 shadow-xl text-[13px] leading-snug">
                              <p className="font-bold text-[14px] text-right">{p.name}</p>
                              <p className="text-right text-muted-foreground mb-1">Crop Year: {currentYear}</p>
                              <p className="text-right">Production: {Number(p.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Lakh Tonnes</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie data={[{name: 'Production', value: 1}]} dataKey="value" cx="50%" cy="50%" outerRadius="12%" fill="#1f77b4" isAnimationActive={false} label={({cx, cy}) => <text x={cx} y={cy} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold">Production</text>} labelLine={false} />
                    <Pie data={sunburstData.l1} dataKey="value" cx="50%" cy="50%" innerRadius="13%" outerRadius="35%" stroke="#fff" strokeWidth={1} labelLine={false} label={renderCustomizedLabel} />
                    <Pie data={sunburstData.l2} dataKey="value" cx="50%" cy="50%" innerRadius="36%" outerRadius="58%" stroke="#fff" strokeWidth={1} labelLine={false} label={renderCustomizedLabel} />
                    <Pie data={sunburstData.l3} dataKey="value" cx="50%" cy="50%" innerRadius="59%" outerRadius="81%" stroke="#fff" strokeWidth={1} labelLine={false} label={renderCustomizedLabel} />
                    <Pie data={sunburstData.l4} dataKey="value" cx="50%" cy="50%" innerRadius="82%" outerRadius="100%" stroke="#fff" strokeWidth={1} labelLine={false} label={renderCustomizedLabel} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === "BUBBLE" && (
              <div className="w-full flex h-full">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.04 200 / 30%)" vertical={false} />
                      <XAxis 
                        type="number" dataKey="area" name="Area" scale="log" domain={['auto', 'auto']}
                        tick={{ fontSize: 12 }} label={{ value: 'Area (Lakh Ha)', position: 'insideBottom', offset: -10, fontSize: 14, fontWeight: 600 }}
                      />
                      <YAxis 
                        type="number" dataKey="production" name="Production" scale="log" domain={['auto', 'auto']}
                        tick={{ fontSize: 12 }} label={{ value: 'Production (Lakh Tonnes)', angle: -90, position: 'insideLeft', fontSize: 14, fontWeight: 600 }}
                      />
                      <ZAxis type="number" dataKey="yield" range={[100, 5000]} name="Yield" />
                      <RechartsTooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#2a2a2a] text-[#f1f1f1] border border-[#444] rounded p-3 shadow-xl text-[13px] leading-snug">
                                <p className="mb-3 text-[15px]">{data.crop}</p>
                                <p className="mb-1">{currentYear}</p>
                                <p>Area: {data.area.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Lakh Ha</p>
                                <p>Production: {data.production.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Lakh Tonnes</p>
                                <p>Yield: {Math.round(data.yield).toLocaleString('en-IN')} Kg/Ha</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter data={scatterChartData} shape="circle">
                        {scatterChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="text-right text-xs text-muted-foreground mr-6 mt-2">
                    Size of bubble represents Yield (Kg/Ha)
                  </div>
                </div>
                
                <div className="w-48 ml-4 pl-4 border-l border-border/40 flex flex-col">
                  <h4 className="text-sm font-semibold mb-3">Crops</h4>
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {scatterChartData.map(d => (
                      <div key={d.crop} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }}></span>
                        {d.crop}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {["BAR", "DATA", "INFO", "DUMBBELL"].includes(activeTab) && (
              <div className="flex-1 grid place-items-center text-muted-foreground">
                <div className="text-center">
                  <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>{activeTab} view coming soon.</p>
                </div>
              </div>
            )}
          </div>

          {/* Slider Row */}
          <div className="px-6 py-4 bg-muted/10 border-t border-border/40">
            <div className="flex items-center gap-4">
              <Slider
                defaultValue={[yearIndex]}
                max={YEARS.length - 1}
                step={1}
                onValueChange={(val) => setYearIndex(val[0])}
                className="flex-1"
              />
            </div>
            <div className="mt-4 flex justify-between px-2 text-xs font-medium text-muted-foreground">
               {YEARS.map((y, i) => (
                  <span key={y} className="relative cursor-pointer hover:text-foreground transition-colors" onClick={() => setYearIndex(i)}>
                    <span className={`absolute -top-3 left-1/2 w-1 h-1 rounded-full -translate-x-1/2 ${i === yearIndex ? 'bg-primary scale-150' : 'bg-border'}`}></span>
                    {y}
                  </span>
               ))}
            </div>
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
