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
import atexit
from logger import SafeTimedRotatingFileHandler
from datetime import datetime, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

from db_manager import (get_db_connection, create_ai_analysis_table,
                         get_unanalyzed_cves, create_quota_management_table,
                         update_github_download_path)
from file_manager import resolve_existing_poc_path
from config_loader import ConfigLoader
from ai_analyzer import (analyze_cve_with_gemini, save_analysis_to_db,
                          save_size_exceeded_placeholder,
                          update_ai_check_status, update_cve_info_product)
from gemini_account_manager import (set_db_connection, log_quota_event,
                                    get_current_account_email,
                                    # 계정 전환 비활성화(일시) — 복구 시 아래 import 주석 해제
                                    # mark_account_exhausted_by_email,
                                    # get_next_available_account_email,
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

# 그 외 에러(실행 실패 등) 카운터 (계정별) - 3번 연속 시 계정 전환 + is_quota_exceeded
account_fail_counters = {}

# 연속 API 실패 시 24시간 쿨다운 (empty_output, timeout 등)
_fail_cfg = config_data.get('failure_cooldown', {})
CONSECUTIVE_FAIL_THRESHOLD = int(_fail_cfg.get('consecutive_failures', 5))
COOLDOWN_HOURS = int(_fail_cfg.get('cooldown_hours', 24))
COOLDOWN_STATE_FILE = Path(__file__).resolve().parent / "logs" / "analysis_cooldown.json"
INSTANCE_LOCK_FILE = Path(__file__).resolve().parent / "logs" / "run_ai_analysis.lock"
consecutive_api_fail_counter = 0
cooldown_triggered_flag = threading.Event()
_instance_lock_fh = None  # 싱글톤 락 파일 핸들 (프로세스 종료 시까지 유지)

# 모델 응답 품질/데이터 문제 — API 장애·계정 소진·24h 쿨다운에서 제외
MODEL_RESULT_ERRORS = frozenset({
    'format_violation',
    'model_refusal',
    'json_parse_failed',
    'poc_filter_empty',
    'poc_size_exceeded',
})

# 현재 실행 중 계정 파일 (gemini-quota 패널 '오늘 사용' 표시용)
CURRENT_RUNNING_ACCOUNT_FILE = Path(__file__).resolve().parent / "logs" / "current_running_account.json"

# 당분간 계정 전환 비활성화 — 고정 계정만 사용
FIXED_ACCOUNT_EMAIL = "shinhands.gemini@gmail.com"
ACCOUNT_SWITCH_DISABLED = True  # True면 429/실패 시 다른 계정으로 전환하지 않음


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
        
        # gemini_accounts 마스터 테이블의 총 계정 수 vs 오늘 소진된 계정 수 비교
        # (gemini_quota_usage에는 '오늘 처음 사용'한 계정만 행이 있음 → 1개만 쓰다 뻗으면 total=1, exhausted=1 오판 방지)
        today = datetime.now().date()
        cursor.execute('''
            SELECT 
                COUNT(*) as total_accounts,
                SUM(CASE WHEN gqu.is_quota_exceeded = 1 THEN 1 ELSE 0 END) as exhausted_accounts
            FROM gemini_accounts ga
            LEFT JOIN gemini_quota_usage gqu ON ga.id = gqu.account_id AND gqu.usage_date = %s
            WHERE ga.is_active = TRUE
        ''', (today,))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result:
            total_accounts, exhausted_accounts = result
            exhausted_accounts = exhausted_accounts or 0  # SUM이 NULL일 수 있음
            logger.info(f"[계정 상태] 총 계정: {total_accounts}, 소진된 계정: {exhausted_accounts}")
            
            # 모든 계정이 소진되었는지 확인 (gemini_accounts 기준 총계 vs 소진 수)
            if total_accounts > 0 and exhausted_accounts >= total_accounts:
                logger.warning(f"[계정 상태] ⚠️ 모든 계정이 일일 할당량을 소진했습니다!")
                return True
            else:
                logger.info(f"[계정 상태] ✅ 사용 가능한 계정이 있습니다.")
                return False
        else:
            logger.info(f"[계정 상태] 활성 계정이 없거나 조회 실패.")
            return False
            
    except Exception as e:
        logger.error(f"[계정 상태 확인 오류] {e}")
        return False


def _is_pid_running(pid: int) -> bool:
    """다른 프로세스 PID가 살아 있는지 확인 (Windows/POSIX)."""
    if not pid or pid <= 0:
        return False
    if pid == os.getpid():
        return True
    try:
        if os.name == 'nt':
            import ctypes
            kernel32 = ctypes.windll.kernel32
            PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
            handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
            if handle:
                kernel32.CloseHandle(handle)
                return True
            return False
        os.kill(pid, 0)
        return True
    except OSError:
        return False
    except Exception:
        return False


def release_instance_lock():
    """싱글톤 실행 락 해제."""
    global _instance_lock_fh
    fh = _instance_lock_fh
    _instance_lock_fh = None
    if fh is None:
        return
    try:
        if os.name == 'nt':
            import msvcrt
            try:
                fh.seek(0)
                msvcrt.locking(fh.fileno(), msvcrt.LK_UNLCK, 1)
            except OSError:
                pass
        else:
            import fcntl
            try:
                fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
            except OSError:
                pass
    except Exception:
        pass
    try:
        fh.close()
    except Exception:
        pass
    try:
        if INSTANCE_LOCK_FILE.is_file():
            INSTANCE_LOCK_FILE.unlink()
    except Exception as e:
        logger.warning(f"[싱글톤] 락 파일 삭제 실패: {e}")


def acquire_instance_lock() -> bool:
    """
    run_ai_analysis 단일 실행 보장.
    이미 다른 인스턴스가 살아 있으면 False.
    죽은 PID의 스테일 락은 회수한다.
    """
    global _instance_lock_fh
    if _instance_lock_fh is not None:
        return True

    INSTANCE_LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)

    if INSTANCE_LOCK_FILE.is_file():
        try:
            info = json.loads(INSTANCE_LOCK_FILE.read_text(encoding='utf-8'))
            old_pid = int(info.get('pid') or 0)
            if old_pid and old_pid != os.getpid() and _is_pid_running(old_pid):
                started = info.get('started_at', '?')
                logger.error("=" * 80)
                logger.error("[싱글톤] 이미 run_ai_analysis 가 실행 중입니다.")
                logger.error(f"[싱글톤] 기존 PID={old_pid}, started_at={started}")
                logger.error(f"[싱글톤] 락 파일: {INSTANCE_LOCK_FILE}")
                logger.error("[싱글톤] 중복 실행을 막기 위해 이번 프로세스는 종료합니다.")
                logger.error("=" * 80)
                return False
            logger.warning(
                f"[싱글톤] 스테일 락 회수 (PID={old_pid} 종료됨) → {INSTANCE_LOCK_FILE.name}"
            )
        except Exception as e:
            logger.warning(f"[싱글톤] 기존 락 파일 해석 실패, 회수 시도: {e}")

    try:
        fh = open(INSTANCE_LOCK_FILE, 'w+', encoding='utf-8')
        if os.name == 'nt':
            import msvcrt
            try:
                msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                fh.close()
                logger.error("[싱글톤] 락 획득 실패 — 다른 인스턴스가 락을 보유 중일 수 있습니다.")
                return False
        else:
            import fcntl
            try:
                fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                fh.close()
                logger.error("[싱글톤] 락 획득 실패 — 다른 인스턴스가 락을 보유 중일 수 있습니다.")
                return False

        payload = {
            'pid': os.getpid(),
            'started_at': datetime.now().isoformat(timespec='seconds'),
            'script': str(Path(__file__).resolve()),
        }
        fh.seek(0)
        fh.truncate()
        fh.write(json.dumps(payload, ensure_ascii=False, indent=2))
        fh.flush()
        _instance_lock_fh = fh
        atexit.register(release_instance_lock)
        logger.info(f"[싱글톤] 실행 락 획득 (PID={os.getpid()}) → {INSTANCE_LOCK_FILE}")
        return True
    except Exception as e:
        logger.error(f"[싱글톤] 락 파일 생성 실패: {e}")
        return False


