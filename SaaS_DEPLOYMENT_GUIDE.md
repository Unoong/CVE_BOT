# 🚀 취약점 관리 시스템 SaaS 배포 가이드

## 📊 시스템 아키텍처 분석

### 현재 시스템 구성
- **백엔드**: Node.js + Express (포트 32577, 32578)
- **프론트엔드**: React + Vite (포트 3000)
- **데이터베이스**: MySQL (포트 7002)
- **Python 스크립트**: CVE 수집, AI 분석 (Gemini API)
- **실시간 통신**: Socket.IO
- **파일 저장**: 로컬 파일 시스템 (uploads/)

---

## 🎯 추천 서버 스펙 (단계별)

### 📌 **1단계: 초기 런칭 (소규모 - 100명 이하 사용자)**

#### 옵션 A: 단일 서버 구성 (비용 효율적)
```
OS: Ubuntu 22.04 LTS
CPU: 4 vCPU
RAM: 8GB
Storage: 100GB SSD
네트워크: 1Gbps
```

**추천 클라우드:**
- **AWS**: t3.xlarge (약 $0.1664/시간, 월 $120)
- **Azure**: Standard_D4s_v3 (약 $0.192/시간, 월 $138)
- **GCP**: n1-standard-4 (약 $0.19/시간, 월 $137)
- **Naver Cloud**: vCPU 4, RAM 8GB (약 월 $80-100)

**구성:**
- 모든 서비스(백엔드, 프론트엔드, DB)를 한 서버에 배치
- Nginx 리버스 프록시
- PM2로 프로세스 관리
- MySQL 로컬 설치

**예상 비용**: 월 $80-140

---

#### 옵션 B: 분리 구성 (안정성 우선)
```
[웹 서버]
OS: Ubuntu 22.04 LTS
CPU: 2 vCPU
RAM: 4GB
Storage: 50GB SSD

[DB 서버]
OS: Ubuntu 22.04 LTS
CPU: 2 vCPU
RAM: 4GB
Storage: 100GB SSD (고성능)
```

**추천 클라우드:**
- **AWS**: t3.medium x2 (월 $60 x2 = $120)
- **Naver Cloud**: vCPU 2, RAM 4GB x2 (월 $50 x2 = $100)

**예상 비용**: 월 $100-140

---

### 📌 **2단계: 성장 단계 (100-1,000명 사용자)**

#### 추천 구성
```
[웹 서버] - 로드밸런서 뒤 2대
OS: Ubuntu 22.04 LTS
CPU: 4 vCPU
RAM: 8GB
Storage: 100GB SSD

[DB 서버] - Master-Slave 구성
OS: Ubuntu 22.04 LTS
CPU: 4 vCPU
RAM: 16GB
Storage: 200GB SSD (IOPS 최적화)

[파일 저장소]
- AWS S3 / Naver Object Storage
- 또는 전용 스토리지 서버
```

**추천 클라우드:**
- **AWS**: 
  - Application Load Balancer ($16/월)
  - t3.xlarge x2 ($120 x2 = $240)
  - db.t3.xlarge ($200/월)
  - S3 스토리지 ($10-30/월)
  - **총: 약 $486-506/월**

- **Naver Cloud**: 
  - 로드밸런서 ($20/월)
  - vCPU 4, RAM 8GB x2 ($100 x2 = $200)
  - DB 전용 서버 vCPU 4, RAM 16GB ($200/월)
  - Object Storage ($10-30/월)
  - **총: 약 $430-450/월**

---

### 📌 **3단계: 대규모 (1,000명 이상 사용자)**

#### 추천 구성
```
[웹 서버 클러스터] - Auto Scaling
OS: Ubuntu 22.04 LTS
CPU: 8 vCPU
RAM: 16GB
인스턴스: 2-10대 (자동 확장)

[DB 서버] - 고가용성 구성
OS: Ubuntu 22.04 LTS
CPU: 8 vCPU
RAM: 32GB
Storage: 500GB SSD (고성능)
구성: Master-Slave + Read Replica

[캐시 서버]
Redis Cluster (8GB RAM)

[파일 저장소]
CDN + Object Storage
```

