# services/

Business/orchestration logic. Services call pipelines/ for AI work and
repositories/ for persistence — route handlers in app/api must stay thin and
call only services.
