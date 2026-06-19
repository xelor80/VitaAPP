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


# ---------------------------------------------------------------------------
# Seed defaults – Joachim Kaeser YouTube clips
# ---------------------------------------------------------------------------
DEFAULT_SEED_VIDEOS = [
    {
        "youtube_id": "ef9TLuF6OrM",
        "title_de": "Gelenk Mobil – Beweglichkeit & Gelenke",
        "title_it": "Gelenk Mobil – mobilità e articolazioni",
        "title_en": "Joint Mobility – Movement & Joints",
        "description_de": "Joachim Kaeser erklärt, welche Inhaltsstoffe deine Gelenke unterstützen können und wie Gelenk Mobil zusammengesetzt ist.",
        "description_it": "Joachim Kaeser spiega quali ingredienti possono supportare le articolazioni e la composizione di Gelenk Mobil.",
        "description_en": "Joachim Kaeser explains which ingredients can support your joints and how Gelenk Mobil is composed.",
        "category": "articolazioni",
    },
    {
        "youtube_id": "Ck6owor_I20",
        "title_de": "Vitame Collagen Plus – Haut, Haare & Nägel",
        "title_it": "Vitame Collagen Plus – pelle, capelli e unghie",
        "title_en": "Vitame Collagen Plus – Skin, Hair & Nails",
        "description_de": "Wie kann Collagen deine Haut, Haare und Nägel unterstützen? Joachim Kaeser zeigt es dir.",
        "description_it": "Come può il collagene supportare pelle, capelli e unghie? Joachim Kaeser ti mostra.",
        "description_en": "How can collagen support your skin, hair and nails? Joachim Kaeser shows you.",
        "category": "pelle",
    },
    {
        "youtube_id": "s5PBkODCPjg",
        "title_de": "Nahrungsergänzungen – worauf es wirklich ankommt",
        "title_it": "Integratori – cosa conta davvero",
        "title_en": "Supplements – what really matters",
        "description_de": "Qualität, Dosierung, Bioverfügbarkeit: Joachim Kaeser erklärt die wichtigsten Punkte bei Nahrungsergänzungsmitteln.",
        "description_it": "Qualità, dosaggio, biodisponibilità: i punti chiave secondo Joachim Kaeser.",
        "description_en": "Quality, dosage, bioavailability: the key points by Joachim Kaeser.",
        "category": "allgemein",
    },
    {
        "youtube_id": "UN7oMHCrobw",
        "title_de": "Energie & Vitalität im Alltag",
        "title_it": "Energia e vitalità nella vita quotidiana",
        "title_en": "Energy & Vitality in Everyday Life",
        "description_de": "Welche Nährstoffe helfen, wenn dir tagsüber die Energie fehlt? Praktische Tipps von Joachim Kaeser.",
        "description_it": "Quali nutrienti aiutano quando manca energia durante il giorno? Consigli pratici di Joachim Kaeser.",
        "description_en": "Which nutrients help when you lack energy during the day? Practical tips by Joachim Kaeser.",
        "category": "energia",
    },
    {
        "youtube_id": "eetnWsojN3M",
        "title_de": "Verdauung & Darmgesundheit",
        "title_it": "Digestione e salute intestinale",
        "title_en": "Digestion & Gut Health",
        "description_de": "Joachim Kaeser spricht über Verdauung, Darmflora und wie du dein Wohlbefinden unterstützen kannst.",
        "description_it": "Joachim Kaeser parla di digestione, flora intestinale e come supportare il benessere.",
        "description_en": "Joachim Kaeser talks about digestion, gut flora and how to support well-being.",
        "category": "digestione",
    },
]


async def seed_default_videos() -> int:
    """Insert default Joachim Kaeser videos in DE + IT + EN if collection is empty.

    Returns the number of inserted documents.
    """
    docs = []
    now = datetime.now(timezone.utc).isoformat()
    for idx, src in enumerate(DEFAULT_SEED_VIDEOS):
        for lang_code in ("de", "it", "en"):
            video_id = str(uuid.uuid4())[:8]
            docs.append({
                "video_id": video_id,
                "title": src[f"title_{lang_code}"],
                "youtube_url": f"https://www.youtube.com/watch?v={src['youtube_id']}",
                "youtube_id": src["youtube_id"],
                "description": src[f"description_{lang_code}"],
                "category": src["category"],
                "lang": lang_code,
                "tags": ["joachim-kaeser"],
                "duration": "",
                "sort_order": idx,
                "active": True,
                "created_at": now,
                "updated_at": now,
            })
    if not docs:
        return 0
    await db.videos.insert_many(docs)
    return len(docs)