**추천 클라우드:**
- **AWS**: 
  - ALB + Auto Scaling Group
  - c5.2xlarge x2-10 ($340 x2 = $680 기본)
  - db.r5.2xlarge ($500/월)
  - ElastiCache Redis ($100/월)
  - S3 + CloudFront ($50-100/월)
  - **총: 약 $1,330-1,380/월 (기본)**

- **Naver Cloud**: 
  - 로드밸런서 + Auto Scaling
  - vCPU 8, RAM 16GB x2-10 ($200 x2 = $400 기본)
  - DB 전용 서버 vCPU 8, RAM 32GB ($500/월)
  - Redis Cache ($100/월)
  - Object Storage + CDN ($50-100/월)
  - **총: 약 $1,050-1,100/월 (기본)**

---

## 🖥️ OS 추천

### **1순위: Ubuntu 22.04 LTS**
- ✅ 장기 지원 (2027년까지)
- ✅ Node.js, Python 패키지 관리 용이
- ✅ 커뮤니티 지원 풍부
- ✅ 클라우드 호환성 우수
- ✅ 보안 업데이트 정기 제공

### **2순위: Ubuntu 24.04 LTS**
- ✅ 최신 기능
- ✅ 향상된 성능
- ⚠️ 상대적으로 새로운 버전

### **3순위: Debian 12**
- ✅ 안정성 우수
- ✅ 리소스 사용량 적음
- ⚠️ 패키지 버전이 보수적

---

## 💾 데이터베이스 추천

### **옵션 1: MySQL (현재 사용 중)**
- ✅ 현재 시스템과 호환
- ✅ 마이그레이션 비용 없음
- ✅ 커뮤니티 지원 풍부
- ⚠️ 대규모 트래픽 시 성능 한계

**추천 버전**: MySQL 8.0 이상

### **옵션 2: PostgreSQL (장기 추천)**
- ✅ 대규모 트래픽에 강함
- ✅ JSON 지원 우수
- ✅ 복잡한 쿼리 성능 우수
- ⚠️ 마이그레이션 필요

### **옵션 3: 클라우드 관리형 DB**
- **AWS RDS**: MySQL/PostgreSQL 관리형
- **Naver Cloud DB**: MySQL 관리형
- ✅ 백업, 복제 자동화
- ✅ 유지보수 부담 감소
- ⚠️ 비용 증가 (약 20-30%)

---

## 🔧 필수 소프트웨어 구성

### **웹 서버**
```bash
# Nginx (리버스 프록시)
sudo apt install nginx

# SSL 인증서 (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
```

### **프로세스 관리**
```bash
# PM2 (Node.js 프로세스 관리)
npm install -g pm2
pm2 startup systemd
```

### **모니터링**
```bash
# PM2 모니터링
pm2 install pm2-logrotate

# 시스템 모니터링 (선택)
sudo apt install htop iotop
```

### **보안**
```bash
# 방화벽
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS

# Fail2Ban (무차별 대입 공격 방지)
sudo apt install fail2ban
```

---

## 📈 성능 최적화 권장사항

### **1단계 (초기)**
- ✅ Nginx 리버스 프록시
- ✅ Gzip 압축 활성화
- ✅ 정적 파일 CDN 사용
- ✅ DB 인덱스 최적화
- ✅ PM2 클러스터 모드 (CPU 코어 수만큼)

### **2단계 (성장)**
- ✅ Redis 캐싱 (세션, 자주 조회되는 데이터)
- ✅ DB 쿼리 최적화
- ✅ 이미지 최적화 (WebP 변환)
- ✅ 로드밸런서 도입

### **3단계 (대규모)**
- ✅ Auto Scaling
- ✅ DB Read Replica
- ✅ CDN 전역 배포
- ✅ 마이크로서비스 아키텍처 고려

