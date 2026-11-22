ALIMXL — PHASE 4 UPDATE ONLY

This is NOT a full project. Apply ONLY to the user's 7,513,699-byte ALIMXL.zip.
Back up the existing project and workbooks. Stop the dev server first.
Copy app/, components/, lib/ and tests/ from this archive into matching project
paths. Replace the eight modified files and add the four new files. Do not delete
other project files or change .env, node_modules, settings backups or workbooks.
The lib/print-i18n.ts file MUST be replaced too; it now includes new message keys.
update-docs/ is documentation only; it does not need copying into the application.
No new npm dependency. No database, formula engine, sheet geometry, or app-wide
locale schema changes. This is a print-scoped interface language preference;
existing AppSettings.locale controls data formatting and does not support Arabic UI.

NEW PRINT FLOW
Prepared preview -> hidden same-page iframe -> browser/system print dialog.
No visible popup/tab is opened. The final browser dialog remains necessary in
ordinary browser mode. This is NOT silent/direct printing and does not list OS
printers inside the app. Native dialog overrides still affect physical output.
Same prepared preview snapshot is used when current inputs match. Fresh openings
invalidate old cached snapshots. The frame waits for fonts; afterprint/media/focus
signals clean it up. Never reports that a job actually printed successfully.
If a browser never sends close signals, preparation may remain busy. Edge Print,
Cancel, repeated jobs and focus restoration still need real-browser acceptance.
Do not assume the mocked lifecycle tests prove a real browser/printer works.

LANGUAGE
English default; Bengali and Arabic selectable in print settings, standalone
Page Setup and Preview. Shared in-tab updates and saved preference where available.
Arabic controls are RTL; worksheet column order and cell contents are NOT mirrored.
Workbook values, names and user-written header/footer templates are not translated.
Browser/system dialog language is controlled by browser/OS, not this selector.
164 dictionary keys per language. Updated six UI components audited for raw text
nodes and unknown literal translation keys; no issues found. Unknown internal
errors use a localized generic message rather than mixed-language raw text.
Input coordinates and numeric input syntax remain ASCII/LTR where appropriate.

CHECKS RUN IN THIS ENVIRONMENT
17 source files syntax-parsed (Babel, not TypeScript semantic checking).
32 existing print engine tests + 17 new language/frame tests passed.
151 other formula/chart/recovery/backup/integrity tests passed.
30 mocked UI/markup assertions passed. These are NOT genuine React/browser tests.
NOT RUN: full typecheck, lint, Next production build, actual Edge/PDF/printer,
actual Bengali/Arabic font rendering, XLSX round-trip, native-speaker review.

RUN LOCALLY BEFORE OFFICE USE
npm run typecheck
npm run lint
npm run build
node --test tests/print-phase3.test.mjs tests/print-phase4.test.mjs
npm run dev

ACCEPTANCE
1. Use a copy of salary workbook. Test A4 portrait and landscape separately.
2. Verify preview page count, all columns, repeated headings, body IDs and total.
3. Print: no separate about:blank window; final native dialog should open.
4. Cancel: app usable again; repeat Print several times, no duplicate frames.
5. Save as PDF with matching paper/orientation and compare every page.
6. Test English/Bengali/Arabic labels, warnings, selector persistence and RTL.
7. Verify source cells, row heights, formatting and workbook headers unchanged.
8. Test a physical printer only after PDF checks pass.

ROLLBACK
Stop server. Restore the eight changed files from the original project backup.
Remove new lib/print-frame.ts, components/print/usePrintI18n.ts,
components/print/PrintLanguageSetting.tsx and optional tests/print-phase4.test.mjs.
If necessary clear the .next build cache and restart. No rollback originals,
node_modules, .git, secrets or unchanged source are bundled.
