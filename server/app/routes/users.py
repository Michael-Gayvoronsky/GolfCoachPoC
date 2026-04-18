from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from cuid2 import cuid_wrapper
from app.database import get_db
from app.middleware.auth import get_current_uid
from app.models.user import User, SkillLevel

router = APIRouter(prefix="/api/users", tags=["users"])

cuid = cuid_wrapper()


class UpsertUserRequest(BaseModel):
    display_name: str
    email: str
    skill_level: SkillLevel = SkillLevel.BEGINNER


class UserResponse(BaseModel):
    id: str
    firebase_uid: str
    display_name: str
    email: str
    avatar_url: str | None
    skill_level: SkillLevel
    bio: str | None

    model_config = {"from_attributes": True}


@router.post("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def upsert_me(
    body: UpsertUserRequest,
    uid: str = Depends(get_current_uid),
    db: Session = Depends(get_db),
):
    """Called on first login to create or update the user record."""
    user = db.query(User).filter(User.firebase_uid == uid).first()
    if user is None:
        user = User(
            id=cuid(),
            firebase_uid=uid,
            display_name=body.display_name,
            email=body.email,
            skill_level=body.skill_level,
        )
        db.add(user)
    else:
        user.display_name = body.display_name
        user.email = body.email
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_me(
    uid: str = Depends(get_current_uid),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.firebase_uid == uid).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
