파이썬 버전 3.11.9
requirements.txt에 있는 패키지 설치요망

pip install -r requirements.txt

/ai 폴더에 있는 __init__.py 파일은 ingest_ldraw.py 에 config.py import 시키려고 만든 init 파일
ingest_ldraw.py = ldraw parts를 mongo에 import하는 스크립트
카톡에 Complete 파일 내부에 있는 /ldraw/parts 폴더 지정해야함
(코드 안바꿀거면 경로 다름 C드라이브에 옮기고 실행)
내부 데이터 35000개가량이라 오래 걸림


/brickers에서 실행 python -m ai.vectordb.ingest_ldraw 
[parts.scan] 35109 files
[parts.progress] 2000/35109 뜨면서 

[done] {'parts': {'files': 35109, 'moved': 1354}, 'models': {'files': 2}, 'bbox': {'scanned': 35109, 'updated': 0, 'skipped': 35109}, 'embedding': {'scanned': 35109, 'targets': 
35109, 'updated': 35109, 'dims': 384}}
나오면 성공