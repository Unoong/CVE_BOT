"""
cve_info_status 컬럼 및 데이터 상태 확인
"""
import json
import mysql.connector


def load_config():
    """설정 파일 로드"""
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    print("=" * 80)
    print("cve_info_status 컬럼 상태 확인")
    print("=" * 80)
    
    # 설정 로드
    config = load_config()
    
    # DB 연결
    try:
        conn = mysql.connector.connect(
            host=config['database']['host'],
            port=config['database']['port'],
            user=config['database']['user'],
            password=config['database']['password'],
            database=config['database']['database']
        )
        print("✅ 데이터베이스 연결 성공")
    except Exception as e:
        print(f"❌ DB 연결 오류: {e}")
        return
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. 컬럼 존재 여부 확인
        print("\n[1] cve_info_status 컬럼 존재 여부 확인")
        cursor.execute("""
            SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = %s
            AND TABLE_NAME = 'Github_CVE_Info'
            AND COLUMN_NAME = 'cve_info_status'
        """, (config['database']['database'],))
        
        result = cursor.fetchone()
        if result:
            print(f"  ✅ 컬럼 존재: {result['COLUMN_NAME']} {result['COLUMN_TYPE']} DEFAULT {result['COLUMN_DEFAULT']}")
        else:
            print("  ❌ 컬럼 없음 - 추가 필요!")
            return
        
        # 2. 전체 데이터 개수
        print("\n[2] Github_CVE_Info 테이블 데이터 현황")
        cursor.execute("SELECT COUNT(*) as total FROM Github_CVE_Info")
        total = cursor.fetchone()['total']
        print(f"  총 레코드 수: {total}개")
        
        # 3. cve_info_status 별 개수
        print("\n[3] cve_info_status 상태별 개수")
        cursor.execute("""
            SELECT 
                cve_info_status,
                COUNT(*) as count
            FROM Github_CVE_Info
            GROUP BY cve_info_status
        """)
        for row in cursor.fetchall():
            status = row['cve_info_status'] or 'NULL'
            icon = "✅" if status == 'Y' else "❌" if status == 'N' else "⚠️"
            print(f"  {icon} {status}: {row['count']}개")
        
        # 4. CVE_Info 테이블과 비교
        print("\n[4] CVE_Info 테이블과의 매핑 확인")
        cursor.execute("SELECT COUNT(DISTINCT CVE_Code) as count FROM CVE_Info")
        cve_info_count = cursor.fetchone()['count']
        print(f"  CVE_Info에 저장된 고유 CVE: {cve_info_count}개")
        
        # 5. 매핑되지 않은 CVE 확인
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM Github_CVE_Info g
            WHERE g.cve_info_status = 'N'
            AND g.cve IS NOT NULL
        """)
        unmapped = cursor.fetchone()['count']
        print(f"  CVE Info 수집 필요 (cve_info_status='N'): {unmapped}개")
        
        # 6. 샘플 데이터
        print("\n[5] 샘플 데이터 (최근 10개)")
        cursor.execute("""
            SELECT id, cve, cve_info_status, title
            FROM Github_CVE_Info
            ORDER BY id DESC
            LIMIT 10
        """)
        
        print(f"{'ID':<8} {'CVE':<20} {'Status':<8} {'Title'}")
        print("-" * 80)
        for row in cursor.fetchall():
            status = row['cve_info_status'] or 'NULL'
            icon = "✅" if status == 'Y' else "❌"
            title = (row['title'] or '')[:40]
            print(f"{icon} {row['id']:<6} {row['cve']:<20} {status:<8} {title}")
        
        print("\n" + "=" * 80)
        print("확인 완료!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    main()

