// components/print/PrintHeaderFooter.tsx
// Presentational header/footer for one print page.
//
// Parent owns templates, page numbering, print timestamp,
// and physical page layout.
//
// The current preview places this component inside existing
// top/bottom margins, outside the sheet content box.
//
// No state, DOM measurement, or window.print() usage.

import type { CSSProperties } from "react";

import {
  resolveHeaderFooterTemplate,
} from "../../lib/print-pages";

export interface PrintHeaderFooterTemplates {
  left: string;
  center: string;
  right: string;
}

export interface PrintHeaderFooterSettings {
  header: PrintHeaderFooterTemplates;
  footer: PrintHeaderFooterTemplates;
}

export interface PrintHeaderFooterProps {
  position: "header" | "footer";

  templates: PrintHeaderFooterTemplates;

  /** One-based page number. */
  pageNumber: number;

  /** Must satisfy 1 <= pageNumber <= totalPages. */
  totalPages: number;

  sheetName?: string;
  workbookName?: string;

  /**
   * Parent creates one Date for the entire preview/print session.
   * Pass the same value to every header/footer.
   */
  printTime: Date;

  /** CSS pixels in this component's coordinate system. */
  fontSize?: number;

  /** Positive line-height multiplier. */
  lineHeight?: number;

  /**
   * Fixed region height in CSS pixels.
   * Content beyond this region is clipped.
   *
   * Parent must reserve this space outside sheet content.
   * The current preview uses the existing page margins.
   */
  height?: number;

  /** Horizontal gap between the three text regions, in CSS pixels. */
  gap?: number;

  className?: string;
}

type RegionAlignment = "left" | "center" | "right";

interface TextRegion {
  alignment: RegionAlignment;
  text: string;
}

const DEFAULT_FONT_SIZE = 11;
const DEFAULT_LINE_HEIGHT = 1.25;
const DEFAULT_HEIGHT = 32;
const DEFAULT_GAP = 8;

function resolvePositiveNumber(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;

  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new RangeError(
      `${name} must be a finite positive number.`,
    );
  }

  return resolved;
}

function resolveNonNegativeNumber(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;

  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new RangeError(
      `${name} must be a finite non-negative number.`,
    );
  }

  return resolved;
}

export function PrintHeaderFooter({
  position,
  templates,
  pageNumber,
  totalPages,
  sheetName,
  workbookName,
  printTime,
  fontSize,
  lineHeight,
  height,
  gap,
  className,
}: PrintHeaderFooterProps) {
  if (position !== "header" && position !== "footer") {
    throw new RangeError(
      'position must be "header" or "footer".',
    );
  }

  const resolvedFontSize = resolvePositiveNumber(
    fontSize,
    DEFAULT_FONT_SIZE,
    "fontSize",
  );

  const resolvedLineHeight = resolvePositiveNumber(
    lineHeight,
    DEFAULT_LINE_HEIGHT,
    "lineHeight",
  );

  const resolvedHeight = resolveNonNegativeNumber(
    height,
    DEFAULT_HEIGHT,
    "height",
  );

  const resolvedGap = resolveNonNegativeNumber(
    gap,
    DEFAULT_GAP,
    "gap",
  );

  if (
    !Number.isFinite(
      resolvedFontSize * resolvedLineHeight,
    ) ||
    !Number.isFinite(resolvedGap * 2)
  ) {
    throw new RangeError(
      "Header/footer dimensions exceed the supported numeric range.",
    );
  }

  const context = {
    now: printTime,
    ...(sheetName === undefined ? {} : { sheetName }),
    ...(workbookName === undefined ? {} : { workbookName }),
  };

  const resolve = (template: string): string =>
    resolveHeaderFooterTemplate(
      template,
      pageNumber,
      totalPages,
      context,
    );

  // The shared resolver validates page numbers and printTime.
  // Text is inserted through JSX, never as raw HTML.
  const regions: TextRegion[] = [
    {
      alignment: "left",
      text: resolve(templates.left),
    },
    {
      alignment: "center",
      text: resolve(templates.center),
    },
    {
      alignment: "right",
      text: resolve(templates.right),
    },
  ];

  const containerStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gridTemplateRows: "minmax(0, 1fr)",
    columnGap: resolvedGap,

    alignItems:
      position === "header" ? "start" : "end",

    // Preserve physical left/center/right column positions.
    // Individual text regions detect their own text direction.
    direction: "ltr",

    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,

    height: resolvedHeight,
    minHeight: resolvedHeight,
    maxHeight: resolvedHeight,

    flexShrink: 0,
    overflow: "hidden",

    fontSize: resolvedFontSize,
    lineHeight: resolvedLineHeight,
    color: "#334155",
  };

  return (
    <div
      data-print-region={position}
      className={className}
      style={containerStyle}
    >
      {regions.map(({ alignment, text }) => (
        <div
          key={alignment}
          dir="auto"
          style={{
            boxSizing: "border-box",
            minWidth: 0,
            minHeight: 0,
            maxWidth: "100%",
            maxHeight: resolvedHeight,
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            textAlign: alignment,
          }}
        >
          {text}
        </div>
      ))}
    </div>
  );
}

export default PrintHeaderFooter;