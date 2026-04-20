from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from cuid2 import cuid_wrapper
from app.database import get_db
from app.middleware.auth import get_current_uid
from app.models.user import User
from app.models.post import Post

router = APIRouter(prefix="/api/posts", tags=["posts"])

cuid = cuid_wrapper()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024   # 10 MB
MAX_VIDEO_BYTES = 100 * 1024 * 1024  # 100 MB


class CreatePostRequest(BaseModel):
    caption: str | None = None
    media_url: str
    media_type: str  # "image" or "video"
    file_size: int
    content_type: str


class PostResponse(BaseModel):
    id: str
    caption: str | None
    media_url: str
    media_type: str

    model_config = {"from_attributes": True}


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    body: CreatePostRequest,
    uid: str = Depends(get_current_uid),
    db: Session = Depends(get_db),
):
    if body.content_type in ALLOWED_IMAGE_TYPES:
        if body.file_size > MAX_IMAGE_BYTES:
            raise HTTPException(400, "Image exceeds 10 MB limit")
        media_type = "image"
    elif body.content_type in ALLOWED_VIDEO_TYPES:
        if body.file_size > MAX_VIDEO_BYTES:
            raise HTTPException(400, "Video exceeds 100 MB limit")
        media_type = "video"
    else:
        raise HTTPException(400, f"Unsupported file type: {body.content_type}")

    user = db.query(User).filter(User.firebase_uid == uid).first()
    if user is None:
        raise HTTPException(404, "User not found — complete signup first")

    post = Post(
        id=cuid(),
        author_id=user.id,
        caption=body.caption or None,
        media_url=body.media_url,
        media_type=media_type,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post
