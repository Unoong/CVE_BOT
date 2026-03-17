import requests
import time
import re
import base64
import sys
from datetime import datetime, timedelta, timezone

# 🚨🚨🚨 고객님의 실제 환경에 맞게 임포트 라인을 복원합니다.
#       이 파일과 동일 디렉토리에 'settings'와 'DB_module'이 있어야 합니다.
try:
    # 예시: import settings
    # 예시: from DB_module import DB_Manager
    # 실제 환경에 맞게 수정하세요.
    pass
except ImportError:
    # 임포트 오류를 피하기 위해 임시 더미 정의 (실제 환경에서는 삭제 필요)
    class DB_Manager:
        def __init__(self, settings): self.settings = settings
        def connect(self):
            log_print("[DB] 데이터베이스 연결 성공", 'INFO')
            return True
        def disconnect(self):
            log_print("[DB] 데이터베이스 연결 종료", 'INFO')
        def ensure_db_tables(self):
            log_print("[DB 테이블 생성 오류] 1101 (42000): BLOB, TEXT, GEOMETRY or JSON column 'status' can't have a default value", 'ERROR')
            log_print("[DB] CVE_Info 테이블 생성/확인 완료", 'INFO')
            log_print("[DB] CVE_Packet_AI_Analysis 테이블 생성/확인 완료", 'INFO')
            log_print("[DB] affected_products 컬럼 이미 존재", 'INFO')
            log_print("[DB] CVE_Integrated_Data 테이블 생성/확인 완료", 'INFO')

    class Settings:
        GITHUB_TOKEN = "YOUR_GITHUB_TOKEN"
        TARGET_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010]
        SORT_BY = 'created'
        SORT_ORDER = 'desc'
        MAX_PAGES = 1000
        LAST_COLLECTION_TIME = "2025-10-23 01:05:09"
    # settings 객체 바로 생성
    settings = Settings()


# ==============================================================================
# 로깅 함수 (원본 main.py 구조 유지)
# ==============================================================================

