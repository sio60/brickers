# =============================================================================
# Unified Frontend Dockerfile - Next.js + Nginx
# =============================================================================

# 1. Base
FROM node:20-alpine AS base

# 2. Dependencies
FROM base AS deps
WORKDIR /app

# gallery-app의 패키지 파일 복사 및 설치
COPY gallery-app/package.json gallery-app/package-lock.json* ./
RUN npm ci --legacy-peer-deps

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY gallery-app/ .

# 빌드 타임 환경변수
ARG NEXT_PUBLIC_API_BASE_URL
ARG REVALIDATE_SECRET
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_GTM_ID

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV REVALIDATE_SECRET=$REVALIDATE_SECRET
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# 4. Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# public 폴더 복사
COPY --from=builder /app/public ./public

# Next.js cache 디렉토리 설정
RUN mkdir .next
RUN chown nextjs:nodejs .next

# standalone output 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# =============================================================================
# 5. Final Stage with Nginx + Node.js
# =============================================================================
FROM nginx:alpine AS final

# Node.js 설치 (npm은 불필요)
RUN apk add --no-cache nodejs

# supervisord 설치
RUN apk add --no-cache supervisor

# Nginx 설정 복사 (envsubst 템플릿)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf.template

# entrypoint 복사 (envsubst + supervisord 실행)
COPY frontend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Next.js 앱 복사
WORKDIR /app
COPY --from=runner /app ./

# supervisord 설정
RUN mkdir -p /etc/supervisor.d /var/log/supervisor
COPY frontend/supervisord.conf /etc/supervisor.d/supervisord.ini

# 환경변수
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 80 443 3000

CMD ["/entrypoint.sh"]
