// Andhra Pradesh agriculture mock dataset for AgriShield AP.
export const DISTRICTS = [
  "Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna",
  "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam",
  "Vizianagaram", "West Godavari", "YSR Kadapa",
] as const;

export const CROPS = ["Paddy", "Cotton", "Maize", "Chilli", "Red Gram"] as const;
export type Crop = (typeof CROPS)[number];

export const DISEASES = [
  { crop: "Paddy", name: "Paddy Blast", severity: "High" },
  { crop: "Cotton", name: "Cotton Bollworm", severity: "Critical" },
  { crop: "Chilli", name: "Chilli Leaf Curl", severity: "Medium" },
  { crop: "Maize", name: "Fall Armyworm", severity: "High" },
  { crop: "Red Gram", name: "Red Gram Wilt", severity: "Medium" },
];

export const HERO_STATS = [
  { label: "Farmers Registered", value: 4_287_614, suffix: "", delta: "+2.4%" },
  { label: "Parcels Monitored", value: 1_932_408, suffix: "", delta: "+5.1%" },
  { label: "Crop Health Alerts", value: 12_847, suffix: "", delta: "+18%" },
  { label: "Active Mandals", value: 679, suffix: "", delta: "100%" },
  { label: "AI Detections (24h)", value: 38_204, suffix: "", delta: "+9.2%" },
  { label: "Advisories Sent", value: 2_104_311, suffix: "", delta: "+3.7%" },
];

export const KPI_CARDS = [
  { label: "Parcels Monitored", value: 1_932_408, unit: "", trend: 5.1, confidence: 96 },
  { label: "Healthy Crop %", value: 78.4, unit: "%", trend: 1.2, confidence: 94 },
  { label: "Active Stress Alerts", value: 12_847, unit: "", trend: 18.3, confidence: 91 },
  { label: "Disease Accuracy", value: 93.7, unit: "%", trend: 0.8, confidence: 97 },
  { label: "High-Risk Mandals", value: 47, unit: "", trend: 12.5, confidence: 89 },
  { label: "Predicted Yield Loss", value: 4.6, unit: "%", trend: -1.4, confidence: 87 },
  { label: "Satellite Coverage", value: 99.2, unit: "%", trend: 0.3, confidence: 99 },
  { label: "AI Confidence Score", value: 92.5, unit: "%", trend: 1.7, confidence: 95 },
];

// 30-day NDVI / EVI / NDRE trend
export const SPECTRAL_TREND = Array.from({ length: 30 }, (_, i) => {
  const t = i / 29;
  return {
    day: `D${i + 1}`,
    ndvi: +(0.55 + 0.18 * Math.sin(t * Math.PI * 1.6) + (Math.random() - 0.5) * 0.04).toFixed(3),
    evi:  +(0.42 + 0.16 * Math.sin(t * Math.PI * 1.6 + 0.3) + (Math.random() - 0.5) * 0.04).toFixed(3),
    ndre: +(0.31 + 0.12 * Math.sin(t * Math.PI * 1.6 + 0.6) + (Math.random() - 0.5) * 0.03).toFixed(3),
  };
});

export const DISTRICT_RANKINGS = DISTRICTS.map((d, i) => ({
  district: d,
  healthScore: +(60 + Math.random() * 35).toFixed(1),
  alerts: Math.floor(200 + Math.random() * 2400),
  parcels: Math.floor(40_000 + Math.random() * 180_000),
  riskIndex: +(Math.random() * 100).toFixed(0),
  rank: i + 1,
})).sort((a, b) => b.healthScore - a.healthScore).map((d, i) => ({ ...d, rank: i + 1 }));

export const CROP_DISTRIBUTION = CROPS.map((c, i) => ({
  crop: c,
  parcels: [820_000, 410_000, 320_000, 210_000, 172_408][i],
  health: [82, 71, 79, 68, 74][i],
}));

// Pseudo-random AP parcel centroids around state bbox
const AP_BBOX = { latMin: 13.5, latMax: 19.1, lngMin: 77.0, lngMax: 84.7 };
const seeded = (s: number) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };

