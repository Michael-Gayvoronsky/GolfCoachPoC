from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True)
    reporter_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    comment_id = Column(String, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    reason = Column(Text, nullable=False)
    resolved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", back_populates="reports")
    post = relationship("Post", back_populates="reports")
    comment = relationship("Comment", back_populates="reports")
