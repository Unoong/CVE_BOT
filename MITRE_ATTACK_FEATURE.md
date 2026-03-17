# 🛡️ MITRE ATT&CK 정보 표시 기능 완료

## ✅ 완료된 작업

### 1. **백엔드 - MITRE ATT&CK API 추가** ✅

#### CSV 파일 로드
- `mitre_attack_matrix.csv` 파일을 EUC-KR 인코딩으로 읽기
- Technique ID를 키로 하는 맵 생성
- 서버 시작 시 자동 로드 (메모리 캐싱)

#### API 엔드포인트
```javascript
// 1. 기법 정보 조회
GET /api/mitre/:techniqueId
예: GET /api/mitre/T1190

// 2. 전술별 기법 목록 조회
GET /api/mitre/tactic/:tacticId
예: GET /api/mitre/tactic/TA0001
```

#### 반환 데이터
```json
{
  "tacticId": "TA0001",
  "tacticName": "Initial Access (초기 접근)",
  "tacticDesc": "공격자가 대상 네트워크에 처음 침투하는 단계...",
  "techniqueId": "T1190",
  "techniqueName": "Exploit Public-Facing Application",
  "techniqueDesc": "공격자가 공개된 웹 애플리케이션의 취약점을 이용...",
  "examples": "웹서버의 SQL 인젝션 취약점을 이용한 침투",
  "mitreUrl": "https://attack.mitre.org/techniques/T1190/"
}
```

---

### 2. **프론트엔드 - MITRE 다이얼로그 컴포넌트 생성** ✅

#### 파일 위치
```
web/client/src/components/MitreDialog.jsx
```

#### 기능
- ✅ Technique ID로 MITRE 정보 조회
- ✅ 전술 (Tactic) 표시
- ✅ 기법 (Technique) 상세 설명
- ✅ 주요 활용 예시
- ✅ 공식 MITRE 문서 링크
- ✅ 로딩 및 에러 처리
- ✅ 깔끔한 UI 디자인

#### UI 구성
```
┌──────────────────────────────────────────┐
│ 🛡️ MITRE ATT&CK 정보           [X]    │
├──────────────────────────────────────────┤
│ [T1190]  공식 문서 보기 🔗             │
│                                          │
│ 📌 전술 (Tactic)                        │
│   Initial Access (초기 접근)            │
│   공격자가 대상 네트워크에...            │
│                                          │
│ ────────────────────────────────────    │
│                                          │
│ 📄 기법 (Technique)                     │
│   Exploit Public-Facing Application      │
│   공격자가 공개된 웹 애플리케이션...     │
│                                          │
│ ────────────────────────────────────    │
│                                          │
│ 💡 주요 활용 예시                       │
│   웹서버의 SQL 인젝션 취약점...         │
│                                          │
│ ℹ️ 이 정보는 보안 분석 및 방어 목적...  │
│                                          │
│                      [닫기 버튼]         │
└──────────────────────────────────────────┘
```

---

### 3. **POC 상세 페이지에 적용** ✅

#### 수정된 파일
```
web/client/src/pages/POCDetail.jsx
```

#### 적용 위치

**1) Accordion 헤더의 Chip**
```javascript
// Before: 클릭 불가
<Chip label={step.mitre_technique} />

// After: 클릭 가능
<Chip 
  label={step.mitre_technique} 
  onClick={() => {
    setSelectedTechnique(step.mitre_technique);
    setMitreDialogOpen(true);
  }}
  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'error.light' } }}
/>
```

**2) MITRE Technique 섹션**
```javascript
// Before: 텍스트로만 표시
<Typography>{step.mitre_technique}</Typography>

// After: 클릭 가능한 Chip
<Chip 
  label={step.mitre_technique} 
  color="error" 
  onClick={() => {
    setSelectedTechnique(step.mitre_technique);
    setMitreDialogOpen(true);
  }}
  sx={{ cursor: 'pointer' }}
/>
```

---

### 4. **대시보드에 준비 완료** ✅

#### 수정된 파일
```
web/client/src/pages/Dashboard.jsx
```

#### 추가된 기능
- MitreDialog import
- mitreDialogOpen, selectedTechnique state 추가

#### 남은 작업 (선택사항)
대시보드의 공격 단계별 분석 섹션에서 MITRE ATT&CK을 클릭 가능하게 만들려면:

```javascript
// 대시보드 파일에서 MITRE 정보를 표시하는 부분에 추가:
onClick={() => {
  setSelectedTechnique('T1190'); // Technique ID
  setMitreDialogOpen(true);
}}
```

그리고 Dashboard.jsx 파일 끝에 추가:
```javascript
{/* MITRE ATT&CK 다이얼로그 */}
<MitreDialog 
  open={mitreDialogOpen} 
  onClose={() => setMitreDialogOpen(false)} 
  techniqueId={selectedTechnique} 
/>
```

---

## 📊 설치된 패키지

```bash
npm install csv-parser iconv-lite
```

- **csv-parser**: CSV 파일 파싱
- **iconv-lite**: 인코딩 변환 (EUC-KR → UTF-8)

