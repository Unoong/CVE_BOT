"""
파일 관리 모듈 (ZIP 다운로드 및 압축 해제)
"""
import os
import re
import zipfile
import requests
from logger import log_print


def _normalize_repo_token(value):
    """폴더/제목/레포명 비교용 정규화."""
    if not value:
        return ''
    return re.sub(r'[^a-z0-9]+', '', str(value).lower())


def _repo_slug_from_link(link):
    """GitHub URL에서 repository slug 추출."""
    if not link or 'github.com' not in str(link):
        return None
    parts = str(link).rstrip('/').split('/')
    if len(parts) < 2:
        return None
    return parts[-1] or None


def resolve_existing_poc_path(cve_code, title=None, link=None, base_path='CVE'):
    """
    DB에 '다운로드 실패' 등으로 남았어도 디스크에 PoC가 있으면 경로를 복구한다.

    Returns:
        str | None: 예) CVE\\CVE-2026-3854\\3 (os.path.join 형식)
    """
    if not cve_code:
        return None

    cve_root = os.path.join(base_path, cve_code)
    if not os.path.isdir(cve_root):
        return None

    needles = []
    for raw in (title, _repo_slug_from_link(link)):
        if not raw:
            continue
        base = _normalize_repo_token(raw)
        if not base:
            continue
        needles.extend([
            base,
            _normalize_repo_token(f'{raw}-main'),
            _normalize_repo_token(f'{raw}-master'),
        ])
    needles = [n for n in dict.fromkeys(needles) if n]
    if not needles:
        return None

    index_dirs = []
    for name in os.listdir(cve_root):
        full = os.path.join(cve_root, name)
        if os.path.isdir(full) and name.isdigit():
            index_dirs.append((int(name), full, name))
    index_dirs.sort(key=lambda x: x[0])

    for _, idx_full, idx_name in index_dirs:
        try:
            children = [
                c for c in os.listdir(idx_full)
                if os.path.isdir(os.path.join(idx_full, c))
            ]
        except OSError:
            continue

        for child in children:
            child_norm = _normalize_repo_token(child)
            for needle in needles:
                if needle in child_norm or child_norm in needle:
                    return os.path.join(base_path, cve_code, idx_name)

        # 하위 폴더가 1개뿐이고 slug가 포함되면 채택
        if len(children) == 1:
            only = _normalize_repo_token(children[0])
            for needle in needles:
                if needle and needle in only:
                    return os.path.join(base_path, cve_code, idx_name)

    return None


def download_and_extract_zip(url, cve_code, index, base_path='CVE'):
    """
    GitHub 저장소 ZIP 파일 다운로드 및 압축 해제
    
    Args:
        url: GitHub 저장소 URL
        cve_code: CVE 코드
        index: 저장 인덱스 (1-5)
        base_path: 기본 저장 경로
    
    Returns:
        str: 저장 경로 또는 None
    """
    try:
        # CVE 폴더 생성
        cve_folder = os.path.join(base_path, cve_code)
        if not os.path.exists(cve_folder):
            os.makedirs(cve_folder)
        
        # 인덱스별 폴더 생성
        target_folder = os.path.join(cve_folder, str(index))
        if not os.path.exists(target_folder):
            os.makedirs(target_folder)
        
        # ZIP 다운로드 URL 생성
        # GitHub URL에서 저장소 소유자와 이름 추출
        # 예: https://github.com/owner/repo -> https://github.com/owner/repo/archive/refs/heads/main.zip
        if 'github.com' in url:
            # URL 정규화
            repo_url = url.rstrip('/')
            
            # ZIP 다운로드 URL (main 또는 master 브랜치)
            zip_url_main = f"{repo_url}/archive/refs/heads/main.zip"
            zip_url_master = f"{repo_url}/archive/refs/heads/master.zip"
            
            # main 브랜치 시도
            zip_path = os.path.join(target_folder, 'repo.zip')
            success = download_file(zip_url_main, zip_path)
            
            # main이 실패하면 master 시도
            if not success:
                log_print(f"[다운로드] main 브랜치 실패, master 시도: {cve_code}", 'info')
                success = download_file(zip_url_master, zip_path)
            
            if not success:
                log_print(f"[다운로드] ZIP 다운로드 실패: {cve_code}", 'error')
                return None
            
            # ZIP 압축 해제
            try:
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(target_folder)
                log_print(f"[압축해제] 성공: {target_folder}", 'info')
                
                # ZIP 파일 삭제 (선택사항)
                os.remove(zip_path)
                
                return target_folder
            except zipfile.BadZipFile:
                log_print(f"[압축해제] 잘못된 ZIP 파일: {cve_code}", 'error')
                return None
        else:
            log_print(f"[다운로드] GitHub URL이 아닙니다: {url}", 'warning')
            return None
            
    except Exception as e:
        log_print(f"[파일 관리 오류] {e}", 'error')
        return None


def download_file(url, save_path):
    """
    파일 다운로드
    
    Args:
        url: 다운로드 URL
        save_path: 저장 경로
    
    Returns:
        bool: 성공 여부
    """
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            with open(save_path, 'wb') as f:
                f.write(response.content)
            log_print(f"[다운로드] 성공: {url}", 'debug')
            return True
        else:
            log_print(f"[다운로드] 실패 ({response.status_code}): {url}", 'debug')
            return False
    except Exception as e:
        log_print(f"[다운로드 오류] {e}", 'debug')
        return False


def get_next_index(cve_code, base_path='CVE'):
    """
    해당 CVE의 다음 저장 인덱스 반환
    
    Args:
        cve_code: CVE 코드
        base_path: 기본 저장 경로
    
    Returns:
        int: 다음 인덱스 (1-5) 또는 None (5개 초과)
    """
    cve_folder = os.path.join(base_path, cve_code)
    
    if not os.path.exists(cve_folder):
        return 1
    
    # 기존 폴더 확인
    existing_indices = []
    for item in os.listdir(cve_folder):
        item_path = os.path.join(cve_folder, item)
        if os.path.isdir(item_path) and item.isdigit():
            existing_indices.append(int(item))
    
    if not existing_indices:
        return 1
    
    max_index = max(existing_indices)
    
    if max_index >= 5:
        return None  # 5개 초과
    
    return max_index + 1

