"""
Label Analysis API - Etikett-Analyse mit GPT-4o Vision
"""
import os
import base64
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from core.config import db, logger

router = APIRouter()

# Bild-Speicherort
UPLOAD_DIR = "/app/backend/uploads/labels"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class LabelAnalysisResult(BaseModel):
    ingredients: list[str] = []
    dosage: str = ""
    intake_recommendation: str = ""
    warnings: list[str] = []
    additional_info: str = ""


async def analyze_label_with_gpt4o(image_base64: str, lang: str = "de") -> dict:
    """Analysiert ein Produkt-Etikett mit GPT-4o Vision."""
    try:
        from emergentintegrations.llm.chat import chat, Message, MessageRole
        
        system_prompt = """Du bist ein Experte für Nahrungsergänzungsmittel-Etiketten. 
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

        user_prompt = f"Analysiere dieses Produktetikett und extrahiere die Informationen auf {'Deutsch' if lang == 'de' else 'Italienisch'}."
        
        # GPT-4o mit Bild
        response = await chat(
            api_key=os.environ.get("EMERGENT_API_KEY"),
            messages=[
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(
                    role=MessageRole.USER, 
                    content=user_prompt,
                    images=[f"data:image/jpeg;base64,{image_base64}"]
                )
            ],
            model="gpt-4o"
        )
        
        # Parse JSON response
        import json
        response_text = response.message.content.strip()
        
        # Entferne mögliche Markdown-Formatierung
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        result = json.loads(response_text.strip())
        return result
        
    except Exception as e:
        logger.error(f"GPT-4o Vision error: {e}")
        raise HTTPException(status_code=500, detail=f"Bildanalyse fehlgeschlagen: {str(e)}")


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
    
    # Konvertiere zu Base64 für GPT-4o
    image_base64 = base64.b64encode(contents).decode("utf-8")
    
    # Analysiere mit GPT-4o
    analysis = await analyze_label_with_gpt4o(image_base64, lang)
    
    # Speichere in Datenbank
    label_data = {
        "label_image": f"/api/uploads/labels/{filename}",
        "label_analysis": analysis,
        "label_analyzed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update Produkt in beiden Sprach-Collections
    for collection in ["products_de", "products_it"]:
        await db[collection].update_one(
            {"id": product_id},
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
    product = await db.products_de.find_one({"id": product_id}, {"_id": 0})
    if not product:
        product = await db.products_it.find_one({"id": product_id}, {"_id": 0})
    
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
    product = await db.products_de.find_one({"id": product_id})
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
        await db[collection].update_one({"id": product_id}, update)
    
    return {"status": "deleted"}
