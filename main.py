"""
CVE Bot 메인 실행 파일
GitHub에서 CVE 정보를 수집하고 DB에 저장
"""
import json
import os
import time
from datetime import datetime

from logger import setup_logger, log_print
from db_manager import (get_db_connection, create_table, create_cve_info_table,
                         create_ai_analysis_table, create_integrated_table,
                         insert_cve_data, get_cve_count, check_cve_info_exists, 
                         insert_cve_info, get_cve_info_pending, update_cve_info_status,
                         insert_integrated_data)
from github_collector import GitHubCollector
from translator import translate_with_fallback
from file_manager import download_and_extract_zip, get_next_index
from cve_info_collector import get_cve_info, save_cve_info_to_file
from config_loader import ConfigLoader


def load_config(config_path=None):
    """
    설정 파일 로드 (환경별 자동 선택)
    
    Args:
        config_path: 설정 파일 경로 (None이면 환경 변수에 따라 자동 선택)
    
    Returns:
        dict: 설정 딕셔너리
    """
    config = ConfigLoader.load_config(config_path=config_path)
    if config:
        log_print(f"[설정] 환경: {config.get('_env', 'UNKNOWN')}", 'info')
    return config


def save_config(config, config_path='config.json'):
    """
    설정 파일 저장
    
    Args:
        config: 설정 딕셔너리
        config_path: 설정 파일 경로
    """
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4, ensure_ascii=False)
        log_print("[설정] 설정 파일 저장 성공", 'debug')
    except Exception as e:
        log_print(f"[설정] 저장 오류: {e}", 'error')


def get_max_poc_limit(config, cve_code):
    """
    특정 CVE에 대한 최대 POC 수집 개수 반환
    
    Args:
        config: 설정 딕셔너리
        cve_code: CVE 코드
    
    Returns:
        int: 최대 수집 개수 (특정 CVE 설정이 있으면 해당 값, 없으면 기본값)
    """
    # 특정 CVE에 대한 개별 제한이 있는지 확인
    cve_specific_limits = config.get('collection', {}).get('cve_specific_limits', {})
    
    if cve_code in cve_specific_limits:
        limit = cve_specific_limits[cve_code]
        log_print(f"[제한 설정] {cve_code}: 특정 제한 적용 ({limit}개)", 'debug')
        return limit
    
    # 기본값 반환
    default_limit = config.get('collection', {}).get('max_cve_per_item', 5)
    return default_limit


def process_repository(repo_info, conn, config):
    """
    저장소 정보 처리 (DB 저장 및 파일 다운로드)
    
    Args:
        repo_info: 저장소 정보 딕셔너리
        conn: DB 연결 객체
        config: 설정 딕셔너리
    
    Returns:
        bool: 성공 여부
    """
    # CVE 코드 추출
    cve_code = repo_info.get('cve_code')
    
    if not cve_code:
        # 조용히 스킵 (로그 출력 안함)
        return False
    
    # DB에서 해당 CVE 개수 확인 (DB만 확인!)
    current_count = get_cve_count(conn, cve_code)
    
    # CVE별 최대 수집 개수 가져오기 (특정 CVE 설정 우선, 없으면 기본값)
    max_limit = get_max_poc_limit(config, cve_code)
    
    if current_count >= max_limit:
        # 조용히 스킵 (로그 출력 안함)
        return False
    
    # 파일 시스템에서 다음 인덱스 확인
    next_index = get_next_index(cve_code, config['paths']['cve_folder'])
    if next_index is None:
        next_index = current_count + 1
    
    # README 번역
    log_print(f"[번역] {cve_code} - README 번역 중...", 'info')
    trans_msg = translate_with_fallback(repo_info.get('readme', ''))
    
    # ZIP 파일 다운로드 및 압축 해제
    download_path = download_and_extract_zip(
        repo_info.get('html_url'),
        cve_code,
        next_index,
        config['paths']['cve_folder']
    )
    
    if download_path is None:
        download_path = "다운로드 실패"
    
    # CVE 정보 수집 및 저장
    process_cve_info(conn, cve_code, download_path)
    
    # CVE 년도 확인 (현재 년도와 일치하는 것만 status를 'N'으로 설정, 나머지는 'Y')
    # export API는 status='N'인 데이터만 조회하므로, 현재 년도는 'N'으로 설정하여 export 가능하게 함
    current_year = str(datetime.now().year)
    cve_year = cve_code.split('-')[1] if '-' in cve_code else None
    initial_status = 'N' if cve_year == current_year else 'Y'
    
    # DB 저장 데이터 구성
    db_data = {
        'date': repo_info.get('created_at', ''),
        'collect_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'link': repo_info.get('html_url', ''),
        'title': repo_info.get('title', ''),
        'writer': repo_info.get('owner', ''),
        'cve': cve_code,
        'readme': repo_info.get('readme', ''),
        'download_path': download_path,
        'status': initial_status,
        'trans_msg': trans_msg,
        'AI_chk': 'N'
    }
    
    # DB에 삽입
    success = insert_cve_data(conn, db_data)
    
    if success:
        current_year = str(datetime.now().year)
        status_msg = f"신규({current_year})" if initial_status == 'N' else "과거(자동완료)"
        max_limit = get_max_poc_limit(config, cve_code)
        log_print(f"✅ [새로 수집] {cve_code} ({current_count + 1}/{max_limit}) [{status_msg}] - {repo_info.get('title')}", 'info')
    
    return success


