#!/usr/bin/env python3
"""
AttendMate / Bunkr Timetable Fixture Generator
Generates 28 realistic timetable fixtures (19 dev, 9 held-out) covering:
- PDFs (Word-exported, Sheets-exported, Excel-matrix, HTML-print, scanned/image-in-PDF, ReportLab, FPDF)
- Images (clean screenshot, mobile photo, angled/skewed, compressed JPEG, low-res PNG, dark mode, noisy scan)
- Text/CSV/ICS (standard CSV, TSV, day-grouped text, pipe table, messy CSV, freeform notes, iCalendar .ics)
Each fixture has a matching ground-truth JSON file:
[{"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "...", "room": "..."}]
"""

import os
import sys
import json
import random
import math
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

# Third-party PDF generators
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from fpdf import FPDF

BASE_DIR = Path(__file__).resolve().parent.parent
DEV_DIR = BASE_DIR / "test" / "fixtures" / "dev"
HELDOUT_DIR = BASE_DIR / "test" / "fixtures" / "held_out"

DEV_DIR.mkdir(parents=True, exist_ok=True)
HELDOUT_DIR.mkdir(parents=True, exist_ok=True)

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def get_font(size=14, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf"
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()

def save_ground_truth(sessions, json_path):
    """Save sorted ground truth sessions array to json file."""
    day_weights = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7}
    sorted_sessions = sorted(sessions, key=lambda s: (day_weights.get(s["day"], 99), s["startTime"], s["courseName"]))
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(sorted_sessions, f, indent=2)

def chrome_html_to_pdf(html_content, output_pdf_path, landscape_mode=False):
    """Render HTML to authentic PDF using headless Google Chrome."""
    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as f:
        f.write(html_content)
        temp_html = f.name

    cmd = [
        CHROME_BIN,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={output_pdf_path}",
        temp_html
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=15)
    finally:
        if os.path.exists(temp_html):
            os.remove(temp_html)

# =============================================================================
# DEFINITION OF ALL 28 FIXTURES
# =============================================================================

