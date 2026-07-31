#!/usr/bin/env python3
"""Generate the one-page systems resume from the shared evidence manifest."""

import json
import shutil
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data/evidence.json").read_text())
OUT = ROOT / "output/pdf/Aaryan-Patel-Systems-Resume.pdf"
PUBLIC = ROOT / "public/resume/Aaryan-Patel-Systems-Resume.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)
PUBLIC.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = LETTER
NAVY = HexColor("#050913")
SHELL = HexColor("#0b1220")
INK = HexColor("#0c1728")
MUTED = HexColor("#53677f")
CYAN = HexColor("#007d9d")
GREEN = HexColor("#087a4c")
LINE = HexColor("#d5dfeb")
PAPER = HexColor("#f4f7fb")


def draw_text(c, text, x, y, font="Helvetica", size=9, color=INK):
    text = str(text).replace("–", "-").replace("—", "-").replace("‑", "-").replace("°", " degrees")
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, text)


def wrap(text, font, size, width):
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if line and stringWidth(candidate, font, size) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def paragraph(c, text, x, y, width, font="Helvetica", size=8.4, leading=11, color=MUTED, max_lines=None):
    lines = wrap(text, font, size, width)
    if max_lines:
        lines = lines[:max_lines]
    for line in lines:
        draw_text(c, line, x, y, font, size, color)
        y -= leading
    return y


def section_label(c, text, x, y, width):
    draw_text(c, text.upper(), x, y, "Courier-Bold", 7.5, CYAN)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(x, y - 6, x + width, y - 6)
    return y - 18


def project_block(c, project, x, y, width):
    draw_text(c, project["name"], x, y, "Helvetica-Bold", 11, INK)
    metric = f'{project["metric"]} {project["metricLabel"]}'
    c.setFillColor(GREEN)
    c.setFont("Courier-Bold", 7.2)
    c.drawRightString(x + width, y, metric)
    c.setFillColor(CYAN)
    c.rect(x, y - 5, 2, 2, fill=1, stroke=0)
    y = paragraph(c, project["tagline"], x, y - 14, width, size=8.2, leading=10.5, color=MUTED, max_lines=2)
    y = paragraph(c, f'Proof: {project["proof"]}', x, y - 1, width, size=7.8, leading=10, color=INK, max_lines=2)
    return y - 10


c = canvas.Canvas(str(OUT), pagesize=LETTER)
c.setTitle("Aaryan Patel - Systems and ML Infrastructure Resume")
c.setAuthor("Aaryan Patel")
c.setSubject("Evidence-backed systems engineering portfolio resume")

c.setFillColor(NAVY)
c.rect(0, PAGE_H - 132, PAGE_W, 132, fill=1, stroke=0)
c.setFillColor(HexColor("#39d9f9"))
c.rect(38, PAGE_H - 132, 128, 3, fill=1, stroke=0)
draw_text(c, DATA["owner"]["name"], 38, PAGE_H - 54, "Helvetica-Bold", 26, HexColor("#f4f7fb"))
draw_text(c, DATA["owner"]["role"].upper(), 38, PAGE_H - 78, "Courier-Bold", 9, HexColor("#39d9f9"))
paragraph(c, DATA["thesis"], 38, PAGE_H - 100, 350, "Helvetica", 9.5, 12, HexColor("#b6c4d8"), 2)
draw_text(c, DATA["owner"]["email"], 418, PAGE_H - 53, "Courier", 7.6, HexColor("#eaf1fb"))
draw_text(c, "github.com/asp53826", 418, PAGE_H - 70, "Courier", 7.6, HexColor("#eaf1fb"))
draw_text(c, "asp53826.github.io", 418, PAGE_H - 87, "Courier", 7.6, HexColor("#eaf1fb"))
draw_text(c, "linkedin.com/in/aaryanpatelsystems", 418, PAGE_H - 104, "Courier", 7.0, HexColor("#eaf1fb"))

