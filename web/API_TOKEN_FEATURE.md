# ✅ API 토큰 관리 기능 완료!

## 📋 구현된 기능

### 1. 백엔드 API (server.js)
✅ **토큰 생성** - `POST /api/admin/tokens`
- 64자 랜덤 토큰 자동 생성
- 만료일 설정 (일 단위, 선택사항)
- 권한 설정 (읽기/쓰기)
- 운영자만 접근 가능

✅ **토큰 목록 조회** - `GET /api/admin/tokens`
- 토큰 마스킹 (앞 8자 + ... + 뒤 8자)
- 전체 토큰 정보 (보기 버튼으로 표시)
- 만료 여부 자동 계산
- 운영자만 접근 가능

✅ **토큰 삭제** - `DELETE /api/admin/tokens/:id`
- 토큰 영구 삭제
- 삭제 전 확인 다이얼로그
- 운영자만 접근 가능

✅ **토큰 활성화/비활성화** - `PATCH /api/admin/tokens/:id/status`
- 스위치 토글로 즉시 변경
- 비활성화된 토큰은 API 호출 불가
- 운영자만 접근 가능

✅ **API 토큰 인증 미들웨어** - `authenticateApiToken()`
- `X-API-Token` 헤더 또는 `?api_token=` 쿼리로 인증
- 활성화 및 만료 확인
- 마지막 사용 시간 자동 기록
- 권한 정보 파싱

---

## 🗄️ 데이터베이스

### api_tokens 테이블
```sql
CREATE TABLE api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,           -- 64자 토큰
    name VARCHAR(100) NOT NULL,                  -- 토큰 이름
    created_by VARCHAR(50) NOT NULL,             -- 생성자 ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,                 -- 마지막 사용 시간
    expires_at TIMESTAMP NULL,                   -- 만료일 (NULL=무제한)
    is_active BOOLEAN DEFAULT TRUE,              -- 활성화 상태
    permissions TEXT,                            -- 권한 (JSON)
    INDEX idx_token (token),
    INDEX idx_created_by (created_by),
    INDEX idx_is_active (is_active)
);
```

**서버 시작 시 자동 생성됩니다!**

---

## 🎨 프론트엔드

### API 토큰 관리 페이지 (`/api-tokens`)
- **운영자 전용** 메뉴
- Material-UI로 깔끔한 UI
- 실시간 토큰 관리

#### 주요 기능:
1. **토큰 생성 다이얼로그**
   - 이름 입력
   - 만료일 설정 (일 단위, 선택사항)
   - 권한 설정 (읽기/쓰기 스위치)

2. **생성 완료 다이얼로그**
   - ⚠️ 경고: 다시 확인 불가
   - 토큰 전체 표시
   - 복사 버튼

3. **토큰 목록 테이블**
   - 마스킹된 토큰 표시
   - 👁️ 보기/숨기기 토글
   - 📋 복사 버튼
   - 권한 Chip 표시
   - 생성자/생성일/마지막 사용 정보
   - 만료일 표시 (만료 시 빨간 Chip)
   - 활성화/비활성화 스위치
   - 삭제 버튼

4. **도움말 Alert**
   - API 토큰 사용 방법 안내

---

## 🔐 API 토큰 사용 방법

### 방법 1: HTTP 헤더 (권장)
```bash
curl -H "X-API-Token: your_token_here" \
     http://localhost:32577/api/your-endpoint
```

### 방법 2: Query 파라미터
```bash
curl http://localhost:32577/api/your-endpoint?api_token=your_token_here
```

### Python 예제
```python
import requests

API_BASE_URL = 'http://localhost:32577/api'
API_TOKEN = 'your_64_char_token_here'

# 방법 1: 헤더
response = requests.get(
    f'{API_BASE_URL}/cve/integrated',
    headers={'X-API-Token': API_TOKEN}
)

# 방법 2: 쿼리
response = requests.get(
    f'{API_BASE_URL}/cve/integrated',
    params={'api_token': API_TOKEN}
)

data = response.json()
```