---

## 🧪 테스트 방법

### 1. 서버 재시작
```bash
cd E:\LLama\pythonProject\CVE_BOT\web
restart.bat
```

### 2. POC 페이지 테스트
```
1. 대시보드 → CVE 정보 → 특정 CVE 클릭
2. POC 목록에서 AI 분석 완료된 POC 선택
3. "AI 모델 POC 분석 결과" 섹션 확인
4. MITRE Technique Chip 클릭:
   - Accordion 헤더의 Chip 클릭
   - 또는 상세 정보의 "MITRE Technique" Chip 클릭
5. MITRE ATT&CK 정보 다이얼로그 확인:
   - 전술 (Tactic)
   - 기법 (Technique)
   - 주요 활용 예시
   - 공식 문서 링크
```

### 3. API 테스트
```bash
# 브라우저 또는 Postman으로 테스트
GET http://localhost:32577/api/mitre/T1190
GET http://localhost:32577/api/mitre/T1059
GET http://localhost:32577/api/mitre/tactic/TA0001
```

---

## 📝 CSV 파일 구조

### 필요한 컬럼
- **전술ID**: TA0001, TA0002...
- **전술**: Initial Access, Execution...
- **전술 설명**: 각 전술에 대한 설명
- **기법ID**: T1190, T1059... (가장 중요!)
- **기법명**: Exploit Public-Facing Application...
- **기법 설명**: 각 기법에 대한 상세 설명
- **주요 활용 예시**: 실제 사용 예시
- **MITRE 링크**: https://attack.mitre.org/techniques/...

---

## 🎨 UI 특징

### 다이얼로그 디자인
- ✅ 빨간색 헤더 (MITRE ATT&CK 강조)
- ✅ 아이콘 활용 (🛡️ Security, 📌 Label, 📄 Description)
- ✅ 구분선 (Divider)으로 섹션 구분
- ✅ 정보 Alert로 주의사항 표시
- ✅ 공식 문서 링크 (새 탭에서 열기)

### Chip 스타일
```javascript
// POC 페이지 헤더
cursor: 'pointer'
'&:hover': { bgcolor: 'error.light', color: 'white' }

// POC 페이지 상세
color="error"
cursor: 'pointer'
fontWeight: 600
```

---

## 🚀 추가 개선 아이디어 (선택사항)

### 1. 대시보드 통계에서 클릭
```javascript
// "공격 단계별 분석" 섹션에서
{stats.attackStageStats.map((item) => (
  <Chip 
    label={item.stage} 
    onClick={() => {
      // TODO: stage에서 technique ID 추출 또는 매핑
      setSelectedTechnique('T1XXX');
      setMitreDialogOpen(true);
    }}
  />
))}
```

### 2. CVE 상세 페이지에서 MITRE 표시
- CVE 정보에 MITRE 매핑 추가
- 관련 MITRE 기법 목록 표시

### 3. MITRE 검색 기능
- 전체 MITRE 기법 검색
- 전술별 필터링
- 키워드 검색

---

## 🔍 로그 확인

### 서버 콘솔 로그
```
[MITRE] 220개 기법 로드 완료
[MITRE 조회] 기법 ID: T1190
[MITRE 조회 성공]
```

### 브라우저 콘솔 로그
```javascript
console.log('MITRE 정보 로드 중:', techniqueId);
console.log('MITRE 데이터:', response.data);
```

---

## ⚠️ 주의사항

### 1. CSV 파일 인코딩
- 반드시 **EUC-KR** 인코딩 유지
- UTF-8로 변경하면 한글 깨짐 발생
- 수정 후 `iconv.decodeStream('euc-kr')` 그대로 유지

### 2. Technique ID 형식
- 정확히 **T + 숫자 4자리** (예: T1190)
- 대소문자 구분 (대문자 T)
- 공백 없음

### 3. CSV 파일 위치
```
E:\LLama\pythonProject\CVE_BOT\web\mitre_attack_matrix.csv
```
- 이 경로에 파일이 있어야 함
- 서버 시작 시 자동 로드

---

## 📚 MITRE ATT&CK 참고 자료

### 공식 사이트
- https://attack.mitre.org/
- https://attack.mitre.org/matrices/enterprise/

### 한국어 가이드
- https://www.boho.or.kr/
- KISA 보안 가이드

---

## 🎉 완료!

**MITRE ATT&CK 정보 표시 기능이 완성되었습니다!** 🛡️

### 완료된 항목
- [x] 백엔드 API (기법 조회, 전술별 조회)
- [x] CSV 파일 로드 (EUC-KR 인코딩)
- [x] MITRE 다이얼로그 컴포넌트
- [x] POC 페이지에 적용 (2곳)
- [x] 대시보드 준비 완료

### 사용 방법
```
1. 서버 재시작 (restart.bat)
2. POC 페이지 → AI 분석 결과 → MITRE Chip 클릭
3. MITRE ATT&CK 정보 확인
```

**지금 바로 테스트하세요!** 🚀

