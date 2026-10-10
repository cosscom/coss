# syntax=docker/dockerfile:1.7
# Site (apps/site: coss.com's landing page and docs): the Next.js standalone server on Node. Build
# from the repository root:
#   docker build -f apps/site/Dockerfile --build-arg NEXT_DEPLOYMENT_ID="$(git rev-parse HEAD)" .
# One image for every stage: the site is static and reads no environment (README.md, "Deploying
# to AWS").

# Keep in step with package.json (`packageManager`, `devDependencies.turbo`); infra/test checks.
ARG BUN_VERSION=1.4.2
ARG NODE_VERSION=24
ARG TURBO_VERSION=2.11.7

FROM oven/bun:${BUN_VERSION}-slim AS bun

# A partial monorepo with only the workspaces @coss/site needs, and their slice of bun.lock.
FROM bun AS prune
ARG TURBO_VERSION
ENV TURBO_TELEMETRY_DISABLED=1
WORKDIR /repo
COPY . .
RUN bunx turbo@${TURBO_VERSION} prune @coss/site --docker --out-dir /pruned

# Next builds on Node; Bun installs. The install layer is reused until a manifest or the lockfile changes.
FROM node:${NODE_VERSION}-slim AS build
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
ENV TURBO_TELEMETRY_DISABLED=1 NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo
COPY --from=prune /pruned/json/ .
RUN bun install --frozen-lockfile
COPY --from=prune /pruned/full/ .
# The commit: Next's build id and version-skew protection (deploymentId). Not stage-specific.
ARG NEXT_DEPLOYMENT_ID=""
ENV NEXT_DEPLOYMENT_ID=${NEXT_DEPLOYMENT_ID} SKIP_ENV_VALIDATION=1
RUN bun x turbo run build --filter=@coss/site

# Only the traced server (.next/standalone keeps Bun's isolated node_modules as relative symlinks)
# and the static assets. No package manager, no sources.
FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3002 \
    KEEP_ALIVE_TIMEOUT=75000
WORKDIR /app
COPY --from=build /repo/apps/site/.next/standalone ./
COPY --from=build /repo/apps/site/.next/static ./apps/site/.next/static
# Next writes its cache under .next at runtime; everything else stays root-owned and read-only.
RUN mkdir -p apps/site/.next/cache && chown node:node apps/site/.next/cache
USER node
EXPOSE 3002
# SIGTERM: Next stops accepting connections and finishes in-flight requests before exiting.
CMD ["node", "apps/site/server.js"]
