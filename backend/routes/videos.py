"""
Video-Management API
YouTube Videos nach Kategorien und Sprache organisiert
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.config import db

router = APIRouter()


class VideoInput(BaseModel):
    title: str
    youtube_url: str
    youtube_id: str  # Video ID für Thumbnail
    description: str = ""
    category: str  # articolazioni, digestione, peso, cuore, energia, pelle, etc.
    lang: str = "it"  # it oder de
    tags: List[str] = []
    duration: str = ""  # z.B. "5:30"
    sort_order: int = 0


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    youtube_url: Optional[str] = None
    youtube_id: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    lang: Optional[str] = None
    tags: Optional[List[str]] = None
    duration: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None


# Video-Kategorien
VIDEO_CATEGORIES = {
    "articolazioni": {"name_de": "Gelenke & Mobilität", "name_it": "Articolazioni e mobilità", "icon": "bone"},
    "digestione": {"name_de": "Verdauung & Detox", "name_it": "Digestione e detox", "icon": "stomach"},
    "peso": {"name_de": "Gewichtskontrolle", "name_it": "Controllo del peso", "icon": "scale-bathroom"},
    "cuore": {"name_de": "Herz & Kreislauf", "name_it": "Cuore e circolazione", "icon": "heart-pulse"},
    "energia": {"name_de": "Energie & Vitalität", "name_it": "Energia e vitalità", "icon": "lightning-bolt"},
    "pelle": {"name_de": "Haut, Haare & Nägel", "name_it": "Pelle, capelli e unghie", "icon": "face-woman"},
    "immunsystem": {"name_de": "Immunsystem", "name_it": "Sistema immunitario", "icon": "shield-check"},
    "schlaf": {"name_de": "Schlaf & Entspannung", "name_it": "Sonno e relax", "icon": "sleep"},
    "memoria": {"name_de": "Gedächtnis & Konzentration", "name_it": "Memoria e concentrazione", "icon": "brain"},
    "allgemein": {"name_de": "Allgemein", "name_it": "Generale", "icon": "information"}
}


@router.get("/videos/categories")
async def get_video_categories():
    """Get all video categories with translations."""
    return VIDEO_CATEGORIES


@router.get("/videos")
async def get_videos(lang: str = None, category: str = None, active_only: bool = True):
    """Get videos filtered by language and/or category."""
    query = {}
    if lang:
        query["lang"] = lang
    if category:
        query["category"] = category
    if active_only:
        query["active"] = {"$ne": False}
    
    videos = await db.videos.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return videos


@router.get("/videos/{video_id}")
async def get_video(video_id: str):
    """Get a single video by ID."""
    video = await db.videos.find_one({"video_id": video_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.post("/videos")
async def create_video(video: VideoInput):
    """Create a new video entry."""
    video_id = str(uuid.uuid4())[:8]
    
    doc = {
        "video_id": video_id,
        "title": video.title,
        "youtube_url": video.youtube_url,
        "youtube_id": video.youtube_id,
        "description": video.description,
        "category": video.category,
        "lang": video.lang,
        "tags": video.tags,
        "duration": video.duration,
        "sort_order": video.sort_order,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.videos.insert_one({**doc})
    return {"video_id": video_id, "message": "Video created successfully"}


@router.put("/videos/{video_id}")
async def update_video(video_id: str, video: VideoUpdate):
    """Update a video entry."""
    existing = await db.videos.find_one({"video_id": video_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Video not found")
    
    update_data = {k: v for k, v in video.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.videos.update_one({"video_id": video_id}, {"$set": update_data})
    return {"message": "Video updated successfully"}


@router.delete("/videos/{video_id}")
async def delete_video(video_id: str):
    """Delete a video entry."""
    result = await db.videos.delete_one({"video_id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": "Video deleted successfully"}


@router.get("/videos/by-category/{lang}")
async def get_videos_grouped_by_category(lang: str):
    """Get all videos for a language, grouped by category."""
    videos = await db.videos.find(
        {"lang": lang, "active": {"$ne": False}},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(100)
    
    grouped = {}
    for video in videos:
        cat = video.get("category", "allgemein")
        if cat not in grouped:
            cat_info = VIDEO_CATEGORIES.get(cat, VIDEO_CATEGORIES["allgemein"])
            grouped[cat] = {
                "category_id": cat,
                "name_de": cat_info["name_de"],
                "name_it": cat_info["name_it"],
                "icon": cat_info["icon"],
                "videos": []
            }
        grouped[cat]["videos"].append(video)
    
    return list(grouped.values())
