import datetime

from sqlalchemy import BigInteger, Integer, String, Float, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    type: Mapped[int] = mapped_column(Integer)
    category_id: Mapped[int] = mapped_column(BigInteger, nullable=True)
    account_id: Mapped[int] = mapped_column(BigInteger)
    related_account_id: Mapped[int] = mapped_column(BigInteger, default=0)
    amount: Mapped[int] = mapped_column(BigInteger)
    related_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    currency: Mapped[str] = mapped_column(String(10))
    transaction_time: Mapped[int] = mapped_column(BigInteger)
    timezone_offset: Mapped[int] = mapped_column(Integer, default=0)
    comment: Mapped[str] = mapped_column(String(500), default="")
    hide_amount: Mapped[bool] = mapped_column(Boolean, default=False)
    geo_latitude: Mapped[float] = mapped_column(Float, default=0)
    geo_longitude: Mapped[float] = mapped_column(Float, default=0)
    tag_ids: Mapped[str] = mapped_column(String(500), default="")
    synced_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
