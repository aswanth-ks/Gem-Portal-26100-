// Central env access. Loads the repo-root .env explicitly so this works the
// same whether the process is started with CWD = repo root (npm workspaces)
// or CWD = apps/gateway (running tsx directly inside the folder).
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../..');

dotenv.config({ path: path.join(REPO_ROOT, '.env') });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}. Set it in the repo-root .env (see .env.example).`);
  return v;
}

export const env = {
  // Render (and most PaaS) inject PORT; prefer it, then GATEWAY_PORT, then 4000.
  port: Number(process.env.PORT || process.env.GATEWAY_PORT || 4000),
  corsOrigin: process.env.GATEWAY_CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: required('GATEWAY_JWT_SECRET'),
  mongoUri: required('MONGODB_URI'),
  mongoDbName: process.env.MONGODB_DB_NAME ?? 'gem_portal',
  uploadsDir: path.join(REPO_ROOT, 'apps', 'gateway', 'uploads'),
  // Officer auth uses the same JWT secret as bidders, with a role claim
  // (see middleware/auth.ts). There is no shared officer token any more.
  // Phase 3A — Python FastAPI AI service (apps/ai). The gateway is the only
  // thing that talks to it; the browser never reaches it directly, and it
  // never reaches Ollama directly either (see apps/ai/app/pipelines/llm).
  aiServiceUrl: process.env.GATEWAY_AI_SERVICE_URL ?? 'http://localhost:8000',
  // Emergency deterministic demo mode (SIH recording reliability) — read
  // from the same DEMO_MODE var the AI service reads (shared repo-root
  // .env). The gateway itself doesn't change any behavior based on this; it
  // only exposes it via /health so the frontend can show a small "DEMO
  // MODE" indicator. See apps/ai/app/pipelines/demo/fixtures.py.
  demoMode: process.env.DEMO_MODE === 'true',
  // SIH jury login convenience only — served via GET /api/system/status when
  // demoMode is true, so the login pages can prefill (never auto-submit)
  // demo credentials without hardcoding them in frontend source. Blank
  // (falsy) if not configured, which the route treats as "no prefill for
  // that role" rather than an error.
  demoOfficerEmail: process.env.DEMO_OFFICER_EMAIL || '',
  demoOfficerPassword: process.env.DEMO_OFFICER_PASSWORD || '',
  demoBidderEmail: process.env.DEMO_BIDDER_EMAIL || '',
  demoBidderPassword: process.env.DEMO_BIDDER_PASSWORD || '',
  // Phase 9 — BHASHINI Setu/ULCA translation. Optional (translation is an
  // accessibility enhancement, not a dependency for the procurement
  // workflow) — left unset until real credentials exist, checked for
  // presence only inside services/bhashini.ts when actually invoked, never
  // at process startup. Never logged, never returned in any API response.
  bhashini: {
    userId: process.env.BHASHINI_USER_ID || '',
    udyatKey: process.env.BHASHINI_UDYAT_KEY || '',
    inferenceKey: process.env.BHASHINI_INFERENCE_KEY || '',
    pipelineId: process.env.BHASHINI_PIPELINE_ID || '64392f96daac500b55c543cd',
    configUrl: process.env.BHASHINI_CONFIG_URL || 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline',
  },
};
