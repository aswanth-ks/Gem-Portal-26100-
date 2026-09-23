# routes/

One router module per domain, mounted in app.ts under /api/<domain>:
auth, users, tenders, documents, intelligence, verification, consent, audit.

Routes -> Controllers -> Services -> Gateway/Service Clients -> Middleware.
Routes should only wire HTTP verbs/paths to controllers — no business logic.
