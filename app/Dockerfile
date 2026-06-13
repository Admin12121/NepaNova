FROM node:22-alpine AS deps
WORKDIR /app

COPY app/package.json app/bun.lock ./
RUN npm install

FROM deps AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ARG NEXTAUTH_URL=http://localhost:3000
ARG AUTH_URL=http://localhost:3000

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV AUTH_URL=${AUTH_URL}
ENV API_URL=http://backend:8000
ENV AUTH_SECRET=build-time-secret-change-at-runtime

COPY app/ .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/app.js ./app.js
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start"]