left_x, left_w = 38, 344
right_x, right_w = 405, 169
left_y = PAGE_H - 160
right_y = PAGE_H - 160

left_y = section_label(c, "Selected systems", left_x, left_y, left_w)
for project_id in ("raft-mvcc", "edgar-mcp", "track-fusion"):
    project = next(item for item in DATA["projects"] if item["id"] == project_id)
    left_y = project_block(c, project, left_x, left_y, left_w)

left_y = section_label(c, "Additional measured work", left_x, left_y + 2, left_w)
additional = [
    ("columnar-engine", "53.1M rows/s; 6,288 assertions; 1.94x scalar filters"),
    ("annlite", "1.83x FAISS at 0.999 recall; exact-recall curve"),
    ("vio-nav", "51.9x lower drift at 40 seconds; publishes hover failure"),
    ("vllm-lite", "94% vs 21% KV utilization; 90 tests"),
    ("dst-harness", "12/12 planted defects; 2,000-seed clean control"),
]
for project_id, proof in additional:
    project = next(item for item in DATA["projects"] if item["id"] == project_id)
    draw_text(c, project["name"], left_x, left_y, "Helvetica-Bold", 9, INK)
    left_y = paragraph(c, proof, left_x + 104, left_y, left_w - 104, "Helvetica", 7.8, 9.6, MUTED, 2) - 6

left_y = section_label(c, "Evidence standard", left_x, left_y + 2, left_w)
evidence_points = [
    "Every metric names its units and comparison baseline.",
    "Every flagship result includes a clone-and-test command.",
    "Failure boundaries stay beside the claim instead of in fine print.",
    "External oracles are preferred where they exist: analytic theory, FAISS, torch.distributed, CaDiCaL, and drat-trim.",
]
for point in evidence_points:
    draw_text(c, "-", left_x, left_y, "Helvetica-Bold", 8, CYAN)
    left_y = paragraph(c, point, left_x + 12, left_y, left_w - 12, size=7.8, leading=9.8, color=MUTED, max_lines=2) - 3

left_y = section_label(c, "Technical range", left_x, left_y + 3, left_w)
range_rows = [
    ("SYSTEMS", "Raft, MVCC, WAL, LSM/SSTables, SIMD, SAT solving"),
    ("ML INFRA", "PyTorch collectives, HNSW, paged KV, retrieval evaluation"),
    ("SIGNAL", "SAR, Kalman/IMM, JPDA, MSCKF, QPSK/LDPC"),
    ("FINANCE", "SEC EDGAR, XBRL, limit order books, AAD Greeks"),
]
for label, value in range_rows:
    draw_text(c, label, left_x, left_y, "Courier-Bold", 7, CYAN)
    left_y = paragraph(c, value, left_x + 62, left_y, left_w - 62, size=7.5, leading=9.2, color=MUTED, max_lines=2) - 4

right_y = section_label(c, "Engineering contract", right_x, right_y, right_w)
right_y = paragraph(c, DATA["contract"], right_x, right_y, right_w, "Helvetica-Bold", 8.4, 11, INK, 5) - 12

right_y = section_label(c, "Core methods", right_x, right_y, right_w)
methods = [
    "C++17 and Python",
    "Distributed systems",
    "MVCC and storage engines",
    "Fault injection",
    "Linearizability checking",
    "Differential testing",
    "Numerical and analytic oracles",
    "ML inference and retrieval",
    "Signal processing and estimation",
    "Financial data infrastructure",
]
for method in methods:
    draw_text(c, f"- {method}", right_x, right_y, "Helvetica", 7.8, MUTED)
    right_y -= 11
right_y -= 8

right_y = section_label(c, "Current work", right_x, right_y, right_w)
draw_text(c, "MP Equipment", right_x, right_y, "Helvetica-Bold", 9.2, INK)
right_y = paragraph(c, "Automation and analytics: dashboards, ERP workflows, and AR/AI for industrial food processing.", right_x, right_y - 13, right_w, size=7.8, leading=10, color=MUTED, max_lines=5) - 10

