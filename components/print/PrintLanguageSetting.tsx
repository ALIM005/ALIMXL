"use client";
import { useState } from "react";
import { isPrintLanguage } from "../../lib/print-i18n";
import { usePrintI18n } from "./usePrintI18n";
export default function PrintLanguageSetting({ disabled = false }: { disabled?: boolean }) {
  const { language, dir, t, setLanguage, languages } = usePrintI18n();
  const [notSaved, setNotSaved] = useState(false);
  return <div lang={language} dir={dir} className="space-y-1">
    <label className="block text-xs">{t("language")}
      <select value={language} disabled={disabled} className="mt-1 w-full rounded-md border border-amber-200 bg-white p-2 text-sm text-slate-900"
        onChange={event => { const value = event.currentTarget.value; if (isPrintLanguage(value)) setNotSaved(!setLanguage(value)); }}>
        {languages.map(item => <option key={item.code} value={item.code} lang={item.code}>{item.label}</option>)}
      </select>
    </label>
    {notSaved && <p role="status" className="text-xs text-amber-900">{t("languageNotSaved")}</p>}
  </div>;
}
