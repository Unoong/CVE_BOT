#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CVE 수집기 테스트 스크립트
각 단계별로 문제를 진단합니다.
"""

import requests
import json
import traceback
from datetime import datetime
import urllib3
import mysql.connector
from mysql.connector import Error

# SSL 경고 비활성화
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 설정
API_BASE_URL = 'http://114.108.49.125:32577/api'
API_TOKEN = 'b36e748a6df96dcc95ae0098c34d3be542065e8502c30debc51b075d9d3fcdac'
DB_HOST = "192.168.0.11"
DB_PORT = 7777
DB_USER = "kakaotalk"
DB_PASSWORD = "!Qhdks0123"
DB_NAME = "ShinhanDS"


def test_api_connection():
    """API 연결 테스트"""
    print("\n" + "="*80)
    print("🔍 테스트 1: API 서버 연결 확인")
    print("="*80)
    
    try:
        url = f'{API_BASE_URL}/export/cve'
        headers = {'X-API-Token': API_TOKEN}
        params = {'page': 1, 'limit': 1}
        
        print(f"📍 URL: {url}")
        print(f"🔑 토큰: {API_TOKEN[:20]}...{API_TOKEN[-10:]}")
        print(f"📋 파라미터: {params}")
        
        response = requests.get(
            url,
            params=params,
            headers=headers,
            verify=False,
            timeout=10
        )
        
        print(f"\n✅ HTTP 상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ JSON 응답 수신 성공")
                print(f"   - success: {data.get('success', 'N/A')}")
                print(f"   - 데이터 개수: {len(data.get('data', []))}")
                print(f"   - 전체 개수: {data.get('pagination', {}).get('total', 'N/A')}")
                
                if data.get('data'):
                    first_cve = data['data'][0]
                    print(f"\n📌 첫 번째 CVE 샘플:")
                    print(f"   - CVE 코드: {first_cve.get('cve_code', 'N/A')}")
                    print(f"   - GitHub 링크: {first_cve.get('github_info', {}).get('link', 'N/A')}")
                    print(f"   - AI 분석 존재: {'있음' if first_cve.get('ai_analysis') else '없음'}")
                
                return True, data
            except json.JSONDecodeError as e:
                print(f"❌ JSON 파싱 실패: {e}")
                print(f"응답 내용: {response.text[:500]}")
                return False, None
        elif response.status_code == 401:
            print("❌ 인증 실패: API 토큰이 유효하지 않거나 만료되었습니다")
            print(f"응답: {response.text[:200]}")
            return False, None
        elif response.status_code == 403:
            print("❌ 권한 없음: 읽기 권한이 없는 토큰입니다")
            return False, None
        else:
            print(f"❌ HTTP 오류: {response.status_code}")
            print(f"응답: {response.text[:200]}")
            return False, None
            
    except requests.exceptions.ConnectionError as e:
        print(f"❌ 연결 실패: 서버에 연결할 수 없습니다")
        print(f"   오류: {str(e)[:200]}")
        print(f"   확인사항:")
        print(f"   1. 서버 주소가 올바른지 확인: {API_BASE_URL}")
        print(f"   2. 서버가 실행 중인지 확인")
        print(f"   3. 방화벽/네트워크 설정 확인")
        return False, None
    except requests.exceptions.Timeout:
        print("❌ 타임아웃: 서버 응답이 10초 내에 없습니다")
        return False, None
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {type(e).__name__} - {e}")
        traceback.print_exc()
        return False, None


def test_db_connection():
    """DB 연결 테스트"""
    print("\n" + "="*80)
    print("🔍 테스트 2: 데이터베이스 연결 확인")
    print("="*80)
    
    try:
        print(f"📍 DB 서버: {DB_HOST}:{DB_PORT}")
        print(f"👤 사용자: {DB_USER}")
        print(f"💾 데이터베이스: {DB_NAME}")
        
        conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        
        print("✅ DB 연결 성공!")
        
        # 테이블 확인
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES LIKE 'cve_data'")
        table_exists = cursor.fetchone()
        
        if table_exists:
            print("✅ cve_data 테이블 존재 확인")
            
            # 데이터 개수 확인
            cursor.execute("SELECT COUNT(*) FROM cve_data")
            count = cursor.fetchone()[0]
            print(f"   - 저장된 CVE 개수: {count}개")
            
            # 최근 데이터 확인
            cursor.execute("SELECT cve_code, collected_time, sent_kakao FROM cve_data ORDER BY collected_time DESC LIMIT 5")
            recent = cursor.fetchall()
            if recent:
                print(f"\n📌 최근 저장된 CVE (최대 5개):")
                for row in recent:
                    print(f"   - {row[0]} | {row[1]} | 전송: {row[2]}")
        else:
            print("⚠️ cve_data 테이블이 없습니다 (초기 실행 시 정상)")
        
        # 카카오톡 큐 테이블 확인
        cursor.execute("SHOW TABLES LIKE 'kakao_dispatch_queue'")
        queue_exists = cursor.fetchone()
        
        if queue_exists:
            print("✅ kakao_dispatch_queue 테이블 존재 확인")
            cursor.execute("SELECT COUNT(*) FROM kakao_dispatch_queue WHERE status = 'pending'")
            pending_count = cursor.fetchone()[0]
            print(f"   - 대기 중인 메시지: {pending_count}개")
        else:
            print("⚠️ kakao_dispatch_queue 테이블이 없습니다 (초기 실행 시 정상)")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Error as e:
        print(f"❌ DB 연결 실패: {e}")
        print(f"   확인사항:")
        print(f"   1. DB 서버 주소가 올바른지 확인: {DB_HOST}:{DB_PORT}")
        print(f"   2. 사용자명/비밀번호가 올바른지 확인")
        print(f"   3. 데이터베이스가 존재하는지 확인: {DB_NAME}")
        print(f"   4. 방화벽/네트워크 설정 확인")
        return False
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {type(e).__name__} - {e}")
        traceback.print_exc()
        return False


def test_data_collection():
    """실제 데이터 수집 테스트"""
    print("\n" + "="*80)
    print("🔍 테스트 3: 실제 데이터 수집 테스트")
    print("="*80)
    
    try:
        url = f'{API_BASE_URL}/export/cve'
        headers = {'X-API-Token': API_TOKEN}
        params = {'page': 1, 'limit': 5}
        
        print(f"📡 API 호출 중... (최대 5개)")
        response = requests.get(
            url,
            params=params,
            headers=headers,
            verify=False,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ API 호출 실패: HTTP {response.status_code}")
            return False
        
        data = response.json()
        
        if not data.get('success'):
            print(f"❌ API 응답 실패: {data.get('message', '알 수 없는 오류')}")
            return False
        
        cve_list = data.get('data', [])
        print(f"✅ {len(cve_list)}개 CVE 데이터 수신")
        
        if len(cve_list) == 0:
            print("⚠️ 수집할 CVE가 없습니다 (status='N'인 데이터가 없음)")
            print("   → 이는 정상일 수 있습니다. 모든 CVE가 이미 수집되었을 수 있습니다.")
            return True
        
        print(f"\n📋 수집된 CVE 목록:")
        for i, cve in enumerate(cve_list, 1):
            cve_code = cve.get('cve_code', 'N/A')
            github_link = cve.get('github_info', {}).get('link', 'N/A')
            has_ai = '있음' if cve.get('ai_analysis') else '없음'
            print(f"   {i}. {cve_code}")
            print(f"      GitHub: {github_link[:60]}...")
            print(f"      AI 분석: {has_ai}")
        
        # 데이터 구조 상세 확인
        if cve_list:
            first_cve = cve_list[0]
            print(f"\n📊 첫 번째 CVE 데이터 구조 분석:")
            print(f"   - cve_code: {first_cve.get('cve_code', '없음')}")
            print(f"   - github_info: {'있음' if first_cve.get('github_info') else '없음'}")
            print(f"   - cve_info: {'있음' if first_cve.get('cve_info') else '없음'}")
            print(f"   - ai_analysis: {'있음' if first_cve.get('ai_analysis') else '없음'}")
            
            if first_cve.get('ai_analysis'):
                ai = first_cve['ai_analysis']
                print(f"      - summary: {'있음' if ai.get('summary') else '없음'}")
                print(f"      - attack_steps: {len(ai.get('attack_steps', []))}개")
                print(f"      - mitre_attack: {'있음' if ai.get('mitre_attack') else '없음'}")
        
        return True
        
    except Exception as e:
        print(f"❌ 데이터 수집 테스트 실패: {e}")
        traceback.print_exc()
        return False


def test_db_insert():
    """DB 저장 테스트"""
    print("\n" + "="*80)
    print("🔍 테스트 4: DB 저장 기능 테스트")
    print("="*80)
    
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        
        cursor = conn.cursor()
        
        # 테스트 데이터 삽입
        test_cve_code = "TEST-CVE-2025-00001"
        test_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        print(f"📝 테스트 데이터 삽입 시도...")
        print(f"   CVE 코드: {test_cve_code}")
        
        try:
            cursor.execute("""
                INSERT INTO cve_data (
                    cve_code, collected_time, github_link, github_title,
                    cve_state, product, message
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                test_cve_code, test_time, "https://test.com", "테스트 제목",
                "TEST", "테스트 제품", "테스트 메시지"
            ))
            conn.commit()
            print("✅ 테스트 데이터 삽입 성공!")
            
            # 삭제
            cursor.execute("DELETE FROM cve_data WHERE cve_code = %s", (test_cve_code,))
            conn.commit()
            print("✅ 테스트 데이터 삭제 완료")
            
        except Error as e:
            if "Duplicate entry" in str(e):
                print("⚠️ 중복 데이터 (정상 - 이미 존재)")
                # 삭제 후 재시도
                cursor.execute("DELETE FROM cve_data WHERE cve_code = %s", (test_cve_code,))
                conn.commit()
            else:
                raise
        
        cursor.close()
        conn.close()
        
        return True
        
    except Error as e:
        print(f"❌ DB 저장 테스트 실패: {e}")
        return False
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {e}")
        traceback.print_exc()
        return False


