"""Abstract repository interfaces (storage-agnostic).

Services depend on these interfaces, never on app/repositories/mongodb
directly, so the MongoDB implementation can be replaced by a
PostgreSQL + pgvector implementation later without touching service code.

TODO: define e.g. class TenderRepository(Protocol) / ABC with async CRUD
methods, one per aggregate (documents, tenders, clauses, etc.).
"""
