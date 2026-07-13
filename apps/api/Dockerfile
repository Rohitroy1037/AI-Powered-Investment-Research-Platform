FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter @bugforge/api run build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --prod --frozen-lockfile --filter @bugforge/api...
COPY --from=build /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/server.js"]
