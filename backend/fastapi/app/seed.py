import json
import random

from sqlalchemy.orm import Session

from . import models


def seed_from_mock(db: Session):
    # Clear existing tables to prevent duplicates
    db.query(models.Scheme).delete()
    db.query(models.Alert).delete()
    db.query(models.WeatherForecast).delete()
    db.query(models.Parcel).delete()
    db.query(models.Prediction).delete()
    db.query(models.FertilizerRecommendation).delete()
    db.commit()

    # Seed only tables that exist in the provided SQL schema.
    crops = ["Paddy", "Cotton", "Maize", "Chilli", "Red Gram"]

    # Users (so locations FK could work later; locations endpoint isn't implemented)
    # Users seeding removed because locations FK isn't implemented and id is missing a default, causing transaction aborts.

    # Schemes
    schemes = [
        {"title": "YSR Rythu Bharosa", "desc": "₹13,500 annual input assistance to eligible farmer families.", "tag": "Active"},
        {"title": "Free Crop Insurance (PMFBY)", "desc": "Premium fully subsidised by state for notified crops.", "tag": "Open"},
        {"title": "Dr. YSR Free Borewell Scheme", "desc": "Free borewell + power for small & marginal farmers.", "tag": "Active"},
        {"title": "AP Micro Irrigation Project", "desc": "90% subsidy on drip/sprinkler systems.", "tag": "Open"},
    ]
    for s in schemes:
        db.add(models.Scheme(**s))

    # Alerts
    alerts = [
        {"alert_id_str": "ALT-9341", "type": "Pest Outbreak", "crop": "Cotton", "district": "Guntur", "severity": "Critical", "time": "12 min ago", "action": "Spray recommendation issued to 1,204 farmers"},
        {"alert_id_str": "ALT-9340", "type": "Drought Risk", "crop": "Paddy", "district": "Anantapur", "severity": "High", "time": "38 min ago", "action": "Irrigation advisory broadcast to RSKs"},
        {"alert_id_str": "ALT-9339", "type": "Disease Spread", "crop": "Chilli", "district": "Krishna", "severity": "Medium", "time": "1 hr ago", "action": "Field inspection scheduled"},
        {"alert_id_str": "ALT-9338", "type": "Nutrient Stress", "crop": "Maize", "district": "Kurnool", "severity": "Medium", "time": "2 hr ago", "action": "Fertilizer schedule updated"},
        {"alert_id_str": "ALT-9337", "type": "Cyclone Watch", "crop": "Paddy", "district": "Nellore", "severity": "High", "time": "3 hr ago", "action": "Pre-harvest advisory sent"},
        {"alert_id_str": "ALT-9336", "type": "Pest Outbreak", "crop": "Red Gram", "district": "Prakasam", "severity": "High", "time": "4 hr ago", "action": "Bio-control deployment in 12 mandals"},
    ]
    for a in alerts:
        db.add(models.Alert(**a))

    # Weather forecasts (14 days)
    for i in range(14):
        db.add(
            models.WeatherForecast(
                day=f"Day {i+1}",
                rainfall=round(random.random() * 28, 1),
                temp=round(26 + random.random() * 10, 1),
                humidity=random.randint(50, 89),
                drought=float(round(random.random() * 100, 1)),
            )
        )

    # Parcels (1200 from CSV or fallback to mock)
    import os
    import csv

    # __file__ is app/seed.py
    # dirname(__file__) is app/
    # dirname(dirname(__file__)) is fastapi/
    # dirname(dirname(dirname(__file__))) is backend/
    # dirname(dirname(dirname(dirname(__file__)))) is agrishield-ap/
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data", "west_godavari_parcels_1200.csv")
    
    if os.path.exists(csv_path):
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ndvi = float(row.get("ndvi", 0))
                db.add(
                    models.Parcel(
                        parcel_id_str=row["parcel_id_str"],
                        farmer=row["farmer"],
                        district=row["district"],
                        mandal=row["mandal"],
                        crop=row["crop"],
                        acreage=float(row["acreage"]),
                        health=float(row["health"]),
                        risk=row["risk"],
                        confidence=int(row["confidence"]),
                        lat=float(row["lat"]),
                        lng=float(row["lng"]),
                        ndvi=ndvi,
                        evi=float(row.get("evi", ndvi)),
                        ndre=float(row.get("ndre", ndvi)),
                        savi=float(row.get("savi", ndvi - 0.15)),
                    )
                )
    else:
        pass # mock logic removed

    # Predictions
    predictions = [
        {"label": "Pest Outbreak (14d)", "probability": 72, "severity": "High", "crop": "Cotton"},
        {"label": "Drought Risk (30d)", "probability": 58, "severity": "Medium", "crop": "Paddy"},
        {"label": "Disease Spread (7d)", "probability": 81, "severity": "Critical", "crop": "Chilli"},
        {"label": "Yield Loss Projection", "probability": 34, "severity": "Low", "crop": "Maize"},
        {"label": "Irrigation Demand Surge", "probability": 67, "severity": "High", "crop": "Red Gram"},
    ]
    for p in predictions:
        db.add(models.Prediction(**p))

    # Seed Fertilizer Recommendations
    fert_csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "public", "data", "AI_Crop_Disease_Fertilizer_Dataset.csv")
    if os.path.exists(fert_csv_path):
        with open(fert_csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db.add(
                    models.FertilizerRecommendation(
                        crop_name=row.get("crop_name", ""),
                        disease_name=row.get("disease_name", ""),
                        recommended_fertilizer=row.get("recommended_fertilizer", ""),
                        fertilizer_type=row.get("fertilizer_type", ""),
                        npk_ratio=row.get("npk_ratio", ""),
                        dosage_per_acre_kg=float(row.get("dosage_per_acre_kg", 0)),
                        application_method=row.get("application_method", ""),
                        application_stage=row.get("application_stage", ""),
                        soil_type=row.get("soil_type", ""),
                        season=row.get("season", ""),
                        expected_recovery_percent=float(row.get("expected_recovery_percent", 0)),
                        soil_ph=float(row.get("soil_ph", 0))
                    )
                )

    db.commit()