def _load_cooldown_state():
    """쿨다운 상태 파일 로드."""
    try:
        if COOLDOWN_STATE_FILE.is_file():
            with open(COOLDOWN_STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"[쿨다운] 상태 파일 읽기 실패: {e}")
    return {}


def _save_cooldown_state(cooldown_until: datetime, reason: str):
    """쿨다운 종료 시각 저장."""
    try:
        COOLDOWN_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            'cooldown_until': cooldown_until.isoformat(timespec='seconds'),
            'reason': reason,
            'updated_at': datetime.now().isoformat(timespec='seconds'),
        }
        with open(COOLDOWN_STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[쿨다운] 상태 파일 저장 실패: {e}")


def _clear_cooldown_state():
    """쿨다운 상태 파일 삭제."""
    try:
        if COOLDOWN_STATE_FILE.is_file():
            COOLDOWN_STATE_FILE.unlink()
    except Exception as e:
        logger.warning(f"[쿨다운] 상태 파일 삭제 실패: {e}")


def get_cooldown_until():
    """쿨다운 종료 시각 반환 (없으면 None)."""
    state = _load_cooldown_state()
    raw = state.get('cooldown_until')
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def is_in_cooldown_period():
    """현재 API 요청 쿨다운 기간인지 확인."""
    until = get_cooldown_until()
    return until is not None and datetime.now() < until


def wait_for_failure_cooldown():
    """연속 실패로 인한 쿨다운이 끝날 때까지 대기."""
    global consecutive_api_fail_counter
    until = get_cooldown_until()
    if until is None or datetime.now() >= until:
        _clear_cooldown_state()
        cooldown_triggered_flag.clear()
        consecutive_api_fail_counter = 0
        return

    state = _load_cooldown_state()
    reason = state.get('reason', '연속 API 실패')
    wait_seconds = max(0, (until - datetime.now()).total_seconds())

    logger.info("=" * 80)
    logger.info("🛑 연속 API 실패로 분석 요청을 일시 중지합니다.")
    logger.info("=" * 80)
    logger.info(f"📌 사유: {reason}")
    logger.info(f"⏰ 현재 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"🔄 재개 예정: {until.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"⏳ 대기 시간: {wait_seconds / 3600:.1f}시간 ({wait_seconds / 60:.0f}분)")
    logger.info("=" * 80)
    logger.info("💡 쿨다운 종료 후 자동으로 분석을 재개합니다.")
    logger.info("💡 중단하려면 Ctrl+C를 누르세요.")
    logger.info("=" * 80)

    try:
        time.sleep(wait_seconds)
        logger.info("=" * 80)
        logger.info("🎉 API 쿨다운이 종료되었습니다. 분석을 재개합니다.")
        logger.info("=" * 80)
    except KeyboardInterrupt:
        logger.info("\n[중단] 사용자에 의해 중단되었습니다.")
        raise
    finally:
        _clear_cooldown_state()
        cooldown_triggered_flag.clear()
        consecutive_api_fail_counter = 0


def record_api_success():
    """API 분석 성공 시 연속 실패 카운터 리셋 + 활성 쿨다운 해제."""
    global consecutive_api_fail_counter
    with thread_lock:
        had_fails = consecutive_api_fail_counter > 0
        was_cooling = cooldown_triggered_flag.is_set() or is_in_cooldown_period()
        if had_fails:
            logger.info(f"[연속 실패] 성공으로 카운터 리셋 (이전: {consecutive_api_fail_counter})")
        consecutive_api_fail_counter = 0
        if was_cooling:
            _clear_cooldown_state()
            cooldown_triggered_flag.clear()
            logger.info("[쿨다운] 분석 성공으로 쿨다운 해제 — 다음 CVE 분석을 계속합니다.")


def record_api_failure(reason: str) -> bool:
    """
    API 분석 실패 기록. 연속 실패 임계치 도달 시 24시간 쿨다운 시작.

    Returns:
        bool: 쿨다운이 방금 시작되었으면 True
    """
    global consecutive_api_fail_counter
    with thread_lock:
        consecutive_api_fail_counter += 1
        count = consecutive_api_fail_counter
        logger.warning(
            f"[연속 실패] {count}/{CONSECUTIVE_FAIL_THRESHOLD} - {reason}"
        )
        if count < CONSECUTIVE_FAIL_THRESHOLD:
            return False

        cooldown_until = datetime.now() + timedelta(hours=COOLDOWN_HOURS)
        _save_cooldown_state(
            cooldown_until,
            f"연속 {CONSECUTIVE_FAIL_THRESHOLD}회 API 실패 (마지막: {reason})",
        )
        consecutive_api_fail_counter = 0
        cooldown_triggered_flag.set()
        logger.error("=" * 80)
        logger.error(
            f"🛑 연속 {CONSECUTIVE_FAIL_THRESHOLD}회 실패 → "
            f"{COOLDOWN_HOURS}시간 API 요청 중지"
        )
        logger.error(
            f"🔄 재개 예정: {cooldown_until.strftime('%Y-%m-%d %H:%M:%S')}"
        )
        logger.error("=" * 80)
        return True


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
    429 에러 처리.
    (당분간) 계정 전환 비활성화 — 고정 계정(FIXED_ACCOUNT_EMAIL)만 유지.

    Args:
        conn: 데이터베이스 연결 객체
        account_email: 현재 계정 이메일

    Returns:
        str: 현재 계정 이메일 (전환하지 않음)
    """
    try:
        # 429 에러 카운터 증가
        if account_email not in account_429_counters:
            account_429_counters[account_email] = 0
        account_429_counters[account_email] += 1

        # DB에 429 에러 기록
        from db_manager import record_429_error
        record_429_error(conn, account_email)

        logger.info(f"[429 에러] {account_email} - {account_429_counters[account_email]}번째 발생")

        # 3번 연속 429 에러 발생 시
        if account_429_counters[account_email] >= 3:
            logger.warning(
                f"[429 에러] {account_email} 3번 연속 발생 "
                f"(계정 전환 비활성화 — {FIXED_ACCOUNT_EMAIL} 유지)"
            )

            # --- 계정 전환 프로세스 (당분간 주석 처리) ---
            # logger.warning(f"[429 에러] {account_email} 계정 할당량 소진 - 3번 연속 발생, 10분 대기 후 계정 교체")
            # logger.info("[429 에러] 계정이 사용 중이므로 10분 대기 중...")
            # time.sleep(600)  # 10분 = 600초
            # try:
            #     logger.info(f"[계정 전환] 다음 사용 가능한 계정 찾기 시작...")
            #     next_account = get_next_available_account_email()
            #     if not next_account:
            #         logger.error("[계정 전환] ❌ 사용 가능한 계정이 없습니다")
            #         return None
            #     logger.info(f"[계정 전환] {account_email} -> {next_account} 전환 시도...")
            #     success = switch_to_account_by_email(next_account)
            #     if success:
            #         logger.info(f"[계정 전환] ✅ 성공: {account_email} -> {next_account}")
            #         mark_account_exhausted_by_email(account_email)
            #         account_429_counters[account_email] = 0
            #         logger.info("[계정 전환] 인증 적용 대기 중... (3초)")
            #         time.sleep(3)
            #         return next_account
            #     else:
            #         logger.error(f"[계정 전환] ❌ {next_account}로 전환 실패")
            #         return None
            # except Exception as e:
            #     logger.error(f"[계정 전환] ❌ 예외 발생: {e}")
            #     return None
            # --- 계정 전환 프로세스 끝 ---

            return account_email
        else:
            logger.info(f"[429 에러] {account_429_counters[account_email]}번째 - 기존 계정 유지")
            return account_email

    except Exception as e:
        logger.error(f"[429 에러 처리 오류] {e}")
        return account_email


def handle_other_error(conn, account_email):
    """
    그 외 에러(실행 실패 등) 처리.
    (당분간) 계정 전환 비활성화 — 고정 계정만 유지.

    Args:
        conn: 데이터베이스 연결 객체
        account_email: 현재 계정 이메일

    Returns:
        str: 현재 계정 이메일 (전환하지 않음)
    """
    if not account_email:
        return None
    try:
        if account_email not in account_fail_counters:
            account_fail_counters[account_email] = 0
        account_fail_counters[account_email] += 1

        logger.info(f"[실패 에러] {account_email} - {account_fail_counters[account_email]}번째 발생")

        if account_fail_counters[account_email] >= 3:
            logger.warning(
                f"[실패 에러] {account_email} 3번 연속 실패 "
                f"(계정 전환 비활성화 — {FIXED_ACCOUNT_EMAIL} 유지)"
            )

            # --- 계정 전환 프로세스 (당분간 주석 처리) ---
            # try:
            #     next_account = get_next_available_account_email()
            #     if not next_account:
            #         logger.error("[계정 전환] ❌ 사용 가능한 계정이 없습니다")
            #         return None
            #     logger.info(f"[계정 전환] 다음 계정 발견: {next_account}")
            #     success = switch_to_account_by_email(next_account)
            #     if success:
            #         logger.info(f"[계정 전환] ✅ 성공: {account_email} -> {next_account}")
            #         mark_account_exhausted_by_email(account_email)
            #         account_fail_counters[account_email] = 0
            #         logger.info("[계정 전환] 인증 적용 대기 중... (3초)")
            #         time.sleep(3)
            #         return next_account
            #     else:
            #         logger.error(f"[계정 전환] ❌ {next_account}로 전환 실패")
            #         return account_email
            # except Exception as e:
            #     logger.error(f"[계정 전환] ❌ 예외 발생: {e}")
            #     return account_email
            # --- 계정 전환 프로세스 끝 ---

            return account_email
        else:
            return account_email

    except Exception as e:
        logger.error(f"[실패 에러 처리 오류] {e}")
        return account_email


def _setup_ai_analysis_logger() -> logging.Logger:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(base_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    logger = logging.getLogger('AI_Analysis_Runner')
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    file_handler = SafeTimedRotatingFileHandler(
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
        # 다운로드 경로 확인/복구
        path_missing = (
            download_path == "다운로드 실패"
            or not download_path
            or not Path(str(download_path)).exists()
        )
        if path_missing:
            try:
                app_cfg = ConfigLoader.load_config() or {}
                cve_base = (app_cfg.get('paths') or {}).get('cve_folder', 'CVE')
            except Exception:
                cve_base = 'CVE'

            recovered = resolve_existing_poc_path(
                cve_code,
                title=title,
                link=link,
                base_path=cve_base,
            )
            if recovered and Path(recovered).exists():
                logger.info(
                    f"[Task #{task_num}] 🔧 경로 복구: {download_path!r} → {recovered}"
                )
                download_path = recovered
                record_id = cve_data.get('id')
                if record_id:
                    with thread_lock:
                        if update_github_download_path(conn, record_id, recovered):
                            logger.info(
                                f"[Task #{task_num}] 💾 DB download_path 갱신 (id={record_id})"
                            )
            elif download_path == "다운로드 실패" or not download_path:
                logger.warning(
                    f"[Task #{task_num}] ⏭️  건너뜀: {cve_code} (다운로드 실패) - AI_chk 유지하여 재시도 가능"
                )
                with thread_lock:
                    log_quota_event(
                        current_account_index, 'failed', cve_code, link, '다운로드 실패', conn=conn
                    )
                return ('failed', cve_code, link)
            else:
                logger.warning(
                    f"[Task #{task_num}] ⏭️  건너뜀: {cve_code} (경로 없음) - AI_chk 유지하여 재시도 가능"
                )
                with thread_lock:
                    log_quota_event(
                        current_account_index, 'failed', cve_code, link, '경로 없음', conn=conn
                    )
                return ('failed', cve_code, link)

        # 경로 존재 재확인
        path = Path(download_path)
        if not path.exists():
            logger.warning(f"[Task #{task_num}] ⏭️  건너뜀: {cve_code} (경로 없음) - AI_chk 유지하여 재시도 가능")
            with thread_lock:
                log_quota_event(current_account_index, 'failed', cve_code, link, '경로 없음', conn=conn)
            return ('failed', cve_code, link)

        # POC 용량 제한은 ai_analyzer에서 화이트리스트 복사 후 크기로 판단한다.

        # Gemini 분석 (재시도 로직 + RPM 제한 포함)
        logger.info(f"[Task #{task_num}] 🔄 분석 중: {cve_code}...")

        if is_in_cooldown_period() or cooldown_triggered_flag.is_set():
            logger.warning(
                f"[Task #{task_num}] 🛑 API 쿨다운 중 - 요청 건너뜀: {cve_code}"
            )
            return ('cooldown', cve_code, link)
        
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
        
        analysis_result = analyze_cve_with_gemini(download_path, max_poc_size_mb=MAX_POC_SIZE_MB)
        
        # 화이트리스트 적용 후 용량 초과 (AI_chk=Y, 용량초과 플레이스홀더)
        if isinstance(analysis_result, dict) and analysis_result.get('error') == 'poc_size_exceeded':
            fsmb = float(analysis_result.get('filtered_size_mb', MAX_POC_SIZE_MB))
            logger.warning(
                f"[Task #{task_num}] ⏭️  POC 용량 초과 (화이트리스트 후): {fsmb:.2f}MB > {MAX_POC_SIZE_MB}MB"
            )
            with thread_lock:
                update_ai_check_status(conn, link, 'Y')
                save_size_exceeded_placeholder(
                    conn, link, download_path, fsmb, MAX_POC_SIZE_MB, after_whitelist=True
                )
                log_quota_event(
                    current_account_index,
                    'failed',
                    cve_code,
                    link,
                    f'POC 용량 초과 화이트리스트 후 ({fsmb:.2f}MB > {MAX_POC_SIZE_MB}MB)',
                    conn=conn,
                )
            return ('failed', cve_code, link)

        # 화이트리스트 후 분석 대상 파일 없음 (재시도 가능하도록 AI_chk 유지)
        if isinstance(analysis_result, dict) and analysis_result.get('error') == 'poc_filter_empty':
            logger.warning(f"[Task #{task_num}] ⏭️  화이트리스트 후 분석 대상 파일 없음: {cve_code}")
            with thread_lock:
                log_quota_event(
                    current_account_index,
                    'failed',
                    cve_code,
                    link,
                    '화이트리스트 후 분석 대상 파일 없음',
                    conn=conn,
                )
            return ('failed', cve_code, link)

        # 429 에러 처리 (실패로 기록하고 3번 연속 발생 시 계정 교체)
        if isinstance(analysis_result, dict) and analysis_result.get('error') == 'quota_exceeded':
            logger.error(f"[Task #{task_num}] ⚠️ 429 에러 감지 - 실패로 기록")
            
            # 429 에러를 실패로 기록
            with thread_lock:
                log_quota_event(current_account_index, 'quota_exceeded', cve_code, link, 
                               f"429 Quota Exceeded: {analysis_result.get('message', '')}", conn=conn)
            
            # 429 에러 처리 (3번 카운트 후 계정 교체)
            new_account = handle_429_error(conn, current_account)
            record_api_failure(
                f"quota_exceeded: {analysis_result.get('message', '')[:100]}"
            )
            
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
            record_api_failure('rate_limit')
            return ('rate_limit', cve_code, link)
        
        # 일반 실패 처리 (재시도 없음) - 3번 연속 시 계정 전환 + is_quota_exceeded
        if isinstance(analysis_result, dict) and analysis_result.get('error') == 'failed':
            error_msg = analysis_result.get('message', 'Unknown error')
            logger.error(f"[Task #{task_num}] ❌ 분석 실패: {cve_code} - {error_msg[:100]}")
            with thread_lock:
                log_quota_event(current_account_index, 'failed', cve_code, link, error_msg, conn=conn)
            new_account = handle_other_error(conn, current_account)
            record_api_failure(f"failed: {error_msg[:100]}")
            if new_account and new_account != current_account:
                logger.info(f"[Task #{task_num}] 🔄 계정 교체 완료: {current_account} -> {new_account}")
                write_current_running_account(new_account)
            return ('failed', cve_code, link)
        
        # None 결과 처리 (재시도 없음) - 3번 연속 시 계정 전환 + is_quota_exceeded
        if analysis_result is None:
            logger.error(f"[Task #{task_num}] ❌ 분석 결과 없음: {cve_code}")
            with thread_lock:
                log_quota_event(current_account_index, 'failed', cve_code, link, '분석 결과 없음', conn=conn)
            new_account = handle_other_error(conn, current_account)
            record_api_failure('분석 결과 없음')
            if new_account and new_account != current_account:
                logger.info(f"[Task #{task_num}] 🔄 계정 교체 완료: {current_account} -> {new_account}")
                write_current_running_account(new_account)
            return ('failed', cve_code, link)
        
        # empty_output 등 그 외 에러 (실행 실패 코드 등) - 3번 연속 시 계정 전환 + is_quota_exceeded
        if isinstance(analysis_result, dict) and analysis_result.get('error') not in (None, 'quota_exceeded', 'rate_limit', 'failed', 'quota_suspicious'):
            err_type = analysis_result.get('error', 'unknown')
            err_msg = analysis_result.get('message', str(err_type))[:100]
            if err_type in MODEL_RESULT_ERRORS:
                logger.warning(
                    f"[Task #{task_num}] ⏭️ 분석 불가(모델/데이터): {cve_code} - "
                    f"{err_type}: {err_msg}"
                )
                with thread_lock:
                    log_quota_event(
                        current_account_index,
                        'failed',
                        cve_code,
                        link,
                        f"{err_type}: {err_msg}",
                        conn=conn,
                    )
                return ('failed', cve_code, link)

            logger.error(f"[Task #{task_num}] ❌ 분석 실패: {cve_code} - {err_type}: {err_msg}")
            with thread_lock:
                log_quota_event(current_account_index, 'failed', cve_code, link, f"{err_type}: {err_msg}", conn=conn)
            new_account = handle_other_error(conn, current_account)
            record_api_failure(f"{err_type}: {err_msg}")
            if new_account and new_account != current_account:
                logger.info(f"[Task #{task_num}] 🔄 계정 교체 완료: {current_account} -> {new_account}")
                write_current_running_account(new_account)
            return ('failed', cve_code, link)

        # 할당량 관련 의심 오류 체크 - 해당 CVE만 건너뛰고 진행, 3번 연속 시 계정 전환 + is_quota_exceeded
        if isinstance(analysis_result, dict) and analysis_result.get('error') == 'quota_suspicious':
            logger.warning(f"[Task #{task_num}] ⚠️  할당량 의심 - 해당 CVE 건너뛰고 다음 CVE 진행")
            with thread_lock:
                log_quota_event(current_account_index, 'quota_exceeded', cve_code, link, '할당량 의심', conn=conn)
            new_account = handle_other_error(conn, current_account)
            record_api_failure('quota_suspicious')
            if new_account and new_account != current_account:
                logger.info(f"[Task #{task_num}] 🔄 계정 교체 완료: {current_account} -> {new_account}")
                write_current_running_account(new_account)
            return ('quota_exceeded_skip', cve_code, link)

        # AI 분석 결과 JSON 로그 출력 (ai_analysis.log에 기록)
        record_api_success()
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
                # 429 에러 카운터 리셋 (성공 시)
                if current_account in account_429_counters:
                    account_429_counters[current_account] = 0
                # 그 외 실패 에러 카운터 리셋 (성공 시)
                if current_account in account_fail_counters:
                    account_fail_counters[current_account] = 0
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
        tuple: (quota_exceeded, all_accounts_exhausted, new_account_index, cooldown_active)
    """
    def _cycle_result():
        return (
            False,
            False,
            current_account_index,
            cooldown_triggered_flag.is_set() or is_in_cooldown_period(),
        )

    logger.info("="*80)
    logger.info("AI 분석 사이클 시작")
    logger.info("="*80)
    
    # DB 연결
    config = load_config()
    if config is None:
        logger.error("[종료] 설정 파일 로드 실패")
        return _cycle_result()

    conn = get_db_connection(config)
    if conn is None:
        logger.error("[종료] DB 연결 실패")
        return _cycle_result()
    
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
            return _cycle_result()

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
            if cooldown_triggered_flag.is_set() or is_in_cooldown_period():
                logger.warning("[중단] 연속 API 실패 쿨다운 시작 → 남은 CVE 처리 중단")
                break

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
                            'rate_limit': '⏸️',
                            'cooldown': '🛑',
                        }.get(result, '❓')
                        
                        logger.info(f"[완료 {processed_count}/{len(unanalyzed_cves)}] {result_emoji} {cve_code} → {result.upper()}")
                        
                        if result == 'success':
                            success_count += 1
                        elif result == 'quota_exceeded_skip':
                            quota_skip_count += 1
                            logger.info(f"[Pass] 429 에러 발생 - {cve_code} 건너뛰고 다음 CVE 진행 (건너뛴 수: {quota_skip_count})")
                        elif result == 'failed':
                            failed_count += 1
                        elif result == 'cooldown':
                            logger.warning(f"[쿨다운] {cve_code} - API 요청 건너뜀")

                    except Exception as exc:
                        logger.error(f"[예외] {cve_data['cve']} 처리 중 오류: {exc}")
                        failed_count += 1
                        record_api_failure(f"exception: {exc}")

                if cooldown_triggered_flag.is_set() or is_in_cooldown_period():
                    logger.warning("[배치 중단] 연속 API 실패 쿨다운 → 추가 배치 중단")
                    break
                            
                logger.info(f"\n[배치 완료] 성공: {success_count}, 실패: {failed_count}, 429 건너뛴 수: {quota_skip_count}")
            
            # ThreadPoolExecutor 블록 종료 - 모든 작업 완료됨
            logger.info(f"[병렬 처리] ThreadPoolExecutor 종료 완료")

        # 결과 출력
        logger.info("="*80)
        logger.info(f"[완료] 성공: {success_count}개, 실패: {failed_count}개, 429 건너뛴 수: {quota_skip_count}개")
        logger.info("="*80)

        return _cycle_result()

    finally:
        if conn:
            conn.close()
            logger.info("[DB] 데이터베이스 연결 종료")


def main():
    """메인 함수 - 10분마다 반복 실행 (429 에러 시 해당 CVE만 건너뛰고 진행)"""
    if not acquire_instance_lock():
        return

    # 설정 로드
    config = load_config()
    if not config:
        logger.error("[오류] 설정 파일을 로드할 수 없습니다.")
        release_instance_lock()
        return
    
    # DB 연결 및 할당량 관리 테이블 생성
    conn = get_db_connection(config)
    if conn:
        create_quota_management_table(conn)
        conn.close()
        logger.info("[DB] 할당량 관리 테이블 생성/확인 완료")
    else:
        logger.error("[오류] 데이터베이스 연결 실패")
        release_instance_lock()
        return
    
    logger.info("="*80)
    logger.info("CVE POC AI 분석기 시작 (429 Pass 모드)")
    logger.info("="*80)
    logger.info(f"[설정] 병렬 처리: {'활성화 (' + str(MAX_WORKERS) + '개 동시)' if PARALLEL_ENABLED else '비활성화 (순차 처리)'}")
    logger.info(f"[설정] RPM 제한: {REQUESTS_PER_MINUTE}회/분 (최소 간격: {MIN_REQUEST_INTERVAL}초)")
    logger.info(f"[설정] 재시도: 최대 {MAX_RETRIES}회 ({RETRY_DELAY}초 간격)")
    logger.info(f"[설정] POC 용량 제한: {MAX_POC_SIZE_MB}MB (초과 시 건너뜀)")
    logger.info(
        f"[설정] 연속 실패 쿨다운: {CONSECUTIVE_FAIL_THRESHOLD}회 실패 시 "
        f"{COOLDOWN_HOURS}시간 API 요청 중지"
    )
    logger.info("[설정] 성공 시 쿨다운 해제: 활성화")
    logger.info(f"[설정] 싱글톤 락: {INSTANCE_LOCK_FILE}")
    logger.info(f"[설정] 설정 파일: {CONFIG_FILE}")
    logger.info(f"[설정] 계정 전환: {'비활성화' if ACCOUNT_SWITCH_DISABLED else '활성화'}")
    logger.info(f"[설정] 고정 계정: {FIXED_ACCOUNT_EMAIL}")
    logger.info("="*80)
    logger.info("💡 429 할당량 에러 발생 시 해당 CVE만 건너뛰고 다음 CVE 분석을 계속 진행합니다.")
    logger.info("💡 DB에 429 에러 발생 CVE를 기록하며, 나중에 수동으로 확인할 수 있습니다.")
    logger.info(f"💡 (당분간) 계정 전환 없이 {FIXED_ACCOUNT_EMAIL} 만 사용합니다.")
    logger.info(
        f"💡 empty_output 등 API 실패가 연속 {CONSECUTIVE_FAIL_THRESHOLD}회 발생하면 "
        f"{COOLDOWN_HOURS}시간 동안 요청을 중지합니다."
    )
    logger.info("💡 분석 성공 시에는 활성 쿨다운을 해제하고 다음 CVE를 계속 처리합니다.")
    logger.info("="*80)
    logger.info("10분마다 자동 실행됩니다.")
    logger.info("중단하려면 Ctrl+C를 누르세요.")
    logger.info("="*80)

    # 고정 계정 확인 (이미 해당 계정이면 전환 스킵 — antigravity-cli 잠금/Permission denied 방지)
    current_email = get_current_account_email()
    if current_email == FIXED_ACCOUNT_EMAIL:
        logger.info(f"[계정 고정] 이미 {FIXED_ACCOUNT_EMAIL} 활성 — 폴더 전환 생략")
        write_current_running_account(FIXED_ACCOUNT_EMAIL)
    else:
        logger.info(
            f"[계정 고정] 현재={current_email} → {FIXED_ACCOUNT_EMAIL} 으로 전환 중..."
        )
        if switch_to_account_by_email(FIXED_ACCOUNT_EMAIL):
            logger.info(f"[계정 고정] ✅ {FIXED_ACCOUNT_EMAIL} 활성화 완료")
            write_current_running_account(FIXED_ACCOUNT_EMAIL)
        else:
            logger.error(
                f"[계정 고정] ❌ {FIXED_ACCOUNT_EMAIL} 전환 실패 — "
                f"현재 프로필({current_email})로 계속 시도합니다"
            )

    current_email = get_current_account_email()
    if current_email:
        logger.info(f"\n[현재 계정] {current_email}")
        write_current_running_account(current_email)
        if current_email != FIXED_ACCOUNT_EMAIL:
            logger.warning(
                f"[계정 고정] ⚠️ 활성 계정({current_email})이 "
                f"고정 계정({FIXED_ACCOUNT_EMAIL})과 다릅니다"
            )
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

                if is_in_cooldown_period():
                    wait_for_failure_cooldown()

                # 현재 계정 파일 갱신 (gemini-quota 패널용)
                write_current_running_account(get_current_account_email())

                # 분석 실행
                quota_exceeded, all_exhausted, new_account_index, cooldown_active = (
                    run_analysis_cycle(current_account_index)
                )

                # 계정 전환 시 현재 계정 파일 갱신 (429로 워커에서 전환된 경우 gemini-quota '오늘 사용' 반영)
                write_current_running_account(get_current_account_email())

                # 계정 인덱스 업데이트
                if new_account_index != current_account_index:
                    current_account_index = new_account_index
                    write_current_running_account(get_current_account_email())

                if cooldown_active:
                    wait_for_failure_cooldown()
                    continue

                # 모든 계정이 소진되었는지 확인
                # (계정 전환 비활성화 시: 다른 계정 때문에 재개되는 오판을 피하고자 스킵)
                if ACCOUNT_SWITCH_DISABLED:
                    logger.info(
                        f"[계정 상태] 계정 전환 비활성화 — "
                        f"{FIXED_ACCOUNT_EMAIL} 고정 모드 (전역 소진 대기 생략)"
                    )
                elif check_all_accounts_exhausted():
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
        release_instance_lock()


if __name__ == '__main__':
    main()

