"""
단일 CVE AI 분석 테스트
"""
import json
import logging
from datetime import datetime

from db_manager import get_db_connection, create_ai_analysis_table, get_unanalyzed_cves
from ai_analyzer import analyze_cve_with_gemini, save_analysis_to_db, update_ai_check_status
from gemini_account_manager import set_db_connection, log_quota_event

# 로거 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('Test')

# 설정 로드
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

# DB 연결
conn = get_db_connection(config)
if conn is None:
    print("DB 연결 실패")
    exit(1)

# Gemini 계정 관리자에 DB 연결 설정
set_db_connection(conn)

# 테이블 생성
create_ai_analysis_table(conn)

# 미분석 CVE 조회
unanalyzed = get_unanalyzed_cves(conn)

print(f"\n미분석 CVE: {len(unanalyzed)}개")

if unanalyzed:
    # 첫 번째 CVE만 테스트
    cve = unanalyzed[0]
    print(f"\n테스트 대상: {cve['cve']} - {cve['title']}")
    print(f"경로: {cve['download_path']}")
    
    # 분석 실행
    print("\nGemini 분석 중...\n")
    result = analyze_cve_with_gemini(cve['download_path'])
    
    if result:
        if isinstance(result, dict) and result.get('error') == 'rate_limit':
            print("❌ Rate Limit 도달")
            log_quota_event(0, 'quota_exceeded', cve['cve'], cve['link'], 'Rate Limit 도달')
        else:
            print("✅ 분석 성공!")
            print(f"\nCVE 요약: {result.get('cve_summary', '')[:200]}...")
            
            steps = result.get('poc_analysis', {}).get('attack_steps', [])
            print(f"\n공격 단계: {len(steps)}개")
            
            # DB 저장
            if save_analysis_to_db(conn, cve['link'], cve['download_path'], result):
                print("✅ DB 저장 성공!")
                update_ai_check_status(conn, cve['link'], 'Y')
                print("✅ AI_chk 업데이트 완료!")
                log_quota_event(0, 'success', cve['cve'], cve['link'])
            else:
                print("❌ DB 저장 실패")
                log_quota_event(0, 'failed', cve['cve'], cve['link'], 'DB 저장 실패')
    else:
        print("❌ 분석 실패")
        log_quota_event(0, 'failed', cve['cve'], cve['link'], '분석 실패')
else:
    print("\n분석할 CVE가 없습니다.")

conn.close()

