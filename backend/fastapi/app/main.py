import json
import random
import hashlib
import io
import math
import uuid
from functools import lru_cache
from datetime import datetime, date
from typing import Literal
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from fastapi import Depends, FastAPI, UploadFile, File, Request as FastAPIRequest, Body, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, select, text, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .db import SessionLocal, engine
from . import models
from .yield_schemas import (
    YieldHistoryPoint,
    YieldPredictRequest,
    YieldPredictResponse,
    YieldAlertRequest,
    YieldAlertResponse,
)
from .icrisat_yield import (
    get_yield_series,
    list_districts_and_crops,
    predict_yield,
    yield_history,
    _risk_from_reduction,
)
from ._crop_fert_reco_heuristics import (
    CropRecoHeuristicInput,
    FertilizerRecoHeuristicInput,
    recommend_crop_poc,
    recommend_fertilizer_poc,
)
from .schemas import (
    AlertOut,
    AlertCreateOut,
    SchemeOut,
    WeatherForecastPointOut,
    WeatherDatasetPointOut,
    WeatherSummaryOut,
    ParcelOut,
    PredictionOut,
    DiseaseCropGateOut,
    DiseaseDetectionResponseOut,
    SpectralPointOut,
    DashboardKpiOut,
    FarmerRegisterInput,
    NearestSupportCentersOut,
    FusionFuseInput,
    FusionResponseOut,
    FusionRisk7DaysOut,
    FusionRecommendationOut,
    FieldAdvisoryResponseOut,
    FieldAdvisoryAiRecommendationOut,
    FieldAdvisoryDiseaseDetectedOut,
    FieldAdvisoryPredictedRisk7DaysOut,
    FieldAdvisoryWeatherAlertOut,
    CropRecoInput,
    CropRecoOut,
    FertilizerRecoInput,
    FertilizerRecoOut,
    SurveillanceDataOut,
)


from .config import settings

try:
    from PIL import Image
except ImportError:  # pragma: no cover - optional runtime dependency
    Image = None

try:
    # pyrefly: ignore [missing-import]
    import torch
    # pyrefly: ignore [missing-import]
    import scipy
    # pyrefly: ignore [missing-import]
    from transformers import AutoImageProcessor, AutoModelForImageClassification
except (ImportError, MemoryError):  # pragma: no cover - optional runtime dependency
    # If SciPy/transformers can't be imported due to missing deps or low-memory environments,
    # keep the API running and rely on heuristic fallback for disease inference.
    torch = None
    AutoImageProcessor = None
    AutoModelForImageClassification = None


from .seed import seed_from_mock

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _parcel_outline(parcel_id: str, district: str, mandal: str, crop: str, lat: float, lng: float, acreage: float) -> list[list[float]]:
    seed_bytes = hashlib.sha256(f"{parcel_id}|{district}|{mandal}|{crop}".encode("utf-8")).digest()
    base_radius_m = math.sqrt(max(acreage, 0.15) * 4046.8564224 / math.pi)
    lat_scale = 1 / 111_320
    lng_scale = 1 / (111_320 * max(math.cos(math.radians(lat)), 0.2))

    points: list[list[float]] = []
    for index in range(8):
        byte_a = seed_bytes[index]
        byte_b = seed_bytes[index + 8]
        angle = (index / 8.0) * (2 * math.pi) + (byte_a / 255.0 - 0.5) * 0.22
        radius = base_radius_m * (0.74 + (byte_b / 255.0) * 0.42)
        local_lat = math.sin(angle) * radius * lat_scale
        local_lng = math.cos(angle) * radius * lng_scale
        points.append([round(lat + local_lat, 6), round(lng + local_lng, 6)])

    points.append(points[0])
    return points


def _outline_to_geojson(outline: list[list[float]]) -> dict:
    ring = [[lng, lat] for lat, lng in outline]
    return {"type": "Polygon", "coordinates": [ring]}


def _parcel_geometry_payload(
    parcel_id: str,
    district: str,
    mandal: str,
    crop: str,
    lat: float,
    lng: float,
    acreage: float,
    geometry_json: str | dict | None = None,
) -> tuple[list[list[float]], dict]:
    outline = _parcel_outline(parcel_id, district, mandal, crop, lat, lng, acreage)
    if geometry_json:
        if isinstance(geometry_json, str):
            try:
                parsed = json.loads(geometry_json)
                if parsed:
                    return outline, parsed
            except json.JSONDecodeError:
                pass
        elif isinstance(geometry_json, dict):
            return outline, geometry_json
    return outline, _outline_to_geojson(outline)

def _fallback_parcels() -> list[ParcelOut]:
    return []

app = FastAPI(title="AgriShield AP API")

# CORS mode A: allow localhost dev origins across common ports.
# Keep credentials disabled so wildcard-style dev access stays simple and predictable.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8081",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
def request_validation_exception_handler(request: FastAPIRequest, exc: RequestValidationError):
    import logging

    logging.error("Request validation error", exc_info=exc)
    return JSONResponse(status_code=422, content={"detail": "Request validation failed", "errors": exc.errors()})


@app.exception_handler(Exception)
def unhandled_exception_handler(request: FastAPIRequest, exc: Exception):


    import logging

    logging.exception("Unhandled API error", exc_info=exc)
    resp = JSONResponse(status_code=500, content={"detail": "Internal server error"})
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "*"
    return resp



@app.on_event("startup")
def startup():
    # Dev convenience: auto-create database (if missing), then tables, then seed on first run.
    # Keep /health working even if Postgres is down or has wrong credentials.
    # Keep startup resilient: if DB is misconfigured/unavailable we still want the app (esp. /health) to run.
    try:
        from .db import ensure_postgres_database_exists

        # If the Postgres database itself is missing, create it so create_all can succeed.
        ensure_postgres_database_exists()
        models.Base.metadata.create_all(bind=engine)
    except Exception as e:
        import warnings

        warnings.warn(f"Postgres init skipped during startup (db/tables init failed) due to error: {e}")
        return

    try:
        db = SessionLocal()
        try:
            cnt = db.execute(select(models.Parcel.id)).first()
            if cnt is None:
                seed_from_mock(db)
            _ensure_parcel_schema(db)
            _ensure_parcel_geometry(db)
        finally:
            db.close()
    except Exception as e:
        import warnings

        warnings.warn(f"Postgres init skipped during startup (seed failed) due to error: {e}")


@app.get("/health")
def health():
    return {"ok": True}


def _ensure_parcel_geometry(db: Session) -> None:
    bind = db.get_bind()
    inspector = inspect(bind)
    parcel_columns = {column["name"] for column in inspector.get_columns("parcels")}

    if "geom" not in parcel_columns:
        try:
            db.execute(text("ALTER TABLE parcels ADD COLUMN IF NOT EXISTS geom geometry(Polygon,4326)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS parcels_geom_gist ON parcels USING GIST (geom)"))
            db.commit()
            parcel_columns.add("geom")
        except Exception:
            db.rollback()
            raise

    # If geom already exists but has a mismatching type (e.g. Point), migrate it to Polygon.
    # We inspect the existing type and only alter when needed to avoid unnecessary locks.
    if "geom" in parcel_columns:
        try:
            type_row = db.execute(
                text(
                    """
                    SELECT udt_name
                    FROM information_schema.columns
                    WHERE table_name='parcels' AND column_name='geom'
                    """
                )
            ).first()

            # information_schema.udt_name for PostGIS geometry columns typically looks like:
            # geometry, geography, or a specific subtype depending on DB/version.
            # We'll instead use Find_SRID-ish approach by querying the geometry type of a non-null value.
            # If all values are null we can't infer; in that case we still attempt a safe alter.
            sample = db.execute(
                text("SELECT ST_GeometryType(geom) AS gtype FROM parcels WHERE geom IS NOT NULL LIMIT 1")
            ).first()

            existing_gtype = sample[0] if sample and sample[0] else None
            if existing_gtype and existing_gtype != 'ST_Polygon':
                db.execute(text("ALTER TABLE parcels ALTER COLUMN geom TYPE geometry(Polygon,4326) USING geom::geometry(Polygon,4326)"))
                db.execute(text("CREATE INDEX IF NOT EXISTS parcels_geom_gist ON parcels USING GIST (geom)"))
                db.commit()
        except Exception:
            db.rollback()
            raise

    if "geom" not in parcel_columns:
        return

    rows = db.execute(
        text(
            """
            SELECT parcel_id_str, district, mandal, crop, lat, lng, acreage, geom
            FROM parcels
            ORDER BY id
            """
        )
    ).mappings().all()

    for row in rows:
        if row["geom"] is not None:
            continue
        _, geometry = _parcel_geometry_payload(
            row["parcel_id_str"],
            row["district"],
            row["mandal"],
            row["crop"],
            float(row["lat"]),
            float(row["lng"]),
            float(row["acreage"]),
        )
        geometry_json = json.dumps(geometry)
        db.execute(
            text(
                """
                UPDATE parcels
                SET geom = ST_SetSRID(ST_GeomFromGeoJSON(:geometry_json), 4326)
                WHERE parcel_id_str = :parcel_id_str
                """
            ),
            {"geometry_json": geometry_json, "parcel_id_str": row["parcel_id_str"]},
        )

    db.commit()


def _ensure_parcel_schema(db: Session) -> set[str]:
    bind = db.get_bind()
    inspector = inspect(bind)
    parcel_columns = {column["name"] for column in inspector.get_columns("parcels")}

    alterations: list[str] = []
    if "evi" not in parcel_columns:
        alterations.append("ALTER TABLE parcels ADD COLUMN IF NOT EXISTS evi double precision")
    if "ndre" not in parcel_columns:
        alterations.append("ALTER TABLE parcels ADD COLUMN IF NOT EXISTS ndre double precision")
    if "savi" not in parcel_columns:
        alterations.append("ALTER TABLE parcels ADD COLUMN IF NOT EXISTS savi double precision")

    if alterations:
        for statement in alterations:
            db.execute(text(statement))
        db.commit()
        inspector = inspect(bind)
        parcel_columns = {column["name"] for column in inspector.get_columns("parcels")}

    return parcel_columns


