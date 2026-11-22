"use client";
// Print UI language is independent from AppSettings.locale (workbook formatting).
import { useSyncExternalStore } from "react";
import { DEFAULT_PRINT_LANGUAGE, PRINT_LANGUAGE_STORAGE_KEY, PRINT_LANGUAGES,
  getPrintDirection, getPrintTranslator, isPrintLanguage, readStoredPrintLanguage,
  writeStoredPrintLanguage, type PrintLanguage } from "../../lib/print-i18n";
const CHANGE_EVENT = "alimxl:print-language";
let sessionLanguage: PrintLanguage | undefined;
function serverSnapshot(): PrintLanguage { return DEFAULT_PRINT_LANGUAGE; }
export function getCurrentPrintLanguage(): PrintLanguage {
  if (typeof window === "undefined") return DEFAULT_PRINT_LANGUAGE;
  return sessionLanguage ?? readStoredPrintLanguage();
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === PRINT_LANGUAGE_STORAGE_KEY || event.key === null) {
      sessionLanguage = undefined; listener();
    }
  };
  window.addEventListener(CHANGE_EVENT, listener); window.addEventListener("storage", storage);
  return () => { window.removeEventListener(CHANGE_EVENT, listener); window.removeEventListener("storage", storage); };
}
export function setPrintLanguage(language: PrintLanguage): boolean {
  if (!isPrintLanguage(language) || typeof window === "undefined") return false;
  sessionLanguage = language;
  const saved = writeStoredPrintLanguage(language);
  window.dispatchEvent(new Event(CHANGE_EVENT)); return saved;
}
export function usePrintI18n() {
  const language = useSyncExternalStore(subscribe, getCurrentPrintLanguage, serverSnapshot);
  return { language, dir: getPrintDirection(language), t: getPrintTranslator(language), setLanguage: setPrintLanguage, languages: PRINT_LANGUAGES };
}
