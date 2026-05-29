import json
import random

from sqlalchemy.orm import Session

from . import models


def seed_from_mock(db: Session):
    # Seed only tables that exist in the provided SQL schema.
    crops = ["Paddy", "Cotton", "Maize", "Chilli", "Red Gram"]

    # Users (so locations FK could work later; locations endpoint isn't implemented)
    # DB column `users.role` is a Postgres enum type (roleenum), so always cast on insert.
    from sqlalchemy import text

    db.execute(
        text(
            """
        INSERT INTO users (email, hashed_password, full_name, role, is_active, is_verified)
        VALUES (:email, :hashed_password, :full_name, CAST(:role AS roleenum), :is_active, :is_verified)
        ON CONFLICT (email) DO UPDATE SET
            hashed_password = EXCLUDED.hashed_password,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            is_verified = EXCLUDED.is_verified
        """
        ),
        {
            "email": "demo@agrishield.local",
            "hashed_password": "demo-hash",
            "full_name": "Demo User",
            "role": "admin",
            "is_active": True,
            "is_verified": True,
        },
    )



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

    # Parcels (220)
    AP_BBOX = {"latMin": 13.5, "latMax": 19.1, "lngMin": 77.0, "lngMax": 84.7}

    def seeded(s: int) -> float:
        import math
        x = math.sin(s) * 10000
        return x - math.floor(x)

    districts = ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"]
    farmers = ["Ramesh Reddy", "Lakshmi Devi", "Suresh Naidu", "Kavitha Rao", "Venkat Rao", "Padma Sri", "Krishna Murthy", "Anjali Kumari"]
    mandals = ["Penukonda", "Tadipatri", "Madanapalle", "Tenali", "Gudivada", "Adoni", "Kavali", "Ongole"]

    for i in range(220):
        crop = crops[i % len(crops)]
        lat = AP_BBOX["latMin"] + seeded(i + 1) * (AP_BBOX["latMax"] - AP_BBOX["latMin"])
        lng = AP_BBOX["lngMin"] + seeded(i + 7) * (AP_BBOX["lngMax"] - AP_BBOX["lngMin"])
        health = round(45 + seeded(i + 13) * 50, 1)
        risk = "High" if health < 60 else "Medium" if health < 75 else "Low"
        parcel_id_str = f"AP-{str(i+1).zfill(5)}"

        db.add(
            models.Parcel(
                parcel_id_str=parcel_id_str,
                farmer=farmers[i % len(farmers)],
                district=districts[i % len(districts)],
                mandal=mandals[i % len(mandals)],
                crop=crop,
                acreage=round(0.8 + seeded(i + 23) * 9, 2),
                health=health,
                risk=risk,
                confidence=int(78 + seeded(i + 29) * 21),
                lat=lat,
                lng=lng,
                ndvi=round(0.3 + seeded(i + 37) * 0.5, 2),
                # EVI/NDRE are correlated with biomass/chlorophyll/water status.
                evi=round(0.2 + seeded(i + 41) * 0.6, 2),
                ndre=round(0.15 + seeded(i + 47) * 0.45, 2),
            )

        )

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

    db.commit()