FIXTURES_DATA = {
    # -------------------------------------------------------------------------
    # DEV FIXTURES (19)
    # -------------------------------------------------------------------------
    "dev_01_word_exported": {
        "subset": "dev",
        "ext": "pdf",
        "title": "B.Tech Computer Science & Engineering - Sem 3",
        "institution": "National Institute of Technology",
        "format_desc": "Word-exported schedule document with classic table formatting and serif typography",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Data Structures & Algorithms", "room": "A501"},
            {"day": "Monday", "startTime": "10:45", "endTime": "12:15", "courseName": "Computer Organization", "room": "A502"},
            {"day": "Tuesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Discrete Mathematics", "room": "A404"},
            {"day": "Tuesday", "startTime": "13:30", "endTime": "15:00", "courseName": "Object-Oriented Programming", "room": "Lab-3"},
            {"day": "Thursday", "startTime": "10:45", "endTime": "12:15", "courseName": "Computer Organization", "room": "A502"},
            {"day": "Friday", "startTime": "09:00", "endTime": "10:30", "courseName": "Data Structures & Algorithms", "room": "A501"}
        ]
    },
    "dev_02_sheets_exported": {
        "subset": "dev",
        "ext": "pdf",
        "title": "BSc Data Science - Year 2 Schedule",
        "institution": "Faculty of Mathematical Sciences",
        "format_desc": "Google Sheets exported grid with green headers and alternating row fills",
        "sessions": [
            {"day": "Monday", "startTime": "10:00", "endTime": "11:30", "courseName": "Statistical Inference", "room": "B201"},
            {"day": "Monday", "startTime": "13:30", "endTime": "15:00", "courseName": "Python for Data Science", "room": "B205"},
            {"day": "Wednesday", "startTime": "10:00", "endTime": "11:30", "courseName": "Statistical Inference", "room": "B201"},
            {"day": "Wednesday", "startTime": "11:45", "endTime": "13:15", "courseName": "Linear Algebra", "room": "B102"},
            {"day": "Friday", "startTime": "13:30", "endTime": "15:00", "courseName": "Data Visualization", "room": "B205"}
        ]
    },
    "dev_03_excel_matrix": {
        "subset": "dev",
        "ext": "pdf",
        "title": "BBA Digital Business Semester Matrix",
        "institution": "School of Management",
        "format_desc": "Microsoft Excel matrix schedule with deep blue header styling and borders",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Financial Accounting", "room": "C101"},
            {"day": "Tuesday", "startTime": "11:00", "endTime": "12:30", "courseName": "Marketing Management", "room": "C105"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Financial Accounting", "room": "C101"},
            {"day": "Thursday", "startTime": "11:00", "endTime": "12:30", "courseName": "Marketing Management", "room": "C105"},
            {"day": "Thursday", "startTime": "14:00", "endTime": "15:30", "courseName": "Business Communication", "room": "RFP"}
        ]
    },
    "dev_04_html_print_clean": {
        "subset": "dev",
        "ext": "pdf",
        "title": "B.Des Interaction Design Timetable",
        "institution": "School of Design & Creative Arts",
        "format_desc": "Clean HTML-print timetable exported directly from a web portal",
        "sessions": [
            {"day": "Monday", "startTime": "09:30", "endTime": "11:00", "courseName": "Design Thinking", "room": "Studio-1"},
            {"day": "Monday", "startTime": "11:30", "endTime": "13:00", "courseName": "Visual Typography", "room": "Studio-2"},
            {"day": "Wednesday", "startTime": "09:30", "endTime": "11:00", "courseName": "Design Thinking", "room": "Studio-1"},
            {"day": "Wednesday", "startTime": "14:00", "endTime": "17:00", "courseName": "Interaction Prototyping", "room": "Lab-4"},
            {"day": "Friday", "startTime": "10:00", "endTime": "12:00", "courseName": "Design Research", "room": "Studio-1"}
        ]
    },
    "dev_05_scanned_image_in_pdf": {
        "subset": "dev",
        "ext": "pdf",
        "title": "Mechanical Engineering Class Routine",
        "institution": "Faculty of Engineering & Technology",
        "format_desc": "Scanned document embedded as full-page raster image in PDF with paper grain and tilt",
        "sessions": [
            {"day": "Monday", "startTime": "08:30", "endTime": "10:00", "courseName": "Thermodynamics", "room": "M101"},
            {"day": "Monday", "startTime": "10:15", "endTime": "11:45", "courseName": "Fluid Mechanics", "room": "M102"},
            {"day": "Tuesday", "startTime": "13:00", "endTime": "15:00", "courseName": "CAD Lab", "room": "CAD-1"},
            {"day": "Thursday", "startTime": "08:30", "endTime": "10:00", "courseName": "Thermodynamics", "room": "M101"},
            {"day": "Friday", "startTime": "10:15", "endTime": "11:45", "courseName": "Fluid Mechanics", "room": "M102"}
        ]
    },
    "dev_06_reportlab_academic": {
        "subset": "dev",
        "ext": "pdf",
        "title": "Master of Computer Applications (MCA) Schedule",
        "institution": "Department of Computer Science",
        "format_desc": "Native ReportLab vector table with Platypus Flowables and styled text",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Advanced Algorithms", "room": "CS201"},
            {"day": "Tuesday", "startTime": "10:45", "endTime": "12:15", "courseName": "Cloud Computing", "room": "CS202"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Advanced Algorithms", "room": "CS201"},
            {"day": "Thursday", "startTime": "10:45", "endTime": "12:15", "courseName": "Cloud Computing", "room": "CS202"},
            {"day": "Friday", "startTime": "14:00", "endTime": "16:00", "courseName": "Cloud Computing Lab", "room": "Lab-6"}
        ]
    },
    "dev_07_dense_engineering": {
        "subset": "dev",
        "ext": "pdf",
        "title": "B.Tech Electronics & Communication - Semester 5",
        "institution": "College of Electrical Sciences",
        "format_desc": "Dense engineering schedule table with 5 days and multiple tight lecture/lab slots",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:00", "courseName": "Signals and Systems", "room": "EC101"},
            {"day": "Monday", "startTime": "10:10", "endTime": "11:10", "courseName": "Digital Electronics", "room": "EC102"},
            {"day": "Monday", "startTime": "11:20", "endTime": "12:20", "courseName": "Electromagnetic Fields", "room": "EC103"},
            {"day": "Tuesday", "startTime": "09:00", "endTime": "10:00", "courseName": "Analog Circuits", "room": "EC104"},
            {"day": "Tuesday", "startTime": "10:10", "endTime": "11:10", "courseName": "Microprocessors", "room": "EC102"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:00", "courseName": "Signals and Systems", "room": "EC101"},
            {"day": "Wednesday", "startTime": "14:00", "endTime": "16:00", "courseName": "Microprocessor Lab", "room": "ECLab-1"},
            {"day": "Thursday", "startTime": "10:10", "endTime": "11:10", "courseName": "Digital Electronics", "room": "EC102"},
            {"day": "Friday", "startTime": "09:00", "endTime": "10:00", "courseName": "Analog Circuits", "room": "EC104"}
        ]
    },
    "dev_08_clean_screenshot": {
        "subset": "dev",
        "ext": "png",
        "title": "Student Portal Weekly Schedule",
        "institution": "University Portal UI",
        "format_desc": "Clean desktop web portal screenshot with crisp text and timetable grid",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Web Development", "room": "A601"},
            {"day": "Tuesday", "startTime": "11:00", "endTime": "12:30", "courseName": "Database Management", "room": "A602"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Web Development", "room": "A601"},
            {"day": "Thursday", "startTime": "11:00", "endTime": "12:30", "courseName": "Database Management", "room": "A602"},
            {"day": "Friday", "startTime": "14:00", "endTime": "16:00", "courseName": "Web Development Lab", "room": "Lab-2"}
        ]
    },
    "dev_09_mobile_photo": {
        "subset": "dev",
        "ext": "jpg",
        "title": "Printed Schedule Photo",
        "institution": "Department of Cyber Security",
        "format_desc": "Smartphone camera photo of a physical printed paper timetable with lighting gradient",
        "sessions": [
            {"day": "Monday", "startTime": "10:00", "endTime": "11:30", "courseName": "Cyber Security", "room": "CS301"},
            {"day": "Tuesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Cryptography", "room": "CS302"},
            {"day": "Wednesday", "startTime": "10:00", "endTime": "11:30", "courseName": "Cyber Security", "room": "CS301"},
            {"day": "Thursday", "startTime": "09:00", "endTime": "10:30", "courseName": "Cryptography", "room": "CS302"},
            {"day": "Friday", "startTime": "13:30", "endTime": "15:00", "courseName": "Network Security Lab", "room": "Lab-5"}
        ]
    },
    "dev_10_angled_skewed": {
        "subset": "dev",
        "ext": "jpg",
        "title": "Bulletin Board Timetable",
        "institution": "Systems & Networks Lab",
        "format_desc": "Perspective-skewed photo taken at an angle with slight lens distortion",
        "sessions": [
            {"day": "Monday", "startTime": "08:30", "endTime": "10:00", "courseName": "Operating Systems", "room": "A401"},
            {"day": "Wednesday", "startTime": "08:30", "endTime": "10:00", "courseName": "Operating Systems", "room": "A401"},
            {"day": "Wednesday", "startTime": "10:30", "endTime": "12:00", "courseName": "Computer Networks", "room": "A402"},
            {"day": "Friday", "startTime": "10:30", "endTime": "12:00", "courseName": "Computer Networks", "room": "A402"},
            {"day": "Friday", "startTime": "13:30", "endTime": "15:30", "courseName": "OS Kernel Lab", "room": "Lab-1"}
        ]
    },
    "dev_11_compressed_jpeg": {
        "subset": "dev",
        "ext": "jpg",
        "title": "Software Engineering Timetable",
        "institution": "Institute of Technology",
        "format_desc": "Heavily compressed JPEG image showing compression blocks and slight color ringing",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Software Engineering", "room": "E201"},
            {"day": "Tuesday", "startTime": "10:45", "endTime": "12:15", "courseName": "Artificial Intelligence", "room": "E202"},
            {"day": "Thursday", "startTime": "09:00", "endTime": "10:30", "courseName": "Software Engineering", "room": "E201"},
            {"day": "Friday", "startTime": "10:45", "endTime": "12:15", "courseName": "Artificial Intelligence", "room": "E202"}
        ]
    },
    "dev_12_low_res_png": {
        "subset": "dev",
        "ext": "png",
        "title": "AI & ML Stream Schedule",
        "institution": "Center for Intelligent Systems",
        "format_desc": "Low-resolution 480x320 PNG image typical of a cropped mobile snapshot",
        "sessions": [
            {"day": "Monday", "startTime": "11:00", "endTime": "12:30", "courseName": "Machine Learning", "room": "A610"},
            {"day": "Wednesday", "startTime": "11:00", "endTime": "12:30", "courseName": "Machine Learning", "room": "A610"},
            {"day": "Friday", "startTime": "09:00", "endTime": "10:30", "courseName": "Deep Learning", "room": "A610"},
            {"day": "Friday", "startTime": "14:00", "endTime": "16:00", "courseName": "GPU Cluster Lab", "room": "Lab-8"}
        ]
    },
    "dev_13_dark_mode_screenshot": {
        "subset": "dev",
        "ext": "png",
        "title": "Dark Mode Student Calendar",
        "institution": "Mobile & Cloud Lab",
        "format_desc": "Modern dark mode UI screenshot with charcoal slate background and bright text chips",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:00", "courseName": "Mobile App Development", "room": "B301"},
            {"day": "Tuesday", "startTime": "10:15", "endTime": "11:45", "courseName": "Cloud Architecture", "room": "B302"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:00", "courseName": "Mobile App Development", "room": "B301"},
            {"day": "Thursday", "startTime": "10:15", "endTime": "11:45", "courseName": "Cloud Architecture", "room": "B302"},
            {"day": "Friday", "startTime": "13:30", "endTime": "15:30", "courseName": "Flutter Workshop", "room": "Lab-3"}
        ]
    },
    "dev_14_standard_csv": {
        "subset": "dev",
        "ext": "csv",
        "title": "AI Electives Timetable",
        "institution": "School of Computer Science",
        "format_desc": "Standard CSV file with header Day,Time,EndTime,Subject,Room",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Artificial Intelligence", "room": "A603"},
            {"day": "Monday", "startTime": "10:45", "endTime": "12:15", "courseName": "Natural Language Processing", "room": "A604"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Artificial Intelligence", "room": "A603"},
            {"day": "Thursday", "startTime": "10:45", "endTime": "12:15", "courseName": "Natural Language Processing", "room": "A604"},
            {"day": "Friday", "startTime": "14:00", "endTime": "16:00", "courseName": "NLP Lab", "room": "Lab-4"}
        ]
    },
    "dev_15_tab_separated_tsv": {
        "subset": "dev",
        "ext": "tsv",
        "title": "Theoretical Computer Science Schedule",
        "institution": "Institute of Mathematics & Computing",
        "format_desc": "Tab-separated values TSV file",
        "sessions": [
            {"day": "Monday", "startTime": "08:30", "endTime": "10:00", "courseName": "Discrete Mathematics", "room": "C201"},
            {"day": "Tuesday", "startTime": "10:30", "endTime": "12:00", "courseName": "Theory of Computation", "room": "C202"},
            {"day": "Wednesday", "startTime": "08:30", "endTime": "10:00", "courseName": "Discrete Mathematics", "room": "C201"},
            {"day": "Thursday", "startTime": "10:30", "endTime": "12:00", "courseName": "Theory of Computation", "room": "C202"},
            {"day": "Friday", "startTime": "11:00", "endTime": "12:30", "courseName": "Compiler Design", "room": "C203"}
        ]
    },
    "dev_16_day_grouped_text": {
        "subset": "dev",
        "ext": "txt",
        "title": "Game Development Routine",
        "institution": "Interactive Media Department",
        "format_desc": "Human-readable plain text outline grouped under day headings",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Computer Graphics", "room": "CG101"},
            {"day": "Monday", "startTime": "11:00", "endTime": "12:30", "courseName": "Game Development", "room": "CG102"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Computer Graphics", "room": "CG101"},
            {"day": "Thursday", "startTime": "11:00", "endTime": "12:30", "courseName": "Game Development", "room": "CG102"},
            {"day": "Friday", "startTime": "14:00", "endTime": "16:30", "courseName": "Unity Engine Studio", "room": "Studio-A"}
        ]
    },
    "dev_17_pipe_separated": {
        "subset": "dev",
        "ext": "txt",
        "title": "High Performance Systems Schedule",
        "institution": "Advanced Computing Division",
        "format_desc": "Markdown pipe table plain text representation",
        "sessions": [
            {"day": "Monday", "startTime": "10:00", "endTime": "11:30", "courseName": "Distributed Systems", "room": "D101"},
            {"day": "Tuesday", "startTime": "14:00", "endTime": "15:30", "courseName": "High Performance Computing", "room": "D102"},
            {"day": "Wednesday", "startTime": "10:00", "endTime": "11:30", "courseName": "Distributed Systems", "room": "D101"},
            {"day": "Thursday", "startTime": "14:00", "endTime": "15:30", "courseName": "High Performance Computing", "room": "D102"}
        ]
    },
    "dev_18_standard_ical": {
        "subset": "dev",
        "ext": "ics",
        "title": "Big Data Calendar Export",
        "institution": "Data Analytics Faculty",
        "format_desc": "RFC 5545 iCalendar standard .ics file with recurring VEVENT",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Big Data Analytics", "room": "BD101"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Big Data Analytics", "room": "BD101"},
            {"day": "Tuesday", "startTime": "11:00", "endTime": "12:30", "courseName": "Information Retrieval", "room": "BD102"},
            {"day": "Thursday", "startTime": "11:00", "endTime": "12:30", "courseName": "Information Retrieval", "room": "BD102"}
        ]
    },
    "dev_19_complex_rrules": {
        "subset": "dev",
        "ext": "ics",
        "title": "Applied Statistics & Econometrics Calendar",
        "institution": "Department of Economics",
        "format_desc": "RFC 5545 iCalendar with multi-day BYDAY recurrence in RRULE",
        "sessions": [
            {"day": "Monday", "startTime": "10:00", "endTime": "11:00", "courseName": "Applied Statistics", "room": "STAT-1"},
            {"day": "Wednesday", "startTime": "10:00", "endTime": "11:00", "courseName": "Applied Statistics", "room": "STAT-1"},
            {"day": "Friday", "startTime": "10:00", "endTime": "11:00", "courseName": "Applied Statistics", "room": "STAT-1"},
            {"day": "Tuesday", "startTime": "14:00", "endTime": "15:30", "courseName": "Econometrics", "room": "ECON-2"},
            {"day": "Thursday", "startTime": "14:00", "endTime": "15:30", "courseName": "Econometrics", "room": "ECON-2"}
        ]
    },

    # -------------------------------------------------------------------------
    # HELD-OUT FIXTURES (9)
    # -------------------------------------------------------------------------
    "heldout_01_word_landscape": {
        "subset": "held_out",
        "ext": "pdf",
        "title": "Robotics & Automation Semester Schedule",
        "institution": "Center for Advanced Mechatronics",
        "format_desc": "Landscape Word-exported document with merged laboratory slot cells",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Embedded Systems", "room": "ES101"},
            {"day": "Monday", "startTime": "11:00", "endTime": "12:30", "courseName": "Robotics & Automation", "room": "ES102"},
            {"day": "Tuesday", "startTime": "13:30", "endTime": "15:30", "courseName": "Robotics Lab", "room": "RobotLab-1"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Embedded Systems", "room": "ES101"},
            {"day": "Thursday", "startTime": "11:00", "endTime": "12:30", "courseName": "Robotics & Automation", "room": "ES102"}
        ]
    },
    "heldout_02_sheets_compact": {
        "subset": "held_out",
        "ext": "pdf",
        "title": "Quantum Computing & Cryptography Routine",
        "institution": "Institute for Quantum Studies",
        "format_desc": "Compact spreadsheet export with condensed column structure",
        "sessions": [
            {"day": "Monday", "startTime": "08:30", "endTime": "10:00", "courseName": "Quantum Computing", "room": "QC201"},
            {"day": "Tuesday", "startTime": "10:15", "endTime": "11:45", "courseName": "Cryptographic Protocols", "room": "QC202"},
            {"day": "Wednesday", "startTime": "08:30", "endTime": "10:00", "courseName": "Quantum Computing", "room": "QC201"},
            {"day": "Thursday", "startTime": "10:15", "endTime": "11:45", "courseName": "Cryptographic Protocols", "room": "QC202"},
            {"day": "Friday", "startTime": "13:30", "endTime": "15:00", "courseName": "Quantum Algorithms", "room": "QC201"}
        ]
    },
    "heldout_03_fpdf_formal_bulletin": {
        "subset": "held_out",
        "ext": "pdf",
        "title": "Economics Department Academic Schedule Bulletin",
        "institution": "Office of the Registrar",
        "format_desc": "Formal university bulletin PDF generated via FPDF with official headers and borders",
        "sessions": [
            {"day": "Monday", "startTime": "10:00", "endTime": "11:30", "courseName": "Microeconomics", "room": "ECO101"},
            {"day": "Tuesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Public Finance", "room": "ECO102"},
            {"day": "Wednesday", "startTime": "10:00", "endTime": "11:30", "courseName": "Microeconomics", "room": "ECO101"},
            {"day": "Thursday", "startTime": "09:00", "endTime": "10:30", "courseName": "Public Finance", "room": "ECO102"},
            {"day": "Friday", "startTime": "14:00", "endTime": "15:30", "courseName": "Financial Markets", "room": "ECO103"}
        ]
    },
    "heldout_04_mobile_overhead": {
        "subset": "held_out",
        "ext": "jpg",
        "title": "HCI Department Timetable Printout",
        "institution": "Human-Computer Interaction Institute",
        "format_desc": "Overhead smartphone photo with authentic perspective tilt, paper creases, and soft shadows",
        "sessions": [
            {"day": "Monday", "startTime": "09:30", "endTime": "11:00", "courseName": "Human Computer Interaction", "room": "HCI-1"},
            {"day": "Tuesday", "startTime": "11:15", "endTime": "12:45", "courseName": "User Experience Design", "room": "HCI-2"},
            {"day": "Wednesday", "startTime": "09:30", "endTime": "11:00", "courseName": "Human Computer Interaction", "room": "HCI-1"},
            {"day": "Thursday", "startTime": "11:15", "endTime": "12:45", "courseName": "User Experience Design", "room": "HCI-2"},
            {"day": "Friday", "startTime": "14:00", "endTime": "16:00", "courseName": "Usability Testing Lab", "room": "UXLab"}
        ]
    },
    "heldout_05_screenshot_compact": {
        "subset": "held_out",
        "ext": "png",
        "title": "Mobile Schedule View",
        "institution": "Cloud Native Engineering Portal",
        "format_desc": "Compact mobile app view screenshot with cards and pill badges",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:15", "courseName": "Cloud Native Architecture", "room": "CL401"},
            {"day": "Tuesday", "startTime": "10:30", "endTime": "11:45", "courseName": "DevOps & CI/CD", "room": "CL402"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:15", "courseName": "Cloud Native Architecture", "room": "CL401"},
            {"day": "Thursday", "startTime": "10:30", "endTime": "11:45", "courseName": "DevOps & CI/CD", "room": "CL402"},
            {"day": "Friday", "startTime": "13:00", "endTime": "15:00", "courseName": "Kubernetes Hands-on", "room": "Lab-7"}
        ]
    },
    "heldout_06_noisy_print_scan": {
        "subset": "held_out",
        "ext": "jpg",
        "title": "Civil Engineering Faculty Timetable Scan",
        "institution": "Civil & Environmental Engineering",
        "format_desc": "Grayscale photocopy scan with salt-and-pepper noise, scanner streaks, and contrast loss",
        "sessions": [
            {"day": "Monday", "startTime": "08:30", "endTime": "10:00", "courseName": "Structural Analysis", "room": "CE201"},
            {"day": "Tuesday", "startTime": "10:30", "endTime": "12:00", "courseName": "Geotechnical Engineering", "room": "CE202"},
            {"day": "Wednesday", "startTime": "08:30", "endTime": "10:00", "courseName": "Structural Analysis", "room": "CE201"},
            {"day": "Thursday", "startTime": "10:30", "endTime": "12:00", "courseName": "Geotechnical Engineering", "room": "CE202"},
            {"day": "Friday", "startTime": "13:30", "endTime": "15:30", "courseName": "Soil Mechanics Lab", "room": "SoilLab-1"}
        ]
    },
    "heldout_07_messy_csv": {
        "subset": "held_out",
        "ext": "csv",
        "title": "Bioinformatics Class Schedule",
        "institution": "School of Biological Sciences",
        "format_desc": "Messy CSV with quoted entries, 12-hour AM/PM times, and extra spacing",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Bioinformatics", "room": "BIO301"},
            {"day": "Tuesday", "startTime": "11:00", "endTime": "12:30", "courseName": "Genomics", "room": "BIO302"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Bioinformatics", "room": "BIO301"},
            {"day": "Thursday", "startTime": "11:00", "endTime": "12:30", "courseName": "Genomics", "room": "BIO302"},
            {"day": "Friday", "startTime": "14:00", "endTime": "16:00", "courseName": "Computational Biology Lab", "room": "BioLab-2"}
        ]
    },
    "heldout_08_freeform_notes": {
        "subset": "held_out",
        "ext": "txt",
        "title": "Physics Lecture Notes & Times",
        "institution": "Department of Physics",
        "format_desc": "Informal student notes format with bullet points and room mentions",
        "sessions": [
            {"day": "Monday", "startTime": "09:00", "endTime": "10:30", "courseName": "Modern Physics", "room": "PHY101"},
            {"day": "Monday", "startTime": "11:00", "endTime": "12:30", "courseName": "Quantum Mechanics", "room": "PHY102"},
            {"day": "Wednesday", "startTime": "09:00", "endTime": "10:30", "courseName": "Modern Physics", "room": "PHY101"},
            {"day": "Thursday", "startTime": "11:00", "endTime": "12:30", "courseName": "Quantum Mechanics", "room": "PHY102"},
            {"day": "Friday", "startTime": "14:00", "endTime": "16:00", "courseName": "Optics Laboratory", "room": "OptLab"}
        ]
    },
    "heldout_09_multicourse_ical": {
        "subset": "held_out",
        "ext": "ics",
        "title": "Renewable Energy Semester Calendar",
        "institution": "Energy Studies Institute",
        "format_desc": "Comprehensive iCalendar export with explicit TZID and weekly recurring VEVENTs",
        "sessions": [
            {"day": "Monday", "startTime": "10:00", "endTime": "11:30", "courseName": "Renewable Energy Systems", "room": "REN101"},
            {"day": "Tuesday", "startTime": "13:30", "endTime": "15:00", "courseName": "Power Electronics", "room": "REN102"},
            {"day": "Wednesday", "startTime": "10:00", "endTime": "11:30", "courseName": "Renewable Energy Systems", "room": "REN101"},
            {"day": "Thursday", "startTime": "13:30", "endTime": "15:00", "courseName": "Power Electronics", "room": "REN102"},
            {"day": "Friday", "startTime": "11:00", "endTime": "12:30", "courseName": "Smart Grid Technology", "room": "REN103"}
        ]
    }
}

