import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum, Boolean
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    OFFICER = "OFFICER"
    ADMIN = "ADMIN"

class UserStatus(str, enum.Enum):
    TRUSTED = "TRUSTED"
    WARNING = "WARNING"
    FINAL_WARNING = "FINAL_WARNING"
    BLACKLISTED = "BLACKLISTED"

class ReportStatus(str, enum.Enum):
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    SITE_VISIT_REQUIRED = "SITE_VISIT_REQUIRED"
    VERIFIED = "VERIFIED"
    FAKE_REPORT = "FAKE_REPORT"
    RESOLVED = "RESOLVED"

class CallStatus(str, enum.Enum):
    ANSWERED = "ANSWERED"
    UNANSWERED = "UNANSWERED"
    BUSY = "BUSY"
    INVALID = "INVALID"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    mobile_number = Column(String(15), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.CITIZEN)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    fake_reports_count = Column(Integer, default=0)
    status = Column(String(20), default=UserStatus.TRUSTED)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="officers")
    reports = relationship("Report", foreign_keys="Report.citizen_id", back_populates="citizen")
    assigned_reports = relationship("Report", foreign_keys="Report.officer_id", back_populates="assigned_officer")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)  # GBA, BWSSB, FIRE, etc.
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    officers = relationship("User", back_populates="department")
    reports = relationship("Report", foreign_keys="Report.department_id", back_populates="department")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(String(30), unique=True, index=True, nullable=False)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    linked_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    linked_department_code = Column(String(20), nullable=True)
    sub_category = Column(String(150), nullable=True)

    image_url = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_address = Column(Text, nullable=True)
    
    category = Column(String(100), nullable=False)
    ai_description = Column(Text, nullable=False)
    user_description = Column(Text, nullable=False)
    ai_confidence = Column(Float, default=0.95)
    status = Column(String(30), default=ReportStatus.PENDING_VERIFICATION)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    citizen = relationship("User", foreign_keys=[citizen_id], back_populates="reports")
    assigned_officer = relationship("User", foreign_keys=[officer_id], back_populates="assigned_reports")
    department = relationship("Department", foreign_keys=[department_id], back_populates="reports")
    linked_department = relationship("Department", foreign_keys=[linked_department_id])
    verification_logs = relationship("VerificationLog", back_populates="report", cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="report", cascade="all, delete-orphan")

class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    call_attempt = Column(Integer, nullable=False)  # 1, 2, or 3
    call_status = Column(String(20), nullable=False) # ANSWERED, UNANSWERED, BUSY, INVALID
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    report = relationship("Report", back_populates="verification_logs")
    officer = relationship("User")

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    report = relationship("Report", back_populates="status_history")
    changed_by = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
