from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard"])

@router.get("/dashboard-stats", response_model=schemas.AdminDashboardStats)
def get_admin_dashboard_stats(
    current_user: models.User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    # Total counts directly from SQLite DB
    total_complaints = db.query(models.Report).count()
    pending = db.query(models.Report).filter(models.Report.status == models.ReportStatus.PENDING_VERIFICATION).count()
    site_visit = db.query(models.Report).filter(models.Report.status == models.ReportStatus.SITE_VISIT_REQUIRED).count()
    verified = db.query(models.Report).filter(models.Report.status == models.ReportStatus.VERIFIED).count()
    resolved = db.query(models.Report).filter(models.Report.status == models.ReportStatus.RESOLVED).count()
    fake = db.query(models.Report).filter(models.Report.status == models.ReportStatus.FAKE_REPORT).count()
    
    blacklisted_users_count = db.query(models.User).filter(models.User.status == models.UserStatus.BLACKLISTED).count()

    # Department breakdown
    dept_stats = []
    departments = db.query(models.Department).all()
    for dept in departments:
        d_total = db.query(models.Report).filter(models.Report.department_id == dept.id).count()
        d_pending = db.query(models.Report).filter(models.Report.department_id == dept.id, models.Report.status == models.ReportStatus.PENDING_VERIFICATION).count()
        d_verified = db.query(models.Report).filter(models.Report.department_id == dept.id, models.Report.status == models.ReportStatus.VERIFIED).count()
        d_resolved = db.query(models.Report).filter(models.Report.department_id == dept.id, models.Report.status == models.ReportStatus.RESOLVED).count()
        d_fake = db.query(models.Report).filter(models.Report.department_id == dept.id, models.Report.status == models.ReportStatus.FAKE_REPORT).count()

        dept_stats.append(schemas.DepartmentStat(
            code=dept.code,
            name=dept.name,
            total=d_total,
            pending=d_pending,
            verified=d_verified,
            resolved=d_resolved,
            fake=d_fake
        ))

    return schemas.AdminDashboardStats(
        total_complaints=total_complaints,
        pending_verification=pending,
        site_visit_required=site_visit,
        verified=verified,
        resolved=resolved,
        fake_reports=fake,
        blacklisted_users=blacklisted_users_count,
        department_stats=dept_stats
    )


@router.get("/blacklisted-users", response_model=List[schemas.BlacklistedUserOut])
def get_blacklisted_users(
    current_user: models.User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    users = db.query(models.User).filter(models.User.status == models.UserStatus.BLACKLISTED).order_by(models.User.created_at.desc()).all()
    return users


@router.post("/users/{user_id}/override-status")
def override_user_status(
    user_id: int,
    new_status: str,
    current_user: models.User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    status_str = new_status.upper()
    if status_str not in [models.UserStatus.TRUSTED, models.UserStatus.WARNING, models.UserStatus.FINAL_WARNING, models.UserStatus.BLACKLISTED]:
        raise HTTPException(status_code=400, detail="Invalid user status")

    user.status = status_str
    if status_str == models.UserStatus.TRUSTED:
        user.fake_reports_count = 0

    db.commit()
    return {"message": f"User {user.name} status updated to {status_str}"}
