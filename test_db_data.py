#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
데이터베이스 데이터 확인 스크립트
"""

import mysql.connector
import json

# DB 설정 (config.json에서 읽기)
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

db_config = {
    'host': config['database']['host'],
    'port': config['database']['port'],
    'user': config['database']['user'],
    'password': config['database']['password'],
    'database': config['database']['database']
}

print("=" * 60)
print("📊 데이터베이스 데이터 확인")
print("=" * 60)

try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    
    # 1. Github_CVE_Info 테이블 확인
    print("\n1️⃣ Github_CVE_Info 테이블:")
    cursor.execute("SELECT COUNT(*) FROM Github_CVE_Info")
    total = cursor.fetchone()[0]
    print(f"   전체: {total}개")
    
    cursor.execute("SELECT COUNT(*) FROM Github_CVE_Info WHERE AI_chk = 'Y'")
    ai_y = cursor.fetchone()[0]
    print(f"   AI_chk = 'Y': {ai_y}개")
    
    cursor.execute("SELECT COUNT(*) FROM Github_CVE_Info WHERE AI_chk = 'N'")
    ai_n = cursor.fetchone()[0]
    print(f"   AI_chk = 'N': {ai_n}개")
    
    # 2. CVE_Info 테이블 확인
    print("\n2️⃣ CVE_Info 테이블:")
    cursor.execute("SELECT COUNT(*) FROM CVE_Info")
    cve_total = cursor.fetchone()[0]
    print(f"   전체: {cve_total}개")
    
    # 3. CVE_Packet_AI_Analysis 테이블 확인
    print("\n3️⃣ CVE_Packet_AI_Analysis 테이블:")
    cursor.execute("SELECT COUNT(*) FROM CVE_Packet_AI_Analysis")
    analysis_total = cursor.fetchone()[0]
    print(f"   전체: {analysis_total}개")
    
    # 4. 최근 AI 분석 완료된 데이터 확인
    if ai_y > 0:
        print("\n4️⃣ 최근 AI 분석 완료 데이터 (5개):")
        cursor.execute("""
            SELECT cve, link, title, AI_chk, collect_time 
            FROM Github_CVE_Info 
            WHERE AI_chk = 'Y' 
            ORDER BY collect_time DESC 
            LIMIT 5
        """)
        rows = cursor.fetchall()
        for row in rows:
            print(f"   - {row[0]}: {row[2][:50]}... (AI_chk={row[3]})")
    
    # 5. 통합 테이블 확인
    print("\n5️⃣ CVE_Integrated_Data 테이블:")
    try:
        cursor.execute("SELECT COUNT(*) FROM CVE_Integrated_Data")
        integrated_total = cursor.fetchone()[0]
        print(f"   전체: {integrated_total}개")
    except Exception as e:
        print(f"   ⚠️  테이블이 없거나 오류: {str(e)[:100]}")
    
    print("\n" + "=" * 60)
    
    if ai_y == 0:
        print("⚠️  AI 분석 완료된 데이터가 없습니다!")
        print("   run_ai_analysis.py를 실행하여 AI 분석을 진행하세요.")
    else:
        print(f"✅ AI 분석 완료된 데이터: {ai_y}개")
        print(f"   API에서 이 데이터들을 수집할 수 있습니다.")
    
    print("=" * 60)
    
except Exception as e:
    print(f"❌ 오류 발생: {e}")
finally:
    if 'cursor' in locals():
        cursor.close()
    if 'conn' in locals():
        conn.close()

