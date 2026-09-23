# GeM Portal

AI-powered government/tender/document intelligence platform. This repository
is a monorepo covering the frontend, API gateway, AI backend services, and
supporting infrastructure.

> **Status:** architectural scaffold only. No business functionality or UI
> has been implemented yet. The frontend will be built page-by-page from
> Stitch/Figma designs; see [ARCHITECTURE.md](./ARCHITECTURE.md) for the full
> system design and the current placeholder map.

## Monorepo layout

```
apps/
  web/        React + Vite + TypeScript + Tailwind frontend
  gateway/    Node.js + Express + TypeScript API gateway
  ai/         Python + FastAPI AI/backend microservices
packages/     Shared code across apps (types, API contracts, UI, config, validation)
services/     Conceptual boundaries for AI microservices that may be split out of apps/ai later
infrastructure/ Docker, MongoDB init, nginx, deployment, MeghRaj/NIC Cloud notes
scripts/      Setup, seed, and development convenience scripts
docs/         Detailed documentation per subsystem
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete breakdown of every
directory, data flow, and security model.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, React Router |
| API Gateway | Node.js, Express, TypeScript |
| AI / Backend | Python, FastAPI, LangChain, spaCy, LayoutLM, PaddleOCR, Tesseract, Llama 3, Bhashini |
| Database (demo) | MongoDB (production target: PostgreSQL + pgvector — see migration path in ARCHITECTURE.md) |
| Integrations | DigiLocker, GeM APIs, government verification systems |
| Cloud | MeghRaj / NIC Cloud (target deployment environment) |
| Security | OAuth2, AES-256, SHA-256, RBAC, audit trail |

## Getting started (once implementation begins)

```bash
# install dependencies across workspaces
npm install

# copy environment template
cp .env.example .env

# run each app in development (once implemented)
npm run dev:web        # apps/web
npm run dev:gateway     # apps/gateway
# apps/ai: uvicorn app.main:app --reload --port 8000 (from apps/ai, with a Python env)
```

Local demo services (web, gateway, AI, MongoDB) can also be run via
`docker-compose.yml` once the corresponding Dockerfiles are filled in.

## Development workflow

The frontend is built in two parallel tracks:

1. **Stitch/Figma design** produces a UI specification for a page.
2. **React implementation** turns that specification into a page component,
   reusable primitives, API integration, and finally backend functionality.

See ARCHITECTURE.md → "Frontend architecture" for how the codebase is
structured to make this reproducible per page.

## Contributing conventions

- Do not put API calls directly inside React components — use `services/api`
  and feature-level `api/` modules.
- Do not put AI logic inside FastAPI route handlers — use `app/pipelines`.
- Do not put database queries directly inside business services — use the
  `app/repositories` abstraction.
- Do not couple business logic directly to MongoDB — see the PostgreSQL +
  pgvector migration path in ARCHITECTURE.md.
