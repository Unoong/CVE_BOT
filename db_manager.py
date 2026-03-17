"""
데이터베이스 관리 모듈
"""
import mysql.connector
from mysql.connector import Error
from logger import log_print


def get_db_connection(config):
    """
    데이터베이스 연결 반환
    
    Args:
        config: 설정 딕셔너리
    
    Returns:
        mysql.connector.connection 객체 또는 None
    """
    try:
        conn = mysql.connector.connect(
            host=config['database']['host'],
            port=config['database']['port'],
            user=config['database']['user'],
            password=config['database']['password'],
            database=config['database']['database']
        )
        log_print("[DB] 데이터베이스 연결 성공")
        return conn
    except Error as e:
        log_print(f"[DB 연결 오류] {e}", 'error')
        return None


def create_table(conn):
    """
    Github_CVE_Info 테이블 생성
    
    Args:
        conn: 데이터베이스 연결 객체
    """
    try:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS Github_CVE_Info (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date TEXT,
                collect_time TEXT,
                link TEXT,
                title TEXT,
                writer TEXT,
                cve TEXT,
                readme TEXT,
                download_path TEXT,
                status TEXT DEFAULT 'N',
                trans_msg TEXT,
                AI_chk TEXT DEFAULT 'N',
                cve_info_status TEXT DEFAULT 'N'
            )
        ''')
        conn.commit()
        log_print("[DB] Github_CVE_Info 테이블 생성/확인 완료")
        
        # 기존 테이블에 cve_info_status 컬럼 추가 (없으면)
        try:
            cursor.execute('''
                ALTER TABLE Github_CVE_Info 
                ADD COLUMN IF NOT EXISTS cve_info_status TEXT DEFAULT 'N'
            ''')
            conn.commit()
            log_print("[DB] cve_info_status 컬럼 추가/확인 완료")
        except Error as e:
            # 이미 컬럼이 있으면 무시
            pass
            
    except Error as e:
        log_print(f"[DB 테이블 생성 오류] {e}", 'error')
    finally:
        cursor.close()


def create_cve_info_table(conn):
    """
    CVE_Info 테이블 생성
    
    Args:
        conn: 데이터베이스 연결 객체
    """
    try:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS CVE_Info (
                id INT AUTO_INCREMENT PRIMARY KEY,
                collect_time TEXT,
                CVE_Code VARCHAR(50) UNIQUE,
                state TEXT,
                dateReserved TEXT,
                datePublished TEXT,
                dateUpdated TEXT,
                product TEXT,
                descriptions TEXT,
                effect_version TEXT,
                cweId TEXT,
                Attak_Type TEXT,
                CVSS_Score TEXT,
                CVSS_Vertor TEXT,
                CVSS_Serverity TEXT,
                CVSS_vertorString TEXT,
                solutions TEXT,
                Response_data LONGTEXT
            )
        ''')
        conn.commit()
        log_print("[DB] CVE_Info 테이블 생성/확인 완료")
    except Error as e:
        log_print(f"[DB CVE_Info 테이블 생성 오류] {e}", 'error')
    finally:
        cursor.close()


def check_cve_info_exists(conn, cve_code):
    """
    CVE_Info 테이블에 해당 CVE가 있는지 확인
    
    Args:
        conn: 데이터베이스 연결 객체
        cve_code: CVE 코드
    
    Returns:
        dict: CVE 정보 (없으면 None)
    """
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM CVE_Info WHERE CVE_Code = %s",
            (cve_code,)
        )
        result = cursor.fetchone()
        cursor.close()
        return result
    except Error as e:
        log_print(f"[DB CVE_Info 조회 오류] {e}", 'error')
        return None


def insert_cve_info(conn, cve_info):
    """
    CVE_Info 테이블에 데이터 삽입
    
    Args:
        conn: 데이터베이스 연결 객체
        cve_info: CVE 정보 딕셔너리
    
    Returns:
        bool: 성공 여부
    """
    try:
        cursor = conn.cursor()
        
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
        
        conn.commit()
        cursor.close()
        log_print(f"[DB] CVE_Info 데이터 삽입 성공: {cve_info['CVE_Code']}", 'info')
        return True
        
    except Error as e:
        log_print(f"[DB CVE_Info 삽입 오류] {e}", 'error')
        conn.rollback()
        return False


