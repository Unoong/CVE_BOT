#!/usr/bin/env python3

# -*- coding: utf-8 -*-

"""

통합 CVE 수집 및 카카오톡 전송 시스템

- API에서 CVE 데이터 수집

- 데이터 정제 및 구조화

- MySQL DB에 적재

- 카카오톡으로 자동 전송

"""



import requests

import time

import json

import traceback

from datetime import datetime

import urllib3

import mysql.connector

from mysql.connector import Error

import sys

import os

from typing import Optional

from pathlib import Path



# Windows 콘솔 인코딩 설정 (UTF-8)

if sys.platform == 'win32':

    try:

        # UTF-8 출력 설정

        sys.stdout.reconfigure(encoding='utf-8')

        sys.stderr.reconfigure(encoding='utf-8')

    except:

        # Python 3.6 이하 버전 호환

        import codecs

        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')



# SSL 경고 비활성화

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)





# ==========================================

# 설정

# ==========================================

class Config:

    # API 서버 설정

    API_BASE_URL = 'http://114.108.49.125:32577/api'

    API_TOKEN = 'b36e748a6df96dcc95ae0098c34d3be542065e8502c30debc51b075d9d3fcdac'

    PAGE_SIZE = 50

    REPEAT_INTERVAL = 300  # 5분 (초 단위)

    VERIFY_SSL = False

    

    # MySQL 설정

    DB_HOST = "192.168.0.11"

    DB_PORT = 7777

    DB_USER = "kakaotalk"

    DB_PASSWORD = "!Qhdks0123"

    DB_NAME = "ShinhanDS"

    

    # 카카오톡 전송 설정 (config.json에서 재정의 가능)

    KAKAO_USER = "임정훈"

    KAKAO_ROOM = "CVE 취약점 알림방"





# ==========================================

# 설정 로딩 유틸리티

# ==========================================

