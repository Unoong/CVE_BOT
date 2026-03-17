"""
AI 분석 상태 확인 스크립트
할당량 초과로 인해 분석이 중단된 항목들을 확인
"""
import json
from db_manager import get_db_connection

def load_config():
    """설정 파일 로드"""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"설정 파일 로드 실패: {e}")
        return None

def check_ai_analysis_status():
    """AI 분석 상태 확인"""
    config = load_config()
    if not config:
        return
    
    conn = get_db_connection(config)
    if not conn:
        print("DB 연결 실패")
        return
    
    try:
        cursor = conn.cursor()
        
        # 전체 통계
        cursor.execute("SELECT COUNT(*) as total FROM Github_CVE_Info")
        total = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) as analyzed FROM Github_CVE_Info WHERE AI_chk = 'Y'")
        analyzed = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) as pending FROM Github_CVE_Info WHERE AI_chk = 'N'")
        pending = cursor.fetchone()[0]
        
        print("=" * 50)
        print("AI 분석 상태 요약")
        print("=" * 50)
        print(f"전체 POC: {total:,}")
        print(f"분석 완료: {analyzed:,} ({analyzed/total*100:.1f}%)")
        print(f"분석 대기: {pending:,} ({pending/total*100:.1f}%)")
        
        # 최근 분석된 항목들 확인
        cursor.execute("""
            SELECT gci.link, gci.title, gci.AI_chk, pai.created_at
            FROM Github_CVE_Info gci
            LEFT JOIN CVE_Packet_AI_Analysis pai ON gci.link = pai.link
            WHERE gci.AI_chk = 'Y'
            ORDER BY gci.id DESC
            LIMIT 10
        """)
        
        recent_analyzed = cursor.fetchall()
        
        print("\n최근 분석 완료된 항목 (Top 10):")
        print("-" * 50)
        for link, title, ai_chk, created_at in recent_analyzed:
            print(f"AI_chk: {ai_chk}, 분석일시: {created_at}")
            print(f"제목: {title}")
            print(f"링크: {link}")
            print()
        
        # 분석되지 않은 항목들 확인
        cursor.execute("""
            SELECT link, title, date
            FROM Github_CVE_Info
            WHERE AI_chk = 'N'
            ORDER BY id DESC
            LIMIT 10
        """)
        
        pending_items = cursor.fetchall()
        
        print("분석 대기 중인 항목 (Top 10):")
        print("-" * 50)
        for link, title, date in pending_items:
            print(f"날짜: {date}")
            print(f"제목: {title}")
            print(f"링크: {link}")
            print()
        
        # 할당량 초과로 의심되는 경우 확인
        print("할당량 초과 의심 분석:")
        print("-" * 50)
        print("일일 2000개 제한이 있으므로, 많은 CVE가 'N' 상태로 남아있다면")
        print("할당량 초과로 인해 분석이 중단된 것으로 추정됩니다.")
        print("날짜가 바뀌면 자동으로 재시작됩니다.")
        
    except Exception as e:
        print(f"오류 발생: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_ai_analysis_status()
