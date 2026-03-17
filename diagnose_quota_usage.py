"""
gemini_quota_usage가 0인 원인 진단
실행: python diagnose_quota_usage.py
"""
import json
import mysql.connector
from datetime import datetime, date, timezone, timedelta

def main():
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    db = config['database']
    conn = mysql.connector.connect(
        host=db['host'], port=db['port'],
        user=db['user'], password=db['password'],
        database=db['database']
    )
    
    today_py = datetime.now(timezone(timedelta(hours=9))).date()
    today_str = str(today_py)
    
    print("=" * 70)
    print("gemini_quota_usage 진단")
    print("=" * 70)
    print(f"\n오늘(KST): {today_str}")
    
    cursor = conn.cursor(dictionary=True)
    
    # 1. gemini_quota_usage 오늘 데이터
    cursor.execute("""
        SELECT ga.account_name, gqu.usage_date, gqu.request_count, gqu.success_count, gqu.failed_count
        FROM gemini_quota_usage gqu
        JOIN gemini_accounts ga ON ga.id = gqu.account_id
        WHERE gqu.usage_date = %s
    """, (today_str,))
    usage_rows = cursor.fetchall()
    
    # 2. gemini_quota_events 오늘 데이터 (계정별)
    cursor.execute("""
        SELECT ga.account_name, gqe.event_type, COUNT(*) as cnt
        FROM gemini_quota_events gqe
        JOIN gemini_accounts ga ON gqe.account_id = ga.id
        WHERE DATE(gqe.created_at) = %s
        GROUP BY ga.account_name, gqe.event_type
    """, (today_str,))
    event_rows = cursor.fetchall()
    
    print("\n[1] gemini_quota_usage (오늘)")
    if not usage_rows:
        print("  → 비어있음 (0건)")
    else:
        for r in usage_rows:
            print(f"  {r['account_name']}: 요청={r['request_count']}, 성공={r['success_count']}, 실패={r['failed_count']}")
    
    print("\n[2] gemini_quota_events (오늘, 계정별)")
    if not event_rows:
        print("  → 비어있음 (0건)")
    else:
        by_acc = {}
        for r in event_rows:
            acc = r['account_name']
            if acc not in by_acc:
                by_acc[acc] = {}
            by_acc[acc][r['event_type']] = r['cnt']
        for acc, ev in by_acc.items():
            req = sum(ev.values())
            succ = ev.get('success', 0)
            fail = ev.get('failed', 0)
            print(f"  {acc}: 요청={req}, 성공={succ}, 실패={fail}  (이벤트: {ev})")
    
    # 3. MySQL CURDATE vs Python today
    cursor.execute("SELECT CURDATE() as d, @@session.time_zone as tz")
    row = cursor.fetchone()
    print(f"\n[3] MySQL CURDATE: {row['d']}, time_zone: {row['tz']}")
    if str(row['d']) != today_str:
        print(f"  ⚠️ 날짜 불일치! Python({today_str}) != MySQL({row['d']})")
    
    # 4. gemini_accounts
    cursor.execute("SELECT id, account_name, account_email FROM gemini_accounts ORDER BY display_order")
    accounts = cursor.fetchall()
    print("\n[4] gemini_accounts")
    for a in accounts:
        print(f"  id={a['id']} account_name={a['account_name']} account_email={a['account_email'] or '-'}")
    
    cursor.close()
    conn.close()
    print("\n" + "=" * 70)

if __name__ == '__main__':
    main()
