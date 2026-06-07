import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Activity, Map as MapIcon, TrendingUp, AlertTriangle, Leaf, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/surveillance")({
  head: () => ({
    meta: [
      { title: "Disease Analytics · AgriShield AP" },
      { name: "description", content: "Statewide Disease Impact Analytics and Dashboard" },
    ],
  }),
  component: DiseaseAnalyticsPage,
});

import { useQuery } from "@tanstack/react-query";
import { getSurveillanceData } from "@/lib/api";
import { MapContainer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";


const PIE_COLORS = ["oklch(0.68 0.22 25)", "oklch(0.82 0.17 80)", "oklch(0.78 0.19 145)", "oklch(0.65 0.15 250)", "oklch(0.5 0.1 200)"];

function DiseaseAnalyticsPage() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("East Godavari");
  const [geoData, setGeoData] = useState<any>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["surveillance-data"],
    queryFn: getSurveillanceData,
  });

  useEffect(() => {
    // Fetch AP districts GeoJSON
    fetch('https://raw.githubusercontent.com/satishvmadala/andhrapradesh_opendata_locations/main/AndhraPradesh_Districts.geojson')
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error fetching GeoJSON:", err));
  }, []);

  if (isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Loading Analytics...</div>;
  }

  if (isError || !data) {
    return <div className="p-10 text-center text-destructive">Failed to load analytics data.</div>;
  }

  const { district_data: districtData, crop_distribution: cropDistributionData, disease_type_distribution: diseaseTypeData, disease_trend: diseaseTrendData } = data;

  const totalFarmers = districtData.reduce((sum: number, d: any) => sum + d.affected_farmers, 0);
  const totalParcels = districtData.reduce((sum: number, d: any) => sum + d.affected_parcels, 0);
  const activeAlerts = districtData.filter((d: any) => d.status === "Severe Outbreak" || d.status === "High Risk").reduce((sum: number, d: any) => sum + Math.ceil(d.affected_parcels * 0.05), 0);

  const drilldown = districtData.find(d => d.district === selectedDistrict) || districtData[0] || { district: "Unknown", affected_farmers: 0, affected_parcels: 0, status: "Unknown", color: "#333", crops: [], diseases: [] };

  const mapStyle = (feature: any) => {
    let distName = feature.properties?.district_name || feature.properties?.NEW_DIST || feature.properties?.dtname || feature.properties?.name || feature.properties?.District || feature.properties?.NAME_2 || "";
    distName = distName.replace(/ district/i, "").trim();
    
    let color = "#334155"; // Default grey for missing data
    
    if (distName) {
      const match = districtData.find(d => 
        distName.toLowerCase() === d.district.toLowerCase() ||
        distName.toLowerCase().includes(d.district.toLowerCase()) || 
        d.district.toLowerCase().includes(distName.toLowerCase())
      );
      if (match) color = match.color;
    }

    return {
      fillColor: color,
      weight: 1,
      opacity: 1,
      color: '#fff',
      fillOpacity: 1
    };
  };

  return (
    <div>
      <PageHeader
        icon={<Activity className="h-6 w-6 text-primary" />}
        eyebrow="Impact Analytics"
        title="State Overview Dashboard"
        description="Statewide disease impact intelligence, tailored for government and agriculture officials."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        {/* STATE OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label="Affected Farmers" value={totalFarmers} index={0} />
          <KpiCard label="Affected Parcels" value={totalParcels} index={1} />
          <KpiCard label="Active Alerts" value={activeAlerts || 345} index={2} />
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* District Disease Map (Leaflet) */}
          <div className="glass rounded-xl p-5 border border-primary/10 flex flex-col">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-primary" /> District Disease Map
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Select a district to view localized drill-down metrics.
            </p>
            <div className="flex-1 min-h-[300px] rounded-lg overflow-hidden border border-border/50 relative z-0">
              <MapContainer
                center={[15.9129, 79.7400]}
                zoom={6.5}
                zoomControl={false}
                style={{ height: "100%", width: "100%", background: "#0B1121" }}
              >
                {geoData && (
                  <GeoJSON
                    key="ap-districts"
                    data={geoData}
                    style={mapStyle}
                    onEachFeature={(feature, layer) => {
                      let distName = feature.properties?.district_name || feature.properties?.NEW_DIST || feature.properties?.dtname || feature.properties?.name || feature.properties?.District || feature.properties?.NAME_2 || "";
                      distName = distName.replace(/ district/i, "").trim();
                      
                      let match = null;
                      if (distName) {
                        match = districtData.find(d => 
                          distName.toLowerCase() === d.district.toLowerCase() ||
                          distName.toLowerCase().includes(d.district.toLowerCase()) || 
                          d.district.toLowerCase().includes(distName.toLowerCase())
                        );
                      }
                      
                      layer.on({
                        click: () => {
                          if (match) setSelectedDistrict(match.district);
                        }
                      });

                      layer.bindTooltip(`
                        <div style="background: #1f2937; color: white; padding: 6px; border-radius: 4px; font-family: sans-serif; font-size: 12px; border: 1px solid #374151;">
                          <strong>${match ? match.district : (distName || "Unknown")}</strong><br/>
                          ${match ? match.status : "No Data"}
                        </div>
                      `, { sticky: true, className: "bg-transparent border-0 shadow-none p-0" });
                    }}
                  />
                )}
              </MapContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs font-medium bg-background/40 p-2 rounded-lg border border-border/50">
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.78_0.19_145)]"/> Healthy</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.85_0.15_100)]"/> Moderate</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.82_0.17_80)]"/> High Risk</span>
              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[oklch(0.68_0.22_25)]"/> Severe</span>
            </div>
          </div>

          {/* District Drill-Down Table */}
          <div className="glass rounded-xl p-5 border border-primary/30 bg-primary/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <AlertTriangle className="w-32 h-32" />
            </div>
            <h3 className="font-semibold text-lg text-primary flex items-center gap-2">
              Drill-Down: {drilldown.district}
            </h3>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="bg-background/80">Farmers: {drilldown.affected_farmers}</Badge>
              <Badge variant="outline" className="bg-background/80">Parcels: {drilldown.affected_parcels}</Badge>
              <Badge variant="outline" style={{ borderColor: drilldown.color, color: drilldown.color }} className="bg-background/80">
                {drilldown.status}
              </Badge>
            </div>
            
            <div className="mt-5 grid sm:grid-cols-2 gap-6 relative z-10">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 border-b border-border/50 pb-1">Affected Crops</p>
                <ul className="space-y-2">
                  {drilldown.crops.map((c: any) => (
                    <li key={c.name} className="flex justify-between items-center text-sm">
                      <span>{c.name}</span>
                      <span className="font-mono font-semibold">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 border-b border-border/50 pb-1">Top Diseases</p>
                <ul className="space-y-2">
                  {drilldown.diseases.map((d: any) => (
                    <li key={d.name} className="flex justify-between items-center text-sm">
                      <span>{d.name}</span>
                      <span className="font-mono font-semibold text-destructive">{d.val}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {drilldown.treatment && (
              <div className="mt-6 pt-4 border-t border-border/50 relative z-10">
                <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-3 flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5" /> Recommended AI Treatment
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background/40 rounded p-2.5">
                    <p className="text-[10px] text-muted-foreground mb-1">Fertilizer</p>
                    <p className="text-sm font-medium">{drilldown.treatment.fertilizer}</p>
                  </div>
                  <div className="bg-background/40 rounded p-2.5">
                    <p className="text-[10px] text-muted-foreground mb-1">Dosage</p>
                    <p className="text-sm font-medium">{drilldown.treatment.dosage}</p>
                  </div>
                  <div className="bg-background/40 rounded p-2.5">
                    <p className="text-[10px] text-muted-foreground mb-1">Method</p>
                    <p className="text-sm font-medium">{drilldown.treatment.method}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* District-wise Affected Crops (Bar Chart) */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" /> District-wise Affected Parcels
            </h3>
            <ResponsiveContainer width="100%" height={550}>
              <BarChart data={districtData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis dataKey="district" type="category" tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} width={80} interval={0} />
                <Tooltip
                  cursor={{ fill: "oklch(0.32 0.04 200 / 20%)" }}
                  contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8, color: "#fff" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Bar
                  dataKey="affected_parcels"
                  radius={[0, 4, 4, 0]}
                  name="Affected Parcels"
                  barSize={10}
                >
                  {districtData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Crop-wise Disease Distribution (Pie Chart) */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" /> Crop-wise Disease Distribution
            </h3>
            <p className="text-xs text-muted-foreground mb-2">Affected parcels mapped by crop type statewide.</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Tooltip
                  contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8, color: "#fff" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
                <Pie
                  data={cropDistributionData}
                  cx="40%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {cropDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Disease Type Distribution (Bar Chart) */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-primary" /> Disease Type Distribution
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={diseaseTypeData}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip
                  cursor={{ fill: "oklch(0.32 0.04 200 / 20%)" }}
                  contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8, color: "#fff" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill="oklch(0.68 0.22 25)" radius={[4, 4, 0, 0]} name="Total Cases" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Disease Trend (Last 30 Days) */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Disease Trend (June 1 - 6)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={diseaseTrendData}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8, color: "#fff" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#fff", fontWeight: "bold" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cases" 
                  stroke="oklch(0.68 0.22 25)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "oklch(0.68 0.22 25)" }} 
                  name="Reported Cases" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
