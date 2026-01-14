# Seat Allocation System - Definitive Modular Architecture

This document provides the authoritative overview of the modernized Seat Allocation System, detailing its modular multi-layered architecture, data flow, and core services.

## 🏗️ System Architecture
The application has transitioned from a monolithic `app_legacy.py` to a highly decoupled modular structure within the `algo/` package, promoting separation of concerns and easier maintainability.

### � Project Directory Map
```text
.
├── algo/                    # 🧠 Main Modular Backend
│   ├── api/                 # 📡 Communication Layer
│   │   └── blueprints/      # Modular Flask Routes (sessions, allocations, pdf, etc.)
│   ├── core/                # ⚡ Business Logic Layer
│   │   ├── algorithm/       # Core Seating Optimization Algorithm (seating.py)
│   │   ├── cache/           # Hybrid L1 Cache Manager (Session Isolated)
│   │   └── models/          # Shared Data Structures (Seat, PaperSet)
│   ├── database/            # 🗄️ Persistence Layer
│   │   ├── queries/         # Encapsulated SQL logic (UserQueries, etc.)
│   │   ├── db.py            # SQLite Connection Management
│   │   └── schema.py        # Database Initialization & Schema Definition
│   ├── config/              # ⚙️ Environment Configuration
│   ├── cache/               # 💾 JSON Cache Repository (PLAN-XXXX.json)
│   ├── pdf_gen/             # 📄 PDF Generation Engine (L2 Library)
│   ├── attendence_gen/      # 📝 Attendance Sheet Service
│   ├── old_files/           # 🕰️ Legacy Reference Code
│   ├── app.py               # 🚀 Main Entry Point (Port 5000)
│   └── main.py              # 🏭 Flask App Factory System
├── Frontend/                # 💻 React User Interface (Port 3000)
└── demo.db                  # 📊 Main SQLite Data Store
```

## 🛠️ Core Services & Features

### 1. Advanced Hybrid Caching (Dual Layer)
Designed for sub-second repeat responses:
- **L1 (Data Layer)**: Located in `algo/core/cache/`. Manages JSON seating snapshots.
    - **Active Session Sync**: Hybrid cache hits from external plans are automatically "imported" into the active session's Plan ID file to ensure strict data isolation.
- **L2 (File Layer)**: In `pdf_gen/`. Caches identical PDF layouts using content hashing, bypassing the rendering engine entirely for repetitive requests.

### 2. Intelligent Session Management
- **Lifecycle Control**: Handles `start`, `force-new` (expiry), and `finalize` states.
- **State Integrity**: All rooms in a session are stored in a single JSON "Layered" file. "Experimental" rooms are stored during the session and pruned by the `finalize_rooms` engine at the end.
- **Activity Tracking**: Middleware tracks user interaction to manage session timeouts effectively.

### 3. Robust Allocation Engine
- **Algorithm**: `algo/core/algorithm/seating.py` handles complex multi-batch interleaving, broken seat constraints, and paper set assignment.
- **Undo System**: Features a high-reliability fallback system. If the `allocation_history` tracking fails, it automatically calculates the last step using database ID sequences.

### 4. Administrative & Diagnostic Tools
- **Blueprints**: `admin.py` and `dashboard.py` provide deep visibility into database tables and system-wide statistics.
- **Recent Plans**: `plans.py` tracks history with optimized cache searching to avoid log spam.

## 🚦 Operational Guide

### 🚀 Running the Backend
Ensure you are in the `algo/` directory:
```bash
python app.py
```
- Listens on: `http://localhost:5000`
- API Health Check: `GET /api/health`

### 💻 Running the Frontend
Ensure you are in the `Frontend/` directory:
```bash
npm start
```
- Listens on: `http://localhost:3000`

---
*Documentation current as of: 2026-01-14*
