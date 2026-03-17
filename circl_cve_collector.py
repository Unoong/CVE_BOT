"""
CIRCL Vulnerability-Lookup API CVE 수집 모듈

CIRCL (Computer Incident Response Center Luxembourg)의 
Vulnerability-Lookup API를 통해 최신 CVE 정보를 수집하고 DB에 저장합니다.

API 문서: https://vulnerability.circl.lu/
API 형식: CSAF (Common Security Advisory Framework) 2.0
"""

import requests
import json
import sys
import io
import logging
from logging.handlers import TimedRotatingFileHandler
import os
from datetime import datetime
from db_manager import get_db_connection, create_cve_info_table, check_cve_info_exists, insert_cve_info

def _setup_circl_logger() -> logging.Logger:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(base_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    logger = logging.getLogger('CIRCL_Collector')
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    file_handler = TimedRotatingFileHandler(
        os.path.join(logs_dir, 'circl_collector.log'),
        when='midnight',
        interval=1,
        backupCount=14,
        encoding='utf-8',
        utc=False
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.propagate = False
    return logger

logger = _setup_circl_logger()

# CIRCL Vulnerability-Lookup API 엔드포인트
API_BASE_URL = "https://vulnerability.circl.lu/api"
API_LAST_URL = f"{API_BASE_URL}/last"  # 최근 업데이트된 CVE

# 기본 설정
DEFAULT_LIMIT = 100  # 한 번에 가져올 CSAF 문서 개수 (최대 100 권장)


def load_config():
    """설정 파일 로드"""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[설정] 설정 파일 로드 실패: {e}")
        return None

        


def fetch_last_cves(limit=DEFAULT_LIMIT):
    """
    CIRCL API에서 최근 업데이트된 보안 권고문(CSAF) 목록을 가져옵니다.
    
    Args:
        limit (int): 가져올 문서 개수 (기본값: 100)
        
    Returns:
        list: CSAF 문서 리스트 또는 None
    """
    url = f"{API_LAST_URL}/{limit}"
    logger.info(f"[API 요청] {url}")
    
    try:
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"[API 성공] {len(data) if isinstance(data, list) else 0}개 CSAF 문서 수신")
            return data
        elif response.status_code == 429:
            logger.error("[API 실패] Rate Limit 초과 (429) - 잠시 후 다시 시도")
            return None
        else:
            logger.error(f"[API 실패] HTTP {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        logger.error(f"[네트워크 오류] {e}")
        return None
    except Exception as e:
        logger.error(f"[예외] {e}")
        return None


def extract_vendor_and_products(csaf_json):
    """
    CSAF의 product_tree와 publisher에서 vendor와 product 정보를 추출합니다.
    
    샘플 응답 기준:
    - document.publisher.name → Vendor (예: "Red Hat Product Security")
    - product_tree.branches[vendor].branches[product_family].name → Product Family
    - product_tree.branches[product_family].branches[product_name].name → Product Name
    
    Returns:
        tuple: (vendor_name, product_set)
    """
    vendor_name = None
    products = set()
    
    try:
        # 1️⃣ Vendor: document.publisher.name
        publisher = csaf_json.get('document', {}).get('publisher', {})
        vendor_name = publisher.get('name', '').replace(' Product Security', '').replace(' Security', '').strip()
        
        # 2️⃣ Products: product_tree.branches
        product_tree = csaf_json.get('product_tree', {})
        branches = product_tree.get('branches', [])
        
        for vendor_branch in branches:
            if vendor_branch.get('category') == 'vendor':
                # Vendor 이름 재확인
                if not vendor_name:
                    vendor_name = vendor_branch.get('name', '').replace(' Product Security', '').strip()
                
                # Product Family 탐색
                for product_family_branch in vendor_branch.get('branches', []):
                    if product_family_branch.get('category') == 'product_family':
                        family_name = product_family_branch.get('name', '')
                        if family_name:
                            # "Red Hat Enterprise Linux" 같은 제품군 이름
                            products.add(family_name)
                    
                    # Product Name 탐색
                    for product_name_branch in product_family_branch.get('branches', []):
                        if product_name_branch.get('category') == 'product_name':
                            prod_name = product_name_branch.get('name', '')
                            if prod_name:
                                # "Red Hat Enterprise Linux AppStream AUS (v.8.6)" 
                                # → "Red Hat Enterprise Linux AppStream"로 단순화
                                simplified = prod_name.split('(')[0].strip()
                                
                                # 너무 길면 핵심만 추출
                                if 'AppStream' in simplified:
                                    simplified = simplified.split('AppStream')[0].strip() + ' AppStream'
                                elif 'CodeReady' in simplified:
                                    simplified = simplified.split('CodeReady')[0].strip() + ' CodeReady Linux Builder'
                                
                                products.add(simplified)
                                
                                # 최대 5개까지만
                                if len(products) >= 5:
                                    break
    
    except Exception as e:
        logger.debug(f"[제품 정보 추출 오류] {e}")
    
    # 중복 제거 및 정리
    products = set([p for p in products if p and p != vendor_name])
    
    return vendor_name, products


def parse_csaf_to_cve_info(csaf_json):
    """
    CIRCL API의 CSAF JSON 데이터를 파싱하여 CVE_Info 테이블 형식으로 변환합니다.
    
    샘플 응답 구조:
    {
      "document": { "title", "publisher", "tracking": { "initial_release_date", "current_release_date" } },
      "product_tree": { "branches": [ vendor, product_family, product_name ] },
      "vulnerabilities": [
        {
          "cve": "CVE-2025-3887",
          "cwe": { "id": "CWE-121", "name": "..." },
          "discovery_date": "...",
          "release_date": "...",
          "notes": [ { "category": "description", "text": "..." } ],
          "scores": [ { "cvss_v3": { "baseScore", "baseSeverity", "vectorString", ... } } ],
          "remediations": [ { "category": "vendor_fix", "details", "url" } ]
        }
      ]
    }
    
    Args:
        csaf_json (dict): CIRCL API에서 받은 CSAF 데이터
        
    Returns:
        list: CVE_Info 테이블에 삽입할 데이터 딕셔너리 리스트
    """
    results = []
    
    # vulnerabilities 배열에서 CVE 추출
    vulnerabilities = csaf_json.get('vulnerabilities', [])
    
    if not vulnerabilities:
        return results
    
    # 제품 정보 추출 (모든 vulnerability에 공통)
    vendor_name, product_names = extract_vendor_and_products(csaf_json)
    
    # 날짜 정보 (document.tracking)
    tracking = csaf_json.get('document', {}).get('tracking', {})
    initial_release_date = tracking.get('initial_release_date')
    current_release_date = tracking.get('current_release_date')
    
    # 날짜 포맷 변환 (ISO 8601 → MySQL DATETIME)
    def convert_date(iso_date):
        if not iso_date:
            return None
        try:
            # "2025-06-13T05:27:20+00:00" → "2025-06-13 05:27:20"
            return iso_date.replace('T', ' ').split('+')[0].split('Z')[0].split('.')[0]
        except:
            return None
    
    date_published = convert_date(initial_release_date)
    date_updated = convert_date(current_release_date)
    
    # 각 vulnerability 처리
    for vuln in vulnerabilities:
        cve_info = {
            'collect_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'CVE_Code': None,
            'state': 'PUBLISHED',
            'dateReserved': None,
            'datePublished': date_published,
            'dateUpdated': date_updated,
            'product': None,
            'descriptions': None,
            'effect_version': None,
            'cweId': None,
            'Attak_Type': None,
            'CVSS_Score': None,
            'CVSS_Vertor': None,
            'CVSS_Serverity': None,
            'CVSS_vertorString': None,
            'solutions': None,
            'Response_data': json.dumps(csaf_json, ensure_ascii=False)  # 원본 JSON 저장
        }
        
        # 1️⃣ CVE ID
        cve_code = vuln.get('cve')
        if not cve_code:
            continue
        cve_info['CVE_Code'] = cve_code
        
        # 2️⃣ CWE 정보
        cwe = vuln.get('cwe', {})
        if cwe and isinstance(cwe, dict):
            cwe_id = cwe.get('id')  # "CWE-121"
            if cwe_id:
                cve_info['cweId'] = cwe_id
        
        # 3️⃣ 날짜 정보 (discovery_date, release_date)
        discovery_date = convert_date(vuln.get('discovery_date'))
        release_date = convert_date(vuln.get('release_date'))
        
        # dateReserved는 discovery_date 또는 release_date 중 빠른 것
        if discovery_date:
            cve_info['dateReserved'] = discovery_date
        elif release_date:
            cve_info['dateReserved'] = release_date
        
        # datePublished 업데이트 (release_date가 더 정확하면 우선)
        if release_date:
            cve_info['datePublished'] = release_date
        
        # 4️⃣ 설명 (notes)
        # category: "description" → 상세 설명
        # category: "summary" → 요약
        notes = vuln.get('notes', [])
        descriptions = []
        summary = None
        
        for note in notes:
            category = note.get('category')
            text = note.get('text', '').strip()
            
            if category == 'description' and text:
                descriptions.append(text)
            elif category == 'summary' and text:
                summary = text
        
        # description 우선, 없으면 summary
        if descriptions:
            cve_info['descriptions'] = descriptions[0]
        elif summary:
            cve_info['descriptions'] = summary
        
        # 5️⃣ CVSS 정보 (scores[].cvss_v3)
        scores = vuln.get('scores', [])
        for score_item in scores:
            cvss_v3 = score_item.get('cvss_v3')
            if cvss_v3:
                base_score = cvss_v3.get('baseScore')
                base_severity = cvss_v3.get('baseSeverity')
                attack_vector = cvss_v3.get('attackVector')
                vector_string = cvss_v3.get('vectorString')
                
                if base_score:
                    cve_info['CVSS_Score'] = str(base_score)
                if base_severity:
                    cve_info['CVSS_Serverity'] = base_severity.upper()
                if attack_vector:
                    cve_info['CVSS_Vertor'] = attack_vector
                if vector_string:
                    cve_info['CVSS_vertorString'] = vector_string
                
                break  # 첫 번째 CVSS만 사용
        
        # 6️⃣ 영향받는 제품 (product_tree에서 추출)
        # Vendor + Product 조합
        products = []
        
        if vendor_name and product_names:
            # "Red Hat" + "Enterprise Linux AppStream" → "Red Hat Enterprise Linux AppStream"
            for prod in list(product_names)[:3]:  # 최대 3개
                if vendor_name.lower() not in prod.lower():
                    products.append(f"{vendor_name} {prod}")
                else:
                    products.append(prod)
        elif product_names:
            products.extend(list(product_names)[:3])
        elif vendor_name:
            products.append(vendor_name)
        
        # 제품명 중복 제거 및 정리
        unique_products = []
        seen = set()
        for p in products:
            # 중복 단어 제거 (예: "Red Hat Red Hat" → "Red Hat")
            words = p.split()
            if len(words) > 1 and words[0] == words[1]:
                p = ' '.join(words[1:])
            
            # 소문자로 비교하여 중복 제거
            p_lower = p.lower()
            if p_lower not in seen:
                seen.add(p_lower)
                unique_products.append(p)
        
        if unique_products:
            product_text = ', '.join(unique_products)
            # 200자 제한
            if len(product_text) > 200:
                product_text = product_text[:197] + '...'
            cve_info['product'] = product_text
        
        # 7️⃣ 솔루션/패치 정보 (remediations)
        remediations = vuln.get('remediations', [])
        solution_parts = []
        
        for remediation in remediations:
            if remediation.get('category') == 'vendor_fix':
                details = remediation.get('details', '').strip()
                url = remediation.get('url', '').strip()
                
                if details:
                    # 너무 길면 앞부분만
                    if len(details) > 150:
                        details = details[:147] + '...'
                    solution_parts.append(details)
                
                if url:
                    solution_parts.append(f"URL: {url}")
        
        if solution_parts:
            cve_info['solutions'] = '\n'.join(solution_parts[:3])  # 최대 3개
        
        # 8️⃣ 영향받는 버전 정보 (product_status.fixed에서 추출)
        # 샘플: "AppStream-8.6.0.Z.AUS:gstreamer1-plugins-bad-free-0:1.16.1-3.el8_6.x86_64"
        # → "gstreamer1-plugins-bad-free 1.16.1 (RHEL 8.6)"
        product_status = vuln.get('product_status', {})
        fixed_products = product_status.get('fixed', [])
        
        if fixed_products:
            version_info = set()
            for fixed_prod in fixed_products[:10]:  # 최대 10개 확인
                try:
                    # "AppStream-8.6.0.Z.AUS:gstreamer1-plugins-bad-free-0:1.16.1-3.el8_6.x86_64"
                    if ':' in fixed_prod:
                        parts = fixed_prod.split(':')
                        
                        # 제품명 추출
                        product_part = parts[1] if len(parts) > 1 else ''
                        
                        # 버전 추출
                        version_part = parts[2].split('-')[0] if len(parts) > 2 else ''
                        
                        # OS 버전 추출 (el8_6 → RHEL 8.6)
                        os_version = ''
                        if 'el8' in fixed_prod:
                            os_version = 'RHEL 8.x'
                        elif 'el9' in fixed_prod:
                            os_version = 'RHEL 9.x'
                        elif 'el10' in fixed_prod:
                            os_version = 'RHEL 10.x'
                        
                        if product_part and version_part:
                            if os_version:
                                version_info.add(f"{product_part} {version_part} ({os_version})")
                            else:
                                version_info.add(f"{product_part} {version_part}")
                
                except Exception as e:
                    logger.debug(f"버전 파싱 오류: {e}")
                    continue
            
            if version_info:
                # 최대 3개, 200자 제한
                version_text = ', '.join(list(version_info)[:3])
                if len(version_text) > 200:
                    version_text = version_text[:197] + '...'
                cve_info['effect_version'] = version_text
        
        results.append(cve_info)
    
    return results


def collect_and_save_circl_cves(limit=DEFAULT_LIMIT):
    """
    CIRCL API에서 CVE를 수집하고 DB에 저장합니다.
    
    Args:
        limit (int): 수집할 CSAF 문서 개수
    """
    logger.info("="*80)
    logger.info("🚀 CIRCL Vulnerability-Lookup API CVE 수집 시작")
    logger.info("="*80)
    logger.info(f"📡 수집 개수: {limit}개 CSAF 문서")
    logger.info(f"🌐 출처: CIRCL (https://vulnerability.circl.lu)")
    logger.info(f"📋 형식: CSAF 2.0 (Common Security Advisory Framework)")
    logger.info("="*80)
    
    # 설정 로드
    config = load_config()
    if not config:
        logger.error("❌ 설정 파일 로드 실패 - 종료")
        return
    
    # DB 연결
    conn = get_db_connection(config)
    if not conn:
        logger.error("❌ DB 연결 실패 - 종료")
        return
    
    try:
        # 테이블 생성/확인
        create_cve_info_table(conn)
        
        # API에서 CSAF 문서 가져오기
        csaf_list = fetch_last_cves(limit)
        
        if not csaf_list:
            logger.error("❌ CSAF 데이터 수신 실패")
            return
        
        if not isinstance(csaf_list, list):
            logger.error(f"❌ 잘못된 데이터 형식: {type(csaf_list)}")
            return
        
        logger.info(f"\n{'='*80}")
        logger.info(f"✅ 수신 완료: {len(csaf_list)}개 CSAF 문서")
        logger.info(f"{'='*80}\n")
        
        # CVE 데이터 파싱 및 저장
        imported_count = 0
        skipped_count = 0
        failed_count = 0
        total_cves = 0
        
        for doc_idx, csaf_json in enumerate(csaf_list, 1):
            try:
                # CSAF 문서 기본 정보
                doc_title = csaf_json.get('document', {}).get('title', 'N/A')
                tracking_id = csaf_json.get('document', {}).get('tracking', {}).get('id', 'N/A')
                
                # CSAF 문서 파싱 (여러 CVE가 포함될 수 있음)
                cve_list = parse_csaf_to_cve_info(csaf_json)
                total_cves += len(cve_list)
                
                if not cve_list:
                    logger.debug(f"[{doc_idx}/{len(csaf_list)}] {tracking_id} - CVE 없음")
                    continue
                
                logger.info(f"\n{'─'*80}")
                logger.info(f"[{doc_idx}/{len(csaf_list)}] 📄 {tracking_id}")
                logger.info(f"  제목: {doc_title[:60]}...")
                logger.info(f"  CVE: {len(cve_list)}개 발견")
                logger.info(f"{'─'*80}")
                
                for cve_info in cve_list:
                    cve_code = cve_info.get('CVE_Code')
                    
                    if not cve_code:
                        logger.warning(f"  ⚠️  CVE ID 없음 - 건너뜀")
                        skipped_count += 1
                        continue
                    
                    # 날짜 정보 추출
                    date_published = cve_info.get('datePublished', 'N/A')
                    date_reserved = cve_info.get('dateReserved', 'N/A')
                    date_display = date_published if date_published != 'N/A' else date_reserved
                    
                    # 중복 확인
                    is_existing = check_cve_info_exists(conn, cve_code)
                    
                    if is_existing:
                        logger.info(f"  ⏭️  {cve_code} (등록일: {date_display}) - 이미 수집된 데이터")
                        skipped_count += 1
                        continue
                    
                    # 신규 CVE 정보 출력
                    logger.info(f"  📋 {cve_code} (등록일: {date_display}) - 신규 수집")
                    
                    # DB 저장
                    if insert_cve_info(conn, cve_info):
                        product_display = cve_info.get('product', 'N/A')[:50]
                        cvss_display = cve_info.get('CVSS_Score', 'N/A')
                        severity_display = cve_info.get('CVSS_Serverity', 'N/A')
                        
                        logger.info(f"     ✅ 저장 완료")
                        logger.info(f"     제품: {product_display}")
                        logger.info(f"     CVSS: {cvss_display} ({severity_display})")
                        logger.info(f"     CWE: {cve_info.get('cweId', 'N/A')}")
                        
                        imported_count += 1
                    else:
                        logger.error(f"     ❌ 저장 실패")
                        failed_count += 1
                        
            except Exception as e:
                logger.error(f"[{doc_idx}/{len(csaf_list)}] 처리 중 오류: {e}", exc_info=True)
                failed_count += 1
        
        # 결과 요약
        logger.info("\n" + "="*80)
        logger.info("🎉 CIRCL CVE 수집 완료!")
        logger.info("="*80)
        logger.info(f"📊 수집 통계:")
        logger.info(f"  • CSAF 문서: {len(csaf_list)}개")
        logger.info(f"  • 총 CVE: {total_cves}개")
        logger.info(f"  • ✅ 새로 추가: {imported_count}개")
        logger.info(f"  • ⏭️  이미 존재: {skipped_count}개")
        logger.info(f"  • ❌ 실패: {failed_count}개")
        logger.info("="*80)
        
    except Exception as e:
        logger.error(f"❌ [전체 오류] {e}", exc_info=True)
    finally:
        if conn:
            conn.close()
            logger.info("🔒 [DB] 연결 종료")


def test_api_and_show_sample():
    """
    API 테스트 및 샘플 데이터 출력 (디버깅용)
    """
    print("="*80)
    print("🧪 CIRCL API 테스트 모드")
    print("="*80)
    
    # 최근 10개 CSAF 문서 가져오기
    csaf_list = fetch_last_cves(10)
    
    if not csaf_list:
        print("❌ API 요청 실패")
        return
    
    print(f"\n✅ {len(csaf_list)}개 CSAF 문서 수신\n")
    
    # 첫 번째 문서 분석
    first_doc = csaf_list[0]
    
    print("="*80)
    print("📋 첫 번째 CSAF 문서 구조:")
    print("="*80)
    
    # Document 정보
    doc = first_doc.get('document', {})
    print(f"\n[Document]")
    print(f"  Title: {doc.get('title', 'N/A')}")
    print(f"  Publisher: {doc.get('publisher', {}).get('name', 'N/A')}")
    print(f"  Category: {doc.get('category', 'N/A')}")
    
    tracking = doc.get('tracking', {})
    print(f"\n[Tracking]")
    print(f"  ID: {tracking.get('id', 'N/A')}")
    print(f"  Initial Release: {tracking.get('initial_release_date', 'N/A')}")
    print(f"  Current Release: {tracking.get('current_release_date', 'N/A')}")
    print(f"  Status: {tracking.get('status', 'N/A')}")
    
    # Product Tree
    vendor_name, product_names = extract_vendor_and_products(first_doc)
    print(f"\n[Product Tree]")
    print(f"  Vendor: {vendor_name or 'N/A'}")
    print(f"  Products ({len(product_names)}개):")
    for idx, prod in enumerate(list(product_names)[:5], 1):
        print(f"    {idx}. {prod}")
    
    # Vulnerabilities
    vulnerabilities = first_doc.get('vulnerabilities', [])
    print(f"\n[Vulnerabilities] {len(vulnerabilities)}개")
    
    for idx, vuln in enumerate(vulnerabilities, 1):
        print(f"\n  [{idx}] CVE ID: {vuln.get('cve', 'N/A')}")
        
        cwe = vuln.get('cwe', {})
        print(f"      CWE: {cwe.get('id', 'N/A')} - {cwe.get('name', 'N/A')}")
        
        # CVSS
        scores = vuln.get('scores', [])
        if scores:
            cvss = scores[0].get('cvss_v3', {})
            print(f"      CVSS Score: {cvss.get('baseScore', 'N/A')}")
            print(f"      Severity: {cvss.get('baseSeverity', 'N/A')}")
            print(f"      Vector: {cvss.get('vectorString', 'N/A')}")
        
        # Notes
        notes = vuln.get('notes', [])
        print(f"      Notes: {len(notes)}개")
        for note in notes[:2]:
            category = note.get('category', 'N/A')
            title = note.get('title', 'N/A')
            text = note.get('text', '')[:80]
            print(f"        - {category} ({title}): {text}...")
    
    print("\n" + "="*80)
    print("📝 파싱된 CVE 데이터:")
    print("="*80)
    
    # 파싱 테스트
    parsed_list = parse_csaf_to_cve_info(first_doc)
    
    if parsed_list:
        for cve_idx, cve_data in enumerate(parsed_list, 1):
            print(f"\n[CVE #{cve_idx}]")
            for key, value in cve_data.items():
                if key != 'Response_data':  # 원본 JSON은 너무 길어서 제외
                    display_value = str(value)[:100] if value else 'None'
                    print(f"  {key:20s}: {display_value}")
    else:
        print("❌ 파싱 결과 없음")
    
    print("\n" + "="*80)
    print("✅ 테스트 완료")
    print("="*80)


if __name__ == "__main__":
    # Windows 한글 출력 설정
    if sys.platform == "win32":
        try:
            sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8')
            sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8')
        except:
            pass
    
    # sys.stdout 변경 후 StreamHandler 추가 (로깅 에러 방지)
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(stream_handler)
    
    # 실행 모드 선택
    import argparse
    import time
    
    parser = argparse.ArgumentParser(description='CIRCL Vulnerability-Lookup API CVE 수집기')
    parser.add_argument('--test', action='store_true', help='테스트 모드 (API 확인 및 샘플 출력)')
    parser.add_argument('--limit', type=int, default=100, help='수집할 CSAF 문서 개수 (기본값: 100)')
    parser.add_argument('--once', action='store_true', help='1회만 실행 (기본값: 무한 반복)')
    parser.add_argument('--interval', type=int, default=3600, help='반복 주기(초) (기본값: 3600초=1시간)')
    
    args = parser.parse_args()
    
    if args.test:
        # 테스트 모드
        test_api_and_show_sample()
    elif args.once:
        # 1회만 실행 모드
        collect_and_save_circl_cves(args.limit)
    else:
        # 기본: 무한 반복 모드 (1시간마다)
        logger.info("="*80)
        logger.info("🔄 무한 반복 모드 시작 (기본 동작)")
        logger.info("="*80)
        logger.info(f"⏰ 수집 주기: {args.interval}초 ({args.interval//60}분)")
        logger.info(f"📡 수집 개수: {args.limit}개 CSAF 문서")
        logger.info(f"⚠️  중지: Ctrl+C")
        logger.info(f"💡 1회만 실행하려면: --once 옵션 사용")
        logger.info("="*80)
        
        cycle_count = 0
        
        try:
            while True:
                cycle_count += 1
                logger.info(f"\n\n{'🔄'*40}")
                logger.info(f"🔄 수집 사이클 #{cycle_count} 시작")
                logger.info(f"🕒 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"{'🔄'*40}\n")
                
                # CVE 수집 실행
                collect_and_save_circl_cves(args.limit)
                
                # 다음 수집까지 대기
                next_run = datetime.now().timestamp() + args.interval
                next_run_time = datetime.fromtimestamp(next_run).strftime('%Y-%m-%d %H:%M:%S')
                
                logger.info(f"\n{'⏰'*40}")
                logger.info(f"⏰ 다음 수집까지 {args.interval}초 ({args.interval//60}분) 대기...")
                logger.info(f"⏰ 다음 수집 시간: {next_run_time}")
                logger.info(f"⏰ 중지하려면 Ctrl+C를 누르세요")
                logger.info(f"{'⏰'*40}\n")
                
                time.sleep(args.interval)
                
        except KeyboardInterrupt:
            logger.info("\n\n" + "="*80)
            logger.info("🛑 사용자에 의해 중지됨")
            logger.info("="*80)
            logger.info(f"총 실행 사이클: {cycle_count}회")
            logger.info(f"종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info("="*80)