def load_external_config(config_path: Optional[Path] = None) -> None:
    """config.json 또는 환경 변수에서 설정을 로드"""
    # 우선 환경 변수 확인 (최우선)
    env_host = os.environ.get('CVE_DB_HOST')
    env_port = os.environ.get('CVE_DB_PORT')
    env_user = os.environ.get('CVE_DB_USER')
    env_password = os.environ.get('CVE_DB_PASSWORD')
    env_name = os.environ.get('CVE_DB_NAME')

    if env_host:
        Config.DB_HOST = env_host
    if env_port:
        try:
            Config.DB_PORT = int(env_port)
        except ValueError:
            print(f"[설정 경고] CVE_DB_PORT 환경 변수를 정수로 변환할 수 없습니다: {env_port}")
    if env_user:
        Config.DB_USER = env_user
    if env_password is not None:
        Config.DB_PASSWORD = env_password
    if env_name:
        Config.DB_NAME = env_name

    # config.json 로드 (환경 변수가 없을 경우)
    if config_path is None:
        config_path = Path(__file__).resolve().parent / 'config.json'
    else:
        config_path = Path(config_path)
        if not config_path.is_absolute():
            config_path = Path(__file__).resolve().parent / config_path

    if not config_path.exists():
        print(f"[설정] config.json 파일을 찾을 수 없습니다: {config_path}")
        print("        기본 DB 설정을 사용합니다. 필요 시 config.json을 생성하세요.")
        return

    try:
        with config_path.open('r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"[설정 오류] config.json 로드 실패: {e}")
        print("        기본 DB 설정을 사용합니다.")
        return

    db_cfg = data.get('database', {})
    if db_cfg:
        Config.DB_HOST = db_cfg.get('host', Config.DB_HOST)
        if 'port' in db_cfg:
            try:
                Config.DB_PORT = int(db_cfg['port'])
            except (TypeError, ValueError):
                print(f"[설정 경고] config.json의 port 값을 정수로 변환할 수 없습니다: {db_cfg['port']}")
        Config.DB_USER = db_cfg.get('user', Config.DB_USER)
        # 비밀번호는 빈 문자열까지 허용해야 하므로 get 사용
        if 'password' in db_cfg:
            Config.DB_PASSWORD = db_cfg.get('password', Config.DB_PASSWORD)
        Config.DB_NAME = db_cfg.get('database', Config.DB_NAME)

    collection_cfg = data.get('collection', {})
    if collection_cfg:
        # 반복 간격이 명시된 경우에만 업데이트
        repeat_interval = collection_cfg.get('repeat_interval') or collection_cfg.get('REPEAT_INTERVAL')
        if repeat_interval:
            try:
                Config.REPEAT_INTERVAL = int(repeat_interval)
            except (TypeError, ValueError):
                print(f"[설정 경고] repeat_interval 값을 정수로 변환할 수 없습니다: {repeat_interval}")

    kakao_cfg = data.get('kakao', {})
    if kakao_cfg:
        Config.KAKAO_USER = kakao_cfg.get('user', Config.KAKAO_USER)
        Config.KAKAO_ROOM = kakao_cfg.get('room', Config.KAKAO_ROOM)

    print("[설정] config.json의 DB 설정을 적용했습니다:")
    print(f"        HOST={Config.DB_HOST}, PORT={Config.DB_PORT}, USER={Config.DB_USER}, DB={Config.DB_NAME}")


# 모듈 임포트 시 설정 로드시도
load_external_config()



# ==========================================

# 데이터베이스 관련 함수

# ==========================================

def get_db_connection():

    """MySQL DB 연결"""

    try:

        conn = mysql.connector.connect(

            host=Config.DB_HOST,

            port=Config.DB_PORT,

            user=Config.DB_USER,

            password=Config.DB_PASSWORD,

            database=Config.DB_NAME

        )

        return conn

    except Error as e:

        print(f"[DB 연결 오류] {e}")

        return None





def init_db():

    """DB 테이블 초기화"""

    print("\n[DB] 테이블 생성 확인 중...")

    conn = get_db_connection()

    if conn is None:

        print("❌ MySQL 연결 실패 - 테이블 생성 불가")

        return False

    

    try:

        cursor = conn.cursor()

        

        # CVE 정보 저장 테이블

        cursor.execute('''

            CREATE TABLE IF NOT EXISTS cve_data (

                id INT AUTO_INCREMENT PRIMARY KEY,

                cve_code VARCHAR(50) UNIQUE NOT NULL,

                collected_time DATETIME NOT NULL,

                github_link TEXT,

                github_title TEXT,

                github_writer VARCHAR(255),

                cve_state VARCHAR(50),

                product VARCHAR(255),

                cvss_score VARCHAR(10),

                cvss_severity VARCHAR(20),

                message TEXT,

                sent_kakao VARCHAR(1) DEFAULT 'N',

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                INDEX idx_cve_code (cve_code),

                INDEX idx_collected_time (collected_time),

                INDEX idx_sent_kakao (sent_kakao)

            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ''')

        

        # 카카오톡 전송 큐 테이블 (기존)

        cursor.execute('''

            CREATE TABLE IF NOT EXISTS kakao_dispatch_queue (

                id INT AUTO_INCREMENT PRIMARY KEY,

                request_time DATETIME NOT NULL,

                user VARCHAR(100),

                room_name VARCHAR(255),

                message TEXT,

                status VARCHAR(20) DEFAULT 'pending',

                sent_time DATETIME,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                INDEX idx_status (status),

                INDEX idx_request_time (request_time)

            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ''')

        

        conn.commit()

        print("✅ DB 테이블 생성 확인 완료")

        return True

    

    except Error as e:

        print(f"❌ 테이블 생성 중 오류: {e}")

        return False

    finally:

        conn.close()





def insert_cve_data(cve_code, collected_time, github_link, github_title, github_writer,

                    cve_state, product, cvss_score, cvss_severity, message):

    """CVE 데이터를 DB에 저장"""

    conn = get_db_connection()

    if not conn:

        return False

    

    try:

        cursor = conn.cursor()

        

        # 중복 확인

        check_sql = "SELECT id FROM cve_data WHERE cve_code = %s"

        cursor.execute(check_sql, (cve_code,))

        existing = cursor.fetchone()

        

        if existing:

            # 업데이트

            update_sql = """

            UPDATE cve_data SET

                collected_time = %s,

                github_link = %s,

                github_title = %s,

                github_writer = %s,

                cve_state = %s,

                product = %s,

                cvss_score = %s,

                cvss_severity = %s,

                message = %s

            WHERE cve_code = %s

            """

            cursor.execute(update_sql, (

                collected_time, github_link, github_title, github_writer,

                cve_state, product, cvss_score, cvss_severity, message, cve_code

            ))

            print(f"   [DB] {cve_code} 업데이트 완료")

        else:

            # 신규 삽입

            insert_sql = """

            INSERT INTO cve_data (

                cve_code, collected_time, github_link, github_title, github_writer,

                cve_state, product, cvss_score, cvss_severity, message

            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)

            """

            cursor.execute(insert_sql, (

                cve_code, collected_time, github_link, github_title, github_writer,

                cve_state, product, cvss_score, cvss_severity, message

            ))

            print(f"   [DB] {cve_code} 신규 삽입 완료 (ID: {cursor.lastrowid})")

        

        conn.commit()

        return True

    

    except Error as e:

        print(f"   [DB 오류] {cve_code}: {e}")

        return False

    finally:

        cursor.close()

        conn.close()





def insert_dispatch_message(user, room_name, message):

    """카카오톡 전송 큐에 메시지 삽입"""

    conn = get_db_connection()

    if not conn:

        return False

    

    try:

        cursor = conn.cursor()

        sql = """

        INSERT INTO kakao_dispatch_queue (request_time, user, room_name, message, status)

        VALUES (%s, %s, %s, %s, 'pending')

        """

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        cursor.execute(sql, (now, user, room_name, message))

        conn.commit()

        print(f"   [카카오톡] 전송 큐 삽입 완료 (ID: {cursor.lastrowid})")

        return True

    except Error as e:

        print(f"   [카카오톡 오류] {e}")

        return False

    finally:

        cursor.close()

        conn.close()





def mark_cve_as_sent(cve_code):

    """CVE를 카카오톡 전송 완료로 표시"""

    conn = get_db_connection()

    if not conn:

        return False

    

    try:

        cursor = conn.cursor()

        sql = "UPDATE cve_data SET sent_kakao = 'Y' WHERE cve_code = %s"

        cursor.execute(sql, (cve_code,))

        conn.commit()

        return True

    except Error as e:

        print(f"   [DB 오류] sent_kakao 업데이트 실패: {e}")

        return False

    finally:

        cursor.close()

        conn.close()





# ==========================================

# API 데이터 수집 함수

# ==========================================

def fetch_cve_data(page=1, limit=50, cve_filter=None, severity_filter=None):

    """CVE 데이터를 API에서 수집"""

    try:

        url = f'{Config.API_BASE_URL}/export/cve'

        params = {'page': page, 'limit': limit}

        

        if cve_filter:

            params['cve'] = cve_filter

        if severity_filter:

            params['severity'] = severity_filter

        

        headers = {'X-API-Token': Config.API_TOKEN}

        

        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] API 호출 중...")

        print(f"📍 URL: {url}, 페이지: {page}, 크기: {limit}")

        

        response = requests.get(

            url,

            params=params,

            headers=headers,

            verify=Config.VERIFY_SSL,

            timeout=30

        )

        

        print(f"✅ 서버 응답: HTTP {response.status_code}")

        

        if response.status_code == 200:

            try:

                data = response.json()

                if data.get('success'):

                    print(f"✅ 수집 완료: {len(data['data'])}개 CVE")

                    print(f"   전체: {data['pagination']['total']}개 (페이지 {data['pagination']['page']}/{data['pagination']['total_pages']})")

                    return data

                else:

                    print(f"❌ API 응답 실패: {data.get('message', '알 수 없는 오류')}")

                    return None

            except json.JSONDecodeError:

                print(f"❌ JSON 파싱 실패: {response.text[:500]}")

                return None

        

        elif response.status_code == 401:

            print("❌ 인증 실패: API 토큰을 확인하세요")

            return None

        

        elif response.status_code == 403:

            print("❌ 권한 없음: 읽기 권한이 있는 토큰을 사용하세요")

            return None

        

        else:

            print(f"❌ HTTP {response.status_code} 오류: {response.reason}")

            return None

    

    except requests.exceptions.ConnectionError as e:

        print(f"❌ 연결 실패: {str(e)[:200]}")

        return None

    

    except requests.exceptions.Timeout:

        print("❌ 타임아웃: 서버 응답 대기 시간 초과 (30초)")

        return None

    

    except Exception as e:

        print(f"❌ 예상치 못한 오류: {type(e).__name__} - {str(e)}")

        traceback.print_exc()

        return None





