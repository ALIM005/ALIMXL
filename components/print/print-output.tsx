"use client";

// components/print/print-output.tsx
// Prints the same prepared page content used by the screen preview.
// Does not prepare pages or modify committed print settings.

import { renderToStaticMarkup } from "react-dom/server";
import { runPrintFrame } from "../../lib/print-frame";
import { makePrintError, translatePrint } from "../../lib/print-i18n";
import { getCurrentPrintLanguage } from "./usePrintI18n";

import { PagePreview } from "./PrintPreviewModal";

import type {
  PrintPreviewModalProps,
} from "./PrintPreviewModal";

import {
  getPrintablePageDimensions,
  getSafePrintMargins,
} from "../../lib/print-pages";

export type PreparedPrintSession = Pick<
  PrintPreviewModalProps,
  | "pages"
  | "settings"
  | "headerFooter"
  | "sheetName"
  | "workbookName"
  | "printTime"
  | "showGridlines"
>;

function collectPrintFontFaces(): string {
  const faces: string[] = [];
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.FONT_FACE_RULE) faces.push(rule.cssText);
      else if ("cssRules" in rule) {
        try { visit((rule as CSSGroupingRule).cssRules); } catch { /* inaccessible rule */ }
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { visit(sheet.cssRules); } catch { /* cross-origin sheet is not readable */ }
  }
  return faces.join("\n");
}

export async function printPreparedSession(
  session: PreparedPrintSession,
): Promise<void> {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    throw makePrintError("printUnavailable");
  }

  const {
    pages,
    settings,
    headerFooter,
    printTime,
  } = session;

  if (
    pages.length === 0 ||
    pages.some(
      (page, index) =>
        page.page.pageNumber !== index + 1,
    )
  ) {
    throw makePrintError("invalidPageList");
  }

  if (
    !(printTime instanceof Date) ||
    !Number.isFinite(printTime.getTime())
  ) {
    throw makePrintError("invalidTimestamp");
  }

  const paper = getPrintablePageDimensions(
    settings.paperSize,
    settings.orientation,
  );

  const margins = getSafePrintMargins(settings.margins);

  const dimensionsValid = [
    paper.width,
    paper.height,
    margins.top,
    margins.right,
    margins.bottom,
    margins.left,
  ].every(Number.isFinite);

  if (
    !dimensionsValid ||
    paper.width <= 0 ||
    paper.height <= 0 ||
    paper.width <= margins.left + margins.right ||
    paper.height <= margins.top + margins.bottom
  ) {
    throw makePrintError("invalidMargins");
  }

  if (
    pages.some(
      (page) =>
        !Number.isFinite(page.totalWidth) ||
        !Number.isFinite(page.totalHeight) ||
        page.totalWidth < 0 ||
        page.totalHeight < 0,
    )
  ) {
    throw makePrintError("invalidDimensions");
  }

  const language = getCurrentPrintLanguage();
    const markup = renderToStaticMarkup(
      <>
        {pages.map((page) => (
          <PagePreview
            key={page.page.pageNumber}
            page={page}
            totalPages={pages.length}
            settings={settings}
            headerFooter={headerFooter}
            printTime={printTime}
            sheetName={session.sheetName ?? ""}
            workbookName={session.workbookName ?? ""}
            showGridlines={session.showGridlines ?? true}
            zoom={1}
            language={language}
          />
        ))}
      </>,
    );

    const html = `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Print</title>

  <style>
    @page {
      size: ${paper.width}mm ${paper.height}mm;
      margin: 0;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff;
    }

    body {
      color: #0f172a;
      font-family: Arial, sans-serif;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /*
     * These are screen diagnostics, not document content.
     * Their flags remain visible in the screen preview.
     */
    .awm-print-warning {
      display: none !important;
    }

    .awm-print-page-wrapper {
      position: relative;
      width: ${paper.width}mm !important;
      height: ${paper.height}mm !important;

      margin: 0 !important;
      padding: 0 !important;

      break-inside: avoid;
      page-break-inside: avoid;

      break-after: auto;
      page-break-after: auto;
    }

    .awm-print-page-wrapper:not(:last-child) {
      break-after: page;
      page-break-after: always;
    }

    /*
     * PagePreview's final child is the screen-zoom frame.
     * Remove warning spacing and use physical paper dimensions.
     */
    .awm-print-page-wrapper > div:last-child {
      position: relative !important;
      width: ${paper.width}mm !important;
      height: ${paper.height}mm !important;

      margin: 0 !important;
      padding: 0 !important;
    }

    .awm-print-paper {
      width: ${paper.width}mm !important;
      height: ${paper.height}mm !important;

      margin: 0 !important;
      padding: 0 !important;

      transform: none !important;
      box-shadow: none !important;
      background: #ffffff;
    }


  </style>
</head>
<body>${markup}</body>
</html>`;
    await runPrintFrame(html, {
      title: session.workbookName?.trim() || session.sheetName?.trim() || translatePrint(language, "print"),
      fontCss: collectPrintFontFaces(),
    });
}
