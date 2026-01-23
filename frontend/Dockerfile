# =============================================================================
# 1. Build Stage
# =============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# 패키지 설치 (캐싱 활용을 위해 package.json과 lock 파일 먼저 복사)
COPY package.json package-lock.json ./

# npm install 보다 더 빠르고 정확한 npm ci 사용 (lock 파일 기준 설치)
RUN npm ci

# 소스 코드 복사
COPY . .

# -----------------------------------------------------------------------------
# [환경 변수 주입]
# Vite는 빌드 시점(Build Time)에 환경변수가 주입되어야 합니다.
# GitHub Actions에서 --build-arg로 넘겨준 값을 받아서 ENV로 설정합니다.
# -----------------------------------------------------------------------------
ARG VITE_KAKAO_CLIENT_ID
ARG VITE_KAKAO_REDIRECT_URI
ARG VITE_API_BASE_URL
ARG VITE_FASTAPI_ORIGIN
ARG VITE_API_ORIGIN

ENV VITE_KAKAO_CLIENT_ID=$VITE_KAKAO_CLIENT_ID
ENV VITE_KAKAO_REDIRECT_URI=$VITE_KAKAO_REDIRECT_URI
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FASTAPI_ORIGIN=$VITE_FASTAPI_ORIGIN
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN

# 빌드 실행 -> /app/dist 폴더 생성됨
RUN npm run build

# =============================================================================
# 2. Run Stage
# =============================================================================
FROM nginx:alpine

# 빌드 결과물(dist)을 Nginx 기본 경로로 복사
COPY --from=build /app/dist /usr/share/nginx/html

# 커스텀 Nginx 설정을 복사 (SPA 라우팅 문제 해결용)
# 만약 프로젝트 루트에 nginx.conf가 없다면 이 줄은 에러가 납니다.
# 파일이 없다면 아래 [참고]를 봐주세요.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]