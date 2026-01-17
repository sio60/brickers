파이썬 버전 3.11.9
requirements.txt에 있는 패키지 설치요망

pip install -r requirements.txt

/ai 폴더에 있는 __init__.py 파일은 ingest_ldraw.py 에 config.py import 시키려고 만든 init 파일
ingest_ldraw.py = ldraw parts를 mongo에 import하는 스크립트
카톡에 Complete 파일 내부에 있는 /ldraw/parts 폴더 지정해야함
(코드 안바꿀거면 경로 다름 C드라이브에 옮기고 실행)
내부 데이터 35000개가량이라 오래 걸림


python -m ai.vectordb.ingest_ldraw
