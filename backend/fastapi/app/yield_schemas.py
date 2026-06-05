from pydantic import BaseModel
from typing import Literal


class YieldHistoryPoint(BaseModel):
    year: float
    yieldKgPerHa: float
    production1000Tons: float
    area1000Ha: float


class YieldPredictRequest(BaseModel):
    district: str
    crop: str
    year: int
    rainfall_mm: float


class YieldPredictResponse(BaseModel):
    district: str
    crop: str
    input_year: int
    rainfall_mm: float
    predicted_yield_kg_per_ha: float
    predicted_production_1000_tons: float
    risk_level: Literal["Low", "Medium", "High", "Critical"]
    yield_reduction_percent: float
    explanation: str


class YieldAlertRequest(BaseModel):
    district: str
    crop: str
    year: int
    rainfall_mm: float


class YieldAlertResponse(BaseModel):
    district: str
    crop: str
    year: int
    rainfall_mm: float
    yield_reduction_percent: float
    risk_level: Literal["Low", "Medium", "High", "Critical"]
    explanation: str
    recommended_actions: list[str]

