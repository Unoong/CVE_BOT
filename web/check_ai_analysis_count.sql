-- AI 분석 테이블 건수 확인

-- 1. CVE_Packet_AI_Analysis 전체 행 수
SELECT 'CVE_Packet_AI_Analysis 전체 행 수' as 설명, COUNT(*) as 건수
FROM CVE_Packet_AI_Analysis;

-- 2. CVE_Packet_AI_Analysis 고유 링크 수 (DISTINCT link)
SELECT 'CVE_Packet_AI_Analysis 고유 링크 수 (DISTINCT link)' as 설명, COUNT(DISTINCT link) as 건수
FROM CVE_Packet_AI_Analysis;

-- 3. Github_CVE_Info에서 AI_chk = 'Y'인 건수
SELECT 'Github_CVE_Info AI_chk=Y 건수' as 설명, COUNT(*) as 건수
FROM Github_CVE_Info
WHERE AI_chk = 'Y';

-- 4. 링크별 행 수 (step별로 나뉘어져 있는지 확인)
SELECT 
    '링크별 행 수 (샘플 10개)' as 설명,
    link,
    COUNT(*) as 행수
FROM CVE_Packet_AI_Analysis
GROUP BY link
ORDER BY 행수 DESC
LIMIT 10;

-- 5. 대시보드 통계 쿼리와 동일한 쿼리 실행
SELECT 'analyzed_pocs (대시보드 쿼리와 동일)' as 설명, COUNT(DISTINCT link) as analyzed_pocs 
FROM CVE_Packet_AI_Analysis;

