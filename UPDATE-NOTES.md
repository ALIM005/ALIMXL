# ALIMXL — 4 Updates — আপডেট

This is a newly reconstructed cumulative chart-update project, not a renamed
original ZIP and not a byte-identical recovery of the earlier unavailable ZIP.

Four update groups
1. Chart source numeric correctness: finite numeric values/strings retained;
   headers, blanks, booleans, errors and invalid text are not silently zero.
2. Existing subtitle, axis titles and legend visibility/position wired to display.
3. Pie/Of-Pie: real smallest-two-category breakout replaces fabricated 60/40;
   negative/all-zero messages; one-slice full circle; normalized pie weights.
4. Regression tests, source comparison, signed-geometry baseline and packaging.
Signed baseline includes zero-inclusive scale, positive/negative bar direction,
line/area sign, area closure at zero, category centers, fitted horizontal bars.

ACTUAL verification for this release
24 node:test tests passed; includes 1000 deterministic random geometry cases.
Chart configuration source-level assertions passed (NOT browser tests).
app/page.tsx outside allowed chart regions is identical to the supplied original.
All other existing application/config/dependency files are byte-identical.
ZIP integrity and main-file identity were verified after archive creation.
Full TypeScript, ESLint, Next build, browser, offline and print tests NOT RUN here:
project dependencies are unavailable. No zero-regression guarantee is claimed.

Intentional omissions
.env.local excluded to avoid exposing secrets: restore YOUR private original.
.env.example has variable names only. Generated tsconfig.tsbuildinfo excluded.
No other original files omitted. Original lint reports/FINAL-CHECK notes are
historical and NOT evidence for this release. See UPDATE-TEST-RESULTS.txt.

Known limits / changed behaviour
Blank/error source rows are omitted; line charts connect remaining points.
Negative pie input is rejected, not converted to positive magnitude.
Of-Pie with fewer than 3 positive categories falls back to a regular pie.
Secondary percentages refer to that secondary pie (not the main total).
Legend lists categories and values: multi-series is NOT newly implemented.
series/3D/realistic/shape configuration fields retain their previous limitations.
Radar still uses magnitude; scatter/bubble still use category-index input.
Stock still derives synthetic high/low/open from one value. Its scale includes
legacy extents, but this is NOT validated OHLC financial data.
Dense labels, tiny pie slices and saved-workbook/print behaviour need local review.
No formula, login, save, workbook schema, service worker or other-page changes.

Local verification after this batch
Keep original backup, extract separately, restore your private .env.local, run:
  npm ci
  node --test tests/chart-geometry.test.mjs
  npm run check
  npm run build
Check -100/0/100; all-positive/all-negative/all-zero; header/error/blank source;
single-value pie; Of-Pie totals; legend positions/off; subtitle and axis titles;
old workbook open/save and the existing print workflow.

Rollback: restore original app/page.tsx; remove new chart-geometry modules/tests.
No persisted workbook migration is required.
