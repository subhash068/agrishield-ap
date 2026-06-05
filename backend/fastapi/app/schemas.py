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
    # Raw spectral layer scores
    ndvi: float
    evi: float
    ndre: float

    # Abiotic / biotic proxies derived from indices + health
    soil_moisture: float
    vegetation_stress: float
    anomaly_hotspots: float

    # Biotic proxy (disease likelihood)
    disease_probability: float

    # CHSS: Unified Crop Health Index + anomaly deviation breakdown
    unified_health_index: float = Field(
        description="Unified 0..100 crop health score (higher = healthier)."
    )
    abiotic_stress_score: float = Field(
        description="0..100 abiotic stress contribution (drought/nutrient/moisture deficit)."
    )
    biotic_stress_score: float = Field(
        description="0..100 biotic stress contribution (pests/disease likelihood)."
    )
    anomaly_deviation_score: float = Field(
        description="0..100 deviation from historical/seasonal norms (proxy in PoC)."
    )

    # Confidence for satellite-derived assessment (0..100)
    satellite_confidence: float = Field(
        description="0..100 confidence that satellite signals indicate real stress/anomaly."
    )

    # Optional fused confidence placeholder (filled by fusion endpoint later)
    unified_confidence: float | None = Field(
        default=None, description="0..100 fused confidence using ground photo analytics (when available)."
    )

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


class FarmerRegisterInput(BaseModel):
    farmer_name: str
    phone_number: str
    district: str
    mandal: str
    village: str
    survey_number: str
    crop_type: str
    land_area_acres: float
    parcel_id: str



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


# ── Crop & Fertilizer Recommendation ────────────────────────────────────────

Risk = Literal["Low", "Medium", "High"]


class CropRecoInput(BaseModel):
    detected_crop: str | None = None
    weather_rainfall_mm: float | None = None
    satellite_unified_health_index_pct: float | None = None
    satellite_satellite_confidence_pct: float | None = None
    disease_risk: Risk = "Medium"
    pest_risk: Risk = "Medium"


class CropRecoOut(BaseModel):
    recommended_crop: str
    confidence: int


class FertilizerRecoInput(BaseModel):
    crop: str | None = None
    soil_health: Literal["Poor", "Moderate", "Good"] = "Moderate"
    growth_stage: Literal["Vegetative", "Flowering", "Grain Filling", "Maturity"] = "Vegetative"
    weather_rainfall_mm: float | None = None
    satellite_unified_health_index_pct: float | None = None
    satellite_abiotic_stress_score_pct: float | None = None
    satellite_soil_moisture_score_pct: float | None = None
    disease_risk: Risk = "Medium"
    pest_risk: Risk = "Medium"


class NutrientDeficiencyOut(BaseModel):
    nutrient: str
    severity: Literal["Low", "Moderate", "High"]
    probability: float


class FertilizerRecoOut(BaseModel):
    crop: str
    fertilizer_name: str
    dosage_kg_per_acre: float
    dosage_kg_total: float
    timing: str
    application_method: str
    cost_rs_per_acre: float
    expected_yield_gain_percent: float
    confidence: int
    reason: str
    nutrient_deficiencies: list[NutrientDeficiencyOut]
    nitrogen_deficiency_probability: float
    phosphate_deficiency_probability: float
    potassium_deficiency_probability: float


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
    fertilizer_recommendation: FertilizerRecoOut | None = None


class FusionRisk7DaysOut(BaseModel):
    diseaseRisk: Literal["Low", "Medium", "High"]
    pestRisk: Literal["Low", "Medium", "High"]
    yieldLossRiskPct: float


class FusionRecommendationOut(BaseModel):
    title: str
    steps: List[str]


class FusionFuseInput(BaseModel):
    parcel_id: str | None = None
    fieldId: str | None = None

    # If you don't know parcel_id, provide GPS so we can choose nearest parcel (PoC).
    lat: float | None = None
    lng: float | None = None

    # Optional crop image for photo analytics
    # (Handled as UploadFile in endpoint; this schema is for JSON fallback)
    disease_detection_label_hint: str | None = None

    # If client already ran disease detection (or in PoC), they can pass it here
    disease_detection_response: DiseaseDetectionResponseOut | None = None


class FusionResponseOut(BaseModel):
    parcel_id: str | None = None
    fieldId: str | None = None

    crop: str | None = None
    unified_health_index: float | None = None

    satellite_confidence: float | None = None
    photo_confidence: float | None = None

    # Final CHSS confidence after fusion
    unified_confidence: float

    disease_detected: DiseaseDetectionResponseOut | None = None
    abiotic_stress_score: float | None = None
    biotic_stress_score: float | None = None
    anomaly_deviation_score: float | None = None

    fusedRisk7Days: FusionRisk7DaysOut
    recommendation: FusionRecommendationOut


class SupportCenterOut(BaseModel):
    id: str
    name: str
    type: str
    district: str
    mandal: str | None = None
    address: str
    phone: str | None = None
    hours: str | None = None
    distance_km: float | None = None


class FieldAdvisoryDiseaseDetectedOut(BaseModel):
    name: str
    probabilityPct: float
    severity: Literal["Low", "Medium", "High", "Critical"]
    affectedAreaPct: float


class FieldAdvisoryAiRecommendationOut(BaseModel):
    title: str
    steps: List[str]


class FieldAdvisoryPredictedRisk7DaysOut(BaseModel):
    diseaseRisk: Literal["Low", "Medium", "High"]
    pestRisk: Literal["Low", "Medium", "High"]
    yieldLossRiskPct: float


class FieldAdvisoryWeatherAlertOut(BaseModel):
    tone: Literal["info", "warning"]
    message: str
    guidance: str


class FieldAdvisoryResponseOut(BaseModel):
    fieldId: str
    crop: str
    healthScorePct: float
    diseaseDetected: FieldAdvisoryDiseaseDetectedOut
    aiRecommendation: FieldAdvisoryAiRecommendationOut
    predictedRisk7Days: FieldAdvisoryPredictedRisk7DaysOut
    weatherAlert: FieldAdvisoryWeatherAlertOut


class NearestSupportCentersOut(BaseModel):
    centers: List[SupportCenterOut]
    query: dict