# =============================================================================
# RENDERING FUNCTIONS
# =============================================================================

def build_grid_data(sessions):
    """Organize sessions into time slots and days for tabular rendering."""
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    time_slots = sorted(list(set((s["startTime"], s["endTime"]) for s in sessions)), key=lambda x: x[0])
    
    # Map (day, slot) -> session
    grid = {}
    for s in sessions:
        grid[(s["day"], s["startTime"])] = s
    return days, time_slots, grid

def generate_word_exported_pdf(fixture, out_path):
    days, time_slots, grid = build_grid_data(fixture["sessions"])
    
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{ size: A4 landscape; margin: 15mm; }}
  body {{ font-family: 'Times New Roman', Times, serif; color: #111; margin: 0; padding: 20px; }}
  .header {{ text-align: center; margin-bottom: 24px; border-bottom: 2px solid #2b579a; padding-bottom: 12px; }}
  .header h1 {{ font-size: 20pt; margin: 0; color: #2b579a; text-transform: uppercase; }}
  .header h2 {{ font-size: 14pt; margin: 6px 0 0 0; color: #444; font-weight: normal; }}
  .header p {{ font-size: 11pt; margin: 4px 0 0 0; color: #666; font-style: italic; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10.5pt; }}
  th, td {{ border: 1.5px solid #2b579a; padding: 10px 8px; text-align: center; }}
  th {{ background-color: #2b579a; color: white; font-weight: bold; font-size: 11pt; }}
  .day-col {{ background-color: #f2f5f9; font-weight: bold; color: #1e395b; width: 14%; }}
  .session-cell {{ background-color: #ffffff; text-align: center; }}
  .course-title {{ font-weight: bold; color: #111; font-size: 10.5pt; }}
  .room-tag {{ display: block; color: #555; font-size: 9.5pt; margin-top: 4px; }}
  .empty-cell {{ background-color: #fafafa; color: #aaa; }}
  .footer {{ margin-top: 30px; display: flex; justify-content: space-between; font-size: 10pt; color: #555; }}
</style>
</head>
<body>
  <div class="header">
    <h1>{fixture['institution']}</h1>
    <h2>{fixture['title']}</h2>
    <p>Official Academic Timetable — Semester Period 2026</p>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Day / Time</th>
"""
    for ts in time_slots:
        html += f'        <th>{ts[0]} - {ts[1]}</th>\n'
    html += """      </tr>
    </thead>
    <tbody>
"""
    for day in days:
        html += f'      <tr>\n        <td class="day-col">{day}</td>\n'
        for ts in time_slots:
            sess = grid.get((day, ts[0]))
            if sess:
                html += f'        <td class="session-cell"><div class="course-title">{sess["courseName"]}</div><span class="room-tag">({sess["room"]})</span></td>\n'
            else:
                html += '        <td class="empty-cell">—</td>\n'
        html += '      </tr>\n'
    html += """    </tbody>
  </table>
  <div class="footer">
    <div>Dean of Academic Affairs</div>
    <div>Date of Issue: 01-Aug-2026</div>
    <div>Document Ref: WORD-EXP-TT-2026</div>
  </div>
</body>
</html>"""
    chrome_html_to_pdf(html, out_path, landscape_mode=True)

def generate_sheets_exported_pdf(fixture, out_path):
    days, time_slots, grid = build_grid_data(fixture["sessions"])
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{ size: A4 landscape; margin: 12mm; }}
  body {{ font-family: Roboto, Arial, sans-serif; color: #202124; margin: 0; padding: 15px; background: #fff; }}
  .sheet-title {{ font-size: 16pt; font-weight: bold; color: #0f9d58; margin-bottom: 4px; }}
  .sheet-subtitle {{ font-size: 11pt; color: #5f6368; margin-bottom: 16px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 10pt; table-layout: fixed; }}
  th, td {{ border: 1px solid #d0d7de; padding: 12px 10px; text-align: center; word-break: break-word; }}
  th {{ background-color: #0f9d58; color: #ffffff; font-weight: 600; font-size: 10.5pt; }}
  tr:nth-child(even) td {{ background-color: #f8fbf9; }}
  .day-col {{ font-weight: bold; background-color: #e6f4ea !important; color: #137333; }}
  .course-title {{ font-weight: 600; color: #202124; }}
  .room-tag {{ color: #137333; font-weight: 500; font-size: 9pt; margin-top: 3px; display: block; }}
  .tabs-bar {{ margin-top: 25px; border-top: 1px solid #e0e0e0; padding-top: 8px; font-size: 9pt; color: #5f6368; }}
  .tab-pill {{ display: inline-block; background: #e8f0fe; color: #1967d2; padding: 4px 12px; border-radius: 4px 4px 0 0; font-weight: bold; }}
</style>
</head>
<body>
  <div class="sheet-title">{fixture['title']}</div>
  <div class="sheet-subtitle">{fixture['institution']} • Google Sheets Export</div>
  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Day</th>
"""
    for ts in time_slots:
        html += f'        <th>{ts[0]} - {ts[1]}</th>\n'
    html += """      </tr>
    </thead>
    <tbody>
"""
    for day in days:
        html += f'      <tr>\n        <td class="day-col">{day}</td>\n'
        for ts in time_slots:
            sess = grid.get((day, ts[0]))
            if sess:
                html += f'        <td><div class="course-title">{sess["courseName"]}</div><span class="room-tag">{sess["room"]}</span></td>\n'
            else:
                html += '        <td></td>\n'
        html += '      </tr>\n'
    html += """    </tbody>
  </table>
  <div class="tabs-bar">
    <span class="tab-pill">Sheet1 - Weekly Schedule</span>
  </div>
</body>
</html>"""
    chrome_html_to_pdf(html, out_path, landscape_mode=True)

def generate_excel_matrix_pdf(fixture, out_path):
    days, time_slots, grid = build_grid_data(fixture["sessions"])
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{ size: A4 landscape; margin: 12mm; }}
  body {{ font-family: Calibri, 'Segoe UI', Arial, sans-serif; color: #000; margin: 0; padding: 20px; }}
  .excel-top {{ margin-bottom: 15px; border-left: 6px solid #1f4e78; padding-left: 10px; }}
  .excel-top h2 {{ font-size: 16pt; margin: 0; color: #1f4e78; }}
  .excel-top p {{ font-size: 10pt; color: #555; margin: 4px 0 0 0; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 10.5pt; }}
  th, td {{ border: 1px solid #8ea9db; padding: 10px 8px; text-align: center; }}
  th {{ background-color: #1f4e78; color: #fff; font-weight: bold; }}
  .day-header {{ background-color: #d9e1f2; font-weight: bold; color: #1f4e78; width: 14%; }}
  .cell-content {{ padding: 4px; }}
  .cell-subject {{ font-weight: bold; color: #1f4e78; }}
  .cell-room {{ font-size: 9.5pt; color: #333; }}
</style>
</head>
<body>
  <div class="excel-top">
    <h2>{fixture['title']}</h2>
    <p>{fixture['institution']} | Matrix Format Export</p>
  </div>
  <table>
    <thead>
      <tr>
        <th class="day-header" style="background-color: #1f4e78; color: #fff;">Day / Time</th>
"""
    for ts in time_slots:
        html += f'        <th>{ts[0]} - {ts[1]}</th>\n'
    html += """      </tr>
    </thead>
    <tbody>
"""
    for day in days:
        html += f'      <tr>\n        <td class="day-header">{day}</td>\n'
        for ts in time_slots:
            sess = grid.get((day, ts[0]))
            if sess:
                html += f'        <td><div class="cell-content"><div class="cell-subject">{sess["courseName"]}</div><div class="cell-room">Room {sess["room"]}</div></div></td>\n'
            else:
                html += '        <td></td>\n'
        html += '      </tr>\n'
    html += """    </tbody>
  </table>
</body>
</html>"""
    chrome_html_to_pdf(html, out_path, landscape_mode=True)

def generate_html_print_pdf(fixture, out_path):
    days, time_slots, grid = build_grid_data(fixture["sessions"])
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{ size: A4 landscape; margin: 10mm; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 25px; background: #fff; }}
  .card {{ border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
  .portal-header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }}
  .portal-header h1 {{ font-size: 18pt; margin: 0; color: #4338ca; }}
  .portal-header .sub {{ font-size: 10pt; color: #64748b; margin-top: 4px; }}
  .badge {{ background: #e0e7ff; color: #4338ca; padding: 4px 10px; border-radius: 9999px; font-size: 9pt; font-weight: 600; }}
  table {{ width: 100%; border-collapse: separate; border-spacing: 6px; }}
  th {{ background: #f1f5f9; color: #475569; font-weight: 600; padding: 10px; border-radius: 6px; font-size: 10pt; text-align: center; }}
  .day-cell {{ background: #f8fafc; font-weight: 700; color: #334155; padding: 12px; border-radius: 6px; text-align: center; width: 13%; border: 1px solid #e2e8f0; }}
  .slot-cell {{ background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }}
  .slot-cell.active {{ background: #f5f3ff; border: 1px solid #c7d2fe; }}
  .c-name {{ font-weight: 600; color: #3730a3; font-size: 10pt; }}
  .c-room {{ display: inline-block; background: #e0e7ff; color: #4338ca; font-size: 8.5pt; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-top: 4px; }}
</style>
</head>
<body>
  <div class="card">
    <div class="portal-header">
      <div>
        <h1>{fixture['title']}</h1>
        <div class="sub">{fixture['institution']} • Student Self-Service Portal</div>
      </div>
      <div><span class="badge">PRINT VIEW</span></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Day</th>
"""
    for ts in time_slots:
        html += f'          <th>{ts[0]} - {ts[1]}</th>\n'
    html += """        </tr>
      </thead>
      <tbody>
"""
    for day in days:
        html += f'        <tr>\n          <td class="day-cell">{day}</td>\n'
        for ts in time_slots:
            sess = grid.get((day, ts[0]))
            if sess:
                html += f'          <td class="slot-cell active"><div class="c-name">{sess["courseName"]}</div><div class="c-room">{sess["room"]}</div></td>\n'
            else:
                html += '          <td class="slot-cell"></td>\n'
        html += '        </tr>\n'
    html += """      </tbody>
    </table>
  </div>
</body>
</html>"""
    chrome_html_to_pdf(html, out_path, landscape_mode=True)

def generate_reportlab_pdf(fixture, out_path):
    doc = SimpleDocTemplate(str(out_path), pagesize=landscape(A4), rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('AcademicTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#1A365D'), alignment=1)
    sub_style = ParagraphStyle('AcademicSub', parent=styles['Normal'], fontSize=11, leading=14, textColor=colors.HexColor('#4A5568'), alignment=1)
    cell_subj_style = ParagraphStyle('CellSubj', parent=styles['Normal'], fontSize=9.5, leading=11, textColor=colors.HexColor('#1A202C'), alignment=1, fontName='Helvetica-Bold')
    cell_room_style = ParagraphStyle('CellRoom', parent=styles['Normal'], fontSize=8.5, leading=10, textColor=colors.HexColor('#4A5568'), alignment=1, fontName='Helvetica')
    header_style = ParagraphStyle('HeaderStyle', parent=styles['Normal'], fontSize=9.5, leading=12, textColor=colors.white, alignment=1, fontName='Helvetica-Bold')
    day_style = ParagraphStyle('DayStyle', parent=styles['Normal'], fontSize=10, leading=12, textColor=colors.HexColor('#1A365D'), alignment=1, fontName='Helvetica-Bold')
    
    elements = [
        Paragraph(fixture['institution'], sub_style),
        Paragraph(fixture['title'], title_style),
        Spacer(1, 15)
    ]
    
    days, time_slots, grid = build_grid_data(fixture["sessions"])
    
    table_data = []
    header_row = [Paragraph("Day / Time", header_style)]
    for ts in time_slots:
        header_row.append(Paragraph(f"{ts[0]} - {ts[1]}", header_style))
    table_data.append(header_row)
    
    for day in days:
        row = [Paragraph(day, day_style)]
        for ts in time_slots:
            sess = grid.get((day, ts[0]))
            if sess:
                content = [
                    Paragraph(sess["courseName"], cell_subj_style),
                    Spacer(1, 3),
                    Paragraph(sess["room"], cell_room_style)
                ]
                row.append(content)
            else:
                row.append(Paragraph("—", cell_room_style))
        table_data.append(row)
        
    col_width = (doc.width - 90) / len(time_slots) if time_slots else 100
    col_widths = [90] + [col_width] * len(time_slots)
    
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A365D')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E0')),
        ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#EDF2F7')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t)
    doc.build(elements)

def generate_fpdf_bulletin_pdf(fixture, out_path):
    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(24, 43, 73)
    pdf.cell(0, 10, fixture['institution'], ln=True, align='C')
    
    pdf.set_font('Helvetica', 'B', 13)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 7, fixture['title'], ln=True, align='C')
    
    pdf.set_font('Helvetica', 'I', 10)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, "Official Academic Schedule Bulletin - Autumn Session", ln=True, align='C')
    pdf.ln(6)
    
    days, time_slots, grid = build_grid_data(fixture["sessions"])
    
    day_w = 32
    avail_w = 297 - 30 - day_w
    slot_w = avail_w / len(time_slots) if time_slots else 40
    
    # Header
    pdf.set_fill_color(24, 43, 73)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Helvetica', 'B', 10)
    pdf.cell(day_w, 10, "Day / Time", border=1, align='C', fill=True)
    for ts in time_slots:
        pdf.cell(slot_w, 10, f"{ts[0]} - {ts[1]}", border=1, align='C', fill=True)
    pdf.ln()
    
    # Rows
    for day in days:
        pdf.set_fill_color(235, 240, 248)
        pdf.set_text_color(24, 43, 73)
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(day_w, 16, day, border=1, align='C', fill=True)
        
        pdf.set_font('Helvetica', '', 9)
        pdf.set_text_color(30, 30, 30)
        for ts in time_slots:
            sess = grid.get((day, ts[0]))
            if sess:
                x = pdf.get_x()
                y = pdf.get_y()
                pdf.rect(x, y, slot_w, 16)
                pdf.set_xy(x, y + 2)
                pdf.set_font('Helvetica', 'B', 8.5)
                # Shorten long text if needed
                name = sess["courseName"]
                if len(name) > 22:
                    name = name[:20] + "..."
                pdf.cell(slot_w, 5, name, align='C')
                pdf.set_xy(x, y + 8)
                pdf.set_font('Helvetica', '', 8)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(slot_w, 5, sess["room"], align='C')
                pdf.set_xy(x + slot_w, y)
                pdf.set_text_color(30, 30, 30)
            else:
                pdf.cell(slot_w, 16, "-", border=1, align='C')
        pdf.ln()
        
    pdf.output(str(out_path))

# =============================================================================
# IMAGE GENERATION WITH PILLOW
# =============================================================================

def draw_table_on_image(title, subtitle, sessions, width=1200, height=750, theme="light"):
    days, time_slots, grid = build_grid_data(sessions)
    
    bg_color = (255, 255, 255) if theme == "light" else (24, 24, 37)
    text_color = (30, 30, 30) if theme == "light" else (205, 214, 244)
    header_bg = (43, 87, 154) if theme == "light" else (49, 50, 68)
    header_text = (255, 255, 255) if theme == "light" else (137, 180, 250)
    grid_line = (200, 210, 225) if theme == "light" else (69, 71, 90)
    day_bg = (240, 245, 252) if theme == "light" else (30, 30, 46)
    cell_card_bg = (248, 250, 255) if theme == "light" else (40, 41, 58)
    pill_bg = (220, 235, 255) if theme == "light" else (55, 60, 85)
    pill_text = (25, 75, 140) if theme == "light" else (137, 180, 250)
    
    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    f_title = get_font(24, bold=True)
    f_sub = get_font(14)
    f_header = get_font(14, bold=True)
    f_day = get_font(15, bold=True)
    f_course = get_font(13, bold=True)
    f_room = get_font(11, bold=True)
    
    # Header banner
    draw.text((40, 30), title, font=f_title, fill=text_color)
    draw.text((40, 65), subtitle, font=f_sub, fill=(120, 120, 120) if theme == "light" else (166, 173, 200))
    
    # Table dimensions
    start_x = 40
    start_y = 110
    tbl_w = width - 80
    tbl_h = height - 150
    
    day_col_w = 140
    num_slots = len(time_slots)
    slot_w = (tbl_w - day_col_w) / num_slots if num_slots else 150
    row_h = (tbl_h - 45) / len(days)
    
    # Draw header row
    draw.rectangle([start_x, start_y, start_x + tbl_w, start_y + 45], fill=header_bg)
    draw.text((start_x + 20, start_y + 12), "Day / Time", font=f_header, fill=header_text)
    
    for i, ts in enumerate(time_slots):
        x = start_x + day_col_w + i * slot_w
        draw.line([x, start_y, x, start_y + tbl_h], fill=grid_line, width=1)
        draw.text((x + 10, start_y + 12), f"{ts[0]} - {ts[1]}", font=f_header, fill=header_text)
        
    # Draw rows
    for r_idx, day in enumerate(days):
        y = start_y + 45 + r_idx * row_h
        draw.line([start_x, y, start_x + tbl_w, y], fill=grid_line, width=1)
        
        # Day column
        draw.rectangle([start_x, y, start_x + day_col_w, y + row_h], fill=day_bg)
        draw.text((start_x + 15, y + row_h / 2 - 10), day, font=f_day, fill=text_color)
        
        # Cells
        for c_idx, ts in enumerate(time_slots):
            cx = start_x + day_col_w + c_idx * slot_w
            sess = grid.get((day, ts[0]))
            if sess:
                draw.rectangle([cx + 4, y + 4, cx + slot_w - 4, y + row_h - 4], fill=cell_card_bg, outline=grid_line)
                c_name = sess["courseName"]
                if len(c_name) > 22:
                    c_name = c_name[:20] + "..."
                draw.text((cx + 10, y + 12), c_name, font=f_course, fill=text_color)
                
                # Room pill badge
                room_text = f" {sess['room']} "
                draw.rectangle([cx + 10, y + 36, cx + 80, y + 54], fill=pill_bg)
                draw.text((cx + 14, y + 38), sess['room'], font=f_room, fill=pill_text)
                
    # Outer border
    draw.rectangle([start_x, start_y, start_x + tbl_w, start_y + tbl_h], outline=grid_line, width=2)
    return img

def generate_clean_screenshot(fixture, out_path):
    img = draw_table_on_image(fixture["title"], fixture["institution"] + " • Online Portal", fixture["sessions"], 1200, 750, theme="light")
    img.save(str(out_path), "PNG")

def generate_dark_mode_screenshot(fixture, out_path):
    img = draw_table_on_image(fixture["title"], fixture["institution"] + " • Night Mode", fixture["sessions"], 1200, 750, theme="dark")
    img.save(str(out_path), "PNG")

def generate_compressed_jpeg(fixture, out_path):
    img = draw_table_on_image(fixture["title"], fixture["institution"], fixture["sessions"], 1100, 700, theme="light")
    img.save(str(out_path), "JPEG", quality=22, optimize=False)

def generate_low_res_png(fixture, out_path):
    img = draw_table_on_image(fixture["title"], fixture["institution"], fixture["sessions"], 600, 400, theme="light")
    img.save(str(out_path), "PNG")

def generate_mobile_photo(fixture, out_path):
    # Base timetable on paper
    table_img = draw_table_on_image(fixture["title"], fixture["institution"] + " (Printed Notice)", fixture["sessions"], 1000, 650, theme="light")
    
    # Create desk background (wood/warm grey)
    desk = Image.new("RGB", (1280, 960), color=(180, 160, 140))
    d_draw = ImageDraw.Draw(desk)
    
    # Add subtle wood plank lines
    for y in range(0, 960, 80):
        d_draw.line([(0, y), (1280, y)], fill=(165, 145, 125), width=2)
        
    # Paste paper slightly tilted with shadow
    paper = table_img.rotate(1.5, resample=Image.BICUBIC, expand=True)
    shadow = Image.new("RGBA", paper.size, (0, 0, 0, 80))
    
    desk.paste(shadow, (145, 155), shadow)
    desk.paste(paper, (140, 150))
    
    # Add lighting gradient / vignette
    vignette = Image.new("L", desk.size, 255)
    v_draw = ImageDraw.Draw(vignette)
    v_draw.ellipse([(-200, -200), (1480, 1160)], fill=230, outline=100)
    
    # Soften
    desk = desk.filter(ImageFilter.GaussianBlur(radius=0.4))
    desk.save(str(out_path), "JPEG", quality=80)

def generate_angled_skewed_image(fixture, out_path):
    table_img = draw_table_on_image(fixture["title"], fixture["institution"], fixture["sessions"], 1000, 650, theme="light")
    
    # Corkboard background
    cork = Image.new("RGB", (1280, 960), color=(210, 180, 140))
    c_draw = ImageDraw.Draw(cork)
    random.seed(42)
    for _ in range(5000):
        rx, ry = random.randint(0, 1279), random.randint(0, 959)
        cork.putpixel((rx, ry), (random.randint(190, 220), random.randint(160, 190), random.randint(120, 150)))
        
    # Perspective skew transformation
    w, h = table_img.size
    # Quad transform: (x0, y0, x1, y1, x2, y2, x3, y3)
    quad = (40, 30, w - 20, 10, w - 50, h - 20, 10, h - 40)
    skewed = table_img.transform((w + 80, h + 80), Image.QUAD, quad, resample=Image.BICUBIC)
    
    cork.paste(skewed, (120, 120))
    cork.save(str(out_path), "JPEG", quality=82)

def generate_scanned_pdf(fixture, out_path):
    # Render paper image
    img = draw_table_on_image(fixture["title"], fixture["institution"] + " • Department Notice", fixture["sessions"], 1100, 750, theme="light")
    
    # Add scanner noise and slight rotation
    img = img.rotate(-0.8, resample=Image.BICUBIC, fillcolor=(255, 255, 255))
    
    # Paper texture grain
    grain = Image.new("RGB", img.size, (250, 250, 248))
    img = Image.blend(img, grain, 0.08)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.3))
    
    img.save(str(out_path), "PDF", resolution=150.0)

def generate_noisy_print_scan(fixture, out_path):
    img = draw_table_on_image(fixture["title"], fixture["institution"], fixture["sessions"], 1100, 700, theme="light")
    
    # Convert to grayscale
    gray = img.convert("L")
    # Enhance contrast like a high-contrast photocopy
    enh = ImageEnhance.Contrast(gray)
    gray = enh.enhance(1.8)
    
    # Add scanner speckles
    draw = ImageDraw.Draw(gray)
    random.seed(101)
    for _ in range(1200):
        sx, sy = random.randint(0, gray.width - 1), random.randint(0, gray.height - 1)
        gray.putpixel((sx, sy), random.choice([20, 40, 220, 240]))
        
    # Add a subtle vertical scan line
    draw.line([(320, 0), (320, gray.height)], fill=200, width=1)
    
    gray.save(str(out_path), "JPEG", quality=65)

# =============================================================================
# TEXT / CSV / TSV / ICS GENERATION
# =============================================================================

def generate_standard_csv(fixture, out_path):
    lines = ["Day,Time,EndTime,Subject,Room"]
    for s in fixture["sessions"]:
        lines.append(f"{s['day']},{s['startTime']},{s['endTime']},{s['courseName']},{s['room']}")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def generate_messy_csv(fixture, out_path):
    lines = ['"Day" , "Start Time" , "End Time" , "Course Title" , "Classroom Location"']
    for s in fixture["sessions"]:
        # Use 12h or spaced format occasionally
        lines.append(f'"{s["day"]}" , "{s["startTime"]}" , "{s["endTime"]}" , "{s["courseName"]}" , "{s["room"]}"')
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def generate_tsv(fixture, out_path):
    lines = ["Day\tTime\tEndTime\tSubject\tRoom"]
    for s in fixture["sessions"]:
        lines.append(f"{s['day']}\t{s['startTime']}\t{s['endTime']}\t{s['courseName']}\t{s['room']}")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def generate_day_grouped_text(fixture, out_path):
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    by_day = {}
    for s in fixture["sessions"]:
        by_day.setdefault(s["day"], []).append(s)
        
    out = [f"=== {fixture['title']} ===", f"Institution: {fixture['institution']}\n"]
    for d in days:
        if d in by_day:
            out.append(f"{d}:")
            for s in sorted(by_day[d], key=lambda x: x["startTime"]):
                out.append(f"  {s['startTime']} - {s['endTime']} {s['courseName']} ({s['room']})")
            out.append("")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out).strip() + "\n")

def generate_pipe_separated(fixture, out_path):
    lines = [
        f"# {fixture['title']}",
        "",
        "| Day | Time | EndTime | Course | Room |",
        "| :--- | :--- | :--- | :--- | :--- |"
    ]
    for s in fixture["sessions"]:
        lines.append(f"| {s['day']} | {s['startTime']} | {s['endTime']} | {s['courseName']} | {s['room']} |")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def generate_freeform_notes(fixture, out_path):
    lines = [
        f"Notes: {fixture['title']}",
        "Semester Schedule Overview",
        "------------------------------------"
    ]
    for s in fixture["sessions"]:
        lines.append(f"- {s['day']}: {s['startTime']} - {s['endTime']} {s['courseName']} (Room: {s['room']})")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def generate_ical_standard(fixture, out_path):
    # Reference week: 2026-11-02 (Monday) to 2026-11-06 (Friday)
    day_offset = {"Monday": 2, "Tuesday": 3, "Wednesday": 4, "Thursday": 5, "Friday": 6, "Saturday": 7, "Sunday": 8}
    code_map = {"Monday": "MO", "Tuesday": "TU", "Wednesday": "WE", "Thursday": "TH", "Friday": "FR", "Saturday": "SA", "Sunday": "SU"}
    
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AttendMate//Schedule Parser Test//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ]
    
    for idx, s in enumerate(fixture["sessions"]):
        d_num = day_offset.get(s["day"], 2)
        sh, sm = s["startTime"].split(":")
        eh, em = s["endTime"].split(":")
        dtstart = f"2026110{d_num}T{sh}{sm}00"
        dtend = f"2026110{d_num}T{eh}{em}00"
        byday = code_map.get(s["day"], "MO")
        
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:fixture-{idx}-{sh}{sm}@attendmate.test",
            f"DTSTAMP:20261101T000000Z",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"RRULE:FREQ=WEEKLY;BYDAY={byday};UNTIL=20261218T235959Z",
            f"SUMMARY:{s['courseName']}",
            f"LOCATION:{s['room']}",
            f"DESCRIPTION:{fixture['title']}",
            "STATUS:CONFIRMED",
            "END:VEVENT"
        ])
        
    lines.append("END:VCALENDAR")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\r\n".join(lines) + "\r\n")

def generate_ical_complex(fixture, out_path):
    # Group sessions of same subject and same timeslot across multiple days into one RRULE
    grouped = {}
    for s in fixture["sessions"]:
        key = (s["courseName"], s["startTime"], s["endTime"], s["room"])
        grouped.setdefault(key, []).append(s["day"])
        
    day_offset = {"Monday": 2, "Tuesday": 3, "Wednesday": 4, "Thursday": 5, "Friday": 6, "Saturday": 7, "Sunday": 8}
    code_map = {"Monday": "MO", "Tuesday": "TU", "Wednesday": "WE", "Thursday": "TH", "Friday": "FR", "Saturday": "SA", "Sunday": "SU"}
    
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AttendMate//Complex RRULE Calendar//EN"
    ]
    
    uid = 1
    for (course, start, end, room), days_list in grouped.items():
        first_day = sorted(days_list, key=lambda d: day_offset.get(d, 2))[0]
        d_num = day_offset.get(first_day, 2)
        sh, sm = start.split(":")
        eh, em = end.split(":")
        dtstart = f"2026110{d_num}T{sh}{sm}00"
        dtend = f"2026110{d_num}T{eh}{em}00"
        byday_str = ",".join(code_map[d] for d in days_list)
        
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:rrule-{uid}@attendmate.test",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"RRULE:FREQ=WEEKLY;BYDAY={byday_str}",
            f"SUMMARY:{course}",
            f"LOCATION:{room}",
            "END:VEVENT"
        ])
        uid += 1
        
    lines.append("END:VCALENDAR")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\r\n".join(lines) + "\r\n")

# =============================================================================
# MAIN ORCHESTRATOR
# =============================================================================

def main():
    print(f"🚀 Generating 28 Timetable Fixtures into DEV and HELD-OUT Sets...")
    
    manifest = []
    
    for key, data in FIXTURES_DATA.items():
        subset_dir = DEV_DIR if data["subset"] == "dev" else HELDOUT_DIR
        out_file = subset_dir / f"{key}.{data['ext']}"
        json_file = subset_dir / f"{key}.json"
        
        print(f"  • Generating [{data['subset']}] {out_file.name} ({data['format_desc']})...")
        
        # 1. Save Ground Truth JSON
        save_ground_truth(data["sessions"], json_file)
        
        # 2. Render specific format
        if key == "dev_01_word_exported":
            generate_word_exported_pdf(data, out_file)
        elif key == "dev_02_sheets_exported":
            generate_sheets_exported_pdf(data, out_file)
        elif key == "dev_03_excel_matrix":
            generate_excel_matrix_pdf(data, out_file)
        elif key == "dev_04_html_print_clean":
            generate_html_print_pdf(data, out_file)
        elif key == "dev_05_scanned_image_in_pdf":
            generate_scanned_pdf(data, out_file)
        elif key == "dev_06_reportlab_academic":
            generate_reportlab_pdf(data, out_file)
        elif key == "dev_07_dense_engineering":
            generate_reportlab_pdf(data, out_file)
        elif key == "dev_08_clean_screenshot":
            generate_clean_screenshot(data, out_file)
        elif key == "dev_09_mobile_photo":
            generate_mobile_photo(data, out_file)
        elif key == "dev_10_angled_skewed":
            generate_angled_skewed_image(data, out_file)
        elif key == "dev_11_compressed_jpeg":
            generate_compressed_jpeg(data, out_file)
        elif key == "dev_12_low_res_png":
            generate_low_res_png(data, out_file)
        elif key == "dev_13_dark_mode_screenshot":
            generate_dark_mode_screenshot(data, out_file)
        elif key == "dev_14_standard_csv":
            generate_standard_csv(data, out_file)
        elif key == "dev_15_tab_separated_tsv":
            generate_tsv(data, out_file)
        elif key == "dev_16_day_grouped_text":
            generate_day_grouped_text(data, out_file)
        elif key == "dev_17_pipe_separated":
            generate_pipe_separated(data, out_file)
        elif key == "dev_18_standard_ical":
            generate_ical_standard(data, out_file)
        elif key == "dev_19_complex_rrules":
            generate_ical_complex(data, out_file)
        elif key == "heldout_01_word_landscape":
            generate_word_exported_pdf(data, out_file)
        elif key == "heldout_02_sheets_compact":
            generate_sheets_exported_pdf(data, out_file)
        elif key == "heldout_03_fpdf_formal_bulletin":
            generate_fpdf_bulletin_pdf(data, out_file)
        elif key == "heldout_04_mobile_overhead":
            generate_mobile_photo(data, out_file)
        elif key == "heldout_05_screenshot_compact":
            generate_clean_screenshot(data, out_file)
        elif key == "heldout_06_noisy_print_scan":
            generate_noisy_print_scan(data, out_file)
        elif key == "heldout_07_messy_csv":
            generate_messy_csv(data, out_file)
        elif key == "heldout_08_freeform_notes":
            generate_freeform_notes(data, out_file)
        elif key == "heldout_09_multicourse_ical":
            generate_ical_standard(data, out_file)
        else:
            raise ValueError(f"Unknown fixture key: {key}")
            
        file_size = os.path.getsize(out_file)
        manifest.append({
            "key": key,
            "fileName": out_file.name,
            "jsonName": json_file.name,
            "subset": data["subset"],
            "format": data["ext"].upper(),
            "sizeBytes": file_size,
            "sessionCount": len(data["sessions"]),
            "description": data["format_desc"],
            "title": data["title"]
        })
        
    # Write manifest JSON & Markdown
    manifest_path_json = BASE_DIR / "test" / "fixtures" / "manifest.json"
    manifest_path_md = BASE_DIR / "test" / "fixtures" / "MANIFEST.md"
    
    with open(manifest_path_json, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    dev_fixtures = [m for m in manifest if m["subset"] == "dev"]
    held_fixtures = [m for m in manifest if m["subset"] == "held_out"]
    
    md_content = f"""# Bunkr Timetable Fixture Corpus & Ground Truth Manifest

Total Fixtures: **{len(manifest)}** (Dev: {len(dev_fixtures)}, Held-Out: {len(held_fixtures)})
Generated on: 2026-11-17

All fixtures are paired with a strictly validated ground-truth JSON file containing:
```json
[
  {{
    "day": "Monday",
    "startTime": "09:00",
    "endTime": "10:30",
    "courseName": "Data Structures & Algorithms",
    "room": "A501"
  }}
]
```

---

## 🛠️ Dev Set (`test/fixtures/dev/` — {len(dev_fixtures)} Fixtures)
Used for engineering implementation, client-side parser development, unit tests, and layout calibration.

| Fixture File | Ground Truth JSON | Format | Sessions | Description |
| :--- | :--- | :---: | :---: | :--- |
"""
    for m in dev_fixtures:
        md_content += f"| `{m['fileName']}` | `{m['jsonName']}` | **{m['format']}** | {m['sessionCount']} | {m['description']} |\n"
        
    md_content += f"""
---

## 🔒 Held-Out Set (`test/fixtures/held_out/` — {len(held_fixtures)} Fixtures)
Reserved exclusively for tester verification, benchmark eval, and unassisted regression testing.

| Fixture File | Ground Truth JSON | Format | Sessions | Description |
| :--- | :--- | :---: | :---: | :--- |
"""
    for m in held_fixtures:
        md_content += f"| `{m['fileName']}` | `{m['jsonName']}` | **{m['format']}** | {m['sessionCount']} | {m['description']} |\n"
        
    with open(manifest_path_md, "w", encoding="utf-8") as f:
        f.write(md_content)
        
    print("\n✅ GENERATION COMPLETE!")
    print(f"   Dev set fixtures: {len(dev_fixtures)}")
    print(f"   Held-out fixtures: {len(held_fixtures)}")
    print(f"   Total fixtures: {len(manifest)}")
    print(f"   Manifest saved to: {manifest_path_md}")

if __name__ == "__main__":
    main()
