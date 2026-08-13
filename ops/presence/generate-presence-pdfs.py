#!/usr/bin/env python3
"""Generate Presence OS PDF guides from ops/presence markdown SSOT (reportlab)."""
from __future__ import annotations

import re
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "pdf"
TODAY = date.today().strftime("%B %d, %Y")

INK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#475569")
TEAL = colors.HexColor("#0f766e")
LINE = colors.HexColor("#cbd5e1")
WARN = colors.HexColor("#b45309")
WARN_BG = colors.HexColor("#fff7ed")


GUIDES = [
    {
        "md": "DAILY_OPERATOR_LOOP.md",
        "pdf": "Daily_Operator_Guide.pdf",
        "title": "Daily Operator Guide",
        "subtitle": "MSP + NetOps Quality + ME Manager Presence — one loop",
    },
    {
        "md": "NETOPS_FLEET.md",
        "pdf": "NetOps_Cleaner_Quality_Guide.pdf",
        "title": "NetOps & Cleaner Quality",
        "subtitle": "Journey 1 — home → issues → Quality → pending_high",
    },
    {
        "md": "GAMES_PIPELINE.md",
        "pdf": "Forge_Games_Ship_Guide.pdf",
        "title": "Forge, Games & Ship",
        "subtitle": "Uncle Jon portfolio, Studio approve, ship hooks",
    },
    {
        "md": "VOICE_CLONE.md",
        "pdf": "Voice_Clone_Video_Studio_Guide.pdf",
        "title": "Voice Clone & Video Studio",
        "subtitle": "Record → upload → train jon-v1 → Video Studio",
    },
    {
        "md": "JACOB_BOOKS.md",
        "pdf": "Content_Properties_Guide.pdf",
        "title": "Content Properties Guide",
        "subtitle": "Personas, isolation, demos, novel teasers",
        "extra_md": ["DEMOS_MSP.md", "MONETIZATION_READINESS.md"],
    },
    {
        "md": "UNCLEJON_DEPLOY.md",
        "pdf": "Uncle_Jon_Site_Panel_Guide.pdf",
        "title": "Uncle Jon Site & Panel",
        "subtitle": "Marketing site + CtrlPanel after cutover",
    },
    {
        "md": "JACOB_BOOKS.md",
        "pdf": "Jacob_Lost_in_Thought_Guide.pdf",
        "title": "Jacob Roman & Lost in Thought",
        "subtitle": "Novel teasers, LiT ship, Approve/schedule only",
    },
]


def styles():
    base = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle(
            "brand", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=12, textColor=TEAL, alignment=TA_CENTER, spaceAfter=8,
        ),
        "title": ParagraphStyle(
            "title", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=24, textColor=INK, alignment=TA_CENTER, leading=30, spaceAfter=10,
        ),
        "sub": ParagraphStyle(
            "sub", parent=base["Normal"], fontName="Helvetica",
            fontSize=11, textColor=MUTED, alignment=TA_CENTER, leading=16, spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"], fontName="Helvetica-Bold",
            fontSize=16, textColor=INK, spaceBefore=14, spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=13, textColor=TEAL, spaceBefore=10, spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "h3", parent=base["Heading3"], fontName="Helvetica-Bold",
            fontSize=11, textColor=INK, spaceBefore=8, spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, textColor=INK, leading=14, alignment=TA_JUSTIFY, spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "bullet", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, textColor=INK, leading=13, leftIndent=8,
        ),
        "warn": ParagraphStyle(
            "warn", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, textColor=WARN, leading=13, spaceAfter=6,
        ),
        "meta": ParagraphStyle(
            "meta", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, textColor=MUTED, alignment=TA_CENTER,
        ),
        "code": ParagraphStyle(
            "code", parent=base["Code"], fontName="Courier",
            fontSize=8, textColor=INK, leading=11, spaceAfter=6, backColor=colors.HexColor("#f8fafc"),
        ),
    }


def esc(s: str) -> str:
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # lightweight markdown inline
    s = re.sub(r"`([^`]+)`", r"<font face='Courier' size='9'>\1</font>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<link href='\2' color='#0f766e'>\1</link>", s)
    return s


def cover(story, s, title: str, subtitle: str):
    story.append(Spacer(1, 1.4 * inch))
    story.append(Paragraph("KECKTECH · PRESENCE OS", s["brand"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(esc(title), s["title"]))
    story.append(Paragraph(esc(subtitle), s["sub"]))
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="60%", thickness=1, color=TEAL, spaceBefore=4, spaceAfter=12))
    story.append(Paragraph(f"Operator guide · {TODAY}", s["meta"]))
    story.append(Paragraph("Daily workflow only — Approve, never auto-publish.", s["meta"]))
    story.append(PageBreak())


def callout(story, s, text: str):
    data = [[Paragraph(esc(text), s["warn"])]]
    t = Table(data, colWidths=[6.5 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WARN_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, WARN),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.12 * inch))


def flush_list(story, s, items: list[str], ordered: bool):
    if not items:
        return
    flow = ListFlowable(
        [ListItem(Paragraph(esc(i), s["bullet"]), leftIndent=12, bulletColor=TEAL) for i in items],
        bulletType="1" if ordered else "bullet",
        start="1",
    )
    story.append(flow)
    story.append(Spacer(1, 0.08 * inch))


