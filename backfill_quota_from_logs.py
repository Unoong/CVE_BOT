"""
ai_analysis.log, ai_analyzer.log 분석하여 오늘 gemini_quota_usage 갱신
- [Task #N] ✅ 완료: CVE-XXX → success
- [Task #N] ❌ ... → failed
- [현재 계정] email, [계정 전환] A -> B → 계정 추적
실행: python backfill_quota_from_logs.py [날짜]
  날짜 생략 시 오늘(KST)
"""
import re
import sys
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# 프로젝트 루트
BASE = Path(__file__).resolve().parent
LOGS_DIR = BASE / 'logs'


def parse_log_timestamp(line):
    """로그 라인에서 타임스탬프 파싱. 성공 시 (datetime, msg) 반환."""
    m = re.match(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ - .+ - \w+ - (.+)$', line)
    if not m:
        return None, None
    try:
        dt = datetime.strptime(m.group(1), '%Y-%m-%d %H:%M:%S')
        return dt, m.group(2).strip()
    except ValueError:
        return None, None


def parse_logs_for_date(target_date_str, logs_dir=LOGS_DIR):
    """
    ai_analysis.log, ai_analyzer.log에서 target_date_str 날짜의 성공/실패 건수 추출
    Returns: { account_email: { 'success': N, 'failed': M } }
    """
    # 계정 매핑 (gemini_account_manager와 동일)
    ACCOUNT_EMAIL_MAP = {
        "shinhands.gpt@gmail.com": ".gemini_shinhands.gpt",
        "shinhands.gemini@gmail.com": ".gemini_shinhands.gemini",
        "shinhands.credit1@gmail.com": ".gemini_shinhands.credit1",
    }
    # 이메일 정규화 (점 -> 언더스코어)
    def normalize_email(e):
        if not e or '@' not in e:
            return e
        return e.replace('.', '_') if '@' in e else e

    by_account = defaultdict(lambda: {'success': 0, 'failed': 0})
    current_account = None

    # 오늘 로그 + 해당 날짜 로테이션 파일 (ai_analysis.log.2026-03-17)
    log_files = [
        logs_dir / 'ai_analysis.log',
        logs_dir / f'ai_analysis.log.{target_date_str}',
    ]
    # ai_analyzer.log는 CVE 분석 성공만 기록, DB 저장 여부는 ai_analysis가 정확
    # ai_analysis.log가 주 데이터 소스

    for log_path in log_files:
        if not log_path.exists():
            continue
        try:
            with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
                for line in f:
                    dt, msg = parse_log_timestamp(line)
                    if not msg:
                        continue
                    line_date = dt.strftime('%Y-%m-%d') if dt else ''
                    if line_date != target_date_str:
                        continue

                    # [현재 계정] email
                    m = re.search(r'\[현재 계정\]\s*(\S+@\S+)', msg)
                    if m:
                        current_account = m.group(1).strip()
                        continue

                    # [계정 전환] ✅ 성공: A -> B
                    m = re.search(r'\[계정 전환\]\s*✅\s*성공:\s*\S+\s*->\s*(\S+@\S+)', msg)
                    if m:
                        current_account = m.group(1).strip()
                        continue

                    # [계정 전환] A -> B 전환 시도 (성공 전)
                    m = re.search(r'\[계정 전환\]\s*\S+\s*->\s*(\S+@\S+)\s*전환', msg)
                    if m:
                        # 전환 시도만 있고 성공 로그가 따로 옴. 여기선 아직 유지
                        pass

                    # [Task #N] ✅ 완료: CVE-XXX
                    if '[Task #' in msg and '✅ 완료:' in msg:
                        acc = current_account or list(ACCOUNT_EMAIL_MAP.keys())[0]
                        by_account[acc]['success'] += 1
                        continue

                    # [Task #N] ❌ ...
                    if '[Task #' in msg and '❌' in msg:
                        acc = current_account or list(ACCOUNT_EMAIL_MAP.keys())[0]
                        by_account[acc]['failed'] += 1
                        continue

        except Exception as e:
            print(f"[경고] {log_path} 읽기 오류: {e}")

    return dict(by_account)


def update_gemini_quota_usage(target_date_str, by_account):
    """gemini_quota_usage 테이블 갱신"""
    try:
        with open(BASE / 'config.json', 'r', encoding='utf-8') as f:
            config = json.load(f)
    except FileNotFoundError:
        print("[오류] config.json 없음")
        return False

    try:
        import mysql.connector
        conn = mysql.connector.connect(
            host=config['database']['host'],
            port=config['database']['port'],
            user=config['database']['user'],
            password=config['database']['password'],
            database=config['database']['database']
        )
    except Exception as e:
        print(f"[오류] DB 연결 실패: {e}")
        return False

    ACCOUNT_EMAIL_MAP = {
        "shinhands.gpt@gmail.com": ".gemini_shinhands.gpt",
        "shinhands.gemini@gmail.com": ".gemini_shinhands.gemini",
        "shinhands.credit1@gmail.com": ".gemini_shinhands.credit1",
    }

    cursor = conn.cursor(dictionary=True)
    updated = 0

    for email, counts in by_account.items():
        success = counts['success']
        failed = counts['failed']
        total = success + failed
        if total == 0:
            continue

        # gemini_accounts에서 account_id 조회
        email_norm = email.replace('.', '_') if '@' in email else email
        account_name = ACCOUNT_EMAIL_MAP.get(email, '.gemini_' + email.split('@')[0] if '@' in email else email)
        cursor.execute('''
            SELECT id FROM gemini_accounts
            WHERE account_name = %s OR account_email = %s OR account_email = %s
            LIMIT 1
        ''', (account_name, email, email_norm))
        row = cursor.fetchone()
        if not row:
            print(f"  [건너뜀] gemini_accounts에 계정 없음: {email}")
            continue

        account_id = row['id']

        # 기존 레코드 확인
        cursor.execute('''
            SELECT id, request_count, success_count, failed_count
            FROM gemini_quota_usage
            WHERE account_id = %s AND usage_date = %s
        ''', (account_id, target_date_str))
        existing = cursor.fetchone()

        if existing:
            # 이미 더 큰 값이 있으면 건너뜀 (덮어쓰지 않음)
            if existing['request_count'] >= total:
                print(f"  [유지] {email}: 기존 {existing['request_count']} >= 로그 {total}")
                continue
            cursor.execute('''
                UPDATE gemini_quota_usage
                SET request_count = %s, success_count = %s, failed_count = %s,
                    last_used_at = NOW(), updated_at = NOW()
                WHERE account_id = %s AND usage_date = %s
            ''', (total, success, failed, account_id, target_date_str))
        else:
            cursor.execute('''
                INSERT INTO gemini_quota_usage
                (account_id, usage_date, request_count, success_count, failed_count, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            ''', (account_id, target_date_str, total, success, failed))

        updated += 1
        print(f"  [갱신] {email}: 요청={total}, 성공={success}, 실패={failed}")

    conn.commit()
    cursor.close()
    conn.close()
    return updated > 0


def main():
    if len(sys.argv) >= 2:
        target_date_str = sys.argv[1]
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', target_date_str):
            print("사용법: python backfill_quota_from_logs.py [YYYY-MM-DD]")
            sys.exit(1)
    else:
        target_date_str = datetime.now(timezone(timedelta(hours=9))).strftime('%Y-%m-%d')

    print("=" * 60)
    print(f"로그 분석 → gemini_quota_usage 백필: {target_date_str}")
    print("=" * 60)

    by_account = parse_logs_for_date(target_date_str)
    if not by_account:
        print("\n[결과] 해당 날짜에 분석 이벤트 없음 또는 로그에서 파싱 실패")
        sys.exit(0)

    print("\n[로그 파싱 결과]")
    for email, counts in by_account.items():
        print(f"  {email}: 성공={counts['success']}, 실패={counts['failed']}")

    print("\n[DB 갱신]")
    ok = update_gemini_quota_usage(target_date_str, by_account)
    print("\n" + ("✅ 완료" if ok else "⚠️ 갱신할 데이터 없음 or 오류"))


if __name__ == '__main__':
    main()