export const PARCELS = Array.from({ length: 220 }, (_, i) => {
  const crop = CROPS[i % CROPS.length];
  const lat = AP_BBOX.latMin + seeded(i + 1) * (AP_BBOX.latMax - AP_BBOX.latMin);
  const lng = AP_BBOX.lngMin + seeded(i + 7) * (AP_BBOX.lngMax - AP_BBOX.lngMin);
  const health = +(45 + seeded(i + 13) * 50).toFixed(1);
  const risk = health < 60 ? "High" : health < 75 ? "Medium" : "Low";

  // Build a consistent mock shape to match backend /parcels.
  const ndvi = +(0.3 + seeded(i + 37) * 0.5).toFixed(2);
  const evi = +(0.2 + seeded(i + 41) * 0.6).toFixed(2);
  const ndre = +(0.15 + seeded(i + 47) * 0.45).toFixed(2);

  const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

  // Mirror backend’s intent: derive 0..1 scores and then expose under analytics.
  const ndvi_score = clamp01((ndvi - 0.2) / 0.6);
  const evi_score = clamp01((evi - 0.1) / 0.7);
  const ndre_score = clamp01((ndre - 0.05) / 0.6);

  const stress_score = clamp01(1.0 - ndvi_score * 0.72 + (100.0 - health) / 240.0);
  const moisture_score = clamp01(0.2 + evi_score * 0.42 + ndvi_score * 0.28 - stress_score * 0.14);
  const anomaly_score = clamp01(
    Math.abs(ndvi_score - evi_score) * 0.52 + Math.abs(ndvi_score - ndre_score) * 0.56 + stress_score * 0.18,
  );
  const disease_score = clamp01((100.0 - health) / 100.0 * 0.58 + stress_score * 0.24 + anomaly_score * 0.18);

  return {
    id: `AP-${String(i + 1).padStart(5, "0")}`,
    farmer: ["Ramesh Reddy", "Lakshmi Devi", "Suresh Naidu", "Kavitha Rao", "Venkat Rao", "Padma Sri", "Krishna Murthy", "Anjali Kumari"][i % 8],
    district: DISTRICTS[i % DISTRICTS.length],
    mandal: ["Penukonda", "Tadipatri", "Madanapalle", "Tenali", "Gudivada", "Adoni", "Kavali", "Ongole"][i % 8],
    crop,
    acreage: +(0.8 + seeded(i + 23) * 9).toFixed(2),
    health,
    risk,
    confidence: Math.floor(78 + seeded(i + 29) * 21),
    lat,
    lng,
    ndvi,
    evi,
    ndre,
    analytics: {
      // Match keys expected by UI satellite layer.
      ndvi: +ndvi_score.toFixed(3),
      evi: +evi_score.toFixed(3),
      ndre: +ndre_score.toFixed(3),
      soil_moisture: +moisture_score.toFixed(3),
      vegetation_stress: +stress_score.toFixed(3),
      anomaly_hotspots: +anomaly_score.toFixed(3),
      disease_probability: +disease_score.toFixed(3),
      insight:
        disease_score >= 0.72
          ? "High disease pressure cluster"
          : stress_score >= 0.58
            ? "Vegetation stress building"
            : moisture_score < 0.42
              ? "Moisture deficit detected"
              : "Stable crop health pattern",
      recommendation:
        disease_score >= 0.72
          ? "Schedule an urgent field visit and targeted scouting."
          : stress_score >= 0.58
            ? "Check irrigation, nutrient balance, and early disease signs."
            : moisture_score < 0.42
              ? "Prioritise irrigation and soil moisture validation."
              : "Continue routine monitoring and weekly scouting.",
      model: "AgriShield Parcel Analytics (mock) v2",
    },
    // Minimal geometry fields required by types/UI (satellite-map uses `geometry`/`outline`).
    outline: [],
    geometry: null,
  };
});


export const ALERTS = [
  { id: "ALT-9341", type: "Pest Outbreak", crop: "Cotton", district: "Guntur", severity: "Critical", time: "12 min ago", action: "Spray recommendation issued to 1,204 farmers" },
  { id: "ALT-9340", type: "Drought Risk",  crop: "Paddy",  district: "Anantapur", severity: "High",     time: "38 min ago", action: "Irrigation advisory broadcast to RSKs" },
  { id: "ALT-9339", type: "Disease Spread", crop: "Chilli", district: "Krishna", severity: "Medium",   time: "1 hr ago",   action: "Field inspection scheduled" },
  { id: "ALT-9338", type: "Nutrient Stress", crop: "Maize", district: "Kurnool", severity: "Medium",   time: "2 hr ago",   action: "Fertilizer schedule updated" },
  { id: "ALT-9337", type: "Cyclone Watch",  crop: "Paddy",  district: "Nellore", severity: "High",     time: "3 hr ago",   action: "Pre-harvest advisory sent" },
  { id: "ALT-9336", type: "Pest Outbreak",  crop: "Red Gram", district: "Prakasam", severity: "High",  time: "4 hr ago",   action: "Bio-control deployment in 12 mandals" },
];

export const SCHEMES = [
  { title: "YSR Rythu Bharosa", desc: "₹13,500 annual input assistance to eligible farmer families.", tag: "Active" },
  { title: "Free Crop Insurance (PMFBY)", desc: "Premium fully subsidised by state for notified crops.", tag: "Open" },
  { title: "Dr. YSR Free Borewell Scheme", desc: "Free borewell + power for small & marginal farmers.", tag: "Active" },
  { title: "AP Micro Irrigation Project", desc: "90% subsidy on drip/sprinkler systems.", tag: "Open" },
];

export const WEATHER_FORECAST = Array.from({ length: 14 }, (_, i) => ({
  day: `Day ${i + 1}`,
  rainfall: +(Math.random() * 28).toFixed(1),
  temp: +(26 + Math.random() * 10).toFixed(1),
  humidity: Math.floor(50 + Math.random() * 40),
  drought: +(Math.random() * 100).toFixed(0),
}));

export const PREDICTIONS = [
  { label: "Pest Outbreak (14d)",     probability: 72, severity: "High",     crop: "Cotton" },
  { label: "Drought Risk (30d)",      probability: 58, severity: "Medium",   crop: "Paddy"  },
  { label: "Disease Spread (7d)",     probability: 81, severity: "Critical", crop: "Chilli" },
  { label: "Yield Loss Projection",   probability: 34, severity: "Low",      crop: "Maize"  },
  { label: "Irrigation Demand Surge", probability: 67, severity: "High",     crop: "Red Gram" },
];

export const TICKER_ITEMS = [
  "NDVI dropped 4.2% in Guntur — cotton stress flagged",
  "Cyclone Asani: pre-harvest advisory issued to 84,000 farmers",
  "AI detected paddy blast hotspot in Krishna district — RSK alerted",
  "Rainfall deficit 18% in Rayalaseema — drought watch activated",
  "Bollworm outbreak contained in Prakasam after bio-control deployment",
  "Satellite pass complete: 99.2% AP coverage refreshed",
];
