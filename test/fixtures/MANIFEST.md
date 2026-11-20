# Bunkr Timetable Fixture Corpus & Ground Truth Manifest

Total Fixtures: **28** (Dev: 19, Held-Out: 9)
Generated on: 2026-11-17

All fixtures are paired with a strictly validated ground-truth JSON file containing:
```json
[
  {
    "day": "Monday",
    "startTime": "09:00",
    "endTime": "10:30",
    "courseName": "Data Structures & Algorithms",
    "room": "A501"
  }
]
```

---

## 🛠️ Dev Set (`test/fixtures/dev/` — 19 Fixtures)
Used for engineering implementation, client-side parser development, unit tests, and layout calibration.

| Fixture File | Ground Truth JSON | Format | Sessions | Description |
| :--- | :--- | :---: | :---: | :--- |
| `dev_01_word_exported.pdf` | `dev_01_word_exported.json` | **PDF** | 6 | Word-exported schedule document with classic table formatting and serif typography |
| `dev_02_sheets_exported.pdf` | `dev_02_sheets_exported.json` | **PDF** | 5 | Google Sheets exported grid with green headers and alternating row fills |
| `dev_03_excel_matrix.pdf` | `dev_03_excel_matrix.json` | **PDF** | 5 | Microsoft Excel matrix schedule with deep blue header styling and borders |
| `dev_04_html_print_clean.pdf` | `dev_04_html_print_clean.json` | **PDF** | 5 | Clean HTML-print timetable exported directly from a web portal |
| `dev_05_scanned_image_in_pdf.pdf` | `dev_05_scanned_image_in_pdf.json` | **PDF** | 5 | Scanned document embedded as full-page raster image in PDF with paper grain and tilt |
| `dev_06_reportlab_academic.pdf` | `dev_06_reportlab_academic.json` | **PDF** | 5 | Native ReportLab vector table with Platypus Flowables and styled text |
| `dev_07_dense_engineering.pdf` | `dev_07_dense_engineering.json` | **PDF** | 9 | Dense engineering schedule table with 5 days and multiple tight lecture/lab slots |
| `dev_08_clean_screenshot.png` | `dev_08_clean_screenshot.json` | **PNG** | 5 | Clean desktop web portal screenshot with crisp text and timetable grid |
| `dev_09_mobile_photo.jpg` | `dev_09_mobile_photo.json` | **JPG** | 5 | Smartphone camera photo of a physical printed paper timetable with lighting gradient |
| `dev_10_angled_skewed.jpg` | `dev_10_angled_skewed.json` | **JPG** | 5 | Perspective-skewed photo taken at an angle with slight lens distortion |
| `dev_11_compressed_jpeg.jpg` | `dev_11_compressed_jpeg.json` | **JPG** | 4 | Heavily compressed JPEG image showing compression blocks and slight color ringing |
| `dev_12_low_res_png.png` | `dev_12_low_res_png.json` | **PNG** | 4 | Low-resolution 480x320 PNG image typical of a cropped mobile snapshot |
| `dev_13_dark_mode_screenshot.png` | `dev_13_dark_mode_screenshot.json` | **PNG** | 5 | Modern dark mode UI screenshot with charcoal slate background and bright text chips |
| `dev_14_standard_csv.csv` | `dev_14_standard_csv.json` | **CSV** | 5 | Standard CSV file with header Day,Time,EndTime,Subject,Room |
| `dev_15_tab_separated_tsv.tsv` | `dev_15_tab_separated_tsv.json` | **TSV** | 5 | Tab-separated values TSV file |
| `dev_16_day_grouped_text.txt` | `dev_16_day_grouped_text.json` | **TXT** | 5 | Human-readable plain text outline grouped under day headings |
| `dev_17_pipe_separated.txt` | `dev_17_pipe_separated.json` | **TXT** | 4 | Markdown pipe table plain text representation |
| `dev_18_standard_ical.ics` | `dev_18_standard_ical.json` | **ICS** | 4 | RFC 5545 iCalendar standard .ics file with recurring VEVENT |
| `dev_19_complex_rrules.ics` | `dev_19_complex_rrules.json` | **ICS** | 5 | RFC 5545 iCalendar with multi-day BYDAY recurrence in RRULE |

---

## 🔒 Held-Out Set (`test/fixtures/held_out/` — 9 Fixtures)
Reserved exclusively for tester verification, benchmark eval, and unassisted regression testing.

| Fixture File | Ground Truth JSON | Format | Sessions | Description |
| :--- | :--- | :---: | :---: | :--- |
| `heldout_01_word_landscape.pdf` | `heldout_01_word_landscape.json` | **PDF** | 5 | Landscape Word-exported document with merged laboratory slot cells |
| `heldout_02_sheets_compact.pdf` | `heldout_02_sheets_compact.json` | **PDF** | 5 | Compact spreadsheet export with condensed column structure |
| `heldout_03_fpdf_formal_bulletin.pdf` | `heldout_03_fpdf_formal_bulletin.json` | **PDF** | 5 | Formal university bulletin PDF generated via FPDF with official headers and borders |
| `heldout_04_mobile_overhead.jpg` | `heldout_04_mobile_overhead.json` | **JPG** | 5 | Overhead smartphone photo with authentic perspective tilt, paper creases, and soft shadows |
| `heldout_05_screenshot_compact.png` | `heldout_05_screenshot_compact.json` | **PNG** | 5 | Compact mobile app view screenshot with cards and pill badges |
| `heldout_06_noisy_print_scan.jpg` | `heldout_06_noisy_print_scan.json` | **JPG** | 5 | Grayscale photocopy scan with salt-and-pepper noise, scanner streaks, and contrast loss |
| `heldout_07_messy_csv.csv` | `heldout_07_messy_csv.json` | **CSV** | 5 | Messy CSV with quoted entries, 12-hour AM/PM times, and extra spacing |
| `heldout_08_freeform_notes.txt` | `heldout_08_freeform_notes.json` | **TXT** | 5 | Informal student notes format with bullet points and room mentions |
| `heldout_09_multicourse_ical.ics` | `heldout_09_multicourse_ical.json` | **ICS** | 5 | Comprehensive iCalendar export with explicit TZID and weekly recurring VEVENTs |