def _fetch_live_weather():
    params = {
        "latitude": settings.weather_latitude,
        "longitude": settings.weather_longitude,
        "timezone": settings.weather_timezone,
        "forecast_days": 14,
        "current": "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation",
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,apparent_temperature,wind_speed_10m",
        "daily": "precipitation_sum",
    }
    url = f"https://api.open-meteo.com/v1/forecast?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": "AgriShieldAP/1.0"})

    with urlopen(request, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

    daily = payload.get("daily", {})
    times = daily.get("time", [])
    rainfall = daily.get("precipitation_sum", [])
    hourly = payload.get("hourly", {})
    current = payload.get("current", {})

    forecast: list[WeatherForecastPointOut] = []
    for index, day in enumerate(times[:14]):
        rainfall_value = float(rainfall[index]) if index < len(rainfall) else 0.0
        temperature_series = hourly.get("temperature_2m", [])
        humidity_series = hourly.get("relative_humidity_2m", [])
        start = index * 24
        end = start + 24
        temp_window = temperature_series[start:end] or ([current.get("temperature_2m", 0.0)] if current else [0.0])
        humidity_window = humidity_series[start:end] or ([current.get("relative_humidity_2m", 0)] if current else [0])

        avg_temp = sum(float(value) for value in temp_window) / len(temp_window)
        avg_humidity = round(sum(float(value) for value in humidity_window) / len(humidity_window))
        drought = max(0, min(100, int(round((1 - min(rainfall_value / 20.0, 1.0)) * 100))))

        forecast.append(
            WeatherForecastPointOut(
                day=day,
                rainfall=round(rainfall_value, 1),
                temp=round(avg_temp, 1),
                humidity=int(avg_humidity),
                drought=drought,
            )
        )

    summary = WeatherSummaryOut(
        location=f"{settings.weather_latitude:.4f}, {settings.weather_longitude:.4f}",
        updated_at=current.get("time") or datetime.utcnow().isoformat(timespec="seconds") + "Z",
        temperature=float(current.get("temperature_2m", 0.0)),
        apparent_temperature=float(current.get("apparent_temperature", current.get("temperature_2m", 0.0))),
        rainfall_24h=float(current.get("precipitation", 0.0)),
        humidity=int(current.get("relative_humidity_2m", 0)),
        wind_speed=float(current.get("wind_speed_10m", 0.0)),
        weather_code=current.get("weather_code"),
    )

    return summary, forecast


def _fetch_historical_weather(start_date: str, end_date: str):
    params = {
        "latitude": settings.weather_latitude,
        "longitude": settings.weather_longitude,
        "timezone": settings.weather_timezone,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
    }
    url = f"https://archive-api.open-meteo.com/v1/archive?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": "AgriShieldAP/1.0"})

    with urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    hourly = payload.get("hourly", {})
    times = hourly.get("time", [])
    temps = hourly.get("temperature_2m", [])
    humidities = hourly.get("relative_humidity_2m", [])
    precip = hourly.get("precipitation", [])

    daily_map: dict[str, dict[str, list[float]]] = {}
    for index, timestamp in enumerate(times):
        day = timestamp[:10]
        bucket = daily_map.setdefault(day, {"temp": [], "humidity": [], "rainfall": []})
        if index < len(temps):
            bucket["temp"].append(float(temps[index]))
        if index < len(humidities):
            bucket["humidity"].append(float(humidities[index]))
        if index < len(precip):
            bucket["rainfall"].append(float(precip[index]))

    points: list[WeatherDatasetPointOut] = []
    for day in sorted(daily_map.keys()):
        bucket = daily_map[day]
        temp_values = bucket["temp"] or [0.0]
        humidity_values = bucket["humidity"] or [0.0]
        rain_values = bucket["rainfall"] or [0.0]
        rainfall_value = round(sum(rain_values), 1)
        points.append(
            WeatherDatasetPointOut(
                day=day,
                rainfall=rainfall_value,
                temp=round(sum(temp_values) / len(temp_values), 1),
                humidity=int(round(sum(humidity_values) / len(humidity_values))),
                drought=max(0, min(100, int(round((1 - min(rainfall_value / 20.0, 1.0)) * 100)))),
                source="historical",
            )
        )

    return points


def _build_projection_2027(history: list[WeatherDatasetPointOut]):
    if not history:
        return []

    by_month_day: dict[str, list[WeatherDatasetPointOut]] = {}
    for item in history:
        month_day = item.day[5:]
        by_month_day.setdefault(month_day, []).append(item)

    historical_years = sorted({item.day[:4] for item in history})
    year_span = max(len(historical_years), 1)

    projection: list[WeatherDatasetPointOut] = []
    for month in range(1, 13):
        for day_of_month in range(1, 32):
            try:
                target = date(2027, month, day_of_month)
            except ValueError:
                continue

            month_day = target.isoformat()[5:]
            matches = by_month_day.get(month_day)
            if not matches:
                continue

            avg_rain = sum(item.rainfall for item in matches) / len(matches)
            avg_temp = sum(item.temp for item in matches) / len(matches)
            avg_humidity = sum(item.humidity for item in matches) / len(matches)

            trend_adjustment = 0.1 * year_span
            projection.append(
                WeatherDatasetPointOut(
                    day=target.isoformat(),
                    rainfall=round(max(0.0, avg_rain * 0.98), 1),
                    temp=round(avg_temp + trend_adjustment, 1),
                    humidity=int(round(min(100, max(0, avg_humidity - 1)))),
                    drought=max(0, min(100, int(round((1 - min(avg_rain / 20.0, 1.0)) * 100)))),
                    source="projection-2027",
                )
            )

    return projection


def _get_live_forecast_point(target_day: str) -> WeatherForecastPointOut:
    _, forecast = _fetch_live_weather()
    for point in forecast:
        if point.day == target_day:
            return point
    raise ValueError(f"No live weather data found for {target_day}")


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _parcel_layer_analytics(health: float, ndvi: float, evi: float, ndre: float, savi: float) -> dict:
    ndvi_score = _clamp(ndvi, 0.0, 1.0)
    evi_score = _clamp(evi, 0.0, 1.0)
    ndre_score = _clamp(ndre, 0.0, 1.0)
    savi_score = _clamp(savi, 0.0, 1.0)

    # Abiotic proxies
    stress_score = _clamp(1.0 - ndvi_score * 0.72 + (100.0 - health) / 240.0, 0.0, 1.0)  # 0..1
    moisture_score = _clamp(0.2 + evi_score * 0.42 + ndvi_score * 0.28 - stress_score * 0.14, 0.0, 1.0)  # 0..1
    abiotic_stress = _clamp(stress_score * 0.68 + (1.0 - moisture_score) * 0.32, 0.0, 1.0)

    # Anomaly proxy (spectral deviation)
    anomaly_score = _clamp(
        abs(ndvi_score - evi_score) * 0.52 + abs(ndvi_score - ndre_score) * 0.56 + stress_score * 0.18,
        0.0,
        1.0,
    )

    # Biotic proxy (disease likelihood)
    disease_score = _clamp(
        (100.0 - health) / 100.0 * 0.58 + stress_score * 0.24 + anomaly_score * 0.18,
        0.0,
        1.0,
    )
    biotic_stress = disease_score

    # Unified health: higher = healthier
    # CHSS UCHI formula
    unified = 0.35 * ndvi_score + 0.25 * evi_score + 0.25 * ndre_score + 0.15 * savi_score
    unified_health_index = round(unified * 100.0, 1)

    # PoC deviation score: use anomaly_score + inverse health.
    anomaly_deviation_score = round(_clamp(anomaly_score * 0.55 + (1.0 - unified) * 0.45, 0.0, 1.0) * 100.0, 1)

    # Satellite confidence: higher when vegetation signal looks internally consistent.
    # If indices disagree heavily (anomaly) and stress is extreme, confidence drops.
    satellite_conf = _clamp(1.0 - anomaly_score * 0.55 - abs(stress_score - 0.5) * 0.25, 0.0, 1.0)
    satellite_confidence = round(satellite_conf * 100.0, 1)

    # Legacy normalized layer scores keep old UI keys working.
    if disease_score >= 0.72:
        insight = "High disease pressure cluster"
        recommendation = "Schedule an urgent field visit and targeted scouting."
    elif stress_score >= 0.58:
        insight = "Vegetation stress building"
        recommendation = "Check irrigation, nutrient balance, and early disease signs."
    elif moisture_score < 0.42:
        insight = "Moisture deficit detected"
        recommendation = "Prioritise irrigation and soil moisture validation."
    else:
        insight = "Stable crop health pattern"
        recommendation = "Continue routine monitoring and weekly scouting."

    return {
        # Raw layer scores (0..1)
        "ndvi": round(ndvi_score, 3),
        "evi": round(evi_score, 3),
        "ndre": round(ndre_score, 3),
        "savi": round(savi_score, 3),

        # Abiotic / biotic proxies (0..1)
        "soil_moisture": round(moisture_score, 3),
        "vegetation_stress": round(stress_score, 3),
        "anomaly_hotspots": round(anomaly_score, 3),
        "disease_probability": round(disease_score, 3),

        # CHSS unified index fields (0..100)
        "unified_health_index": unified_health_index,
        "abiotic_stress_score": round(abiotic_stress * 100.0, 1),
        "biotic_stress_score": round(biotic_stress * 100.0, 1),
        "anomaly_deviation_score": anomaly_deviation_score,
        "satellite_confidence": satellite_confidence,

        # Placeholder for future fusion endpoint
        "unified_confidence": None,

        "insight": insight,
        "recommendation": recommendation,
        "model": "AgriShield Parcel Analytics v2",
    }


def _severity_from_stress(stress: float) -> str:
    if stress < 0.28:
        return "Low"
    if stress < 0.52:
        return "Medium"
    if stress < 0.76:
        return "High"
    return "Critical"


def _severity_from_probability(probability: float, label: str | None = None) -> str:
    if label and "healthy" in label.lower():
        return "Low"
    if probability < 0.35:
        return "Low"
    if probability < 0.6:
        return "Medium"
    if probability < 0.8:
        return "High"
    return "Critical"


def _extract_crop_from_label(label: str) -> str | None:
    normalized = label.lower()
    if "___" in normalized:
        normalized = normalized.split("___", 1)[0]
    normalized = normalized.replace("(", " ").replace(")", " ").replace(",", " ").replace("-", " ")
    normalized = normalized.replace("_", " ")

    crop_aliases = {
        "maize": "Maize",
        "corn": "Maize",
        "tomato": "Tomato",
        "banana": "Banana",
        "paddy": "Paddy",
        "rice": "Paddy",
        "chilli": "Chilli",
        "chili": "Chilli",
        "mustard": "Mustard",
        "grape": "Grape",
        "potato": "Potato",
        "apple": "Apple",
        "cotton": "Cotton",
        "wheat": "Wheat",
        "pepper": "Pepper",
        "brinjal": "Brinjal",
        "pea": "Pea",
        "guava": "Guava",
        "pumpkin": "Pumpkin",
        "mango": "Mango",
        "sugarcane": "Sugarcane",
        "soybean": "Soybean",
        "sunflower": "Sunflower",
    }

    for needle, crop in crop_aliases.items():
        if needle in normalized:
            return crop
    return None


def _extract_crop_hint(file_name: str) -> str | None:
    normalized = file_name.lower()
    normalized = normalized.replace("-", " ").replace("_", " ")

    crop_aliases = [
        ("banana", "Banana"),
        ("maize", "Maize"),
        ("corn", "Maize"),
        ("paddy", "Paddy"),
        ("rice", "Paddy"),
        ("chilli", "Chilli"),
        ("chili", "Chilli"),
        ("mustard", "Mustard"),
        ("grape", "Grape"),
        ("potato", "Potato"),
        ("apple", "Apple"),
        ("cotton", "Cotton"),
        ("wheat", "Wheat"),
        ("pepper", "Pepper"),
        ("brinjal", "Brinjal"),
        ("pea", "Pea"),
        ("guava", "Guava"),
        ("pumpkin", "Pumpkin"),
        ("mango", "Mango"),
        ("sugarcane", "Sugarcane"),
        ("soybean", "Soybean"),
        ("sunflower", "Sunflower"),
    ]

    for needle, crop in crop_aliases:
        if needle in normalized:
            return crop
    return None


