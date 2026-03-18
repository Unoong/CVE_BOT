"""
CVE POC AI 분석 실행 스크립트
병렬 처리로 빠른 분석 (최대 5개 동시 실행)
"""
import json
import time
import logging
import os
import shutil
import zipfile
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

from db_manager import (get_db_connection, create_ai_analysis_table,
                         get_unanalyzed_cves, create_quota_management_table)
from ai_analyzer import (analyze_cve_with_gemini, save_analysis_to_db, 
                          update_ai_check_status, update_cve_info_product)
from gemini_account_manager import (set_db_connection, log_quota_event,
                                    get_current_account_email,
                                    mark_account_exhausted_by_email,
                                    get_next_available_account_email,
                                    switch_to_account_by_email,
                                    extract_account_from_zip)

# 설정 파일 로드
CONFIG_FILE = 'ai_analysis_config.json'
def load_config():
    """설정 파일 로드"""
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        # 기본 설정 (병렬 처리 OFF)
        return {
            "parallel_processing": {"enabled": False, "max_workers": 1},
            "api_limits": {"requests_per_minute": 60, "min_request_interval_seconds": 1.5, "timeout_seconds": 300},
            "retry": {"max_retries": 2, "retry_delay_seconds": 3}
        }

# 설정 로드
config_data = load_config()
PARALLEL_ENABLED = config_data['parallel_processing']['enabled']
MAX_WORKERS = config_data['parallel_processing']['max_workers'] if PARALLEL_ENABLED else 1
REQUESTS_PER_MINUTE = config_data['api_limits']['requests_per_minute']
MIN_REQUEST_INTERVAL = config_data['api_limits']['min_request_interval_seconds']
MAX_RETRIES = config_data['retry']['max_retries']
RETRY_DELAY = config_data['retry']['retry_delay_seconds']
MAX_POC_SIZE_MB = config_data.get('poc_limits', {}).get('max_folder_size_mb', 1.0)  # POC 폴더 크기 제한

thread_lock = threading.Lock()  # DB 작업 동기화용
last_request_time = None  # 마지막 요청 시간 추적
quota_exceeded_flag = threading.Event()  # 할당량 초과 플래그 (전역)

# 429 에러 카운터 (계정별)
account_429_counters = {}

# 현재 실행 중 계정 파일 (gemini-quota 패널 '오늘 사용' 표시용)
CURRENT_RUNNING_ACCOUNT_FILE = Path(__file__).resolve().parent / "logs" / "current_running_account.json"


def write_current_running_account(email):
    """run_ai_analysis가 사용 중인 계정을 파일에 기록 (gemini-quota 패널에서 '오늘 사용' 표시용)"""
    if not email:
        return
    try:
        CURRENT_RUNNING_ACCOUNT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CURRENT_RUNNING_ACCOUNT_FILE, 'w', encoding='utf-8') as f:
            json.dump({"email": email, "updated_at": datetime.now().isoformat()}, f, ensure_ascii=False)
    except Exception as e:
        logger.debug(f"[현재 계정 파일] 기록 실패: {e}")


def clear_current_running_account():
    """프로세스 종료 시 파일 삭제"""
    try:
        if CURRENT_RUNNING_ACCOUNT_FILE.exists():
            CURRENT_RUNNING_ACCOUNT_FILE.unlink()
    except Exception:
        pass


