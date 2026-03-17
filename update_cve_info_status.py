"""
Github_CVE_Info 테이블에 cve_info_status 컬럼 추가 및 기존 데이터 업데이트
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
    log_print("cve_info_status 컬럼 추가 및 데이터 업데이트 시작", 'info')
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
        # 1단계: cve_info_status 컬럼 존재 여부 확인
        log_print("[1단계] cve_info_status 컬럼 존재 여부 확인", 'info')
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s
            AND TABLE_NAME = 'Github_CVE_Info'
            AND COLUMN_NAME = 'cve_info_status'
        """, (config['database']['database'],))
        
        result = cursor.fetchone()
        column_exists = result['count'] > 0
        
        if column_exists:
            log_print("  → cve_info_status 컬럼이 이미 존재합니다", 'info')
        else:
            # 2단계: 컬럼 추가
            log_print("[2단계] cve_info_status 컬럼 추가 중...", 'info')
            cursor.execute("""
                ALTER TABLE Github_CVE_Info
                ADD COLUMN cve_info_status VARCHAR(10) DEFAULT 'N'
            """)
            conn.commit()
            log_print("  → cve_info_status 컬럼 추가 완료!", 'info')
        
        # 3단계: 기존 데이터 개수 확인
        log_print("[3단계] 기존 데이터 확인", 'info')
        cursor.execute("SELECT COUNT(*) as total FROM Github_CVE_Info")
        total_count = cursor.fetchone()['total']
        log_print(f"  → 총 {total_count}개의 레코드 발견", 'info')
        
        # 4단계: CVE_Info 테이블에 있는 CVE 확인
        log_print("[4단계] CVE_Info 테이블의 CVE 목록 조회", 'info')
        cursor.execute("SELECT DISTINCT CVE_Code FROM CVE_Info WHERE CVE_Code IS NOT NULL")
        cve_info_codes = {row['CVE_Code'] for row in cursor.fetchall()}
        log_print(f"  → CVE_Info에 {len(cve_info_codes)}개의 고유 CVE 발견", 'info')
        
        # 5단계: Github_CVE_Info의 cve_info_status 업데이트
        log_print("[5단계] cve_info_status 업데이트 중...", 'info')
        
        # 먼저 모두 'N'으로 초기화
        cursor.execute("UPDATE Github_CVE_Info SET cve_info_status = 'N'")
        
        # CVE_Info에 있는 CVE는 'Y'로 업데이트
        if cve_info_codes:
            # IN 절을 사용하여 한번에 업데이트
            placeholders = ', '.join(['%s'] * len(cve_info_codes))
            update_query = f"""
                UPDATE Github_CVE_Info
                SET cve_info_status = 'Y'
                WHERE cve IN ({placeholders})
            """
            cursor.execute(update_query, tuple(cve_info_codes))
            conn.commit()
            
            # 결과 확인
            cursor.execute("SELECT COUNT(*) as count FROM Github_CVE_Info WHERE cve_info_status = 'Y'")
            updated_count = cursor.fetchone()['count']
            log_print(f"  → {updated_count}개 레코드를 'Y'로 업데이트 완료!", 'info')
            
            cursor.execute("SELECT COUNT(*) as count FROM Github_CVE_Info WHERE cve_info_status = 'N'")
            pending_count = cursor.fetchone()['count']
            log_print(f"  → {pending_count}개 레코드는 'N' 상태 (CVE Info 수집 필요)", 'info')
        else:
            log_print("  → CVE_Info 테이블이 비어있어 모두 'N' 상태로 유지", 'warning')
        
        # 6단계: 결과 샘플 출력
        log_print("[6단계] 업데이트 결과 샘플 (최근 10개)", 'info')
        cursor.execute("""
            SELECT id, cve, title, cve_info_status
            FROM Github_CVE_Info
            ORDER BY id DESC
            LIMIT 10
        """)
        
        for row in cursor.fetchall():
            status_icon = "✅" if row['cve_info_status'] == 'Y' else "❌"
            log_print(f"  {status_icon} ID:{row['id']} | {row['cve']} | {row['cve_info_status']} | {row['title'][:50]}", 'info')
        
        log_print("=" * 80, 'info')
        log_print("✅ cve_info_status 업데이트 완료!", 'info')
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

