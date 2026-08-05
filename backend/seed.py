import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent))

from app.database import engine, Base, SessionLocal
from app import models
from app.auth import get_password_hash
from app.config import DEPARTMENTS

def seed_database():
    print("Initializing CivicIntel database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Seed Departments
    dept_map = {}
    for d_info in DEPARTMENTS:
        existing = db.query(models.Department).filter(models.Department.code == d_info["code"]).first()
        if not existing:
            dept = models.Department(
                code=d_info["code"],
                name=d_info["name"],
                description=d_info["description"]
            )
            db.add(dept)
            db.commit()
            db.refresh(dept)
            dept_map[d_info["code"]] = dept.id
            print(f"  + Department created: {d_info['name']} ({d_info['code']})")
        else:
            dept_map[d_info["code"]] = existing.id

    # 2. Seed Users
    # Admin
    if not db.query(models.User).filter(models.User.mobile_number == "9999999999").first():
        admin = models.User(
            name="System Administrator",
            mobile_number="9999999999",
            password_hash=get_password_hash("admin123"),
            role=models.UserRole.ADMIN,
            status=models.UserStatus.TRUSTED
        )
        db.add(admin)
        print("  + Admin user created (Mobile: 9999999999 / Password: admin123)")

    # Officers
    officer_gba = db.query(models.User).filter(models.User.mobile_number == "9111111111").first()
    if not officer_gba:
        officer_gba = models.User(
            name="Officer Ramesh (GBA)",
            mobile_number="9111111111",
            password_hash=get_password_hash("officer123"),
            role=models.UserRole.OFFICER,
            department_id=dept_map["GBA"]
        )
        db.add(officer_gba)
        print("  + GBA Officer created (Mobile: 9111111111 / Password: officer123)")

    officer_bwssb = db.query(models.User).filter(models.User.mobile_number == "9222222222").first()
    if not officer_bwssb:
        officer_bwssb = models.User(
            name="Officer Priya (BWSSB)",
            mobile_number="9222222222",
            password_hash=get_password_hash("officer123"),
            role=models.UserRole.OFFICER,
            department_id=dept_map["BWSSB"]
        )
        db.add(officer_bwssb)
        print("  + BWSSB Officer created (Mobile: 9222222222 / Password: officer123)")

    # Citizens
    citizen_trusted = db.query(models.User).filter(models.User.mobile_number == "9876543210").first()
    if not citizen_trusted:
        citizen_trusted = models.User(
            name="Rajesh Kumar",
            mobile_number="9876543210",
            password_hash=get_password_hash("password123"),
            role=models.UserRole.CITIZEN,
            status=models.UserStatus.TRUSTED,
            fake_reports_count=0
        )
        db.add(citizen_trusted)
        print("  + Citizen created: Rajesh Kumar (Mobile: 9876543210 / Password: password123)")

    citizen_warning = db.query(models.User).filter(models.User.mobile_number == "9876543211").first()
    if not citizen_warning:
        citizen_warning = models.User(
            name="Anand Verma",
            mobile_number="9876543211",
            password_hash=get_password_hash("password123"),
            role=models.UserRole.CITIZEN,
            status=models.UserStatus.WARNING,
            fake_reports_count=1
        )
        db.add(citizen_warning)
        print("  + Citizen created: Anand Verma (Mobile: 9876543211 / Warning Status)")

    citizen_blacklisted = db.query(models.User).filter(models.User.mobile_number == "9876543212").first()
    if not citizen_blacklisted:
        citizen_blacklisted = models.User(
            name="Suresh Spammer",
            mobile_number="9876543212",
            password_hash=get_password_hash("password123"),
            role=models.UserRole.CITIZEN,
            status=models.UserStatus.BLACKLISTED,
            fake_reports_count=3
        )
        db.add(citizen_blacklisted)
        print("  + Blacklisted User created: Suresh Spammer (Mobile: 9876543212 / Blacklisted)")

    db.commit()

    # 3. Seed Sample Reports
    if db.query(models.Report).count() == 0:
        print("Seeding initial sample reports...")
        sample_reports = [
            {
                "tracking_id": "CIV-2026-A1B2C",
                "citizen_id": citizen_trusted.id,
                "department_id": dept_map["GBA"],
                "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "location_address": "MG Road near Metro Station, Bengaluru",
                "category": "Severe Pothole & Road Cracks",
                "ai_description": "AI analysis identified a hazardous 1.2m deep pothole causing traffic obstruction and vehicular damage risk.",
                "user_description": "Large pothole in the middle lane causing dangerous swerving by commuters during peak hours.",
                "ai_confidence": 0.94,
                "status": models.ReportStatus.PENDING_VERIFICATION
            },
            {
                "tracking_id": "CIV-2026-D3E4F",
                "citizen_id": citizen_trusted.id,
                "department_id": dept_map["BWSSB"],
                "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80",
                "latitude": 12.9352,
                "longitude": 77.6245,
                "location_address": "8th Main Road, Koramangala 4th Block, Bengaluru",
                "category": "Main Pipeline Water Leakage",
                "ai_description": "Visual analysis detected clean drinking water surging from an underground pipe fracture.",
                "user_description": "Fresh drinking water has been leaking continuously for 12 hours from the main distribution pipe.",
                "ai_confidence": 0.91,
                "status": models.ReportStatus.SITE_VISIT_REQUIRED
            },
            {
                "tracking_id": "CIV-2026-G5H6I",
                "citizen_id": citizen_warning.id,
                "department_id": dept_map["BESCOM"],
                "image_url": "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=800&q=80",
                "latitude": 12.9279,
                "longitude": 77.6271,
                "location_address": "100 Feet Road, Indiranagar, Bengaluru",
                "category": "Exposed High-Voltage Wire",
                "ai_description": "Edge texture classifier detected dangling high-voltage cable near pedestrian sidewalk.",
                "user_description": "Dangerous live wire hanging dangerously close to school children footpath.",
                "ai_confidence": 0.96,
                "status": models.ReportStatus.VERIFIED
            }
        ]

        for r_data in sample_reports:
            report = models.Report(**r_data)
            db.add(report)
            db.commit()
            db.refresh(report)

            # Add status history
            history = models.StatusHistory(
                report_id=report.id,
                previous_status=None,
                new_status=report.status,
                changed_by_user_id=report.citizen_id,
                remarks="Initial submission registered in database."
            )
            db.add(history)
            db.commit()

        print("  + Sample reports created successfully.")

    db.close()
    print("Database seeding completed cleanly!")

if __name__ == "__main__":
    seed_database()
