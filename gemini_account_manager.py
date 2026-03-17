"""
Gemini 계정 관리 및 로테이션 모듈
할당량 초과 시 자동으로 다음 계정으로 전환
DB에 사용 현황 기록
"""
import os
import shutil
import logging
from pathlib import Path
from datetime import datetime, date, timezone, timedelta
import json

logger = logging.getLogger('Gemini_Account_Manager')

# DB 연결은 필요할 때만 import (순환 import 방지)
_db_conn = None

# 경로 설정
GEMINI_ACCOUNTS_DIR = Path(r"C:\aiserver\CVE_BOT\gemini_account")  # 인증 폴더들이 있는 경로
USER_GEMINI_DIR = Path(os.environ.get("USERPROFILE", "")) / ".gemini"  # Gemini CLI가 사용하는 폴더
GOOGLE_ACCOUNTS_JSON = USER_GEMINI_DIR / "google_accounts.json"

# 계정 이메일 매핑 (실제 이메일 -> 폴더명)
ACCOUNT_EMAIL_MAP = {
    "shinhands.gpt@gmail.com": ".gemini_shinhands.gpt",
    "shinhands.gemini@gmail.com": ".gemini_shinhands.gemini",
    "shinhands.credit1@gmail.com": ".gemini_shinhands.credit1",
}

# 순서대로 사용할 계정 목록
ACCOUNT_ORDER = [
    "shinhands.gpt@gmail.com",
    "shinhands.gemini@gmail.com",
    "shinhands.credit1@gmail.com",
]


def get_available_accounts():
    """
    사용 가능한 Gemini 계정 폴더 목록 반환
    
    Returns:
        list: Path 객체 리스트
    """
    try:
        if not GEMINI_ACCOUNTS_DIR.exists():
            logger.error(f"[계정 목록] 계정 디렉토리 없음: {GEMINI_ACCOUNTS_DIR}")
            return []
        
        # .gemini_로 시작하는 폴더들 찾기
        account_folders = []
        for item in GEMINI_ACCOUNTS_DIR.iterdir():
            if item.is_dir() and item.name.startswith('.gemini_'):
                account_folders.append(item)
        
        # 이름순 정렬
        account_folders.sort(key=lambda x: x.name)
        
        logger.info(f"[계정 목록] {len(account_folders)}개 계정 발견")
        for folder in account_folders:
            logger.info(f"[계정 목록] - {folder.name}")
        
        return account_folders
        
    except Exception as e:
        logger.error(f"[계정 목록] 조회 실패: {e}")
        return []


def get_current_account_email():
    """
    google_accounts.json에서 현재 활성 계정 이메일 확인
    
    Returns:
        str: 현재 계정 이메일 또는 None
    """
    try:
        if GOOGLE_ACCOUNTS_JSON.exists():
            with open(GOOGLE_ACCOUNTS_JSON, 'r', encoding='utf-8') as f:
                data = json.load(f)
                active_email = data.get('active')
                logger.info(f"[현재 계정] {active_email}")
                return active_email
        else:
            logger.warning(f"[현재 계정] google_accounts.json 파일 없음")
            return None
    except Exception as e:
        logger.error(f"[현재 계정] 읽기 실패: {e}")
        return None


def load_exhausted_accounts_from_db():
    """
    DB에서 당일 할당량 소진 계정 목록 로드
    
    Returns:
        set: 소진된 계정 이메일 집합
    """
    if not _db_conn:
        return set()
    
    try:
        cursor = db.cursor(dictionary=True)
        today = datetime.now(timezone(timedelta(hours=9))).date()
        
        cursor.execute('''
            SELECT COALESCE(ga.account_email, ga.account_name) as account_email
            FROM gemini_quota_usage gqu
            JOIN gemini_accounts ga ON gqu.account_id = ga.id
            WHERE gqu.usage_date = %s 
            AND gqu.is_quota_exceeded = TRUE
        ''', (today,))
        
        results = cursor.fetchall()
        cursor.close()
        
        exhausted = {row['account_email'] for row in results if row['account_email']}
        if exhausted:
            logger.info(f"[DB 소진 계정] {len(exhausted)}개: {', '.join(exhausted)}")
        
        return exhausted
        
    except Exception as e:
        logger.error(f"[DB 소진 계정] 조회 실패: {e}")
        return set()


