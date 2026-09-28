// Phase 9 — "Language assistance" control for a single piece of canonical
// requirement/help text. Calls the real backend POST /api/language/translate
// (which calls the real BHASHINI API — see apps/gateway/services/bhashini.ts).
// This is presentation/accessibility only: it never changes the canonical
// text it's attached to, never persists a translation, and has no bearing
// on compliance evaluation, which continues to read the original English
// TenderRequirement/ComplianceRule data untouched.

import { useState } from 'react';
import { Button, Select } from '@/components/primitives';
import { api, ApiError } from '@/lib/api';
import { LANGUAGE_LABEL, getLanguagePreference, type LanguageCode } from '@/lib/languagePreference';

export function TranslateAssist({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>(() => {
    const preferred = getLanguagePreference();
    return preferred === 'en' ? 'ta' : preferred;
  });
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function translate() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ translatedText: string; provider: string }>('/language/translate', { text, sourceLanguage: 'en', targetLanguage });
      setTranslated(res.translatedText);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Translation service is temporarily unavailable.');
      setTranslated(null);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="focus-ring inline-flex w-fit items-center gap-1 text-[12px] font-medium text-secondary hover:underline">
        Language assistance
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-control border border-outline-variant bg-surface-container-lowest p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          size="sm"
          aria-label="Translate to"
          value={targetLanguage}
          onChange={(e) => {
            setTargetLanguage(e.target.value as LanguageCode);
            setTranslated(null);
            setError(null);
          }}
          className="w-auto"
        >
          {(Object.keys(LANGUAGE_LABEL) as LanguageCode[])
            .filter((l) => l !== 'en')
            .map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABEL[l]}
              </option>
            ))}
        </Select>
        <Button size="sm" variant="secondary" loading={loading} onClick={() => void translate()}>
          Translate
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="ml-auto text-[12px] text-on-surface-variant hover:underline">
          Close
        </button>
      </div>

      {error && (
        <div className="text-[12px] text-danger">
          {error}{' '}
          <button type="button" className="font-medium underline" onClick={() => void translate()}>
            Try again
          </button>
        </div>
      )}

      {translated && !error && (
        <div>
          <p className="text-[14px] text-on-surface">{translated}</p>
          <p className="mt-1 text-[11px] text-on-surface-variant">Translated by BHASHINI</p>
        </div>
      )}
    </div>
  );
}