def md_to_flowables(text: str, s):
    story = []
    lines = text.splitlines()
    i = 0
    bullets: list[str] = []
    ordered: list[str] = []
    in_code = False
    code_buf: list[str] = []

    def flush():
        nonlocal bullets, ordered
        flush_list(story, s, bullets, False)
        flush_list(story, s, ordered, True)
        bullets = []
        ordered = []

    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("```"):
            flush()
            if in_code:
                story.append(Paragraph(esc("\n".join(code_buf)), s["code"]))
                code_buf = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        if line.startswith("# "):
            flush()
            # skip document H1 (used on cover)
            i += 1
            continue
        if line.startswith("## "):
            flush()
            story.append(Paragraph(esc(line[3:].strip()), s["h1"]))
            i += 1
            continue
        if line.startswith("### "):
            flush()
            story.append(Paragraph(esc(line[4:].strip()), s["h2"]))
            i += 1
            continue
        if line.startswith("#### "):
            flush()
            story.append(Paragraph(esc(line[5:].strip()), s["h3"]))
            i += 1
            continue
        if re.match(r"^\s*[-*]\s+", line):
            if ordered:
                flush_list(story, s, ordered, True)
                ordered = []
            bullets.append(re.sub(r"^\s*[-*]\s+", "", line))
            i += 1
            continue
        if re.match(r"^\s*\d+\.\s+", line):
            if bullets:
                flush_list(story, s, bullets, False)
                bullets = []
            ordered.append(re.sub(r"^\s*\d+\.\s+", "", line))
            i += 1
            continue
        if line.strip().startswith(">"):
            flush()
            callout(story, s, line.strip().lstrip(">").strip())
            i += 1
            continue
        if line.strip() == "---":
            flush()
            story.append(HRFlowable(width="100%", thickness=0.5, color=LINE, spaceBefore=6, spaceAfter=8))
            i += 1
            continue
        if not line.strip():
            flush()
            i += 1
            continue
        # table rows — render as body lines for simplicity
        if line.strip().startswith("|"):
            flush()
            if re.match(r"^\|?\s*-+", line.strip()):
                i += 1
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            story.append(Paragraph(esc(" · ".join(cells)), s["body"]))
            i += 1
            continue

        flush()
        # warn markers
        low = line.lower()
        if "never auto" in low or "jon-only" in low or "honest" in low or "simulated" in low:
            callout(story, s, line.strip())
        else:
            story.append(Paragraph(esc(line.strip()), s["body"]))
        i += 1

    flush()
    if in_code and code_buf:
        story.append(Paragraph(esc("\n".join(code_buf)), s["code"]))
    return story


def build_from_markdown(guide: dict) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / guide["pdf"]
    s = styles()
    doc = SimpleDocTemplate(
        str(path), pagesize=letter,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        topMargin=0.7 * inch, bottomMargin=0.7 * inch,
        title=guide["title"], author="Kecktech Presence OS",
    )
    story = []
    cover(story, s, guide["title"], guide["subtitle"])

    md_files = [guide["md"]] + list(guide.get("extra_md") or [])
    # TOC
    story.append(Paragraph("Contents (from markdown SSOT)", s["h1"]))
    for name in md_files:
        story.append(Paragraph(esc(f"• {name}"), s["body"]))
    story.append(PageBreak())

    for idx, name in enumerate(md_files):
        md_path = ROOT / name
        if not md_path.exists():
            callout(story, s, f"Missing markdown SSOT: {name}")
            continue
        if idx:
            story.append(PageBreak())
        story.append(Paragraph(esc(f"Source: {name}"), s["meta"]))
        story.append(Spacer(1, 0.15 * inch))
        story.extend(md_to_flowables(md_path.read_text(encoding="utf-8"), s))

    # Honesty footer for every guide
    story.append(Spacer(1, 0.2 * inch))
    callout(
        story,
        s,
        "Entry point: Daily_Operator_Guide.pdf. Live URLs: me.willworkforlunch.com, "
        "net-ops.kecktech.net (hyphen), www.unclejonsitgarage.com, panel.unclejonsitgarage.com. "
        "siteKey unclejon (not uncle-jons). Email onboard: dash.kecktech.net/ops/email-onboard.",
    )
    doc.build(story)
    return path


def write_readme():
    (ROOT / "README.md").write_text(
        """# Presence OS — operator entry

**Start here (PDFs):** [pdf/](./pdf/)

| PDF | Use |
|-----|-----|
| Daily_Operator_Guide.pdf | Every business day |
| NetOps_Cleaner_Quality_Guide.pdf | Fleet / Quality detail |
| Forge_Games_Ship_Guide.pdf | Games + Forge Studio |
| Voice_Clone_Video_Studio_Guide.pdf | Voice sessions |
| Content_Properties_Guide.pdf | Personas + novel paths |
| Uncle_Jon_Site_Panel_Guide.pdf | www + panel. URLs |
| Jacob_Lost_in_Thought_Guide.pdf | Author teasers + LiT |

Markdown in this folder is the editable SSOT. Regenerate PDFs:

```powershell
python ops/presence/generate-presence-pdfs.py
```

Root `Daily_Operations_Guide.pdf` / `Close_the_Gaps_Operator_Guide.pdf` are **SUPERSEDED** — use `ops/presence/pdf/` only.

Daily work remaining after closeout: Inbox Approve, NetOps Accept/Dismiss, Forge Studio approve, voice recording sessions, outreach. No separate setup dump.
""",
        encoding="utf-8",
    )


def main():
    write_readme()
    for g in GUIDES:
        p = build_from_markdown(g)
        print(f"{p.name}\t{p.stat().st_size}")


if __name__ == "__main__":
    main()