def confirm_collection(links):

    """수집 완료된 CVE의 status를 'Y'로 업데이트"""

    try:

        if not links:

            return True

        

        url = f'{Config.API_BASE_URL}/export/cve/confirm'

        headers = {'X-API-Token': Config.API_TOKEN}

        data = {'links': links}

        

        print(f"\n📤 수집 완료 확인 중... ({len(links)}개)")

        

        response = requests.post(

            url,

            json=data,

            headers=headers,

            verify=Config.VERIFY_SSL,

            timeout=30

        )

        

        if response.status_code == 200:

            result = response.json()

            print(f"✅ status 업데이트 완료: {result.get('updated_count', 0)}개")

            return True

        else:

            print(f"⚠️ status 업데이트 실패 (HTTP {response.status_code})")

            return False

    

    except Exception as e:

        print(f"⚠️ status 업데이트 오류: {e}")

        return False





# ==========================================

# CVE 데이터 정제 및 포맷팅 함수

# ==========================================

def format_detailed_cve_message(cve_data):
    """
    CVE 데이터를 모바일 친화적이고 정보 위주의 메시지로 변환
    - 구분선 최소화
    - 핵심 정보 중심
    - AI 분석 데이터 포함
    """
    try:
        msg_parts = []
        cve_code = cve_data.get('cve_code', 'N/A')

        # 헤더
        msg_parts.append(f"🔴 {cve_code}")

        # 취약점 관리 시스템 링크
        if cve_code != 'N/A':
            vuln_system_link = f"https://www.ai-platform.store:3000/cve/{cve_code}"
            msg_parts.append(f"🌐 {vuln_system_link}")

        # GitHub POC 정보
        github = cve_data.get('github_info') or {}
        if github.get('title'):
            msg_parts.append(f"\n📌 POC: {github.get('title', 'N/A')}")
            if github.get('writer'):
                msg_parts.append(f"작성자: {github.get('writer')}")
            if github.get('link'):
                msg_parts.append(f"링크: {github.get('link')}")

        # CVE 기본 정보
        cve_info = cve_data.get('cve_info')
        if cve_info:
            # CVSS 점수
            cvss = cve_info.get('cvss') or {}
            cvss_score = cvss.get('score', 'N/A')
            cvss_severity = cvss.get('severity', 'N/A')
            if cvss_score != 'N/A':
                msg_parts.append(f"\n📊 CVSS: {cvss_score}/10.0 ({cvss_severity})")

            # 제품 정보
            product = cve_info.get('product', '')
            if product and product != 'N/A':
                msg_parts.append(f"🎯 제품: {product}")

            # CWE 정보
            cwe_id = cve_info.get('cwe_id', '')
            if cwe_id and cwe_id != 'N/A':
                msg_parts.append(f"🔍 CWE: {cwe_id}")

            # 취약점 설명
            descriptions = cve_info.get('descriptions', '')
            if descriptions and descriptions != 'N/A':
                msg_parts.append(f"\n📖 설명:\n{descriptions}")

        # AI 분석 정보
        ai = cve_data.get('ai_analysis')
        if ai:
            # 요약
            summary = ai.get('summary', '')
            if summary and summary != 'N/A':
                msg_parts.append(f"\n🤖 AI 분석 요약:\n{summary}")

            # 공격 단계
            attack_steps = ai.get('attack_steps') or []
            if attack_steps:
                msg_parts.append(f"\n⚔️ 공격 단계 ({len(attack_steps)}단계):")

                for step in attack_steps:
                    step_num = step.get('step', '')
                    vuln_stage = step.get('vuln_stage', '')
                    stage_desc = step.get('stage_description', '')
                    packet_text = step.get('packet_text', '')
                    expected_response = step.get('expected_response', '')
                    snort_rule = step.get('snort_rule', '')
                    mitre_tactic = step.get('mitre_tactic', '')
                    mitre_technique = step.get('mitre_technique', '')

                    if step_num:
                        step_header = f"[{step_num}]"
                        if vuln_stage and vuln_stage != 'N/A':
                            step_header += f" {vuln_stage}"
                        msg_parts.append(f"\n{step_header}")

                    if stage_desc and stage_desc != 'N/A':
                        msg_parts.append(f"  설명: {stage_desc}")

                    if packet_text and packet_text != 'N/A':
                        msg_parts.append(f"  📦 패킷:\n{packet_text}")

                    if expected_response and expected_response != 'N/A':
                        msg_parts.append(f"  ✅ 성공 조건:\n{expected_response}")

                    if snort_rule and snort_rule != 'N/A':
                        msg_parts.append(f"  🛡️ Snort 탐지 패턴:\n{snort_rule}")

                    if mitre_tactic or mitre_technique:
                        mitre_info = []
                        if mitre_tactic and mitre_tactic != 'N/A':
                            mitre_info.append(f"전술: {mitre_tactic}")
                        if mitre_technique and mitre_technique != 'N/A':
                            mitre_info.append(f"기술: {mitre_technique}")
                        if mitre_info:
                            msg_parts.append(f"  🎯 MITRE: {', '.join(mitre_info)}")

            # 대응 방법
            remediation = ai.get('remediation', '')
            if remediation and remediation != 'N/A':
                msg_parts.append(f"\n🛡️ 대응 방안:\n{remediation}")

        # 푸터
        msg_parts.append(f"\n🕒 수집: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        return "\n".join(msg_parts)

    except Exception as e:
        error_msg = f"[메시지 포맷팅 오류] {e}\n\n"
        error_msg += f"오류 타입: {type(e).__name__}\n"
        error_msg += f"오류 위치: {traceback.format_exc()}\n\n"
        error_msg += f"원본 데이터:\n{json.dumps(cve_data, ensure_ascii=False, indent=2)}"
        print(f"⚠️ 메시지 포맷팅 오류: {e}")
        traceback.print_exc()
        return error_msg





# ==========================================

# CVE 처리 함수 (수집 → 정제 → DB 저장 → 카카오톡 전송)

# ==========================================

def process_cve_data(cve_data):

    """

    CVE 데이터 처리 파이프라인

    1. 데이터 정제

    2. DB에 저장

    3. 카카오톡으로 전송

    """

    try:

        cve_code = cve_data.get('cve_code', 'UNKNOWN')

        print(f"\n{'='*70}")

        print(f"[처리 중] {cve_code}")

        print(f"{'='*70}")

        

        # 1. 데이터 추출

        collected_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        

        # GitHub 정보 추출 (None 체크)

        github_info = cve_data.get('github_info') or {}

        github_link = github_info.get('link', '')

        github_title = github_info.get('title', '')

        github_writer = github_info.get('writer', '')

        

        # CVE 정보 추출 (None 체크 - API에서 null로 올 수 있음)

        cve_info = cve_data.get('cve_info') or {}

        cve_state = cve_info.get('state', '')

        product = cve_info.get('product', '')

        # product 필드 길이 제한 (VARCHAR(255)에 맞춤)

        if product and len(product) > 255:

            product = product[:252] + "..."

        

        # CVSS 정보 추출 (None 체크)

        cvss = cve_info.get('cvss') or {}

        cvss_score = str(cvss.get('score', ''))

        cvss_severity = cvss.get('severity', '')

        

        # 2. 상세 메시지 생성

        detailed_message = format_detailed_cve_message(cve_data)

        

        # 3. DB에 저장

        print("\n[1/3] DB 저장 중...")

        db_success = insert_cve_data(

            cve_code=cve_code,

            collected_time=collected_time,

            github_link=github_link,

            github_title=github_title,

            github_writer=github_writer,

            cve_state=cve_state,

            product=product,

            cvss_score=cvss_score,

            cvss_severity=cvss_severity,

            message=detailed_message

        )

        

        if not db_success:

            print("⚠️ DB 저장 실패, 계속 진행...")

        

        # 4. 카카오톡 전송 큐에 삽입

        print("\n[2/3] 카카오톡 전송 큐 삽입 중...")

        kakao_success = insert_dispatch_message(

            user=Config.KAKAO_USER,

            room_name=Config.KAKAO_ROOM,

            message=detailed_message

        )

        

        if not kakao_success:

            print("⚠️ 카카오톡 전송 큐 삽입 실패")

            return False

        

        # 5. 전송 완료 표시

        print("\n[3/3] 전송 완료 표시 중...")

        mark_cve_as_sent(cve_code)

        

        print(f"\n✅ {cve_code} 처리 완료!")

        return True

    

    except Exception as e:

        print(f"❌ CVE 처리 오류: {e}")

        traceback.print_exc()

        return False





# ==========================================

# 메인 수집 함수

# ==========================================

def collect_and_process_cves(max_count=10):

    """

    최신 CVE 데이터를 수집하고 처리

    

    Returns:

        tuple: (처리 성공 개수, 수집된 링크 리스트)

    """

    print(f"\n{'='*70}")

    print(f"[수집 시작] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    print(f"{'='*70}\n")

    

    # 1. 최신 데이터 수집

    result = fetch_cve_data(page=1, limit=max_count)

    

    if not result:

        print("⚠️ 데이터 수집 실패")

        return 0, []

    

    # 2. 각 CVE 처리 (중복 제거)

    success_count = 0

    collected_links = []

    processed_cves = set()  # 중복 처리 방지

    for i, cve_data in enumerate(result['data'], 1):

        cve_code = cve_data.get('cve_code', '')

        github_link = cve_data.get('github_info', {}).get('link', '')

        # 중복 체크 (CVE 코드 또는 GitHub 링크 기준)

        unique_key = f"{cve_code}:{github_link}"

        if unique_key in processed_cves:

            print(f"\n⚠️ 중복 건너뛰기: {cve_code} (이미 처리됨)")

            continue

        processed_cves.add(unique_key)

        print(f"\n\n{'#'*70}")

        print(f"# [{i}/{len(result['data'])}] CVE 처리 중")

        print(f"{'#'*70}")

        if process_cve_data(cve_data):

            success_count += 1

            # 수집된 링크 저장 (status 업데이트용)

            if github_link:

                collected_links.append(github_link)

        

        # API 부하 방지

        if i < len(result['data']):

            time.sleep(0.5)

    

    print(f"\n\n{'='*70}")

    print(f"✅ 처리 완료: {success_count}/{len(result['data'])}개")

    print(f"{'='*70}\n")

    

    return success_count, collected_links





# ==========================================

# 반복 수집 함수

# ==========================================

def collect_cve_continuously():

    """5분 간격으로 CVE 데이터를 반복 수집 및 처리"""

    print(f"\n{'='*70}")

    print(f"🚀 통합 CVE 수집 시스템 시작")

    print(f"{'='*70}")

    print(f"📡 API 서버: {Config.API_BASE_URL}")

    print(f"🔑 API 토큰: {Config.API_TOKEN[:10]}...{Config.API_TOKEN[-5:]}")

    print(f"💾 DB 서버: {Config.DB_HOST}:{Config.DB_PORT}")

    print(f"💬 카카오톡: {Config.KAKAO_USER} → {Config.KAKAO_ROOM}")

    print(f"⏰ 수집 간격: {Config.REPEAT_INTERVAL}초 (5분)")

    print(f"{'='*70}\n")

    

    # DB 초기화

    if not init_db():

        print("❌ DB 초기화 실패, 프로그램 종료")

        return

    

    # 연결 테스트

    print("\n🔍 서버 연결 테스트 중...")

    test_url = f"{Config.API_BASE_URL}/export/cve"

    try:

        test_response = requests.head(test_url, verify=Config.VERIFY_SSL, timeout=5)

        print(f"✅ API 서버 접근 가능 (HTTP {test_response.status_code})")

    except Exception as e:

        print(f"⚠️ API 서버 연결 테스트 실패: {str(e)[:200]}")

        print("   → 계속 진행하지만, 실제 수집 시 문제가 있을 수 있습니다\n")

    

    try:

        while True:

            # CVE 수집 및 처리

            success_count, collected_links = collect_and_process_cves(max_count=10)

            

            # API 서버에 수집 완료 확인

            if collected_links:

                print("\n" + "="*70)

                confirm_collection(collected_links)

                print("="*70)

            

            # 다음 수집까지 대기

            next_time = datetime.fromtimestamp(time.time() + Config.REPEAT_INTERVAL)

            print(f"\n💤 다음 수집까지 {Config.REPEAT_INTERVAL}초 ({Config.REPEAT_INTERVAL//60}분) 대기...")

            print(f"   다음 수집 예정: {next_time.strftime('%Y-%m-%d %H:%M:%S')}")

            print(f"   종료하려면 Ctrl+C를 누르세요\n")

            print("="*70)

            

            time.sleep(Config.REPEAT_INTERVAL)

    

    except KeyboardInterrupt:

        print("\n\n⛔ 사용자가 중지했습니다")

        print("프로그램을 종료합니다\n")





# ==========================================

# 테스트 함수

# ==========================================

def test_all_connections():
    """모든 연결 테스트 (API, DB, 데이터 수집)"""
    print("\n" + "="*70)
    print("🔍 전체 시스템 테스트 시작")
    print("="*70 + "\n")
    
    test_results = {
        'api_connection': False,
        'db_connection': False,
        'db_init': False,
        'data_fetch': False,
        'data_count': 0
    }
    
    # 1. API 연결 테스트
    print("[1/4] API 서버 연결 테스트...")
    print("-" * 70)
    try:
        test_url = f"{Config.API_BASE_URL}/export/cve"
        headers = {'X-API-Token': Config.API_TOKEN}
        
        print(f"📍 URL: {test_url}")
        print(f"🔑 토큰: {Config.API_TOKEN[:10]}...{Config.API_TOKEN[-5:]}")
        
        response = requests.get(
            test_url,
            params={'page': 1, 'limit': 1},
            headers=headers,
            verify=Config.VERIFY_SSL,
            timeout=10
        )
        
        print(f"📡 HTTP 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    print("✅ API 서버 연결 성공!")
                    print(f"   응답 데이터: {len(data.get('data', []))}개")
                    test_results['api_connection'] = True
                else:
                    print(f"❌ API 응답 실패: {data.get('message', '알 수 없는 오류')}")
            except json.JSONDecodeError:
                print(f"❌ JSON 파싱 실패")
                print(f"   응답 내용: {response.text[:200]}")
        elif response.status_code == 401:
            print("❌ 인증 실패: API 토큰을 확인하세요")
        elif response.status_code == 403:
            print("❌ 권한 없음: 읽기 권한이 있는 토큰을 사용하세요")
        else:
            print(f"❌ HTTP {response.status_code} 오류: {response.reason}")
            print(f"   응답 내용: {response.text[:200]}")
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ 연결 실패: {str(e)[:200]}")
        print("   → 네트워크 연결 또는 방화벽 설정을 확인하세요")
    except requests.exceptions.Timeout:
        print("❌ 타임아웃: 서버 응답 대기 시간 초과 (10초)")
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {type(e).__name__} - {str(e)}")
        traceback.print_exc()
    
    print("\n")
    
    # 2. DB 연결 테스트
    print("[2/4] MySQL 데이터베이스 연결 테스트...")
    print("-" * 70)
    try:
        print(f"📍 호스트: {Config.DB_HOST}:{Config.DB_PORT}")
        print(f"👤 사용자: {Config.DB_USER}")
        print(f"💾 데이터베이스: {Config.DB_NAME}")
        
        conn = get_db_connection()
        if conn:
            print("✅ DB 연결 성공!")
            test_results['db_connection'] = True
            
            # 테이블 존재 확인
            cursor = conn.cursor()
            cursor.execute("SHOW TABLES LIKE 'cve_data'")
            if cursor.fetchone():
                print("✅ cve_data 테이블 존재 확인")
            else:
                print("⚠️ cve_data 테이블이 없습니다")
            
            cursor.execute("SHOW TABLES LIKE 'kakao_dispatch_queue'")
            if cursor.fetchone():
                print("✅ kakao_dispatch_queue 테이블 존재 확인")
            else:
                print("⚠️ kakao_dispatch_queue 테이블이 없습니다")
            
            # 데이터 개수 확인
            try:
                cursor.execute("SELECT COUNT(*) FROM cve_data")
                count = cursor.fetchone()[0]
                print(f"📊 저장된 CVE 데이터: {count}개")
                test_results['data_count'] = count
            except:
                print("⚠️ cve_data 테이블이 없거나 접근할 수 없습니다")
            
            cursor.close()
            conn.close()
        else:
            print("❌ DB 연결 실패")
            print("   → 호스트, 포트, 사용자명, 비밀번호를 확인하세요")
            
    except Exception as e:
        print(f"❌ DB 연결 오류: {type(e).__name__} - {str(e)}")
        traceback.print_exc()
    
    print("\n")
    
    # 3. DB 초기화 테스트
    print("[3/4] DB 테이블 초기화 테스트...")
    print("-" * 70)
    try:
        if init_db():
            print("✅ DB 테이블 초기화 성공!")
            test_results['db_init'] = True
        else:
            print("❌ DB 테이블 초기화 실패")
    except Exception as e:
        print(f"❌ DB 초기화 오류: {type(e).__name__} - {str(e)}")
        traceback.print_exc()
    
    print("\n")
    
    # 4. 실제 데이터 수집 테스트
    print("[4/4] 실제 데이터 수집 테스트...")
    print("-" * 70)
    try:
        result = fetch_cve_data(page=1, limit=3)
        
        if result and result.get('success'):
            data_count = len(result.get('data', []))
            print(f"✅ 데이터 수집 성공: {data_count}개 CVE 수집됨")
            test_results['data_fetch'] = True
            test_results['data_count'] = data_count
            
            if data_count > 0:
                print("\n📋 수집된 CVE 목록:")
                for i, cve in enumerate(result['data'][:3], 1):
                    cve_code = cve.get('cve_code', 'UNKNOWN')
                    github_title = cve.get('github_info', {}).get('title', 'N/A')
                    print(f"   {i}. {cve_code} - {github_title[:50]}...")
        else:
            print("❌ 데이터 수집 실패")
            
    except Exception as e:
        print(f"❌ 데이터 수집 오류: {type(e).__name__} - {str(e)}")
        traceback.print_exc()
    
    print("\n" + "="*70)
    print("📊 테스트 결과 요약")
    print("="*70)
    print(f"API 연결:        {'✅ 성공' if test_results['api_connection'] else '❌ 실패'}")
    print(f"DB 연결:         {'✅ 성공' if test_results['db_connection'] else '❌ 실패'}")
    print(f"DB 초기화:       {'✅ 성공' if test_results['db_init'] else '❌ 실패'}")
    print(f"데이터 수집:     {'✅ 성공' if test_results['data_fetch'] else '❌ 실패'}")
    print(f"수집된 데이터:   {test_results['data_count']}개")
    print("="*70)
    
    if all([test_results['api_connection'], test_results['db_connection'], test_results['db_init']]):
        print("\n✅ 모든 기본 연결 테스트 통과! 시스템이 정상 작동합니다.")
    else:
        print("\n❌ 일부 연결 테스트 실패. 위의 오류 메시지를 확인하세요.")
    
    return test_results


def test_single_collection():
    """단일 CVE 수집 및 처리 테스트"""
    print("\n" + "="*70)
    print("🧪 단일 CVE 수집 및 처리 테스트")
    print("="*70 + "\n")
    
    # DB 초기화
    if not init_db():
        print("❌ DB 초기화 실패")
        return False
    
    # 데이터 수집
    print("📡 데이터 수집 중...")
    success_count, collected_links = collect_and_process_cves(max_count=1)
    
    if success_count > 0:
        print(f"\n✅ 테스트 성공: {success_count}개 CVE 처리 완료")
        if collected_links:
            print(f"📤 수집 완료 확인 중...")
            confirm_collection(collected_links)
        return True
    else:
        print("\n❌ 테스트 실패: CVE 처리 실패")
        return False


# ==========================================

# 사용 예제

# ==========================================

if __name__ == '__main__':
    import sys
    
    # 명령줄 인자 확인
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()
        
        if mode == 'test' or mode == '--test':
            # 테스트 모드
            test_all_connections()
        elif mode == 'single' or mode == '--single':
            # 단일 수집 테스트
            test_single_collection()
        elif mode == 'help' or mode == '--help' or mode == '-h':
            print("\n사용법:")
            print("  python cve_api_collector.py          # 정상 실행 (5분 간격 반복)")
            print("  python cve_api_collector.py test    # 연결 테스트")
            print("  python cve_api_collector.py single  # 단일 CVE 수집 테스트")
            print("  python cve_api_collector.py help     # 도움말")
        else:
            print(f"❌ 알 수 없는 모드: {mode}")
            print("   'help'를 입력하여 사용법을 확인하세요")
    else:
        # ========================================
        # 방법 1: 한 번만 수집 및 처리
        # ========================================
        # init_db()
        # success_count, links = collect_and_process_cves(max_count=5)
        # confirm_collection(links)
        
        # ========================================
        # 방법 2: 5분 간격 반복 수집 (권장)
        # ========================================
        collect_cve_continuously()