---

## 💰 비용 최적화 팁

### **초기 단계**
1. **Reserved Instance 사용** (1년 약정 시 30-40% 할인)
2. **스팟 인스턴스** (개발/테스트 환경)
3. **단일 서버 구성** (초기에는 충분)

### **성장 단계**
1. **Auto Scaling** (필요할 때만 확장)
2. **Object Storage** (파일 저장 비용 절감)
3. **CDN 캐싱** (대역폭 비용 절감)

### **대규모 단계**
1. **Multi-AZ 구성** (고가용성)
2. **예약 인스턴스** (장기 약정)
3. **커스텀 인스턴스** (특정 워크로드 최적화)

---

## 🚨 보안 체크리스트

### **필수 보안 설정**
- [ ] SSH 키 인증 (비밀번호 비활성화)
- [ ] 방화벽 설정 (UFW/Firewalld)
- [ ] SSL/TLS 인증서 (Let's Encrypt)
- [ ] 정기 보안 업데이트
- [ ] 데이터베이스 접근 제한 (특정 IP만)
- [ ] 환경 변수로 민감 정보 관리
- [ ] 로그 모니터링 및 알림 설정

---

## 📝 배포 체크리스트

### **서버 준비**
- [ ] OS 설치 (Ubuntu 22.04 LTS)
- [ ] 사용자 계정 생성 (root 비활성화)
- [ ] SSH 키 설정
- [ ] 방화벽 설정
- [ ] Nginx 설치 및 설정
- [ ] SSL 인증서 발급
- [ ] Node.js 설치 (v18 이상)
- [ ] Python 설치 (v3.9 이상)
- [ ] MySQL 설치 및 설정
- [ ] PM2 설치 및 설정

### **애플리케이션 배포**
- [ ] 코드 배포 (Git clone 또는 CI/CD)
- [ ] 환경 변수 설정 (.env)
- [ ] 의존성 설치 (npm, pip)
- [ ] 데이터베이스 마이그레이션
- [ ] PM2로 서비스 시작
- [ ] Nginx 리버스 프록시 설정
- [ ] 도메인 연결 및 DNS 설정

### **모니터링 설정**
- [ ] PM2 모니터링 설정
- [ ] 로그 로테이션 설정
- [ ] 백업 스크립트 설정
- [ ] 알림 설정 (이메일/Slack)

---

## 🎯 최종 추천 (초기 런칭)

### **추천 구성**
```
OS: Ubuntu 22.04 LTS
서버: 단일 서버 (4 vCPU, 8GB RAM, 100GB SSD)
클라우드: Naver Cloud Platform (비용 효율적)
DB: MySQL 8.0 (로컬 설치)
웹서버: Nginx
프로세스 관리: PM2
SSL: Let's Encrypt
```

**예상 월 비용**: $80-120

**장점:**
- ✅ 초기 비용 절감
- ✅ 관리 용이
- ✅ 확장 가능 (필요 시 분리)
- ✅ 한국 사용자 접속 속도 우수 (Naver Cloud)

---

## 📞 다음 단계

1. **클라우드 선택**: Naver Cloud (한국) 또는 AWS (글로벌)
2. **서버 생성**: Ubuntu 22.04 LTS, 4 vCPU, 8GB RAM
3. **도메인 구매**: .com 또는 .kr 도메인
4. **SSL 인증서**: Let's Encrypt 무료 인증서
5. **모니터링 설정**: PM2 + 로그 관리
6. **백업 전략**: 자동 백업 스크립트 설정

---

## 🔗 참고 자료

- [Ubuntu 22.04 LTS 공식 문서](https://ubuntu.com/)
- [PM2 공식 문서](https://pm2.keymetrics.io/)
- [Nginx 설정 가이드](https://nginx.org/en/docs/)
- [Let's Encrypt 가이드](https://letsencrypt.org/)

---

**작성일**: 2026-01-22
**버전**: 1.0
