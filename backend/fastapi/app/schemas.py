from typing import List, Literal
from pydantic import BaseModel


class AlertOut(BaseModel):
    id: str
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


class DiseaseDetectionResponseOut(BaseModel):
    label: str
    severity: Literal["Low", "Medium", "High", "Critical"]
    confidence: int
    model: str
    top_k: List[DiseaseTopKOut]

