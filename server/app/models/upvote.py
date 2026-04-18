from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Upvote(Base):
    __tablename__ = "upvotes"
    __table_args__ = (UniqueConstraint("user_id", "comment_id", name="uq_user_comment"),)

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment_id = Column(String, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="upvotes")
    comment = relationship("Comment", back_populates="upvote_records")
