const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }

  return (await res.json()) as T;
}

// ---- Backend response types ----

export type Alert = {
  id: string;
  type: string;
  crop: string;
  district: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  time: string;
  action: string;
};

export type AlertCreateInput = {
  type: string;
  crop: string;
  district: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  time: string;
  action: string;
};

export type Scheme = { title: string; desc: string; tag: string };

export type SpectralTrendPoint = { day: string; ndvi: number; evi: number; ndre: number };

export type KpiCardOut = {
  label: string;
  value: number;
  unit: string | null;
  trend: number;
  confidence: number;
};

export type HeroStatOut = { label: string; value: number; suffix: string | null; delta: string | null };

export type DashboardData = {
  hero_stats: HeroStatOut[];
  spectral_trend: SpectralTrendPoint[];
  ticker_items: string[];
  kpi_cards: KpiCardOut[];
};

export type DashboardKpiOut = {
  parcels_monitored: number;
  healthy_crop_percent: number;
  active_stress_alerts: number;
  disease_accuracy_percent: number;
  high_risk_mandal_count: number;
  predicted_yield_loss_percent: number;
  satellite_coverage_percent: number;
  ai_confidence_score_percent: number;
  updated_at: string;
};

export type SupportCenter = {
  id: string;
  name: string;
  type: string;
  district: string;
  mandal: string | null;
  address: string;
  phone: string | null;
  hours: string | null;
  distance_km: number | null;
};

export type NearestSupportCentersOut = {
  centers: SupportCenter[];
  query: { district: string | null; mandal: string | null };
};


export type DistrictRanking = {
  district: string;
  healthScore: number;
  alerts: number;
  parcels: number;
  riskIndex: number;
  rank: number;
};

export type CropDistributionItem = { crop: string; parcels: number; health: number };

export type WeatherForecastPoint = {
  day: string;
  rainfall: number;
  temp: number;
  humidity: number;
  drought: number;
};

export type WeatherDatasetPoint = WeatherForecastPoint & {
  source: string;
};

export type WeatherLiveSummary = {
  location: string;
  updated_at: string;
  temperature: number;
  apparent_temperature: number | null;
  rainfall_24h: number;
  humidity: number;
  wind_speed: number;
  weather_code: number | null;
  source: string;
};

export type Parcel = {
  village: string;
  id: string;
  farmer: string;
  district: string;
  mandal: string;
  crop: string;
  acreage: number;
  health: number;
  risk: string;
  confidence: number;
  lat: number;
  lng: number;
  ndvi: number;
  evi: number;
  ndre: number;
  analytics: {
    ndvi: number;
    evi: number;
    ndre: number;
    soil_moisture: number;
    vegetation_stress: number;
    anomaly_hotspots: number;
    disease_probability: number;
    insight: string;
    recommendation: string;
    model: string;
  };
  outline: Array<[number, number]>;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  } | null;
};

export type Prediction = {
  label: string;
  probability: number;
  severity: "Low" | "Medium" | "High" | "Critical";
  crop: string;
};

export type DiseaseDetectionResponse = {
  label: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  model: string;
  top_k: Array<{ label: string; score: number }>;
  crop_gate?: {
    crop: string;
    confidence: number;
    source: "filename" | "prediction" | "filename+prediction";
    selected_label: string | null;
    selected_score: number | null;
    matched: Array<{ label: string; score: number }>;
  } | null;
  mismatch_detected?: boolean;
  mismatch_reason?: string | null;
  crop_hint?: string | null;
  fertilizer_recommendation?: {
    crop: string;
    fertilizer_name: string;
    dosage_kg_per_acre: number;
    dosage_kg_total: number;
    timing: string;
    application_method: string;
    cost_rs_per_acre: number;
    expected_yield_gain_percent: number;
    confidence: number;
    reason: string;
    nutrient_deficiencies: Array<{ nutrient: string; severity: "Low" | "Moderate" | "High"; probability: number }>;
    nitrogen_deficiency_probability: number;
    phosphate_deficiency_probability: number;
    potassium_deficiency_probability: number;
  } | null;
};

// ---- Schemes/Districts/Alerts ----

export function getDistricts(): Promise<string[]> {
  return apiFetch<string[]>("/districts");
}

export function getAlerts(): Promise<Alert[]> {
  return apiFetch<Alert[]>("/alerts");
}

