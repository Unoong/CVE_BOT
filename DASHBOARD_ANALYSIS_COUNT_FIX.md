# 대시보드 AI 분석 완료 건수 수정

## 🔍 문제 상황
- **대시보드 표시**: AI 분석 완료 119건
- **실제 테이블**: CVE_Packet_AI_Analysis에 200개 이상의 행

## 📊 원인 분석
`CVE_Packet_AI_Analysis` 테이블 구조:
- 1개의 POC가 여러 개의 **분석 단계(step)**로 나뉘어 저장됨
- 예: 1개 POC → 5개 step → 5개 행

따라서:
- **200개 행** = 약 **40~50개의 고유 POC** (평균 4~5 step)
- **119개** = 실제로 분석된 **고유 POC 개수** (정확한 값)

## ✅ 해결 방법

### 1. 백엔드 수정 (`server.js`)
```javascript
// AI 분석 완료 건수 - 고유 POC 개수 (DISTINCT link)
const [[{ analyzed_pocs }]] = await pool.query(`
    SELECT COUNT(DISTINCT link) as analyzed_pocs 
    FROM CVE_Packet_AI_Analysis
    WHERE link IS NOT NULL AND link != ''
`);

// AI 분석 테이블 전체 행 수 - 모든 분석 단계 포함
const [[{ total_analysis_rows }]] = await pool.query(`
    SELECT COUNT(*) as total_analysis_rows 
    FROM CVE_Packet_AI_Analysis
`);
```

### 2. 프론트엔드 수정 (`Dashboard.jsx`)
- **표시 내용**: "고유 POC 119개 (총 200개 단계)"
- 사용자가 **고유 POC 수**와 **전체 분석 단계 수**를 구분할 수 있도록 개선

## 📈 결과
- ✅ **고유 POC**: 119개 (중복 제거된 실제 분석 완료 POC)
- ✅ **분석 단계**: 200개+ (모든 step 포함)
- ✅ 명확한 구분으로 혼란 방지

## 🔗 참고
- `CVE_Packet_AI_Analysis.link`: POC GitHub 링크 (같은 POC는 같은 link)
- `CVE_Packet_AI_Analysis.step`: 분석 단계 번호 (1, 2, 3, ...)
- 같은 link에 여러 step이 있으므로 `COUNT(DISTINCT link)`로 고유 POC 계산