def get_next_available_account_email():
    """
    DB에서 소진되지 않은 다음 계정 찾기
    
    Returns:
        str: 다음 사용 가능한 계정 이메일 또는 None
    """
    current_email = get_current_account_email()
    exhausted_emails = load_exhausted_accounts_from_db()
    
    # 현재 계정의 다음부터 순회
    start_index = 0
    if current_email and current_email in ACCOUNT_ORDER:
        start_index = ACCOUNT_ORDER.index(current_email) + 1
    
    # 다음 계정부터 끝까지
    for i in range(start_index, len(ACCOUNT_ORDER)):
        email = ACCOUNT_ORDER[i]
        if email not in exhausted_emails:
            logger.info(f"[다음 계정] {email} (소진 안됨)")
            return email
    
    # 처음부터 현재 계정까지
    for i in range(0, start_index):
        email = ACCOUNT_ORDER[i]
        if email not in exhausted_emails:
            logger.info(f"[다음 계정] {email} (소진 안됨)")
            return email
    
    logger.error(f"[다음 계정] 모든 계정 소진됨!")
    return None


def extract_account_from_zip():
    """
    압축 파일에서 계정 폴더들을 추출
    
    Returns:
        bool: 성공 여부
    """
    try:
        zip_file = GEMINI_ACCOUNTS_DIR / "gemini_account_file.zip"
        if not zip_file.exists():
            logger.error(f"[압축 해제] 압축 파일 없음: {zip_file}")
            return False
        
        logger.info(f"[압축 해제] 압축 파일 해제 시작: {zip_file}")
        
        import zipfile
        with zipfile.ZipFile(zip_file, 'r') as zip_ref:
            # 임시 폴더에 압축 해제
            temp_folder = GEMINI_ACCOUNTS_DIR / "temp_extract"
            if temp_folder.exists():
                shutil.rmtree(temp_folder)
            temp_folder.mkdir()
            
            zip_ref.extractall(temp_folder)
            logger.info(f"[압축 해제] 임시 폴더에 해제 완료: {temp_folder}")
            
            # .gemini_로 시작하는 폴더들을 메인 디렉토리로 이동
            extracted_folders = []
            for item in temp_folder.iterdir():
                if item.is_dir() and item.name.startswith('.gemini_'):
                    target_path = GEMINI_ACCOUNTS_DIR / item.name
                    if target_path.exists():
                        shutil.rmtree(target_path)
                    shutil.move(str(item), str(target_path))
                    extracted_folders.append(target_path)
                    logger.info(f"[압축 해제] 계정 폴더 이동: {item.name}")
            
            # 임시 폴더 정리
            shutil.rmtree(temp_folder)
            logger.info(f"[압축 해제] ✅ {len(extracted_folders)}개 계정 폴더 추출 완료")
            return True
            
    except Exception as e:
        logger.error(f"[압축 해제] ❌ 실패: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def switch_to_account_by_email(email):
    """
    이메일로 계정 전환 (압축 해제 → 폴더 삭제 → 복사 → 이름 변경)
    
    Args:
        email: 전환할 계정 이메일
    
    Returns:
        bool: 성공 여부
    """
    if email not in ACCOUNT_EMAIL_MAP:
        logger.error(f"[계정 전환] 알 수 없는 이메일: {email}")
        return False
    
    account_folder_name = ACCOUNT_EMAIL_MAP[email]
    source_folder = GEMINI_ACCOUNTS_DIR / account_folder_name
    
    # 계정 폴더가 없으면 압축 파일에서 추출 시도
    if not source_folder.exists():
        logger.info(f"[계정 전환] 계정 폴더 없음, 압축 파일에서 추출 시도: {source_folder}")
        if not extract_account_from_zip():
            logger.error(f"[계정 전환] 압축 파일 추출 실패")
            return False
        
        # 다시 확인
        if not source_folder.exists():
            logger.error(f"[계정 전환] 추출 후에도 소스 폴더 없음: {source_folder}")
            return False
    
    try:
        logger.info(f"[계정 전환] {email}로 전환 시작...")
        
        # 1. 기존 .gemini 폴더 삭제
        if USER_GEMINI_DIR.exists():
            logger.info(f"[계정 전환] 기존 폴더 삭제: {USER_GEMINI_DIR}")
            shutil.rmtree(USER_GEMINI_DIR)
            logger.info(f"[계정 전환] ✅ 삭제 완료")
        
        # 2. 새 계정 폴더 복사 (.gemini_{ID} → .gemini)
        logger.info(f"[계정 전환] 복사: {source_folder} → {USER_GEMINI_DIR}")
        shutil.copytree(source_folder, USER_GEMINI_DIR)
        logger.info(f"[계정 전환] ✅ 복사 완료")
        
        # 3. 확인
        if GOOGLE_ACCOUNTS_JSON.exists():
            with open(GOOGLE_ACCOUNTS_JSON, 'r', encoding='utf-8') as f:
                data = json.load(f)
                active = data.get('active')
                logger.info(f"[계정 전환] ✅ 전환 완료: {active}")
                return active == email
        
        logger.info(f"[계정 전환] ✅ {email}로 전환 성공")
        return True
        
    except Exception as e:
        logger.error(f"[계정 전환] ❌ 실패: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def mark_account_exhausted_by_email(account_email):
    """
    지정된 계정을 DB에 할당량 소진으로 표시 (계정 전환 완료 후 호출용)
    
    Args:
        account_email: 소진 처리할 계정 이메일
    """
    if not _db_conn:
        logger.error("[할당량 소진] DB 연결 없음")
        return False
    
    if not account_email:
        logger.error("[할당량 소진] 계정 이메일 없음")
        return False
    
    try:
        cursor = db.cursor(dictionary=True)
        
        # 계정 ID 조회 (account_email 또는 account_name으로)
        cursor.execute("""
            SELECT id FROM gemini_accounts 
            WHERE account_email = %s OR account_name = %s
        """, (account_email, ACCOUNT_EMAIL_MAP.get(account_email, account_email)))
        result = cursor.fetchone()
        
        if not result:
            logger.error(f"[할당량 소진] DB에 계정 없음: {account_email}")
            cursor.close()
            return False
        
        account_id = result['id']
        today = datetime.now(timezone(timedelta(hours=9))).date()
        
        # 할당량 소진 표시
        cursor.execute('''
            INSERT INTO gemini_quota_usage 
            (account_id, usage_date, is_quota_exceeded, quota_exceeded_at)
            VALUES (%s, %s, TRUE, NOW())
            ON DUPLICATE KEY UPDATE 
                is_quota_exceeded = TRUE,
                quota_exceeded_at = NOW()
        ''', (account_id, today))
        
        _db_conn.commit()
        cursor.close()
        
        logger.info(f"[할당량 소진] ✅ DB 표시 완료: {account_email}")
        return True
        
    except Exception as e:
        logger.error(f"[할당량 소진] DB 저장 실패: {e}")
        _db_conn.rollback()
        return False


def mark_current_account_exhausted():
    """
    현재 계정을 DB에 할당량 소진으로 표시 (get_current_account_email 기준)
    """
    current_email = get_current_account_email()
    return mark_account_exhausted_by_email(current_email)


def get_current_account_name():
    """
    현재 사용 중인 계정 이름 반환
    
    Returns:
        str: 현재 계정 이름 또는 None
    """
    if not USER_GEMINI_DIR.exists():
        return None
    
    # .gemini 폴더 내부의 파일 패턴으로 계정 식별 시도
    # (실제로는 폴더 이름으로 추적하는 것이 더 정확)
    return "현재 계정"


def switch_to_account(account_path):
    """
    지정된 Gemini 계정으로 전환
    
    Args:
        account_path: 전환할 계정 폴더 경로
    
    Returns:
        bool: 성공 여부
    """
    try:
        account_name = account_path.name
        logger.info(f"[계정 전환] {account_name}로 전환 시도")
        
        # 1. 기존 .gemini 폴더 삭제
        if USER_GEMINI_DIR.exists():
            logger.info(f"[계정 전환] 기존 폴더 삭제: {USER_GEMINI_DIR}")
            shutil.rmtree(USER_GEMINI_DIR)
        
        # 2. 새 계정 폴더 복사
        logger.info(f"[계정 전환] 새 계정 복사: {account_path} -> {USER_GEMINI_DIR}")
        shutil.copytree(account_path, USER_GEMINI_DIR)
        
        logger.info(f"[계정 전환] ✅ {account_name}로 전환 완료")
        return True
        
    except Exception as e:
        logger.error(f"[계정 전환] ❌ 실패: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def get_next_account(current_index):
    """
    다음 계정 인덱스 반환
    
    Args:
        current_index: 현재 계정 인덱스
    
    Returns:
        int: 다음 계정 인덱스, 모든 계정을 사용했으면 -1
    """
    available_accounts = get_available_accounts()
    
    if current_index + 1 < len(available_accounts):
        return current_index + 1
    else:
        return -1  # 모든 계정 사용 완료


def initialize_first_account():
    """
    첫 번째 계정으로 초기화
    
    Returns:
        tuple: (성공 여부, 계정 인덱스)
    """
    available_accounts = get_available_accounts()
    
    if not available_accounts:
        logger.error("[계정 초기화] 사용 가능한 계정이 없습니다!")
        return False, -1
    
    first_account = available_accounts[0]
    success = switch_to_account(first_account)
    
    if success:
        logger.info(f"[계정 초기화] ✅ 첫 번째 계정으로 초기화 완료: {first_account.name}")
        return True, 0
    else:
        logger.error("[계정 초기화] ❌ 첫 번째 계정 초기화 실패")
        return False, -1


def rotate_to_next_account(current_index):
    """
    다음 계정으로 로테이션
    
    Args:
        current_index: 현재 계정 인덱스
    
    Returns:
        tuple: (성공 여부, 새 계정 인덱스)
    """
    available_accounts = get_available_accounts()
    
    if current_index < 0 or current_index >= len(available_accounts):
        logger.error(f"[계정 로테이션] 잘못된 계정 인덱스: {current_index}")
        return False, -1
    
    next_index = get_next_account(current_index)
    
    if next_index == -1:
        logger.warning(f"[계정 로테이션] ⚠️ 모든 계정({len(available_accounts)}개) 사용 완료!")
        return False, -1
    
    next_account = available_accounts[next_index]
    success = switch_to_account(next_account)
    
    if success:
        logger.info(f"[계정 로테이션] ✅ 계정 전환 완료: {current_index} -> {next_index} ({next_account.name})")
        return True, next_index
    else:
        logger.error(f"[계정 로테이션] ❌ 계정 전환 실패: {next_index}")
        return False, current_index


def get_account_info(account_index):
    """
    계정 정보 반환
    
    Args:
        account_index: 계정 인덱스
    
    Returns:
        dict: 계정 정보
    """
    available_accounts = get_available_accounts()
    
    if account_index < 0 or account_index >= len(available_accounts):
        return {
            'index': account_index,
            'name': 'Unknown',
            'total_accounts': len(available_accounts),
            'remaining_accounts': 0
        }
    
    account = available_accounts[account_index]
    
    return {
        'index': account_index,
        'name': account.name,
        'total_accounts': len(available_accounts),
        'remaining_accounts': len(available_accounts) - account_index - 1
    }


def set_db_connection(conn):
    """
    DB 연결 설정 (외부에서 주입)
    
    Args:
        conn: DB 연결 객체
    """
    global _db_conn
    _db_conn = conn


def get_account_id_by_name(account_name):
    """
    계정 이름으로 DB의 account_id 조회
    
    Args:
        account_name: 계정 이름
    
    Returns:
        int: account_id 또는 None
    """
    if not _db_conn:
        return None
    
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id FROM gemini_accounts WHERE account_name = %s",
            (account_name,)
        )
        result = cursor.fetchone()
        cursor.close()
        
        return result['id'] if result else None
    except Exception as e:
        logger.error(f"[DB] 계정 ID 조회 실패: {e}")
        return None


def check_account_quota_exceeded(account_index):
    """
    계정의 할당량 소진 여부 DB에서 확인
    
    Args:
        account_index: 계정 인덱스
    
    Returns:
        tuple: (is_exceeded, request_count, quota_limit, remaining)
    """
    if not _db_conn:
        return False, 0, 1000, 1000
    
    try:
        available_accounts = get_available_accounts()
        if account_index < 0 or account_index >= len(available_accounts):
            return False, 0, 1000, 1000
        
        account = available_accounts[account_index]
        account_id = get_account_id_by_name(account.name)
        
        if not account_id:
            logger.warning(f"[할당량 체크] 계정 ID를 찾을 수 없음: {account.name}")
            return False, 0, 1000, 1000
        
        cursor = db.cursor(dictionary=True)
        today = datetime.now(timezone(timedelta(hours=9))).date()
        
        # 오늘의 할당량 사용 현황 조회
        cursor.execute('''
            SELECT 
                ga.daily_quota_limit,
                COALESCE(gqu.request_count, 0) as request_count,
                COALESCE(gqu.is_quota_exceeded, FALSE) as is_quota_exceeded
            FROM gemini_accounts ga
            LEFT JOIN gemini_quota_usage gqu ON ga.id = gqu.account_id AND gqu.usage_date = %s
            WHERE ga.id = %s
        ''', (today, account_id))
        
        result = cursor.fetchone()
        cursor.close()
        
        if not result:
            return False, 0, 1000, 1000
        
        quota_limit = result['daily_quota_limit'] or 1000
        request_count = result['request_count']
        is_exceeded = result['is_quota_exceeded'] or (request_count >= quota_limit)
        remaining = max(0, quota_limit - request_count)
        
        logger.info(f"[할당량 체크] {account.name}: {request_count}/{quota_limit} (남은: {remaining})")
        
        return is_exceeded, request_count, quota_limit, remaining
        
    except Exception as e:
        logger.error(f"[할당량 체크] 실패: {e}")
        return False, 0, 1000, 1000


def get_next_available_account(current_index):
    """
    할당량이 남아있는 다음 계정 찾기
    
    Args:
        current_index: 현재 계정 인덱스
    
    Returns:
        int: 다음 사용 가능한 계정 인덱스, 없으면 -1
    """
    available_accounts = get_available_accounts()
    
    # 현재 계정 다음부터 순회
    for i in range(current_index + 1, len(available_accounts)):
        is_exceeded, _, _, remaining = check_account_quota_exceeded(i)
        if not is_exceeded and remaining > 0:
            logger.info(f"[다음 계정 찾기] {i}번 계정 사용 가능: {available_accounts[i].name}")
            return i
    
    logger.warning(f"[다음 계정 찾기] 사용 가능한 계정 없음 (현재: {current_index})")
    return -1


def log_quota_event(account_index, event_type, cve_code=None, poc_link=None, error_message=None, conn=None):
    """
    할당량 사용 이벤트를 DB에 기록 (gemini_quota_usage 테이블 사용)
    
    Args:
        account_index: 사용 안 함 (호환성 유지)
        event_type: 'success', 'failed', 'quota_exceeded', 'rate_limit', 'account_switched'
        cve_code: CVE 코드
        poc_link: POC 링크
        error_message: 오류 메시지
        conn: DB 연결 (권장: run_ai_analysis 워커는 자신의 conn 전달. 없으면 _db_conn 사용)
    """
    db = conn if conn is not None else _db_conn
    if not db:
        logger.warning("[DB 로그] DB 연결 없음 (conn, _db_conn 모두 None)")
        return
    
    try:
        # 현재 계정 이메일 확인
        current_email = get_current_account_email()
        if not current_email:
            logger.warning(f"[DB 로그] 현재 계정 확인 실패")
            return
        
        # 계정 이메일을 DB 저장 형태로 변환
        db_account_name = ACCOUNT_EMAIL_MAP.get(current_email, current_email)
        logger.info(f"[DB 로그] 이메일 변환: {current_email} -> {db_account_name}")
        
        cursor = db.cursor(dictionary=True)
        today = datetime.now(timezone(timedelta(hours=9))).date()
        
        # gemini_accounts 테이블에서 계정 ID 조회 (account_name 또는 account_email로 매칭)
        # account_name: .gemini_xxx, account_email: xxx@gmail.com 형태로 저장될 수 있음
        # 이메일 정규화: shinhands.gpt@gmail.com <-> shinhands_gpt@gmail.com (점↔언더스코어)
        email_normalized = current_email.replace('.', '_') if '@' in current_email else current_email
        account_name_from_email = '.gemini_' + email_normalized.split('@')[0] if '@' in current_email else current_email
        cursor.execute('''
            SELECT id, daily_quota_limit FROM gemini_accounts 
            WHERE account_name = %s OR account_email = %s OR account_email = %s
               OR account_name = %s
            LIMIT 1
        ''', (db_account_name, current_email, email_normalized, account_name_from_email))
        
        account_result = cursor.fetchone()
        
        if not account_result:
            logger.warning(f"[DB 로그] gemini_accounts에 계정 없음: {current_email} (시도: account_name={db_account_name}, account_email={current_email})")
            cursor.close()
            return
        
        account_id = account_result['id']
        daily_quota_limit = account_result['daily_quota_limit'] or 1500
        
        # gemini_quota_usage 테이블에서 오늘 사용량 조회
        cursor.execute('''
            SELECT request_count, success_count, failed_count, is_quota_exceeded
            FROM gemini_quota_usage 
            WHERE account_id = %s AND usage_date = %s
        ''', (account_id, today))
        
        usage_result = cursor.fetchone()
        
        if not usage_result:
            # 오늘 첫 사용이면 새 레코드 생성
            cursor.execute('''
                INSERT INTO gemini_quota_usage 
                (account_id, usage_date, request_count, success_count, failed_count, is_quota_exceeded, created_at, updated_at)
                VALUES (%s, %s, 0, 0, 0, FALSE, NOW(), NOW())
            ''', (account_id, today))
            logger.info(f"[DB 로그] 새 사용량 레코드 생성: {current_email}")
            current_request_count = 0
            current_success_count = 0
            current_failed_count = 0
        else:
            current_request_count = usage_result['request_count']
            current_success_count = usage_result['success_count']
            current_failed_count = usage_result['failed_count']
        
        # 이벤트 타입에 따른 처리
        if event_type == 'success':
            cursor.execute('''
                UPDATE gemini_quota_usage 
                SET request_count = request_count + 1,
                    success_count = success_count + 1,
                    last_used_at = NOW(),
                    updated_at = NOW()
                WHERE account_id = %s AND usage_date = %s
            ''', (account_id, today))
            logger.info(f"[DB 로그] 분석 성공 기록: {current_email} ({current_request_count + 1}/{daily_quota_limit})")
        
        elif event_type == 'failed':
            cursor.execute('''
                UPDATE gemini_quota_usage 
                SET request_count = request_count + 1,
                    failed_count = failed_count + 1,
                    last_used_at = NOW(),
                    updated_at = NOW()
                WHERE account_id = %s AND usage_date = %s
            ''', (account_id, today))
            logger.info(f"[DB 로그] 분석 실패 기록: {current_email} ({current_request_count + 1}/{daily_quota_limit})")
        
        elif event_type == 'quota_exceeded' or event_type == 'rate_limit':
            cursor.execute('''
                UPDATE gemini_quota_usage 
                SET is_quota_exceeded = TRUE,
                    quota_exceeded_at = NOW(),
                    updated_at = NOW()
                WHERE account_id = %s AND usage_date = %s
            ''', (account_id, today))
            logger.warning(f"[DB 로그] 할당량 초과 기록: {current_email}")
        
        elif event_type == 'account_switched':
            logger.info(f"[DB 로그] 계정 전환: {current_email}")
        
        # gemini_quota_events 테이블에 이벤트 로그 기록
        cursor.execute('''
            INSERT INTO gemini_quota_events 
            (account_id, event_type, cve_code, poc_link, error_message, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        ''', (account_id, event_type, cve_code, poc_link, error_message))
        
        db.commit()
        cursor.close()
        
    except Exception as e:
        logger.error(f"[DB 로그] 실패: {e}")
        if db:
            db.rollback()


# 테스트 코드
if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
    
    print("="*80)
    print("Gemini 계정 관리자 테스트")
    print("="*80)
    
    # 사용 가능한 계정 확인
    accounts = get_available_accounts()
    print(f"\n사용 가능한 계정: {len(accounts)}개")
    for i, acc in enumerate(accounts):
        print(f"  [{i}] {acc.name}")
    
    # 첫 번째 계정으로 초기화 테스트
    print("\n" + "="*80)
    print("첫 번째 계정으로 초기화 테스트")
    print("="*80)
    success, index = initialize_first_account()
    
    if success:
        info = get_account_info(index)
        print(f"\n현재 계정 정보:")
        print(f"  인덱스: {info['index']}")
        print(f"  이름: {info['name']}")
        print(f"  전체 계정: {info['total_accounts']}개")
        print(f"  남은 계정: {info['remaining_accounts']}개")

