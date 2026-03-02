"""
Label Analysis API - Etikett-Analyse mit GPT-4.1 Vision + PDF
"""
import os
import re
import io
import base64
import uuid
import json
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from datetime import datetime, timezone
from dotenv import load_dotenv

from core.config import db, logger

load_dotenv()

router = APIRouter()

UPLOAD_DIR = "/app/backend/uploads/labels"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_IMAGE_DIMENSION = 2048

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


def resize_image_if_needed(image_bytes: bytes) -> bytes:
    """Resize image to max 2048px on longest side."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size
        logger.info(f"Original image size: {w}x{h}, {len(image_bytes)} bytes")
        if max(w, h) > MAX_IMAGE_DIMENSION:
            ratio = MAX_IMAGE_DIMENSION / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.LANCZOS)
            if img.mode == "RGBA":
                img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            logger.info(f"Resized: {new_size[0]}x{new_size[1]}, {len(buf.getvalue())} bytes")
            return buf.getvalue()
        if img.mode == "RGBA":
            img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            return buf.getvalue()
        return image_bytes
    except Exception as e:
        logger.warning(f"Image resize failed: {e}")
        return image_bytes


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract text content from a PDF file."""
    import fitz  # pymupdf
    text_parts = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = doc.page_count
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()
    full_text = "\n".join(text_parts).strip()
    logger.info(f"Extracted {len(full_text)} chars from PDF ({page_count} pages)")
    return full_text


def _parse_analysis_json(response_text: str) -> dict:
    """Extract and parse JSON from model response."""
    if not response_text:
        raise HTTPException(status_code=500, detail="Analyse: leere Antwort vom Modell")

    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if not json_match:
        logger.warning(f"No JSON in response: {response_text[:300]}")
        raise HTTPException(
            status_code=422,
            detail="Das Etikett konnte nicht gelesen werden. Bitte versuche es mit einem klareren Foto oder einer PDF-Datei."
        )

    try:
        return json.loads(json_match.group())
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e} – extracted: {json_match.group()[:300]}")
        raise HTTPException(status_code=500, detail="Analyse: ungültiges JSON vom Modell")


async def analyze_image_label(image_bytes: bytes, lang: str = "de") -> dict:
    """Analyse via GPT-4.1 Vision (image)."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

    processed = resize_image_if_needed(image_bytes)
    image_b64 = base64.b64encode(processed).decode("utf-8")
    logger.info(f"Image base64 size: {len(image_b64)} chars")

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=f"label-img-{uuid.uuid4().hex[:8]}",
        system_message=SYSTEM_PROMPT,
    ).with_model("openai", "gpt-4.1")

    prompt = f"Analysiere dieses Produktetikett auf {'Deutsch' if lang == 'de' else 'Italienisch'}."

    try:
        response_text = await chat.send_message(
            UserMessage(text=prompt, file_contents=[ImageContent(image_base64=image_b64)])
        )
    except Exception as e:
        logger.error(f"Image analysis failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Bildanalyse fehlgeschlagen. Bitte versuche es erneut.")

    logger.info(f"Image analysis response: {repr(response_text[:300]) if response_text else 'NONE'}")
    return _parse_analysis_json(response_text)


async def analyze_pdf_label(pdf_text: str, lang: str = "de") -> dict:
    """Analyse via GPT-4.1 Text (PDF content)."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=f"label-pdf-{uuid.uuid4().hex[:8]}",
        system_message=SYSTEM_PROMPT,
    ).with_model("openai", "gpt-4.1")

    prompt = f"Hier ist der Text von einem Nahrungsergänzungsmittel-Etikett (aus PDF extrahiert). Analysiere ihn auf {'Deutsch' if lang == 'de' else 'Italienisch'}:\n\n{pdf_text[:4000]}"

    try:
        response_text = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.error(f"PDF analysis failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="PDF-Analyse fehlgeschlagen. Bitte versuche es erneut.")

    logger.info(f"PDF analysis response: {repr(response_text[:300]) if response_text else 'NONE'}")
    return _parse_analysis_json(response_text)


@router.post("/products/{product_id}/label")
async def upload_and_analyze_label(
    product_id: str,
    lang: str = Form(default="de"),
    file: Optional[UploadFile] = File(default=None),
    pdf_file: Optional[UploadFile] = File(default=None),
):
    """Upload image and/or PDF label, analyze with GPT-4.1."""
    if not file and not pdf_file:
        raise HTTPException(status_code=400, detail="Bitte mindestens ein Bild oder eine PDF-Datei hochladen.")

    label_data = {}
    analysis = None

    # Handle image upload (save file)
    if file and file.filename:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Bilddatei muss ein Bildformat sein (JPG, PNG, etc.)")
        contents = await file.read()
        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
        img_name = f"{product_id}_{uuid.uuid4().hex[:8]}.{ext}"
        img_path = os.path.join(UPLOAD_DIR, img_name)
        with open(img_path, "wb") as f:
            f.write(contents)
        label_data["label_image"] = f"/api/uploads/labels/{img_name}"

    # Handle PDF upload (save file + extract text)
    pdf_text = None
    if pdf_file and pdf_file.filename:
        if pdf_file.content_type != "application/pdf" and not pdf_file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="PDF-Datei muss im PDF-Format sein.")
        pdf_contents = await pdf_file.read()
        pdf_name = f"{product_id}_{uuid.uuid4().hex[:8]}.pdf"
        pdf_path = os.path.join(UPLOAD_DIR, pdf_name)
        with open(pdf_path, "wb") as f:
            f.write(pdf_contents)
        label_data["label_pdf"] = f"/api/uploads/labels/{pdf_name}"
        pdf_text = extract_pdf_text(pdf_contents)

    # Analyze: prefer PDF text (more reliable), fallback to image vision
    if pdf_text and pdf_text.strip():
        analysis = await analyze_pdf_label(pdf_text, lang)
    elif file and file.filename:
        analysis = await analyze_image_label(contents, lang)
    else:
        raise HTTPException(status_code=422, detail="Die PDF-Datei enthält keinen lesbaren Text und kein Bild vorhanden.")

    if analysis:
        label_data["label_analysis"] = analysis
        label_data["label_analyzed_at"] = datetime.now(timezone.utc).isoformat()

    # Update product in both language collections
    for collection in ["products_de", "products_it"]:
        await db[collection].update_one({"product_id": product_id}, {"$set": label_data})

    return {
        "status": "success",
        "product_id": product_id,
        "label_image": label_data.get("label_image"),
        "label_pdf": label_data.get("label_pdf"),
        "analysis": analysis,
    }


@router.get("/products/{product_id}/label")
async def get_label_analysis(product_id: str):
    product = await db.products_de.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        product = await db.products_it.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produkt nicht gefunden")

    return {
        "product_id": product_id,
        "label_image": product.get("label_image"),
        "label_pdf": product.get("label_pdf"),
        "analysis": product.get("label_analysis"),
        "analyzed_at": product.get("label_analyzed_at"),
    }


@router.delete("/products/{product_id}/label")
async def delete_label(product_id: str):
    product = await db.products_de.find_one({"product_id": product_id})
    if product:
        for key in ["label_image", "label_pdf"]:
            url = product.get(key)
            if url:
                fname = url.split("/")[-1]
                fpath = os.path.join(UPLOAD_DIR, fname)
                if os.path.exists(fpath):
                    os.remove(fpath)

    update = {"$unset": {"label_image": "", "label_pdf": "", "label_analysis": "", "label_analyzed_at": ""}}
    for collection in ["products_de", "products_it"]:
        await db[collection].update_one({"product_id": product_id}, update)

    return {"status": "deleted"}