def get_cve_count(conn, cve_code):
    """
    특정 CVE 코드의 저장된 개수 조회
    
    Args:
        conn: 데이터베이스 연결 객체
        cve_code: CVE 코드
    
    Returns:
        int: 해당 CVE 코드의 저장된 개수
    """
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM Github_CVE_Info WHERE cve = %s",
            (cve_code,)
        )
        count = cursor.fetchone()[0]
        cursor.close()
        return count
    except Error as e:
        log_print(f"[DB CVE 개수 조회 오류] {e}", 'error')
        return 0


def insert_cve_data(conn, data):
    """
    CVE 데이터 삽입
    
    Args:
        conn: 데이터베이스 연결 객체
        data: 삽입할 데이터 딕셔너리
    
    Returns:
        bool: 성공 여부
    """
    try:
        cursor = conn.cursor()
        
        # 데이터 삽입 (중복 체크는 외부에서 수행)
        cursor.execute('''
            INSERT INTO Github_CVE_Info 
            (date, collect_time, link, title, writer, cve, readme, download_path, status, trans_msg, AI_chk)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            data['date'],
            data['collect_time'],
            data['link'],
            data['title'],
            data['writer'],
            data['cve'],
            data['readme'],
            data['download_path'],
            data['status'],
            data['trans_msg'],
            data['AI_chk']
        ))
        
        conn.commit()
        cursor.close()
        return True
    except Error as e:
        log_print(f"[DB 삽입 오류] {e}", 'error')
        conn.rollback()
        return False


def check_duplicate(conn, link):
    """
    중복 링크 확인
    
    Args:
        conn: 데이터베이스 연결 객체
        link: GitHub 링크
    
    Returns:
        bool: 중복이면 True, 아니면 False
    """
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM Github_CVE_Info WHERE link = %s",
            (link,)
        )
        count = cursor.fetchone()[0]
        cursor.close()
        return count > 0
    except Error as e:
        log_print(f"[DB 중복 확인 오류] {e}", 'error')
        return False


def create_ai_analysis_table(conn):
    """
    CVE_Packet_AI_Analysis 테이블 생성
    
    Args:
        conn: 데이터베이스 연결 객체
    """
    try:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS CVE_Packet_AI_Analysis (
                id INT AUTO_INCREMENT PRIMARY KEY,
                link TEXT,
                download_path TEXT,
                cve_summary TEXT,
                step INT,
                packet_text LONGTEXT,
                vuln_stage TEXT,
                stage_description TEXT,
                mitre_tactic TEXT,
                mitre_technique TEXT,
                snort_rule TEXT,
                remediation TEXT,
                expected_response TEXT,
                affected_products JSON
            )
        ''')
        conn.commit()
        log_print("[DB] CVE_Packet_AI_Analysis 테이블 생성/확인 완료")
        
        # 기존 테이블에 affected_products 컬럼 추가 (없으면)
        try:
            cursor.execute('''
                ALTER TABLE CVE_Packet_AI_Analysis 
                ADD COLUMN affected_products JSON
            ''')
            conn.commit()
            log_print("[DB] affected_products 컬럼 추가 완료")
        except Error as e:
            # 이미 컬럼이 있으면 무시
            if "Duplicate column name" in str(e):
                log_print("[DB] affected_products 컬럼 이미 존재")
            else:
                log_print(f"[DB] affected_products 컬럼 추가 실패 (무시): {e}", 'debug')
                
    except Error as e:
        log_print(f"[DB AI Analysis 테이블 생성 오류] {e}", 'error')
    finally:
        cursor.close()


def get_unanalyzed_cves(conn):
    """
    AI_chk가 'N'인 CVE 목록 조회
    
    Args:
        conn: 데이터베이스 연결 객체
    
    Returns:
        list: CVE 정보 리스트
    """
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, link, download_path, cve, title
            FROM Github_CVE_Info
            WHERE AI_chk = 'N'
            ORDER BY id ASC
        """)
        results = cursor.fetchall()
        cursor.close()
        return results
    except Error as e:
        log_print(f"[DB 미분석 CVE 조회 오류] {e}", 'error')
        return []


def get_cve_info_pending(conn):
    """
    cve_info_status가 'N'인 CVE 목록 조회
    
    Args:
        conn: 데이터베이스 연결 객체
    
    Returns:
        list: CVE 정보 리스트 (cve 코드)
    """
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT DISTINCT cve
            FROM Github_CVE_Info
            WHERE cve_info_status = 'N' AND cve IS NOT NULL AND cve != ''
            ORDER BY cve ASC
        """)
        results = cursor.fetchall()
        cursor.close()
        return results
    except Error as e:
        log_print(f"[DB CVE Info 미수집 조회 오류] {e}", 'error')
        return []


