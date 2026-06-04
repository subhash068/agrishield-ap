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
    { label: "High-Risk Mandals", value: highRiskMandals, unit: null, trend: defaultTrend, confidence: defaultConf },
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

// ---- Disease detect ----

export async function detectDisease(file: File): Promise<DiseaseDetectionResponse> {
  const form = new FormData();
  form.append("file", file);

  return apiFetch<DiseaseDetectionResponse>("/disease/detect", {
    method: "POST",
    body: form,
  });
}

