-- ================================================================================
-- Github_CVE_Info 테이블에 cve_info_status 컬럼 추가 및 데이터 업데이트
-- ================================================================================

USE TOTORO;

-- 1단계: 컬럼 존재 여부 확인 (수동으로 확인)
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'TOTORO'
AND TABLE_NAME = 'Github_CVE_Info'
AND COLUMN_NAME = 'cve_info_status';

-- 2단계: 컬럼 추가 (이미 있으면 에러 발생하지만 무시하고 계속)
-- 에러 발생 시 다음 단계로 진행
ALTER TABLE Github_CVE_Info
ADD COLUMN cve_info_status VARCHAR(10) DEFAULT 'N';

-- 3단계: 기존 데이터 확인
SELECT '총 Github_CVE_Info 레코드 수:' as info, COUNT(*) as count FROM Github_CVE_Info;
SELECT 'CVE_Info에 있는 고유 CVE 수:' as info, COUNT(DISTINCT CVE_Code) as count FROM CVE_Info;

-- 4단계: 모든 레코드를 'N'으로 초기화
UPDATE Github_CVE_Info 
SET cve_info_status = 'N';

-- 5단계: CVE_Info에 있는 CVE는 'Y'로 업데이트
UPDATE Github_CVE_Info g
INNER JOIN CVE_Info c ON g.cve = c.CVE_Code
SET g.cve_info_status = 'Y';

-- 6단계: 결과 확인
SELECT 
    cve_info_status,
    COUNT(*) as count
FROM Github_CVE_Info
GROUP BY cve_info_status;

-- 7단계: 샘플 데이터 확인 (최근 20개)
SELECT 
    id,
    cve,
    cve_info_status,
    LEFT(title, 50) as title
FROM Github_CVE_Info
ORDER BY id DESC
LIMIT 20;

-- 8단계: 업데이트 통계
SELECT 
    '✅ Y (CVE Info 수집 완료)' as status,
    COUNT(*) as count
FROM Github_CVE_Info
WHERE cve_info_status = 'Y'
UNION ALL
SELECT 
    '❌ N (CVE Info 수집 필요)' as status,
    COUNT(*) as count
FROM Github_CVE_Info
WHERE cve_info_status = 'N';

-- ================================================================================
-- 완료!
-- ================================================================================

