from sqlalchemy import Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Drone(Base):
    __tablename__ = "drones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    battery: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[dict] = mapped_column(JSON, nullable=False)
    current_mission_id: Mapped[int | None] = mapped_column(Integer, nullable=True)


