#!/bin/bash
# push_ai_image.sh

# .env 파일에서 DOCKER_USERNAME 읽기 시도
if [ -f .env ]; then
  # grep으로 주석 제거 후 로드
  export $(grep -v '^#' .env | xargs 2>/dev/null)
fi

# DOCKER_USERNAME이 없거나 local이면 사용자 입력 받기
if [ -z "$DOCKER_USERNAME" ] || [ "$DOCKER_USERNAME" == "local" ]; then
  echo "⚠️ .env 파일에 DOCKER_USERNAME이 설정되어 있지 않습니다."
  read -p "Docker Hub 사용자명을 입력하세요: " DOCKER_USERNAME
fi

if [ -z "$DOCKER_USERNAME" ]; then
  echo "❌ 사용자명이 입력되지 않았습니다. 스크립트를 종료합니다."
  exit 1
fi

IMAGE_TAG="$DOCKER_USERNAME/brickers-ai:latest"

echo "=========================================="
echo "🐳 Building AI Server Image..."
echo "Tag: $IMAGE_TAG"
echo "Context: ../brickers-ai"
echo "=========================================="

# 상위 폴더의 brickers-ai가 존재하는지 확인
if [ ! -d "../brickers-ai" ]; then
  echo "❌ Error: ../brickers-ai 디렉토리를 찾을 수 없습니다."
  echo "현재 위치: $(pwd)"
  exit 1
fi

docker build -t $IMAGE_TAG -f ../brickers-ai/Dockerfile ../brickers-ai

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "🚀 Pushing Image to Docker Hub..."
echo "=========================================="
docker push $IMAGE_TAG

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed. 'docker login'이 되어 있는지 확인해주세요."
    exit 1
fi

echo ""
echo "✅ Successfully built and pushed $IMAGE_TAG"
