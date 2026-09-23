# services/

Business/orchestration logic for the gateway. Services call out to the
FastAPI AI service and other internal services via clients/, never directly
via fetch/axios from controllers.
