# 08. 수집 모듈 - AI 분석 (Gemini)

## 역할

- `Github_CVE_Info`에서 `AI_chk='N'`인 POC에 대해 Gemini CLI로 분석 수행 → 결과를 `CVE_Packet_AI_Analysis`에 단계별 저장, `AI_chk`를 'Y'로 업데이트.

## 파일

- **ai_analyzer.py**: Gemini CLI 호출, 출력 파싱, JSON 결과 생성. 프롬프트는 `prompt_instruction.txt` 또는 인라인.
- **run_ai_analysis.py**: 분석 작업 진입점. DB에서 미분석 POC 조회 → `analyze_cve_with_gemini(download_path)` 호출 → DB 저장.
- **gemini_account_manager.py**: 계정 폴더 관리, 현재 계정 확인(`google_accounts.json`), 할당량 소진 시 다음 계정으로 전환, DB에 사용 현황 기록.
- **ai_analysis_config.json**: 병렬 여부, API 제한, 재시도, POC 폴더 크기 제한 등.

## 프롬프트

- **prompt.txt** / **prompt_instruction.txt**: 시스템 지시문, 한국어 응답 요청, 단계별 패킷·취약 단계·예상 응답·MITRE·Snort·대응 방안 등 출력 형식 정의.

## 분석 결과 필드 (CVE_Packet_AI_Analysis)

- link, download_path, cve_summary, step, packet_text, vuln_stage, stage_description, expected_response, mitre_tactic, mitre_technique, snort_rule, remediation 등.

## Gemini 계정

- **gemini_account_manager.py**:
  - `GEMINI_ACCOUNTS_DIR`: 인증 폴더들이 있는 경로(예: `C:\Users\TOTORO123\gemini_account_file`).
  - `USER_GEMINI_DIR`: 실제 사용 폴더(예: `C:\Users\TOTORO123\.gemini`).
  - `ACCOUNT_EMAIL_MAP`, `ACCOUNT_ORDER`: 이메일 → 폴더명, 사용 순서.
- 할당량 소진 시 DB에서 소진 계정 로드 후 다음 계정으로 스위치.

## 설정 (ai_analysis_config.json)

- `parallel_processing.enabled`, `max_workers`
- `api_limits.requests_per_minute`, `min_request_interval_seconds`, `timeout_seconds`
- `retry.max_retries`, `retry_delay_seconds`
- `poc_limits.max_folder_size_mb`: 이 크기 초과 시 분석 스킵.

## 로그

- `logs/ai_analyzer.log` (TimedRotating, 일별).

## 실행

- `python run_ai_analysis.py` (배치/스케줄로 주기 실행 가능).
