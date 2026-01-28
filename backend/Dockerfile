# =============================================================================
# 1. Build Stage
# =============================================================================
FROM gradle:8.14-jdk17 AS build
COPY --chown=gradle:gradle . /home/gradle/src
WORKDIR /home/gradle/src

# -----------------------------------------------------------------------------
# [핵심 수정] 빌드 통과용 가짜 환경변수 주입
# Spring Boot가 빌드 중 설정파일 검사할 때 터지지 않게 막는 용도입니다.
# -----------------------------------------------------------------------------
# 1) MongoDB 관련
ENV MONGO_HOST=localhost
ENV MONGO_PORT=27017
ENV MONGO_DB_NAME=brickers
ENV MONGO_USER=admin
ENV MONGO_PASSWORD=password
ENV PRIMARY_MONGODB_URI=mongodb://localhost:27017/brickers

# 2) AWS S3 관련 (이가 문제였음)
ENV AWS_S3_BUCKET=build-time-dummy-bucket
ENV AWS_REGION=ap-northeast-2
ENV AWS_ACCESS_KEY_ID=dummy
ENV AWS_SECRET_ACCESS_KEY=dummy
ENV UPLOAD_PROVIDER=LOCAL
ENV UPLOAD_PUBLIC_BASE_URL=http://localhost:8080/uploads

# 3) OAuth (구글/카카오) 관련
ENV GOOGLE_CLIENT_ID=dummy
ENV GOOGLE_CLIENT_SECRET=dummy
ENV GOOGLE_REDIRECT_URI=http://localhost:8080/auth/google/callback
ENV KAKAO_CLIENT_ID=dummy
ENV KAKAO_CLIENT_SECRET=dummy
ENV KAKAO_ADMIN_KEY=dummy
ENV KAKAO_REDIRECT_URI=http://localhost:8080/auth/kakao/callback

# 4) JWT 및 기타
ENV JWT_SECRET=dummy_secret_key_must_be_long_enough_for_build
ENV FRONT_BASE_URL=http://localhost:5173
ENV LOCAL_BASE_URL=http://localhost:8080

# 5) OpenAI (챗봇용)
ENV APP_OPENAI_API_KEY=sk-dummy-build-time-key

# 6) SQS 설정
ENV AWS_SQS_ENABLED=false
ENV AWS_SQS_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/dummy/DummyQueue

# -----------------------------------------------------------------------------
# 빌드 실행 (테스트 제외)
# -----------------------------------------------------------------------------
RUN gradle build --no-daemon -x test

# =============================================================================
# 2. Run Stage
# =============================================================================
FROM eclipse-temurin:17-jre
EXPOSE 8080

# 빌드 결과물 복사
COPY --from=build /home/gradle/src/build/libs/*.jar app.jar

# 실행
ENTRYPOINT ["java", "-jar", "/app.jar"]