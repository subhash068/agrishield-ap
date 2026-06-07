import datetime
import uuid

from sqlalchemy import CheckConstraint, DateTime, Float, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

SEVERITIES = ("Low", "Medium", "High", "Critical")
ROLE_ENUM_VALUES = ("super_admin", "admin", "manager", "user", "moderator")
ROLE_ENUM_CHECK = CheckConstraint(f"role IN {ROLE_ENUM_VALUES}", name="users_role_valid")

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    alert_id_str: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    type: Mapped[str] = mapped_column(String(255), nullable=False)
    crop: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    time: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (CheckConstraint(f"severity IN {SEVERITIES}", name="alerts_severity_valid"),)

class Scheme(Base):
    __tablename__ = "schemes"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    desc: Mapped[str] = mapped_column(String(1000), nullable=False)
    tag: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Users(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    __table_args__ = (ROLE_ENUM_CHECK,)

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Stored as Postgres enum roleenum (created by your SQL)
    role: Mapped[str] = mapped_column(String(50), nullable=False)

    is_active: Mapped[bool | None] = mapped_column(nullable=True)
    is_verified: Mapped[bool | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    day: Mapped[str] = mapped_column(String(50), nullable=False)
    rainfall: Mapped[float] = mapped_column(Float, nullable=False)
    temp: Mapped[float] = mapped_column(Float, nullable=False)
    humidity: Mapped[int] = mapped_column(Integer, nullable=False)
    drought: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class Parcel(Base):
    __tablename__ = "parcels"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    parcel_id_str: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    farmer: Mapped[str] = mapped_column(String(255), nullable=False)
    district: Mapped[str] = mapped_column(String(255), nullable=False)
    mandal: Mapped[str] = mapped_column(String(255), nullable=False)
    crop: Mapped[str] = mapped_column(String(100), nullable=False)
    acreage: Mapped[float] = mapped_column(Float, nullable=False)
    health: Mapped[float] = mapped_column(Float, nullable=False)
    risk: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)

    # Satellite vegetation indices derived from crop reflectance bands
    ndvi: Mapped[float] = mapped_column(Float, nullable=False)
    evi: Mapped[float] = mapped_column(Float, nullable=False)
    ndre: Mapped[float] = mapped_column(Float, nullable=False)
    savi: Mapped[float] = mapped_column(Float, nullable=False)


# PostGIS geometry(Point,4326)
    # Requires geoalchemy2 for real geometry typing; left as None to keep schema lightweight.
    geom = None

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    label: Mapped[str] = mapped_column(String(255), nullable=False)
    probability: Mapped[int] = mapped_column(Integer, nullable=False)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    crop: Mapped[str] = mapped_column(String(100), nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (CheckConstraint(f"severity IN {SEVERITIES}", name="predictions_severity_valid"),)


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)

    geom = None  # populated if geoalchemy2 is installed

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class DiseaseDetection(Base):
    __tablename__ = "disease_detections"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)

    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)

    model: Mapped[str] = mapped_column(String(255), nullable=False)

    # Store top-k scores as JSON text to avoid extra tables.
    top_k_json: Mapped[str] = mapped_column(String, nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (CheckConstraint(f"severity IN {SEVERITIES}", name="disease_detections_severity_valid"),)


class FertilizerRecommendation(Base):
    __tablename__ = "fertilizer_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    crop_name: Mapped[str] = mapped_column(String(100), nullable=False)
    disease_name: Mapped[str] = mapped_column(String(255), nullable=False)
    recommended_fertilizer: Mapped[str] = mapped_column(String(255), nullable=False)
    fertilizer_type: Mapped[str] = mapped_column(String(100), nullable=False)
    npk_ratio: Mapped[str] = mapped_column(String(50), nullable=False)
    dosage_per_acre_kg: Mapped[float] = mapped_column(Float, nullable=False)
    application_method: Mapped[str] = mapped_column(String(255), nullable=False)
    application_stage: Mapped[str] = mapped_column(String(255), nullable=False)
    soil_type: Mapped[str] = mapped_column(String(100), nullable=False)
    season: Mapped[str] = mapped_column(String(100), nullable=False)
    expected_recovery_percent: Mapped[float] = mapped_column(Float, nullable=False)
    soil_ph: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

