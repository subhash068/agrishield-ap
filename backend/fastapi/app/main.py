import json
import random
from fastapi import Depends, FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import SessionLocal, engine
from . import models
from .schemas import (
    AlertOut,
    SchemeOut,
    WeatherForecastPointOut,
    ParcelOut,
    PredictionOut,
    DiseaseDetectionResponseOut,
    SpectralPointOut,
)

from .seed import seed_from_mock

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="AgriShield AP API")

# CORS mode A: allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    # Dev convenience: auto-create tables if they don't exist and seed on first run.
    # Keep /health working even if Postgres is down or has wrong credentials.
    # Keep startup resilient: if DB is misconfigured/unavailable we still want the app (esp. /health) to run.
    try:
        models.Base.metadata.create_all(bind=engine)
    except Exception as e:
        import warnings

        warnings.warn(f"Postgres init skipped during startup (create_all failed) due to error: {e}")
        return

    try:
        db = SessionLocal()
        try:
            cnt = db.execute(select(models.Alert.id)).first()
            if cnt is None:
                seed_from_mock(db)
        finally:
            db.close()
    except Exception as e:
        import warnings

        warnings.warn(f"Postgres init skipped during startup (seed failed) due to error: {e}")



@app.get("/health")
def health():
    return {"ok": True}


@app.get("/districts")
def districts(db: Session = Depends(get_db)):
    # Districts are represented as distinct values within Parcel data.
    rows = db.execute(select(models.Parcel.district).distinct().order_by(models.Parcel.district)).scalars().all()
    return [r for r in rows]

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

@app.get("/schemes", response_model=list[SchemeOut])
def schemes(db: Session = Depends(get_db)):
    rows = db.execute(select(models.Scheme).order_by(models.Scheme.id)).scalars().all()
    return [SchemeOut(title=s.title, desc=s.desc, tag=s.tag) for s in rows]

@app.get("/parcels", response_model=list[ParcelOut])
def parcels(db: Session = Depends(get_db)):
    rows = db.execute(select(models.Parcel).order_by(models.Parcel.id)).scalars().all()
    return [
        ParcelOut(
            id=p.parcel_id,
            farmer=p.farmer,
            district=p.district,
            mandal=p.mandal,
            crop=p.crop,
            acreage=p.acreage,
            health=p.health,
            risk=p.risk,
            confidence=p.confidence,
            lat=p.lat,
            lng=p.lng,
            ndvi=p.ndvi,
            evi=p.evi,
            ndre=p.ndre,
        )
        for p in rows
    ]

@app.get("/weather", response_model=list[WeatherForecastPointOut])
def weather(db: Session = Depends(get_db)):
    rows = db.execute(select(models.WeatherForecast).order_by(models.WeatherForecast.id)).scalars().all()
    return [{"day": r.day, "rainfall": r.rainfall, "temp": r.temp, "humidity": r.humidity, "drought": r.drought} for r in rows]

@app.get("/predictions", response_model=list[PredictionOut])
def predictions(db: Session = Depends(get_db)):
    rows = db.execute(select(models.Prediction).order_by(models.Prediction.id)).scalars().all()
    return [{"label": r.label, "probability": r.probability, "severity": r.severity, "crop": r.crop} for r in rows]


@app.get("/spectral-trend", response_model=list[SpectralPointOut])
def spectral_trend(db: Session = Depends(get_db)):
    import inspect

    # Always return deterministic data; this endpoint must never crash.

    # Demo spectral time-series: derive a smooth curve from parcel-level indices.
    # If Postgres isn't reachable, fall back to deterministic mock values.
    avg_ndvi, avg_evi, avg_ndre = 0.55, 0.42, 0.36
    # Keep this endpoint robust by catching all DB-related errors.
    try:
        rows = db.execute(

            select(models.Parcel.ndvi, models.Parcel.evi, models.Parcel.ndre).limit(120)
        ).all()
        if rows:
            avg_ndvi = sum(r[0] for r in rows) / len(rows)
            avg_evi = sum(r[1] for r in rows) / len(rows)
            avg_ndre = sum(r[2] for r in rows) / len(rows)
    except Exception:
        # fall back to deterministic defaults
        pass

    points: list[SpectralPointOut] = []

    days = 30
    for i in range(days):
        t = i / (days - 1)
        # Create gentle variability (deterministic)
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


@app.post("/disease/detect", response_model=DiseaseDetectionResponseOut)
async def disease_detect(file: UploadFile = File(...), db: Session = Depends(get_db)):

    # Mock inference (replace later with real ML). Also stores the scan result.
    labels = [
        ("Paddy Blast", "High"),
        ("Cotton Bollworm", "Critical"),
        ("Chilli Leaf Curl", "Medium"),
        ("Maize Fall Armyworm", "High"),
        ("Red Gram Wilt", "Medium"),
    ]

    pick_label, pick_sev = random.choice(labels)
    confidence = random.randint(78, 97)
    model = "HF Plant Classifier"

    top_k = []
    for i, (lab, _) in enumerate(labels):
        score = max(0.01, 1 - i * 0.18 - random.random() * 0.08)
        top_k.append({"label": lab, "score": round(score, 4)})

    det = models.DiseaseDetection(
        filename=file.filename,
        label=pick_label,
        severity=pick_sev,
        confidence=confidence,
        model=model,
        top_k_json=json.dumps(top_k),
    )
    db.add(det)
    db.commit()

    return DiseaseDetectionResponseOut(
        label=pick_label,
        severity=pick_sev,
        confidence=confidence,
        model=model,
        top_k=top_k,
    )