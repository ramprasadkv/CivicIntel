from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_role
from app.routers.citizen_router import _format_report_out

router = APIRouter(prefix="/api/officer", tags=["Department Officer"])

@router.get("/reports", response_model=List[schemas.ReportOut])
def get_department_reports(
    status_filter: Optional[str] = None,
    department_id: Optional[int] = None,
    current_user: models.User = Depends(require_role(["OFFICER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.Report)

    # Filter by officer's department if assigned, or explicit parameter
    if current_user.role == "OFFICER" and current_user.department_id:
        query = query.filter(models.Report.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(models.Report.department_id == department_id)

    if status_filter:
        query = query.filter(models.Report.status == status_filter.upper())

    reports = query.order_by(models.Report.created_at.desc()).all()
    return [_format_report_out(r, db) for r in reports]


@router.post("/reports/{report_id}/log-call", response_model=schemas.ReportOut)
def log_call_attempt(
    report_id: int,
    log_in: schemas.VerificationLogCreate,
    current_user: models.User = Depends(require_role(["OFFICER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Validate call attempt number
    if log_in.call_attempt < 1 or log_in.call_attempt > 3:
        raise HTTPException(status_code=400, detail="Call attempt must be 1, 2, or 3")

    # Create verification log
    vlog = models.VerificationLog(
        report_id=report.id,
        officer_id=current_user.id,
        call_attempt=log_in.call_attempt,
        call_status=log_in.call_status.upper(),
        notes=log_in.notes
    )
    db.add(vlog)

    # Assign officer to report
    report.officer_id = current_user.id

    # If call 3 is reached and unanswered/busy, auto-flag for site visit (never auto fake!)
    if log_in.call_attempt == 3 and log_in.call_status.upper() in ["UNANSWERED", "BUSY"]:
        if report.status == models.ReportStatus.PENDING_VERIFICATION:
            prev_status = report.status
            report.status = models.ReportStatus.SITE_VISIT_REQUIRED
            
            history = models.StatusHistory(
                report_id=report.id,
                previous_status=prev_status,
                new_status=models.ReportStatus.SITE_VISIT_REQUIRED,
                changed_by_user_id=current_user.id,
                remarks="3 unanswered call attempts reached. Transitioned to SITE_VISIT_REQUIRED for physical verification."
            )
            db.add(history)

    db.commit()
    db.refresh(report)
    return _format_report_out(report, db)


@router.post("/reports/{report_id}/update-status", response_model=schemas.ReportOut)
def update_verification_status(
    report_id: int,
    update_in: schemas.StatusUpdateCreate,
    current_user: models.User = Depends(require_role(["OFFICER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    new_status = update_in.status.upper()
    valid_statuses = [
        models.ReportStatus.PENDING_VERIFICATION,
        models.ReportStatus.SITE_VISIT_REQUIRED,
        models.ReportStatus.VERIFIED,
        models.ReportStatus.FAKE_REPORT,
        models.ReportStatus.RESOLVED
    ]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    prev_status = report.status
    report.status = new_status
    report.officer_id = current_user.id

    # Status History
    history = models.StatusHistory(
        report_id=report.id,
        previous_status=prev_status,
        new_status=new_status,
        changed_by_user_id=current_user.id,
        remarks=update_in.remarks or f"Status updated to {new_status} by officer {current_user.name}."
    )
    db.add(history)

    # ----------------------------------------------------
    # FAKE REPORT POLICY ENGINE
    # ----------------------------------------------------
    if new_status == models.ReportStatus.FAKE_REPORT and prev_status != models.ReportStatus.FAKE_REPORT:
        citizen = report.citizen
        if citizen:
            citizen.fake_reports_count += 1
            if citizen.fake_reports_count == 1:
                citizen.status = models.UserStatus.WARNING
                notif_msg = "Warning: A submitted report was verified as a Fake Report by field officers. You have received 1 Fake Report strike."
            elif citizen.fake_reports_count == 2:
                citizen.status = models.UserStatus.FINAL_WARNING
                notif_msg = "FINAL WARNING: A second report has been confirmed as Fake. Receiving 3 strikes will lead to account BLACKLISTING."
            else:
                citizen.status = models.UserStatus.BLACKLISTED
                notif_msg = "ACCOUNT BLACKLISTED: 3 confirmed fake reports recorded. You are permanently restricted from submitting civic complaints."

            # Add notification
            notif = models.Notification(
                user_id=citizen.id,
                title=f"Fake Report Policy Notice (Strike {citizen.fake_reports_count}/3)",
                message=notif_msg
            )
            db.add(notif)
    # ----------------------------------------------------

    # Notify user on status update
    if report.citizen:
        notif = models.Notification(
            user_id=report.citizen_id,
            title=f"Status Update: {report.tracking_id}",
            message=f"Your complaint status has changed from {prev_status} to {new_status}."
        )
        db.add(notif)

    db.commit()
    db.refresh(report)
    return _format_report_out(report, db)
