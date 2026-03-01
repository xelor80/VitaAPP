from pydantic import BaseModel, Field
from typing import List, Optional


class SymptomInput(BaseModel):
    text: str = ""
    tags: List[str] = []
    duration: str = ""
    intensity: str = ""
    lang: str = "de"
    profile_id: Optional[str] = None  # Optional health profile ID for personalized analysis


class ClickEventInput(BaseModel):
    product_id: str
    affiliate_url: str
    source: str = "app"


class DiaryEntryInput(BaseModel):
    date: str
    feeling: int = Field(ge=1, le=5)
    sleep_hours: float = Field(ge=0, le=24)
    stress_level: int = Field(ge=1, le=5)
    water_glasses: int = Field(ge=0, le=30)
    exercise_minutes: int = Field(ge=0, le=600)
    notes: str = ""
