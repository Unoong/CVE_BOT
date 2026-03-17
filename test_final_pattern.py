"""
기존 수집 POC 데이터로 최종 패턴(Snort) 생성
- POC 정보(DB) + CVE_Info + CVE_Packet_AI_Analysis(웹검색 포함 AI 분석) 결합
- CVE별 Snort 탐지 룰 추출 → output/snort_final.rules 생성

실행: python test_final_pattern.py
"""
import json
import os
from datetime import datetime
from db_manager import get_db_connection, create_integrated_table
from logger import setup_logger, log_print


def load_config():
    with open('config.json', 'r', encoding='utf-8') as f:
        return json.load(f)


def get_cve_with_ai_analysis(conn, min_pocs=1):
    """AI 분석 완료된 CVE 목록 (POC 개수 기준)"""
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT g.cve, COUNT(DISTINCT g.link) as poc_count
        FROM Github_CVE_Info g
        INNER JOIN CVE_Packet_AI_Analysis a ON g.link = a.link
        WHERE g.AI_chk = 'Y'
        GROUP BY g.cve
        HAVING poc_count >= %s
        ORDER BY poc_count DESC
        LIMIT 20
    """, (min_pocs,))
    rows = cursor.fetchall()
    cursor.close()
    return rows


def get_snort_rules_for_cve(conn, cve_code):
    """CVE별 POC 정보 + CVE Info + Snort 룰 조회"""
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            g.cve, g.link, g.title, g.download_path,
            c.CVE_Code, c.product, c.descriptions, c.CVSS_Serverity,
            a.step, a.vuln_stage, a.snort_rule, a.cve_summary
        FROM Github_CVE_Info g
        LEFT JOIN CVE_Info c ON g.cve = c.CVE_Code
        INNER JOIN CVE_Packet_AI_Analysis a ON g.link = a.link
        WHERE g.cve = %s AND g.AI_chk = 'Y' AND a.snort_rule IS NOT NULL AND a.snort_rule != ''
        ORDER BY g.link, a.step
    """, (cve_code,))
    rows = cursor.fetchall()
    cursor.close()
    return rows


def generate_snort_rules_file(conn, output_path='output/snort_final.rules'):
    """최종 Snort 룰 파일 생성"""
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    
    cves = get_cve_with_ai_analysis(conn, min_pocs=1)
    log_print(f"[검증] AI 분석 완료 CVE: {len(cves)}개 (최소 1 POC)", 'info')
    
    rules = []
    
    for row in cves:
        cve_code = row['cve']
        poc_count = row['poc_count']
        log_print(f"  - {cve_code}: POC {poc_count}개", 'info')
        
        steps = get_snort_rules_for_cve(conn, cve_code)
        for s in steps:
            snort_rule = (s.get('snort_rule') or '').strip()
            if not snort_rule or snort_rule in ('N/A', '""'):
                continue
            rules.append(f"# {cve_code} | {s.get('vuln_stage','')} | POC: {(s.get('link') or '')[:60]}...")
            rules.append(snort_rule)
            rules.append("")
    
    content = f"""# CVE Bot 최종 Snort 탐지 룰
# 생성일: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
# CVE 수: {len(cves)}개, 총 룰: {len([r for r in rules if r and not r.startswith('#') and 'sid:' in r])}개
# ==========================================

""" + "\n".join(rules)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    log_print(f"[완료] Snort 룰 파일 생성: {output_path}", 'info')
    log_print(f"       CVE {len(cves)}개, Snort 룰 {len([r for r in rules if r and not r.startswith('#') and 'alert' in r])}개", 'info')
    return output_path


def main():
    setup_logger()
    log_print("=" * 60, 'info')
    log_print("기존 POC 데이터 → 최종 Snort 패턴 생성 검증", 'info')
    log_print("=" * 60, 'info')
    
    config = load_config()
    conn = get_db_connection(config)
    if not conn:
        log_print("[오류] DB 연결 실패", 'error')
        return
    
    try:
        # 1. 데이터 현황
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) as c FROM Github_CVE_Info WHERE AI_chk='Y'")
        ai_count = cursor.fetchone()['c']
        cursor.execute("SELECT COUNT(*) as c FROM CVE_Packet_AI_Analysis WHERE snort_rule IS NOT NULL AND snort_rule != ''")
        snort_count = cursor.fetchone()['c']
        cursor.execute("SELECT COUNT(*) as c FROM CVE_Info")
        cve_info_count = cursor.fetchone()['c']
        cursor.close()
        
        log_print(f"\n[현황] AI 분석 완료 POC: {ai_count}개", 'info')
        log_print(f"       Snort 룰 보유: {snort_count}개", 'info')
        log_print(f"       CVE_Info: {cve_info_count}개", 'info')
        
        if ai_count == 0:
            log_print("\n[경고] AI 분석 완료(AI_chk='Y') POC가 없습니다. run_ai_analysis.py를 먼저 실행하세요.", 'warning')
            return
        
        # 2. 통합 테이블 생성 (status 조건 무시하고 AI_chk='Y' 데이터로 테스트)
        log_print("\n[2단계] CVE_Integrated_Data 테이블 확인", 'info')
        create_integrated_table(conn)
        
        # 3. 최종 Snort 패턴 생성
        log_print("\n[3단계] 최종 Snort 룰 파일 생성", 'info')
        output = generate_snort_rules_file(conn)
        
        log_print("\n" + "=" * 60, 'info')
        log_print("✅ 검증 완료 - 최종 패턴 생성 정상 동작", 'info')
        log_print("=" * 60, 'info')
        
    except Exception as e:
        log_print(f"[오류] {e}", 'error')
        import traceback
        log_print(traceback.format_exc(), 'error')
    finally:
        conn.close()


if __name__ == '__main__':
    main()
