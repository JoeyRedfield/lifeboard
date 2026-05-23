import datetime

from sqlalchemy import BigInteger, String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[int] = mapped_column(Integer, default=0)
    parent_id: Mapped[int] = mapped_column(BigInteger, default=0)
    hidden: Mapped[bool] = mapped_column(default=False)
    synced_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
