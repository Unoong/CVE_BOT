# 환경 분리 설정 가이드

CVE Bot을 테스트 환경과 운영 환경으로 분리하여 안전하게 개발하고 배포할 수 있습니다.

## 📋 목차

1. [환경 구성](#환경-구성)
2. [설정 파일 생성](#설정-파일-생성)
3. [환경 전환 방법](#환경-전환-방법)
4. [배포 프로세스](#배포-프로세스)
5. [Git 형상관리](#git-형상관리)

---

## 환경 구성

### 지원하는 환경

- **DEV** (개발 환경): 기본 환경, `config.json` 사용
- **TEST** (테스트 환경): 테스트용, `config.test.json` 사용
- **PROD** (운영 환경): 운영용, `config.prod.json` 사용

### 환경별 차이점

| 항목 | DEV | TEST | PROD |
|------|-----|------|------|
| 설정 파일 | `config.json` | `config.test.json` | `config.prod.json` |
| 데이터베이스 | TOTORO | TOTORO_TEST | TOTORO |
| 용도 | 개발/로컬 테스트 | 통합 테스트 | 실제 운영 |

---

## 설정 파일 생성

### 1단계: 템플릿 생성

```bash
# 모든 환경 템플릿 생성
python config_loader.py

# 특정 환경만 생성
python config_loader.py TEST
python config_loader.py PROD
```

### 2단계: 환경별 설정 수정

#### 테스트 환경 (`config.test.json`)

```json
{
  "database": {
    "host": "localhost",
    "port": 7002,
    "user": "root",
    "password": "test_password",
    "database": "TOTORO_TEST"
  },
  "github": {
    "max_pages": 10,
    "target_years": [2025]
  }
}
```

#### 운영 환경 (`config.prod.json`)

```json
{
  "database": {
    "host": "localhost",
    "port": 7002,
    "user": "root",
    "password": "!db8354",
    "database": "TOTORO"
  },
  "github": {
    "max_pages": 100,
    "target_years": [2027, 2026, 2025]
  }
}
```

### 3단계: .gitignore 확인

민감한 정보가 포함된 설정 파일은 Git에 커밋하지 않도록 `.gitignore`에 포함되어 있습니다:

```
config.json
config.test.json
config.prod.json
```

**템플릿 파일 생성:**

```bash
# 템플릿 파일 생성 (Git에 커밋 가능)
cp config.test.json config.test.json.example
cp config.prod.json config.prod.json.example
```

---

## 환경 전환 방법

### Windows (PowerShell)

```powershell
# 테스트 환경
$env:CVE_BOT_ENV = "TEST"
python main.py

# 운영 환경
$env:CVE_BOT_ENV = "PROD"
python main.py

# 환경 변수 확인
echo $env:CVE_BOT_ENV
```

### Windows (CMD)

```cmd
REM 테스트 환경
set CVE_BOT_ENV=TEST
python main.py

REM 운영 환경
set CVE_BOT_ENV=PROD
python main.py
```

### Linux/Mac

```bash
# 테스트 환경
export CVE_BOT_ENV=TEST
python main.py

# 운영 환경
export CVE_BOT_ENV=PROD
python main.py

# 환경 변수 확인
echo $CVE_BOT_ENV
```

### 영구 설정 (Windows)

시스템 환경 변수로 설정하면 매번 설정할 필요가 없습니다:

1. `Win + R` → `sysdm.cpl` 입력
2. "고급" 탭 → "환경 변수" 클릭
3. "시스템 변수"에서 "새로 만들기"
4. 변수 이름: `CVE_BOT_ENV`
5. 변수 값: `TEST` 또는 `PROD`

---

## 배포 프로세스

### 자동 배포 스크립트 사용

```powershell
# 테스트 환경 검증 후 운영 환경 배포
.\deploy.ps1

# 테스트 환경만 검증
.\deploy.ps1 -Target test

# 운영 환경만 배포
.\deploy.ps1 -Target prod

# Dry Run (실제 배포 없이 시뮬레이션)
.\deploy.ps1 -DryRun
```

### 수동 배포 프로세스

1. **개발 환경에서 작업**
   ```bash
   # 환경 변수 없이 실행 (DEV 환경)
   python main.py
   ```

2. **테스트 환경에서 검증**
   ```bash
   # 테스트 환경으로 전환
   $env:CVE_BOT_ENV = "TEST"
   
   # 테스트 실행
   python main.py
   
   # 결과 확인
   ```

3. **운영 환경에 배포**
   ```bash
   # 운영 환경으로 전환
   $env:CVE_BOT_ENV = "PROD"
   
   # 운영 실행
   python main.py
   ```

---

## Git 형상관리

### 브랜치 전략

```
main (운영)
  ├── develop (개발)
  │     ├── feature/새기능
  │     └── bugfix/버그수정
  └── hotfix/긴급수정
```

### 작업 흐름

1. **기능 개발**
   ```bash
   git checkout -b feature/새기능 develop
   # 개발 작업
   git commit -m "새 기능 추가"
   git push origin feature/새기능
   ```

2. **테스트 환경에서 검증**
   ```bash
   git checkout develop
   git merge feature/새기능
   $env:CVE_BOT_ENV = "TEST"
   python main.py  # 테스트 실행
   ```

3. **운영 환경에 배포**
   ```bash
   git checkout main
   git merge develop
   $env:CVE_BOT_ENV = "PROD"
   python main.py  # 운영 실행
   ```

### 커밋 규칙

- `feat`: 새 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드/설정 변경

예시:
```bash
git commit -m "feat: 환경별 설정 파일 분리 기능 추가"
git commit -m "fix: 테스트 환경 DB 연결 오류 수정"
```

---

## 주의사항

### ⚠️ 보안

1. **설정 파일은 절대 Git에 커밋하지 마세요**
   - `config.json`, `config.test.json`, `config.prod.json`은 `.gitignore`에 포함되어 있습니다
   - 템플릿 파일(`*.example`)만 커밋하세요

2. **운영 환경 설정은 신중하게 관리하세요**
   - 운영 환경 설정 파일은 안전한 곳에 백업하세요
   - 비밀번호는 강력하게 설정하세요

### ⚠️ 데이터베이스

1. **테스트 환경 DB는 별도로 생성하세요**
   ```sql
   CREATE DATABASE TOTORO_TEST;
   ```

2. **운영 환경 DB는 백업을 정기적으로 수행하세요**

### ⚠️ 배포 전 체크리스트

- [ ] 테스트 환경에서 정상 동작 확인
- [ ] 설정 파일이 올바르게 설정되었는지 확인
- [ ] 데이터베이스 연결 테스트
- [ ] Git 상태 확인 (커밋되지 않은 변경사항 확인)
- [ ] 로그 파일 확인

---

## 문제 해결

### 설정 파일을 찾을 수 없습니다

```bash
# 템플릿 생성
python config_loader.py

# 환경 변수 확인
echo $env:CVE_BOT_ENV  # Windows
echo $CVE_BOT_ENV      # Linux/Mac
```

### 잘못된 환경 변수 값

환경 변수는 `TEST`, `PROD`, `DEV` 중 하나여야 합니다. 대소문자는 구분하지 않습니다.

### 데이터베이스 연결 실패

1. 설정 파일의 DB 정보 확인
2. DB 서버가 실행 중인지 확인
3. 방화벽 설정 확인

---

## 추가 리소스

- [Git 형상관리 가이드](https://git-scm.com/book)
- [환경 변수 설정 가이드](https://docs.microsoft.com/ko-kr/windows/win32/procthread/environment-variables)
