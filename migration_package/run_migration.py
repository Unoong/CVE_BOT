# -*- coding: utf-8 -*-
"""
DB 마이그레이션 실행 스크립트
- 상위 폴더의 config.json 또는 config.migration.json 의 database 설정 사용
- 001~012 SQL 파일을 순서대로 실행 (013은 수동 참고용)
"""
import json
import sys
from pathlib import Path

try:
    import mysql.connector
except ImportError:
    print("[오류] mysql-connector-python 이 필요합니다. pip install mysql-connector-python")
    sys.exit(1)

# migration_package 기준 상위 = 프로젝트 루트
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MIGRATION_DIR = Path(__file__).resolve().parent

CONFIG_FILES = [
    MIGRATION_DIR / "config.migration.json",
    PROJECT_ROOT / "config.json",
    PROJECT_ROOT / "config.prod.json",
    PROJECT_ROOT / "config.test.json",
]


def load_config():
    """database 설정 로드 (migration_package/config.migration.json 또는 프로젝트 config 우선)."""
    for p in CONFIG_FILES:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                db = cfg.get("database") or {}
                if db.get("host") is not None and db.get("database"):
                    print(f"[설정] 사용 중: {p}")
                    return db
            except Exception as e:
                print(f"[경고] {p} 로드 실패: {e}")
    print("[오류] database 설정을 찾을 수 없습니다.")
    print("       migration_package/config.migration.json 또는 프로젝트 루트 config.json 에 database 섹션을 넣어주세요.")
    return None


def run_sql_file(conn, filepath, database=None):
    """SQL 파일 실행 (세미콜론으로 구분된 문장 단위, USE 제외)."""
    with open(filepath, "r", encoding="utf-8") as f:
        sql_content = f.read()
    # 주석만 있는 줄과 USE 문 제거 (연결 시 이미 database 지정됨)
    lines = []
    for line in sql_content.split("\n"):
        s = line.strip()
        if s.upper().startswith("USE ") or s.startswith("--"):
            continue
        lines.append(line)
    sql_content = "\n".join(lines)
    statements = [s.strip() for s in sql_content.split(";") if s.strip()]
    cursor = conn.cursor()
    try:
        for stmt in statements:
            if not stmt:
                continue
            try:
                cursor.execute(stmt)
            except Exception as e:
                # 이미 존재하는 객체는 무시
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    print(f"  [스킵] 이미 존재함: {filepath.name} - {e}")
                else:
                    raise
        conn.commit()
    finally:
        cursor.close()


def run_create_database(conn_nodb, db_name):
    """DB 생성 (database 없이 연결한 상태에서 실행)."""
    cursor = conn_nodb.cursor()
    try:
        cursor.execute(
            "CREATE DATABASE IF NOT EXISTS `%s` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci"
            % (db_name.replace("`", "``"),)
        )
        conn_nodb.commit()
        print(f"  [OK] 데이터베이스 확인/생성: {db_name}")
    finally:
        cursor.close()


def main():
    config = load_config()
    if not config:
        sys.exit(1)

    host = config.get("host", "localhost")
    port = int(config.get("port", 3306))
    user = config.get("user", "root")
    password = config.get("password", "")
    database = config.get("database", "TOTORO")

    # 001: DB 생성 (database 없이 연결 후 생성)
    print("\n[1/2] 데이터베이스 생성 확인...")
    try:
        conn_nodb = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
        )
        run_create_database(conn_nodb, database)
        conn_nodb.close()
    except Exception as e:
        print(f"[오류] DB 연결/생성 실패: {e}")
        sys.exit(1)

    # 002~012: 해당 DB에 테이블 생성
    print("\n[2/2] 테이블 마이그레이션 실행...")
    try:
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
        )
    except Exception as e:
        print(f"[오류] DB 연결 실패: {e}")
        sys.exit(1)

    sql_files = sorted(MIGRATION_DIR.glob("*.sql"))
    # 001 제외(이미 위에서 처리), 013 제외(수동 참고용)
    sql_files = [f for f in sql_files if f.name.startswith(("002_", "003_", "004_", "005_", "006_", "007_", "008_", "009_", "010_", "011_", "012_"))]

    for fp in sql_files:
        print(f"  실행: {fp.name}")
        try:
            run_sql_file(conn, fp, database)
        except Exception as e:
            print(f"[오류] {fp.name} 실행 실패: {e}")
            conn.close()
            sys.exit(1)

    conn.close()
    print("\n[완료] 마이그레이션이 정상적으로 끝났습니다.")
    print("  ※ 013_alter_optional_columns.sql 은 기존 DB 컬럼 추가 시에만 수동 참고하여 실행하세요.")


if __name__ == "__main__":
    main()
