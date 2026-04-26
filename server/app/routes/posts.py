from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime
from cuid2 import cuid_wrapper
from app.database import get_db
from app.middleware.auth import get_current_uid
from app.models.user import User, SkillLevel
from app.models.post import Post
from app.models.comment import Comment

router = APIRouter(prefix="/api/posts", tags=["posts"])

cuid = cuid_wrapper()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 100 * 1024 * 1024


# --- Schemas ---

class AuthorResponse(BaseModel):
    id: str
    display_name: str
    skill_level: SkillLevel
    avatar_url: str | None
    model_config = {"from_attributes": True}


class PostSummary(BaseModel):
    id: str
    caption: str | None
    media_url: str
    media_type: str
    created_at: datetime
    author: AuthorResponse
    comment_count: int
    model_config = {"from_attributes": True}


class PostDetail(BaseModel):
    id: str
    caption: str | None
    media_url: str
    media_type: str
    created_at: datetime
    author: AuthorResponse
    model_config = {"from_attributes": True}


class CreatePostRequest(BaseModel):
    caption: str | None = None
    media_url: str
    media_type: str
    file_size: int
    content_type: str


class PostCreateResponse(BaseModel):
    id: str
    model_config = {"from_attributes": True}


# --- Routes ---

@router.get("", response_model=list[PostSummary])
def get_feed(skip: int = 0, limit: int = 12, db: Session = Depends(get_db)):
    posts = (
        db.query(Post)
        .options(joinedload(Post.author))
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for post in posts:
        count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id).scalar()
        result.append(PostSummary(
            id=post.id,
            caption=post.caption,
            media_url=post.media_url,
            media_type=post.media_type,
            created_at=post.created_at,
            author=AuthorResponse.model_validate(post.author),
            comment_count=count or 0,
        ))
    return result


@router.get("/{post_id}", response_model=PostDetail)
def get_post(post_id: str, db: Session = Depends(get_db)):
    post = (
        db.query(Post)
        .options(joinedload(Post.author))
        .filter(Post.id == post_id)
        .first()
    )
    if post is None:
        raise HTTPException(404, "Post not found")
    return PostDetail(
        id=post.id,
        caption=post.caption,
        media_url=post.media_url,
        media_type=post.media_type,
        created_at=post.created_at,
        author=AuthorResponse.model_validate(post.author),
    )


@router.post("", response_model=PostCreateResponse, status_code=status.HTTP_201_CREATED)
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


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: str,
    uid: str = Depends(get_current_uid),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.firebase_uid == uid).first()
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(404, "Post not found")
    if post.author_id != user.id:
        raise HTTPException(403, "Not your post")
    db.delete(post)
    db.commit()
