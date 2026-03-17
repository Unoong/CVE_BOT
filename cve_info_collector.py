"""
CVE 정보 수집 모듈 (CVE API)
"""
import requests
import json
from datetime import datetime
from logger import log_print
from translator import translate_to_korean


def get_cve_info(cve_code):
    """
    CVE API에서 CVE 정보 수집
    
    Args:
        cve_code: CVE 코드 (예: CVE-2025-52970)
    
    Returns:
        dict: 파싱된 CVE 정보 또는 None
    """
    url = f"https://cve.circl.lu/api/cve/{cve_code}"
    
    try:
        log_print(f"[CVE API] {cve_code} 정보 조회 중...", 'info')
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # 응답 데이터 검증
            if not data or not isinstance(data, dict):
                log_print(f"[CVE API] {cve_code} 잘못된 응답 형식: {type(data)}", 'warning')
                log_print(f"[CVE API] 응답 내용 샘플: {str(data)[:200]}", 'debug')
                return None
            
            # 응답 구조 확인 (디버깅용)
            log_print(f"[CVE API] 응답 키: {list(data.keys())}", 'debug')
            
            # CVE 정보 파싱
            cve_info = parse_cve_data(data, cve_code)
            
            if cve_info:
                log_print(f"[CVE API] {cve_code} 정보 수집 성공", 'info')
                return cve_info
            else:
                log_print(f"[CVE API] {cve_code} 데이터 파싱 실패", 'warning')
                return None
        elif response.status_code == 404:
            log_print(f"[CVE API] {cve_code} 정보를 찾을 수 없습니다 (404)", 'warning')
            return None
        else:
            log_print(f"[CVE API] API 요청 실패 ({response.status_code}): {cve_code}", 'error')
            return None
            
    except requests.exceptions.Timeout:
        log_print(f"[CVE API] 시간 초과: {cve_code}", 'error')
        return None
    except Exception as e:
        log_print(f"[CVE API] 오류 발생: {e}", 'error')
        return None


