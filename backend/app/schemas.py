from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    mobile_number: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=4)
    role: Optional[str] = "CITIZEN"
    department_id: Optional[int] = None

class UserLogin(BaseModel):
    mobile_number: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: int
    name: str
    mobile_number: str
    role: str
    department_id: Optional[int] = None
    fake_reports_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- AI Image Analysis ---
class AIAnalysisResult(BaseModel):
    department_code: str
    department_name: str
    category: str
    ai_description: str
    confidence: float
    is_valid_civic_issue: bool
    rejection_reason: Optional[str] = None

# --- Report Schemas ---
class ReportCreate(BaseModel):
    temp_image_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = "Location detected via GPS"
    department_code: str
    category: str
    ai_description: str
    user_description: str
    ai_confidence: float

class VerificationLogCreate(BaseModel):
    call_attempt: int  # 1, 2, 3
    call_status: str   # ANSWERED, UNANSWERED, BUSY, INVALID
    notes: Optional[str] = None

class StatusUpdateCreate(BaseModel):
    status: str        # VERIFIED, SITE_VISIT_REQUIRED, FAKE_REPORT, RESOLVED
    remarks: Optional[str] = None

class VerificationLogOut(BaseModel):
    id: int
    call_attempt: int
    call_status: str
    notes: Optional[str] = None
    officer_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class StatusHistoryOut(BaseModel):
    id: int
    previous_status: Optional[str] = None
    new_status: str
    changed_by_name: str
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReportOut(BaseModel):
    id: int
    tracking_id: str
    citizen_id: int
    citizen_name: str
    citizen_mobile: str
    citizen_status: str
    department_id: int
    department_code: str
    department_name: str
    image_url: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None
    category: str
    ai_description: str
    user_description: str
    ai_confidence: float
    status: str
    created_at: datetime
    updated_at: datetime
    verification_logs: List[VerificationLogOut] = []
    status_history: List[StatusHistoryOut] = []

    class Config:
        from_attributes = True

# --- Admin Analytics ---
class DepartmentStat(BaseModel):
    code: str
    name: str
    total: int
    pending: int
    verified: int
    resolved: int
    fake: int

class AdminDashboardStats(BaseModel):
    total_complaints: int
    pending_verification: int
    site_visit_required: int
    verified: int
    resolved: int
    fake_reports: int
    blacklisted_users: int
    department_stats: List[DepartmentStat]

class BlacklistedUserOut(BaseModel):
    id: int
    name: str
    mobile_number: str
    fake_reports_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