def main():
    """전체 테스트 실행"""
    print("\n" + "="*80)
    print("🧪 CVE 수집기 종합 테스트")
    print("="*80)
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    results = {}
    
    # 테스트 1: API 연결
    results['api'] = test_api_connection()
    
    # 테스트 2: DB 연결
    results['db'] = test_db_connection()
    
    # 테스트 3: 데이터 수집
    if results['api']:
        results['collection'] = test_data_collection()
    else:
        print("\n⚠️ API 연결 실패로 데이터 수집 테스트 건너뜀")
        results['collection'] = False
    
    # 테스트 4: DB 저장
    if results['db']:
        results['db_insert'] = test_db_insert()
    else:
        print("\n⚠️ DB 연결 실패로 DB 저장 테스트 건너뜀")
        results['db_insert'] = False
    
    # 결과 요약
    print("\n" + "="*80)
    print("📊 테스트 결과 요약")
    print("="*80)
    
    for test_name, result in results.items():
        status = "✅ 통과" if result else "❌ 실패"
        test_names = {
            'api': 'API 서버 연결',
            'db': '데이터베이스 연결',
            'collection': '데이터 수집',
            'db_insert': 'DB 저장'
        }
        print(f"   {test_names.get(test_name, test_name)}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*80)
    if all_passed:
        print("✅ 모든 테스트 통과! 수집기가 정상적으로 동작할 수 있습니다.")
    else:
        print("❌ 일부 테스트 실패. 위의 오류 메시지를 확인하세요.")
    print("="*80)


if __name__ == '__main__':
    main()

