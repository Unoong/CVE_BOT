"""
DB 데이터 확인 스크립트
"""
import json
import mysql.connector

# 설정 로드
with open('E:/LLama/pythonProject/CVE_BOT/config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

# DB 연결
try:
    conn = mysql.connector.connect(
        host=config['database']['host'],
        port=config['database']['port'],
        user=config['database']['user'],
        password=config['database']['password'],
        database=config['database']['database']
    )
    
    cursor = conn.cursor()
    
    # 전체 개수 조회
    cursor.execute("SELECT COUNT(*) FROM Github_CVE_Info")
    total = cursor.fetchone()[0]
    print(f"전체 데이터 개수: {total}")
    
    if total > 0:
        # CVE별 개수 조회
        cursor.execute("""
            SELECT cve, COUNT(*) as count 
            FROM Github_CVE_Info 
            GROUP BY cve 
            ORDER BY count DESC 
            LIMIT 10
        """)
        
        print("\nCVE별 개수 (상위 10개):")
        for cve, count in cursor.fetchall():
            print(f"  {cve}: {count}개")
        
        # 최근 저장된 데이터
        cursor.execute("""
            SELECT cve, title, collect_time 
            FROM Github_CVE_Info 
            ORDER BY id DESC 
            LIMIT 5
        """)
        
        print("\n최근 저장된 데이터 (최신 5개):")
        for cve, title, collect_time in cursor.fetchall():
            print(f"  [{collect_time}] {cve} - {title}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"오류: {e}")

