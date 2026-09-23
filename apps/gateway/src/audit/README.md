# audit/

Request/audit logging concerns for the gateway (who did what, when).
Persists audit events via the AI service's audit collection (through the
service layer) — no direct DB access from here.
