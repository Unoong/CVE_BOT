"""
기존 데이터로 CVE_Integrated_Data 테이블 생성 및 채우기
- Github_CVE_Info, CVE_Info, CVE_Packet_AI_Analysis 3개 테이블 조인
- 해시 키 생성: SHA256(cve + link + date)
"""
import json
from datetime import datetime
from logger import setup_logger, log_print
from db_manager import get_db_connection, create_integrated_table, insert_integrated_data


def load_config():
    """설정 파일 로드"""
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    """메인 실행 함수"""
    # 로거 설정
    logger = setup_logger()
    log_print("=" * 80, 'info')
    log_print("CVE 통합 테이블 생성 시작", 'info')
    log_print("=" * 80, 'info')
    
    # 설정 로드
    config = load_config()
    if config is None:
        log_print("[종료] 설정 파일 로드 실패", 'error')
        return
    
    # DB 연결
    conn = get_db_connection(config)
    if conn is None:
        log_print("[종료] 데이터베이스 연결 실패", 'error')
        return
    
    try:
        # 1단계: 통합 테이블 생성
        log_print("[1단계] CVE_Integrated_Data 테이블 생성/확인", 'info')
        create_integrated_table(conn)
        
        # 2단계: 기존 데이터 확인
        cursor = conn.cursor(dictionary=True)
        
        log_print("[2단계] 기존 데이터 확인", 'info')
        
        cursor.execute("SELECT COUNT(*) as count FROM Github_CVE_Info")
        github_count = cursor.fetchone()['count']
        log_print(f"  → Github_CVE_Info: {github_count}개", 'info')
        
        cursor.execute("SELECT COUNT(*) as count FROM CVE_Info")
        cve_info_count = cursor.fetchone()['count']
        log_print(f"  → CVE_Info: {cve_info_count}개", 'info')
        
        cursor.execute("SELECT COUNT(*) as count FROM CVE_Packet_AI_Analysis")
        ai_count = cursor.fetchone()['count']
        log_print(f"  → CVE_Packet_AI_Analysis: {ai_count}개", 'info')
        
        cursor.close()
        
        # 3단계: 통합 데이터 생성
        log_print("[3단계] 3개 테이블 조인 및 통합 데이터 생성", 'info')
        log_print("  → Github_CVE_Info ⟕ CVE_Info (on cve = CVE_Code)", 'info')
        log_print("  → Github_CVE_Info ⟕ CVE_Packet_AI_Analysis (on link = link)", 'info')
        log_print("  → 해시 키: SHA256(cve + link + date)", 'info')
        
        start_time = datetime.now()
        inserted_count = insert_integrated_data(conn)
        end_time = datetime.now()
        elapsed = (end_time - start_time).total_seconds()
        
        # 4단계: 결과 확인
        log_print("[4단계] 통합 테이블 생성 결과", 'info')
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT COUNT(*) as count FROM CVE_Integrated_Data")
        total_integrated = cursor.fetchone()['count']
        log_print(f"  → 통합 테이블 총 레코드: {total_integrated}개", 'info')
        
        # 샘플 데이터 조회
        log_print("[5단계] 샘플 데이터 (최근 5개)", 'info')
        cursor.execute("""
            SELECT 
                hash_key,
                github_cve,
                cve_code,
                cve_cvss_severity,
                ai_vuln_stage,
                created_at
            FROM CVE_Integrated_Data
            ORDER BY created_at DESC
            LIMIT 5
        """)
        
        for i, row in enumerate(cursor.fetchall(), 1):
            log_print(f"\n  [{i}] 해시: {row['hash_key'][:16]}...", 'info')
            log_print(f"      CVE: {row['github_cve'] or 'N/A'}", 'info')
            log_print(f"      CVE Code: {row['cve_code'] or 'N/A'}", 'info')
            log_print(f"      위험도: {row['cve_cvss_severity'] or 'N/A'}", 'info')
            log_print(f"      공격단계: {row['ai_vuln_stage'] or 'N/A'}", 'info')
            log_print(f"      생성시간: {row['created_at']}", 'info')
        
        # 통계 정보
        log_print("\n[6단계] 통계 정보", 'info')
        
        # CVE 코드별 통계
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT github_cve) as unique_cves,
                COUNT(DISTINCT cve_code) as with_cve_info,
                COUNT(DISTINCT CASE WHEN ai_vuln_stage IS NOT NULL THEN github_cve END) as with_ai_analysis
            FROM CVE_Integrated_Data
        """)
        stats = cursor.fetchone()
        log_print(f"  → 고유 CVE 수: {stats['unique_cves']}개", 'info')
        log_print(f"  → CVE Info 있음: {stats['with_cve_info']}개", 'info')
        log_print(f"  → AI 분석 완료: {stats['with_ai_analysis']}개", 'info')
        
        # 위험도별 통계
        cursor.execute("""
            SELECT 
                cve_cvss_severity,
                COUNT(*) as count
            FROM CVE_Integrated_Data
            WHERE cve_cvss_severity IS NOT NULL
            GROUP BY cve_cvss_severity
            ORDER BY count DESC
        """)
        log_print("\n  위험도별 분포:", 'info')
        for row in cursor.fetchall():
            log_print(f"    - {row['cve_cvss_severity']}: {row['count']}개", 'info')
        
        cursor.close()
        
        log_print("\n" + "=" * 80, 'info')
        log_print(f"✅ 통합 테이블 생성 완료!", 'info')
        log_print(f"   총 {inserted_count}개 레코드 삽입/업데이트", 'info')
        log_print(f"   소요 시간: {elapsed:.2f}초", 'info')
        log_print("=" * 80, 'info')
        
    except KeyboardInterrupt:
        log_print("\n[중단] 사용자에 의해 중단되었습니다.", 'warning')
    except Exception as e:
        log_print(f"[오류] {str(e)}", 'error')
        import traceback
        log_print(traceback.format_exc(), 'error')
    finally:
        # DB 연결 종료
        if conn:
            conn.close()
            log_print("[DB] 데이터베이스 연결 종료", 'info')


if __name__ == '__main__':
    main()

