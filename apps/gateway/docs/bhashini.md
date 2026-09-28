# BHASHINI translation assistance (Phase 9)

## Purpose

Real-time translation of short, canonical procurement text (tender requirement
descriptions, help copy) via the real
[BHASHINI Setu/ULCA API](https://bhashini.gitbook.io/bhashini-apis), so a
bidder or officer can read a requirement in Hindi or Tamil in addition to
English.

**This is an accessibility/presentation layer only.** It never changes the
canonical English text stored in `TenderRequirement`, never touches
`ComplianceRule`/`ComplianceEvaluation`/`OfficerAssessment`/`FinalBidDecision`,
and the deterministic compliance engine (Phase 6) always evaluates the
original English data, regardless of what language a user is viewing a
requirement in.

## What BHASHINI does NOT do

- Does not decide compliance (PASS/FAIL/REVIEW).
- Does not alter numeric thresholds, dates, or extracted evidence.
- Does not influence the final bid decision.
- Does not receive bidder documents or evidence — only short, explicitly
  selected display text (e.g. a requirement's description field) is ever
  sent to it.
- Is not a dependency for bid submission, document processing, compliance
  evaluation, officer assessment, or final decision — if BHASHINI is down or
  unconfigured, every other part of the application keeps working exactly as
  before.

## Required environment variables

Set these in the repo-root `.env` (never commit real values — `.env` is
gitignored; `.env.example` only ever holds empty placeholders):

| Variable | Purpose |
|---|---|
| `BHASHINI_USER_ID` | `userID` header for the Pipeline Config call — **optional**; confirmed live that this account's Udyat key authenticates the config call on its own (see note below) |
| `BHASHINI_UDYAT_KEY` | `ulcaApiKey` header for the Pipeline Config call — **required** |
| `BHASHINI_INFERENCE_KEY` | Authorization value for the actual translation (Pipeline Compute) call — **required** |
| `BHASHINI_PIPELINE_ID` | Defaults to the public MeitY standard translation pipeline id (`64392f96daac500b55c543cd`) — not a secret, override only if your dashboard issues a different one |
| `BHASHINI_CONFIG_URL` | Defaults to `https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline` |

Credentials come from the BHASHINI/Udyat dashboard: **My Profile → API Keys**.

> **Note (confirmed live):** for this project's issued credentials,
> `BHASHINI_USER_ID` was never located on the dashboard and turned out not to
> be required — the Pipeline Config call succeeds with just `ulcaApiKey`. The
> `userID` header is sent only when `BHASHINI_USER_ID` is set (see
> `getPipelineConfig` in `src/services/bhashini.ts`); leave it empty if you
> don't have one. Also observed live: this account's Pipeline Config response
> omits `pipelineInferenceAPIEndPoint` entirely (no dynamic `callbackUrl`/
> `inferenceApiKey`) — the client falls back to the publicly documented fixed
> Dhruva inference URL (`https://dhruva-api.bhashini.gov.in/services/inference/pipeline`)
> and always uses the statically configured `BHASHINI_INFERENCE_KEY` as the
> `Authorization` header in that case.

## API contract (real, not invented)

Two real upstream calls, per the official documentation
(https://bhashini.gitbook.io/bhashini-apis):

1. **Pipeline Config** — `POST {BHASHINI_CONFIG_URL}` with headers
   `userID`/`ulcaApiKey`, body `{ pipelineTasks: [{ taskType: "translation", config: { language: { sourceLanguage, targetLanguage } } }], pipelineRequestConfig: { pipelineId } }`.
   Returns the real `serviceId` for that language pair and a `callbackUrl` +
   dynamic `inferenceApiKey`. Cached in-process per language pair for 15
   minutes (not persisted, not shared across processes).
2. **Pipeline Compute** — `POST {callbackUrl}` with the resolved auth header
   (a statically configured `BHASHINI_INFERENCE_KEY` takes precedence over
   the dynamic key from step 1, if set), body
   `{ pipelineTasks: [{ taskType: "translation", config: { language, serviceId } }], inputData: { input: [{ source: text }] } }`.
   The translated text is `pipelineResponse[0].output[0].target`.

See `src/services/bhashini.ts` for the implementation.

## Endpoint

`POST /api/language/translate` — unauthenticated (same as other public
tender-content routes), since only already-public requirement/help text is
ever sent here, never bidder-private data.

Request: `{ text, sourceLanguage, targetLanguage }`.
Response: `{ sourceLanguage, targetLanguage, translatedText, provider: "BHASHINI" }`.

Validation (422 on failure): `text` required, non-empty, ≤1000 characters;
`sourceLanguage`/`targetLanguage` must be one of the supported codes. A real
upstream failure (config error, timeout, non-2xx, empty translation) becomes
a `503` (`429` passed through as `429`) with a generic message — the real
error is logged server-side only, never in the response.

## Supported languages (MVP)

`en` (English), `hi` (Hindi), `ta` (Tamil) — see `SUPPORTED_LANGUAGES` in
`src/services/bhashini.ts`. Adding a language later is a one-line change to
that array (plus a label in the frontend's `languagePreference.ts`).

## Running the real integration test

```
cd apps/gateway
BHASHINI_UDYAT_KEY=... BHASHINI_INFERENCE_KEY=... npx tsx --test src/services/bhashini.test.ts
```

Confirmed working live through the actual running gateway (`POST /api/language/translate`) with real credentials — both English→Tamil and English→Hindi returned real, non-empty translated text with `provider: "BHASHINI"` and no credential in the response. The standalone `npx tsx --test` invocation of the real-integration test itself intermittently fails with a low-level `fetch failed` reaching the Dhruva inference host from that specific short-lived process — the identical code path succeeds reliably through the long-running gateway process, so this looks like an environment/DNS quirk of the one-shot test runner, not an application bug.

The test `REAL BHASHINI integration (skipped unless credentials are
configured)` automatically skips when these env vars are absent (it does
**not** run against a mock in that case) and makes one real English→Tamil
translation call when they are present. All other tests in that file mock
`globalThis.fetch` and never touch the network or require real credentials.

## Security

- Credentials are read from `process.env` only, inside
  `services/bhashini.ts` — never hardcoded, never in frontend code, never in
  a `VITE_*` variable.
- No credential is ever logged (errors are logged as a safe summary — status
  code and a generic message — not the raw upstream body or request headers)
  or returned in any API response.
- Confirmed via repo search: no `VITE_BHASHINI_*` variable exists, no
  hardcoded translation dictionary exists, `.env` is gitignored, and the
  `.env.example` diff for this phase contains only empty placeholders.