def update_cve_info_status(conn, cve_code):
    """
    cve_info_status를 'Y'로 업데이트
    
    Args:
        conn: 데이터베이스 연결 객체
        cve_code: CVE 코드
    """
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE Github_CVE_Info
            SET cve_info_status = 'Y'
            WHERE cve = %s
        """, (cve_code,))
        conn.commit()
        log_print(f"[DB] CVE Info 수집 상태 업데이트: {cve_code}")
        cursor.close()
    except Error as e:
        log_print(f"[DB CVE Info 상태 업데이트 오류] {e}", 'error')


def create_integrated_table(conn):
    """
    통합 CVE 테이블 생성 (해시 기반)
    
    Args:
        conn: 데이터베이스 연결 객체
    """
    try:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS CVE_Integrated_Data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hash_key VARCHAR(64) UNIQUE,
                
                -- Github_CVE_Info 필드
                github_date TEXT,
                github_collect_time TEXT,
                github_link TEXT,
                github_title TEXT,
                github_writer TEXT,
                github_cve TEXT,
                github_readme TEXT,
                github_download_path TEXT,
                github_status TEXT,
                github_trans_msg TEXT,
                github_ai_chk TEXT,
                github_cve_info_status TEXT,
                
                -- CVE_Info 필드
                cve_collect_time TEXT,
                cve_code VARCHAR(50),
                cve_state TEXT,
                cve_date_reserved TEXT,
                cve_date_published TEXT,
                cve_date_updated TEXT,
                cve_product TEXT,
                cve_descriptions TEXT,
                cve_effect_version TEXT,
                cve_cwe_id TEXT,
                cve_attack_type TEXT,
                cve_cvss_score TEXT,
                cve_cvss_vector TEXT,
                cve_cvss_severity TEXT,
                cve_cvss_vector_string TEXT,
                cve_solutions TEXT,
                cve_response_data LONGTEXT,
                
                -- CVE_Packet_AI_Analysis 필드
                ai_cve_summary TEXT,
                ai_step INT,
                ai_packet_text LONGTEXT,
                ai_vuln_stage TEXT,
                ai_stage_description TEXT,
                ai_mitre_tactic TEXT,
                ai_mitre_technique TEXT,
                ai_snort_rule TEXT,
                ai_remediation TEXT,
                ai_expected_response TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_hash_key (hash_key),
                INDEX idx_cve_code (cve_code),
                INDEX idx_github_link (github_link(255))
            )
        ''')
        conn.commit()
        log_print("[DB] CVE_Integrated_Data 테이블 생성/확인 완료")
    except Error as e:
        log_print(f"[DB 통합 테이블 생성 오류] {e}", 'error')
    finally:
        cursor.close()


def insert_integrated_data(conn):
    """
    status = 'N'인 데이터를 3개 테이블 조인하여 통합 테이블에 저장
    
    Args:
        conn: 데이터베이스 연결 객체
    
    Returns:
        int: 삽입된 레코드 수
    """
    import hashlib
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        # 3개 테이블 조인 쿼리
        query = """
            SELECT 
                -- Github_CVE_Info
                g.date as github_date,
                g.collect_time as github_collect_time,
                g.link as github_link,
                g.title as github_title,
                g.writer as github_writer,
                g.cve as github_cve,
                g.readme as github_readme,
                g.download_path as github_download_path,
                g.status as github_status,
                g.trans_msg as github_trans_msg,
                g.AI_chk as github_ai_chk,
                g.cve_info_status as github_cve_info_status,
                
                -- CVE_Info
                c.collect_time as cve_collect_time,
                c.CVE_Code as cve_code,
                c.state as cve_state,
                c.dateReserved as cve_date_reserved,
                c.datePublished as cve_date_published,
                c.dateUpdated as cve_date_updated,
                c.product as cve_product,
                c.descriptions as cve_descriptions,
                c.effect_version as cve_effect_version,
                c.cweId as cve_cwe_id,
                c.Attak_Type as cve_attack_type,
                c.CVSS_Score as cve_cvss_score,
                c.CVSS_Vertor as cve_cvss_vector,
                c.CVSS_Serverity as cve_cvss_severity,
                c.CVSS_vertorString as cve_cvss_vector_string,
                c.solutions as cve_solutions,
                c.Response_data as cve_response_data,
                
                -- CVE_Packet_AI_Analysis
                a.cve_summary as ai_cve_summary,
                a.step as ai_step,
                a.packet_text as ai_packet_text,
                a.vuln_stage as ai_vuln_stage,
                a.stage_description as ai_stage_description,
                a.mitre_tactic as ai_mitre_tactic,
                a.mitre_technique as ai_mitre_technique,
                a.snort_rule as ai_snort_rule,
                a.remediation as ai_remediation,
                a.expected_response as ai_expected_response
            FROM 
                Github_CVE_Info g
            LEFT JOIN 
                CVE_Info c ON g.cve = c.CVE_Code
            LEFT JOIN 
                CVE_Packet_AI_Analysis a ON g.link = a.link
            WHERE 
                g.status = 'N'
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        log_print(f"[통합 데이터] 조회된 레코드: {len(results)}개")
        
        inserted_count = 0
        for row in results:
            # 해시 키 생성 (cve, link, date, step 기준 - 각 공격 단계별로 고유 키)
            hash_string = f"{row.get('github_cve', '')}{row.get('github_link', '')}{row.get('github_date', '')}{row.get('ai_step', '')}"
            hash_key = hashlib.sha256(hash_string.encode()).hexdigest()
            
            try:
                insert_cursor = conn.cursor()
                insert_cursor.execute("""
                    INSERT INTO CVE_Integrated_Data (
                        hash_key, github_date, github_collect_time, github_link,
                        github_title, github_writer, github_cve, github_readme,
                        github_download_path, github_status, github_trans_msg,
                        github_ai_chk, github_cve_info_status,
                        cve_collect_time, cve_code, cve_state, cve_date_reserved,
                        cve_date_published, cve_date_updated, cve_product,
                        cve_descriptions, cve_effect_version, cve_cwe_id,
                        cve_attack_type, cve_cvss_score, cve_cvss_vector,
                        cve_cvss_severity, cve_cvss_vector_string, cve_solutions,
                        cve_response_data, ai_cve_summary, ai_step, ai_packet_text,
                        ai_vuln_stage, ai_stage_description, ai_mitre_tactic,
                        ai_mitre_technique, ai_snort_rule, ai_remediation, ai_expected_response
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) ON DUPLICATE KEY UPDATE
                        github_status = VALUES(github_status),
                        github_ai_chk = VALUES(github_ai_chk),
                        github_cve_info_status = VALUES(github_cve_info_status)
                """, (
                    hash_key,
                    row.get('github_date'), row.get('github_collect_time'),
                    row.get('github_link'), row.get('github_title'),
                    row.get('github_writer'), row.get('github_cve'),
                    row.get('github_readme'), row.get('github_download_path'),
                    row.get('github_status'), row.get('github_trans_msg'),
                    row.get('github_ai_chk'), row.get('github_cve_info_status'),
                    row.get('cve_collect_time'), row.get('cve_code'),
                    row.get('cve_state'), row.get('cve_date_reserved'),
                    row.get('cve_date_published'), row.get('cve_date_updated'),
                    row.get('cve_product'), row.get('cve_descriptions'),
                    row.get('cve_effect_version'), row.get('cve_cwe_id'),
                    row.get('cve_attack_type'), row.get('cve_cvss_score'),
                    row.get('cve_cvss_vector'), row.get('cve_cvss_severity'),
                    row.get('cve_cvss_vector_string'), row.get('cve_solutions'),
                    row.get('cve_response_data'), row.get('ai_cve_summary'),
                    row.get('ai_step'), row.get('ai_packet_text'),
                    row.get('ai_vuln_stage'), row.get('ai_stage_description'),
                    row.get('ai_mitre_tactic'), row.get('ai_mitre_technique'),
                    row.get('ai_snort_rule'), row.get('ai_remediation'),
                    row.get('ai_expected_response')
                ))
                conn.commit()
                inserted_count += 1
                insert_cursor.close()
            except Error as e:
                if "Duplicate entry" not in str(e):
                    log_print(f"[통합 데이터 삽입 오류] {e}", 'error')
        
        cursor.close()
        log_print(f"[통합 데이터] 총 {inserted_count}개 레코드 삽입/업데이트 완료")
        return inserted_count
        
    except Error as e:
        log_print(f"[통합 데이터 생성 오류] {e}", 'error')
        return 0