def manage_gemini_folders():
    """
    Gemini 폴더 관리: 기존 폴더 삭제 후 계정 폴더 복원
    """
    try:
        user_profile = os.environ.get('USERPROFILE', '')
        gemini_folder = os.path.join(user_profile, '.gemini')
        zip_file = os.path.join(user_profile, 'gemini_account_file.zip')
        
        # 1. 기존 .gemini 폴더 삭제
        if os.path.exists(gemini_folder):
            shutil.rmtree(gemini_folder)
            logger.info(f"[Gemini 폴더] 기존 폴더 삭제: {gemini_folder}")
        
        # 2. 압축 파일이 있으면 압축 해제
        if os.path.exists(zip_file):
            with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                # 임시 폴더에 압축 해제
                temp_folder = os.path.join(user_profile, 'temp_gemini')
                if os.path.exists(temp_folder):
                    shutil.rmtree(temp_folder)
                os.makedirs(temp_folder)
                
                zip_ref.extractall(temp_folder)
                logger.info(f"[Gemini 폴더] 압축 해제 완료: {zip_file}")
                
                # 3. .gemini_{계정명} 폴더들을 .gemini로 변경
                for item in os.listdir(temp_folder):
                    item_path = os.path.join(temp_folder, item)
                    if os.path.isdir(item_path) and item.startswith('.gemini_'):
                        # .gemini_{계정명} -> .gemini로 변경
                        new_name = '.gemini'
                        new_path = os.path.join(user_profile, new_name)
                        
                        if os.path.exists(new_path):
                            shutil.rmtree(new_path)
                        
                        shutil.move(item_path, new_path)
                        logger.info(f"[Gemini 폴더] 계정 폴더 복원: {item} -> {new_name}")
                        break  # 첫 번째 계정 폴더만 사용
                
                # 임시 폴더 정리
                shutil.rmtree(temp_folder)
                logger.info("[Gemini 폴더] 계정 폴더 복원 완료")
        else:
            logger.warning(f"[Gemini 폴더] 압축 파일을 찾을 수 없습니다: {zip_file}")
            
    except Exception as e:
        logger.error(f"[Gemini 폴더 관리 오류] {e}")


def check_all_accounts_exhausted():
    """
    모든 계정이 일일 할당량을 소진했는지 확인
    
    Returns:
        bool: 모든 계정이 소진되었으면 True, 아니면 False
    """
    try:
        config = load_config()
        if not config:
            return False
            
        conn = get_db_connection(config)
        if not conn:
            return False
            
        cursor = conn.cursor()
        
        # 오늘 날짜의 모든 계정 상태 확인 (gemini_quota_usage: is_quota_exceeded, usage_date)
        today = datetime.now().date()
        cursor.execute('''
            SELECT COUNT(*) as total_accounts,
                   SUM(CASE WHEN is_quota_exceeded = 1 THEN 1 ELSE 0 END) as exhausted_accounts
            FROM gemini_quota_usage 
            WHERE usage_date = %s
        ''', (today,))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result:
            total_accounts, exhausted_accounts = result
            logger.info(f"[계정 상태] 총 계정: {total_accounts}, 소진된 계정: {exhausted_accounts}")
            
            # 모든 계정이 소진되었는지 확인
            if total_accounts > 0 and exhausted_accounts >= total_accounts:
                logger.warning(f"[계정 상태] ⚠️ 모든 계정이 일일 할당량을 소진했습니다!")
                return True
            else:
                logger.info(f"[계정 상태] ✅ 사용 가능한 계정이 있습니다.")
                return False
        else:
            logger.info(f"[계정 상태] 오늘 사용된 계정이 없습니다.")
            return False
            
    except Exception as e:
        logger.error(f"[계정 상태 확인 오류] {e}")
        return False


