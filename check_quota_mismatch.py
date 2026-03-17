"""
ACCOUNT_EMAIL_MAP vs gemini_accounts 불일치 및 시간대 확인
실행: python check_quota_mismatch.py
"""
import json
import mysql.connector
from datetime import datetime, date, timezone, timedelta

# gemini_account_manager와 동일한 매핑
ACCOUNT_EMAIL_MAP = {
    "shinhands.gpt@gmail.com": ".gemini_shinhands.gpt",
    "shinhands.gemini@gmail.com": ".gemini_shinhands.gemini",
    "shinhands.credit1@gmail.com": ".gemini_shinhands.credit1",
}

def main():
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    db = config['database']
    conn = mysql.connector.connect(
        host=db['host'], port=db['port'],
        user=db['user'], password=db['password'],
        database=db['database']
    )
    
    print("=" * 60)
    print("1. ACCOUNT_EMAIL_MAP vs gemini_accounts 매칭 확인")
    print("=" * 60)
    
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, account_name, account_email FROM gemini_accounts ORDER BY display_order")
    db_accounts = cursor.fetchall()
    
    map_values = set(ACCOUNT_EMAIL_MAP.values())
    db_names = {r['account_name'] for r in db_accounts}
    
    print("\n[ACCOUNT_EMAIL_MAP 값들]")
    for k, v in ACCOUNT_EMAIL_MAP.items():
        in_db = "✓" if v in db_names else "✗ 없음"
        print(f"  {k} -> {v}  {in_db}")
    
    print("\n[gemini_accounts 테이블]")
    for r in db_accounts:
        in_map = "✓" if r['account_name'] in map_values else "(MAP에 없음)"
        print(f"  id={r['id']} account_name={r['account_name']}  {in_map}")
    
    missing = map_values - db_names
    if missing:
        print(f"\n⚠️  불일치: ACCOUNT_EMAIL_MAP에 있으나 gemini_accounts에 없는 이름: {missing}")
        print("   → log_quota_event 시 gemini_accounts 조회 실패로 success_count 미기록됨")
    else:
        print("\n✓ ACCOUNT_EMAIL_MAP과 gemini_accounts 매칭 정상")
    
    print("\n" + "=" * 60)
    print("2. 시간대 확인 (Python vs MySQL)")
    print("=" * 60)
    
    py_today = date.today()
    cursor.execute("SELECT CURDATE() as mysql_date, NOW() as mysql_now")
    row = cursor.fetchone()
    mysql_date = row['mysql_date']
    mysql_now = row['mysql_now']
    
    print(f"\n  Python date.today():     {py_today}")
    print(f"  MySQL CURDATE():         {mysql_date}")
    print(f"  MySQL NOW():             {mysql_now}")
    
    if str(py_today) != str(mysql_date):
        print(f"\n⚠️  날짜 불일치! Python({py_today}) != MySQL({mysql_date})")
        print("   → log_quota_event는 Python date 사용, API는 한국시간 사용")
        print("   → 자정 근처에 기록 누락/다른 날짜로 기록될 수 있음")
    else:
        print("\n✓ 오늘 날짜 일치")
    
    cursor.close()
    conn.close()
    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()
