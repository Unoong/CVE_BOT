#!/usr/bin/env python3
"""
AI 할당량 상태 확인 스크립트
"""
import mysql.connector
from datetime import date

def check_quota_status():
    # DB 연결
    conn = mysql.connector.connect(
        host='localhost',
        port=7002,
        user='root',
        password='!db8354',
        database='TOTORO'
    )

    cursor = conn.cursor(dictionary=True)

    try:
        # gemini_accounts 테이블 확인
        print('=== Gemini 계정 목록 ===')
        cursor.execute('SELECT * FROM gemini_accounts ORDER BY display_order')
        accounts = cursor.fetchall()
        for acc in accounts:
            print(f'ID: {acc["id"]}, 계정: {acc["account_name"]}, 할당량: {acc["daily_quota_limit"]}')

        print('\n=== 오늘 사용량 현황 ===')
        today = date.today()
        cursor.execute('''
            SELECT 
                ga.account_name,
                ga.daily_quota_limit,
                COALESCE(gqu.request_count, 0) as request_count,
                COALESCE(gqu.success_count, 0) as success_count,
                COALESCE(gqu.failed_count, 0) as failed_count,
                COALESCE(gqu.is_quota_exceeded, FALSE) as is_quota_exceeded
            FROM gemini_accounts ga
            LEFT JOIN gemini_quota_usage gqu ON ga.id = gqu.account_id AND gqu.usage_date = %s
            ORDER BY ga.display_order
        ''', (today,))

        usage = cursor.fetchall()
        for u in usage:
            print(f'계정: {u["account_name"]}, 요청: {u["request_count"]}, 성공: {u["success_count"]}, 실패: {u["failed_count"]}, 초과: {u["is_quota_exceeded"]}')

        print('\n=== 최근 이벤트 로그 (최근 5개) ===')
        cursor.execute('''
            SELECT 
                gqe.event_type,
                ga.account_name,
                gqe.cve_code,
                gqe.error_message,
                gqe.created_at
            FROM gemini_quota_events gqe
            JOIN gemini_accounts ga ON gqe.account_id = ga.id
            ORDER BY gqe.created_at DESC
            LIMIT 5
        ''')
        
        events = cursor.fetchall()
        for event in events:
            print(f'이벤트: {event["event_type"]}, 계정: {event["account_name"]}, CVE: {event["cve_code"]}, 시간: {event["created_at"]}')

    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    check_quota_status()