def create_quota_management_table(conn):
    """
    AI 할당량 관리 테이블 생성
    
    Args:
        conn: 데이터베이스 연결 객체
    """
    try:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS AI_Quota_Management (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_email VARCHAR(255) NOT NULL,
                daily_analysis_count INT DEFAULT 0,
                quota_exhausted_count INT DEFAULT 0,
                last_429_error_time DATETIME NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_account (account_email)
            )
        ''')
        conn.commit()
        cursor.close()
        log_print("[DB] AI_Quota_Management 테이블 생성/확인 완료")
    except Error as e:
        log_print(f"[DB 테이블 생성 오류] {e}", 'error')


# update_daily_analysis_count 함수는 제거됨
# gemini_quota_usage 테이블을 사용하도록 gemini_account_manager.py에서 처리


def record_429_error(conn, account_email):
    """
    429 에러 발생 기록
    
    Args:
        conn: 데이터베이스 연결 객체
        account_email: 계정 이메일
    """
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE AI_Quota_Management 
            SET quota_exhausted_count = quota_exhausted_count + 1,
                last_429_error_time = NOW()
            WHERE account_email = %s
        ''', (account_email,))
        
        conn.commit()
        cursor.close()
        log_print(f"[할당량] {account_email} 429 에러 기록")
    except Error as e:
        log_print(f"[429 에러 기록 오류] {e}", 'error')


