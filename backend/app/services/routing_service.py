from typing import Dict, Optional
from app.config import DEPARTMENTS

def get_department_by_code(code: str) -> Optional[Dict]:
    for dept in DEPARTMENTS:
        if dept["code"].upper() == code.upper():
            return dept
    return None

DEPARTMENT_KEYWORDS = {
    "GBA": [
        "pothole", "road", "footpath", "manhole", "garbage", "waste", "trash", 
        "bus shelter", "asphalt", "cracked street", "rubble", "debris"
    ],
    "BWSSB": [
        "water", "leak", "sewage", "drain", "drainage", "pipe", "pipeline", 
        "flood", "overflow", "stagnant water", "gutter", "waterlogging"
    ],
    "FIRE": [
        "fire", "smoke", "gas", "flame", "burn", "explosion", "chemical", 
        "cylinder leak", "blaze"
    ],
    "MEDICAL": [
        "accident", "injury", "injured", "blood", "ambulance", "casualty", 
        "crash", "fallen rider", "hit and run"
    ],
    "POLICE": [
        "theft", "stolen", "assault", "fight", "vandalism", "crime", 
        "suspicious", "robbery", "unlawful"
    ],
    "BESCOM": [
        "electric", "pole", "wire", "transformer", "cable", "power", 
        "spark", "short circuit", "street light", "voltage"
    ]
}
