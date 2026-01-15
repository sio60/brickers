FROM python:3.11.9-slim

WORKDIR /app

# 시스템 의존성 설치 (필요 시)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# ENTRYPOINT ["python", "main.py"]
# uvicorn 직접 실행 (main.py의 설정을 따르거나 직접 지정 가능)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
