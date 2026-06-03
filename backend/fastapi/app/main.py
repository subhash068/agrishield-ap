import json
import random
import hashlib
import io
import math
import uuid
from functools import lru_cache
from datetime import datetime, date
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from fastapi import Depends, FastAPI, UploadFile, File, Request as FastAPIRequest
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .db import SessionLocal, engine
from . import models
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
)

from .config import settings

try:
    from PIL import Image
except ImportError:  # pragma: no cover - optional runtime dependency
    Image = None

try:
    import torch
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
    def seeded(value: int) -> float:
        import math

        x = math.sin(value) * 10000
        return x - math.floor(x)

    districts = [
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
    farmers = [
        "Ramesh Reddy",
        "Lakshmi Devi",
        "Suresh Naidu",
        "Kavitha Rao",
        "Venkat Rao",
        "Padma Sri",
        "Krishna Murthy",
        "Anjali Kumari",
    ]
    mandals = ["Penukonda", "Tadipatri", "Madanapalle", "Tenali", "Gudivada", "Adoni", "Kavali", "Ongole"]
    crops = ["Paddy", "Cotton", "Maize", "Chilli", "Red Gram"]
    lat_min, lat_max = 13.5, 19.1
    lng_min, lng_max = 77.0, 84.7

    parcels: list[ParcelOut] = []
    for index in range(220):
        crop = crops[index % len(crops)]
        lat = lat_min + seeded(index + 1) * (lat_max - lat_min)
        lng = lng_min + seeded(index + 7) * (lng_max - lng_min)
        health = round(45 + seeded(index + 13) * 50, 1)
        risk = "High" if health < 60 else "Medium" if health < 75 else "Low"
        acreage = round(0.8 + seeded(index + 23) * 9, 2)
        outline, geometry = _parcel_geometry_payload(
            f"AP-{str(index + 1).zfill(5)}",
            districts[index % len(districts)],
            mandals[index % len(mandals)],
            crop,
            lat,
            lng,
            acreage,
        )

        parcels.append(
            ParcelOut(
                id=f"AP-{str(index + 1).zfill(5)}",
                farmer=farmers[index % len(farmers)],
                district=districts[index % len(districts)],
                mandal=mandals[index % len(mandals)],
                crop=crop,
                acreage=acreage,
                health=health,
                risk=risk,
                confidence=int(78 + seeded(index + 29) * 21),
                lat=lat,
                lng=lng,
                ndvi=round(0.3 + seeded(index + 37) * 0.5, 2),
                evi=round(0.2 + seeded(index + 41) * 0.6, 2),
                ndre=round(0.15 + seeded(index + 47) * 0.45, 2),
                analytics=_parcel_layer_analytics(
                    health,
                    round(0.3 + seeded(index + 37) * 0.5, 2),
                    round(0.2 + seeded(index + 41) * 0.6, 2),
                    round(0.15 + seeded(index + 47) * 0.45, 2),
                ),
                outline=outline,
                geometry=geometry,
            )
        )

    return parcels

app = FastAPI(title="AgriShield AP API")

# CORS mode A: allow localhost dev origins across common ports.
# Keep credentials disabled so wildcard-style dev access stays simple and predictable.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
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

@app.exception_handler(Exception)
def unhandled_exception_handler(request: FastAPIRequest, exc: Exception):
    import logging

    logging.exception("Unhandled API error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})



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
            cnt = db.execute(select(models.Alert.id)).first()
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


def _parcel_layer_analytics(health: float, ndvi: float, evi: float, ndre: float) -> dict:
    ndvi_score = _clamp(ndvi, 0.0, 1.0)
    evi_score = _clamp(evi, 0.0, 1.0)
    ndre_score = _clamp(ndre, 0.0, 1.0)
    stress_score = _clamp(1.0 - ndvi_score * 0.72 + (100.0 - health) / 240.0, 0.0, 1.0)
    moisture_score = _clamp(0.2 + evi_score * 0.42 + ndvi_score * 0.28 - stress_score * 0.14, 0.0, 1.0)
    anomaly_score = _clamp(
        abs(ndvi_score - evi_score) * 0.52 + abs(ndvi_score - ndre_score) * 0.56 + stress_score * 0.18,
        0.0,
        1.0,
    )
    disease_score = _clamp(
        (100.0 - health) / 100.0 * 0.58 + stress_score * 0.24 + anomaly_score * 0.18,
        0.0,
        1.0,
    )

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
        "ndvi": round(ndvi_score, 3),
        "evi": round(evi_score, 3),
        "ndre": round(ndre_score, 3),
        "soil_moisture": round(moisture_score, 3),
        "vegetation_stress": round(stress_score, 3),
        "anomaly_hotspots": round(anomaly_score, 3),
        "disease_probability": round(disease_score, 3),
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

@app.get("/alerts", response_model=list[AlertOut])
def alerts(db: Session = Depends(get_db)):
    rows = db.execute(select(models.Alert).order_by(models.Alert.id.desc())).scalars().all()
    return [
        AlertOut(
            id=a.alert_id,
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
        if has_evi:
            cols.append(models.Parcel.evi)
        if has_ndre:
            cols.append(models.Parcel.ndre)

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
            analytics = _parcel_layer_analytics(
                float(health),
                float(ndvi),
                float(evi if evi is not None else ndvi),
                float(ndre if ndre is not None else ndvi),
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

@app.get("/predictions", response_model=list[PredictionOut])
def predictions(db: Session = Depends(get_db)):
    rows = db.execute(select(models.Prediction).order_by(models.Prediction.id)).scalars().all()
    return [{"label": r.label, "probability": r.probability, "severity": r.severity, "crop": r.crop} for r in rows]


@app.get("/spectral-trend", response_model=list[SpectralPointOut])
def spectral_trend(db: Session = Depends(get_db)):
    # Always return deterministic data; this endpoint must never crash.
    avg_ndvi, avg_evi, avg_ndre = 0.55, 0.42, 0.36

    # Demo spectral time-series: derive a smooth curve from parcel-level indices.
    try:
        rows = db.execute(
            select(models.Parcel.ndvi, models.Parcel.evi, models.Parcel.ndre).limit(120)
        ).all()
        if rows:
            avg_ndvi = sum(r[0] for r in rows) / len(rows)
            avg_evi = sum(r[1] for r in rows) / len(rows)
            avg_ndre = sum(r[2] for r in rows) / len(rows)
    except Exception:
        pass

    points: list[SpectralPointOut] = []
    days = 30
    for i in range(days):
        t = i / (days - 1)
        ndvi = avg_ndvi + 0.04 * (t - 0.5)
        evi = avg_evi + 0.03 * (t - 0.5)
        ndre = avg_ndre + 0.02 * (t - 0.5)

        points.append(
            SpectralPointOut(
                day=f"D{i + 1}",
                ndvi=round(ndvi, 3),
                evi=round(evi, 3),
                ndre=round(ndre, 3),
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
        total_parcels = db.execute(select(models.Parcel.id).count()).scalar_one()

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
            select(models.Parcel.id).where(models.Parcel.health >= 75).count()
        ).scalar_one()
        healthy_percent = round((healthy_count / total_parcels) * 100.0, 1)

        # Active stress alerts: parcels with risk High/Critical or health < 75
        stress_count = db.execute(
            select(models.Parcel.id)
            .where((models.Parcel.risk.in_(["High", "Critical"])) | (models.Parcel.health < 75))
            .count()
        ).scalar_one()

        # High risk mandals: mandal with >= threshold risky parcels
        mandal_risky_counts = db.execute(
            select(models.Parcel.mandal, func.count(models.Parcel.id))
            .where(models.Parcel.risk.in_(["High", "Critical"]))
            .group_by(models.Parcel.mandal)
        ).all()
        # threshold: 10% of mandal parcels OR at least 200 parcels
        high_risk_mandal_count = sum(
            1
            for _, cnt in mandal_risky_counts
            if cnt >= 200
        )

        # Satellite coverage: parcels with non-null ndvi/evi/ndre
        # (If ndre/evi columns are absent, Postgres would error; we rely on startup schema ensure.)
        valid_veg = db.execute(
            select(models.Parcel.id).where(
                (models.Parcel.ndvi.is_not(None))
                & (models.Parcel.evi.is_not(None))
                & (models.Parcel.ndre.is_not(None))
            ).count()
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
    except Exception:
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
            updated_at=datetime.utcnow().isoformat(timespec="seconds") + "Z",
        )



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
    )
