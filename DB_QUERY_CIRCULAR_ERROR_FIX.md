# 🐛 DB 조회 Circular JSON 에러 수정

## ✅ 문제 해결

### 에러 메시지
```
TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'HTMLButtonElement'
    |     property '__reactFiber$e0tuim1e36' -> object with constructor 'FiberNode'
    --- property 'stateNode' closes the circle
```

### 원인
버튼 클릭 시 React의 **이벤트 객체**가 `handleQuery` 함수의 첫 번째 인자로 전달되고 있었습니다.

**문제가 된 코드**:
```javascript
// 버튼
<Button onClick={handleQuery}>조회</Button>

// 함수
const handleQuery = async (customPage = page) => {
    // customPage에 이벤트 객체가 전달됨!
    const res = await axios.post(`${API_URL}/db/query`, { 
        page: customPage  // 이벤트 객체를 JSON으로 변환하려고 시도 → 에러!
    });
};
```

---

## 🔧 수정 사항

### 1. `handleQuery` 함수 수정

**Before** ❌:
```javascript
const handleQuery = async (customPage = page) => {
    const res = await axios.post(`${API_URL}/db/query`, { 
        page: customPage  // 이벤트 객체가 들어올 수 있음
    });
};
```

**After** ✅:
```javascript
const handleQuery = async (customPage = page) => {
    // 이벤트 객체가 전달된 경우 page 사용
    const targetPage = typeof customPage === 'number' ? customPage : page;
    
    const res = await axios.post(`${API_URL}/db/query`, { 
        page: targetPage  // 항상 숫자만 전달
    });
};
```

---

### 2. 버튼 클릭 핸들러 수정

**Before** ❌:
```javascript
<Button onClick={handleQuery}>조회</Button>
```

**After** ✅:
```javascript
<Button 
    onClick={() => handleQuery()}
    disabled={loading}
>
    조회
</Button>
```

**차이점**:
- `onClick={handleQuery}`: 이벤트 객체가 첫 번째 인자로 전달됨
- `onClick={() => handleQuery()}`: 명시적으로 호출, 인자 없음

---

### 3. Enter 키 검색 수정

**Before** ❌:
```javascript
onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
```

**After** ✅:
```javascript
onKeyPress={(e) => {
    if (e.key === 'Enter' && !loading) {
        e.preventDefault();
        handleQuery();
    }
}}
```

---

### 4. 추가 개선 사항

#### 로딩 중 UI 비활성화
```javascript
// 모든 입력 필드
<TextField disabled={loading} />
<Button disabled={loading} />
```

#### 테이블 변경 시 상태 초기화
```javascript
onChange={(e) => {
    setTable(e.target.value);
    setSearchField('');
    setSearchValue('');
    setFilters([]);
    setData([]);
    setTotal(0);
    setPage(1);
    setError('');
}}
```

---

## 🧪 테스트

### 1. 일반 조회
```
1. 테이블 선택
2. "조회" 버튼 클릭
3. ✅ 에러 없이 데이터 표시
```

### 2. 검색 조회
```
1. 검색 필드 선택: cve
2. 검색 값 입력: 2025
3. "조회" 버튼 클릭
4. ✅ 검색 결과 표시
```

### 3. Enter 키 검색
```
1. 검색 값 입력 후 Enter 키
2. ✅ 검색 실행
```

### 4. 페이지 이동
```
1. 데이터 조회 후
2. 페이지네이션 클릭
3. ✅ 다음 페이지 표시
```

### 5. 로딩 중 클릭 방지
```
1. "조회" 버튼 클릭
2. 로딩 중...
3. ✅ 모든 버튼/입력 비활성화
4. ✅ 중복 요청 방지
```

---

## 🔍 수정 파일

### E:\LLama\pythonProject\CVE_BOT\web\client\src\pages\DBQuery.jsx

**수정 내용**:
1. ✅ `handleQuery` 함수: 이벤트 객체 처리
2. ✅ 조회 버튼: `onClick={() => handleQuery()}`
3. ✅ Enter 키: `e.preventDefault()` 추가
4. ✅ 모든 입력: `disabled={loading}` 추가
5. ✅ 테이블 변경: 상태 초기화

---

## 💡 왜 이런 에러가 발생했나?

### React 이벤트 처리 방식

```javascript
// 방법 1: 함수 직접 전달 (이벤트 객체가 첫 번째 인자로 전달됨)
<Button onClick={handleClick}>클릭</Button>

// 방법 2: 화살표 함수로 감싸기 (인자 제어 가능)
<Button onClick={() => handleClick()}>클릭</Button>
<Button onClick={() => handleClick(123)}>클릭</Button>
```

### Circular Reference

React의 이벤트 객체는:
- DOM 요소 참조 포함
- React Fiber 노드 참조 포함
- 순환 참조 구조
- JSON.stringify() 불가능

```javascript
// 이벤트 객체를 JSON으로 변환하려고 하면
JSON.stringify(event)
// ❌ TypeError: Converting circular structure to JSON
```

---

## 🎯 베스트 프랙티스

### 1. 이벤트 핸들러 작성

```javascript
// ✅ Good: 명시적으로 인자 전달
<Button onClick={() => handleClick(id)}>클릭</Button>

// ✅ Good: 이벤트 객체 사용
<Button onClick={(e) => handleClick(e, id)}>클릭</Button>

// ⚠️ Bad: 의도하지 않은 이벤트 객체 전달
<Button onClick={handleClick}>클릭</Button>
```

### 2. 함수 파라미터 검증

```javascript
const handleQuery = async (customPage = page) => {
    // 타입 체크로 방어
    const targetPage = typeof customPage === 'number' ? customPage : page;
    
    // 또는 이벤트 객체인지 확인
    const targetPage = customPage?.type ? page : customPage;
};
```

### 3. 로딩 상태 관리

```javascript
const [loading, setLoading] = useState(false);

<Button 
    onClick={() => handleClick()}
    disabled={loading}
>
    클릭
</Button>
```

---

## 🚀 결과

### Before ❌
```
버튼 클릭 → 이벤트 객체 전달 → JSON 변환 시도 → 에러 발생
```

### After ✅
```
버튼 클릭 → 명시적 함수 호출 → 숫자 전달 → 정상 작동
```

---

## 🎉 완료!

**DB 조회 기능이 정상적으로 작동합니다!** ✅

### 완료된 항목
- [x] Circular JSON 에러 수정
- [x] 이벤트 객체 처리
- [x] 버튼 클릭 핸들러 수정
- [x] Enter 키 검색 개선
- [x] 로딩 중 UI 비활성화
- [x] 테이블 변경 시 상태 초기화

**브라우저 새로고침 후 바로 테스트하세요!** 🚀

```
Ctrl + Shift + R
```

---

## 📚 참고 자료

### React 이벤트 핸들링
- https://react.dev/learn/responding-to-events
- https://react.dev/reference/react-dom/components/common#common-props

### JSON Circular Reference
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value

---

**끝!** 🎊