def parse_cve_data(data, cve_code):
    """
    CVE API 응답 데이터 파싱
    
    Args:
        data: API 응답 JSON 데이터
        cve_code: CVE 코드
    
    Returns:
        dict: 파싱된 데이터
    """
    try:
        # 데이터 검증
        if not data or not isinstance(data, dict):
            log_print(f"[CVE API] {cve_code} - 데이터가 None이거나 dict가 아님", 'warning')
            return None
        
        cve_metadata = data.get('cveMetadata', {})
        containers = data.get('containers', {})
        cna = containers.get('cna', {}) if containers else {}
        
        # 기본 정보
        cve_info = {
            'collect_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'CVE_Code': cve_metadata.get('cveId', cve_code),
            'state': cve_metadata.get('state', ''),
            'dateReserved': cve_metadata.get('dateReserved', ''),
            'datePublished': cve_metadata.get('datePublished', ''),
            'dateUpdated': cve_metadata.get('dateUpdated', ''),
        }
        
        # Product 정보 (여러 개일 수 있음)
        affected = cna.get('affected', [])
        products = []
        effect_versions = []
        
        for item in affected:
            product = item.get('product', '')
            if product:
                products.append(product)
            
            # affected 상태인 버전만 수집
            versions = item.get('versions', [])
            for ver in versions:
                if ver.get('status') == 'affected':
                    version = ver.get('version', '')
                    less_than = ver.get('lessThanOrEqual', '')
                    if version:
                        if less_than:
                            effect_versions.append(f"{version} - {less_than}")
                        else:
                            effect_versions.append(version)
        
        cve_info['product'] = ', '.join(products) if products else ''
        
        # Descriptions (영문 → 한국어 번역)
        descriptions = cna.get('descriptions', [])
        desc_text = ''
        for desc in descriptions:
            if desc.get('lang') == 'en':
                desc_text = desc.get('value', '')
                break
        
        if desc_text:
            log_print(f"[CVE API] 설명 번역 중...", 'debug')
            cve_info['descriptions'] = translate_to_korean(desc_text)
        else:
            cve_info['descriptions'] = ''
        
        # Effect versions
        cve_info['effect_version'] = ', '.join(effect_versions) if effect_versions else ''
        
        # Problem Types (CWE)
        problem_types = cna.get('problemTypes', [])
        cwe_ids = []
        attack_types = []
        
        for problem in problem_types:
            descs = problem.get('descriptions', [])
            for desc in descs:
                cwe_id = desc.get('cweId', '')
                attack_type = desc.get('description', '')
                
                if cwe_id:
                    cwe_ids.append(cwe_id)
                if attack_type:
                    attack_types.append(attack_type)
        
        cve_info['cweId'] = ', '.join(cwe_ids) if cwe_ids else ''
        cve_info['Attak_Type'] = ', '.join(attack_types) if attack_types else ''
        
        # CVSS Metrics
        metrics = cna.get('metrics', [])
        cvss_data = {}
        
        for metric in metrics:
            if 'cvssV3_1' in metric:
                cvss_data = metric.get('cvssV3_1', {})
                break
        
        cve_info['CVSS_Score'] = cvss_data.get('baseScore', '')
        cve_info['CVSS_Vertor'] = cvss_data.get('attackVector', '')
        cve_info['CVSS_Serverity'] = cvss_data.get('baseSeverity', '')
        cve_info['CVSS_vertorString'] = cvss_data.get('vectorString', '')
        
        # Solutions (영문 → 한국어 번역)
        solutions = cna.get('solutions', [])
        solution_text = ''
        for sol in solutions:
            if sol.get('lang') == 'en':
                solution_text = sol.get('value', '')
                break
        
        if solution_text:
            log_print(f"[CVE API] 솔루션 번역 중...", 'debug')
            cve_info['solutions'] = translate_to_korean(solution_text)
        else:
            cve_info['solutions'] = ''
        
        # Response data (전체 JSON)
        cve_info['Response_data'] = json.dumps(data, ensure_ascii=False)
        
        return cve_info
        
    except Exception as e:
        log_print(f"[CVE API] 데이터 파싱 오류: {e}", 'error')
        return None


def save_cve_info_to_file(response_data, cve_code, folder_path):
    """
    CVE 정보를 파일로 저장 (압축 해제된 실제 폴더에 저장)
    
    Args:
        response_data: CVE API 응답 데이터 (JSON 문자열)
        cve_code: CVE 코드
        folder_path: 저장할 폴더 경로
    
    Returns:
        bool: 성공 여부
    """
    try:
        import os
        
        # 압축 해제된 폴더 찾기 (GitHub ZIP은 보통 reponame-branch/ 폴더를 포함)
        actual_folder = folder_path
        
        if os.path.isdir(folder_path):
            # 폴더 내부에 하나의 디렉토리만 있는지 확인
            items = os.listdir(folder_path)
            dirs = [d for d in items if os.path.isdir(os.path.join(folder_path, d))]
            
            # 하위 디렉토리가 하나만 있으면 그 안에 저장
            if len(dirs) == 1:
                actual_folder = os.path.join(folder_path, dirs[0])
                log_print(f"[CVE API] 압축 해제된 폴더 발견: {dirs[0]}", 'debug')
        
        file_path = os.path.join(actual_folder, 'CVE_Info.txt')
        
        with open(file_path, 'w', encoding='utf-8') as f:
            # JSON 예쁘게 포맷팅
            data = json.loads(response_data)
            f.write(json.dumps(data, indent=2, ensure_ascii=False))
        
        log_print(f"[CVE API] CVE 정보 파일 저장: {file_path}", 'info')
        return True
        
    except Exception as e:
        log_print(f"[CVE API] 파일 저장 오류: {e}", 'error')
        return False

