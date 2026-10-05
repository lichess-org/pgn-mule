FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./

ARG COMMIT_SHA=dev
ENV NODE_ENV=production
ENV COMMIT_SHA=${COMMIT_SHA}
ENV LISTEN_HOST=0.0.0.0
ENV LISTEN_PORT=8080
EXPOSE 8080

USER node
CMD ["node", "build/server.js"]