def _build_crop_gate(file_name: str, top_k: list[dict[str, float | str]]) -> tuple[DiseaseCropGateOut | None, bool, str | None]:
    crop_hint = _extract_crop_hint(file_name)
    crop_scores: dict[str, float] = {}
    matched_by_crop: dict[str, list[dict[str, float | str]]] = {}

    for item in top_k:
        label = str(item.get("label", ""))
        crop = _extract_crop_from_label(label)
        if not crop:
            continue
        score = float(item.get("score", 0.0))
        crop_scores[crop] = crop_scores.get(crop, 0.0) + score
        matched_by_crop.setdefault(crop, []).append(item)

    predicted_crop = max(crop_scores, key=crop_scores.get) if crop_scores else None
    crop = crop_hint or predicted_crop
    if not crop:
        return None, False, None

    if crop_hint and predicted_crop and crop_hint == predicted_crop:
        source = "filename+prediction"
    elif crop_hint:
        source = "filename"
    else:
        source = "prediction"

    matched = matched_by_crop.get(crop, [])
    matched_sorted = sorted(matched, key=lambda item: float(item.get("score", 0.0)), reverse=True)
    selected = matched_sorted[0] if matched_sorted else (top_k[0] if top_k else None)
    selected_label = str(selected.get("label")) if selected else None
    selected_score = float(selected.get("score", 0.0)) if selected else None

    confidence_base = crop_scores.get(crop, 0.0) if crop_scores else (selected_score or 0.0)
    confidence = int(round(_clamp(58 + confidence_base * 40, 35, 96)))

    gate = DiseaseCropGateOut(
        crop=crop,
        confidence=confidence,
        source=source,
        selected_label=selected_label,
        selected_score=round(selected_score, 4) if selected_score is not None else None,
        matched=[{"label": str(item["label"]), "score": round(float(item["score"]), 4)} for item in matched_sorted],
    )

    mismatch = bool(crop_hint and predicted_crop and crop_hint != predicted_crop)
    reason = None
    if mismatch:
        reason = f"Filename suggests {crop_hint}, but model predictions lean toward {predicted_crop}."
    elif crop_hint and not predicted_crop:
        reason = f"Filename suggests {crop_hint}, but the model label does not map cleanly to a crop family."
    elif crop_hint and crop_hint != crop:
        reason = f"Filename suggests {crop_hint}, but the crop gate selected {crop}."

    return gate, mismatch, reason


@lru_cache(maxsize=1)
def _hf_disease_model():
    if AutoModelForImageClassification is None:
        raise RuntimeError("transformers is not installed")

    kwargs: dict[str, object] = {}
    if settings.hf_api_token:
        kwargs["token"] = settings.hf_api_token
    model = AutoModelForImageClassification.from_pretrained(settings.hf_disease_model_id, **kwargs)
    model.eval()
    return model


@lru_cache(maxsize=1)
def _hf_disease_processor():
    if AutoImageProcessor is None:
        raise RuntimeError("transformers is not installed")

    kwargs: dict[str, object] = {}
    if settings.hf_api_token:
        kwargs["token"] = settings.hf_api_token
    # Keep the saved slow processor behavior stable until we intentionally switch.
    kwargs["use_fast"] = False
    return AutoImageProcessor.from_pretrained(settings.hf_disease_model_id, **kwargs)


def _hf_analyze_disease_image(file_bytes: bytes):
    if torch is None or Image is None:
        raise RuntimeError("transformers/torch/pillow are required for disease inference")

    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    processor = _hf_disease_processor()
    model = _hf_disease_model()
    inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        predicted_idx = probs.argmax(-1).item()
        confidence = probs[0][predicted_idx].item()

    top_k = min(settings.hf_disease_top_k, probs.shape[-1])
    values, indices = torch.topk(probs[0], k=top_k)
    id2label = getattr(model.config, "id2label", {}) or {}

    ranked = []
    for index, value in zip(indices.tolist(), values.tolist()):
        ranked.append(
            {
                "label": str(id2label.get(index, f"class_{index}")),
                "score": round(float(value), 4),
            }
        )

    label = str(id2label.get(predicted_idx, f"class_{predicted_idx}"))
    severity = _severity_from_probability(float(confidence), label)
    return label, severity, int(round(confidence * 100.0)), ranked, settings.hf_disease_model_id


def _hash_fallback_prediction(file_name: str, file_bytes: bytes):
    digest = hashlib.sha256(file_bytes + file_name.encode("utf-8", errors="ignore")).digest()
    labels = [
        ("Paddy Blast", "High"),
        ("Cotton Bollworm", "Critical"),
        ("Chilli Leaf Curl", "Medium"),
        ("Maize Fall Armyworm", "High"),
        ("Red Gram Wilt", "Medium"),
    ]

    scores = []
    for index, (label, severity) in enumerate(labels):
        raw = digest[index] / 255.0
        score = 0.2 + raw * 0.8
        scores.append((label, severity, score))

    scores.sort(key=lambda item: item[2], reverse=True)
    total = sum(score for _, _, score in scores) or 1.0
    top_k = [{"label": label, "score": round(score / total, 4)} for label, _, score in scores]
    pick_label, pick_severity, pick_score = scores[0]
    confidence = int(round(60 + pick_score * 35))
    return pick_label, pick_severity, confidence, top_k, "Heuristic Crop Image Analyzer v1"


def _analyze_disease_image(file_name: str, file_bytes: bytes):
    try:
        return _hf_analyze_disease_image(file_bytes)
    except Exception:
        pass

    if Image is None:
        return _hash_fallback_prediction(file_name, file_bytes)

    with Image.open(io.BytesIO(file_bytes)) as image:
        image = image.convert("RGB")
        image.thumbnail((160, 160))
        pixels = list(image.getdata())

    if not pixels:
        return _hash_fallback_prediction(file_name, file_bytes)

    brightness_values = []
    red_total = green_total = blue_total = 0.0
    yellow_pixels = brown_pixels = dark_spots = healthy_pixels = 0

    for red, green, blue in pixels:
        red_total += red
        green_total += green
        blue_total += blue

        brightness = (red + green + blue) / 3.0
        brightness_values.append(brightness)

        if red > 120 and green > 120 and blue < 160 and abs(red - green) < 45:
            yellow_pixels += 1
        if red > 90 and green < 120 and blue < 110 and red >= green:
            brown_pixels += 1
        if brightness < 85 and abs(red - green) > 20 and abs(green - blue) > 15:
            dark_spots += 1
        if green >= red * 0.92 and green >= blue * 0.92 and brightness > 105:
            healthy_pixels += 1

    pixel_count = float(len(pixels))
    avg_red = red_total / pixel_count
    avg_green = green_total / pixel_count
    avg_blue = blue_total / pixel_count
    avg_brightness = sum(brightness_values) / pixel_count
    brightness_variance = sum((value - avg_brightness) ** 2 for value in brightness_values) / pixel_count
    brightness_stddev = math.sqrt(brightness_variance)

    green_deficit = _clamp((avg_red + avg_blue) / 2.0 - avg_green, 0.0, 255.0) / 255.0
    yellow_ratio = yellow_pixels / pixel_count
    brown_ratio = brown_pixels / pixel_count
    dark_ratio = dark_spots / pixel_count
    healthy_ratio = healthy_pixels / pixel_count
    contrast_ratio = _clamp(brightness_stddev / 64.0, 0.0, 1.0)
    dryness_ratio = _clamp((180.0 - avg_brightness) / 180.0, 0.0, 1.0)

    raw_scores = {
        "Paddy Blast": 0.18 + dark_ratio * 0.44 + green_deficit * 0.26 + contrast_ratio * 0.12,
        "Cotton Bollworm": 0.16 + contrast_ratio * 0.33 + dryness_ratio * 0.27 + (1.0 - healthy_ratio) * 0.24,
        "Chilli Leaf Curl": 0.15 + yellow_ratio * 0.5 + contrast_ratio * 0.2 + green_deficit * 0.15,
        "Maize Fall Armyworm": 0.14 + contrast_ratio * 0.28 + dark_ratio * 0.27 + (1.0 - healthy_ratio) * 0.31,
        "Red Gram Wilt": 0.17 + brown_ratio * 0.48 + dryness_ratio * 0.22 + green_deficit * 0.18,
    }

    ranked = sorted(raw_scores.items(), key=lambda item: item[1], reverse=True)
    total = sum(score for _, score in ranked) or 1.0
    top_k = [{"label": label, "score": round(score / total, 4)} for label, score in ranked]

    label = ranked[0][0]
    score = ranked[0][1] / total

    stress = _clamp(
        dark_ratio * 0.36 + brown_ratio * 0.28 + yellow_ratio * 0.2 + green_deficit * 0.22 + contrast_ratio * 0.08,
        0.0,
        1.0,
    )
    severity = _severity_from_stress(stress)
    confidence = int(round(_clamp(58 + score * 34 + (1.0 - abs(stress - 0.5)) * 8, 52, 97)))

    return label, severity, confidence, top_k, "Heuristic Crop Image Analyzer v1"


def _fallback_weather():
    forecast = []
    for i in range(14):
        forecast.append(
            WeatherForecastPointOut(
                day=f"Day {i+1}",
                rainfall=round(random.random() * 28, 1),
                temp=round(26 + random.random() * 10, 1),
                humidity=random.randint(50, 89),
                drought=int(round(random.random() * 100)),
            )
        )
    summary = WeatherSummaryOut(
        location="Andhra Pradesh",
        updated_at=datetime.utcnow().isoformat(timespec="seconds") + "Z",
        temperature=31.0,
        apparent_temperature=33.2,
        rainfall_24h=0.0,
        humidity=71,
        wind_speed=13.0,
        weather_code=None,
        source="fallback",
    )
    return summary, forecast


@app.get("/districts")
def districts(db: Session = Depends(get_db)):
    # Districts are represented as distinct values within Parcel data.
    rows = db.execute(select(models.Parcel.district).distinct().order_by(models.Parcel.district)).scalars().all()
    if rows:
        return [r for r in rows]

    return [
        "Anantapur",
        "Chittoor",
        "East Godavari",
        "Guntur",
        "Krishna",
        "Kurnool",
        "Nellore",
        "Prakasam",
        "Srikakulam",
        "Visakhapatnam",
        "Vizianagaram",
        "West Godavari",
        "YSR Kadapa",
    ]


