from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.TokenResponse)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # 1. Check unique mobile number
    existing_user = db.query(models.User).filter(models.User.mobile_number == user_in.mobile_number.strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number already registered. Please login using your password."
        )

    # 2. Hash password & create user
    hashed_pwd = get_password_hash(user_in.password)
    user = models.User(
        name=user_in.name.strip(),
        mobile_number=user_in.mobile_number.strip(),
        password_hash=hashed_pwd,
        role=user_in.role.upper() if user_in.role else models.UserRole.CITIZEN,
        department_id=user_in.department_id,
        fake_reports_count=0,
        status=models.UserStatus.TRUSTED
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 3. Create token
    access_token = create_access_token(data={"sub": user.mobile_number})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login", response_model=schemas.TokenResponse)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.mobile_number == login_in.mobile_number.strip()).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password."
        )

    access_token = create_access_token(data={"sub": user.mobile_number})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=schemas.UserOut)
def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user
