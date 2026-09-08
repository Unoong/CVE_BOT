# -*- coding: utf-8 -*-
"""
Google 번역 에러 페이지가 descriptions에 저장된 CVE를 재수집·갱신한다.
"""
import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from cve_info_collector import get_cve_info
from db_manager import get_db_connection, update_cve_info_descriptions
from translator import is_translate_error_text
from logger import setup_logger, log_print


def find_polluted_cves(conn):
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT CVE_Code, LEFT(descriptions, 120) AS d
        FROM CVE_Info
        WHERE descriptions LIKE %s
           OR descriptions LIKE %s
           OR descriptions LIKE %s
           OR descriptions LIKE %s
           OR descriptions LIKE %s
           OR descriptions LIKE %s
        ORDER BY CVE_Code
        """,
        (
            "%Error 500%",
            "%Error 504%",
            "%Server Error%",
            "%That's an error%",
            "%That’s an error%",
            "%Please try again later%",
        ),
    )
    rows = cur.fetchall()
    cur.close()
    return rows


def repair_one(conn, cve_code, sleep_sec):
    info = get_cve_info(cve_code)
    if not info:
        log_print(f"[복구 실패] {cve_code}: CVE API 조회 실패", "error")
        return False

    desc = info.get("descriptions") or ""
    sol = info.get("solutions") or ""

    if is_translate_error_text(desc):
        log_print(f"[복구 보류] {cve_code}: 재수집 결과도 에러 문구", "warning")
        return False

    if not desc.strip():
        log_print(f"[복구 보류] {cve_code}: 설명이 비어 있음", "warning")
        return False

    ok = update_cve_info_descriptions(conn, cve_code, desc, sol if sol else None)
    if ok:
        log_print(f"[복구 완료] {cve_code}: {desc[:80].replace(chr(10), ' ')}", "info")
    else:
        log_print(f"[복구 실패] {cve_code}: DB 업데이트 실패", "error")
    if sleep_sec > 0:
        time.sleep(sleep_sec)
    return ok


def main():
    setup_logger()
    parser = argparse.ArgumentParser(description="오염된 CVE descriptions 재수집")
    parser.add_argument("--limit", type=int, default=0, help="최대 처리 건수 (0=전체)")
    parser.add_argument("--sleep", type=float, default=1.5, help="건당 대기 초")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    config = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    conn = get_db_connection(config)
    if not conn:
        raise SystemExit("DB 연결 실패")

    rows = find_polluted_cves(conn)
    if args.limit and args.limit > 0:
        rows = rows[: args.limit]

    log_print(f"[복구] 대상 {len(rows)}건 (dry_run={args.dry_run})", "info")
    ok_n = fail_n = 0
    for i, row in enumerate(rows, 1):
        cve = row["CVE_Code"]
        log_print(f"[{i}/{len(rows)}] {cve}", "info")
        if args.dry_run:
            continue
        if repair_one(conn, cve, args.sleep):
            ok_n += 1
        else:
            fail_n += 1

    log_print(f"[복구] 완료: 성공 {ok_n}, 실패 {fail_n}, 대상 {len(rows)}", "info")
    conn.close()


if __name__ == "__main__":
    main()