def _mock_support_centers() -> list[dict]:
    # Mock RSK/ATMA/Agri Dept support centers (can be replaced by DB-backed data later).
    return [
        {
            "id": "SC-RSK-WG-001",
            "name": "RSK Support Center - West Godavari",
            "type": "RSK",
            "district": "West Godavari",
            "mandal": "Eluru",
            "address": "Agriculture Resource Centre, Eluru Road, West Godavari",
            "phone": "+91-90000-00011",
            "hours": "10:00-17:30",
        },
        {
            "id": "SC-ATMA-WG-002",
            "name": "ATMA Extension Unit - West Godavari",
            "type": "ATMA",
            "district": "West Godavari",
            "mandal": "Kovvur",
            "address": "ATMA Extension Hub, Kovvur, West Godavari",
            "phone": "+91-90000-00012",
            "hours": "09:30-16:30",
        },
        {
            "id": "SC-DEP-GNT-003",
            "name": "Agri Dept Helpdesk - Guntur",
            "type": "Department Helpdesk",
            "district": "Guntur",
            "mandal": "Guntur",
            "address": "Department of Agriculture Office, Guntur",
            "phone": "+91-90000-00021",
            "hours": "10:30-18:00",
        },
        {
            "id": "SC-RSK-KNL-004",
            "name": "RSK Support Center - Kurnool",
            "type": "RSK",
            "district": "Kurnool",
            "mandal": "Adoni",
            "address": "Crop Advisory Center, Adoni, Kurnool",
            "phone": "+91-90000-00031",
            "hours": "10:00-17:30",
        },
        {
            "id": "SC-ATMA-KNL-005",
            "name": "ATMA Extension Unit - Kurnool",
            "type": "ATMA",
            "district": "Kurnool",
            "mandal": "Kowthalam",
            "address": "ATMA Extension Hub, Kowthalam, Kurnool",
            "phone": "+91-90000-00032",
            "hours": "09:30-16:30",
        },
        {
            "id": "SC-RSK-ANP-006",
            "name": "RSK Support Center - Anantapur",
            "type": "RSK",
            "district": "Anantapur",
            "mandal": "Tadipatri",
            "address": "Agriculture Support Centre, Tadipatri, Anantapur",
            "phone": "+91-90000-00041",
            "hours": "10:00-17:30",
        },
        {
            "id": "SC-DEP-SKL-007",
            "name": "Agri Dept Helpdesk - Srikakulam",
            "type": "Department Helpdesk",
            "district": "Srikakulam",
            "mandal": "Palasa",
            "address": "Department Helpdesk Office, Palasa, Srikakulam",
            "phone": "+91-90000-00051",
            "hours": "10:30-18:00",
        },
        {
            "id": "SC-RSK-KRI-008",
            "name": "RSK Support Center - Krishna",
            "type": "RSK",
            "district": "Krishna",
            "mandal": "Gudivada",
            "address": "Crop Advisory Center, Gudivada, Krishna",
            "phone": "+91-90000-00061",
            "hours": "10:00-17:30",
        },
        {
            "id": "SC-ATMA-EGD-009",
            "name": "ATMA Extension Unit - East Godavari",
            "type": "ATMA",
            "district": "East Godavari",
            "mandal": "Madanapalle",
            "address": "ATMA Extension Hub, Madanapalle, East Godavari",
            "phone": "+91-90000-00071",
            "hours": "09:30-16:30",
        },
    ]


def _pseudo_distance_km(center_id: str, district: str | None, mandal: str | None, center: dict) -> float:
    """
    Stable “distance” based on string hashes (so UI is deterministic).
    Also nudges distance lower when district/mandal match the query.
    """
    import hashlib

    seed = f"{center_id}|{district or ''}|{mandal or ''}".encode("utf-8")
    digest = hashlib.sha256(seed).digest()
    base = digest[0] / 255.0  # 0..1

    nudge = 0.0
    if district and str(district).strip() and str(district) == str(center.get("district")):
        nudge -= 6.0
    if mandal and str(mandal).strip() and str(mandal) == str(center.get("mandal")):
        nudge -= 4.0

    # Clamp to [1.0..50.0]
    return round(max(1.0, min(50.0, 4.0 + base * 38.0 + nudge)), 1)


@app.get("/support-centers/nearest", response_model=NearestSupportCentersOut)
def nearest_support_centers(district: str | None = None, mandal: str | None = None):
    """
    Mock nearest support centers for the Government Dashboard.

    - If district is provided, prioritize centers matching that district.
    - If mandal is provided, further prioritize exact mandal matches.
    - Returns a stable pseudo-distance so the UI can display “nearest” without DB.
    """
    all_centers = _mock_support_centers()

    district_norm = district.strip() if district else None
    mandal_norm = mandal.strip() if mandal else None

    if district_norm:
        filtered = [c for c in all_centers if str(c.get("district")).lower() == district_norm.lower()]
        if filtered:
            all_centers = filtered

    # Score every center and sort by pseudo distance.
    scored: list[dict] = []
    for c in all_centers:
        dist = _pseudo_distance_km(c["id"], district_norm, mandal_norm, c)
        scored.append({**c, "distance_km": dist})

    scored_sorted = sorted(scored, key=lambda x: (x.get("distance_km") is None, x.get("distance_km", 9999)))
    centers_out = scored_sorted[:10]

    return NearestSupportCentersOut(centers=centers_out, query={"district": district_norm, "mandal": mandal_norm})

@app.get("/alerts", response_model=list[AlertOut])
def alerts(db: Session = Depends(get_db)):
    rows = db.execute(select(models.Alert).order_by(models.Alert.id.desc())).scalars().all()
    return [
        AlertOut(
            id=a.alert_id_str,
            type=a.type,
            crop=a.crop,
            district=a.district,
            severity=a.severity,
            time=a.time,
            action=a.action,
        )
        for a in rows
    ]


@app.post("/alerts", response_model=AlertOut)
def create_alert(payload: AlertCreateOut, db: Session = Depends(get_db)):
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    alert = models.Alert(
        alert_id_str=f"ALRT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}",
        type=payload.type,
        crop=payload.crop,
        district=payload.district,
        severity=payload.severity,
        time=payload.time or timestamp,
        action=payload.action,
    )

    try:
        db.add(alert)
        db.commit()
        db.refresh(alert)
    except SQLAlchemyError:
        db.rollback()
        raise

    return AlertOut(
        id=alert.alert_id_str,
        type=alert.type,
        crop=alert.crop,
        district=alert.district,
        severity=alert.severity,
        time=alert.time,
        action=alert.action,
    )

@app.get("/schemes", response_model=list[SchemeOut])
def schemes(db: Session = Depends(get_db)):
    rows = db.execute(select(models.Scheme).order_by(models.Scheme.id)).scalars().all()
    return [SchemeOut(title=s.title, desc=s.desc, tag=s.tag) for s in rows]

@app.get("/parcels", response_model=list[ParcelOut])
def parcels(db: Session = Depends(get_db)):


    """Return parcel analytics.

    Robust to older DB/model schemas where `evi` and/or `ndre` may not exist.
    """
    import logging

    try:
        parcel_columns = _ensure_parcel_schema(db)

        # Build a column list based on what attributes actually exist on the SQLAlchemy model.
        # This prevents hard crashes when older schemas/models don't have evi/ndre columns.
        cols = [
            models.Parcel.parcel_id_str,
            models.Parcel.farmer,
            models.Parcel.district,
            models.Parcel.mandal,
            models.Parcel.crop,
            models.Parcel.acreage,
            models.Parcel.health,
            models.Parcel.risk,
            models.Parcel.confidence,
            models.Parcel.lat,
            models.Parcel.lng,
            models.Parcel.ndvi,
        ]
        has_evi = "evi" in parcel_columns
        has_ndre = "ndre" in parcel_columns
        has_savi = "savi" in parcel_columns
        if has_evi:
            cols.append(models.Parcel.evi)
        if has_ndre:
            cols.append(models.Parcel.ndre)
        if has_savi:
            cols.append(models.Parcel.savi)

        stmt = select(*cols).order_by(models.Parcel.id)
        rows = db.execute(stmt).all()

        geometry_map: dict[str, str] = {}
        if "geom" in parcel_columns:
            try:
                geometry_rows = db.execute(
                    text(
                        """
                        SELECT parcel_id_str, ST_AsGeoJSON(geom) AS geometry_json
                        FROM parcels
                        ORDER BY id
                        """
                    )
                ).mappings().all()
                geometry_map = {
                    str(row["parcel_id_str"]): str(row["geometry_json"])
                    for row in geometry_rows
                    if row["geometry_json"]
                }
            except Exception:
                geometry_map = {}

        out: list[ParcelOut] = []
        for r in rows:
            # r is a tuple in the same order as `cols`
            idx = 0
            pid = r[idx]; idx += 1
            farmer = r[idx]; idx += 1
            district = r[idx]; idx += 1
            mandal = r[idx]; idx += 1
            crop = r[idx]; idx += 1
            acreage = r[idx]; idx += 1
            health = r[idx]; idx += 1
            risk = r[idx]; idx += 1
            confidence = r[idx]; idx += 1
            lat = r[idx]; idx += 1
            lng = r[idx]; idx += 1
            ndvi = r[idx]; idx += 1

            evi = r[idx] if has_evi else None; idx += (1 if has_evi else 0)
            ndre = r[idx] if has_ndre else None; idx += (1 if has_ndre else 0)
            savi = r[idx] if has_savi else None; idx += (1 if has_savi else 0)
            analytics = _parcel_layer_analytics(
                float(health),
                float(ndvi),
                float(evi if evi is not None else ndvi),
                float(ndre if ndre is not None else ndvi),
                float(savi if savi is not None else ndvi),
            )
            outline, geometry = _parcel_geometry_payload(
                pid,
                district,
                mandal,
                crop,
                float(lat),
                float(lng),
                float(acreage),
                geometry_map.get(str(pid)),
            )

            out.append(
                ParcelOut(
                    id=pid,
                    farmer=farmer,
                    district=district,
                    mandal=mandal,
                    crop=crop,
                    acreage=acreage,
                    health=health,
                    risk=risk,
                    confidence=confidence,
                    lat=lat,
                    lng=lng,
                    ndvi=ndvi,
                    evi=evi,
                    ndre=ndre,
                    savi=savi,
                    analytics=analytics,
                    outline=outline,
                    geometry=geometry,
                )
            )

        return out
    except Exception:
        logging.exception("/parcels failed")
        return _fallback_parcels()


@app.get("/weather", response_model=list[WeatherForecastPointOut])
def weather(db: Session = Depends(get_db)):
    try:
        _, forecast = _fetch_live_weather()
        return forecast
    except (URLError, HTTPError, TimeoutError, ValueError):
        rows = db.execute(select(models.WeatherForecast).order_by(models.WeatherForecast.id)).scalars().all()
        return [{"day": r.day, "rainfall": r.rainfall, "temp": r.temp, "humidity": r.humidity, "drought": r.drought} for r in rows]
    except Exception:
        _, forecast = _fallback_weather()
        return forecast


