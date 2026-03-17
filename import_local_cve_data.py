"""
로컬 CVE JSON 파일을 CVE_Info 테이블에 일괄 삽입
cvelistV5-main 폴더의 CVE 정보를 DB에 저장
"""
import json
import os
import logging
from datetime import datetime
from pathlib import Path
import mysql.connector
from mysql.connector import Error

# 로거 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/import_cve_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('CVE_Importer')

# 경로 설정
CVE_BASE_PATH = Path(r"E:\LLama\pythonProject\CVE_BOT\cvelistV5-main\cves")


def load_config():
    """설정 파일 로드"""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[설정] 설정 파일 로드 실패: {e}")
        return None


def get_db_connection(config):
    """DB 연결"""
    try:
        conn = mysql.connector.connect(
            host=config['database']['host'],
            port=config['database']['port'],
            user=config['database']['user'],
            password=config['database']['password'],
            database=config['database']['database']
        )
        logger.info("✅ DB 연결 성공")
        return conn
    except Error as e:
        logger.error(f"❌ DB 연결 오류: {e}")
        return None


def check_cve_exists(cursor, cve_code):
    """CVE가 이미 DB에 있는지 확인"""
    try:
        cursor.execute("SELECT CVE_Code FROM CVE_Info WHERE CVE_Code = %s", (cve_code,))
        return cursor.fetchone() is not None
    except Error as e:
        logger.error(f"[체크 오류] {cve_code}: {e}")
        return False


def parse_cve_json(json_data, file_path):
    """
    CVE JSON 데이터를 CVE_Info 테이블 형식으로 변환
    
    Args:
        json_data: CVE JSON 데이터
        file_path: JSON 파일 경로 (로깅용)
    
    Returns:
        dict: CVE_Info 형식의 데이터 또는 None
    """
    try:
        # 기본 메타데이터
        cve_id = json_data.get('cveMetadata', {}).get('cveId', '')
        if not cve_id:
            logger.warning(f"[파싱 실패] CVE ID 없음: {file_path}")
            return None
        
        state = json_data.get('cveMetadata', {}).get('state', '')
        date_reserved = json_data.get('cveMetadata', {}).get('dateReserved', '')
        date_published = json_data.get('cveMetadata', {}).get('datePublished', '')
        date_updated = json_data.get('cveMetadata', {}).get('dateUpdated', '')
        
        # CNA 컨테이너 데이터
        cna = json_data.get('containers', {}).get('cna', {})
        
        # 제품 정보 추출
        affected = cna.get('affected', [])
        products = []
        effect_versions = []
        
        for item in affected:
            vendor = item.get('vendor', '')
            product = item.get('product', '')
            if vendor and product:
                products.append(f"{vendor} {product}")
            elif product:
                products.append(product)
            
            # 영향받는 버전
            versions = item.get('versions', [])
            for ver in versions:
                if ver.get('status') == 'affected':
                    version_str = ver.get('version', '')
                    less_than = ver.get('lessThanOrEqual', ver.get('lessThan', ''))
                    if version_str and less_than:
                        effect_versions.append(f"{version_str} ~ {less_than}")
                    elif version_str:
                        effect_versions.append(version_str)
        
        product_str = ', '.join(products[:3]) if products else 'N/A'
        effect_version_str = ', '.join(effect_versions[:5]) if effect_versions else ''
        
        # 설명 추출
        descriptions = cna.get('descriptions', [])
        description_text = ''
        for desc in descriptions:
            if desc.get('lang') == 'en':
                description_text = desc.get('value', '')
                break
        
        # CWE 추출
        problem_types = cna.get('problemTypes', [])
        cwe_id = ''
        for pt in problem_types:
            for desc in pt.get('descriptions', []):
                if desc.get('type') == 'CWE':
                    cwe_id = desc.get('cweId', '')
                    break
            if cwe_id:
                break
        
        # CVSS 정보 추출
        metrics = cna.get('metrics', [])
        cvss_score = ''
        cvss_severity = ''
        cvss_vector = ''
        cvss_vector_string = ''
        
        for metric in metrics:
            if 'cvssV3_1' in metric:
                cvss_v3 = metric['cvssV3_1']
                cvss_score = str(cvss_v3.get('baseScore', ''))
                cvss_severity = cvss_v3.get('baseSeverity', '')
                cvss_vector_string = cvss_v3.get('vectorString', '')
                cvss_vector = cvss_vector_string
                break
            elif 'cvssV3_0' in metric:
                cvss_v3 = metric['cvssV3_0']
                cvss_score = str(cvss_v3.get('baseScore', ''))
                cvss_severity = cvss_v3.get('baseSeverity', '')
                cvss_vector_string = cvss_v3.get('vectorString', '')
                cvss_vector = cvss_vector_string
                break
        
        # 공격 유형 추출 (CAPEC 또는 impacts에서)
        attack_type = ''
        impacts = cna.get('impacts', [])
        for impact in impacts:
            capec_id = impact.get('capecId', '')
            if capec_id:
                impact_descs = impact.get('descriptions', [])
                for desc in impact_descs:
                    if desc.get('lang') == 'en':
                        attack_type = desc.get('value', '').replace(capec_id + ' ', '')
                        break
            if attack_type:
                break
        
        # 솔루션 추출
        solutions = cna.get('solutions', [])
        solution_text = ''
        for sol in solutions:
            if sol.get('lang') == 'en':
                solution_text = sol.get('value', '')
                break
        
        # CVE_Info 형식으로 반환
        return {
            'collect_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'CVE_Code': cve_id,
            'state': state,
            'dateReserved': date_reserved,
            'datePublished': date_published,
            'dateUpdated': date_updated,
            'product': product_str,
            'descriptions': description_text,
            'effect_version': effect_version_str,
            'cweId': cwe_id,
            'Attak_Type': attack_type,
            'CVSS_Score': cvss_score,
            'CVSS_Vertor': cvss_vector,
            'CVSS_Serverity': cvss_severity,
            'CVSS_vertorString': cvss_vector_string,
            'solutions': solution_text,
            'Response_data': json.dumps(json_data, ensure_ascii=False)  # 원본 JSON 저장
        }
        
    except Exception as e:
        logger.error(f"[파싱 오류] {file_path}: {e}")
        return None