right_y = section_label(c, "Education", right_x, right_y, right_w)
draw_text(c, "University of Georgia", right_x, right_y, "Helvetica-Bold", 9.2, INK)
right_y = paragraph(c, "Computer Science undergraduate", right_x, right_y - 13, right_w, size=7.8, leading=10, color=MUTED, max_lines=2) - 12

right_y = section_label(c, "Recruiter routes", right_x, right_y, right_w)
for route in DATA["routes"]:
    draw_text(c, route["label"], right_x, right_y, "Helvetica-Bold", 8.3, INK)
    right_y = paragraph(c, " / ".join(route["projects"]), right_x, right_y - 11, right_w, "Courier", 6.7, 8.5, MUTED, 3) - 6

c.setStrokeColor(LINE)
c.line(38, 42, PAGE_W - 38, 42)
draw_text(c, "Every headline metric resolves to a public command, source path, proof method, and failure boundary.", 38, 27, "Courier", 6.8, MUTED)
draw_text(c, "UPDATED 2026-07-31", PAGE_W - 38 - 92, 27, "Courier-Bold", 6.8, CYAN)

c.save()
shutil.copy2(OUT, PUBLIC)
print(f"wrote {OUT}")
print(f"wrote {PUBLIC}")


ROUTE_ACCENTS = {
    "systems": HexColor("#007d9d"),
    "quant": HexColor("#976000"),
    "defense": HexColor("#087a4c"),
    "ml-infrastructure": HexColor("#6a54b8"),
}

ROUTE_FILENAMES = {
    "systems": "Aaryan-Patel-Systems-Recruiter-Packet.pdf",
    "quant": "Aaryan-Patel-Quant-Recruiter-Packet.pdf",
    "defense": "Aaryan-Patel-Defense-Recruiter-Packet.pdf",
    "ml-infrastructure": "Aaryan-Patel-ML-Infrastructure-Recruiter-Packet.pdf",
}


