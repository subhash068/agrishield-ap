import {
  ALERTS,
  CROPS,
  DISTRICTS,
  DISTRICT_RANKINGS,
  HERO_STATS,
  KPI_CARDS,
  PREDICTIONS,
  PARCELS,
  CROP_DISTRIBUTION,
  SCHEMES,
  SPECTRAL_TREND,
  WEATHER_FORECAST,
  type Crop,
  type Crop as CropType,
} from "./mock-data";

// ---- Types expected by route components ----

export type Alert = (typeof ALERTS)[number];

export type DashboardData = {
  hero_stats: typeof HERO_STATS;
  spectral_trend: typeof SPECTRAL_TREND;
  ticker_items: ReturnType<typeof getTickerItems>;
  kpi_cards: typeof KPI_CARDS;
};

export type DistrictRanking = (typeof DISTRICT_RANKINGS)[number];
export type Scheme = (typeof SCHEMES)[number];
export type CropDistributionItem = (typeof CROP_DISTRIBUTION)[number];
export type SpectralTrendPoint = (typeof SPECTRAL_TREND)[number];
export type WeatherForecastPoint = (typeof WEATHER_FORECAST)[number];
export type Parcel = (typeof PARCELS)[number];
export type Prediction = (typeof PREDICTIONS)[number];

export type DiseaseDetectionResponse = {
  label: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  model: string;
  top_k: Array<{ label: string; score: number }>;
};

// ---- API (mock-backed) ----

function getTickerItems() {
  // Exists in mock-data.ts but not imported above for simplicity.
  // Recreate from ticker-style strings if needed.
  // If you add a real backend later, replace these functions.
  return [
    "NDVI dropped 4.2% in Guntur — cotton stress flagged",
    "Cyclone Asani: pre-harvest advisory issued to 84,000 farmers",
    "AI detected paddy blast hotspot in Krishna district — RSK alerted",
    "Rainfall deficit 18% in Rayalaseema — drought watch activated",
    "Bollworm outbreak contained in Prakasam after bio-control deployment",
    "Satellite pass complete: 99.2% AP coverage refreshed",
  ];
}

export function getDistricts(): Promise<string[]> {
  return Promise.resolve([...DISTRICTS]);
}

export function getAlerts(): Promise<Alert[]> {
  return Promise.resolve([...ALERTS]);
}

export function getSchemes(): Promise<typeof SCHEMES> {
  return Promise.resolve([...SCHEMES]);
}

export function getDashboardData(): Promise<DashboardData> {
  // The app reads dashboardData.hero_stats, spectral_trend, ticker_items, kpi_cards
  return Promise.resolve({
    hero_stats: HERO_STATS as any,
    spectral_trend: SPECTRAL_TREND as any,
    ticker_items: getTickerItems() as any,
    kpi_cards: KPI_CARDS as any,
  });
}

export function getDistrictRankings(): Promise<DistrictRanking[]> {
  return Promise.resolve([...DISTRICT_RANKINGS]);
}

export function getCropDistribution(): Promise<CropDistributionItem[]> {
  return Promise.resolve([...CROP_DISTRIBUTION]);
}

export function getSpectralTrend(): Promise<SpectralTrendPoint[]> {
  return Promise.resolve([...SPECTRAL_TREND]);
}

export function getParcels(): Promise<Parcel[]> {
  return Promise.resolve([...PARCELS]);
}

export function getWeatherForecast(): Promise<WeatherForecastPoint[]> {
  return Promise.resolve([...WEATHER_FORECAST]);
}

export function getPredictions(): Promise<Prediction[]> {
  return Promise.resolve([...PREDICTIONS]);
}

export async function detectDisease(_file: File): Promise<DiseaseDetectionResponse> {
  // Mock response; in a real implementation you'd send the file to an inference API.
  const labels = [
    { label: "Paddy Blast", severity: "High" as const },
    { label: "Cotton Bollworm", severity: "Critical" as const },
    { label: "Chilli Leaf Curl", severity: "Medium" as const },
    { label: "Maize Fall Armyworm", severity: "High" as const },
    { label: "Red Gram Wilt", severity: "Medium" as const },
  ];

  const pick = labels[Math.floor(Math.random() * labels.length)];

  return {
    label: pick.label,
    severity: pick.severity,
    confidence: Math.floor(78 + Math.random() * 20),
    model: "HF Plant Classifier",
    top_k: labels.map((l, idx) => ({
      label: l.label,
      score: Math.max(0.01, 1 - idx * 0.18 - Math.random() * 0.08),
    })),
  };
}

