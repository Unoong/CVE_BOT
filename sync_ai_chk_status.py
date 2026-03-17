"""
Github_CVE_Info의 AI_chk 상태를 CVE_Packet_AI_Analysis 테이블과 동기화
실제 분석 결과가 있는 POC만 'Y', 나머지는 'N'으로 설정
"""
import json
import mysql.connector
from mysql.connector import Error
import logging
from datetime import datetime

# 로거 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/sync_ai_chk_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('Sync_AI_CHK')


def load_config():
    """설정 파일 로드"""
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"설정 파일 로드 실패: {e}")
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


def sync_ai_chk_status(conn):
    """
    CVE_Packet_AI_Analysis 테이블과 Github_CVE_Info의 AI_chk 동기화
    """
    try:
        cursor = conn.cursor(dictionary=True)
        
        # 1. 현재 상태 확인
        logger.info("="*80)
        logger.info("현재 상태 확인 중...")
        logger.info("="*80)
        
        cursor.execute("SELECT COUNT(*) as total FROM Github_CVE_Info")
        total_pocs = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as count FROM Github_CVE_Info WHERE AI_chk = 'Y'")
        current_y_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM Github_CVE_Info WHERE AI_chk = 'N'")
        current_n_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(DISTINCT link) as count FROM CVE_Packet_AI_Analysis")
        actual_analyzed = cursor.fetchone()['count']
        
        logger.info(f"📊 Github_CVE_Info:")
        logger.info(f"  전체 POC: {total_pocs:,}개")
        logger.info(f"  AI_chk = 'Y': {current_y_count:,}개")
        logger.info(f"  AI_chk = 'N': {current_n_count:,}개")
        logger.info(f"\n📊 CVE_Packet_AI_Analysis:")
        logger.info(f"  실제 분석 완료: {actual_analyzed:,}개 (DISTINCT link)")
        logger.info(f"\n⚠️  불일치: {abs(current_y_count - actual_analyzed):,}개")
        logger.info("="*80)
        
        # 2. CVE_Packet_AI_Analysis에 있는 link 목록 조회
        logger.info("\n🔍 실제 분석 완료된 링크 조회 중...")
        cursor.execute("SELECT DISTINCT link FROM CVE_Packet_AI_Analysis")
        analyzed_links = cursor.fetchall()
        analyzed_link_set = {row['link'] for row in analyzed_links}
        
        logger.info(f"  분석 완료 링크: {len(analyzed_link_set):,}개")
        
        # 3. 모든 POC를 먼저 'N'으로 초기화
        logger.info("\n🔄 1단계: 모든 POC를 'N'으로 초기화 중...")
        cursor.execute("UPDATE Github_CVE_Info SET AI_chk = 'N'")
        conn.commit()
        logger.info(f"  ✅ {cursor.rowcount:,}개 행 업데이트 완료")
        
        # 4. 실제 분석 완료된 것만 'Y'로 설정
        if analyzed_link_set:
            logger.info(f"\n🔄 2단계: 분석 완료된 {len(analyzed_link_set):,}개 POC를 'Y'로 설정 중...")
            
            # IN 절을 위한 placeholders 생성
            placeholders = ', '.join(['%s'] * len(analyzed_link_set))
            update_query = f"UPDATE Github_CVE_Info SET AI_chk = 'Y' WHERE link IN ({placeholders})"
            
            cursor.execute(update_query, list(analyzed_link_set))
            conn.commit()
            
            updated_count = cursor.rowcount
            logger.info(f"  ✅ {updated_count:,}개 행 업데이트 완료")
        else:
            logger.warning("  ⚠️  분석 완료된 POC가 없습니다. 모두 'N' 상태 유지")
        
        # 5. 최종 결과 확인
        logger.info("\n" + "="*80)
        logger.info("최종 결과:")
        logger.info("="*80)
        
        cursor.execute("SELECT COUNT(*) as count FROM Github_CVE_Info WHERE AI_chk = 'Y'")
        final_y_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM Github_CVE_Info WHERE AI_chk = 'N'")
        final_n_count = cursor.fetchone()['count']
        
        logger.info(f"✅ AI_chk = 'Y': {final_y_count:,}개 (분석 완료)")
        logger.info(f"📝 AI_chk = 'N': {final_n_count:,}개 (분석 대기)")
        logger.info(f"📊 전체: {final_y_count + final_n_count:,}개")
        
        # 검증
        if final_y_count == actual_analyzed:
            logger.info(f"\n✅ 동기화 성공! (AI 분석 테이블과 일치)")
        else:
            logger.warning(f"\n⚠️  불일치 감지: AI_chk 'Y' ({final_y_count}) != 분석 테이블 ({actual_analyzed})")
        
        logger.info("="*80)
        
        cursor.close()
        
    except Exception as e:
        logger.error(f"❌ 동기화 오류: {e}")
        import traceback
        logger.error(traceback.format_exc())
        conn.rollback()


def main():
    logger.info("="*80)
    logger.info("Github_CVE_Info AI_chk 동기화 스크립트")
    logger.info("="*80)
    logger.info("이 스크립트는 CVE_Packet_AI_Analysis 테이블과 동기화합니다:")
    logger.info("  - 분석 결과가 있는 POC: AI_chk = 'Y'")
    logger.info("  - 분석 결과가 없는 POC: AI_chk = 'N'")
    logger.info("="*80)
    
    # 설정 로드
    config = load_config()
    if not config:
        logger.error("설정 파일 로드 실패")
        return
    
    # DB 연결
    conn = get_db_connection(config)
    if not conn:
        logger.error("DB 연결 실패")
        return
    
    try:
        # AI_chk 동기화 실행
        sync_ai_chk_status(conn)
    finally:
        conn.close()
        logger.info("\n🔒 DB 연결 종료")


if __name__ == '__main__':
    main()

