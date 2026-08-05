import os
import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
import aiofiles

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.config import UPLOADS_DIR
from app.services.ai_service import analyze_civic_image
from app.services.moderation import analyze_content_safety
from app.services.routing_service import get_department_by_code

router = APIRouter(prefix="/api/citizen", tags=["Citizen Issues"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/analyze-image", response_model=schemas.AIAnalysisResult)
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.status == models.UserStatus.BLACKLISTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been blacklisted due to multiple confirmed fake reports. You cannot submit new complaints."
        )

    # 1. Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Please upload JPG, PNG, or WEBP images."
        )

    # 2. Save temporary file
    unique_name = f"temp_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(UPLOADS_DIR, unique_name)
    
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit."
        )

    async with aiofiles.open(temp_path, "wb") as out_file:
        await out_file.write(file_bytes)

    # 3. Analyze image using AI (Gemini Flash VLM / OpenCV fallback)
    analysis = analyze_civic_image(temp_path)
    analysis["temp_image_name"] = unique_name
    return analysis


@router.post("/submit-report", response_model=schemas.ReportOut)
def submit_report(
    report_in: schemas.ReportCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Check blacklist status
    if current_user.status == models.UserStatus.BLACKLISTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Blacklisted users are restricted from submitting civic complaints."
        )

    # 2. Content Moderation check on user description
    is_safe, issues = analyze_content_safety(report_in.user_description)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Content Moderation Warning: {'; '.join(issues)}"
        )

    # 3. Resolve department ID
    dept = db.query(models.Department).filter(models.Department.code == report_in.department_code.upper()).first()
    if not dept:
        # Fallback to GBA
        dept = db.query(models.Department).filter(models.Department.code == "GBA").first()

    # Move temp image to permanent image path
    temp_path = os.path.join(UPLOADS_DIR, report_in.temp_image_name)
    perm_name = f"report_{uuid.uuid4().hex[:12]}{os.path.splitext(report_in.temp_image_name)[1]}"
    perm_path = os.path.join(UPLOADS_DIR, perm_name)
    
    if os.path.exists(temp_path):
        os.rename(temp_path, perm_path)
        image_url = f"/uploads/{perm_name}"
    else:
        image_url = f"/uploads/{report_in.temp_image_name}"

    # Generate tracking ID
    year = datetime.datetime.now().year
    random_code = uuid.uuid4().hex[:5].upper()
    tracking_id = f"CIV-{year}-{random_code}"

    # Create Report
    report = models.Report(
        tracking_id=tracking_id,
        citizen_id=current_user.id,
        department_id=dept.id,
        image_url=image_url,
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

    # Add initial status history
    history = models.StatusHistory(
        report_id=report.id,
        previous_status=None,
        new_status=models.ReportStatus.PENDING_VERIFICATION,
        changed_by_user_id=current_user.id,
        remarks="Complaint submitted by citizen and AI analysis complete."
    )
    db.add(history)

    # Notification to citizen
    notif = models.Notification(
        user_id=current_user.id,
        title=f"Complaint Submitted: {tracking_id}",
        message=f"Your complaint has been successfully routed to {dept.name} and is currently Pending Verification."
    )
    db.add(notif)
    db.commit()

    return _format_report_out(report, db)


@router.get("/my-reports", response_model=List[schemas.ReportOut])
def get_my_reports(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reports = db.query(models.Report).filter(models.Report.citizen_id == current_user.id).order_by(models.Report.created_at.desc()).all()
    return [_format_report_out(r, db) for r in reports]


@router.get("/track/{tracking_id}", response_model=schemas.ReportOut)
def track_report(
    tracking_id: str,
    db: Session = Depends(get_db)
):
    report = db.query(models.Report).filter(models.Report.tracking_id == tracking_id.strip().upper()).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No complaint found matching tracking ID: {tracking_id}"
        )
    return _format_report_out(report, db)


def _format_report_out(report: models.Report, db: Session) -> dict:
    citizen = report.citizen
    dept = report.department
    
    logs = [
        schemas.VerificationLogOut(
            id=log.id,
            call_attempt=log.call_attempt,
            call_status=log.call_status,
            notes=log.notes,
            officer_name=log.officer.name if log.officer else "Department Officer",
            created_at=log.created_at
        ) for log in report.verification_logs
    ]

    history = [
        schemas.StatusHistoryOut(
            id=h.id,
            previous_status=h.previous_status,
            new_status=h.new_status,
            changed_by_name=h.changed_by.name if h.changed_by else "System",
            remarks=h.remarks,
            created_at=h.created_at
        ) for h in report.status_history
    ]

    return {
        "id": report.id,
        "tracking_id": report.tracking_id,
        "citizen_id": report.citizen_id,
        "citizen_name": citizen.name if citizen else "Anonymous Citizen",
        "citizen_mobile": citizen.mobile_number if citizen else "",
        "citizen_status": citizen.status if citizen else "TRUSTED",
        "department_id": report.department_id,
        "department_code": dept.code if dept else "GBA",
        "department_name": dept.name if dept else "Urban Infrastructure",
        "image_url": report.image_url,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "location_address": report.location_address,
        "category": report.category,
        "ai_description": report.ai_description,
        "user_description": report.user_description,
        "ai_confidence": report.ai_confidence,
        "status": report.status,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "verification_logs": logs,
        "status_history": history
    }
