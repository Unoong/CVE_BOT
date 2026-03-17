"""
CVE_Packet_AI_Analysis 테이블에 expected_response 컬럼 추가
기존 데이터는 'N/A'로 설정
"""
import json
import mysql.connector
from logger import setup_logger, log_print


def load_config():
    """설정 파일 로드"""
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    """메인 실행 함수"""
    logger = setup_logger()
    log_print("=" * 80, 'info')
    log_print("expected_response 컬럼 추가 및 데이터 업데이트 시작", 'info')
    log_print("=" * 80, 'info')
    
    # 설정 로드
    config = load_config()
    
    # DB 연결
    try:
        conn = mysql.connector.connect(
            host=config['database']['host'],
            port=config['database']['port'],
            user=config['database']['user'],
            password=config['database']['password'],
            database=config['database']['database']
        )
        log_print("[DB] 데이터베이스 연결 성공", 'info')
    except Exception as e:
        log_print(f"[DB 연결 오류] {e}", 'error')
        return
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1단계: expected_response 컬럼 존재 여부 확인
        log_print("[1단계] expected_response 컬럼 존재 여부 확인", 'info')
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s
            AND TABLE_NAME = 'CVE_Packet_AI_Analysis'
            AND COLUMN_NAME = 'expected_response'
        """, (config['database']['database'],))
        
        result = cursor.fetchone()
        column_exists = result['count'] > 0
        
        if column_exists:
            log_print("  → expected_response 컬럼이 이미 존재합니다", 'info')
        else:
            # 2단계: 컬럼 추가 (TEXT 타입은 DEFAULT 불가)
            log_print("[2단계] expected_response 컬럼 추가 중...", 'info')
            cursor.execute("""
                ALTER TABLE CVE_Packet_AI_Analysis
                ADD COLUMN expected_response TEXT
            """)
            conn.commit()
            log_print("  → expected_response 컬럼 추가 완료!", 'info')
        
        # 3단계: 기존 데이터 개수 확인
        log_print("[3단계] 기존 데이터 확인", 'info')
        cursor.execute("SELECT COUNT(*) as total FROM CVE_Packet_AI_Analysis")
        total_count = cursor.fetchone()['total']
        log_print(f"  → 총 {total_count}개의 레코드 발견", 'info')
        
        # 4단계: NULL이거나 비어있는 데이터를 'N/A'로 업데이트
        log_print("[4단계] 기존 데이터를 'N/A'로 업데이트 중...", 'info')
        cursor.execute("""
            UPDATE CVE_Packet_AI_Analysis
            SET expected_response = 'N/A'
            WHERE expected_response IS NULL OR expected_response = ''
        """)
        updated_count = cursor.rowcount
        conn.commit()
        log_print(f"  → {updated_count}개 레코드를 'N/A'로 업데이트 완료!", 'info')
        
        # 5단계: 통합 테이블에도 컬럼 추가
        log_print("[5단계] CVE_Integrated_Data 테이블에도 컬럼 추가", 'info')
        
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s
            AND TABLE_NAME = 'CVE_Integrated_Data'
            AND COLUMN_NAME = 'ai_expected_response'
        """, (config['database']['database'],))
        
        integrated_exists = cursor.fetchone()['count'] > 0
        
        if integrated_exists:
            log_print("  → ai_expected_response 컬럼이 이미 존재합니다", 'info')
        else:
            cursor.execute("""
                ALTER TABLE CVE_Integrated_Data
                ADD COLUMN ai_expected_response TEXT AFTER ai_remediation
            """)
            conn.commit()
            log_print("  → ai_expected_response 컬럼 추가 완료!", 'info')
        
        # 6단계: 통합 테이블 데이터 업데이트
        log_print("[6단계] 통합 테이블 데이터 업데이트", 'info')
        cursor.execute("""
            UPDATE CVE_Integrated_Data cid
            LEFT JOIN CVE_Packet_AI_Analysis cpaa ON cid.github_link = cpaa.link
            SET cid.ai_expected_response = COALESCE(cpaa.expected_response, 'N/A')
        """)
        integrated_updated = cursor.rowcount
        conn.commit()
        log_print(f"  → {integrated_updated}개 레코드 업데이트 완료!", 'info')
        
        # 7단계: 결과 샘플 출력
        log_print("[7단계] 업데이트 결과 샘플 (최근 10개)", 'info')
        cursor.execute("""
            SELECT id, link, vuln_stage, expected_response
            FROM CVE_Packet_AI_Analysis
            ORDER BY id DESC
            LIMIT 10
        """)
        
        for row in cursor.fetchall():
            stage = row['vuln_stage'] or 'N/A'
            response = (row['expected_response'] or 'N/A')[:50]
            log_print(f"  ID:{row['id']} | {stage} | {response}", 'info')
        
        log_print("=" * 80, 'info')
        log_print("✅ expected_response 컬럼 추가 및 업데이트 완료!", 'info')
        log_print("=" * 80, 'info')
        
    except Exception as e:
        log_print(f"[오류] {str(e)}", 'error')
        import traceback
        log_print(traceback.format_exc(), 'error')
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        log_print("[DB] 데이터베이스 연결 종료", 'info')


if __name__ == '__main__':
    main()

