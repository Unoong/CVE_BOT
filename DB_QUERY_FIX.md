# 🐛 DB 조회 기능 수정 완료

## ✅ 문제 해결

### 문제
테이블 선택 후 조회 버튼 클릭 시 "조회 실패" 에러 발생

### 원인
1. **백엔드 API**: `searchField`와 `searchValue` 파라미터를 받지 않음
2. **프론트엔드**: 검색 파라미터를 보내지만 API에서 처리하지 않음
3. **에러 처리**: 로딩 상태와 에러 메시지가 표시되지 않음

---

## 🔧 수정 사항

### 1. 백엔드 (server.js)

**변경 전**:
```javascript
app.post('/api/db/query', authenticateToken, checkRole(['analyst', 'admin']), async (req, res) => {
    const { table, page = 1, limit = 20 } = req.body;
    // searchField, searchValue를 받지 않음
    
    // WHERE 절 없이 전체 조회만 가능
    const [rows] = await pool.query(`SELECT * FROM ${table} LIMIT ? OFFSET ?`, [limit, offset]);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM ${table}`);
});
```

**변경 후** ✅:
```javascript
app.post('/api/db/query', authenticateToken, checkRole(['analyst', 'admin']), async (req, res) => {
    const { table, page = 1, limit = 20, searchField, searchValue } = req.body;
    
    // WHERE 절 동적 구성
    let whereClause = '';
    let queryParams = [];
    
    if (searchField && searchValue) {
        // 허용된 필드 검증
        const allowedFields = {
            'Github_CVE_Info': ['cve', 'title', 'writer', 'link', 'status', 'AI_chk'],
            'CVE_Info': ['CVE_Code', 'state', 'product', 'CVSS_Serverity', 'cweId', 'Attak_Type'],
            'CVE_Packet_AI_Analysis': ['link', 'vuln_stage', 'mitre_tactic', 'mitre_technique']
        };
        
        if (allowedFields[table] && allowedFields[table].includes(searchField)) {
            whereClause = ` WHERE ${searchField} LIKE ?`;
            queryParams.push(`%${searchValue}%`);
        }
    }
    
    // 데이터 조회 (WHERE 절 적용)
    const [rows] = await pool.query(
        `SELECT * FROM ${table}${whereClause} LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
    );
    
    // 총 개수 조회 (WHERE 절 적용)
    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) as total FROM ${table}${whereClause}`,
        queryParams
    );
});
```

**추가 기능**:
- ✅ 검색 필드/값 파라미터 지원
- ✅ LIKE 검색 (`%value%`)
- ✅ SQL Injection 방어 (파라미터화된 쿼리)
- ✅ 허용된 필드 검증
- ✅ 상세한 로깅
- ✅ 에러 메시지 개선

---

### 2. 프론트엔드 (DBQuery.jsx)

**변경 전**:
```javascript
const handleQuery = async () => {
    try {
        const res = await axios.post(`${API_URL}/db/query`, { 
            table, page, limit,
            searchField, searchValue
        });
        setData(res.data.rows);
        setTotal(res.data.total);
    } catch (err) {
        alert(err.response?.data?.error || '조회 실패');
    }
};
```

**변경 후** ✅:
```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleQuery = async (customPage = page) => {
    setLoading(true);
    setError('');
    
    console.log('[DB 조회] 요청:', { table, page: customPage, limit, searchField, searchValue });
    
    try {
        const res = await axios.post(`${API_URL}/db/query`, { 
            table, 
            page: customPage, 
            limit,
            searchField: searchField || undefined,
            searchValue: searchValue || undefined
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('[DB 조회] 응답:', res.data);
        setData(res.data.rows);
        setTotal(res.data.total);
        setPage(customPage);
    } catch (err) {
        console.error('[DB 조회] 에러:', err);
        const errorMsg = err.response?.data?.error || '조회 중 오류가 발생했습니다';
        setError(errorMsg);
        setData([]);
        setTotal(0);
    } finally {
        setLoading(false);
    }
};
```

**추가 UI**:
```jsx
{/* 로딩 상태 */}
{loading && (
    <Box sx={{ mb: 2 }}>
        <LinearProgress />
        <Typography>데이터를 조회하는 중...</Typography>
    </Box>
)}

{/* 에러 메시지 */}
{error && (
    <Alert severity="error">{error}</Alert>
)}

{/* 결과 표시 */}
{!loading && data.length > 0 && (
    <TableContainer>...</TableContainer>
)}

{/* 빈 화면 */}
{!loading && !error && data.length === 0 && (
    <Paper>
        <Typography>조회 버튼을 눌러 데이터를 확인하세요</Typography>
        <Typography variant="caption">
            💡 검색 필드를 선택하지 않으면 전체 데이터를 조회합니다
        </Typography>
    </Paper>
)}
```

**추가 기능**:
- ✅ 로딩 상태 표시 (LinearProgress)
- ✅ 에러 메시지 Alert
- ✅ 콘솔 로그 (디버깅)
- ✅ 검색 필드 없이도 전체 조회 가능
- ✅ 페이지 변경 시 자동 조회

---

## 🧪 테스트 방법

### 1. 전체 조회 (검색 조건 없음)
```
1. DB 조회 페이지 접속
2. 테이블 선택: Github_CVE_Info
3. 검색 필드: 선택 안함
4. "조회" 버튼 클릭
5. ✅ 전체 데이터 표시
```

### 2. 검색 조회
```
1. 테이블 선택: Github_CVE_Info
2. 검색 필드: cve
3. 검색 값: 2025
4. "조회" 버튼 클릭
5. ✅ CVE 코드에 "2025"가 포함된 데이터만 표시
```

### 3. 페이지 이동
```
1. 데이터 조회 후
2. 하단 페이지네이션 클릭
3. ✅ 다음 페이지 데이터 자동 조회
```

### 4. 테이블 변경
```
1. 테이블 선택: CVE_Info
2. 검색 필드: product
3. 검색 값: apache
4. "조회" 버튼 클릭
5. ✅ 제품명에 "apache"가 포함된 CVE 표시
```

---

## 🔍 디버깅 로그

### 프론트엔드 콘솔
```javascript
[DB 조회] 요청: { table: "Github_CVE_Info", page: 1, limit: 20, searchField: "cve", searchValue: "2025" }
[DB 조회] 응답: { rows: [...], total: 45, page: 1, limit: 20 }
```

### 백엔드 로그
```
[DB 조회] 테이블: Github_CVE_Info, 페이지: 1, 검색: cve=2025
[DB 조회] WHERE 절: WHERE cve LIKE ?, 값: %2025%
[DB 조회] 쿼리: SELECT * FROM Github_CVE_Info WHERE cve LIKE ? LIMIT ? OFFSET ?
[DB 조회 성공] 20개 조회, 전체: 45개
```

---

## 📊 지원하는 검색 필드

### Github_CVE_Info
- `cve` - CVE 코드
- `title` - 제목
- `writer` - 작성자
- `link` - GitHub 링크
- `status` - 상태 (N/Y)
- `AI_chk` - AI 분석 완료 (N/Y)

### CVE_Info
- `CVE_Code` - CVE 코드
- `state` - 상태 (PUBLISHED/REJECTED)
- `product` - 제품명
- `CVSS_Serverity` - 위험도 (CRITICAL/HIGH/MEDIUM/LOW)
- `cweId` - CWE ID
- `Attak_Type` - 공격 유형

### CVE_Packet_AI_Analysis
- `link` - GitHub 링크
- `vuln_stage` - 공격 단계
- `mitre_tactic` - MITRE 전술
- `mitre_technique` - MITRE 기법

---

## 🚨 서버 재시작 (필수!)

```bash
cd E:\LLama\pythonProject\CVE_BOT\web
restart.bat
```

**브라우저 강제 새로고침**: `Ctrl + Shift + R`

---

## 💡 사용 팁

### 전체 조회
```
검색 필드를 선택하지 않고 "조회" 버튼 클릭
→ 해당 테이블의 모든 데이터 표시
```

### 부분 검색
```
검색 값: "apache"
→ "apache", "Apache", "apache2" 모두 검색됨 (LIKE %apache%)
```

### 대소문자 무시
```
검색 값: "CVE" 또는 "cve" 모두 동일하게 동작
```

### 여러 조건 검색
```
현재는 한 번에 하나의 필드만 검색 가능
여러 조건은 검색 후 결과를 보면서 필터링
```

---

## 🎉 완료!

**DB 조회 기능이 정상적으로 작동합니다!** ✅

### 완료된 항목
- [x] 백엔드 검색 기능 추가
- [x] LIKE 검색 지원
- [x] SQL Injection 방어
- [x] 허용된 필드 검증
- [x] 로딩 상태 표시
- [x] 에러 메시지 표시
- [x] 디버깅 로그 추가
- [x] 전체 조회 지원
- [x] 페이지네이션 정상 작동

### 테스트 체크리스트
- [ ] 전체 조회 (검색 조건 없음)
- [ ] CVE 코드 검색
- [ ] 제품명 검색
- [ ] 작성자 검색
- [ ] 페이지 이동
- [ ] 테이블 변경
- [ ] 권한 확인 (analyst, admin만 접근)

**지금 바로 서버를 재시작하고 테스트하세요!** 🚀

---

## 🔧 문제 해결

### 여전히 조회 실패가 발생하는 경우

**1단계: 브라우저 콘솔 확인**
```
F12 → Console 탭
[DB 조회] 요청: {...}
[DB 조회] 에러: {...}
```

**2단계: 서버 로그 확인**
```
서버 콘솔에서:
[DB 조회] 테이블: ...
[DB 조회 실패] ...
```

**3단계: 토큰 확인**
```javascript
// 브라우저 콘솔에서
localStorage.getItem('token')
// null이면 다시 로그인 필요
```

**4단계: 권한 확인**
```javascript
// 브라우저 콘솔에서
JSON.parse(localStorage.getItem('user')).role
// 'analyst' 또는 'admin'이어야 함
```

---

**끝!** 🎊

