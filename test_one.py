"""
단일 CVE 처리 테스트 스크립트
"""
import json
from datetime import datetime

from logger import setup_logger, log_print
from db_manager import get_db_connection, create_table, insert_cve_data, get_cve_count
from translator import translate_with_fallback
from file_manager import download_and_extract_zip, get_next_index


def main():
    """테스트 실행"""
    # 로거 설정
    setup_logger()
    log_print("=" * 80, 'info')
    log_print("단일 CVE 처리 테스트", 'info')
    log_print("=" * 80, 'info')
    
    # 설정 로드
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # DB 연결
    conn = get_db_connection(config)
    if conn is None:
        log_print("[종료] 데이터베이스 연결 실패", 'error')
        return
    
    # 테이블 생성
    create_table(conn)
    
    # 테스트 데이터
    test_repo = {
        'created_at': '2025-01-01T00:00:00Z',
        'html_url': 'https://github.com/test/test-cve',
        'title': 'test/test-cve',
        'owner': 'test',
        'cve_code': 'CVE-2025-12345',
        'readme': 'This is a test README for CVE-2025-12345',
        'download_path': 'CVE/CVE-2025-12345'
    }
    
    cve_code = test_repo['cve_code']
    
    # CVE 개수 확인
    current_count = get_cve_count(conn, cve_code)
    log_print(f"현재 {cve_code} 개수: {current_count}", 'info')
    
    if current_count >= 5:
        log_print(f"{cve_code}는 이미 5개가 저장되어 있습니다.", 'warning')
        conn.close()
        return
    
    # README 번역
    log_print("README 번역 중...", 'info')
    trans_msg = translate_with_fallback(test_repo['readme'])
    log_print(f"번역 결과: {trans_msg[:100]}...", 'info')
    
    # 다음 인덱스 확인
    next_index = get_next_index(cve_code, config['paths']['cve_folder'])
    if next_index is None:
        next_index = current_count + 1
    log_print(f"다음 인덱스: {next_index}", 'info')
    
    # ZIP 다운로드
    log_print("ZIP 다운로드 시도...", 'info')
    download_path = download_and_extract_zip(
        test_repo['html_url'],
        cve_code,
        next_index,
        config['paths']['cve_folder']
    )
    
    if download_path:
        log_print(f"다운로드 성공: {download_path}", 'info')
    else:
        log_print("다운로드 실패", 'warning')
        download_path = "다운로드 실패"
    
    # DB 저장 데이터 구성
    db_data = {
        'date': test_repo['created_at'],
        'collect_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'link': test_repo['html_url'],
        'title': test_repo['title'],
        'writer': test_repo['owner'],
        'cve': cve_code,
        'readme': test_repo['readme'],
        'download_path': download_path,
        'status': 'N',
        'trans_msg': trans_msg,
        'AI_chk': 'N'
    }
    
    # DB에 삽입
    log_print("DB에 데이터 삽입 시도...", 'info')
    success = insert_cve_data(conn, db_data)
    
    if success:
        log_print(f"[성공] {cve_code} 데이터가 DB에 저장되었습니다!", 'info')
        
        # 저장 후 개수 확인
        new_count = get_cve_count(conn, cve_code)
        log_print(f"저장 후 {cve_code} 개수: {new_count}", 'info')
    else:
        log_print("[실패] 데이터 저장 실패", 'error')
    
    # DB 연결 종료
    conn.close()
    log_print("=" * 80, 'info')
    log_print("테스트 완료", 'info')
    log_print("=" * 80, 'info')


if __name__ == '__main__':
    main()

