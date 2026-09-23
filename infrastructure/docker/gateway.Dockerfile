# TODO: multi-stage build (npm ci -> tsc build -> node runtime) once
# apps/gateway has real implementation.
FROM node:20-alpine
WORKDIR /app
