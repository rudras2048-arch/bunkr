# Third-Party Software Notices and Licenses

This project incorporates third-party open-source components and software libraries. This document provides attribution and notices in accordance with the licensing terms of each third-party component.

## Browser Extension & Web Components

| Component | Copyright / Authors | License (SPDX) | Official URL | Usage Note |
| :--- | :--- | :--- | :--- | :--- |
| **GNU Ocrad / ocrad.js** | Antonio Diaz Diaz, Kevin Kwok (antimatter15) | GPL-3.0-or-later | https://www.gnu.org/software/ocrad/ | Isolated client-side optical character recognition engine for timetable screenshots. Excluded from Chrome Web Store distribution builds to maintain store compliance. |
| **Tesseract.js / Tesseract OCR** | Jerome Wu, naptha, HP Labs, Google LLC | Apache-2.0 | https://github.com/naptha/tesseract.js | Permissive OCR engine option used for test automation and web worker schedule parsing. |
| **PDF.js** | Mozilla Foundation and Individual Contributors | Apache-2.0 | https://github.com/mozilla/pdf.js | Reference patterns and specifications for in-browser client-side PDF text extraction and timetable parsing. |
| **Playwright** | Microsoft Corporation | Apache-2.0 | https://github.com/microsoft/playwright | Developer and CI test automation framework for headless browser integration testing. |

## Mobile Subsystem Dependencies (Flutter / Dart)

The following components are declared in `pubspec.yaml` for the companion mobile subsystem:

| Component | Copyright / Authors | License (SPDX) | Official URL | Usage Note |
| :--- | :--- | :--- | :--- | :--- |
| **google_fonts** | Flutter Authors | Apache-2.0 | https://pub.dev/packages/google_fonts | Typography and font styling for cross-platform UI. |
| **cupertino_icons** | Flutter Authors | MIT | https://pub.dev/packages/cupertino_icons | iOS-styled iconography set for UI elements. |
| **sqflite** | Alexandre Roux | BSD-2-Clause | https://pub.dev/packages/sqflite | Local SQLite database engine for offline attendance caching. |
| **intl** | Dart Project Authors | BSD-3-Clause | https://pub.dev/packages/intl | Date formatting, localization, and number formatting utilities. |
| **uuid** | Yulian Kuncheff | MIT | https://pub.dev/packages/uuid | RFC4122 compliant UUID generation for course and session records. |
| **provider** | Remi Rousselet | MIT | https://pub.dev/packages/provider | Reactive state management for Flutter widgets. |
| **flutter_local_notifications** | Michael Bui | BSD-3-Clause | https://pub.dev/packages/flutter_local_notifications | Cross-platform local notifications for class nudges and attendance alerts. |

## Licensing Architecture Notes

1. **Permissive Chrome Web Store Distribution**:
   - The production Chrome Web Store package (`scripts/package_cws.js`) is compiled solely from MIT and Apache-2.0 licensed assets.
   - Copyleft assets (`ocrad.js`) remain strictly quarantined and are omitted from store release archives.
2. **Local-First Privacy Architecture**:
   - None of the third-party libraries bundled in Bunkr send telemetry, user identity, attendance numbers, or grade records to external services.
