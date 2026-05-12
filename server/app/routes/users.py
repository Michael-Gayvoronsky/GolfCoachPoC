from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.middleware.auth import get_current_uid
from app.models.user import User, SkillLevel

router = APIRouter(prefix="/api/users", tags=["users"])


class UserResponse(BaseModel):
    id: str
    display_name: str
    email: str
    avatar_url: str | None
    skill_level: SkillLevel
    bio: str | None

    model_config = {"from_attributes": True}


@router.get("/me", response_model=UserResponse)
def get_me(uid: str = Depends(get_current_uid), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == uid).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
