import os
import uuid
import datetime
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import aiofiles

from app.config import UPLOADS_DIR, BASE_DIR
from app.database import engine, Base, get_db
from app import models, schemas
from app.auth import get_current_user
from app.services.ai_service import analyze_civic_image
from app.services.moderation import analyze_content_safety
from app.routers import auth_router, citizen_router, dept_router, admin_router

# Create database tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicIntel API",
    description="AI-Assisted Civic Issue Reporting & Verification System",
    version="1.0.0"
)

# Enable CORS for local development & cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded media directory
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include Primary API Routers
app.include_router(auth_router.router)
app.include_router(citizen_router.router)
app.include_router(dept_router.router)
app.include_router(admin_router.router)

# -------------------------------------------------------------------
# COMPATIBILITY ALIAS ROUTES
# -------------------------------------------------------------------
@app.post("/api/analyze")
async def analyze_image_alias(
    file: UploadFile = File(...)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"

    unique_name = f"temp_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(UPLOADS_DIR, unique_name)
    
    file_bytes = await file.read()
    async with aiofiles.open(temp_path, "wb") as out_file:
        await out_file.write(file_bytes)

    analysis = analyze_civic_image(temp_path)
    analysis["temp_image_name"] = unique_name
    analysis["image_url"] = f"/uploads/{unique_name}"
    return analysis


@app.get("/api/users/{mobile_number}")
def get_user_by_mobile_alias(mobile_number: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.mobile_number == mobile_number.strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/reports")
def get_all_reports_alias(db: Session = Depends(get_db)):
    reports = db.query(models.Report).order_by(models.Report.created_at.desc()).all()
    from app.routers.citizen_router import _format_report_out
    return [_format_report_out(r, db) for r in reports]


@app.post("/api/reports")
def create_report_alias(report_in: schemas.ReportCreate, db: Session = Depends(get_db)):
    dept = db.query(models.Department).filter(models.Department.code == report_in.department_code.upper()).first()
    if not dept:
        dept = db.query(models.Department).filter(models.Department.code == "GBA").first()

    # Get or create default citizen user
    citizen = db.query(models.User).filter(models.User.role == "CITIZEN").first()
    citizen_id = citizen.id if citizen else 1

    year = datetime.datetime.now().year
    random_code = uuid.uuid4().hex[:5].upper()
    tracking_id = f"CIV-{year}-{random_code}"

    report = models.Report(
        tracking_id=tracking_id,
        citizen_id=citizen_id,
        department_id=dept.id,
        image_url=f"/uploads/{report_in.temp_image_name}",
        latitude=report_in.latitude,
        longitude=report_in.longitude,
        location_address=report_in.location_address or "Location verified via GPS",
        category=report_in.category,
        ai_description=report_in.ai_description,
        user_description=report_in.user_description,
        ai_confidence=report_in.ai_confidence,
        status=models.ReportStatus.PENDING_VERIFICATION
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    from app.routers.citizen_router import _format_report_out
    return _format_report_out(report, db)
# -------------------------------------------------------------------

# Mount Frontend static directory
FRONTEND_DIR = BASE_DIR.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    def read_root():
        return FileResponse(FRONTEND_DIR / "index.html")
