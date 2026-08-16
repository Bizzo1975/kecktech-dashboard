FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --ignore-scripts

FROM deps AS build
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build -w @marketlist/shared
RUN npm run build -w @marketlist/api

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api ./apps/api
COPY apps/api/docker-entrypoint.sh /app/apps/api/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/apps/api/docker-entrypoint.sh
RUN chmod +x /app/apps/api/docker-entrypoint.sh
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