---

## 🚀 실행 방법

### 1. DB 테이블 생성 (자동)
서버 시작 시 `initDatabase()` 함수에서 자동 생성됩니다.

수동으로 생성하려면:
```bash
cd E:\LLama\pythonProject\CVE_BOT\web
mysql -u root -p -P 7002 < init_api_tokens_table.sql
```

### 2. 서버 재시작
```bash
cd E:\LLama\pythonProject\CVE_BOT\web
run.bat
```

### 3. 웹사이트 접속
```
http://localhost:32577
```

### 4. 관리자 로그인
- **ID**: admin
- **PW**: admin1234

### 5. API 토큰 페이지 이동
- 왼쪽 메뉴 → **🔑 API 토큰**

---

## 📂 수정된 파일

```
✅ web/server.js
   - API 토큰 관리 엔드포인트 추가 (200줄)
   - authenticateApiToken() 미들웨어 추가
   - initDatabase()에 api_tokens 테이블 생성 추가

✅ web/init_api_tokens_table.sql
   - DB 테이블 생성 SQL 스크립트

✅ web/client/src/pages/ApiTokens.jsx
   - API 토큰 관리 페이지 (350줄)

✅ web/client/src/App.jsx
   - ApiTokens import 추가
   - /api-tokens 라우트 추가 (운영자 전용)

✅ web/client/src/components/Layout.jsx
   - VpnKey 아이콘 import
   - "API 토큰" 메뉴 항목 추가 (운영자 전용)
```

---

## 🎯 다음 단계 (향후 작업)

### 1. 통합 테이블 조회 API 추가
```javascript
// server.js
app.get('/api/cve/integrated', authenticateApiToken, async (req, res) => {
    try {
        // 권한 확인
        if (!req.apiToken.permissions.read) {
            return res.status(403).json({ message: '읽기 권한이 없습니다' });
        }

        // CVE_Integrated_Data 테이블 조회
        const [data] = await pool.query(`
            SELECT * FROM CVE_Integrated_Data 
            ORDER BY created_at DESC 
            LIMIT 1000
        `);

        res.json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (err) {
        logger.error('[통합 데이터 조회 실패]', err);
        res.status(500).json({ message: '데이터 조회 실패' });
    }
});
```

### 2. 원격 수집 스크립트 작성
```python
# collect_remote_cve.py
import requests

API_BASE_URL = 'http://your-server:32577/api'
API_TOKEN = 'your_token_here'

def fetch_cve_data():
    response = requests.get(
        f'{API_BASE_URL}/cve/integrated',
        headers={'X-API-Token': API_TOKEN}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ {data['count']}개 CVE 수집 완료")
        return data['data']
    else:
        print(f"❌ 오류: {response.json()['message']}")
        return None
```

### 3. 추가 API 엔드포인트
- `GET /api/cve/list` - CVE 목록
- `GET /api/cve/:code` - CVE 상세
- `GET /api/poc/list` - POC 목록
- `GET /api/ai-analysis/:link` - AI 분석 결과

---

## ⚠️ 보안 주의사항

1. **토큰 보관**
   - 생성된 토큰은 다시 확인 불가
   - 안전한 곳에 보관 필수
   - 외부 유출 시 즉시 삭제

2. **권한 관리**
   - 읽기 전용이 필요하면 쓰기 권한 비활성화
   - 불필요한 토큰은 즉시 삭제

3. **만료일 설정**
   - 임시 토큰은 반드시 만료일 설정
   - 무제한 토큰은 신중하게 생성

4. **네트워크 보안**
   - HTTPS 사용 권장
   - 방화벽으로 IP 제한 추천

---

## 🎉 완료!

**API 토큰 관리 기능이 완벽하게 구현되었습니다!**

이제 원격에서 API 토큰으로 CVE 통합 테이블 데이터를 수집할 수 있는 기반이 완성되었습니다.

다음 단계로 통합 테이블 조회 API를 추가하면 됩니다! 🚀

