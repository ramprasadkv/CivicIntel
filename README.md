# CivicIntel – AI-Assisted Civic Issue Reporting & Verification System

[![GitHub Repo](https://img.shields.io/badge/GitHub-CivicIntel-blue?style=flat&logo=github)](https://github.com/ramprasadkv/CivicIntel)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 Overview

**CivicIntel** is an AI-powered civic issue reporting and verification system designed to **automate complaint classification** and make civic services accessible to everyone, including non-technical users and elderly citizens.

The platform provides a **single, unified portal** that automatically routes reported complaints to the relevant government department based on AI vision analysis of evidence photos—removing the need for citizens to navigate multiple complex municipal websites.

---

## ❗ Problem Statement

Existing civic complaint platforms face severe real-world challenges:
* Citizens are forced to navigate multiple websites/apps for different departments, causing confusion and low adoption.
* High volume of fake, duplicate, or non-serious reports wasting government resources.
* Wrong department routing leading to delayed emergency response.
* Lack of accountability and verification in complaint submissions.
* Manual workload overload on municipal officers.

---

## 💡 Solution

CivicIntel introduces a **trust-first, automated, and human-in-the-loop approach**:

1. **2-Click Reporting**: Citizens upload image evidence + GPS location. No manual department selection required.
2. **AI Vision Classification**: Google Gemini 1.5/2.5 Flash Vision VLM and Computer Vision classify the issue into exact municipal departments (**GBA**, **BWSSB**, **FIRE**, **MEDICAL**, **POLICE**, **BESCOM**, **UNCLEAR**).
3. **Official Human Call-back Verification**: Department officers attempt up to 3 call verification checks before initiating field action.
4. **Anti-Abuse Policy Engine**: Confirmed fake reports trigger automatic user strike transitions (**Trusted** → **Warning** → **Final Warning** → **Blacklisted**).

---

## ⭐ Key Features

* **AI Image Classification & Auto-Routing**:
  * **Urban Infrastructure (GBA)**: Potholes, broken roads, footpaths, missing manholes, garbage accumulation, damaged bus shelters.
  * **Water & Sewerage (BWSSB)**: Water leakage, sewage overflow, blocked drains, water logging, pipeline bursts.
  * **Fire Hazard**: Building fire, vehicle fire, gas leakages, smoke, chemical fires.
  * **Medical / Road Accident**: Road accidents, casualties, ambulance emergency, injured persons.
  * **Public Safety (Police)**: Theft, assault, vandalism, public fights, suspicious activities.
  * **Electrical Hazard (BESCOM)**: Broken electric poles, exposed wires, damaged transformers, broken street lights.
  * **Unclear / Ignore**: Blurry photos, dark photos, indoor selfies, random unidentifiable objects.
* **Content Safety & Moderation Filter**: Text moderation algorithm protects description fields from abusive language, threats, and spam.
* **Interactive Location Picker**: Automatic browser GPS detection paired with an interactive Leaflet.js map pin picker.
* **3-Tier Verification & Call Logger**: Officers record call attempts (1, 2, 3) and update verification statuses (`PENDING_VERIFICATION`, `SITE_VISIT_REQUIRED`, `VERIFIED`, `FAKE_REPORT`, `RESOLVED`).
* **Live System Admin Dashboard**: Real-time SQLite database analytics with Chart.js visualization (Doughnut status distribution + Bar chart departmental workload) and blacklisted user audit controls.

---

## 🛠️ Technology Stack

* **Backend**: Python 3.11, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic v2
* **Database**: SQLite (SQLAlchemy ORM - schema future-ready for PostgreSQL)
* **AI & Vision Engine**:
  * **VLM**: Google Gemini Flash Vision VLM (`google-generativeai`)
  * **Computer Vision**: OpenCV (`cv2`), Pillow (`PIL`), NumPy
  * **Text Moderation Engine**: Anti-abuse & content safety detector
* **Frontend**:
  * HTML5, Vanilla CSS3 (Custom Glassmorphism Dark Theme Design System)
  * Vanilla JavaScript (ES6+ Modules, async/await)
  * Chart.js (Live Analytics Charts)
  * Leaflet.js (Interactive Location Map Picker)
  * FontAwesome 6 Icons & Google Fonts (Outfit & Inter)
* **Security**: JWT Authentication (PyJWT/JOSE + bcrypt password hashing)

---

## 📁 Repository & System Architecture

```
CivicIntel/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app initialization, CORS, static mounts & compatibility routes
│   │   ├── config.py              # Environment settings & department configurations
│   │   ├── database.py            # SQLAlchemy engine & SessionLocal session maker
│   │   ├── models.py              # User, Department, Report, VerificationLog, StatusHistory, Notification
│   │   ├── schemas.py             # Pydantic request & response validation schemas
│   │   ├── auth.py                # JWT authentication & password hashing
│   │   ├── services/
│   │   │   ├── ai_service.py      # Gemini Flash VLM API & OpenCV computer vision feature engine
│   │   │   ├── moderation.py      # Text content safety & abuse filter
│   │   │   └── routing_service.py # Department lookup & keyword engine
│   │   └── routers/
│   │       ├── auth_router.py     # Login, Register, Profile APIs
│   │       ├── citizen_router.py  # Image analysis preview, report submission, tracking, history
│   │       ├── dept_router.py     # Officer queue, call logging (1..3), status transitions
│   │       └── admin_router.py    # Analytics stats, Chart.js metrics, user blacklist controls
│   ├── seed.py                    # Pre-populates departments, demo users & sample complaints
│   └── uploads/                   # Media directory for report evidence images
├── frontend/
│   ├── index.html                 # Main single-page application entry point
│   ├── css/
│   │   └── style.css              # Custom Glassmorphism dark theme stylesheet
│   ├── js/
│   │   ├── config.js              # API configuration & toast notification manager
│   │   ├── auth.js                # JWT session manager & quick demo switchers
│   │   ├── citizen.js             # Upload dropzone, GPS/Map picker, AI preview, tracking
│   │   ├── officer.js             # Officer queue, call logger & status transitions
│   │   ├── admin.js               # Admin KPI counters & Chart.js rendering
│   │   └── app.js                 # Global application initialization & event router
├── requirements.txt               # Backend Python package dependencies
└── README.md                      # Complete system documentation
```

---

## 🚀 Quick Start Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/ramprasadkv/CivicIntel.git
cd CivicIntel/backend
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Seed Database
Execute the database seed script to initialize tables, departments, demo accounts, and sample reports:
```bash
python seed.py
```

### 4. Launch the Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open your browser and navigate to:
👉 **`http://localhost:8000`**

---

## 🔑 Pre-Configured Demo Credentials

Use the **Quick Switch bar** at the top of the app or log in with these credentials:

| Role | Mobile Number | Password | Description / Department |
| :--- | :--- | :--- | :--- |
| **System Admin** | `9999999999` | `admin123` | Full DB analytics & user blacklist controls |
| **GBA Officer** | `9111111111` | `officer123` | Urban Infrastructure Queue |
| **BWSSB Officer**| `9222222222` | `officer123` | Water & Sewerage Queue |
| **Citizen (Trusted)** | `9876543210` | `password123` | Rajesh Kumar (0 strikes) |
| **Citizen (Warning)** | `9876543211` | `password123` | Anand Verma (1 strike) |
| **Citizen (Blacklisted)** | `9876543212` | `password123` | Suresh Spammer (3 strikes - submission blocked) |

---

## 👤 Author

**Ramprasad K V**  
*GitHub*: [@ramprasadkv](https://github.com/ramprasadkv)
