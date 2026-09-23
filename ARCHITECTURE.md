# GeM Portal — Architecture

Status: **architectural scaffold**. This document describes the intended
system design and directory structure. Business logic and UI have not been
implemented yet — files marked `TODO` are placeholders establishing the
shape of the system, not working code.

## 1. System overview

GeM Portal is an AI-powered government/tender/document intelligence
platform. Core capabilities: tender understanding, document ingestion & OCR,
text extraction, document classification, entity/clause extraction, clause
retrieval, RAG-based Q&A, tender intelligence, government/consent-based
verification, DigiLocker/GeM integration, AI-assisted analysis, audit
trail, and security/access control.

```
Browser (React SPA)
      │  HTTPS
      ▼
Node.js API Gateway  ── auth, validation, routing, audit logging
      │  internal service calls
      ▼
FastAPI AI Service    ── OCR, NLP, RAG, LLM, verification pipelines
      │
      ├──▶ MongoDB (demo database)
      └──▶ External integrations (DigiLocker, GeM, government verification)
```

The React frontend **never** calls the FastAPI service directly — all
traffic flows `React → Node Gateway → FastAPI → AI/Database/Integrations`.

## 2. Service boundaries

- **apps/web** — presentation only. No direct API/database access, no
  business rules. Talks to the gateway via `services/api`.
- **apps/gateway** — the single frontend-facing API surface. Owns
  authN/authZ, request validation, routing to internal services, and
  audit/request logging. Contains no AI logic and no direct database access
  of its own domain data (it may have its own auth/session store later).
- **apps/ai** — all AI/document-processing logic and the system's
  persistence layer (MongoDB, via repositories). Exposes an internal API
  consumed only by the gateway.
- **services/** — conceptual seams marking where AI capabilities
  (document-processing, intelligence, verification, audit) could be split
  into independently deployable microservices later. For the demo they live
  inside `apps/ai/app/pipelines` and `apps/ai/app/integrations`.

## 3. Layered architecture per component

**Frontend** (`apps/web/src`):
`pages → components/features → services/api → store`
- `pages/` — one directory per route area (auth, dashboard, tenders,
  documents, intelligence, verification, consent, audit, settings).
- `features/` — feature-scoped components/hooks/api (auth, dashboard,
  tenders, documents, intelligence, verification, consent, audit, profile,
  notifications).
- `components/` — cross-feature reusable UI primitives.
- `services/api/` — the only place HTTP calls to the gateway are made.
- `store/` — global state, isolated from UI components.

**Node Gateway** (`apps/gateway/src`):
`routes → controllers → services → clients → middleware`
- `routes/` — HTTP verb/path wiring only, one module per domain
  (`/api/auth`, `/api/users`, `/api/tenders`, `/api/documents`,
  `/api/intelligence`, `/api/verification`, `/api/consent`, `/api/audit`).
- `controllers/` — request/response shaping, calls services.
- `services/` — business/orchestration logic.
- `clients/` — typed internal clients to the FastAPI AI service.
- `middleware/`, `auth/`, `audit/` — cross-cutting concerns.

**FastAPI AI Service** (`apps/ai/app`):
`api → schemas → services → pipelines → repositories`
- `api/v1/endpoints/` — thin route handlers.
- `schemas/` — Pydantic request/response contracts.
- `services/` — orchestrates pipelines + repositories; the only layer route
  handlers call into.
- `pipelines/` — modular AI stages: `ingestion → ocr → preprocessing →
  classification / nlp / extraction → embeddings → retrieval → rag → llm →
  intelligence`, each behind an interface in `pipelines/interfaces`
  (`OCRProvider`, `LLMProvider`, `EmbeddingProvider`, `DocumentProcessor`,
  `RetrievalProvider`, `VerificationProvider`) so concrete providers (Llama
  3, Bhashini, LangChain, spaCy, LayoutLM, PaddleOCR, Tesseract) can be
  swapped without touching calling code.
- `repositories/` — `base/` (storage-agnostic interfaces) + `mongodb/`
  (concrete implementation). Services depend only on `base/`.
- `integrations/` — one package per external system (`digilocker`, `gem`,
  `government`, `consent`), each with interface, provider (mock adapter for
  the demo), request/response schemas, client, and configuration.
- `security/` — OAuth2, encryption (AES-256), hashing (SHA-256), RBAC
  helpers, audit-event emission.

## 4. MongoDB demo architecture

MongoDB is the **only** database for the current demo. It is accessed
exclusively through `apps/ai/app/repositories/mongodb`, which implements the
interfaces in `apps/ai/app/repositories/base`. No other layer (services,
pipelines, gateway) may import a MongoDB driver directly.

Anticipated collections (schemas to be defined incrementally, not up front):
`users, organizations, tenders, documents, document_chunks,
extracted_entities, clauses, verification_requests, consent_records,
intelligence_reports, audit_events`.

### MongoDB → PostgreSQL + pgvector migration path

The target production architecture uses PostgreSQL + pgvector. To make that
migration a swap rather than a rewrite:

1. All persistence access goes through `app/repositories/base` interfaces —
   services and pipelines never import `motor`/`pymongo` directly.
2. A future `app/repositories/postgres/` package implements the same
   interfaces using SQLAlchemy/asyncpg + pgvector for embeddings.
3. `app/core/database` is the single place holding the active connection —
   swapping the backend means changing configuration/wiring there, not
   business code.
4. Vector-search-shaped operations (embedding storage/similarity search) are
   expressed through `RetrievalProvider`/`EmbeddingProvider` interfaces, not
   MongoDB-specific query syntax, so pgvector can become the concrete
   implementation later.

## 5. Integration architecture

`apps/ai/app/integrations/{digilocker,gem,government,consent}` — each
package provides: an interface/contract, a provider implementation (mock
adapter for the demo), request/response schemas, a client, and
configuration sourced from environment variables. No credentials are
hard-coded; see `.env.example`.

## 6. Security architecture

`Authentication → Authorization → Encryption → Audit`

- **Authentication/Authorization**: OAuth2, RBAC — implemented in
  `apps/gateway/src/auth` (frontend-facing) and `apps/ai/app/security`
  (service-level).
- **Encryption**: AES-256 for data at rest/in transit where applicable,
  SHA-256 for hashing — treated as primitives in `apps/ai/app/security`, no
  custom cryptographic algorithms.
- **Audit**: every gateway request and significant AI-service action is
  logged as an `audit_events` record via `apps/gateway/src/audit` and
  `apps/ai/app/services` → repositories, surfaced through
  `services/audit/{events,trail}` boundaries.
- **Secrets**: sourced only from environment variables (`.env`, see
  `.env.example`); never committed.

## 7. Cloud target

MeghRaj / NIC Cloud is the intended deployment environment
(`infrastructure/meghraj/`). Local/demo deployment uses
`docker-compose.yml` with `infrastructure/docker/*.Dockerfile`;
MeghRaj-specific deployment is documented only, not implemented, at this
stage.

## 8. What is explicitly NOT done yet

- No Stitch UI has been implemented or invented.
- No production AI functionality (pipelines are interfaces/placeholders).
- No PostgreSQL code — MongoDB only, per the demo requirement.
- No hard-coded external API credentials.
- No unnecessary libraries beyond what's needed for the scaffold to build.