def insert_cve_to_db(cursor, cve_info):
    """CVE 정보를 DB에 삽입"""
    try:
        cursor.execute('''
            INSERT INTO CVE_Info 
            (collect_time, CVE_Code, state, dateReserved, datePublished, dateUpdated,
             product, descriptions, effect_version, cweId, Attak_Type, 
             CVSS_Score, CVSS_Vertor, CVSS_Serverity, CVSS_vertorString, 
             solutions, Response_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            cve_info['collect_time'],
            cve_info['CVE_Code'],
            cve_info['state'],
            cve_info['dateReserved'],
            cve_info['datePublished'],
            cve_info['dateUpdated'],
            cve_info['product'],
            cve_info['descriptions'],
            cve_info['effect_version'],
            cve_info['cweId'],
            cve_info['Attak_Type'],
            cve_info['CVSS_Score'],
            cve_info['CVSS_Vertor'],
            cve_info['CVSS_Serverity'],
            cve_info['CVSS_vertorString'],
            cve_info['solutions'],
            cve_info['Response_data']
        ))
        return True
    except Error as e:
        logger.error(f"[삽입 오류] {cve_info['CVE_Code']}: {e}")
        return False


def scan_and_import_cves(start_year=1999, end_year=2025, batch_size=100):
    """
    CVE JSON 파일을 스캔하고 DB에 삽입
    
    Args:
        start_year: 시작 연도
        end_year: 종료 연도
        batch_size: 배치 커밋 크기
    """
    logger.info("="*80)
    logger.info("CVE 로컬 데이터 일괄 가져오기 시작")
    logger.info("="*80)
    logger.info(f"경로: {CVE_BASE_PATH}")
    logger.info(f"연도 범위: {start_year} ~ {end_year}")
    logger.info(f"배치 크기: {batch_size}개")
    logger.info("="*80)
    
    # 설정 로드
    config = load_config()
    if not config:
        logger.error("스크립트 종료: 설정 파일 없음")
        return
    
    # DB 연결
    conn = get_db_connection(config)
    if not conn:
        logger.error("스크립트 종료: DB 연결 실패")
        return
    
    cursor = conn.cursor()
    
    # 통계
    total_files = 0
    total_imported = 0
    total_skipped = 0
    total_errors = 0
    batch_count = 0
    
    try:
        # 연도별 폴더 순회
        for year in range(start_year, end_year + 1):
            year_path = CVE_BASE_PATH / str(year)
            
            if not year_path.exists():
                logger.warning(f"[건너뜀] 폴더 없음: {year}")
                continue
            
            logger.info(f"\n{'='*80}")
            logger.info(f"[처리 시작] {year}년 데이터")
            logger.info(f"{'='*80}")
            
            # xxx 폴더 순회 (0xxx, 1xxx, 2xxx, ...)
            xxx_folders = sorted([d for d in year_path.iterdir() if d.is_dir()])
            
            for xxx_folder in xxx_folders:
                logger.info(f"\n[폴더] {year}/{xxx_folder.name}")
                
                # JSON 파일 순회
                json_files = list(xxx_folder.glob("CVE-*.json"))
                
                if not json_files:
                    continue
                
                logger.info(f"  파일 개수: {len(json_files)}개")
                
                for json_file in json_files:
                    total_files += 1
                    
                    try:
                        # CVE 코드 추출
                        cve_code = json_file.stem  # CVE-2024-0001
                        
                        # 이미 존재하는지 확인
                        if check_cve_exists(cursor, cve_code):
                            total_skipped += 1
                            if total_files % 100 == 0:
                                logger.info(f"  [건너뜀] {cve_code} (이미 존재)")
                            continue
                        
                        # JSON 파일 읽기
                        with open(json_file, 'r', encoding='utf-8') as f:
                            json_data = json.load(f)
                        
                        # 파싱
                        cve_info = parse_cve_json(json_data, json_file)
                        
                        if not cve_info:
                            total_errors += 1
                            logger.warning(f"  [파싱 실패] {cve_code}")
                            continue
                        
                        # DB 삽입
                        if insert_cve_to_db(cursor, cve_info):
                            total_imported += 1
                            batch_count += 1
                            
                            # 진행 상황 출력
                            if total_imported % 10 == 0:
                                logger.info(f"  ✅ {cve_code} 저장 완료 (진행: {total_imported}개)")
                            
                            # 배치 커밋
                            if batch_count >= batch_size:
                                conn.commit()
                                logger.info(f"\n[배치 커밋] {batch_size}개 저장 완료 (총 {total_imported}개)")
                                batch_count = 0
                        else:
                            total_errors += 1
                    
                    except json.JSONDecodeError as e:
                        total_errors += 1
                        logger.error(f"  [JSON 오류] {json_file.name}: {e}")
                    except Exception as e:
                        total_errors += 1
                        logger.error(f"  [처리 오류] {json_file.name}: {e}")
                
                # 폴더별 중간 커밋
                if batch_count > 0:
                    conn.commit()
                    logger.info(f"  [커밋] {xxx_folder.name} 폴더 완료")
                    batch_count = 0
            
            logger.info(f"\n[{year}년 완료] 저장: {total_imported}개, 건너뜀: {total_skipped}개, 오류: {total_errors}개")
        
        # 최종 커밋
        conn.commit()
        
        # 최종 결과
        logger.info("\n" + "="*80)
        logger.info("CVE 데이터 가져오기 완료!")
        logger.info("="*80)
        logger.info(f"📊 전체 파일: {total_files}개")
        logger.info(f"✅ 새로 저장: {total_imported}개")
        logger.info(f"⏭️  건너뜀 (이미 존재): {total_skipped}개")
        logger.info(f"❌ 오류: {total_errors}개")
        logger.info(f"📈 성공률: {(total_imported / total_files * 100):.1f}%" if total_files > 0 else "0%")
        logger.info("="*80)
        
    except Exception as e:
        logger.error(f"❌ 전체 프로세스 오류: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        logger.info("\n🔒 DB 연결 종료")


def main():
    """메인 실행 함수"""
    print("="*80)
    print("CVE 로컬 데이터 일괄 가져오기")
    print("="*80)
    print(f"소스 경로: {CVE_BASE_PATH}")
    print("="*80)
    
    # 경로 존재 확인
    if not CVE_BASE_PATH.exists():
        logger.error(f"❌ 경로를 찾을 수 없습니다: {CVE_BASE_PATH}")
        logger.error("경로를 확인하고 다시 실행해주세요")
        return
    
    # 사용자 확인
    print("\n⚠️  주의사항:")
    print("  - 이미 존재하는 CVE는 자동으로 건너뜁니다")
    print("  - 대량 데이터 처리 시 시간이 오래 걸릴 수 있습니다")
    print("  - 100개마다 자동 커밋됩니다")
    print()
    
    response = input("계속 진행하시겠습니까? (y/n): ")
    if response.lower() != 'y':
        logger.info("사용자가 취소했습니다")
        return
    
    # 연도 범위 입력
    print("\n연도 범위를 입력하세요 (Enter 시 전체: 1999~2025)")
    start_year_input = input("시작 연도 (기본값: 1999): ").strip()
    end_year_input = input("종료 연도 (기본값: 2025): ").strip()
    
    start_year = int(start_year_input) if start_year_input else 1999
    end_year = int(end_year_input) if end_year_input else 2025
    
    logger.info(f"\n시작합니다... ({start_year}년 ~ {end_year}년)")
    
    # 실행
    start_time = datetime.now()
    scan_and_import_cves(start_year, end_year)
    end_time = datetime.now()
    
    elapsed = (end_time - start_time).total_seconds()
    logger.info(f"\n⏱️  소요 시간: {elapsed:.1f}초 ({elapsed/60:.1f}분)")


if __name__ == '__main__':
    main()