@app.get("/weather/history", response_model=list[WeatherDatasetPointOut])
def weather_history():
    try:
        return _fetch_historical_weather("2024-01-01", date.today().isoformat())
    except Exception:
        _, fallback_forecast = _fallback_weather()
        return [
            WeatherDatasetPointOut(
                day=f"2024-01-{str(index + 1).zfill(2)}",
                rainfall=item.rainfall,
                temp=item.temp,
                humidity=item.humidity,
                drought=item.drought,
                source="fallback-history",
            )
            for index, item in enumerate(fallback_forecast)
        ]


@app.get("/weather/projection-2027", response_model=list[WeatherDatasetPointOut])
def weather_projection_2027():
    try:
        history = _fetch_historical_weather("2024-01-01", date.today().isoformat())
        return _build_projection_2027(history)
    except Exception:
        _, fallback_forecast = _fallback_weather()
        return [
            WeatherDatasetPointOut(
                day=f"2027-01-{str(index + 1).zfill(2)}",
                rainfall=item.rainfall,
                temp=item.temp + 1.0,
                humidity=item.humidity,
                drought=item.drought,
                source="fallback-projection",
            )
            for index, item in enumerate(fallback_forecast)
        ]


@app.get("/weather/day", response_model=WeatherForecastPointOut)
def weather_day(day: str):
    try:
        return _get_live_forecast_point(day)
    except Exception:
        fallback_summary, fallback_forecast = _fallback_weather()
        try:
            day_index = int(day)
        except ValueError:
            day_index = 1

        if 1 <= day_index <= len(fallback_forecast):
            return fallback_forecast[day_index - 1]

        base_date = date.today()
        if day.startswith(str(base_date.year)):
            return fallback_forecast[0]

        return fallback_forecast[0]


@app.get("/weather/live", response_model=WeatherSummaryOut)
def weather_live():
    try:
        summary, _ = _fetch_live_weather()
        return summary
    except Exception:
        summary, _ = _fallback_weather()
        return summary



@app.get("/yield/districts-and-crops")
def yield_districts_and_crops():
    districts, crops = list_districts_and_crops()
    return {"districts": districts, "crops": crops}


@app.get("/yield/history", response_model=list[YieldHistoryPoint])
def yield_history_endpoint(district: str, crop: str):
    # Returns full series for plotting.
    rows = yield_history(district, crop)
    return [
        YieldHistoryPoint(
            year=r["year"],
            yieldKgPerHa=r["yieldKgPerHa"],
            production1000Tons=r["production1000Tons"],
            area1000Ha=r["area1000Ha"],
        )
        for r in rows
    ]


@app.post("/yield/predict", response_model=YieldPredictResponse)
def yield_predict_endpoint(payload: YieldPredictRequest):
    return predict_yield(payload.district, payload.crop, payload.year, payload.rainfall_mm)


@app.post("/yield/alerts", response_model=YieldAlertResponse)
def yield_alerts_endpoint(payload: YieldAlertRequest):
    # Simple demo alert logic:
    # - Use predicted yield
    # - Compare against baseline yield = moving average over last 5 available years.
    series = get_yield_series(payload.district, payload.crop)
    if not series:
        predicted = predict_yield(payload.district, payload.crop, payload.year, payload.rainfall_mm)
        return YieldAlertResponse(
            district=predicted.district,
            crop=predicted.crop,
            year=predicted.input_year,
            rainfall_mm=predicted.rainfall_mm,
            yield_reduction_percent=0.0,
            risk_level=predicted.risk_level,
            explanation=predicted.explanation,
            recommended_actions=["No ICRISAT history found for this district/crop in CSV."],
        )

    prior = [(y, yd) for y, yd in zip(series.years, series.yields_kg_per_ha) if y < payload.year]
    if not prior:
        prior = list(zip(series.years, series.yields_kg_per_ha))[-5:]

    prior = prior[-5:]
    baseline = sum(yd for _, yd in prior) / len(prior)
    predicted = predict_yield(payload.district, payload.crop, payload.year, payload.rainfall_mm)

    reduction = ((baseline - predicted.predicted_yield_kg_per_ha) / baseline) * 100.0 if baseline else 0.0
    reduction = max(0.0, reduction)

    risk = _risk_from_reduction(reduction)

    if risk in ["High", "Critical"]:
        actions = [
            "Implement deficit irrigation scheduling (priority to critical parcels).",
            "Recommend nutrient management and avoid late spraying that can stress plants.",
            "Dispatch field officers to verify crop moisture stress and early pest signals.",
        ]
    elif risk == "Medium":
        actions = [
            "Monitor irrigation balance and soil moisture for at-risk mandals.",
            "Conduct weekly scouting for early stress and disease signs.",
        ]
    else:
        actions = ["Maintain routine irrigation and continue monitoring (baseline risk)."]

    return YieldAlertResponse(
        district=predicted.district,
        crop=predicted.crop,
        year=predicted.input_year,
        rainfall_mm=predicted.rainfall_mm,
        yield_reduction_percent=round(reduction, 1),
        risk_level=risk, 
        explanation=(
            f"Baseline moving-average yield for {predicted.district}/{predicted.crop} "
            f"is ~{baseline:.0f} kg/ha. Predicted yield is {predicted.predicted_yield_kg_per_ha:.0f} kg/ha "
            f"for {predicted.input_year} with rainfall {predicted.rainfall_mm:.1f}mm."
        ),
        recommended_actions=actions,
    )


@app.get("/predictions", response_model=list[PredictionOut])
def predictions(db: Session = Depends(get_db)):
    rows = db.execute(select(models.Prediction).order_by(models.Prediction.id)).scalars().all()
    out = []
    for r in rows:
        horizon = "next 14 days"
        if "(7d)" in r.label:
            horizon = "next 7 days"
        elif "(30d)" in r.label:
            horizon = "next 30 days"
        elif "Yield Loss" in r.label:
            horizon = "end of season"

        ensemble = "CropVision-v4 · WeatherFusion · HistoricSpread-LSTM"
        if r.crop == "Paddy":
            ensemble = "AquaWatch-v2 · WeatherFusion · HistoricSpread-LSTM"

        confidence_band = "±4.2%"
        if r.severity == "Critical":
            confidence_band = "±2.1%"
        elif r.severity == "Low":
            confidence_band = "±6.5%"

        out.append({
            "label": r.label,
            "probability": r.probability,
            "severity": r.severity,
            "crop": r.crop,
            "horizon": horizon,
            "ensemble": ensemble,
            "confidence_band": confidence_band
        })
    return out


@app.get("/spectral-trend", response_model=list[SpectralPointOut])
def spectral_trend(db: Session = Depends(get_db)):
    # Always return deterministic data; this endpoint must never crash.
    avg_ndvi, avg_evi, avg_ndre, avg_savi = 0.55, 0.42, 0.36, 0.30

    # Demo spectral time-series: derive a smooth curve from parcel-level indices.
    try:
        rows = db.execute(
            select(models.Parcel.ndvi, models.Parcel.evi, models.Parcel.ndre, models.Parcel.savi).limit(120)
        ).all()
        if rows:
            avg_ndvi = sum(r[0] for r in rows) / len(rows)
            avg_evi = sum(r[1] for r in rows) / len(rows)
            avg_ndre = sum(r[2] for r in rows) / len(rows)
            avg_savi = sum(r[3] for r in rows) / len(rows)
    except Exception:
        pass

    points: list[SpectralPointOut] = []
    days = 30
    for i in range(days):
        t = i / (days - 1)
        ndvi = avg_ndvi + 0.04 * (t - 0.5)
        evi = avg_evi + 0.03 * (t - 0.5)
        ndre = avg_ndre + 0.02 * (t - 0.5)
        savi = avg_savi + 0.025 * (t - 0.5)

        points.append(
            SpectralPointOut(
                day=f"D{i + 1}",
                ndvi=round(ndvi, 3),
                evi=round(evi, 3),
                ndre=round(ndre, 3),
                savi=round(savi, 3),
            )
        )
    return points


@app.get("/dashboard/kpis", response_model=DashboardKpiOut)
def dashboard_kpis(db: Session = Depends(get_db)):
    """Compute dashboard KPI values from Postgres.

    Notes:
    - "Healthy" / "Active Stress" / "High risk" are derived from parcel `health` / `risk`.
    - "Disease Accuracy" and "Predicted Yield Loss" require ground-truth; if unavailable,
      we return explainable proxies derived from parcel analytics.
    """

    try:
        total_parcels = db.execute(select(func.count(models.Parcel.id))).scalar_one()

        if total_parcels == 0:
            return DashboardKpiOut(
                parcels_monitored=0,
                healthy_crop_percent=0.0,
                active_stress_alerts=0,
                disease_accuracy_percent=0.0,
                high_risk_mandal_count=0,
                predicted_yield_loss_percent=0.0,
                satellite_coverage_percent=0.0,
                ai_confidence_score_percent=0.0,
                updated_at=datetime.utcnow().isoformat(timespec="seconds") + "Z",
            )

        # Healthy crop: health >= 75 (tunable threshold)
        healthy_count = db.execute(
            select(func.count(models.Parcel.id)).where(models.Parcel.health >= 75)
        ).scalar_one()
        healthy_percent = round((healthy_count / total_parcels) * 100.0, 1)

        # Active stress alerts: parcels with risk High/Critical or health < 75
        stress_count = db.execute(
            select(func.count(models.Parcel.id))
            .where((models.Parcel.risk.in_(["High", "Critical"])) | (models.Parcel.health < 75))
        ).scalar_one()

        # High risk mandals: mandal with >= threshold risky parcels
        mandal_risky_counts = db.execute(
            select(models.Parcel.mandal, func.count(models.Parcel.id))
            .where(models.Parcel.risk.in_(["High", "Critical"]))
            .group_by(models.Parcel.mandal)
        ).all()
        # threshold: 10% of mandal parcels OR at least 10 parcels for demo dataset
        high_risk_mandal_count = sum(
            1
            for _, cnt in mandal_risky_counts
            if cnt >= 10
        )

        # Satellite coverage: parcels with non-null ndvi/evi/ndre
        # (If ndre/evi columns are absent, Postgres would error; we rely on startup schema ensure.)
        valid_veg = db.execute(
            select(func.count(models.Parcel.id)).where(
                (models.Parcel.ndvi.is_not(None))
                & (models.Parcel.evi.is_not(None))
                & (models.Parcel.ndre.is_not(None))
            )
        ).scalar_one()
        satellite_coverage_percent = round((valid_veg / total_parcels) * 100.0, 1)

        # AI confidence score: avg confidence (0..100 assumed)
        avg_conf = db.execute(select(func.avg(models.Parcel.confidence))).scalar_one() or 0
        ai_confidence_percent = round(float(avg_conf), 1)

        # Disease accuracy + predicted yield loss: proxies from parcel health/stress
        # Disease accuracy proxy: inverse of average stress, mapped to percent.
        # stress_proxy = average of (100-health) and risk.
        avg_health = db.execute(select(func.avg(models.Parcel.health))).scalar_one() or 0
        stress_proxy = (100.0 - float(avg_health)) / 100.0
        disease_accuracy_percent = round(max(0.0, min(100.0, (1.0 - stress_proxy) * 100.0)), 1)

        # Yield loss proxy: scale stress proxy into 0..20%
        predicted_yield_loss_percent = round(max(0.0, min(20.0, stress_proxy * 12.0)), 1)

        return DashboardKpiOut(
            parcels_monitored=int(total_parcels),
            healthy_crop_percent=float(healthy_percent),
            active_stress_alerts=int(stress_count),
            disease_accuracy_percent=float(disease_accuracy_percent),
            high_risk_mandal_count=int(high_risk_mandal_count),
            predicted_yield_loss_percent=float(predicted_yield_loss_percent),
            satellite_coverage_percent=float(satellite_coverage_percent),
            ai_confidence_score_percent=float(ai_confidence_percent),
            updated_at=datetime.utcnow().isoformat(timespec="seconds") + "Z",
        )
    except Exception as e:
        import traceback
        err_str = traceback.format_exc()
        # If something fails (missing columns, permissions, etc.), keep API responsive.
        return DashboardKpiOut(
            parcels_monitored=0,
            healthy_crop_percent=0.0,
            active_stress_alerts=0,
            disease_accuracy_percent=0.0,
            high_risk_mandal_count=0,
            predicted_yield_loss_percent=0.0,
            satellite_coverage_percent=0.0,
            ai_confidence_score_percent=0.0,
            updated_at=err_str[:500],
        )