export function createAlert(payload: AlertCreateInput): Promise<Alert> {
  return apiFetch<Alert>("/alerts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function getSchemes(): Promise<Scheme[]> {
  return apiFetch<Scheme[]>("/schemes");
}

export type FarmerRegisterInput = {
  farmer_name: string;
  phone_number: string;
  district: string;
  mandal: string;
  village: string;
  survey_number: string;
  crop_type: string;
  land_area_acres: number;
  parcel_id: string;
};

export function registerFarmer(payload: FarmerRegisterInput): Promise<{ status: string; parcel_id: string }> {
  return apiFetch<{ status: string; parcel_id: string }>("/farmers/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

// ---- Dashboard ----

function kpiToHeroAndCards(k: DashboardKpiOut): { hero_stats: HeroStatOut[]; kpi_cards: KpiCardOut[] } {

  const parcelsMonitored = k.parcels_monitored;
  const healthyPercent = k.healthy_crop_percent;
  const activeStress = k.active_stress_alerts;
  const diseaseAccuracy = k.disease_accuracy_percent;
  const highRiskMandals = k.high_risk_mandal_count;
  const predictedYieldLoss = k.predicted_yield_loss_percent;
  const satelliteCoverage = k.satellite_coverage_percent;
  const aiConfidence = k.ai_confidence_score_percent;

  // trend/confidence are not yet computed from historical series in DB;
  // set minimal explainable defaults.
  const defaultTrend = 0;
  const defaultConf = 90;

  const hero_stats: HeroStatOut[] = [
    { label: "Parcels Monitored", value: parcelsMonitored, suffix: "", delta: null },
    { label: "Healthy Crop %", value: healthyPercent, suffix: "%", delta: null },
    { label: "Active Stress Alerts", value: activeStress, suffix: "", delta: null },
    { label: "Disease Accuracy", value: diseaseAccuracy, suffix: "%", delta: null },
    { label: "High-Risk Mandals", value: highRiskMandals, suffix: "", delta: null },
    { label: "AI Confidence Score", value: aiConfidence, suffix: "%", delta: null },
  ];

  const kpi_cards: KpiCardOut[] = [
    { label: "Parcels Monitored", value: parcelsMonitored, unit: null, trend: defaultTrend, confidence: defaultConf },
    { label: "Healthy Crop %", value: healthyPercent, unit: "%", trend: defaultTrend, confidence: defaultConf },
    { label: "Active Stress Alerts", value: activeStress, unit: null, trend: defaultTrend, confidence: defaultConf },
    { label: "Disease Accuracy", value: diseaseAccuracy, unit: "%", trend: defaultTrend, confidence: defaultConf },
    ...(highRiskMandals > 0
      ? [
          {
            label: "High-Risk Mandals",
            value: highRiskMandals,
            unit: null,
            trend: defaultTrend,
            confidence: defaultConf,
          },
        ]
      : []),
    { label: "Predicted Yield Loss", value: predictedYieldLoss, unit: "%", trend: defaultTrend, confidence: defaultConf },
    { label: "Satellite Coverage", value: satelliteCoverage, unit: "%", trend: defaultTrend, confidence: defaultConf },
    { label: "AI Confidence Score", value: aiConfidence, unit: "%", trend: defaultTrend, confidence: defaultConf },
  ];


  return { hero_stats, kpi_cards };
}

export async function getDashboardData(): Promise<DashboardData> {
  const [alerts, kpis] = await Promise.all([getAlerts(), apiFetch<DashboardKpiOut>("/dashboard/kpis")]);

  const ticker_items = alerts
    .slice(0, 6)
    .map((a) => `${a.type}: ${a.crop} stress in ${a.district} (${a.severity})`);

  // spectral trend is still mocked/derived via separate endpoint in UI
  const mock = await import("./mock-data");

  const { hero_stats, kpi_cards } = kpiToHeroAndCards(kpis);

  return {
    hero_stats,
    spectral_trend: (mock.SPECTRAL_TREND as unknown) as SpectralTrendPoint[],
    ticker_items,
    kpi_cards,
  };
}


// ---- Remaining routes ----

export async function getDistrictRankings(): Promise<DistrictRanking[]> {
  const mock = await import("./mock-data");
  return [...(mock.DISTRICT_RANKINGS as unknown as DistrictRanking[])];
}

export async function getCropDistribution(): Promise<CropDistributionItem[]> {
  const mock = await import("./mock-data");
  return [...(mock.CROP_DISTRIBUTION as unknown as CropDistributionItem[])];
}

export async function getSpectralTrend(): Promise<SpectralTrendPoint[]> {
  const mock = await import("./mock-data");
  return [...(mock.SPECTRAL_TREND as unknown as SpectralTrendPoint[])];
}

export function getParcels(): Promise<Parcel[]> {
  return apiFetch<Parcel[]>("/parcels");
}

export function getWeatherForecast(): Promise<WeatherForecastPoint[]> {
  return apiFetch<WeatherForecastPoint[]>("/weather");
}

export function getWeatherLiveSummary(): Promise<WeatherLiveSummary> {
  return apiFetch<WeatherLiveSummary>("/weather/live");
}

export function getWeatherForDay(day: string): Promise<WeatherForecastPoint> {
  return apiFetch<WeatherForecastPoint>(`/weather/day?day=${encodeURIComponent(day)}`);
}

export function getWeatherHistory(): Promise<WeatherDatasetPoint[]> {
  return apiFetch<WeatherDatasetPoint[]>("/weather/history");
}

export function getWeatherProjection2027(): Promise<WeatherDatasetPoint[]> {
  return apiFetch<WeatherDatasetPoint[]>("/weather/projection-2027");
}

export function getPredictions(): Promise<Prediction[]> {
  return apiFetch<Prediction[]>("/predictions");
}

export type FieldAdvisoryResponse = {
  fieldId: string;
  crop: string;
  healthScorePct: number;
  diseaseDetected: {
    name: string;
    probabilityPct: number;
    severity: "Low" | "Medium" | "High" | "Critical";
    affectedAreaPct: number;
  };
  aiRecommendation: {
    title: string;
    steps: string[];
  };
  predictedRisk7Days: {
    diseaseRisk: "Low" | "Medium" | "High";
    pestRisk: "Low" | "Medium" | "High";
    yieldLossRiskPct: number;
  };
  weatherAlert: {
    tone: "info" | "warning";
    message: string;
    guidance: string;
  };
};

export function getFieldAdvisory(fieldId: string): Promise<FieldAdvisoryResponse> {
  return apiFetch<FieldAdvisoryResponse>(`/field-advisory/${encodeURIComponent(fieldId)}`);
}

// ---- Fertilizer Recommendation ----

export type NutrientDeficiency = {
  nutrient: string;
  severity: "Low" | "Moderate" | "High";
  probability: number;
};

export type FertilizerRecoResponse = {
  crop: string;
  fertilizer_name: string;
  dosage_kg_per_acre: number;
  dosage_kg_total: number;
  timing: string;
  application_method: string;
  cost_rs_per_acre: number;
  expected_yield_gain_percent: number;
  confidence: number;
  reason: string;
  nutrient_deficiencies: NutrientDeficiency[];
  nitrogen_deficiency_probability: number;
  phosphate_deficiency_probability: number;
  potassium_deficiency_probability: number;
};

export type FertilizerRecoRequest = {
  crop?: string;
  soil_health?: "Poor" | "Moderate" | "Good";
  growth_stage?: "Vegetative" | "Flowering" | "Grain Filling" | "Maturity";
  weather_rainfall_mm?: number;
  satellite_unified_health_index_pct?: number;
  satellite_abiotic_stress_score_pct?: number;
  satellite_soil_moisture_score_pct?: number;
  disease_risk?: "Low" | "Medium" | "High";
  pest_risk?: "Low" | "Medium" | "High";
};

export function getFertilizerRecommendation(payload: FertilizerRecoRequest): Promise<FertilizerRecoResponse> {
  return apiFetch<FertilizerRecoResponse>("/recommend/fertilizer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---- Fusion (Satellite + Photo) ----

export type FusionRisk7Days = {
  diseaseRisk: "Low" | "Medium" | "High";
  pestRisk: "Low" | "Medium" | "High";
  yieldLossRiskPct: number;
};

export type FusionRecommendationOut = {
  title: string;
  steps: string[];
};

export type FusionResponseOut = {
  parcel_id: string | null;
  fieldId: string;
  crop: string | null;
  unified_health_index: number;
  satellite_confidence: number;
  photo_confidence: number;
  unified_confidence: number;
  disease_detected: DiseaseDetectionResponse | null;
  abiotic_stress_score: number;
  biotic_stress_score: number;
  anomaly_deviation_score: number;
  explanation?: string[] | null;
  // added from backend fusion
  fertilizer_recommendation?:
    | {
        crop: string;
        fertilizer_name: string;
        dosage_kg_per_acre: number;
        dosage_kg_total: number;
        timing: string;
        application_method: string;
        cost_rs_per_acre: number;
        expected_yield_gain_percent: number;
        confidence: number;
        reason: string;
        nutrient_deficiencies: Array<{
          nutrient: string;
          severity: "Low" | "Moderate" | "High";
          probability: number;
        }>;
        nitrogen_deficiency_probability: number;
        phosphate_deficiency_probability: number;
        potassium_deficiency_probability: number;
      }
    | null;
  fusedRisk7Days: FusionRisk7Days;
  recommendation: FusionRecommendationOut;
};


export type FusionFuseInput = {
  fieldId: string;
  parcel_id?: string;
  lat?: number;
  lng?: number;
  disease_detection_response?: DiseaseDetectionResponse | null;
};

export function fuseSatelliteGround(payload: FusionFuseInput): Promise<FusionResponseOut> {
  return apiFetch<FusionResponseOut>("/fusion/fuse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

// ---- Disease detect ----

export async function detectDisease(file: File): Promise<DiseaseDetectionResponse> {
  const form = new FormData();
  form.append("file", file);

  return apiFetch<DiseaseDetectionResponse>("/disease/detect", {
    method: "POST",
    body: form,
  });
}

const MOCK_SUPPORT_CENTERS_FALLBACK: SupportCenter[] = [
  {
    id: "SC-RSK-WG-001",
    name: "RSK Support Center - Bhimavaram",
    type: "RSK",
    district: "West Godavari",
    mandal: "Bhimavaram",
    address: "Agriculture Resource Centre, Bhimavaram Road, West Godavari",
    phone: "+91-90000-00011",
    hours: "10:00-17:30",
    distance_km: 3.2,
  },
  {
    id: "SC-ATMA-WG-002",
    name: "ATMA Extension Unit - Tanuku",
    type: "ATMA",
    district: "West Godavari",
    mandal: "Tanuku",
    address: "ATMA Extension Hub, Tanuku, West Godavari",
    phone: "+91-90000-00012",
    hours: "09:30-16:30",
    distance_km: 7.8,
  },
  {
    id: "SC-DEP-WG-003",
    name: "Agri Dept Helpdesk - Palakollu",
    type: "Department Helpdesk",
    district: "West Godavari",
    mandal: "Palakollu",
    address: "Department of Agriculture Office, Palakollu, West Godavari",
    phone: "+91-90000-00021",
    hours: "10:30-18:00",
    distance_km: 12.5,
  },
  {
    id: "SC-RSK-WG-004",
    name: "RSK Support Center - Narasapuram",
    type: "RSK",
    district: "West Godavari",
    mandal: "Narasapuram",
    address: "Crop Advisory Center, Narasapuram, West Godavari",
    phone: "+91-90000-00031",
    hours: "10:00-17:30",
    distance_km: 9.4,
  },
  {
    id: "SC-ATMA-WG-005",
    name: "ATMA Extension Unit - Tadepalligudem",
    type: "ATMA",
    district: "West Godavari",
    mandal: "Tadepalligudem",
    address: "ATMA Extension Hub, Tadepalligudem, West Godavari",
    phone: "+91-90000-00032",
    hours: "09:30-16:30",
    distance_km: 15.1,
  },
  {
    id: "SC-RSK-WG-006",
    name: "RSK Support Center - Nidadavole",
    type: "RSK",
    district: "West Godavari",
    mandal: "Nidadavole",
    address: "Agriculture Support Centre, Nidadavole, West Godavari",
    phone: "+91-90000-00041",
    hours: "10:00-17:30",
    distance_km: 10.7,
  },
  {
    id: "SC-DEP-WG-007",
    name: "Agri Dept Helpdesk - Kovvur",
    type: "Department Helpdesk",
    district: "West Godavari",
    mandal: "Kovvur",
    address: "Department Helpdesk Office, Kovvur, West Godavari",
    phone: "+91-90000-00051",
    hours: "10:30-18:00",
    distance_km: 18.6,
  },
];

function scoreFallbackDistance(center: SupportCenter, district?: string, mandal?: string): number {
  const d = district?.trim()?.toLowerCase() ?? null;
  const m = mandal?.trim()?.toLowerCase() ?? null;

  const base = center.distance_km ?? 25;
  let score = base;

  if (d && center.district.toLowerCase() === d) score = Math.min(score, 6);
  if (m && center.mandal && center.mandal.toLowerCase() === m) score = Math.min(score, 2);

  return Math.round(score * 10) / 10;
}

export async function getNearestSupportCenters(params: {
  district?: string;
  mandal?: string;
}): Promise<SupportCenter[]> {
  const url = new URL("/support-centers/nearest", API_BASE_URL);
  if (params.district) url.searchParams.set("district", params.district);
  if (params.mandal) url.searchParams.set("mandal", params.mandal);

  try {
    const data = await apiFetch<NearestSupportCentersOut>(url.pathname + url.search);
    if (!data?.centers?.length) throw new Error("Empty response");
    return data.centers;
  } catch {
    // Backend may be temporarily down/not restarted; show deterministic mock data so UI doesn't show empty.
    const scored = MOCK_SUPPORT_CENTERS_FALLBACK.map((c) => ({
      ...c,
      distance_km: scoreFallbackDistance(c, params.district, params.mandal),
    }));
    return scored.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999)).slice(0, 10);
  }
}

