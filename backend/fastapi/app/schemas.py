from typing import List, Literal
from pydantic import BaseModel, Field


class AlertOut(BaseModel):
    id: str
    type: str
    crop: str
    district: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    time: str
    action: str


class AlertCreateOut(BaseModel):
    type: str
    crop: str
    district: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    time: str
    action: str


class SchemeOut(BaseModel):
    title: str
    desc: str
    tag: str


class HeroStatOut(BaseModel):
    label: str
    value: float
    suffix: str | None = None
    delta: str | None = None


class SpectralPointOut(BaseModel):
    day: str
    ndvi: float
    evi: float
    ndre: float


class KpiCardOut(BaseModel):
    label: str
    value: float
    unit: str | None = None
    trend: float
    confidence: int


class DashboardDataOut(BaseModel):
    hero_stats: List[HeroStatOut]
    spectral_trend: List[SpectralPointOut]
    ticker_items: List[str]
    kpi_cards: List[KpiCardOut]


class DashboardKpiOut(BaseModel):
    parcels_monitored: int
    healthy_crop_percent: float
    active_stress_alerts: int
    disease_accuracy_percent: float
    high_risk_mandal_count: int
    predicted_yield_loss_percent: float
    satellite_coverage_percent: float
    ai_confidence_score_percent: float
    updated_at: str



class DistrictRankingOut(BaseModel):
    district: str
    healthScore: float
    alerts: int
    parcels: int
    riskIndex: float
    rank: int


class CropDistributionItemOut(BaseModel):
    crop: str
    parcels: int
    health: int


class WeatherForecastPointOut(BaseModel):
    day: str
    rainfall: float
    temp: float
    humidity: int
    drought: int


class WeatherDatasetPointOut(BaseModel):
    day: str
    rainfall: float
    temp: float
    humidity: int
    drought: int
    source: str


class WeatherSummaryOut(BaseModel):
    location: str
    updated_at: str
    temperature: float
    apparent_temperature: float | None = None
    rainfall_24h: float
    humidity: int
    wind_speed: float
    weather_code: int | None = None
    source: str = "open-meteo"


class LayerAnalyticsOut(BaseModel):
    ndvi: float
    evi: float
    ndre: float
    soil_moisture: float
    vegetation_stress: float
    anomaly_hotspots: float
    disease_probability: float
    insight: str
    recommendation: str
    model: str = "AgriShield Parcel Analytics v2"


class ParcelOut(BaseModel):
    id: str
    farmer: str
    district: str
    mandal: str
    crop: str
    acreage: float
    health: float
    risk: str
    confidence: int
    lat: float
    lng: float
    ndvi: float
    evi: float
    ndre: float
    analytics: LayerAnalyticsOut
    outline: list[list[float]]
    geometry: dict | None = None



class PredictionOut(BaseModel):
    label: str
    probability: int
    severity: Literal["Low", "Medium", "High", "Critical"]
    crop: str


class DiseaseTopKOut(BaseModel):
    label: str
    score: float


class DiseaseCropGateOut(BaseModel):
    crop: str
    confidence: int
    source: Literal["filename", "prediction", "filename+prediction"]
    selected_label: str | None = None
    selected_score: float | None = None
    matched: List[DiseaseTopKOut] = Field(default_factory=list)


class DiseaseDetectionResponseOut(BaseModel):
    label: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    confidence: int
    model: str
    top_k: List[DiseaseTopKOut]
    crop_gate: DiseaseCropGateOut | None = None
    mismatch_detected: bool = False
    mismatch_reason: str | None = None
    crop_hint: str | None = None

