# 🛡️ AgriShield: Crop Health Surveillance & Automated Alerts System (CHSS)

[![Vercel Deployment](https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Hugging Face](https://img.shields.io/badge/AI%20Model-Hugging%20Face-yellow?logo=huggingface&logoColor=black)](https://huggingface.co)

AgriShield is an AI-powered proactive crop health monitoring and pest/disease management platform designed for the **Agriculture Department, Government of Andhra Pradesh**. 

By integrating weekly high-resolution satellite imagery analysis with edge-enabled smartphone photo analytics, AgriShield establishes a closed-loop, parcel-level monitoring and crop protection system across Rythu Seva Kendras (RSKs) and the APRTGS (Andhra Pradesh Real Time Governance Society).

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
1. **Crop Gating**: Validates user inputs. Checks whether the AI-predicted crop class matches the user-provided crop type.
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
│   ├── components/           # UI Component Library (shadcn-based)
│   ├── routes/               # Page Route Definitions (Satellite, Scan, RSK Dashboard)
│   └── main.tsx              # Application entrypoint
├── backend/
│   └── fastapi/              # Python FastAPI + SQLAlchemy Server
│       ├── app/
│       │   ├── main.py       # API router, disease detection gates, & UCHI computation
│       │   ├── models.py     # Database schema (PostgreSQL)
│       │   └── seed.py       # Auto-seeding script (ICRISAT and crop datasets)
│       ├── scripts/          # Fine-tuning and export scripts
│       └── requirements.txt  # Python requirements
├── vite.config.ts            # Vite & TanStack Start build configuration
└── vercel.json               # Vercel deployment specifications
```

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
   POSTGRES_DSN=postgresql+psycopg://postgresql:postgres@localhost:5432/agrishield
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
| **GET** | `/dashboard-data` | RSK & APRTGS district-wide telemetry overview |
| **GET** | `/parcels` | GIS parcel geometries, historical NDVI, and current UCHI |
| **GET** | `/alerts` | Fused active alert log filtered by severity |
| **POST** | `/disease/detect` | Multi-part form-data field photo upload for computer vision diagnosis |
| **GET** | `/spectral-trend` | Spatial timeseries query for custom crop fields |