def check_quota_exhausted(conn, account_email):
    """
    할당량 소진 여부 확인 (5번 연속 429 에러)
    
    Args:
        conn: 데이터베이스 연결 객체
        account_email: 계정 이메일
    
    Returns:
        bool: 할당량 소진 여부
    """
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT quota_exhausted_count, is_active
            FROM AI_Quota_Management 
            WHERE account_email = %s
        ''', (account_email,))
        
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            quota_exhausted_count, is_active = result
            return quota_exhausted_count >= 5 and is_active
        return False
    except Error as e:
        log_print(f"[할당량 확인 오류] {e}", 'error')
        return False


def mark_account_exhausted(conn, account_email):
    """
    계정 할당량 소진으로 표시
    
    Args:
        conn: 데이터베이스 연결 객체
        account_email: 계정 이메일
    """
    try:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE AI_Quota_Management 
            SET is_active = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_email = %s
        ''', (account_email,))
        
        conn.commit()
        cursor.close()
        log_print(f"[할당량] {account_email} 계정 할당량 소진으로 표시")
    except Error as e:
        log_print(f"[계정 소진 표시 오류] {e}", 'error')


def get_quota_stats(conn):
    """
    할당량 통계 조회 (대시보드용)
    
    Args:
        conn: 데이터베이스 연결 객체
    
    Returns:
        dict: 할당량 통계
    """
    try:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                COUNT(*) as total_accounts,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_accounts,
                SUM(daily_analysis_count) as total_daily_analysis,
                SUM(quota_exhausted_count) as total_429_errors
            FROM AI_Quota_Management
        ''')
        
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            return {
                'total_accounts': result[0] or 0,
                'active_accounts': result[1] or 0,
                'total_daily_analysis': result[2] or 0,
                'total_429_errors': result[3] or 0
            }
        return {'total_accounts': 0, 'active_accounts': 0, 'total_daily_analysis': 0, 'total_429_errors': 0}
    except Error as e:
        log_print(f"[할당량 통계 조회 오류] {e}", 'error')
        return {'total_accounts': 0, 'active_accounts': 0, 'total_daily_analysis': 0, 'total_429_errors': 0}

