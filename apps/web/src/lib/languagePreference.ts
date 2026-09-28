// Phase 9 — a per-browser preferred language for BHASHINI translation
// assistance (see TranslateAssist.tsx). This is only ever a default for the
// "Translate to" picker on individual pieces of text — it does NOT translate
// the application UI itself, and has no effect on canonical requirement/rule
// data or compliance evaluation.

import { useEffect, useState } from 'react';

export type LanguageCode = 'en' | 'hi' | 'ta';
export const LANGUAGE_LABEL: Record<LanguageCode, string> = { en: 'English', hi: 'हिन्दी', ta: 'தமிழ்' };

const STORAGE_KEY = 'gem_portal_language_preference';

export function getLanguagePreference(): LanguageCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'hi' || v === 'ta') return v;
  } catch {
    // localStorage unavailable — fall through to default
  }
  return 'en';
}

export function setLanguagePreference(lang: LanguageCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent('gem-portal-language-change', { detail: lang }));
  } catch {
    // best-effort only — a per-viewer convenience, not durable state
  }
}

export function useLanguagePreference(): [LanguageCode, (l: LanguageCode) => void] {
  const [lang, setLang] = useState<LanguageCode>(getLanguagePreference);

  useEffect(() => {
    const onChange = (e: Event) => setLang((e as CustomEvent<LanguageCode>).detail);
    window.addEventListener('gem-portal-language-change', onChange);
    return () => window.removeEventListener('gem-portal-language-change', onChange);
  }, []);

  return [lang, setLanguagePreference];
}
