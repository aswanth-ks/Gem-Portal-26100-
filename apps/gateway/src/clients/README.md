# clients/

Typed HTTP clients for internal service-to-service communication (e.g. the
FastAPI AI service). The gateway is the only component allowed to call these
internal services; the React frontend must never call them directly.