def route_packet(route):
    accent = ROUTE_ACCENTS[route["id"]]
    filename = ROUTE_FILENAMES[route["id"]]
    output = ROOT / "output/pdf" / filename
    public = ROOT / "public/recruiter" / f'{route["id"]}.pdf'
    public.parent.mkdir(parents=True, exist_ok=True)
    projects = [next(item for item in DATA["projects"] if item["id"] == project_id) for project_id in route["projects"]]
    packet = canvas.Canvas(str(output), pagesize=LETTER)
    packet.setTitle(f'Aaryan Patel - {route["label"]} Recruiter Packet')
    packet.setAuthor("Aaryan Patel")
    packet.setSubject("Source-backed recruiter route with verification commands and failure boundaries")

    packet.setFillColor(NAVY)
    packet.rect(0, PAGE_H - 162, PAGE_W, 162, fill=1, stroke=0)
    packet.setFillColor(accent)
    packet.rect(38, PAGE_H - 162, 154, 4, fill=1, stroke=0)
    draw_text(packet, f'{route["short"]} RECRUITER SIGNAL', 38, PAGE_H - 46, "Courier-Bold", 8, accent)
    draw_text(packet, route["label"], 38, PAGE_H - 82, "Helvetica-Bold", 28, HexColor("#f4f7fb"))
    paragraph(packet, route["summary"], 38, PAGE_H - 105, 350, "Helvetica", 10, 13, HexColor("#b6c4d8"), 2)
    draw_text(packet, "AARYAN PATEL", 426, PAGE_H - 47, "Helvetica-Bold", 12, HexColor("#f4f7fb"))
    draw_text(packet, DATA["owner"]["role"], 426, PAGE_H - 65, "Helvetica", 7.5, HexColor("#b6c4d8"))
    draw_text(packet, DATA["owner"]["email"], 426, PAGE_H - 87, "Courier", 7.2, HexColor("#eaf1fb"))
    draw_text(packet, "asp53826.github.io", 426, PAGE_H - 103, "Courier", 7.2, HexColor("#eaf1fb"))
    draw_text(packet, "github.com/asp53826", 426, PAGE_H - 119, "Courier", 7.2, HexColor("#eaf1fb"))

    y = PAGE_H - 191
    draw_text(packet, "THREE SYSTEMS TO INSPECT", 38, y, "Courier-Bold", 7.5, accent)
    packet.setStrokeColor(LINE)
    packet.line(38, y - 7, PAGE_W - 38, y - 7)
    y -= 28

    for index, project in enumerate(projects, start=1):
        top = y
        packet.setFillColor(PAPER)
        packet.roundRect(38, top - 136, PAGE_W - 76, 124, 7, fill=1, stroke=0)
        packet.setStrokeColor(LINE)
        packet.roundRect(38, top - 136, PAGE_W - 76, 124, 7, fill=0, stroke=1)
        packet.setFillColor(accent)
        packet.circle(56, top - 32, 10, fill=1, stroke=0)
        draw_text(packet, f"{index:02d}", 50, top - 35, "Courier-Bold", 7, HexColor("#ffffff"))
        draw_text(packet, project["name"], 76, top - 29, "Helvetica-Bold", 13, INK)
        draw_text(packet, project["language"], 76, top - 43, "Courier-Bold", 6.8, accent)
        packet.setFillColor(GREEN)
        packet.setFont("Helvetica-Bold", 15)
        packet.drawRightString(PAGE_W - 54, top - 29, project["metric"])
        packet.setFillColor(MUTED)
        packet.setFont("Courier", 6.4)
        packet.drawRightString(PAGE_W - 54, top - 43, project["metricLabel"].upper())
        paragraph(packet, project["proof"], 56, top - 64, 300, "Helvetica", 8, 10, INK, 3)
        draw_text(packet, "FAILURE BOUNDARY", 380, top - 64, "Courier-Bold", 6.7, accent)
        paragraph(packet, project["limitation"], 380, top - 77, PAGE_W - 434, "Helvetica", 7.3, 9.2, MUTED, 4)
        draw_text(packet, "START", 56, top - 113, "Courier-Bold", 6.5, accent)
        command = project["command"]
        if len(command) > 94:
            command = command[:91] + "..."
        draw_text(packet, command, 92, top - 113, "Courier", 6.1, MUTED)
        y -= 142

    y -= 3
    draw_text(packet, "VERIFICATION CONTRACT", 38, y, "Courier-Bold", 7.5, accent)
    packet.setStrokeColor(LINE)
    packet.line(38, y - 7, PAGE_W - 38, y - 7)
    y -= 25
    contract_points = [
        "Claims name the comparison baseline and units.",
        "Commands reproduce the public correctness path.",
        "Failure boundaries remain beside the measured result.",
        "The evidence manifest connects claims to methods and sources.",
    ]
    for index, point in enumerate(contract_points):
        x = 38 + (index % 2) * 270
        row_y = y - (index // 2) * 24
        packet.setFillColor(accent)
        packet.circle(x + 3, row_y + 2, 2.5, fill=1, stroke=0)
        draw_text(packet, point, x + 12, row_y, "Helvetica", 7.6, MUTED)

    packet.setStrokeColor(LINE)
    packet.line(38, 42, PAGE_W - 38, 42)
    draw_text(packet, f'Downloadable route: asp53826.github.io/{route["id"]}/', 38, 27, "Courier", 6.8, MUTED)
    draw_text(packet, f'VERIFIED {DATA["experience"]["verifiedOn"]}', PAGE_W - 145, 27, "Courier-Bold", 6.8, accent)
    packet.save()
    shutil.copy2(output, public)
    print(f"wrote {output}")
    print(f"wrote {public}")


for recruiter_route in DATA["routes"]:
    route_packet(recruiter_route)
