"""
Label Analysis API - Etikett-Analyse mit GPT-4o Vision
"""
import os
import re
import io
import base64
import uuid
import json
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from datetime import datetime, timezone
from dotenv import load_dotenv

from core.config import db, logger

load_dotenv()

router = APIRouter()

# Bild-Speicherort
UPLOAD_DIR = "/app/backend/uploads/labels"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_IMAGE_DIMENSION = 2048


class LabelAnalysisResult(BaseModel):
    ingredients: list[str] = []
    dosage: str = ""
    intake_recommendation: str = ""
    warnings: list[str] = []
    additional_info: str = ""


def resize_image_if_needed(image_bytes: bytes) -> bytes:
    """Resize image to max 2048px on longest side to reduce payload size."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        logger.info(f"Original image size: {w}x{h}, {len(image_bytes)} bytes")
        if max(w, h) > MAX_IMAGE_DIMENSION:
            ratio = MAX_IMAGE_DIMENSION / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.LANCZOS)
            # Convert to RGB if RGBA
            if img.mode == "RGBA":
                img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            result = buf.getvalue()
            logger.info(f"Resized image: {new_size[0]}x{new_size[1]}, {len(result)} bytes")
            return result
        # Even if not resizing, ensure it's JPEG and reasonable quality
        if img.mode == "RGBA":
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()
    except Exception as e:
        logger.warning(f"Image resize failed, using original: {e}")
        return image_bytes


SYSTEM_PROMPT = """Du bist ein Experte für Nahrungsergänzungsmittel-Etiketten. 
Analysiere das Produktetikett und extrahiere folgende Informationen:

1. **Inhaltsstoffe**: Liste aller Inhaltsstoffe mit Mengenangaben
2. **Dosierung**: Empfohlene Tagesdosis
3. **Einnahmeempfehlung**: Wann und wie das Produkt eingenommen werden soll
4. **Warnhinweise**: Alle Warnungen und Kontraindikationen
5. **Zusätzliche Infos**: Weitere relevante Informationen

Antworte NUR im folgenden JSON-Format (keine Markdown-Formatierung):
{
    "ingredients": ["Inhaltsstoff 1 (Menge)", "Inhaltsstoff 2 (Menge)"],
    "dosage": "z.B. 1 Kapsel täglich",
    "intake_recommendation": "z.B. Morgens mit Wasser einnehmen",
    "warnings": ["Warnung 1", "Warnung 2"],
    "additional_info": "Weitere Infos"
}"""


async def analyze_label_with_gpt4o(image_bytes: bytes, lang: str = "de") -> dict:
    """Analysiert ein Produkt-Etikett mit GPT-4o Vision via emergentintegrations."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

    user_prompt = f"Analysiere dieses Produktetikett und extrahiere die Informationen auf {'Deutsch' if lang == 'de' else 'Italienisch'}."

    # Resize large images to avoid API payload issues
    processed_bytes = resize_image_if_needed(image_bytes)
    image_base64 = base64.b64encode(processed_bytes).decode("utf-8")
    logger.info(f"Base64 payload size: {len(image_base64)} chars")

    image_content = ImageContent(image_base64=image_base64)

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=f"label-{uuid.uuid4().hex[:8]}",
        system_message=SYSTEM_PROMPT,
    ).with_model("openai", "gpt-4o")

    # Call GPT-4o Vision - catch errors from the library itself
    response_text = None
    try:
        response_text = await chat.send_message(
            UserMessage(text=user_prompt, file_contents=[image_content])
        )
    except Exception as e:
        logger.error(f"chat.send_message() failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Bildanalyse fehlgeschlagen: KI-Service nicht erreichbar. Bitte versuche es erneut."
        )

    logger.info(f"GPT-4o raw response (first 300 chars): {repr(response_text[:300]) if response_text else 'NONE'}")

    if not response_text:
        raise HTTPException(status_code=500, detail="Bildanalyse: leere Antwort vom Modell")

    # Extract JSON from response
    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if not json_match:
        logger.error(f"No JSON in response: {response_text[:500]}")
        raise HTTPException(status_code=500, detail="Bildanalyse: kein JSON in der Antwort")

    try:
        result = json.loads(json_match.group())
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e} – extracted: {json_match.group()[:300]}")
        raise HTTPException(status_code=500, detail="Bildanalyse: ungültiges JSON vom Modell")

    return result


@router.post("/products/{product_id}/label")
async def upload_and_analyze_label(
    product_id: str,
    lang: str = Form(default="de"),
    file: UploadFile = File(...)
):
    """Lädt ein Produktetikett hoch und analysiert es mit GPT-4o."""
    
    # Prüfe Dateityp
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Nur Bilddateien erlaubt")
    
    # Lese Datei
    contents = await file.read()
    
    # Speichere Datei
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{product_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Analysiere mit GPT-4o (raw bytes)
    analysis = await analyze_label_with_gpt4o(contents, lang)
    
    # Speichere in Datenbank
    label_data = {
        "label_image": f"/api/uploads/labels/{filename}",
        "label_analysis": analysis,
        "label_analyzed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update Produkt in beiden Sprach-Collections
    for collection in ["products_de", "products_it"]:
        await db[collection].update_one(
            {"product_id": product_id},
            {"$set": label_data}
        )
    
    return {
        "status": "success",
        "product_id": product_id,
        "label_image": label_data["label_image"],
        "analysis": analysis
    }


@router.get("/products/{product_id}/label")
async def get_label_analysis(product_id: str):
    """Holt die Etikett-Analyse für ein Produkt."""
    product = await db.products_de.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        product = await db.products_it.find_one({"product_id": product_id}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")
    
    return {
        "product_id": product_id,
        "label_image": product.get("label_image"),
        "analysis": product.get("label_analysis"),
        "analyzed_at": product.get("label_analyzed_at")
    }


@router.delete("/products/{product_id}/label")
async def delete_label(product_id: str):
    """Löscht die Etikett-Daten eines Produkts."""
    # Hole aktuelles Produkt
    product = await db.products_de.find_one({"product_id": product_id})
    if product and product.get("label_image"):
        # Lösche Bilddatei
        filename = product["label_image"].split("/")[-1]
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    
    # Entferne Label-Daten aus DB
    update = {
        "$unset": {
            "label_image": "",
            "label_analysis": "",
            "label_analyzed_at": ""
        }
    }
    
    for collection in ["products_de", "products_it"]:
        await db[collection].update_one({"product_id": product_id}, update)
    
    return {"status": "deleted"}
