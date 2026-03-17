-- ================================================================================
-- 014: 대시보드 통계 fallback 쿼리 가속용 인덱스
-- CVE_Info, Github_CVE_Info의 collect_time/datePublished ORDER BY 최적화
-- ================================================================================

-- CVE_Info: collect_time 정렬 가속 (최근 수집 CVE fallback)
ALTER TABLE CVE_Info ADD INDEX idx_collect_time (collect_time(20));

-- CVE_Info: datePublished 정렬 가속 (최신 CVE fallback)
ALTER TABLE CVE_Info ADD INDEX idx_datePublished (datePublished(20));

-- Github_CVE_Info: collect_time 정렬 가속 (최근 POC fallback)
ALTER TABLE Github_CVE_Info ADD INDEX idx_collect_time (collect_time(20));
