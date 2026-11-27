ALIMXL
├─ app
│  ├─ api
│  │  ├─ ai
│  │  │  └─ remove-background
│  │  │     └─ route.ts
│  │  ├─ auth
│  │  │  ├─ forgot-password
│  │  │  │  └─ route.ts
│  │  │  ├─ login
│  │  │  │  └─ route.ts
│  │  │  ├─ logout
│  │  │  │  └─ route.ts
│  │  │  ├─ me
│  │  │  │  └─ route.ts
│  │  │  ├─ register
│  │  │  │  └─ route.ts
│  │  │  └─ reset-password
│  │  │     └─ route.ts
│  │  └─ route.ts
│  ├─ dynamic-arrays
│  │  └─ page.tsx
│  ├─ favicon.ico
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ login
│  │  └─ page.tsx
│  ├─ manifest.ts
│  ├─ page.tsx
│  ├─ photo-studio
│  │  └─ page.tsx
│  ├─ robots.ts
│  ├─ settings
│  │  └─ page.tsx
│  └─ sitemap.ts
├─ components
│  ├─ AccountMenu.tsx
│  ├─ AlimxlHome.tsx
│  ├─ MyFiles.tsx
│  ├─ OfflineSetup.tsx
│  ├─ PdfTableImport.tsx
│  ├─ print
│  │  ├─ LivePrintPreview.tsx
│  │  ├─ PageSetupDialog.tsx
│  │  ├─ print-output.tsx
│  │  ├─ PrintBreakEditor.tsx
│  │  ├─ PrintDialog.tsx
│  │  ├─ PrintHeaderFooter.tsx
│  │  ├─ PrintLanguageSetting.tsx
│  │  ├─ PrintPreviewModal.tsx
│  │  └─ usePrintI18n.ts
│  ├─ RecoveryDrafts.tsx
│  ├─ SettingsProvider.tsx
│  ├─ WelcomeGate.tsx
│  └─ WelcomeScreen.tsx
├─ docs
│  └─ testing
│     └─ ALIMXL_4.0.0_MANUAL_PRACTICAL_TEST_LEDGER.md
├─ eslint.config.mjs
├─ FINAL-CHECK-BN.txt
├─ formula-engine-extracted.txt
├─ lib
│  ├─ app-brand.ts
│  ├─ app-settings.ts
│  ├─ auth-db.ts
│  ├─ auth-session.ts
│  ├─ batch1-functions.mjs
│  ├─ built-in-templates.ts
│  ├─ chart-geometry.d.mts
│  ├─ chart-geometry.mjs
│  ├─ copy-pdf-assets.mjs
│  ├─ currency.ts
│  ├─ date-time-engine.ts
│  ├─ device-files.ts
│  ├─ extra-functions-3.mjs
│  ├─ extra-functions.mjs
│  ├─ formula-advanced-1.mjs
│  ├─ formula-advanced-2.mjs
│  ├─ formula-advanced-3.mjs
│  ├─ formula-advanced-4.mjs
│  ├─ formula-advanced-5.mjs
│  ├─ formula-advanced-registry.mjs
│  ├─ formula-core.mjs
│  ├─ local-workbooks.ts
│  ├─ print-borders.ts
│  ├─ print-frame.ts
│  ├─ print-i18n.ts
│  ├─ print-layout.ts
│  ├─ print-pages.ts
│  ├─ print-preparation.ts
│  ├─ print-render.ts
│  ├─ print-text-measure.ts
│  ├─ recovery-policy.d.mts
│  ├─ recovery-policy.mjs
│  ├─ recovery-store.ts
│  ├─ spill-dependency.mjs
│  ├─ spill-engine.mjs
│  ├─ spill-functions.mjs
│  ├─ workbook-backup.d.mts
│  ├─ workbook-backup.mjs
│  ├─ workbook-integrity.d.mts
│  ├─ workbook-integrity.mjs
│  ├─ xlsx-conditional-formatting.mjs
│  ├─ xlsx-data-validation.mjs
│  ├─ xlsx-format-io.mjs
│  └─ xlsx-named-ranges.mjs
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ public
│  ├─ icons
│  │  ├─ banner.png
│  │  ├─ icon-192.png
│  │  ├─ icon-512.png
│  │  └─ icon-maskable-512.png
│  ├─ pdf-import
│  │  ├─ asset-manifest.json
│  │  ├─ cmaps
│  │  │  ├─ 78-EUC-H.bcmap
│  │  │  ├─ 78-EUC-V.bcmap
│  │  │  ├─ 78-H.bcmap
│  │  │  ├─ 78-RKSJ-H.bcmap
│  │  │  ├─ 78-RKSJ-V.bcmap
│  │  │  ├─ 78-V.bcmap
│  │  │  ├─ 78ms-RKSJ-H.bcmap
│  │  │  ├─ 78ms-RKSJ-V.bcmap
│  │  │  ├─ 83pv-RKSJ-H.bcmap
│  │  │  ├─ 90ms-RKSJ-H.bcmap
│  │  │  ├─ 90ms-RKSJ-V.bcmap
│  │  │  ├─ 90msp-RKSJ-H.bcmap
│  │  │  ├─ 90msp-RKSJ-V.bcmap
│  │  │  ├─ 90pv-RKSJ-H.bcmap
│  │  │  ├─ 90pv-RKSJ-V.bcmap
│  │  │  ├─ Add-H.bcmap
│  │  │  ├─ Add-RKSJ-H.bcmap
│  │  │  ├─ Add-RKSJ-V.bcmap
│  │  │  ├─ Add-V.bcmap
│  │  │  ├─ Adobe-CNS1-0.bcmap
│  │  │  ├─ Adobe-CNS1-1.bcmap
│  │  │  ├─ Adobe-CNS1-2.bcmap
│  │  │  ├─ Adobe-CNS1-3.bcmap
│  │  │  ├─ Adobe-CNS1-4.bcmap
│  │  │  ├─ Adobe-CNS1-5.bcmap
│  │  │  ├─ Adobe-CNS1-6.bcmap
│  │  │  ├─ Adobe-CNS1-UCS2.bcmap
│  │  │  ├─ Adobe-GB1-0.bcmap
│  │  │  ├─ Adobe-GB1-1.bcmap
│  │  │  ├─ Adobe-GB1-2.bcmap
│  │  │  ├─ Adobe-GB1-3.bcmap
│  │  │  ├─ Adobe-GB1-4.bcmap
│  │  │  ├─ Adobe-GB1-5.bcmap
│  │  │  ├─ Adobe-GB1-UCS2.bcmap
│  │  │  ├─ Adobe-Japan1-0.bcmap
│  │  │  ├─ Adobe-Japan1-1.bcmap
│  │  │  ├─ Adobe-Japan1-2.bcmap
│  │  │  ├─ Adobe-Japan1-3.bcmap
│  │  │  ├─ Adobe-Japan1-4.bcmap
│  │  │  ├─ Adobe-Japan1-5.bcmap
│  │  │  ├─ Adobe-Japan1-6.bcmap
│  │  │  ├─ Adobe-Japan1-UCS2.bcmap
│  │  │  ├─ Adobe-Korea1-0.bcmap
│  │  │  ├─ Adobe-Korea1-1.bcmap
│  │  │  ├─ Adobe-Korea1-2.bcmap
│  │  │  ├─ Adobe-Korea1-UCS2.bcmap
│  │  │  ├─ B5-H.bcmap
│  │  │  ├─ B5-V.bcmap
│  │  │  ├─ B5pc-H.bcmap
│  │  │  ├─ B5pc-V.bcmap
│  │  │  ├─ CNS-EUC-H.bcmap
│  │  │  ├─ CNS-EUC-V.bcmap
│  │  │  ├─ CNS1-H.bcmap
│  │  │  ├─ CNS1-V.bcmap
│  │  │  ├─ CNS2-H.bcmap
│  │  │  ├─ CNS2-V.bcmap
│  │  │  ├─ ETen-B5-H.bcmap
│  │  │  ├─ ETen-B5-V.bcmap
│  │  │  ├─ ETenms-B5-H.bcmap
│  │  │  ├─ ETenms-B5-V.bcmap
│  │  │  ├─ ETHK-B5-H.bcmap
│  │  │  ├─ ETHK-B5-V.bcmap
│  │  │  ├─ EUC-H.bcmap
│  │  │  ├─ EUC-V.bcmap
│  │  │  ├─ Ext-H.bcmap
│  │  │  ├─ Ext-RKSJ-H.bcmap
│  │  │  ├─ Ext-RKSJ-V.bcmap
│  │  │  ├─ Ext-V.bcmap
│  │  │  ├─ GB-EUC-H.bcmap
│  │  │  ├─ GB-EUC-V.bcmap
│  │  │  ├─ GB-H.bcmap
│  │  │  ├─ GB-V.bcmap
│  │  │  ├─ GBK-EUC-H.bcmap
│  │  │  ├─ GBK-EUC-V.bcmap
│  │  │  ├─ GBK2K-H.bcmap
│  │  │  ├─ GBK2K-V.bcmap
│  │  │  ├─ GBKp-EUC-H.bcmap
│  │  │  ├─ GBKp-EUC-V.bcmap
│  │  │  ├─ GBpc-EUC-H.bcmap
│  │  │  ├─ GBpc-EUC-V.bcmap
│  │  │  ├─ GBT-EUC-H.bcmap
│  │  │  ├─ GBT-EUC-V.bcmap
│  │  │  ├─ GBT-H.bcmap
│  │  │  ├─ GBT-V.bcmap
│  │  │  ├─ GBTpc-EUC-H.bcmap
│  │  │  ├─ GBTpc-EUC-V.bcmap
│  │  │  ├─ H.bcmap
│  │  │  ├─ Hankaku.bcmap
│  │  │  ├─ Hiragana.bcmap
│  │  │  ├─ HKdla-B5-H.bcmap
│  │  │  ├─ HKdla-B5-V.bcmap
│  │  │  ├─ HKdlb-B5-H.bcmap
│  │  │  ├─ HKdlb-B5-V.bcmap
│  │  │  ├─ HKgccs-B5-H.bcmap
│  │  │  ├─ HKgccs-B5-V.bcmap
│  │  │  ├─ HKm314-B5-H.bcmap
│  │  │  ├─ HKm314-B5-V.bcmap
│  │  │  ├─ HKm471-B5-H.bcmap
│  │  │  ├─ HKm471-B5-V.bcmap
│  │  │  ├─ HKscs-B5-H.bcmap
│  │  │  ├─ HKscs-B5-V.bcmap
│  │  │  ├─ Katakana.bcmap
│  │  │  ├─ KSC-EUC-H.bcmap
│  │  │  ├─ KSC-EUC-V.bcmap
│  │  │  ├─ KSC-H.bcmap
│  │  │  ├─ KSC-Johab-H.bcmap
│  │  │  ├─ KSC-Johab-V.bcmap
│  │  │  ├─ KSC-V.bcmap
│  │  │  ├─ KSCms-UHC-H.bcmap
│  │  │  ├─ KSCms-UHC-HW-H.bcmap
│  │  │  ├─ KSCms-UHC-HW-V.bcmap
│  │  │  ├─ KSCms-UHC-V.bcmap
│  │  │  ├─ KSCpc-EUC-H.bcmap
│  │  │  ├─ KSCpc-EUC-V.bcmap
│  │  │  ├─ LICENSE
│  │  │  ├─ NWP-H.bcmap
│  │  │  ├─ NWP-V.bcmap
│  │  │  ├─ RKSJ-H.bcmap
│  │  │  ├─ RKSJ-V.bcmap
│  │  │  ├─ Roman.bcmap
│  │  │  ├─ UniCNS-UCS2-H.bcmap
│  │  │  ├─ UniCNS-UCS2-V.bcmap
│  │  │  ├─ UniCNS-UTF16-H.bcmap
│  │  │  ├─ UniCNS-UTF16-V.bcmap
│  │  │  ├─ UniCNS-UTF32-H.bcmap
│  │  │  ├─ UniCNS-UTF32-V.bcmap
│  │  │  ├─ UniCNS-UTF8-H.bcmap
│  │  │  ├─ UniCNS-UTF8-V.bcmap
│  │  │  ├─ UniGB-UCS2-H.bcmap
│  │  │  ├─ UniGB-UCS2-V.bcmap
│  │  │  ├─ UniGB-UTF16-H.bcmap
│  │  │  ├─ UniGB-UTF16-V.bcmap
│  │  │  ├─ UniGB-UTF32-H.bcmap
│  │  │  ├─ UniGB-UTF32-V.bcmap
│  │  │  ├─ UniGB-UTF8-H.bcmap
│  │  │  ├─ UniGB-UTF8-V.bcmap
│  │  │  ├─ UniJIS-UCS2-H.bcmap
│  │  │  ├─ UniJIS-UCS2-HW-H.bcmap
│  │  │  ├─ UniJIS-UCS2-HW-V.bcmap
│  │  │  ├─ UniJIS-UCS2-V.bcmap
│  │  │  ├─ UniJIS-UTF16-H.bcmap
│  │  │  ├─ UniJIS-UTF16-V.bcmap
│  │  │  ├─ UniJIS-UTF32-H.bcmap
│  │  │  ├─ UniJIS-UTF32-V.bcmap
│  │  │  ├─ UniJIS-UTF8-H.bcmap
│  │  │  ├─ UniJIS-UTF8-V.bcmap
│  │  │  ├─ UniJIS2004-UTF16-H.bcmap
│  │  │  ├─ UniJIS2004-UTF16-V.bcmap
│  │  │  ├─ UniJIS2004-UTF32-H.bcmap
│  │  │  ├─ UniJIS2004-UTF32-V.bcmap
│  │  │  ├─ UniJIS2004-UTF8-H.bcmap
│  │  │  ├─ UniJIS2004-UTF8-V.bcmap
│  │  │  ├─ UniJISPro-UCS2-HW-V.bcmap
│  │  │  ├─ UniJISPro-UCS2-V.bcmap
│  │  │  ├─ UniJISPro-UTF8-V.bcmap
│  │  │  ├─ UniJISX0213-UTF32-H.bcmap
│  │  │  ├─ UniJISX0213-UTF32-V.bcmap
│  │  │  ├─ UniJISX02132004-UTF32-H.bcmap
│  │  │  ├─ UniJISX02132004-UTF32-V.bcmap
│  │  │  ├─ UniKS-UCS2-H.bcmap
│  │  │  ├─ UniKS-UCS2-V.bcmap
│  │  │  ├─ UniKS-UTF16-H.bcmap
│  │  │  ├─ UniKS-UTF16-V.bcmap
│  │  │  ├─ UniKS-UTF32-H.bcmap
│  │  │  ├─ UniKS-UTF32-V.bcmap
│  │  │  ├─ UniKS-UTF8-H.bcmap
│  │  │  ├─ UniKS-UTF8-V.bcmap
│  │  │  ├─ V.bcmap
│  │  │  └─ WP-Symbol.bcmap
│  │  ├─ pdf.worker.min.mjs
│  │  ├─ standard_fonts
│  │  │  ├─ FoxitDingbats.pfb
│  │  │  ├─ FoxitFixed.pfb
│  │  │  ├─ FoxitFixedBold.pfb
│  │  │  ├─ FoxitFixedBoldItalic.pfb
│  │  │  ├─ FoxitFixedItalic.pfb
│  │  │  ├─ FoxitSerif.pfb
│  │  │  ├─ FoxitSerifBold.pfb
│  │  │  ├─ FoxitSerifBoldItalic.pfb
│  │  │  ├─ FoxitSerifItalic.pfb
│  │  │  ├─ FoxitSymbol.pfb
│  │  │  ├─ LiberationSans-Bold.ttf
│  │  │  ├─ LiberationSans-BoldItalic.ttf
│  │  │  ├─ LiberationSans-Italic.ttf
│  │  │  ├─ LiberationSans-Regular.ttf
│  │  │  ├─ LICENSE_FOXIT
│  │  │  └─ LICENSE_LIBERATION
│  │  └─ wasm
│  │     ├─ jbig2.wasm
│  │     ├─ jbig2_nowasm_fallback.js
│  │     ├─ LICENSE_JBIG2
│  │     ├─ LICENSE_OPENJPEG
│  │     ├─ LICENSE_PDFJS_JBIG2
│  │     ├─ LICENSE_PDFJS_OPENJPEG
│  │     ├─ LICENSE_PDFJS_QCMS
│  │     ├─ LICENSE_PDFJS_QUICKJS
│  │     ├─ LICENSE_QCMS
│  │     ├─ LICENSE_QUICKJS
│  │     ├─ openjpeg.wasm
│  │     ├─ openjpeg_nowasm_fallback.js
│  │     ├─ qcms_bg.wasm
│  │     ├─ quickjs-eval.js
│  │     └─ quickjs-eval.wasm
│  └─ sw.js
├─ README.md
├─ tests
│  ├─ chart-geometry.test.mjs
│  ├─ extra-50.test.mjs
│  ├─ formula-core.all-functions.test.mjs
│  ├─ formula-core.batch1.test.mjs
│  ├─ formula-core.batch2.test.mjs
│  ├─ formula-core.edge.test.mjs
│  ├─ formula-core.integration.test.mjs
│  ├─ formula-core.step2-functions.test.mjs
│  ├─ formula-core.step3-functions.test.mjs
│  ├─ formula-core.test.mjs
│  ├─ oracle
│  │  └─ batch1.oracle.json
│  ├─ print-phase3.test.mjs
│  ├─ print-phase4.test.mjs
│  ├─ recovery-policy.test.mjs
│  ├─ workbook-backup.test.mjs
│  ├─ workbook-integrity.test.mjs
│  ├─ xlsx-conditional-formatting.test.mjs
│  ├─ xlsx-data-validation.test.mjs
│  ├─ xlsx-named-ranges.test.mjs
│  └─ xlsx-round-trip.test.mjs
├─ tsconfig.json
├─ UPDATE-CHANGES.patch
├─ UPDATE-COMPARISON.txt
├─ update-docs
│  ├─ INSTALL-BN.txt
│  ├─ MANIFEST.json
│  ├─ README.txt
│  └─ TEST-RESULTS.txt
├─ UPDATE-NOTES.md
├─ UPDATE-TEST-RESULTS.txt
└─ WARNING-REMEDIATION-NOTES-BN.txt