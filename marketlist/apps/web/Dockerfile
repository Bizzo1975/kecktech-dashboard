FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --ignore-scripts

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @marketlist/shared
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=/api
ENV API_PROXY_ORIGIN=http://api:3000
RUN npm run build -w @marketlist/web

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=/api
ENV API_PROXY_ORIGIN=http://api:3000
ENV PORT=3001
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/web ./apps/web
WORKDIR /app/apps/web
EXPOSE 3001
CMD ["npx", "next", "start", "-p", "3001"]
