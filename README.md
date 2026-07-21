# DroneRoute AI — Enterprise Autonomous Drone Delivery Platform

> **Production-quality AI web application** simulating autonomous drone delivery route optimization using a custom Genetic Algorithm, A*, Dijkstra, real-time GIS maps, RAG compliance assistant, cybersecurity simulation, and enterprise dark-mode dashboard.

---

## 🛸 Features

- **Custom Genetic Algorithm** (100 pop, 100 gen, tournament selection, two-point crossover, waypoint mutation, 10% elitism)
- **A* Search + Dijkstra** for benchmark comparison
- **Multi-objective fitness**: Distance (30%) + Battery (25%) + Weather (20%) + Risk (15%) + Payload (10%)
- **Interactive Leaflet.js map**: OpenStreetMap, click-to-set, animated drone, route overlay, no-fly zones
- **Physics engine**: Wind vector decomposition, payload drag, altitude climb power
- **No-Fly Zones**: Airports, Military, Government, Hospital, School
- **RAG Regulatory Assistant**: FAA Part 107, DGCA, Avionics Manual Q&A
- **Cybersecurity module**: GPS Spoofing, Fake Weather, Sensor Failure, Signal Jamming simulation
- **Recharts visualizations**: GA fitness evolution, battery drain, radar comparison
- **Export**: JSON, CSV, HTML/PDF mission report
- **FastAPI + SQLAlchemy** backend with SQLite (upgradeable to PostgreSQL)
- **Dark Glassmorphism UI** with Framer Motion animations

---

## 📁 Project Structure

```
Project summer pep/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   ├── genetic_algorithm.py   # Custom GA from scratch
│   │   │   ├── pathfinding.py         # A* + Dijkstra
│   │   │   ├── physics.py             # Aerodynamics + terrain
│   │   │   ├── explanation.py         # AI reasoning engine
│   │   │   ├── rag_engine.py          # Regulatory knowledge retrieval
│   │   │   └── cybersecurity.py       # Attack simulation & defense
│   │   ├── api/endpoints/
│   │   │   ├── optimize.py            # POST /api/v1/optimize
│   │   │   ├── weather.py             # GET  /api/v1/weather
│   │   │   ├── rag.py                 # POST /api/v1/rag/query
│   │   │   ├── security.py            # POST /api/v1/security/simulate
│   │   │   └── export.py              # POST /api/v1/export
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── domain.py              # Pydantic models
│   │   │   └── db_models.py           # SQLAlchemy ORM
│   │   └── main.py                    # FastAPI entrypoint
│   ├── tests/
│   │   ├── test_physics.py
│   │   ├── test_ga.py
│   │   └── test_api.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── DeliveryForm.tsx       # Mission configuration panel
│   │   │   ├── MapView.tsx            # Leaflet.js interactive map
│   │   │   ├── TelemetryDashboard.tsx # Live stat cards
│   │   │   ├── GAVisualizer.tsx       # Evolution Recharts
│   │   │   ├── AlgorithmComparison.tsx# Radar + comparison table
│   │   │   ├── AIExplanationPanel.tsx # Route rationale
│   │   │   ├── RAGAssistant.tsx       # Chat modal
│   │   │   ├── CyberSecurityPanel.tsx # Attack simulation
│   │   │   ├── ReportExporter.tsx     # Export modal
│   │   │   └── StatusBar.tsx
│   │   ├── services/api.ts
│   │   ├── types/index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs** for the interactive Swagger API documentation.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

### 3. Docker (Full Stack)

```bash
docker compose up --build
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/optimize` | Run GA + A* + Dijkstra route optimization |
| `GET`  | `/api/v1/weather` | Get weather telemetry (simulated or live) |
| `POST` | `/api/v1/rag/query` | RAG regulatory assistant query |
| `POST` | `/api/v1/security/simulate` | Cyber attack simulation |
| `POST` | `/api/v1/export` | Export mission report (JSON/CSV/HTML) |

---

## 🧬 Genetic Algorithm Details

| Parameter | Value |
|-----------|-------|
| Population Size | 100 chromosomes |
| Max Generations | 100 |
| Selection | Tournament (k=5) |
| Crossover | Two-Point |
| Mutation | Random Waypoint Gaussian Shift |
| Elitism | Top 10% |
| Fitness Function | 0.30·Dist + 0.25·Battery + 0.20·Weather + 0.15·Risk + 0.10·Payload |

---

## 🔐 Cybersecurity Vectors

- **GPS Spoofing** → Switch to INS + Optical Flow
- **Fake Weather Data** → Cross-check METAR radar station
- **Sensor Failure** → Hot-swap redundant IMU bank
- **Signal Jamming** → Autonomous RTH protocol

---

## 🧪 Run Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

---

## 🌐 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Animations | Framer Motion |
| Map | Leaflet.js + OpenStreetMap |
| Charts | Recharts |
| Backend | FastAPI, Python 3.11+ |
| AI/ML | Custom GA, A*, Dijkstra (from scratch) |
| Database | SQLAlchemy + SQLite / PostgreSQL |
| Deploy | Docker + Docker Compose |