def process_cve_info(conn, cve_code, download_path):
    """
    CVE 정보 수집 및 저장
    
    Args:
        conn: DB 연결 객체
        cve_code: CVE 코드
        download_path: ZIP 파일 압축 해제 경로
    """
    # CVE_Info 테이블에 이미 있는지 확인
    existing_cve = check_cve_info_exists(conn, cve_code)
    
    if existing_cve:
        # 이미 있으면 Response_data를 파일로 저장
        log_print(f"[CVE API] {cve_code} 정보가 이미 DB에 존재 - 파일로 저장", 'info')
        if download_path and download_path != "다운로드 실패":
            save_cve_info_to_file(existing_cve['Response_data'], cve_code, download_path)
    else:
        # 없으면 API 호출해서 수집
        log_print(f"[CVE API] {cve_code} 정보 수집 시작", 'info')
        cve_info = get_cve_info(cve_code)
        
        if cve_info:
            # DB에 저장
            insert_cve_info(conn, cve_info)
            
            # 파일로도 저장
            if download_path and download_path != "다운로드 실패":
                save_cve_info_to_file(cve_info['Response_data'], cve_code, download_path)


def collect_missing_cve_info(conn, config):
    """
    cve_info_status가 'N'인 CVE들의 정보를 수집
    
    Args:
        conn: DB 연결 객체
        config: 설정 딕셔너리
    
    Returns:
        int: 수집된 CVE 개수
    """
    log_print("=" * 80, 'info')
    log_print("[CVE Info 자동 수집] 시작", 'info')
    log_print("=" * 80, 'info')
    
    pending_cves = get_cve_info_pending(conn)
    
    if not pending_cves:
        log_print("[CVE Info] 수집할 CVE 없음", 'info')
        return 0
    
    log_print(f"[CVE Info] 수집 대상: {len(pending_cves)}개", 'info')
    
    collected_count = 0
    for item in pending_cves:
        cve_code = item['cve']
        
        # 이미 CVE_Info 테이블에 있는지 확인
        if check_cve_info_exists(conn, cve_code):
            log_print(f"[CVE Info] 이미 존재: {cve_code}", 'debug')
            update_cve_info_status(conn, cve_code)
            collected_count += 1
            continue
        
        # CVE API에서 정보 수집
        log_print(f"[CVE Info] {cve_code} 수집 시작", 'info')
        cve_info = get_cve_info(cve_code)
        
        if cve_info:
            # DB에 저장
            insert_cve_info(conn, cve_info)
            # 상태 업데이트
            update_cve_info_status(conn, cve_code)
            collected_count += 1
            log_print(f"[CVE Info] {cve_code} 수집 완료 ({collected_count}/{len(pending_cves)})", 'info')
            
            # API Rate Limit 고려하여 대기
            time.sleep(1)
        else:
            # 실패해도 상태 업데이트 (무한 재시도 방지)
            update_cve_info_status(conn, cve_code)
            log_print(f"[CVE Info] {cve_code} 수집 실패 - 상태 업데이트됨", 'warning')
    
    log_print("=" * 80, 'info')
    log_print(f"[CVE Info 자동 수집] 완료: {collected_count}/{len(pending_cves)}개 수집", 'info')
    log_print("=" * 80, 'info')
    
    return collected_count