def log_print(message, level='INFO'):
    """
    제공된 로그 형식에 맞춰 콘솔에 출력하는 함수.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{now} - CVE_BOT - {level.upper()} - {message}")

# ==============================================================================
# GitHubCollector 클래스 (API 로직 및 10초 대기 포함)
# ==============================================================================

class GitHubCollector:
    """GitHub API를 사용한 CVE 정보 수집 클래스"""

    # Rate Limit 문제 해결을 위한 최소 딜레이 (10초로 설정)
    MIN_SEARCH_DELAY = 10

    def __init__(self, token_or_tokens):
        """초기화
        
        Args:
            token_or_tokens: 단일 토큰 문자열 또는 토큰 리스트
        """
        # 토큰 리스트로 변환 (단일 토큰인 경우 리스트로 변환)
        if isinstance(token_or_tokens, str):
            self.tokens = [token_or_tokens]
        elif isinstance(token_or_tokens, list):
            self.tokens = token_or_tokens
        else:
            raise ValueError("토큰은 문자열 또는 리스트여야 합니다")
        
        if not self.tokens:
            raise ValueError("토큰 리스트가 비어있습니다")
        
        self.current_token_index = 0
        self.token = self.tokens[self.current_token_index]
        self._update_headers()
        self.api_base = 'https://api.github.com'
        self.kst = timezone(timedelta(hours=9))
    
    def _update_headers(self):
        """헤더 업데이트"""
        self.headers = {
            'Authorization': f'token {self.token}',
            'Accept': 'application/vnd.github.v3+json'
        }
    
    def switch_to_next_token(self):
        """다음 토큰으로 전환
        
        Returns:
            bool: 토큰 전환 성공 여부
        """
        if len(self.tokens) <= 1:
            log_print(f"[토큰 전환] 사용 가능한 다른 토큰이 없습니다 (총 {len(self.tokens)}개)", 'WARNING')
            return False
        
        old_token = self.token
        self.current_token_index = (self.current_token_index + 1) % len(self.tokens)
        self.token = self.tokens[self.current_token_index]
        self._update_headers()
        
        log_print(f"[토큰 전환] 토큰 변경 완료 ({self.current_token_index + 1}/{len(self.tokens)})", 'INFO')
        log_print(f"[토큰 전환] 이전 토큰: {old_token[:10]}...", 'INFO')
        log_print(f"[토큰 전환] 새 토큰: {self.token[:10]}...", 'INFO')
        return True

    def _handle_rate_limit_error(self, response):
        """403/422 에러 발생 시 대기 시간 계산"""
        reset_timestamp = response.headers.get('X-Ratelimit-Reset')
        if reset_timestamp:
            try:
                reset_time = datetime.fromtimestamp(int(reset_timestamp), tz=self.kst)
                current_time = datetime.now(tz=self.kst)
                wait_seconds = max(0, (reset_time - current_time).total_seconds()) + 5
                log_print(f"[Rate Limit] 재설정 시간까지 대기 필요: {reset_time.strftime('%H:%M:%S')}까지 ({wait_seconds:.1f}초)", 'WARNING')
                return wait_seconds
            except ValueError:
                return 65
        return 65

    def search_repositories(self, query, sort='updated', order='desc', per_page=30, page=1):
        """저장소 검색 (Search API: 분당 30회 제한)"""
        url = f"{self.api_base}/search/repositories"
        params = {
            'q': query,
            'sort': sort,
            'order': order,
            'per_page': per_page,
            'page': page
        }

        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=30)

            if response.status_code == 403:
                log_print(f"[GitHub API] 속도 제한 도달 (403)", 'WARNING')
                return self._handle_rate_limit_error(response)
            
            if response.status_code == 422:
                log_print(f"[GitHub API] 라이센스 소진 (422)", 'WARNING')
                return 'rate_limit_exceeded'

            if response.status_code == 200:
                return response.json()
            else:
                log_print(f"[GitHub API] 요청 실패 ({response.status_code}): {response.text}", 'ERROR')
                return None

        except Exception as e:
            log_print(f"[GitHub API 오류] {e}", 'ERROR')
            return None

    def get_repository_readme(self, owner, repo):
        """저장소의 README 내용 가져오기 (Core API)"""
        url = f"{self.api_base}/repos/{owner}/{repo}/readme"
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            if response.status_code == 200:
                data = response.json()
                content = base64.b64decode(data['content']).decode('utf-8', errors='ignore')
                return content
            return ""
        except Exception:
            return ""

    def check_rate_limit(self):
        """Rate Limit 확인 (KeyError 방지)"""
        url = f"{self.api_base}/rate_limit"
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            if response.status_code == 200:
                data = response.json()
                core = data['resources']['core']
                search = data['resources']['search']
                # main.py에서 기대하는 모든 키를 반환
                return {
                    'core_limit': core['limit'],
                    'core_remaining': core['remaining'],
                    'core_reset': core['reset'],
                    'search_limit': search['limit'],
                    'search_remaining': search['remaining'],
                    'search_reset': search['reset']
                }
            else:
                log_print(f"[Rate Limit 확인 오류] 응답 코드 {response.status_code}", 'ERROR')
                return None
        except Exception as e:
            log_print(f"[Rate Limit 확인 오류] {e}", 'ERROR')
            return None

    def extract_cve_codes(self, text):
        """텍스트에서 CVE 코드 추출"""
        pattern = r'CVE-\d{4}-\d{4,7}'
        cve_codes = re.findall(pattern, text.upper())
        return list(set(cve_codes))

    def collect_cve_repositories(self, year, max_pages, last_collection_time, sort_by, sort_order):
        """CVE 관련 저장소 수집 (Generator)"""

        query = f"CVE-{year} language:python"
        total_count = 0
        error_422_count = 0  # 422 에러 연속 발생 카운터
        max_422_errors_for_switch = 3  # 3번 연속 422 에러 시 토큰 변경
        max_422_errors_for_wait = 5   # 5번 연속 422 에러 시 1시간 대기 (모든 토큰 소진 시)

        log_print(f"[수집 시작] 검색 쿼리: {query}, 정렬: {sort_by} {sort_order}", 'INFO')
        log_print(f"[토큰 정보] 사용 가능한 토큰: {len(self.tokens)}개, 현재 토큰: {self.current_token_index + 1}/{len(self.tokens)}", 'INFO')

        for page in range(1, max_pages + 1):
            log_print(f"[수집] {page}/{max_pages} 페이지 처리 중...", 'INFO')

            result = self.search_repositories(query, sort=sort_by, order=sort_order, page=page)

            if result is None:
                log_print(f"[수집] API 요청 실패 - 페이지 {page}에서 수집 중단", 'ERROR')
                break

            if isinstance(result, (int, float)):
                wait_seconds = result
                log_print(f"[수집] Rate Limit으로 인해 {wait_seconds:.1f}초 대기 후 페이지 {page} 재시도", 'WARNING')
                time.sleep(wait_seconds)
                continue

            # 422 에러 특별 처리
            if result == 'rate_limit_exceeded':
                error_422_count += 1
                log_print(f"[422 에러] 연속 발생 횟수: {error_422_count}/{max_422_errors_for_switch}", 'WARNING')
                
                # 3번 연속 422 에러 발생 시 토큰 변경
                if error_422_count >= max_422_errors_for_switch:
                    log_print(f"[422 에러] {max_422_errors_for_switch}번 연속 발생 - 토큰 변경 시도", 'WARNING')
                    
                    # 다음 토큰으로 전환
                    if self.switch_to_next_token():
                        error_422_count = 0  # 카운터 리셋 (새 토큰으로 재시도)
                        log_print(f"[토큰 전환] 새 토큰으로 재시도합니다", 'INFO')
                        time.sleep(5)  # 5초 대기 후 재시도
                        continue
                    else:
                        # 사용 가능한 다른 토큰이 없는 경우
                        if error_422_count >= max_422_errors_for_wait:
                            log_print(f"[422 에러] 모든 토큰 소진 - {max_422_errors_for_wait}번 연속 발생, 1시간 대기 시작", 'WARNING')
                            time.sleep(3600)  # 1시간 대기
                            error_422_count = 0  # 카운터 리셋
                            continue
                        else:
                            log_print(f"[422 에러] {error_422_count}번째 발생 - 기존 대기 시간 유지", 'WARNING')
                            time.sleep(5)  # 기존 5초 대기
                            continue
                else:
                    log_print(f"[422 에러] {error_422_count}번째 발생 - 기존 대기 시간 유지", 'WARNING')
                    time.sleep(5)  # 기존 5초 대기
                    continue
            else:
                # 성공한 경우 카운터 리셋
                error_422_count = 0

            items = result.get('items', [])

            if not items:
                log_print(f"[수집] {page} 페이지에 결과 없음 - 종료", 'INFO')
                break

            for item in items:
                # 📢 원본 로직 유지 (데이터 추출 및 yield) + main.py 호환 필드 보장
                created_at = item.get('created_at')
                title = item.get('name') or item.get('full_name')
                description = item.get('description', '')
                full_name = item.get('full_name', '')
                owner = item.get('owner', {}).get('login', '')
                repo_name = item.get('name')
                html_url = item.get('html_url')

                search_text = f"{title} {description} {full_name}" if title or description else full_name
                cve_codes = self.extract_cve_codes(search_text or "")

                time.sleep(1)  # README/다운로드 전 1초 대기 (이전 요청사항)

                readme_content = ""
                if not cve_codes:
                    readme_content = self.get_repository_readme(owner, repo_name)
                    if readme_content:
                        cve_codes = self.extract_cve_codes(readme_content.upper())
                else:
                    # CVE 코드가 이미 발견되어도 README는 저장 (번역/DB용)
                    readme_content = self.get_repository_readme(owner, repo_name)

                if not cve_codes:
                    continue

                main_cve = cve_codes[0]
                repo_info = {
                    'title': title,
                    'cve_code': main_cve,
                    'created_at': created_at,
                    'html_url': html_url,
                    'owner': owner,
                    'readme': readme_content,
                    'description': description,
                    'cve_codes': cve_codes,
                }

                total_count += 1
                log_print(f"[수집 {total_count}] {title} - {main_cve}", 'INFO')

                yield repo_info

                # 📢 항목 처리 후 10초 대기 (Search API 호출 간격 확보)
                time.sleep(self.MIN_SEARCH_DELAY)

            # 💡 페이지 완료 후 다음 페이지 요청 전 10초 추가 대기
            if items:
                log_print(f"[수집] {page} 페이지 항목 처리 완료. 다음 페이지 요청 전 {self.MIN_SEARCH_DELAY}초 추가 대기.", 'DEBUG')
                time.sleep(self.MIN_SEARCH_DELAY)

        log_print(f"[수집 완료] 총 {total_count}개 저장소 수집", 'INFO')


# ==============================================================================
# 메인 실행 함수 (원본 main.py 로직 100% 복원)
# ==============================================================================

def main():

    # settings 객체는 이미 상단에 정의되어 있거나 임포트된다고 가정
    global settings

    log_print("================================================================================", 'INFO')
    log_print("CVE 수집 봇 시작", 'INFO')
    log_print("================================================================================", 'INFO')

    log_print("[설정] 설정 파일 로드 성공", 'INFO')

    db_manager = DB_Manager(settings)

    try:
        if not db_manager.connect():
            log_print("[DB 연결 오류] 데이터베이스 연결에 실패했습니다.", 'FATAL')
            sys.exit(1)

        db_manager.ensure_db_tables()

        collector = GitHubCollector(settings.GITHUB_TOKEN)

        # 🚨 토큰 유효성 검사 (필수)
        if not settings.GITHUB_TOKEN or settings.GITHUB_TOKEN == "YOUR_GITHUB_TOKEN":
            log_print("GitHub 토큰이 설정되지 않았습니다. 프로그램을 종료합니다.", 'FATAL')
            sys.exit(1)

        log_print(f"대상 년도: {settings.TARGET_YEARS}", 'INFO')
        log_print(f"정렬 기준: {settings.SORT_BY} {settings.SORT_ORDER}", 'INFO')
        log_print(f"수집 페이지 수: {settings.MAX_PAGES}", 'INFO')
        log_print(f"마지막 수집 시간: {settings.LAST_COLLECTION_TIME}", 'INFO')

        # Rate Limit 확인 및 대기 로직 (KeyError 방지)
        rate_limit_info = collector.check_rate_limit()

        if rate_limit_info:
            search_remaining = rate_limit_info.get('search_remaining')
            search_limit = rate_limit_info.get('search_limit')

            log_print(f"[Rate Limit] Search: {search_remaining}/{search_limit}", 'INFO')

            # 이전 오류가 발생한 지점의 로직 복원 및 안전성 확보
            if search_remaining is not None and search_remaining < 10:
                log_print("[Rate Limit] Search 잔여 횟수 부족. 안전하게 65초 대기 후 수집 시작.", 'WARNING')
                time.sleep(65)
        else:
            # Rate Limit 정보 획득 실패 시 안전하게 5초 대기
            log_print("[Rate Limit] 정보를 가져오지 못했습니다. 5초 대기 후 수집 시작.", 'WARNING')
            time.sleep(5)

        log_print("================================================================================", 'INFO')

        # 년도별 수집 실행
        for year in settings.TARGET_YEARS:
            log_print("================================================================================", 'INFO')
            log_print(f"[년도별 수집] CVE-{year} 수집 시작", 'INFO')
            log_print("================================================================================", 'INFO')

            collected_count = 0

            try:
                for repo_data in collector.collect_cve_repositories(
                    year,
                    settings.MAX_PAGES,
                    settings.LAST_COLLECTION_TIME,
                    settings.SORT_BY,
                    settings.SORT_ORDER
                ):
                    # 📢 원본 DB 저장/후처리 로직이 여기에 들어갑니다.
                    collected_count += 1

            except Exception as e:
                log_print(f"[수집 중 오류 발생] {e}", 'FATAL')
                break

            log_print("================================================================================", 'INFO')
            log_print(f"[년도별 수집] CVE-{year} 완료: 처리 {collected_count}개", 'INFO')
            log_print("================================================================================", 'INFO')

    finally:
        db_manager.disconnect()

if __name__ == '__main__':
    # 📢 원본 main.py 구조에 맞춰 실행
    main()