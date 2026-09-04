# -*- coding: utf-8 -*-
"""
주의모니터링 CVE 추가 시 CIRCL/GitHub 보강 스크립트.

Usage:
  python enrich_monitored_cve.py CVE-2026-10134
  python enrich_monitored_cve.py CVE-2026-10134 --no-collect

stdout: JSON 결과 (마지막 줄)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config_loader import ConfigLoader
from db_manager import (
    get_db_connection,
    check_cve_info_exists,
    insert_cve_info,
    check_duplicate,
    get_cve_count,
)
from cve_info_collector import get_cve_info
from github_collector import GitHubCollector
from main import process_repository, get_max_poc_limit


CVE_RE = re.compile(r"^CVE-\d{4}-\d+$", re.I)


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _cve_summary(row: dict | None) -> dict | None:
    if not row:
        return None
    return {
        "CVE_Code": row.get("CVE_Code"),
        "product": row.get("product"),
        "state": row.get("state"),
        "CVSS_Score": row.get("CVSS_Score"),
        "CVSS_Serverity": row.get("CVSS_Serverity"),
        "datePublished": row.get("datePublished"),
        "descriptions": (row.get("descriptions") or "")[:500],
        "cweId": row.get("cweId"),
        "Attak_Type": row.get("Attak_Type"),
    }


def enrich(cve_code: str, do_collect: bool = True) -> dict:
    cve_code = cve_code.strip().upper()
    result = {
        "ok": True,
        "cve_code": cve_code,
        "cve_info_existed": False,
        "cve_info_fetched": False,
        "cve_info": None,
        "github_found": 0,
        "github_in_db": 0,
        "github_collected_new": 0,
        "github_repos": [],
        "errors": [],
        "at": _now(),
    }

    if not CVE_RE.match(cve_code):
        result["ok"] = False
        result["errors"].append("invalid_cve_format")
        return result

    config = ConfigLoader.load_config()
    if not config:
        result["ok"] = False
        result["errors"].append("config_load_failed")
        return result

    conn = get_db_connection(config)
    if not conn:
        result["ok"] = False
        result["errors"].append("db_connect_failed")
        return result

    try:
        existing = check_cve_info_exists(conn, cve_code)
        if existing:
            result["cve_info_existed"] = True
            result["cve_info"] = _cve_summary(existing)
        else:
            info = get_cve_info(cve_code)
            if info:
                if insert_cve_info(conn, info):
                    result["cve_info_fetched"] = True
                    result["cve_info"] = _cve_summary(info)
                else:
                    result["errors"].append("cve_info_insert_failed")
            else:
                result["errors"].append("circl_not_found")

        # GitHub 검색 (해당 CVE 키워드)
        tokens = config.get("github", {}).get("tokens") or []
        token = config.get("github", {}).get("token")
        token_or_tokens = tokens if tokens else token
        if not token_or_tokens:
            result["errors"].append("github_token_missing")
            return result

        collector = GitHubCollector(token_or_tokens)
        query = f"{cve_code} in:name,description,readme"
        search = collector.search_repositories(
            query, sort="updated", order="desc", per_page=30, page=1
        )
        if search in (None, "rate_limit_exceeded") or isinstance(search, (int, float)):
            result["errors"].append("github_search_failed")
            return result

        items = search.get("items") or []
        max_limit = get_max_poc_limit(config, cve_code)
        result["github_in_db"] = get_cve_count(conn, cve_code)

        for item in items[: max(max_limit * 3, 30)]:
            html_url = item.get("html_url")
            full_name = item.get("full_name") or ""
            owner = (item.get("owner") or {}).get("login", "")
            title = item.get("name") or full_name
            description = item.get("description") or ""
            search_blob = f"{title} {description} {full_name}".upper()
            found_codes = collector.extract_cve_codes(search_blob)
            # 대상 CVE가 이름/설명에 직접 포함된 경우만 모니터링 수집 대상으로 인정
            if cve_code not in found_codes and cve_code not in search_blob:
                continue

            in_db = bool(html_url and check_duplicate(conn, html_url))
            repo_entry = {
                "html_url": html_url,
                "full_name": full_name,
                "title": title,
                "already_in_db": in_db,
                "collected": False,
            }

            if do_collect and html_url and not in_db and get_cve_count(conn, cve_code) < max_limit:
                readme = ""
                try:
                    readme = collector.get_repository_readme(owner, item.get("name") or "")
                except Exception:
                    pass
                repo_info = {
                    "title": title,
                    "cve_code": cve_code,
                    "created_at": item.get("created_at") or "",
                    "html_url": html_url,
                    "owner": owner,
                    "readme": readme or "",
                    "description": description,
                    "cve_codes": [cve_code],
                }
                try:
                    ok = process_repository(repo_info, conn, config)
                    if ok:
                        repo_entry["collected"] = True
                        result["github_collected_new"] += 1
                except Exception as e:
                    result["errors"].append(f"collect_error:{e}")

            result["github_repos"].append(repo_entry)
            if len(result["github_repos"]) >= max_limit:
                break

        result["github_found"] = len(result["github_repos"])

        result["github_in_db"] = get_cve_count(conn, cve_code)
        # 최종 CVE_Info 재조회
        final_info = check_cve_info_exists(conn, cve_code)
        if final_info:
            result["cve_info"] = _cve_summary(final_info)

    finally:
        try:
            conn.close()
        except Exception:
            pass

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("cve_code")
    parser.add_argument("--no-collect", action="store_true")
    args = parser.parse_args()
    out = enrich(args.cve_code, do_collect=not args.no_collect)
    print(json.dumps(out, ensure_ascii=False))
    sys.exit(0 if out.get("ok") else 1)


if __name__ == "__main__":
    main()