def main():
    """메인 실행 함수"""
    # 로거 설정
    logger = setup_logger()
    log_print("=" * 80, 'info')
    log_print("CVE 수집 봇 시작", 'info')
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
    
    # 테이블 생성
    create_table(conn)
    create_cve_info_table(conn)
    create_ai_analysis_table(conn)
    create_integrated_table(conn)
    
    # 설정값 가져오기
    current_year = datetime.now().year
    max_pages = config['github']['max_pages']
    last_collection_time = config['collection']['last_collection_time']
    
    # 년도 설정 처리
    target_years_config = config['github'].get('target_years', 'current')
    if target_years_config == 'current':
        target_years = [current_year]
    elif isinstance(target_years_config, list):
        target_years = target_years_config
    else:
        target_years = [current_year]
    
    # 정렬 옵션
    sort_by = config['github'].get('sort_by', 'updated')
    sort_order = config['github'].get('sort_order', 'desc')
    
    log_print(f"대상 년도: {target_years}", 'info')
    log_print(f"정렬 기준: {sort_by} {sort_order}", 'info')
    log_print(f"수집 페이지 수: {max_pages}", 'info')
    log_print(f"마지막 수집 시간: {last_collection_time or '없음'}", 'info')
    
    try:
        # GitHub Collector 초기화 (토큰 리스트 지원)
        github_token = config['github'].get('token')
        github_tokens = config['github'].get('tokens', [])
        
        # tokens 리스트가 있으면 사용, 없으면 token 단일 값을 리스트로 변환
        if github_tokens:
            tokens = github_tokens
        elif github_token:
            tokens = [github_token]
        else:
            log_print("[설정 오류] GitHub 토큰이 설정되지 않았습니다", 'error')
            return
        
        log_print(f"[토큰 설정] 사용 가능한 토큰: {len(tokens)}개", 'info')
        collector = GitHubCollector(tokens)
        
        # Rate Limit 확인
        rate_limit_info = collector.check_rate_limit()
        
        if rate_limit_info and rate_limit_info['search_remaining'] < 10:
            log_print(f"[Rate Limit] 검색 API 사용 가능 횟수가 부족합니다: {rate_limit_info['search_remaining']}", 'warning')
            wait_minutes = config['collection']['rate_limit_wait_minutes']
            log_print(f"[대기] {wait_minutes}분 대기 후 재시도합니다...", 'info')
            time.sleep(wait_minutes * 60)
        
        # 여러 년도에 대해 수집
        total_processed = 0
        total_skipped = 0
        
        for year in target_years:
            log_print("=" * 80, 'info')
            log_print(f"[년도별 수집] CVE-{year} 수집 시작", 'info')
            log_print("=" * 80, 'info')
            
            processed_count = 0
            skipped_count = 0
            
            # Generator를 사용하여 하나씩 수집하면서 바로 처리
            for repo in collector.collect_cve_repositories(year, max_pages, last_collection_time, sort_by, sort_order):
                cve_code = repo.get('cve_code')
                link = repo.get('html_url')
                
                if not cve_code:
                    # 조용히 스킵 (로그 출력 안함)
                    skipped_count += 1
                    continue
                
                # 동일한 GitHub 링크가 이미 DB에 있는지 확인
                from db_manager import check_duplicate
                if check_duplicate(conn, link):
                    log_print(f"⏭️ [중복 스킵] {cve_code} - 이미 DB에 존재", 'info')
                    skipped_count += 1
                    continue
                
                # 해당 CVE의 현재 저장 개수 확인 (DB에서만 확인!)
                current_count = get_cve_count(conn, cve_code)
                
                # CVE별 최대 수집 개수 가져오기 (특정 CVE 설정 우선, 없으면 기본값)
                max_limit = get_max_poc_limit(config, cve_code)
                
                if current_count >= max_limit:
                    log_print(f"⏭️ [최대 도달] {cve_code} - 이미 {current_count}/{max_limit}개 수집됨", 'info')
                    skipped_count += 1
                    continue
                
                # 저장소 처리 (바로 DB 저장!)
                success = process_repository(repo, conn, config)
                
                if success:
                    processed_count += 1
                    log_print(f"📊 [진행상황 {year}] ✅ 수집: {processed_count}개 | ⏭️ 건너뜀: {skipped_count}개", 'info')
                else:
                    skipped_count += 1
            
            total_processed += processed_count
            total_skipped += skipped_count
            
            log_print("=" * 80, 'info')
            log_print(f"[년도별 수집] CVE-{year} 완료: 처리 {processed_count}개, 건너뜀 {skipped_count}개", 'info')
            log_print("=" * 80, 'info')
        
        # CVE Info 자동 수집 (설정에서 활성화된 경우)
        if config['collection'].get('auto_collect_cve_info', True):
            collect_missing_cve_info(conn, config)
        
        # 통합 테이블 자동 생성 (설정에서 활성화된 경우)
        if config['collection'].get('auto_create_integrated_data', True):
            log_print("=" * 80, 'info')
            log_print("[통합 데이터] 생성 시작", 'info')
            log_print("=" * 80, 'info')
            integrated_count = insert_integrated_data(conn)
            log_print("=" * 80, 'info')
            log_print(f"[통합 데이터] 완료: {integrated_count}개 레코드 생성", 'info')
            log_print("=" * 80, 'info')
        
        # 마지막 수집 시간 업데이트
        config['collection']['last_collection_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        save_config(config)
        
        log_print("=" * 80, 'info')
        log_print(f"전체 수집 완료: 처리 {total_processed}개, 건너뜀 {total_skipped}개", 'info')
        log_print(f"마지막 수집 시간이 업데이트되었습니다: {config['collection']['last_collection_time']}", 'info')
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
    while True :
        main()
        time.sleep(600)


