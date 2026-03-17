"""
AI 분석 결과 확인 스크립트
"""
import json
import mysql.connector

# 설정 로드
with open('config.json', 'r', encoding='utf-8') as f:
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
    
    # 전체 분석 개수
    cursor.execute("SELECT COUNT(*) FROM CVE_Packet_AI_Analysis")
    total = cursor.fetchone()[0]
    print(f"전체 AI 분석 결과: {total}개")
    
    # 분석 완료된 CVE 개수 (AI_chk='Y')
    cursor.execute("SELECT COUNT(*) FROM Github_CVE_Info WHERE AI_chk = 'Y'")
    analyzed = cursor.fetchone()[0]
    print(f"분석 완료된 CVE: {analyzed}개")
    
    # 미분석 CVE 개수 (AI_chk='N')
    cursor.execute("SELECT COUNT(*) FROM Github_CVE_Info WHERE AI_chk = 'N'")
    pending = cursor.fetchone()[0]
    print(f"미분석 CVE: {pending}개")
    
    if total > 0:
        # 최근 분석 결과
        cursor.execute("""
            SELECT link, step, vuln_stage, mitre_technique
            FROM CVE_Packet_AI_Analysis
            ORDER BY id DESC
            LIMIT 5
        """)
        
        print("\n최근 분석 결과 (최신 5개):")
        for link, step, vuln_stage, mitre_technique in cursor.fetchall():
            print(f"  Step {step} - {vuln_stage} ({mitre_technique or 'N/A'})")
            print(f"    {link[:80]}...")
        
        # MITRE 기법 통계
        cursor.execute("""
            SELECT mitre_technique, COUNT(*) as cnt
            FROM CVE_Packet_AI_Analysis
            WHERE mitre_technique IS NOT NULL AND mitre_technique != ''
            GROUP BY mitre_technique
            ORDER BY cnt DESC
            LIMIT 5
        """)
        
        print("\nMITRE 기법 통계 (상위 5개):")
        for technique, cnt in cursor.fetchall():
            print(f"  {technique}: {cnt}개")
    
    cursor.close()
    conn.close()
    print("\n✅ 확인 완료!")
    
except Exception as e:
    print(f"오류: {e}")

