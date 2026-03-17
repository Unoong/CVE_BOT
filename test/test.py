#!/usr/bin/env python3
# 사용: python translate_existing_csv_using_translator.py
# 입력 파일: mitre_attack_enterprise_kr.csv (영문으로 생성된 파일)
# 출력 파일: mitre_attack_enterprise_kr_translated.csv (한글 컬럼 추가)

import csv
import sys
import time
from tqdm import tqdm

# 사용자 제공 모듈에서 단일 함수 사용 (요청대로)
try:
    from translator import translate_to_korean
except Exception as e:
    print("ERROR: translator.translate_to_korean 임포트 실패:", e, file=sys.stderr)
    print("같은 폴더에 translator.py가 있고, translate_to_korean(text: str) -> str 시그니처인지 확인하세요.", file=sys.stderr)
    sys.exit(2)

IN_FILE = "mitre_attack_enterprise_kr.csv"
OUT_FILE = "mitre_attack_enterprise_kr_translated.csv"
# CSV 내 컬럼명(사례에 맞게 조정 가능)
# 스크립트는 "기법명(영문)" / "설명(영문)" / "탐지(영문)" 컬럼을 찾아 번역-추가함
COL_NAME_EN = "기법명(영문)"
COL_DESC_EN = "설명(영문)"
COL_DETECT_EN = "탐지(영문)"

with open(IN_FILE, newline='', encoding='utf-8-sig') as inf:
    reader = csv.DictReader(inf)
    # 새 필드 추가
    fieldnames = list(reader.fieldnames)
    if "기법명(한글)" not in fieldnames: fieldnames.append("기법명(한글)")
    if "설명(한국어)" not in fieldnames: fieldnames.append("설명(한국어)")
    if "탐지(한국어)" not in fieldnames: fieldnames.append("탐지(한국어)")

    with open(OUT_FILE, "w", newline='', encoding='utf-8-sig') as outf:
        writer = csv.DictWriter(outf, fieldnames=fieldnames)
        writer.writeheader()

        for row in tqdm(list(reader), desc="Translating rows"):
            # 안전하게 영문 컬럼을 읽어서 translate 호출
            en_name = row.get(COL_NAME_EN, "") or row.get("name_en","")
            en_desc = row.get(COL_DESC_EN, "") or row.get("description_en","")
            en_detect = row.get(COL_DETECT_EN, "") or row.get("detection_en","")

            # 번역 호출: 사용자 제공 함수만 사용 (요청사항 준수)
            try:
                kr_name = translate_to_korean(en_name) if en_name else ""
            except Exception as e:
                print("translate_to_korean 실패 (기법명):", e, file=sys.stderr)
                kr_name = en_name

            # 짧은 지연/백오프(모듈이 외부 API 사용 시 보호)
            time.sleep(0.05)

            try:
                kr_desc = translate_to_korean(en_desc) if en_desc else ""
            except Exception as e:
                print("translate_to_korean 실패 (설명):", e, file=sys.stderr)
                kr_desc = en_desc

            time.sleep(0.05)

            try:
                kr_detect = translate_to_korean(en_detect) if en_detect else ""
            except Exception as e:
                print("translate_to_korean 실패 (탐지):", e, file=sys.stderr)
                kr_detect = en_detect

            # 결과 행에 추가
            row["기법명(한글)"] = kr_name
            row["설명(한국어)"] = kr_desc
            row["탐지(한국어)"] = kr_detect

            writer.writerow(row)

print("완료:", OUT_FILE)