import os
import csv
import random

@app.post("/farmers/register")
def register_farmer(data: FarmerRegisterInput, db: Session = Depends(get_db)):
    lat = round(16.5 + (random.random() * 0.4), 6)
    lng = round(81.3 + (random.random() * 0.5), 6)
    health = round(75.0 + (random.random() * 20.0), 1)
    risk = "Low" if health > 80 else "Medium"
    confidence = int(80 + random.random() * 15)
    ndvi = round(0.7 + random.random() * 0.2, 2)
    evi = round(ndvi - 0.05, 2)
    ndre = round(ndvi - 0.2, 2)
    savi = round(ndvi - 0.15, 2)
    
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data", "west_godavari_parcels_1200.csv")
    
    if os.path.exists(csv_path):
        with open(csv_path, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                data.parcel_id,
                data.farmer_name,
                data.district,
                data.mandal,
                data.crop_type,
                data.land_area_acres,
                health,
                risk,
                confidence,
                lat,
                lng,
                ndvi,
                evi,
                ndre,
                savi
            ])

    # Insert into the database so it's immediately available without a restart
    new_parcel = models.Parcel(
        parcel_id_str=data.parcel_id,
        farmer=data.farmer_name,
        district=data.district,
        mandal=data.mandal,
        crop=data.crop_type,
        acreage=data.land_area_acres,
        health=health,
        risk=risk,
        confidence=confidence,
        lat=lat,
        lng=lng,
        ndvi=ndvi,
        evi=evi,
        ndre=ndre,
        savi=savi,
    )
    
    try:
        db.add(new_parcel)
        db.commit()
    except Exception:
        pass

    return {"status": "success", "parcel_id": data.parcel_id}


from functools import lru_cache

