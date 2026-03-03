"""
Email Export - Sends health data + supplement plan as beautiful HTML email with PDF attachment.
"""
import os
import io
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.config import db

logger = logging.getLogger("vitaguide")
router = APIRouter(tags=["export"])


class EmailExportRequest(BaseModel):
    profile_id: str
    email: str
    lang: str = "de"


# ==================== PDF GENERATION ====================

def _generate_pdf(profile: dict, plan: dict, score_data: dict, lang: str) -> bytes:
    """Generate a PDF report with health data and supplement plan."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=22, textColor=HexColor('#1a5632'), spaceAfter=6*mm)
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=HexColor('#1a5632'), spaceBefore=8*mm, spaceAfter=4*mm)
    body_style = ParagraphStyle('Body2', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=2*mm)
    small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=HexColor('#666666'), leading=10)

    elements = []

    # Title
    if lang == "de":
        elements.append(Paragraph("Dein Gesundheitsbericht", title_style))
        elements.append(Paragraph(f"Erstellt am {datetime.now().strftime('%d.%m.%Y')}", small_style))
    else:
        elements.append(Paragraph("Il tuo rapporto sulla salute", title_style))
        elements.append(Paragraph(f"Creato il {datetime.now().strftime('%d/%m/%Y')}", small_style))

    elements.append(Spacer(1, 6*mm))

    # Health Profile
    elements.append(Paragraph("Gesundheitsprofil" if lang == "de" else "Profilo salute", h2_style))

    age = profile.get("age", "?")
    gender_map = {"male": "Maennlich" if lang == "de" else "Maschile", "female": "Weiblich" if lang == "de" else "Femminile"}
    gender = gender_map.get(profile.get("gender", ""), "?")
    diet = profile.get("diet", "?")
    sleep = profile.get("sleep_quality", "?")
    stress = profile.get("stress_level", "?")

    profile_data = [
        [("Alter" if lang == "de" else "Eta"), str(age)],
        [("Geschlecht" if lang == "de" else "Sesso"), gender],
        [("Ernaehrung" if lang == "de" else "Alimentazione"), diet],
        [("Schlafqualitaet" if lang == "de" else "Qualita sonno"), f"{sleep}/10"],
        [("Stresslevel" if lang == "de" else "Livello stress"), f"{stress}/10"],
    ]

    t = Table(profile_data, colWidths=[60*mm, 100*mm])
    t.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#1a5632')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)

    # Complaints
    complaints = profile.get("complaints", [])
    if complaints:
        elements.append(Paragraph("Beschwerden" if lang == "de" else "Disturbi", h2_style))
        for c in complaints:
            name = c.get("name", "")
            intensity = c.get("intensity", "?")
            elements.append(Paragraph(f"- {name} ({('Intensitaet' if lang == 'de' else 'Intensita')}: {intensity}/10)", body_style))

    # Deficiencies
    assessment = profile.get("assessment", {})
    deficiencies = assessment.get("deficiencies", [])
    if deficiencies:
        elements.append(Paragraph("Naehrstoff-Risiken" if lang == "de" else "Rischi nutrizionali", h2_style))
        risk_colors = {"high": "#dc2626", "medium": "#f59e0b", "low": "#22c55e"}
        for d in deficiencies:
            risk = d.get("risk_level", "medium")
            color = risk_colors.get(risk, "#666")
            risk_label = {"high": "HOCH" if lang == "de" else "ALTO", "medium": "MITTEL" if lang == "de" else "MEDIO", "low": "NIEDRIG" if lang == "de" else "BASSO"}.get(risk, risk)
            elements.append(Paragraph(
                f'- {d.get("name", "")} — <font color="{color}"><b>{risk_label}</b></font>',
                body_style
            ))

    # Health Score
    if score_data:
        elements.append(Paragraph("Health Score" if lang == "de" else "Punteggio Salute", h2_style))
        score = score_data.get("score", "?")
        label = score_data.get("label", "")
        elements.append(Paragraph(f"<b>{score}/100</b> — {label}", body_style))
        rec = score_data.get("recommendation", "")
        if rec:
            elements.append(Paragraph(rec, body_style))

    # Supplement Plan
    stack = plan.get("stack", [])
    if stack:
        elements.append(Paragraph("Supplement-Einnahmeplan (8 Wochen)" if lang == "de" else "Piano supplementi (8 settimane)", h2_style))

        header = [
            "Supplement" if lang == "de" else "Supplemento",
            "Dosierung" if lang == "de" else "Dosaggio",
            "Zeitpunkt" if lang == "de" else "Momento",
            "Evidenz" if lang == "de" else "Evidenza",
        ]
        table_data = [header]
        for s in stack:
            table_data.append([
                s.get("name", ""),
                f"{s.get('dosage', '')} {s.get('unit', '')}",
                s.get("timing_label", ""),
                s.get("evidence_label", ""),
            ])

        t = Table(table_data, colWidths=[50*mm, 35*mm, 35*mm, 40*mm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a5632')),
            ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f8faf9'), HexColor('#ffffff')]),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 4*mm))

        # Details per supplement
        for s in stack:
            elements.append(Paragraph(f"<b>{s.get('name','')}</b>", body_style))
            if s.get("reason"):
                elements.append(Paragraph(f"  {s['reason']}", small_style))
            if s.get("with_food_label"):
                food_label = "Einnahme" if lang == "de" else "Assunzione"
                elements.append(Paragraph(f"  {food_label}: {s['with_food_label']}", small_style))
            elements.append(Spacer(1, 2*mm))

    # Phases
    phases = plan.get("phases", [])
    if phases:
        elements.append(Paragraph("Phasen" if lang == "de" else "Fasi", h2_style))
        for p in phases:
            elements.append(Paragraph(f"<b>{p.get('weeks','')}: {p.get('title','')}</b>", body_style))
            elements.append(Paragraph(p.get("description", ""), small_style))

    # Warnings
    warnings = plan.get("warnings", [])
    if warnings:
        elements.append(Paragraph("Warnhinweise" if lang == "de" else "Avvertenze", h2_style))
        for w in warnings:
            elements.append(Paragraph(f"- {w}", body_style))

    # Disclaimer
    elements.append(Spacer(1, 10*mm))
    disclaimer = ("Dieser Bericht dient nur der Information und ersetzt keine aerztliche Beratung. "
                   "Bitte konsultieren Sie Ihren Arzt bevor Sie Nahrungsergaenzungsmittel einnehmen."
                   if lang == "de" else
                   "Questo rapporto e solo a scopo informativo e non sostituisce il parere medico. "
                   "Si prega di consultare il medico prima di assumere integratori.")
    elements.append(Paragraph(disclaimer, small_style))

    doc.build(elements)
    return buf.getvalue()


# ==================== HTML EMAIL ====================

def _generate_html_email(profile: dict, plan: dict, score_data: dict, lang: str) -> str:
    """Generate a beautiful HTML email with health data."""
    age = profile.get("age", "?")
    gender_map = {"male": "Maennlich" if lang == "de" else "Maschile", "female": "Weiblich" if lang == "de" else "Femminile"}
    gender = gender_map.get(profile.get("gender", ""), "?")

    # Build complaints HTML
    complaints = profile.get("complaints", [])
    complaints_html = ""
    for c in complaints:
        complaints_html += f'<li>{c.get("name", "")} ({"Intensitaet" if lang == "de" else "Intensita"}: {c.get("intensity", "?")}/10)</li>'

    # Build deficiencies HTML
    deficiencies = profile.get("assessment", {}).get("deficiencies", [])
    deficiencies_html = ""
    risk_colors = {"high": "#dc2626", "medium": "#f59e0b", "low": "#22c55e"}
    risk_labels = {"high": "HOCH" if lang == "de" else "ALTO", "medium": "MITTEL" if lang == "de" else "MEDIO", "low": "NIEDRIG" if lang == "de" else "BASSO"}
    for d in deficiencies:
        color = risk_colors.get(d.get("risk_level", "medium"), "#666")
        rlabel = risk_labels.get(d.get("risk_level", "medium"), "?")
        deficiencies_html += f'<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">{d.get("name","")}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center"><span style="color:{color};font-weight:700">{rlabel}</span></td></tr>'

    # Build supplement table
    stack = plan.get("stack", [])
    supplements_html = ""
    for s in stack:
        supplements_html += f'''<tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb"><b>{s.get("name","")}</b></td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">{s.get("dosage","")} {s.get("unit","")}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">{s.get("timing_label","")}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">{s.get("with_food_label","")}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb"><span style="color:#1a5632">{s.get("evidence_label","")}</span></td>
        </tr>'''

    # Build supplement details
    details_html = ""
    for s in stack:
        reason = s.get("reason", "")
        side_effects = s.get("side_effects", [])
        se_text = ", ".join(side_effects) if side_effects else ("-" if lang == "de" else "-")
        details_html += f'''<div style="background:#f0fdf4;border-left:4px solid #1a5632;padding:12px 16px;margin-bottom:8px;border-radius:0 8px 8px 0">
            <b>{s.get("name","")}</b><br>
            <span style="color:#555;font-size:13px">{reason}</span><br>
            <span style="color:#888;font-size:12px">{"Nebenwirkungen" if lang == "de" else "Effetti collaterali"}: {se_text}</span>
        </div>'''

    # Phases
    phases_html = ""
    for p in plan.get("phases", []):
        phases_html += f'''<div style="background:#f8fafc;padding:12px 16px;margin-bottom:6px;border-radius:8px;border:1px solid #e2e8f0">
            <b>{p.get("weeks","")}: {p.get("title","")}</b><br>
            <span style="color:#555;font-size:13px">{p.get("description","")}</span>
        </div>'''

    # Warnings
    warnings_html = ""
    for w in plan.get("warnings", []):
        warnings_html += f'<li style="color:#b91c1c;margin-bottom:4px">{w}</li>'

    # Score
    score = score_data.get("score", "?") if score_data else "?"
    score_label = score_data.get("label", "") if score_data else ""
    score_rec = score_data.get("recommendation", "") if score_data else ""

    date_str = datetime.now().strftime("%d.%m.%Y" if lang == "de" else "%d/%m/%Y")

    html = f'''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#ffffff">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a5632,#22803d);padding:32px 24px;text-align:center">
        <h1 style="color:#ffffff;margin:0;font-size:24px">{"Dein Gesundheitsbericht" if lang == "de" else "Il tuo rapporto sulla salute"}</h1>
        <p style="color:#a7f3d0;margin:8px 0 0;font-size:14px">{"Erstellt am" if lang == "de" else "Creato il"} {date_str}</p>
    </div>

    <div style="padding:24px">

        <!-- Health Score -->
        <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#1a5632,#22803d);line-height:100px;text-align:center">
                <span style="color:#fff;font-size:32px;font-weight:700">{score}</span>
            </div>
            <p style="color:#1a5632;font-weight:600;margin:8px 0 4px">Health Score</p>
            <p style="color:#555;font-size:14px;margin:0">{score_label}</p>
            {f'<p style="color:#888;font-size:13px;margin:4px 0 0">{score_rec}</p>' if score_rec else ''}
        </div>

        <!-- Profile -->
        <h2 style="color:#1a5632;font-size:18px;border-bottom:2px solid #1a5632;padding-bottom:8px">{"Gesundheitsprofil" if lang == "de" else "Profilo salute"}</h2>
        <table style="width:100%;font-size:14px;margin-bottom:16px">
            <tr><td style="padding:6px 0;color:#555;width:40%"><b>{"Alter" if lang == "de" else "Eta"}</b></td><td>{age}</td></tr>
            <tr><td style="padding:6px 0;color:#555"><b>{"Geschlecht" if lang == "de" else "Sesso"}</b></td><td>{gender}</td></tr>
            <tr><td style="padding:6px 0;color:#555"><b>{"Ernaehrung" if lang == "de" else "Alimentazione"}</b></td><td>{profile.get("diet","?")}</td></tr>
            <tr><td style="padding:6px 0;color:#555"><b>{"Schlaf" if lang == "de" else "Sonno"}</b></td><td>{profile.get("sleep_quality","?")}/10</td></tr>
            <tr><td style="padding:6px 0;color:#555"><b>{"Stress" if lang == "de" else "Stress"}</b></td><td>{profile.get("stress_level","?")}/10</td></tr>
        </table>

        {f"""<h3 style="color:#555;font-size:15px">{"Beschwerden" if lang == "de" else "Disturbi"}</h3><ul style="color:#333;font-size:14px">{complaints_html}</ul>""" if complaints_html else ""}

        <!-- Deficiencies -->
        {f"""<h2 style="color:#1a5632;font-size:18px;border-bottom:2px solid #1a5632;padding-bottom:8px">{"Naehrstoff-Risiken" if lang == "de" else "Rischi nutrizionali"}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
            <tr style="background:#f0fdf4"><th style="padding:8px 12px;text-align:left">{"Naehrstoff" if lang == "de" else "Nutriente"}</th><th style="padding:8px 12px;text-align:center">{"Risiko" if lang == "de" else "Rischio"}</th></tr>
            {deficiencies_html}
        </table>""" if deficiencies_html else ""}

        <!-- Supplement Plan -->
        <h2 style="color:#1a5632;font-size:18px;border-bottom:2px solid #1a5632;padding-bottom:8px">{"Supplement-Einnahmeplan (8 Wochen)" if lang == "de" else "Piano supplementi (8 settimane)"}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
            <tr style="background:#1a5632;color:#fff">
                <th style="padding:10px 12px;text-align:left">{"Supplement" if lang == "de" else "Supplemento"}</th>
                <th style="padding:10px 12px;text-align:left">{"Dosierung" if lang == "de" else "Dosaggio"}</th>
                <th style="padding:10px 12px;text-align:left">{"Zeitpunkt" if lang == "de" else "Momento"}</th>
                <th style="padding:10px 12px;text-align:left">{"Einnahme" if lang == "de" else "Assunzione"}</th>
                <th style="padding:10px 12px;text-align:left">{"Evidenz" if lang == "de" else "Evidenza"}</th>
            </tr>
            {supplements_html}
        </table>

        <!-- Details -->
        <h3 style="color:#1a5632;font-size:15px;margin-bottom:8px">{"Details pro Supplement" if lang == "de" else "Dettagli per supplemento"}</h3>
        {details_html}

        <!-- Phases -->
        {f"""<h2 style="color:#1a5632;font-size:18px;border-bottom:2px solid #1a5632;padding-bottom:8px;margin-top:24px">{"Phasen" if lang == "de" else "Fasi"}</h2>{phases_html}""" if phases_html else ""}

        <!-- Warnings -->
        {f"""<h3 style="color:#b91c1c;font-size:15px;margin-top:16px">{"Warnhinweise" if lang == "de" else "Avvertenze"}</h3><ul>{warnings_html}</ul>""" if warnings_html else ""}

    </div>

    <!-- Footer -->
    <div style="background:#f1f5f9;padding:20px 24px;text-align:center;font-size:12px;color:#888">
        <p style="margin:0">{"Dieser Bericht dient nur der Information und ersetzt keine aerztliche Beratung." if lang == "de" else "Questo rapporto e solo a scopo informativo e non sostituisce il parere medico."}</p>
        <p style="margin:8px 0 0;color:#aaa">VitaGuide - {"Dein persoenlicher Gesundheitsberater" if lang == "de" else "Il tuo consulente di salute personale"}</p>
    </div>

</div>
</body>
</html>'''
    return html


# ==================== SMTP SEND ====================

def _send_email(to_email: str, subject: str, html_body: str, pdf_bytes: bytes, pdf_filename: str):
    """Send email via SMTP with PDF attachment."""
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    smtp_from = os.environ.get("SMTP_FROM")

    msg = MIMEMultipart("mixed")
    msg["From"] = f"VitaGuide <{smtp_from}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    # HTML body
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    # PDF attachment
    pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_part.add_header("Content-Disposition", "attachment", filename=pdf_filename)
    msg.attach(pdf_part)

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, to_email, msg.as_string())

    logger.info(f"Email sent to {to_email}")


# ==================== ENDPOINT ====================

@router.post("/export/email")
async def export_health_data_email(req: EmailExportRequest):
    """Send health data + supplement plan via email with PDF attachment."""
    lang = req.lang if req.lang in ("de", "it") else "de"

    # Fetch profile
    profile = await db.health_profiles.find_one(
        {"$or": [{"profile_id": req.profile_id}, {"id": req.profile_id}]},
        {"_id": 0}
    )
    if not profile:
        detail = "Profil nicht gefunden" if lang == "de" else "Profilo non trovato"
        raise HTTPException(status_code=404, detail=detail)

    # Load existing supplement plan from DB
    pid = profile.get("id") or profile.get("profile_id") or req.profile_id
    plan_doc = await db.supplement_plans.find_one(
        {"profile_id": pid},
        {"_id": 0}
    )
    plan = plan_doc.get("plan", {}) if plan_doc else {}

    # Try to get health score
    score_data = None
    try:
        from routes.health_score import _base_score, _ai_assessment
        base = _base_score(profile, [], [])
        total = base.pop("total")
        ai = await _ai_assessment(total, base, profile, lang)
        score_data = {"score": total, "label": ai.get("label", ""), "recommendation": ai.get("recommendation", "")}
    except Exception as e:
        logger.warning(f"Could not generate health score for email: {e}")
        score_data = {"score": "?", "label": "", "recommendation": ""}

    # Generate HTML email
    html_body = _generate_html_email(profile, plan, score_data, lang)

    # Generate PDF
    pdf_bytes = _generate_pdf(profile, plan, score_data, lang)
    pdf_filename = f"VitaGuide_Gesundheitsbericht_{datetime.now().strftime('%Y%m%d')}.pdf" if lang == "de" else f"VitaGuide_Rapporto_Salute_{datetime.now().strftime('%Y%m%d')}.pdf"

    # Send email
    try:
        subject = "Dein VitaGuide Gesundheitsbericht" if lang == "de" else "Il tuo rapporto VitaGuide sulla salute"
        _send_email(req.email, subject, html_body, pdf_bytes, pdf_filename)
    except Exception as e:
        logger.error(f"Email sending failed: {e}")
        detail = f"E-Mail konnte nicht gesendet werden: {str(e)}" if lang == "de" else f"Impossibile inviare e-mail: {str(e)}"
        raise HTTPException(status_code=500, detail=detail)

    return {
        "status": "sent",
        "message": f"Bericht an {req.email} gesendet" if lang == "de" else f"Rapporto inviato a {req.email}"
    }
