"""MongoDB connection management (demo database).

IMPORTANT: production target is PostgreSQL + pgvector (see
ARCHITECTURE.md -> "MongoDB -> PostgreSQL/pgvector migration path").
Nothing outside app/repositories/ should import motor/pymongo directly —
business logic must go through repository interfaces so the storage layer
can be swapped later without touching services/pipelines.

TODO: implement get_database() using motor.motor_asyncio.AsyncIOMotorClient.
"""