@lru_cache(maxsize=1)
def _load_surveillance_csv():
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "public", "data", "AP_Crop_Disease_Dataset_Balanced.csv")
    
    district_agg = {}
    crop_counts = {}
    disease_counts = {}
    
    if os.path.exists(csv_path):
        with open(csv_path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                dist = row['district_name'].strip()
                if dist not in district_agg:
                    district_agg[dist] = {
                        "affected_parcels": 0,
                        "affected_farmers": 0,
                        "crop_counts": {},
                        "disease_counts": {}
                    }
                
                district_agg[dist]["affected_parcels"] += 1
                
                try:
                    farmers = int(float(row.get('affected_farmers', 0)))
                except ValueError:
                    farmers = 0
                district_agg[dist]["affected_farmers"] += farmers
                
                crop = row['crop_name'].strip()
                disease = row['disease_name'].strip()
                
                district_agg[dist]["crop_counts"][crop] = district_agg[dist]["crop_counts"].get(crop, 0) + 1
                district_agg[dist]["disease_counts"][disease] = district_agg[dist]["disease_counts"].get(disease, 0) + 1
                
                crop_counts[crop] = crop_counts.get(crop, 0) + 1
                disease_counts[disease] = disease_counts.get(disease, 0) + 1
            
    return district_agg, crop_counts, disease_counts

@app.get("/surveillance/data", response_model=SurveillanceDataOut)
def get_surveillance_data(db: Session = Depends(get_db)):
    # Calculate district statistics for lat/lng
    districts_data = db.execute(text("""
        SELECT 
            district,
            AVG(lat) as lat,
            AVG(lng) as lng
        FROM parcels
        GROUP BY district
    """)).mappings().all()

    ALL_DISTRICTS = [
        'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla', 
        'Chittoor', 'East Godavari', 'Eluru', 'Guntur', 'Kakinada', 'Dr. B.R. Ambedkar Konaseema', 
        'Krishna', 'Kurnool', 'Nandyal', 'NTR', 'Palnadu', 'Parvathipuram Manyam', 'Prakasam', 
        'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam', 'Tirupati', 'Visakhapatnam', 
        'Vizianagaram', 'West Godavari', 'YSR Kadapa'
    ]

    district_results = []
    db_districts = {d["district"]: d for d in districts_data}
    csv_districts, csv_crops, csv_diseases = _load_surveillance_csv()
    
    fert_recs = db.query(models.FertilizerRecommendation).all()
    fert_data = {}
    for row in fert_recs:
        crop = row.crop_name.strip().lower().replace("paddy (rice)", "rice").replace("paddy", "rice")
        disease = row.disease_name.strip().lower().replace(" disease", "").replace(" virus", "")
        fert_obj = {
            "fertilizer": row.recommended_fertilizer,
            "dosage": f"{row.dosage_per_acre_kg} kg/acre",
            "method": row.application_method
        }
        fert_data[f"{crop}_{disease}"] = fert_obj
        if disease not in fert_data:
            fert_data[disease] = fert_obj

    for district in ALL_DISTRICTS:
        d = db_districts.get(district, {
            "lat": 16.5, # default approx
            "lng": 80.5
        })
        
        csv_d = csv_districts.get(district, {
            "affected_parcels": 0,
            "affected_farmers": 0,
            "crop_counts": {},
            "disease_counts": {}
        })

        d_crops = [{"name": k, "count": v} for k, v in sorted(csv_d["crop_counts"].items(), key=lambda x: x[1], reverse=True)[:5]]
        
        d_diseases_sorted = sorted(csv_d["disease_counts"].items(), key=lambda x: x[1], reverse=True)
        total_disease = sum(v for _, v in d_diseases_sorted)
        
        d_diseases = []
        for name, count in d_diseases_sorted[:3]:
            val = round((count / total_disease) * 100) if total_disease > 0 else 0
            d_diseases.append({"name": name, "val": val})
            
        if len(d_diseases_sorted) > 3:
            others_val = 100 - sum(x["val"] for x in d_diseases)
            d_diseases.append({"name": "Others", "val": others_val})
            
        if not d_diseases:
            d_diseases = [{"name": "None", "val": 100}]

        ap = csv_d["affected_parcels"]
        status = "Healthy"
        color = "oklch(0.78 0.19 145)"
        
        if ap > 5000:
            status = "Severe Outbreak"
            color = "oklch(0.68 0.22 25)"
        elif ap > 2000:
            status = "High Risk"
            color = "oklch(0.82 0.17 80)"
        elif ap > 500:
            status = "Moderate Risk"
            color = "oklch(0.85 0.15 100)"
        
        top_crop = d_crops[0]["name"].lower().replace("paddy (rice)", "rice").replace("paddy", "rice") if d_crops else ""
        top_disease = d_diseases_sorted[0][0].lower().replace(" disease", "").replace(" virus", "") if d_diseases_sorted else ""
        
        treatment = None
        if top_crop and top_disease:
            key_exact = f"{top_crop}_{top_disease}"
            if key_exact in fert_data:
                treatment = fert_data[key_exact]
            elif top_disease in fert_data:
                treatment = fert_data[top_disease]
            else:
                treatment = {
                    "fertilizer": "NPK 19:19:19",
                    "dosage": "50 kg/acre",
                    "method": "Soil Application"
                }

        district_results.append({
            "district": district,
            "lat": d["lat"],
            "lng": d["lng"],
            "affected_parcels": ap,
            "affected_farmers": csv_d["affected_farmers"],
            "status": status,
            "color": color,
            "crops": d_crops,
            "diseases": d_diseases,
            "treatment": treatment
        })

    # Sort and take top crop distributions
    crop_distribution = [{"name": k, "value": v} for k, v in sorted(csv_crops.items(), key=lambda x: x[1], reverse=True)[:5]]
    disease_type_distribution = [{"name": k, "count": v} for k, v in sorted(csv_diseases.items(), key=lambda x: x[1], reverse=True)[:5]]

    total_parcels_all = sum(v["affected_parcels"] for v in csv_districts.values())
    if total_parcels_all == 0:
        total_parcels_all = 50000

    disease_trend = [
        {"date": "Jun 1", "cases": int(total_parcels_all * 0.05)},
        {"date": "Jun 2", "cases": int(total_parcels_all * 0.08)},
        {"date": "Jun 3", "cases": int(total_parcels_all * 0.12)},
        {"date": "Jun 4", "cases": int(total_parcels_all * 0.16)},
        {"date": "Jun 5", "cases": int(total_parcels_all * 0.20)},
        {"date": "Jun 6", "cases": int(total_parcels_all * 0.24)},
    ]

    return {
        "district_data": district_results,
        "crop_distribution": crop_distribution,
        "disease_type_distribution": disease_type_distribution,
        "disease_trend": disease_trend
    }


@app.post("/disease/detect", response_model=DiseaseDetectionResponseOut)
async def disease_detect(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if file.content_type and not file.content_type.startswith("image/"):
        return JSONResponse(status_code=400, content={"detail": "Please upload a valid image file."})

    file_bytes = await file.read()
    file_name = file.filename or "upload"
    pick_label, pick_sev, confidence, top_k, model = _analyze_disease_image(file_name, file_bytes)
    crop_gate, mismatch_detected, mismatch_reason = _build_crop_gate(file_name, top_k)

    if crop_gate and crop_gate.matched and crop_gate.selected_label:
        pick_label = crop_gate.selected_label
        if crop_gate.selected_score is not None:
            confidence = int(round(_clamp(crop_gate.selected_score * 100.0, 1.0, 99.0)))
            pick_sev = _severity_from_probability(crop_gate.selected_score, pick_label)
    crop_hint = crop_gate.crop if crop_gate else _extract_crop_hint(file_name)

    det = models.DiseaseDetection(
        filename=file.filename,
        label=pick_label,
        severity=pick_sev,
        confidence=confidence,
        model=model,
        top_k_json=json.dumps(top_k),
    )
    try:
        db.add(det)
        db.commit()
    except SQLAlchemyError:
        db.rollback()

    # Derive crop for fertilizer recommendation
    crop_for_fert = crop_gate.crop if crop_gate else crop_hint

    # Map severity to risk bands for fertilizer heuristic
    def _sev_to_risk(sev: str) -> Literal["Low", "Medium", "High"]:
        if sev in ("High", "Critical"):
            return "High"
        if sev == "Medium":
            return "Medium"
        return "Low"

    fert_result: FertilizerRecoOut | None = None
    if crop_for_fert:
        try:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"[FERT DEBUG] crop_for_fert={crop_for_fert!r} pick_sev={pick_sev!r}")
            fert_inp = FertilizerRecoHeuristicInput(
                crop=crop_for_fert,
                weather_rainfall_mm=None,
                disease_risk=_sev_to_risk(pick_sev),
                pest_risk="Medium",
                satellite_unified_health_index_pct=None,
                satellite_abiotic_stress_score_pct=None,
                satellite_soil_moisture_score_pct=None,
            )
            fert_result = FertilizerRecoOut(**recommend_fertilizer_poc(fert_inp))
            logger.warning(f"[FERT DEBUG] fert_result={fert_result}")
        except Exception as e:
            import traceback
            import sys
            sys.stderr.write(f"[FERT DEBUG] exception={e} trace={traceback.format_exc()}\n")
            sys.stderr.flush()

    return DiseaseDetectionResponseOut(
        label=pick_label,
        severity=pick_sev,
        confidence=confidence,
        model=model,
        top_k=top_k,
        crop_gate=crop_gate,
        mismatch_detected=mismatch_detected,
        mismatch_reason=mismatch_reason,
        crop_hint=crop_hint,
        fertilizer_recommendation=fert_result,
    )

@app.post("/fusion/fuse", response_model=FusionResponseOut)
async def fuse_satellite_ground(
    input: FusionFuseInput,
    db: Session = Depends(get_db),
):

    """
    PoC fusion endpoint:

    - Select parcel using parcel_id or nearest by lat/lng.
    - Use satellite CHSS analytics from parcel (unified_health_index + confidence + stress/anomaly scores).
    - Use smartphone disease detection confidence from either provided disease_detection_response or uploaded image.
    - Fuse into unified_confidence and compute 7-day risk bands + agronomic recommendation steps.
    """
    # 1) Select parcel
    parcel: models.Parcel | None = None
    chosen_parcel_id: str | None = None

    if input.parcel_id:
        chosen_parcel_id = input.parcel_id
        parcel = (
            db.execute(select(models.Parcel).where(models.Parcel.parcel_id_str == input.parcel_id)).scalars().first()
        )
    elif input.lat is not None and input.lng is not None:
        # Nearest parcel by simple lat/lng distance (DB-friendly PoC).
        # Note: if geom/postgis is available, this should be replaced with geospatial distance.
        lat = float(input.lat)
        lng = float(input.lng)
        chosen = db.execute(
            select(models.Parcel).order_by(
                (models.Parcel.lat - lat) * (models.Parcel.lat - lat) + (models.Parcel.lng - lng) * (models.Parcel.lng - lng)
            )
        ).scalars().first()
        parcel = chosen
        chosen_parcel_id = getattr(parcel, "parcel_id_str", None) if parcel else None

    if parcel is None:
        raise HTTPException(status_code=400, detail="Provide either parcel_id or both lat & lng to locate a parcel.")

    # 2) Satellite analytics (computed on GET /parcels; we re-compute here from indices + health)
    lat_val = float(parcel.lat) if parcel.lat is not None else 0.0
    lng_val = float(parcel.lng) if parcel.lng is not None else 0.0
    ndvi_val = float(parcel.ndvi) if parcel.ndvi is not None else 0.5
    evi_val = float(parcel.evi) if getattr(parcel, "evi", None) is not None else ndvi_val - 0.05
    ndre_val = float(parcel.ndre) if getattr(parcel, "ndre", None) is not None else ndvi_val - 0.2
    savi_val = float(parcel.savi) if getattr(parcel, "savi", None) is not None else ndvi_val - 0.15
    health_val = float(parcel.health) if parcel.health is not None else 65.0

    satellite_layer = _parcel_layer_analytics(health_val, ndvi_val, evi_val, ndre_val, savi_val)

    satellite_confidence = float(satellite_layer.get("satellite_confidence", 60.0))
    unified_health_index = float(satellite_layer.get("unified_health_index", 60.0))
    abiotic_stress_score = float(satellite_layer.get("abiotic_stress_score", 50.0))
    biotic_stress_score = float(satellite_layer.get("biotic_stress_score", 50.0))
    anomaly_deviation_score = float(satellite_layer.get("anomaly_deviation_score", 50.0))

    # 3) Photo analytics (disease detection response)
    photo_confidence: float | None = None
    disease_detected: DiseaseDetectionResponseOut | None = None

    if input.disease_detection_response is not None:
        disease_detected = input.disease_detection_response
        photo_confidence = float(disease_detected.confidence)

    if disease_detected is None or photo_confidence is None:
        # Fusion still works without photo, but spec expects photo confidence when possible.
        photo_confidence = 0.0

    # Fetch live weather for explainable AI
    try:
        weather_summary, _ = _fetch_live_weather()
        humidity = weather_summary.humidity
    except:
        humidity = 85  # mock high humidity

    # 4) Fuse confidence (Satellite + Weather + Photo + Historical Pest)
    # PoC weights: Photo (40%), Satellite (30%), Weather (15%), History (15%)
    photo_score = float(photo_confidence or 0.0)
    sat_w = 0.30
    photo_w = 0.40
    weather_w = 0.15
    history_w = 0.15
    
    historical_pest_risk = 80.0  # Mock historical pest risk for the region
    humidity_risk = min(100.0, humidity * 1.1) # High humidity increases risk
    
    # If photo confirms disease, overall risk shoots up
    final_risk = (
        sat_w * satellite_confidence + 
        photo_w * photo_score + 
        weather_w * humidity_risk + 
        history_w * historical_pest_risk
    )
    unified_confidence = float(round(final_risk, 1))
    
    # Explainable AI
    explanation = [
        f"Satellite Anomaly: {anomaly_deviation_score}%",
        f"Photo detection confidence: {photo_score}%" if photo_score > 0 else "No photo provided",
        f"Weather Humidity: {'High' if humidity > 70 else 'Normal'} ({humidity}%)",
        f"Historical Pest Data Risk: High (80%)"
    ]

    # 5) Risk bands (PoC mapping)
    # disease risk: use photo confidence + satellite disease_probability proxy inside anomaly/satellite layer
    disease_probability_proxy = float(satellite_layer.get("disease_probability", 0.5)) * 100.0
    disease_score = 0.55 * (float(photo_confidence or 0.0)) + 0.45 * disease_probability_proxy
    disease_band: Literal["Low", "Medium", "High"] = (
        "High" if disease_score >= 70 else "Medium" if disease_score >= 45 else "Low"
    )

    # pest risk: reuse biotic stress score (from photo+sat later). PoC -> band from biotic_stress_score.
    pest_band: Literal["Low", "Medium", "High"] = (
        "High" if biotic_stress_score >= 65 else "Medium" if biotic_stress_score >= 40 else "Low"
    )

    # yield loss risk: derived from low unified health + disease
    yield_val = round((100.0 - unified_health_index) * 0.12 + (biotic_stress_score / 100.0) * 8.0, 1)
    yield_loss_risk = max(0, min(100, yield_val))

    # 6) Recommendation steps
    # Keep it aligned with crop stress vs disease severity.
    if disease_band == "High":
        rec = FusionRecommendationOut(
            title="Urgent scouting & targeted control (7-day window)",
            steps=[
                "Scout affected patches immediately and mark hotspots.",
                "Apply recommended treatment for detected disease (fungicide/insecticide as per crop bulletin).",
                "Avoid irrigation imbalance; follow moisture-conserving schedule.",
                "Re-validate with one new geo-tagged photo within 5 days.",
            ],
        )
    elif disease_band == "Medium":
        rec = FusionRecommendationOut(
            title="Targeted monitoring & early intervention",
            steps=[
                "Increase frequency of field scouting to 2–3 times this week.",
                "Check irrigation distribution and correct over/under-watering.",
                "Remove severely infected leaves/patches if locally applicable.",
                "Re-validate after 5 days using a fresh photo.",
            ],
        )
    else:
        rec = FusionRecommendationOut(
            title="Routine monitoring (stabilizing conditions)",
            steps=[
                "Maintain current irrigation and nutrient schedule.",
                "Continue weekly scouting and remove minor infected patches if observed.",
                "Monitor satellite confidence; respond if unified confidence drops.",
            ],
        )

    # 7) Fertilizer recommendation fused from satellite + photo
    fert_result: FertilizerRecoOut | None = None
    try:
        crop_for_fert = None
        if disease_detected is not None:
            crop_for_fert = (getattr(disease_detected.crop_gate, "crop", None) if getattr(disease_detected, "crop_gate", None) else None) or getattr(disease_detected, "crop_hint", None)

        # If photo didn't yield crop, fall back to parcel crop
        crop_for_fert = crop_for_fert or getattr(parcel, "crop", None)

        # Satellite soil moisture proxy is stored in satellite_layer as 0..1
        soil_moisture_score_pct = float(satellite_layer.get("soil_moisture", 0.55)) * 100.0
        abiotic_stress_score_pct = float(abiotic_stress_score)
        unified_health_index_pct = float(unified_health_index)

        # Map photo-derived severity confidence to risk bands
        # Use disease_band/pest_band already computed from fusion steps.
        fert_inp = FertilizerRecoHeuristicInput(
            crop=crop_for_fert,
            soil_health="Moderate",
            growth_stage="Vegetative",
            weather_rainfall_mm=None,
            satellite_unified_health_index_pct=unified_health_index_pct,
            satellite_abiotic_stress_score_pct=abiotic_stress_score_pct,
            satellite_soil_moisture_score_pct=soil_moisture_score_pct,
            disease_risk=disease_band,
            pest_risk=pest_band,
        )
        fert_result = FertilizerRecoOut(**recommend_fertilizer_poc(fert_inp))
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error generating fertilizer recommendation: {e}\n{traceback.format_exc()}")
        fert_result = None

    return FusionResponseOut(
        parcel_id=getattr(parcel, "parcel_id_str", None),
        fieldId=input.fieldId,
        crop=getattr(parcel, "crop", None),
        unified_health_index=unified_health_index,
        satellite_confidence=satellite_confidence,
        photo_confidence=float(photo_confidence or 0.0),
        unified_confidence=unified_confidence,
        disease_detected=disease_detected,
        abiotic_stress_score=abiotic_stress_score,
        biotic_stress_score=biotic_stress_score,
        anomaly_deviation_score=anomaly_deviation_score,
        fertilizer_recommendation=fert_result,
        fusedRisk7Days=FusionRisk7DaysOut(
            diseaseRisk=disease_band,
            pestRisk=pest_band,
            yieldLossRiskPct=yield_loss_risk,
        ),
        recommendation=rec,
        explanation=explanation,
    )


@app.get("/field-advisory/{fieldId}", response_model=FieldAdvisoryResponseOut)
def field_advisory(fieldId: str, db: Session = Depends(get_db)):
    """
    Backend-driven field advisory (PoC):
    - Uses parcel CHSS analytics already computed in `GET /parcels`.
    - Produces the payload shape consumed by `src/routes/field-advisory.$fieldId.tsx`.
    """
    # 1) Load parcel (fieldId is treated as parcel_id_str in PoC).
    parcel = db.execute(
        select(models.Parcel).where(models.Parcel.parcel_id_str == fieldId)
    ).scalars().first()

    if parcel is None:
        raise HTTPException(status_code=404, detail="Field/parcel not found")

    # 2) Satellite CHSS analytics.
    lat_val = float(parcel.lat) if parcel.lat is not None else 0.0
    lng_val = float(parcel.lng) if parcel.lng is not None else 0.0
    ndvi_val = float(parcel.ndvi) if parcel.ndvi is not None else 0.5
    evi_val = float(parcel.evi) if getattr(parcel, "evi", None) is not None else ndvi_val - 0.05
    ndre_val = float(parcel.ndre) if getattr(parcel, "ndre", None) is not None else ndvi_val - 0.2
    savi_val = float(parcel.savi) if getattr(parcel, "savi", None) is not None else ndvi_val - 0.15
    health_val = float(parcel.health) if parcel.health is not None else 65.0

    satellite_layer = _parcel_layer_analytics(health_val, ndvi_val, evi_val, ndre_val, savi_val)

    unified_health_index = float(satellite_layer.get("unified_health_index", 60.0))
    abiotic_stress_score = float(satellite_layer.get("abiotic_stress_score", 50.0))
    biotic_stress_score = float(satellite_layer.get("biotic_stress_score", 50.0))
    anomaly_deviation_score = float(satellite_layer.get("anomaly_deviation_score", 50.0))
    satellite_conf = float(satellite_layer.get("satellite_confidence", 60.0))

    # 3) Derive disease name from crop (PoC mapping).
    crop = str(getattr(parcel, "crop", "") or "")
    disease_name_map = {
        "Paddy": "Rice Blast",
        "Cotton": "Cotton Bollworm",
        "Chilli": "Chilli Leaf Curl",
        "Maize": "Fall Armyworm",
        "Red Gram": "Red Gram Wilt",
    }
    disease_name = disease_name_map.get(crop, "Crop Disease")

    # Photo not available in this endpoint; approximate disease probability from satellite disease_probability.
    disease_probability = float(satellite_layer.get("disease_probability", 0.5))  # 0..1
    # Scale 0..1 probability to realistic confidence range (15-65%) with some base boost.
    probabilityPct = round(max(15.0, min(65.0, disease_probability * 100.0 * 0.6 + satellite_conf * 0.15 + 8.0)), 1)

    # Severity from probability.
    if probabilityPct >= 80:
        severity: Literal["Low", "Medium", "High", "Critical"] = "Critical"
    elif probabilityPct >= 65:
        severity = "High"
    elif probabilityPct >= 45:
        severity = "Medium"
    else:
        severity = "Low"

    affectedAreaPct = round(max(1.0, min(45.0, (100.0 - unified_health_index) * 0.18 + anomaly_deviation_score * 0.07)), 1)

    # 4) Risk bands (7 days).
    # Use unified index and abiotic/biotic to shape bands.
    def band_from_score(score_0_100: float) -> Literal["Low", "Medium", "High"]:
        if score_0_100 >= 65:
            return "High"
        if score_0_100 >= 40:
            return "Medium"
        return "Low"

    diseaseRisk = band_from_score(probabilityPct)
    pestRisk = band_from_score(biotic_stress_score)
    yieldLossRiskPct = round(
        max(0.0, min(100.0, (100.0 - unified_health_index) * 0.22 + biotic_stress_score * 0.08 + abiotic_stress_score * 0.05)),
        1,
    )

    # 5) Recommendation steps from parcel analytics recommendation.

    base_reco = str(satellite_layer.get("recommendation", "Continue monitoring"))
    # Turn into 3–4 actionable steps for the UI (PoC text-to-steps).
    steps: list[str] = []
    if base_reco:
        # Simple split on punctuation.
        parts = [p.strip() for p in base_reco.replace(" and ", ". ").replace("-", " ").split(".") if p.strip()]
        steps = parts[:4]

    if not steps:
        steps = [base_reco]

    # Add a validation/next action step aligned with field workflow.
    steps.append("Upload a new geo-tagged crop image after 5 days to validate the advisory.")

    # 6) Weather alert (PoC): derive tone/message from forecast drought and rainfall.
    try:
        _, forecast = _fetch_live_weather()
        top3 = forecast[:3] if forecast else []
        if top3:
            avg_drought = sum(p.drought for p in top3) / len(top3)
            total_rain = sum(p.rainfall for p in top3)
        else:
            avg_drought = 50
            total_rain = 0

        if avg_drought >= 65:
            weather_tone: Literal["info", "warning"] = "warning"
            weather_message = "High drought risk over the next few days."
            weather_guidance = "Prioritise irrigation scheduling and avoid water stress during peak hours."
        elif total_rain >= 25:
            weather_tone = "warning"
            weather_message = "Heavy rainfall window expected soon."
            weather_guidance = "Delay pesticide application until rain subsides and protect exposed crops."
        else:
            weather_tone = "info"
            weather_message = "Weather conditions are relatively stable."
            weather_guidance = "Follow routine scouting and maintain balanced irrigation and nutrients."
    except Exception:
        weather_tone = "info"
        weather_message = "Weather data unavailable; follow baseline advisory."
        weather_guidance = "Verify locally through RSK/field staff and continue monitoring."

    # 7) Disease detected block for the UI (PoC): approximate from satellite disease_probability.
    probabilityPct = float(probabilityPct)
    disease_sev: Literal["Low", "Medium", "High", "Critical"] = severity

    disease_detected = FieldAdvisoryDiseaseDetectedOut(
        name=disease_name,
        probabilityPct=probabilityPct,
        severity=disease_sev,
        affectedAreaPct=affectedAreaPct,
    )

    ai_reco = FieldAdvisoryAiRecommendationOut(
        title="AI Recommendation",
        steps=steps,
    )

    predicted_risk = FieldAdvisoryPredictedRisk7DaysOut(
        diseaseRisk=diseaseRisk,
        pestRisk=pestRisk,
        yieldLossRiskPct=float(yieldLossRiskPct),
    )

    weather_alert = FieldAdvisoryWeatherAlertOut(
        tone=weather_tone,
        message=weather_message,
        guidance=weather_guidance,
    )

    return FieldAdvisoryResponseOut(
        fieldId=fieldId,
        crop=crop,
        healthScorePct=float(unified_health_index),
        diseaseDetected=disease_detected,
        aiRecommendation=ai_reco,
        predictedRisk7Days=predicted_risk,
        weatherAlert=weather_alert,
    )


# ── Crop & Fertilizer Recommendation Endpoints ───────────────────────────────


@app.post("/recommend/crop", response_model=CropRecoOut)
def recommend_crop(inp: CropRecoInput) -> CropRecoOut:
    """
    Recommend a crop based on satellite health index, weather, and risk bands.
    """
    heuristic_inp = CropRecoHeuristicInput(
        detected_crop=inp.detected_crop,
        weather_rainfall_mm=inp.weather_rainfall_mm,
        satellite_unified_health_index_pct=inp.satellite_unified_health_index_pct,
        satellite_satellite_confidence_pct=inp.satellite_satellite_confidence_pct,
        disease_risk=inp.disease_risk,
        pest_risk=inp.pest_risk,
    )
    crop, conf = recommend_crop_poc(heuristic_inp)
    return CropRecoOut(recommended_crop=crop, confidence=conf)


@app.post("/recommend/fertilizer", response_model=FertilizerRecoOut)
def recommend_fertilizer(inp: FertilizerRecoInput, db: Session = Depends(get_db)) -> FertilizerRecoOut:
    """
    Recommend fertilizer based on satellite stress proxies, soil health, growth stage, and weather.

    Inputs:
      - Crop (Paddy, Cotton, Groundnut, Red Gram)
      - Soil Health (Poor, Moderate, Good)
      - Growth Stage (Vegetative, Flowering, Grain Filling, Maturity)
      - Weather rainfall (mm)
      - Satellite health/stress scores
      - Disease and pest risk bands

    Outputs:
      - Fertilizer name, dosage (kg/acre), timing, application method, cost (Rs/acre)
      - Expected yield gain (%)
      - Nutrient deficiency breakdown (N, P, K)
    """
    try:
        heuristic_inp = FertilizerRecoHeuristicInput(
            crop=inp.crop,
            weather_rainfall_mm=inp.weather_rainfall_mm,
            satellite_unified_health_index_pct=inp.satellite_unified_health_index_pct,
            satellite_abiotic_stress_score_pct=inp.satellite_abiotic_stress_score_pct,
            satellite_soil_moisture_score_pct=inp.satellite_soil_moisture_score_pct,
            disease_risk=inp.disease_risk,
            pest_risk=inp.pest_risk,
            soil_health=inp.soil_health,
            growth_stage=inp.growth_stage,
        )
        result = recommend_fertilizer_poc(heuristic_inp)
        
        # Override with DB data
        crop_name = (inp.crop or "paddy").strip().lower()
        matches = db.query(models.FertilizerRecommendation).filter(
            models.FertilizerRecommendation.crop_name.ilike(f"%{crop_name}%")
        ).all()
        
        if matches:
            match = matches[1] if inp.disease_risk == "High" and len(matches) > 1 else matches[0]
            result["fertilizer_name"] = match.recommended_fertilizer
            result["dosage_kg_per_acre"] = match.dosage_per_acre_kg
            result["dosage_kg_total"] = match.dosage_per_acre_kg
            result["application_method"] = match.application_method
            result["reason"] = f"DB Recommendation: Specifically optimal for {match.crop_name} to treat {match.disease_name} under current risk profiles."
            
            # Recalculate cost based on new DB dosage (assuming avg ₹35 per kg for standard fertilizers)
            result["cost_rs_per_acre"] = round(match.dosage_per_acre_kg * 35, 0)

        return FertilizerRecoOut(**result)
    except Exception as e:
        import logging
        from fastapi.responses import JSONResponse
        logging.exception("Error in recommend_fertilizer", exc_info=e)
        resp = JSONResponse(status_code=500, content={"detail": f"Fertilizer recommendation error: {e}"})
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "*"
        return resp

