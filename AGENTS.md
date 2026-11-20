# Canvas LMS & Bunkr Architecture Guidelines

When developing, refactoring, or testing features in this repository, strictly adhere to the following architectural invariants:

## 1. Domain & Route Isolation
- **Page Context Router**: Always classify the page context via `window.CanvasRouter` before executing scrapers:
  - `CANVAS_GRADES`: `/courses/*/grades*` -> Run `CanvasGrades` only.
  - `CANVAS_ASSIGNMENTS`: `/courses/*/assignments*` or dashboard -> Run `CanvasAssignments` only.
  - `CANVAS_MODULES` / `FILES`: `/courses/*/modules*` or `/files*` -> Run `CanvasFiles` only.
  - `RISHIVERSE_ERP`: ERP domains -> Run attendance & timetable engines only.
- **Scraper Separation**: NEVER run attendance scrapers (`scrapeFromTables`, `scrapeCanvasLMS`) on `table#grades_summary` or `tr.student_assignment`.

## 2. Quiescent Safe Mode for Academic Integrity
- **Exam Invariant**: Whenever the URL matches active quiz taking, proctored exams, or submission forms (`/quizzes/*/take`, `/quizzes/take`, `/submissions/new`, `/examinations/`, `canvas-speedgrader`):
  - Immediately enter Quiescent Safe Mode.
  - Disconnect all MutationObservers, suppress all injected DOM overlays, and halt all background scanning.
  - Zero modifications to active test-taking forms are permitted.

## 3. Host Layout Containment & Non-Destructive Injections
- **No Table Widening**: Never append unconstrained columns or modify `#grades_summary` table layout in ways that cause horizontal overflow.
- **Sidebar Protection**: Maintain strict containment on Canvas layout containers (`#not_right_side`, `#right-side`, `.ic-Layout-contentMain`) so the Canvas right sidebar is never overlapped.
- **Native Instructure Canvas Aesthetics**: Injected components must match Canvas typography (Lato/sans-serif), neutral card borders (`#E2E8F0`), and clean badge pill styling.

## 4. Evaluation & Grade Calculations
- **Dual Scale Parity**: Maintain exact mathematical conversion between percentage and 10-point SGPA ($SGPA = \text{Percentage} / 10$).
- **Credit Weighting**: Multi-course SGPA must use official curriculum credits ($SGPA = \frac{\sum (\text{Course SGPA} \times \text{Credits})}{\sum \text{Credits}}$).
- **Status Parsing Invariant**: Never check `.includes('submitted')` without guarding `!/unsubmitted/i.test(...)`.

## 5. Privacy & Zero-Telemetry Contract
- All scraping, target grade forecasting, and file indexing must remain 100% local-first in the user's browser. No student scores or credentials may be transmitted to external servers.
