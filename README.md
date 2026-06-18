# 🛡️ AgriShield: Crop Health Surveillance & Automated Alerts System (CHSS)

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Hugging Face](https://img.shields.io/badge/AI%20Model-Hugging%20Face-yellow?logo=huggingface&logoColor=black)](https://huggingface.co)
[![PostGIS](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20PostGIS-336791?logo=postgresql&logoColor=white)](https://postgis.net/)

AgriShield is an enterprise-grade, AI-powered proactive crop health monitoring and pest/disease management platform designed for the **Agriculture Department, Government of Andhra Pradesh**. 

By integrating weekly high-resolution satellite imagery analysis with edge-enabled smartphone photo analytics, AgriShield establishes a closed-loop, parcel-level monitoring and crop protection system across Rythu Seva Kendras (RSKs) and the APRTGS (Andhra Pradesh Real Time Governance Society).

---

## 📸 Screenshots

| Executive Portal (Home) | Satellite Analysis Map |
| :---: | :---: |
| ![Executive Portal](./public/screenshots/home.png) | ![Satellite Analysis](./public/screenshots/satellite.png) |
| **Surveillance Dashboard** | **Government/RSK Dashboard** |
| ![Surveillance Dashboard](./public/screenshots/surveillance.png) | ![Government/RSK Dashboard](./public/screenshots/government.png) |

---

## 🗺️ System Architecture

```mermaid
graph TD
    A[Planet 3m & Sentinel-2 Imagery] -->|Spectral Indices| B[Unified Crop Health Index - UCHI]
    C[Farmer Uploaded Field Photos] -->|Mobile App / API| D[Hugging Face CV Model + Crop Gate]
    B -->|Satellite Confidences & Anomalies| E[Satellite-Ground Fusion Layer]
    D -->|Photo Confidence & Disease Outputs| E
    E -->|Fused Risk Assessment| F[Actionable Advisory Engine]
    F -->|SMS / Mobile Alerts| G[Farmers & RSK Staff]
    F -->|Mandal/District Metrics| H[APRTGS Surveillance Reports]
    F -->|Support Centers DB| I[Rythu Seva Kendras Dashboard]
    
    style A fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style C fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style E fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style F fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

### 🛰️ 1. Satellite & Spectral Analytics (UCHI)
Instead of relying on single spectral bands, AgriShield implements a **Unified Crop Health Index (UCHI)** that aggregates multiple remote sensing indices:

$$\text{UCHI} = 0.35 \times \text{NDVI} + 0.25 \times \text{EVI} + 0.25 \times \text{NDRE} + 0.15 \times \text{SAVI}$$

* **NDVI**: Overall vegetation greenness and canopy cover.
* **EVI**: Reductions in soil background noise and atmospheric constraints.
* **NDRE**: Uses Red Edge bands to penetrate canopy layers for early chlorophyll degradation detection.
* **SAVI**: Adjusts for soil brightness during early vegetative stages.

### 🧠 2. Computer Vision & Disease Gateways
Farmers and field agents capture crop anomalies using a mobile interface. The ground validation pipeline utilizes two checks:
1. **Crop Gating**: Validates user inputs. Checks whether the AI-predicted crop class matches the user-provided crop type to filter out irrelevant images.
2. **Disease Classification**: Utilizes a fine-tuned transformer model (`Arko007/nfnet-f1-plant-disease`) returning explicit confidence percentages.
   * **Low Confidence (< 50%)**: Flags diagnostic cards for manual review by RSK Agricultural Officers.
   * **High Confidence (≥ 50%)**: Direct path to target advisories.

### ⚡ 3. Ground-Satellite Data Fusion Matrix
| Satellite Anomaly (UCHI) | Ground Diagnosis (Photo AI) | Fused Alert State | Action / Advisory Target |
| :--- | :--- | :--- | :--- |
| **Stress Detected** | **Disease Identified** | 🔴 **High-Risk Biotic Alert** | Immediate localized pesticide spraying advisory to farmer |
| **Stress Detected** | **Healthy Crop** | 🟡 **Abiotic Stress Alert** | Nutritional (e.g., Nitrogen/Zinc) deficiency or irrigation advisory |
| **Healthy Crop** | **Disease Identified** | 🟠 **Pre-Emptive Alert** | Target containment zone warning to neighboring farms |

---

## 📁 Repository Map

```
agrishield/
├── src/                      # TanStack Start Frontend
│   ├── components/           # UI Component Library (shadcn UI, Radix primitives, Lucide)
│   ├── data/                 # Static mock data & GIS helpers
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Shared utilities (class merger, formatting)
│   ├── routes/               # Page Route Definitions
│   │   ├── farmers/          # Farmer Application Hub (Scan, Dashboard, Alerts, Profile)
│   │   ├── index.tsx         # Executive Portal Home
│   │   ├── satellite.tsx     # High-Resolution GIS Parcel Mapping
│   │   ├── surveillance.tsx  # District Outbreak Surveillance
│   │   ├── government.tsx    # RSK / APRTGS Control Dashboard
│   │   ├── advisory.tsx      # Agronomic bulletins & Pest advice
│   │   └── yield-dashboard.tsx # Crop Production Predictive Yield Engine
│   ├── styles.css            # Global CSS styling system
│   └── main.tsx              # Application entrypoint
├── backend/
│   └── fastapi/              # Python FastAPI Server
│       ├── app/
│       │   ├── main.py       # API router, disease detection gates, & UCHI computation
│       │   ├── models.py     # SQLAlchemy PostgreSQL/PostGIS database schema
│       │   ├── db.py         # Database engine and connection pooling
│       │   ├── config.py     # Pydantic configuration & env loading
│       │   ├── schemas.py    # Pydantic response/request schemas
│       │   ├── seed.py       # Auto-seeding script (ICRISAT and crop datasets)
│       │   └── icrisat_yield.py # Historical yield-rainfall statistical models
│       ├── scripts/          # Fine-tuning and export scripts
│       └── requirements.txt  # Python backend requirements
├── data/                     # CSV datasets (ICRISAT, West Godavari parcels)
├── public/                   # Public assets (balanced disease datasets, GIS boundaries)
├── vite.config.ts            # Vite & TanStack Start build configuration
└── vercel.json               # Vercel deployment specifications
```

---

## 🛠️ Tech Stack & Key Libraries

### Frontend
* **Framework**: React 19, TypeScript
* **Routing**: TanStack Router (Start)
* **Styling**: Vanilla CSS + Tailwind-styled components, Radix UI primitives, Lucide Icons, Framer Motion
* **GIS/Maps**: Leaflet / React-Leaflet with PostGIS GeoJSON endpoints
* **Charts**: Recharts (for NDVI timeseries and crop yield projections)

### Backend
* **Web Framework**: FastAPI (Asynchronous Python)
* **Database**: PostgreSQL with PostGIS extensions
* **ORM**: SQLAlchemy 2.0 (with connection safety fallbacks)
* **Machine Learning**: Hugging Face Transformers (`transformers`), PyTorch, Pillow for heuristic image processing fallback
* **Weather Integration**: Open-Meteo API (Forecast & Historical Archive integration)

---

## 💻 Frontend Development Setup

### Dependencies & Prereqs
* **Bun** (Recommended) or Node.js v18+

### Setup Commands
```bash
# 1. Install dependencies
bun install

# 2. Run the application locally in development mode
bun run dev
```
Open [http://localhost:8080](http://localhost:8080) to view the frontend application.

### Build & Deployment Configuration
The build runs on **TanStack Start** with a **Vercel Serverless** preset.
* Run a local build test:
  ```bash
  bun run build
  ```
* Make sure `cloudflare: false` is maintained in `vite.config.ts` to prevent build collisions with Cloudflare workers.

---

## 🐍 Backend Development Setup

### Setup Commands
1. Navigate to the backend directory:
   ```bash
   cd backend/fastapi
   ```
2. Setup virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # macOS / Linux
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure `.env` file:
   ```env
   POSTGRES_DSN=postgresql+psycopg://postgres:manager@localhost:5432/agrishield
   HF_DISEASE_MODEL_ID=Arko007/nfnet-f1-plant-disease
   HF_DISEASE_TOP_K=5
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 🛰️ Environment Configuration Variables
The backend configures the following environment parameters (defined in [app/config.py](file:///c:/Users/windows-11/Desktop/agrishield/backend/fastapi/app/config.py)):
* `POSTGRES_DSN`: SQLAlchemy target database URL.
* `HF_DISEASE_MODEL_ID`: Pretrained Hugging Face classifier model path.
* `WEATHER_LATITUDE` / `WEATHER_LONGITUDE`: Geographic coordinates for weather forecast fallback.

---

## 📡 API Reference Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/health` | API status and database health check |
| **GET** | `/districts` | Fetches available districts in Andhra Pradesh |
| **GET** | `/dashboard/kpis` | Computes live dashboard KPI indicators from database |
| **GET** | `/parcels` | GIS parcel geometries, historical NDVI, and current UCHI |
| **GET** | `/alerts` | Fused active alert log filtered by severity |
| **POST** | `/alerts` | Creates a new crop alert event manually |
| **GET** | `/schemes` | Returns available government agricultural schemes |
| **GET** | `/weather` | Fetches live 14-day weather forecasts for selected coordinates |
| **GET** | `/weather/history` | Historical archive weather observations |
| **GET** | `/weather/projection-2027` | Climate trend projection based on historical averages |
| **GET** | `/yield/districts-and-crops` | Returns active yield datasets for mapping |
| **GET** | `/yield/history` | Historical yield metrics (area, production, and yield) |
| **POST** | `/yield/predict` | Predicts future yield outputs based on precipitation models |
| **POST** | `/yield/alerts` | Compares predicted yields to historical baselines |
| **GET** | `/predictions` | Fused AI model prediction log |
| **GET** | `/spectral-trend` | Time-series crop index trends |
| **POST** | `/farmers/register` | Registers a farmer parcel and writes to database & CSV |
| **GET** | `/surveillance/data` | Outbreak surveillance stats aggregated by district |
| **POST** | `/disease/detect` | Multi-part form-data field photo upload for computer vision diagnosis |
| **POST** | `/fusion/fuse` | Integrates satellite, ground, and weather indices into unified risk assessments |
| **GET** | `/field-advisory/{fieldId}` | Returns automated agronomic advisories for specific parcels |
| **POST** | `/rsk/alerts/push` | Dispatches critical alerts directly to Rythu Seva Kendra offices |
| **GET** | `/api/map/districts` | GeoJSON endpoint for district boundary rendering |
| **GET** | `/api/map/mandals` | GeoJSON endpoint for mandal boundaries |
| **GET** | `/api/map/villages` | GeoJSON endpoint for village-level polygons |
