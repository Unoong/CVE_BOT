# gemini_quota_usage 갱신 흐름

## 1. gemini_quota_usage는 언제 갱신되는가?

**`gemini_account_manager.log_quota_event()`** 함수가 **유일한 갱신 지점**입니다.

| 호출 시점 | event_type | gemini_quota_usage 변경 |
|-----------|------------|-------------------------|
| 분석 성공 (DB 저장 완료) | `success` | request_count +1, success_count +1 |
| 분석 실패 (다운로드/경로/용량/API 에러 등) | `failed` | request_count +1, failed_count +1 |
| 429 할당량 초과 | `quota_exceeded` | is_quota_exceeded = TRUE |
| Rate Limit | `rate_limit` | is_quota_exceeded = TRUE |
| 계정 전환 | `account_switched` | 변경 없음 (로그만) |

## 2. 호출 경로

```
run_ai_analysis.py
  └─ run_analysis_cycle()
       └─ set_db_connection(conn)  ← 메인 스레드 conn (fallback용)
       └─ ThreadPoolExecutor
            └─ process_one_cve_thread_safe()  ← 워커 스레드
                 ├─ save_analysis_to_db(conn)  ← 워커 자신의 conn
                 └─ log_quota_event(..., conn=conn)  ← 워커 conn 전달 (수정됨)
```

## 3. log_quota_event 내부 동작

1. **get_current_account_email()** → `.gemini/google_accounts.json`의 `active` 값
2. **gemini_accounts 조회** → account_name/account_email 매칭으로 account_id 획득
3. **gemini_quota_usage 조회** → `account_id` + `usage_date`(오늘 KST)
4. **없으면 INSERT** (0,0,0), **있으면 UPDATE** (request_count 등 +1)
5. **gemini_quota_events INSERT** (이벤트 로그)
6. **commit**

## 4. gemini_quota_usage가 0인 이유 (가능한 원인)

| 원인 | 설명 | 확인 방법 |
|------|------|-----------|
| **① gemini_accounts 매칭 실패** | `get_current_account_email()` 반환값이 gemini_accounts에 없음 | `python check_quota_mismatch.py` |
| **② _db_conn 미설정** | `set_db_connection()` 호출 전에 log_quota_event 호출 | 로그에 `[DB 로그]` 없으면 early return |
| **③ usage_date 불일치** | Python KST today ≠ API 조회 시 today | `check_quota_mismatch.py` 날짜 비교 |
| **④ conn 혼선** | 워커는 자신의 conn, log_quota_event는 메인 conn 사용 | 병렬 시 conn 분리 가능성 |
| **⑤ 예외 후 rollback** | UPDATE/INSERT 후 commit 전 예외 → rollback | 로그에 `[DB 로그] 실패` 확인 |

## 5. 진단 스크립트

```powershell
# 1. 계정 매칭 + 날짜 확인
python check_quota_mismatch.py

# 2. 오늘 usage vs events 비교 (Node)
cd web
node -e "
const mysql = require('mysql2/promise');
const config = require('../config.json');
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
(async () => {
  const c = await mysql.createConnection(config.database);
  const [usage] = await c.query('SELECT ga.account_name, gqu.* FROM gemini_quota_usage gqu JOIN gemini_accounts ga ON ga.id = gqu.account_id WHERE gqu.usage_date = ?', [today]);
  const [ev] = await c.query('SELECT ga.account_name, COUNT(*) as cnt FROM gemini_quota_events gqe JOIN gemini_accounts ga ON gqe.account_id = ga.id WHERE DATE(gqe.created_at) = ? GROUP BY ga.account_name', [today]);
  console.log('usage:', usage);
  console.log('events:', ev);
  await c.end();
})();
"
```

## 6. 적용된 수정 (근본 해결)

**log_quota_event가 워커의 conn을 사용하도록** 수정 완료:

- `log_quota_event(..., conn=None)` 파라미터 추가
- `conn`이 있으면 해당 conn 사용, 없으면 `_db_conn` 사용
- `run_ai_analysis.py`의 모든 `log_quota_event` 호출에 `conn=conn` 전달

워커 스레드가 자신의 DB 연결로 usage를 갱신하여 conn 혼선을 방지합니다.
