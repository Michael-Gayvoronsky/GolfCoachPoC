from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from cuid2 import cuid_wrapper
from app.database import get_db
from app.models.user import User, SkillLevel
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
cuid = cuid_wrapper()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SignupRequest(BaseModel):
    email: str
    password: str
    display_name: str
    skill_level: SkillLevel = SkillLevel.BEGINNER


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str
    display_name: str
    skill_level: SkillLevel


def _make_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm="HS256")


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        id=cuid(),
        email=body.email,
        display_name=body.display_name,
        hashed_password=pwd.hash(body.password),
        skill_level=body.skill_level,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(
        token=_make_token(user.id),
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        skill_level=user.skill_level,
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not pwd.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return AuthResponse(
        token=_make_token(user.id),
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        skill_level=user.skill_level,
    )