def wait_until_next_day():
    """
    다음 날까지 대기하는 함수
    """
    now = datetime.now()
    tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    wait_seconds = (tomorrow - now).total_seconds()
    
    logger.info("="*80)
    logger.info("🛑 모든 계정이 일일 할당량을 소진했습니다!")
    logger.info("="*80)
    logger.info(f"⏰ 현재 시간: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"🔄 다음 날까지 대기: {tomorrow.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"⏳ 대기 시간: {wait_seconds/3600:.1f}시간")
    logger.info("="*80)
    logger.info("💡 다음 날이 되면 모든 계정의 할당량이 초기화됩니다.")
    logger.info("💡 중단하려면 Ctrl+C를 누르세요.")
    logger.info("="*80)
    
    try:
        time.sleep(wait_seconds)
        logger.info("="*80)
        logger.info("🎉 새로운 날이 시작되었습니다! 할당량이 초기화되었습니다.")
        logger.info("="*80)
    except KeyboardInterrupt:
        logger.info("\n[중단] 사용자에 의해 중단되었습니다.")
        raise


def handle_429_error(conn, account_email):
    """
    429 에러 처리: 3번 연속 발생 시 계정 교체
    
    Args:
        conn: 데이터베이스 연결 객체
        account_email: 현재 계정 이메일
    
    Returns:
        str: 새로운 계정 이메일 또는 None
    """
    try:
        # 429 에러 카운터 증가
        if account_email not in account_429_counters:
            account_429_counters[account_email] = 0
        account_429_counters[account_email] += 1
        
        # DB에 429 에러 기록
        from db_manager import record_429_error, check_quota_exhausted, mark_account_exhausted
        record_429_error(conn, account_email)
        
        logger.info(f"[429 에러] {account_email} - {account_429_counters[account_email]}번째 발생")
        
        # 3번 연속 429 에러 발생 시
        if account_429_counters[account_email] >= 3:
            logger.warning(f"[429 에러] {account_email} 계정 할당량 소진 - 3번 연속 발생, 10분 대기 후 계정 교체")
            
            # 10분 대기 (계정이 사용 중이므로)
            logger.info("[429 에러] 계정이 사용 중이므로 10분 대기 중...")
            time.sleep(600)  # 10분 = 600초
            
            # 다음 사용 가능한 계정으로 전환
            try:
                logger.info(f"[계정 전환] 다음 사용 가능한 계정 찾기 시작...")
                next_account = get_next_available_account_email()
                
                if not next_account:
                    logger.error("[계정 전환] ❌ 사용 가능한 계정이 없습니다")
                    logger.error("[계정 전환] 모든 계정이 일일 할당량을 소진했습니다")
                    return None
                
                logger.info(f"[계정 전환] 다음 계정 발견: {next_account}")
                logger.info(f"[계정 전환] {account_email} -> {next_account} 전환 시도...")
                
                success = switch_to_account_by_email(next_account)
                
                if success:
                    logger.info(f"[계정 전환] ✅ 성공: {account_email} -> {next_account}")
                    # 계정 전환 완료 후 이전 계정을 할당량 소진으로 표시
                    mark_account_exhausted_by_email(account_email)
                    
                    # 카운터 리셋
                    account_429_counters[account_email] = 0
                    
                    # 전환 성공 시 3초 대기 (인증 적용 시간)
                    logger.info("[계정 전환] 인증 적용 대기 중... (3초)")
                    time.sleep(3)
                    
                    return next_account
                else:
                    logger.error(f"[계정 전환] ❌ {next_account}로 전환 실패")
                    logger.error("[계정 전환] 확인사항:")
                    logger.error("  1. 계정 폴더(.gemini_*)가 있는지 확인")
                    logger.error("  2. gemini_account_file.zip에서 압축 해제 확인")
                    logger.error("  3. 폴더 권한 확인")
                    return None
                    
            except Exception as e:
                logger.error(f"[계정 전환] ❌ 예외 발생: {e}")
                import traceback
                logger.error(traceback.format_exc())
                return None
        else:
            # 3번 미만이면 기존 대기 시간 유지
            logger.info(f"[429 에러] {account_429_counters[account_email]}번째 - 기존 대기 시간 유지")
            return account_email
            
    except Exception as e:
        logger.error(f"[429 에러 처리 오류] {e}")
        return account_email

def _setup_ai_analysis_logger() -> logging.Logger:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(base_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    logger = logging.getLogger('AI_Analysis_Runner')
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    file_handler = TimedRotatingFileHandler(
        os.path.join(logs_dir, 'ai_analysis.log'),
        when='midnight',
        interval=1,
        backupCount=14,
        encoding='utf-8',
        utc=False
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.propagate = False
    return logger

logger = _setup_ai_analysis_logger()


def update_dashboard_stats(conn):
    """
    대시보드 통계 업데이트 (AI 분석 완료 시 호출)
    """
    try:
        cursor = conn.cursor()
        today = datetime.now().date()
        
        # 오늘 날짜의 통계 업데이트
        cursor.execute('''
            INSERT INTO dashboard_stats_daily 
            (stat_date, total_cves, total_pocs, analyzed_pocs, unique_analyzed_pocs, pending_pocs)
            SELECT 
                %s as stat_date,
                (SELECT COUNT(*) FROM CVE_Info) as total_cves,
                (SELECT COUNT(*) FROM Github_CVE_Info) as total_pocs,
                (SELECT COUNT(*) FROM Github_CVE_Info WHERE AI_chk = 'Y') as analyzed_pocs,
                (SELECT COUNT(DISTINCT cve) FROM Github_CVE_Info WHERE AI_chk = 'Y') as unique_analyzed_pocs,
                (SELECT COUNT(*) FROM Github_CVE_Info WHERE AI_chk = 'N') as pending_pocs
            ON DUPLICATE KEY UPDATE
                total_cves = VALUES(total_cves),
                total_pocs = VALUES(total_pocs),
                analyzed_pocs = VALUES(analyzed_pocs),
                unique_analyzed_pocs = VALUES(unique_analyzed_pocs),
                pending_pocs = VALUES(pending_pocs),
                updated_at = NOW()
        ''', (today,))
        
        conn.commit()
        cursor.close()
        logger.debug(f"[대시보드] 통계 업데이트 완료: {today}")
    except Exception as e:
        logger.warning(f"[대시보드] 통계 업데이트 실패: {e}")
        # 통계 업데이트 실패해도 AI 분석은 계속 진행


def load_config():
    """설정 파일 로드 (DB 설정 포함 - config.json)"""
    try:
        config_path = Path(__file__).resolve().parent / 'config.json'
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[설정] 설정 파일 로드 실패: {e}")
        return None


def process_one_cve_thread_safe(cve_data, current_account_index, config, task_num=0):
    """
    단일 CVE 분석 처리 (스레드 안전 버전)
    각 스레드가 독립적인 DB 연결을 사용

    Args:
        cve_data: CVE 데이터 딕셔너리
        current_account_index: 현재 사용 중인 계정 인덱스
        config: DB 설정
        task_num: 작업 번호 (병렬 출력용)

    Returns:
        tuple: (result_type, cve_code, link)
    """
    link = cve_data['link']
    download_path = cve_data['download_path']
    cve_code = cve_data['cve']
    title = cve_data['title']

    logger.info(f"[Task #{task_num}] 🚀 시작: {cve_code} - {title[:50]}...")
    logger.info(f"[Task #{task_num}] 경로: {download_path}")

    # 스레드별 독립적인 DB 연결
    conn = get_db_connection(config)
    if not conn:
        logger.error(f"[Task #{task_num}] ❌ DB 연결 실패: {cve_code}")
        return ('failed', cve_code, link)

    try:
        # 다운로드 경로 확인
        if download_path == "다운로드 실패" or not download_path:
            logger.warning(f"[Task #{task_num}] ⏭️  건너뜀: {cve_code} (다운로드 실패) - AI_chk 유지하여 재시도 가능")
            with thread_lock:
                log_quota_event(current_account_index, 'failed', cve_code, link, '다운로드 실패', conn=conn)
            return ('failed', cve_code, link)

        # 경로 존재 확인
        path = Path(download_path)
        if not path.exists():
            logger.warning(f"[Task #{task_num}] ⏭️  건너뜀: {cve_code} (경로 없음) - AI_chk 유지하여 재시도 가능")
            with thread_lock:
                log_quota_event(current_account_index, 'failed', cve_code, link, '경로 없음', conn=conn)
            return ('failed', cve_code, link)

        # POC 폴더 크기 체크 (설정값 제한)
        try:
            folder_size = sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
            folder_size_mb = folder_size / (1024 * 1024)  # MB 단위로 변환
            
            if folder_size_mb > MAX_POC_SIZE_MB:  # 설정값 초과 - 재시도 불가(용량 고정)이므로 AI_chk='Y' 처리
                logger.warning(f"[Task #{task_num}] ⏭️  건너뜀: {cve_code} (POC 용량 초과: {folder_size_mb:.2f}MB > {MAX_POC_SIZE_MB}MB)")
                with thread_lock:
                    update_ai_check_status(conn, link, 'Y')
                    log_quota_event(current_account_index, 'failed', cve_code, link, f'POC 용량 초과 ({folder_size_mb:.2f}MB > {MAX_POC_SIZE_MB}MB)', conn=conn)
                return ('failed', cve_code, link)
            else:
                logger.info(f"[Task #{task_num}] 📁 POC 폴더 크기: {folder_size_mb:.2f}MB (정상, 제한: {MAX_POC_SIZE_MB}MB)")
        except Exception as e:
            logger.warning(f"[Task #{task_num}] ⚠️  폴더 크기 체크 실패: {cve_code} - {e}")
            # 크기 체크 실패해도 분석 진행

        # Gemini 분석 (재시도 로직 + RPM 제한 포함)
        logger.info(f"[Task #{task_num}] 🔄 분석 중: {cve_code}...")
        
        max_retries = MAX_RETRIES
        analysis_result = None
        current_account = get_current_account_email()
        
        # 할당량 초과 플래그 체크
        if quota_exceeded_flag.is_set():
            logger.warning(f"[Task #{task_num}] 🛑 할당량 초과 플래그 감지 - 작업 중단")
            return ('quota_exceeded', cve_code, link)
        
        # RPM 제한 준수 (분당 60개 = 1초당 1개)
        global last_request_time
        with thread_lock:
            current_time = time.time()
            if last_request_time is not None:
                elapsed = current_time - last_request_time
                if elapsed < MIN_REQUEST_INTERVAL:
                    wait_time = MIN_REQUEST_INTERVAL - elapsed
                    logger.debug(f"[Task #{task_num}] ⏱️ RPM 제한 대기: {wait_time:.2f}초")
                    time.sleep(wait_time)
            last_request_time = time.time()
        
        analysis_result = analyze_cve_with_gemini(download_path)
        
        # 429 에러 처리 (실패로 기록하고 3번 연속 발생 시 계정 교체)
        if isinstance(analysis_result, dict) and analysis_result.get('error') == 'quota_exceeded':
            logger.error(f"[Task #{task_num}] ⚠️ 429 에러 감지 - 실패로 기록")
            
            # 429 에러를 실패로 기록
            with thread_lock:
                log_quota_event(current_account_index, 'quota_exceeded', cve_code, link, 
                               f"429 Quota Exceeded: {analysis_result.get('message', '')}", conn=conn)
            
            # 429 에러 처리 (3번 카운트 후 계정 교체)
            new_account = handle_429_error(conn, current_account)
            
            if new_account and new_account != current_account:
                # 계정이 교체된 경우
                logger.info(f"[Task #{task_num}] 🔄 계정 교체 완료: {current_account} -> {new_account}")
                current_account = new_account
                # gemini-quota 패널 '오늘 사용' 즉시 반영
                write_current_running_account(new_account)
                # 계정 교체 후 재시도 없음 (다음 CVE 처리)
                return ('quota_exceeded_skip', cve_code, link)
            elif new_account == current_account:
                # 3번 미만이면 해당 CVE 건너뛰기
                logger.info(f"[Task #{task_num}] ⏸️ 429 에러 {account_429_counters.get(current_account, 0)}번째")
                return ('quota_exceeded_skip', cve_code, link)
            else:
                # 사용 가능한 계정이 없는 경우
                logger.error(f"[Task #{task_num}] ❌ 사용 가능한 계정 없음 - 작업 중단")
                return ('quota_exceeded_skip', cve_code, link)
        
        # Rate Limit 처리 (재시도 없음)
        if isinstance(analysis_result, dict) and analysis_result.get('error') == 'rate_limit':
            logger.error(f"[Task #{task_num}] ⏸️ Rate Limit")
            with thread_lock:
                log_quota_event(current_account_index, 'rate_limit', cve_code, link, conn=conn)
            return ('rate_limit', cve_code, link)
        
        # 일반 실패 처리 (재시도 없음)
        if isinstance(analysis_result, dict) and analysis_result.get('error') == 'failed':
            error_msg = analysis_result.get('message', 'Unknown error')
            logger.error(f"[Task #{task_num}] ❌ 분석 실패: {cve_code} - {error_msg[:100]}")
            with thread_lock:
                log_quota_event(current_account_index, 'failed', cve_code, link, error_msg, conn=conn)
            return ('failed', cve_code, link)
        
        # None 결과 처리 (재시도 없음)
        if analysis_result is None:
            logger.error(f"[Task #{task_num}] ❌ 분석 결과 없음: {cve_code}")
            with thread_lock:
                log_quota_event(current_account_index, 'failed', cve_code, link, '분석 결과 없음', conn=conn)
            return ('failed', cve_code, link)

        # 할당량 관련 의심 오류 체크 - 해당 CVE만 건너뛰고 진행
        if isinstance(analysis_result, dict) and analysis_result.get('error') == 'quota_suspicious':
            logger.warning(f"[Task #{task_num}] ⚠️  할당량 의심 - 해당 CVE 건너뛰고 다음 CVE 진행")
            with thread_lock:
                log_quota_event(current_account_index, 'quota_exceeded', cve_code, link, '할당량 의심', conn=conn)
            return ('quota_exceeded_skip', cve_code, link)

        # AI 분석 결과 JSON 로그 출력 (ai_analysis.log에 기록)
        try:
            json_preview = json.dumps(analysis_result, indent=2, ensure_ascii=False)
            preview_len = min(len(json_preview), 3000)
            logger.info(f"[Task #{task_num}] 📋 AI 분석 결과 (JSON):\n{json_preview[:preview_len]}{'...(생략)' if len(json_preview) > preview_len else ''}")
        except Exception:
            logger.info(f"[Task #{task_num}] 📋 AI 분석 결과 키: {list(analysis_result.keys()) if isinstance(analysis_result, dict) else type(analysis_result)}")

        # DB 저장
        logger.info(f"[Task #{task_num}] 💾 DB 저장 중: {cve_code}...")
        with thread_lock:
            success = save_analysis_to_db(conn, link, download_path, analysis_result)

        if success:
            with thread_lock:
                update_ai_check_status(conn, link, 'Y')
                # 일별 분석 건수 업데이트 (gemini_quota_usage 테이블 사용)
                # log_quota_event에서 자동으로 처리됨
                # 429 에러 카운터 리     셋 (성공 시)
                if current_account in account_429_counters:
                    account_429_counters[current_account] = 0
                # 대시보드 통계 업데이트
                update_dashboard_stats(conn)    
                # 할당량 이벤트 로그 기록
                log_quota_event(current_account_index, 'success', cve_code, link, conn=conn)
            logger.info(f"[현재 계정] {current_account}")
            logger.info(f"[Task #{task_num}] ✅ 완료: {cve_code}")
            return ('success', cve_code, link)
        else:
            logger.info(f"[현재 계정] {current_account}")
            logger.error(f"[Task #{task_num}] ❌ DB 저장 실패: {cve_code}")
            with thread_lock:
                log_quota_event(current_account_index, 'failed', cve_code, link, 'DB 저장 실패', conn=conn)
            return ('failed', cve_code, link)

    finally:
        conn.close()


def process_one_cve(conn, cve_data, current_account_index):
    """
    단일 CVE 분석 처리 (순차 처리용, 하위 호환성)

    Args:
        conn: DB 연결 객체
        cve_data: CVE 데이터 딕셔너리
        current_account_index: 현재 사용 중인 계정 인덱스

    Returns:
        str: 'success', 'rate_limit', 'quota_exceeded', 'failed'
    """
    config = load_config()
    result_type, cve_code, link = process_one_cve_thread_safe(cve_data, current_account_index, config)
    return result_type


def run_analysis_cycle(current_account_index):
    """
    AI 분석 사이클 1회 실행
    
    Args:
        current_account_index: 현재 사용 중인 계정 인덱스
    
    Returns:
        tuple: (quota_exceeded, all_accounts_exhausted, new_account_index)
    """
    logger.info("="*80)
    logger.info("AI 분석 사이클 시작")
    logger.info("="*80)
    
    # DB 연결
    config = load_config()
    if config is None:
        logger.error("[종료] 설정 파일 로드 실패")
        return False, False, current_account_index

    conn = get_db_connection(config)
    if conn is None:
        logger.error("[종료] DB 연결 실패")
        return False, False, current_account_index
    
    set_db_connection(conn)

    try:
        # 테이블 생성
        create_ai_analysis_table(conn)

        # 대시보드 통계 선반영 (캐시와 실제 DB 동기화)
        update_dashboard_stats(conn)

        # 미분석 CVE 조회
        unanalyzed_cves = get_unanalyzed_cves(conn)

        if not unanalyzed_cves:
            # 진단: 대시보드와 동일한 쿼리로 실제 건수 확인
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) as cnt FROM Github_CVE_Info WHERE AI_chk = 'N'")
                raw_count = cursor.fetchone()[0]
                cursor.close()
                if raw_count > 0:
                    logger.warning(f"[진단] AI_chk='N' 실제 건수: {raw_count}건 (get_unanalyzed_cves는 0건 반환 - DB/쿼리 불일치 가능)")
                else:
                    logger.info("[완료] 분석할 CVE가 없습니다.")
            except Exception as e:
                logger.info("[완료] 분석할 CVE가 없습니다.")
            return False, False, current_account_index

        logger.info(f"[발견] {len(unanalyzed_cves)}개의 미분석 CVE 발견")
        logger.info(f"[병렬 처리] {'활성화' if PARALLEL_ENABLED else '비활성화'} (최대 {MAX_WORKERS}개 동시 실행)")

        # 각 CVE 처리
        success_count = 0
        failed_count = 0
        quota_skip_count = 0  # 429 에러로 건너뛴 CVE 수
        quota_exceeded = False
        processed_count = 0
        
        # ⚡ 할당량 초과 플래그 초기화 (더 이상 사용하지 않음)
        quota_exceeded_flag.clear()

        # 배치 단위로 병렬 처리
        batch_size = MAX_WORKERS * 2
        
        for batch_start in range(0, len(unanalyzed_cves), batch_size):
            batch_end = min(batch_start + batch_size, len(unanalyzed_cves))
            batch_cves = unanalyzed_cves[batch_start:batch_end]
            
            logger.info(f"\n{'='*80}")
            logger.info(f"[배치 시작] {batch_start + 1}~{batch_end}/{len(unanalyzed_cves)}")
            logger.info(f"[병렬 실행] 최대 {MAX_WORKERS}개 동시 처리")
            logger.info(f"{'='*80}")
            
            # ThreadPoolExecutor로 병렬 처리
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                # 작업 제출 (태스크 번호 포함)
                future_to_cve = {}
                for task_idx, cve_data in enumerate(batch_cves, 1):
                    future = executor.submit(process_one_cve_thread_safe, cve_data, current_account_index, config, task_idx)
                    future_to_cve[future] = cve_data
                
                logger.info(f"[병렬 처리] {len(batch_cves)}개 작업 제출 완료 → 실행 중...")
                logger.info("")
                
                # 완료된 작업 처리
                for future in as_completed(future_to_cve):
                    processed_count += 1
                    cve_data = future_to_cve[future]
                    
                    try:
                        result, cve_code, link = future.result()
                        
                        # 결과별 이모지
                        result_emoji = {
                            'success': '✅',
                            'quota_exceeded_skip': '⚠️',
                            'failed': '❌',
                            'rate_limit': '⏸️'
                        }.get(result, '❓')
                        
                        logger.info(f"[완료 {processed_count}/{len(unanalyzed_cves)}] {result_emoji} {cve_code} → {result.upper()}")
                        
                        if result == 'success':
                            success_count += 1
                        elif result == 'quota_exceeded_skip':
                            quota_skip_count += 1
                            logger.info(f"[Pass] 429 에러 발생 - {cve_code} 건너뛰고 다음 CVE 진행 (건너뛴 수: {quota_skip_count})")
                        elif result == 'failed':
                            failed_count += 1
                            
                    except Exception as exc:
                        logger.error(f"[예외] {cve_data['cve']} 처리 중 오류: {exc}")
                        failed_count += 1
                
                logger.info(f"\n[배치 완료] 성공: {success_count}, 실패: {failed_count}, 429 건너뛴 수: {quota_skip_count}")
            
            # ThreadPoolExecutor 블록 종료 - 모든 작업 완료됨
            logger.info(f"[병렬 처리] ThreadPoolExecutor 종료 완료")

        # 결과 출력
        logger.info("="*80)
        logger.info(f"[완료] 성공: {success_count}개, 실패: {failed_count}개, 429 건너뛴 수: {quota_skip_count}개")
        logger.info("="*80)

        return False, False, current_account_index

    finally:
        if conn:
            conn.close()
            logger.info("[DB] 데이터베이스 연결 종료")


def main():
    """메인 함수 - 10분마다 반복 실행 (429 에러 시 해당 CVE만 건너뛰고 진행)"""
    # 설정 로드
    config = load_config()
    if not config:
        logger.error("[오류] 설정 파일을 로드할 수 없습니다.")
        return
    
    # DB 연결 및 할당량 관리 테이블 생성
    conn = get_db_connection(config)
    if conn:
        create_quota_management_table(conn)
        conn.close()
        logger.info("[DB] 할당량 관리 테이블 생성/확인 완료")
    else:
        logger.error("[오류] 데이터베이스 연결 실패")
        return
    
    logger.info("="*80)
    logger.info("CVE POC AI 분석기 시작 (429 Pass 모드)")
    logger.info("="*80)
    logger.info(f"[설정] 병렬 처리: {'활성화 (' + str(MAX_WORKERS) + '개 동시)' if PARALLEL_ENABLED else '비활성화 (순차 처리)'}")
    logger.info(f"[설정] RPM 제한: {REQUESTS_PER_MINUTE}회/분 (최소 간격: {MIN_REQUEST_INTERVAL}초)")
    logger.info(f"[설정] 재시도: 최대 {MAX_RETRIES}회 ({RETRY_DELAY}초 간격)")
    logger.info(f"[설정] POC 용량 제한: {MAX_POC_SIZE_MB}MB (초과 시 건너뜀)")
    logger.info(f"[설정] 설정 파일: {CONFIG_FILE}")
    logger.info("="*80)
    logger.info("💡 429 할당량 에러 발생 시 해당 CVE만 건너뛰고 다음 CVE 분석을 계속 진행합니다.")
    logger.info("💡 DB에 429 에러 발생 CVE를 기록하며, 나중에 수동으로 확인할 수 있습니다.")
    logger.info("💡 모든 계정이 일일 할당량을 소진하면 다음 날까지 자동 대기합니다.")
    logger.info("="*80)
    logger.info("10분마다 자동 실행됩니다.")
    logger.info("중단하려면 Ctrl+C를 누르세요.")
    logger.info("="*80)

    # 현재 계정 확인
    current_email = get_current_account_email()
    if current_email:
        logger.info(f"\n[현재 계정] {current_email}")
        write_current_running_account(current_email)
    else:
        logger.warning("[경고] 현재 계정을 확인할 수 없습니다!")
    logger.info("="*80)

    cycle_count = 0
    current_account_index = 0  # 더미 (사용 안 함)

    try:
        while True:
            try:
                cycle_count += 1
                logger.info(f"\n\n{'='*80}")
                logger.info(f"사이클 #{cycle_count} 시작 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"{'='*80}")

                # 현재 계정 파일 갱신 (gemini-quota 패널용)
                write_current_running_account(get_current_account_email())

                # 분석 실행
                quota_exceeded, all_exhausted, new_account_index = run_analysis_cycle(current_account_index)

                # 계정 전환 시 현재 계정 파일 갱신 (429로 워커에서 전환된 경우 gemini-quota '오늘 사용' 반영)
                write_current_running_account(get_current_account_email())

                # 계정 인덱스 업데이트
                if new_account_index != current_account_index:
                    current_account_index = new_account_index
                    write_current_running_account(get_current_account_email())

                # 모든 계정이 소진되었는지 확인
                if check_all_accounts_exhausted():
                    logger.info(f"\n{'='*80}")
                    logger.info(f"[계정 상태 확인] 모든 계정이 일일 할당량을 소진했습니다.")
                    logger.info(f"{'='*80}")
                    
                    try:
                        # 다음 날까지 대기
                        wait_until_next_day()
                        logger.info(f"[재시작] 새로운 날이 시작되었습니다. 분석을 재개합니다.")
                        continue  # 다음 사이클로 진행
                    except KeyboardInterrupt:
                        logger.info("\n[중단] 사용자에 의해 중단되었습니다.")
                        break

                # 정상 완료 시 10분 대기
                logger.info(f"\n{'='*80}")
                logger.info(f"다음 실행까지 10분 대기 중...")
                logger.info(f"다음 실행 예정: {datetime.fromtimestamp(time.time() + 600).strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"{'='*80}\n")

                time.sleep(600)  # 10분 (600초)

            except KeyboardInterrupt:
                logger.info("\n\n[중단] 사용자에 의해 중단되었습니다.")
                break
            except Exception as e:
                logger.error(f"[오류] 예상치 못한 오류: {e}")
                import traceback
                logger.error(traceback.format_exc())
                logger.info("[대기] 오류 발생 - 10분 후 재시도...")
                time.sleep(600)
    finally:
        clear_current_running_account()


if __name__ == '__main__':
    main()

