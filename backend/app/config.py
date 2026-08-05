import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = BASE_DIR / "civicintel.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

SECRET_KEY = os.getenv("SECRET_KEY", "civicintel_super_secret_jwt_key_2026_production_grade_998877")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Departments mapping configuration
DEPARTMENTS = [
    {
        "code": "GBA",
        "name": "Urban Infrastructure (GBA)",
        "description": "Potholes, broken roads, footpaths, manhole covers, garbage, bus shelters"
    },
    {
        "code": "BWSSB",
        "name": "Water & Sewerage (BWSSB)",
        "description": "Water leakage, sewage overflow, blocked drains, water logging, pipeline bursts"
    },
    {
        "code": "FIRE",
        "name": "Fire Hazard",
        "description": "Building fire, vehicle fire, gas leakages, smoke, chemical hazards"
    },
    {
        "code": "MEDICAL",
        "name": "Medical / Road Accident",
        "description": "Road accidents, casualties, ambulance emergency, injured persons"
    },
    {
        "code": "POLICE",
        "name": "Public Safety (Police)",
        "description": "Theft, assault, vandalism, public fights, suspicious activities"
    },
    {
        "code": "BESCOM",
        "name": "Electrical Hazard (BESCOM)",
        "description": "Broken electric poles, exposed wires, damaged transformers, broken street lights"
    },
    {
        "code": "UNCLEAR",
        "name": "Unclear / Ignore",
        "description": "Blurry photos, duplicate images, random indoor objects, unrelated photos"
    }
]
