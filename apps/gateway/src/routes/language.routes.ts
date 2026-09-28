// Phase 9 — language assistance endpoint. Real BHASHINI only (see
// services/bhashini.ts) — no mock/fallback translation exists anywhere in
// this route. Reachable by both bidder and officer contexts, unauthenticated
// like the other public tender-content routes (see tenders.routes.ts) since
// the only thing ever sent here is short canonical requirement/help text
// that is already public — never bidder-private data.

import { Router } from 'express';
import { z } from 'zod';
import { translateText, BhashiniConfigError, BhashiniUpstreamError, BhashiniTimeoutError, SUPPORTED_LANGUAGES, MAX_TRANSLATE_TEXT_LENGTH } from '../services/bhashini.js';
import { asyncRoute, ApiError } from '../middleware/errorHandler.js';

export const languageRouter = Router();

export const translateSchema = z.object({
  text: z.string().trim().min(1, 'text must not be empty.').max(MAX_TRANSLATE_TEXT_LENGTH, `text must be ${MAX_TRANSLATE_TEXT_LENGTH} characters or fewer.`),
  sourceLanguage: z.enum(SUPPORTED_LANGUAGES),
  targetLanguage: z.enum(SUPPORTED_LANGUAGES),
});

languageRouter.post(
  '/translate',
  asyncRoute(async (req, res) => {
    const parsed = translateSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(422, parsed.error.issues.map((i) => i.message).join(' '));

    try {
      const result = await translateText(parsed.data);
      res.json({ sourceLanguage: result.sourceLanguage, targetLanguage: result.targetLanguage, translatedText: result.translatedText, provider: result.provider });
    } catch (err) {
      // Never forward the raw error (it never contains a secret, but keep
      // the boundary strict) — log a safe summary server-side only.
      if (err instanceof BhashiniConfigError) {
        // eslint-disable-next-line no-console
        console.error('[gateway] BHASHINI is not configured:', err.message);
        throw new ApiError(503, 'Translation service is temporarily unavailable.');
      }
      if (err instanceof BhashiniTimeoutError) {
        // eslint-disable-next-line no-console
        console.error('[gateway] BHASHINI request timed out.');
        throw new ApiError(503, 'Translation service is temporarily unavailable.');
      }
      if (err instanceof BhashiniUpstreamError) {
        // eslint-disable-next-line no-console
        console.error(`[gateway] BHASHINI upstream error (${err.status}):`, err.message);
        throw new ApiError(err.status === 429 ? 429 : 503, err.status === 429 ? 'Translation service is busy. Please try again shortly.' : 'Translation service is temporarily unavailable.');
      }
      // eslint-disable-next-line no-console
      console.error('[gateway] unexpected error calling BHASHINI:', err);
      throw new ApiError(503, 'Translation service is temporarily unavailable.');
    }
  }),
);
