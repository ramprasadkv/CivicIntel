from typing import Dict, Optional, Tuple

from app.config import DEPARTMENTS

def get_department_by_code(code: str) -> Optional[Dict]:
    if not code:
        return None
    for dept in DEPARTMENTS:
        if dept["code"].upper() == code.upper():
            return dept
    return None

# Master Taxonomy mapping issue keywords -> (Primary Dept, Sub-Category, Linked Foreign Dept Code)
LINKED_DEPARTMENT_MATRIX = {
    # Medical & Accidents Linked Issues
    "road accident with injury": ("MEDICAL", "Road Accidents", "POLICE"),
    "road accident with fatality": ("MEDICAL", "Road Accidents", "POLICE"),
    "hit-and-run accident": ("POLICE", "Theft & Property Crime", "MEDICAL"),
    "accident causing road blockage": ("MEDICAL", "Road Accidents", "GBA"),
    "accident involving fire": ("FIRE", "Fire Incidents", "MEDICAL"),
    "accident involving fuel/chemical leakage": ("FIRE", "Rescue / Emergency", "MEDICAL"),
    "person injured in public place": ("MEDICAL", "Medical Emergency", "POLICE"),
    "unconscious person in public place": ("MEDICAL", "Medical Emergency", "POLICE"),
    "building collapse with injuries": ("FIRE", "Rescue / Emergency", "MEDICAL"),
    "building collapse": ("FIRE", "Rescue / Emergency", "GBA"),
    "fire in building with injuries": ("FIRE", "Fire Incidents", "MEDICAL"),
    "fire in public building": ("FIRE", "Fire Incidents", "GBA"),

    # Electrical Linked Issues
    "electrical fire": ("BESCOM", "Critical Electrical Hazards", "FIRE"),
    "transformer fire": ("BESCOM", "Transformer", "FIRE"),
    "electrical explosion": ("BESCOM", "Transformer", "FIRE"),
    "fallen live electrical wire on road": ("BESCOM", "Electrical Wires", "GBA"),
    "fallen electric pole blocking road": ("BESCOM", "Electrical Poles", "GBA"),
    "electrical wire causing injury": ("BESCOM", "Critical Electrical Hazards", "MEDICAL"),
    "electrical accident with injury": ("BESCOM", "Critical Electrical Hazards", "MEDICAL"),
    "electrical hazard causing fire": ("BESCOM", "Critical Electrical Hazards", "FIRE"),
    "electrical hazard in flooded area": ("BESCOM", "Critical Electrical Hazards", "GBA"),

    # BWSSB Water & Sewerage Linked Issues
    "sewage overflowing onto road": ("BWSSB", "Sewerage", "GBA"),
    "water pipeline burst flooding road": ("BWSSB", "Water Supply", "GBA"),
    "sewer pipe burst causing road damage": ("BWSSB", "Sewerage", "GBA"),
    "open manhole on road": ("BWSSB", "Manholes", "GBA"),
    "missing manhole cover on road": ("BWSSB", "Manholes", "GBA"),
    "sewage entering storm-water drain": ("BWSSB", "Sewerage", "GBA"),
    "sewage entering lake": ("BWSSB", "Sewerage", "GBA"),

    # GBA Infrastructure Linked Issues
    "storm-water drain overflowing onto road": ("GBA", "Storm-water Drains", "BWSSB"),
    "flooding causing medical emergency": ("GBA", "Storm-water Drains", "MEDICAL"),
    "flooding causing electrical danger": ("GBA", "Storm-water Drains", "BESCOM"),
    "fallen tree blocking road": ("GBA", "Parks & Public Spaces", "MEDICAL"),
    "fallen tree damaging electric wire": ("GBA", "Parks & Public Spaces", "BESCOM"),
    "fallen tree causing injury": ("GBA", "Parks & Public Spaces", "MEDICAL"),
    "dangerous building": ("GBA", "Buildings & Construction", "FIRE"),
    "dangerous building with injured person": ("FIRE", "Rescue / Emergency", "MEDICAL"),
    "construction debris causing accident": ("GBA", "Buildings & Construction", "MEDICAL"),
    "road damage causing accident": ("GBA", "Roads", "MEDICAL"),
    "pothole causing accident": ("GBA", "Roads", "MEDICAL"),
    "broken footpath causing injury": ("GBA", "Footpaths", "MEDICAL"),
    "open drain causing injury": ("GBA", "Storm-water Drains", "MEDICAL"),
    "illegal construction causing public danger": ("GBA", "Buildings & Construction", "POLICE"),
    "encroachment causing public danger": ("GBA", "Buildings & Construction", "POLICE"),

    # Police Linked Issues
    "suspicious object with possible fire/explosion": ("POLICE", "Suspicious Activity", "FIRE"),
    "suspicious chemical/gas leak": ("FIRE", "Rescue / Emergency", "POLICE"),
    "public violence causing injuries": ("POLICE", "Violence", "MEDICAL"),
    "assault causing serious injury": ("POLICE", "Violence", "MEDICAL"),
    "crime occurring during road accident": ("POLICE", "Theft & Property Crime", "MEDICAL"),
    "vehicle theft with accident": ("POLICE", "Theft & Property Crime", "MEDICAL"),
    "traffic obstruction due to crime incident": ("POLICE", "Public Disturbance", "GBA"),
    "public disturbance causing injury": ("POLICE", "Public Disturbance", "MEDICAL"),

    # Fire Linked Issues
    "fire causing road blockage": ("FIRE", "Fire Incidents", "GBA"),
    "fire causing power-line damage": ("FIRE", "Fire Incidents", "BESCOM"),
    "fire causing water/sewer infrastructure damage": ("FIRE", "Fire Incidents", "BWSSB"),
    "gas leak causing fire": ("FIRE", "Fire Incidents", "POLICE"),
    "gas leak causing injury": ("FIRE", "Rescue / Emergency", "MEDICAL")
}

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

def resolve_linked_departments(category_title: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Returns (Sub-Category, Linked Foreign Department Code) for a given issue title.
    """
    title_lower = (category_title or "").lower().strip()
    for key, (primary, sub_cat, linked) in LINKED_DEPARTMENT_MATRIX.items():
        if key in title_lower or title_lower in key:
            return sub_cat, linked
    return None, None
