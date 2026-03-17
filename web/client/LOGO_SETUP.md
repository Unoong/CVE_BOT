# 로고 설정 가이드

## 📋 개요
취약점 관리 시스템의 CI(Corporate Identity) 로고를 설정하는 방법입니다.

---

## 🖼️ 로고 파일 준비

### 필요한 파일
- **파일명**: `logo.png`
- **권장 크기**: 512x512 픽셀 이상 (정사각형)
- **파일 형식**: PNG (투명 배경 권장)
- **저장 위치**: `web/client/public/logo.png`

---

## 📁 로고 파일 저장 방법

### 1단계: public 폴더 확인
```
E:\LLama\pythonProject\CVE_BOT\web\client\public\
```

이 경로에 `public` 폴더가 있는지 확인합니다.

### 2단계: 로고 이미지 저장
제공받은 파란색 배경의 S 로고 이미지를:
1. `logo.png`로 이름 변경
2. `public` 폴더에 저장

```
E:\LLama\pythonProject\CVE_BOT\web\client\public\logo.png
```

### 3단계: 프론트엔드 재시작
```bash
cd E:\LLama\pythonProject\CVE_BOT\web\client
npm run dev
```

---

## ✅ 로고가 표시되는 위치

### 1. 브라우저 탭 (Favicon)
- 브라우저 탭에 아이콘으로 표시
- `index.html`에서 설정: `<link rel="icon" type="image/png" href="/logo.png" />`

### 2. 로그인 페이지
- 크기: 80x80 픽셀
- 위치: 페이지 상단 중앙

### 3. 회원가입 페이지
- 크기: 60x60 픽셀
- 위치: 페이지 상단 중앙

### 4. 계정 찾기 페이지
- 크기: 60x60 픽셀
- 위치: 페이지 상단 중앙

### 5. 메인 헤더 (상단 바)
- 크기: 40x40 픽셀
- 위치: 좌측, "취약점 관리 시스템" 제목 옆

### 6. 사이드바
- 크기: 35x35 픽셀
- 위치: 사이드바 상단, "취약점 관리" 제목 옆

---

## 🎨 로고 스타일

### 현재 적용된 스타일
```javascript
<img 
  src="/logo.png" 
  alt="Logo" 
  style={{ 
    width: 40,           // 크기 (px)
    height: 40,          // 크기 (px)
    borderRadius: '50%'  // 원형으로 표시
  }} 
/>
```

### 스타일 커스터마이징

로고 모양을 변경하려면 각 파일에서 `borderRadius` 값을 수정하세요:

- **원형 (현재)**: `borderRadius: '50%'`
- **모서리 둥근 사각형**: `borderRadius: '8px'`
- **사각형**: `borderRadius: '0'`

---

## 🔧 로고 크기 조정

각 위치별로 로고 크기를 변경하려면:

### Login.jsx (로그인 페이지)
```javascript
// 현재: 80x80
style={{ width: 80, height: 80, borderRadius: '50%' }}
```

### Layout.jsx (헤더)
```javascript
// 현재: 40x40
style={{ width: 40, height: 40, borderRadius: '50%' }}
```

### Layout.jsx (사이드바)
```javascript
// 현재: 35x35
style={{ width: 35, height: 35, borderRadius: '50%' }}
```

---

## 🖼️ 다른 형식의 로고 사용

### SVG 로고 사용 (권장)
SVG 형식을 사용하면 모든 크기에서 선명하게 표시됩니다:

1. `logo.svg` 파일을 `public` 폴더에 저장
2. 코드에서 경로 변경:
   ```javascript
   <img src="/logo.svg" alt="Logo" ... />
   ```

### 여러 크기의 로고 사용
다양한 크기의 로고를 사용하려면:

```
public/
  ├── logo-small.png   (32x32)
  ├── logo-medium.png  (64x64)
  └── logo-large.png   (128x128)
```

---

## 🔍 문제 해결

### 로고가 표시되지 않을 때

1. **파일 경로 확인**
   ```
   E:\LLama\pythonProject\CVE_BOT\web\client\public\logo.png
   ```
   파일이 정확히 이 위치에 있는지 확인

2. **파일명 확인**
   - 정확히 `logo.png`인지 확인 (대소문자 구분)
   - 공백이나 특수문자가 없는지 확인

3. **캐시 초기화**
   - 브라우저에서 Ctrl+Shift+R (강력 새로고침)
   - 또는 개발자 도구(F12) → Network 탭 → "Disable cache" 체크

4. **서버 재시작**
   ```bash
   # Ctrl+C로 종료 후
   npm run dev
   ```

5. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - 404 에러가 있는지 확인

---

## 💡 추가 팁

### Favicon 최적화
더 나은 Favicon을 위해 여러 크기 제공:

```html
<!-- index.html -->
<link rel="icon" type="image/png" sizes="32x32" href="/logo-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/logo-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/logo-180.png" />
```

### 다크모드 대응
다크모드에서도 잘 보이도록:
- 투명 배경 PNG 사용
- 또는 테두리가 있는 로고 사용

---

## 📞 참고

- 로고 변경 후 모든 페이지에 자동 반영됩니다
- 서버 재시작 필요 없음 (public 폴더의 정적 파일)
- 배포 시에도 동일하게 적용됨

---

**현재 설정된 시스템 제목: "취약점 관리 시스템"**

