"""
CVE API 테스트 스크립트
"""
from cve_info_collector import get_cve_info
import json

# 테스트 CVE 코드
cve_code = "CVE-2025-52970"

print(f"CVE API 테스트: {cve_code}")
print("=" * 80)

cve_info = get_cve_info(cve_code)

if cve_info:
    print("\n수집된 정보:")
    print(f"CVE 코드: {cve_info['CVE_Code']}")
    print(f"상태: {cve_info['state']}")
    print(f"제품: {cve_info['product']}")
    print(f"설명: {cve_info['descriptions'][:200]}...")
    print(f"영향 받는 버전: {cve_info['effect_version']}")
    print(f"CWE ID: {cve_info['cweId']}")
    print(f"공격 유형: {cve_info['Attak_Type']}")
    print(f"CVSS 점수: {cve_info['CVSS_Score']}")
    print(f"CVSS 심각도: {cve_info['CVSS_Serverity']}")
    print(f"솔루션: {cve_info['solutions'][:200]}...")
    print("\n✅ 테스트 성공!")
else:
    print("❌ CVE 정보 수집 실패")

