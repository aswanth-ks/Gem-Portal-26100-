# services/

Conceptual boundaries for standalone AI microservices that may be split out
of the apps/ai monolith as the system scales (document-processing,
intelligence, verification, audit). For the demo, these are implemented
inside apps/ai/app/pipelines and app/integrations; folders here are
placeholders marking future service extraction points.

TODO: extract into independently deployable services once a boundary proves
itself under real load/ownership needs — do not do this prematurely.
