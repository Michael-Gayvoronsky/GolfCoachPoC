from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True)
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = Column(Text, nullable=False)
    upvotes = Column(Integer, nullable=False, default=0)
    is_top_three = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")
    upvote_records = relationship("Upvote", back_populates="comment", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="comment", cascade="all, delete-orphan")
