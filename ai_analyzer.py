"""
Gemini AI를 사용한 CVE POC 분석 모듈
"""
import subprocess
import json
import time
import logging
from logging.handlers import TimedRotatingFileHandler
import os
import locale
from datetime import datetime
from pathlib import Path

def _setup_ai_analyzer_logger() -> logging.Logger:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(base_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    logger = logging.getLogger('AI_Analyzer')
    logger.setLevel(logging.INFO)
    # 다른 모듈에서 basicConfig로 핸들러가 먼저 세팅되는 경우가 있어
    # 여기서 강제로 표준 핸들러(로테이션)로 재구성합니다.
    logger.handlers.clear()

    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    file_handler = TimedRotatingFileHandler(
        os.path.join(logs_dir, 'ai_analyzer.log'),
        when='midnight',
        interval=1,
        backupCount=14,
        encoding='utf-8',
        utc=False
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.propagate = False

    return logger

logger = _setup_ai_analyzer_logger()


def decode_output_bytes(data: bytes, context: str = "stdout") -> str:
    """Gemini CLI 출력 바이트를 안전하게 문자열로 변환"""
    if not data:
        return ""

    enc_candidates = []

    # 1. UTF-8 우선
    enc_candidates.append('utf-8')
    enc_candidates.append('utf-8-sig')

    # 2. 로컬 기본 인코딩
    default_enc = locale.getpreferredencoding(False)
    if default_enc and default_enc.lower() not in [e.lower() for e in enc_candidates]:
        enc_candidates.append(default_enc)

    # 3. Windows에서 자주 쓰는 CP949/EUC-KR 추가
    for enc in ['cp949', 'euc-kr']:
        if enc.lower() not in [e.lower() for e in enc_candidates]:
            enc_candidates.append(enc)

    # 4. Latin-1은 마지막 보루 (모든 바이트 허용)
    enc_candidates.append('latin-1')

    for enc in enc_candidates:
        try:
            text = data.decode(enc)
            if enc != 'utf-8':
                logger.debug(f"[Gemini] {context} 디코딩에 {enc} 사용")
            return text
        except UnicodeDecodeError:
            continue

    # 완전히 실패하면 유니코드 치환 문자로 변환
    logger.warning(f"[Gemini] {context} 디코딩 실패 → 오류 치환 모드 사용")
    return data.decode('utf-8', errors='replace')

# 프롬프트 파일명 정의
PROMPT_FILE_NAME = "prompt_instruction.txt"

def analyze_cve_with_gemini(download_path):
    """
    Gemini CLI를 사용하여 CVE POC 분석

    Args:
        download_path: CVE POC가 저장된 경로

    Returns:
        dict: 분석 결과 또는 None
    """
    prompt_file_path = None
    try:
        # 경로 확인 및 압축 해제된 폴더 찾기 (이전 로직 유지)
        poc_path = Path(download_path)
        if not poc_path.exists():
            logger.error(f"[Gemini] 경로를 찾을 수 없음: {download_path}")
            return None

        if poc_path.is_dir():
            items = list(poc_path.iterdir())
            dirs = [d for d in items if d.is_dir()]

            if len(dirs) == 1:
                poc_path = dirs[0]
                logger.info(f"[Gemini] 분석 경로: {poc_path}")

        # ==========================================================
        # 🔑 프롬프트: 한국어 응답 지침 포함 (이전과 동일)
        # ==========================================================
        prompt = r"""SYSTEM:
당신은 숙련된 침해사고 분석가 보조입니다. 아래 지침을 **정확히** 준수하십시오.
**응답은 반드시 한국어로 작성하십시오.**

CONTEXT:
- gemini-cli의 `--all-files` 옵션으로 디렉터리 내 파일들(POC 코드, README 등, 그리고 ./CVE_info.txt)이 모델에 제공됩니다.
- ./CVE_info.txt 파일에는 CVE 메타데이터(JSON 또는 텍스트)가 들어있으니 반드시 참고하여 분석에 반영하십시오.
- **매우 중요:** 이 지침이 표준 입력(stdin)으로 전달된 **최종 프롬프트**입니다. 이 지침에 따라 분석하십시오.

INSTRUCTION (엄격):
1) **반드시 단일 JSON 객체 한 개만** 출력하십시오. 추가 설명, 마크다운, 로그, 주석 등은 절대 출력하지 마십시오.
2) 출력은 항상 **유효한 UTF-8 JSON**이어야 하며, 파싱 불가 시 실패로 간주합니다. 불확실한 값은 `null` 또는 빈 문자열("" 또는 [])로 표기하십시오.
3) 모델 호출 시 **temperature=0** 으로 결정적 결과를 유도하십시오.
4) 응답에 명시된 json 응답외에 다른 응답을 포함하지마시오, 응답값은 json응답 형식으로 파싱될 예정입니다.
5) 전달된 취약점에 대해 웹 검색을 통해 관련 정보를 추가 수집해서 분석 하십시오.

TASK:
제공된 파일들(POC 코드, README 등)과 `./CVE_info.txt`, 그리고 표준 입력으로 받은 이 지침을 분석하여 아래 **정해진 스키마**로만 응답하십시오.


OUTPUT SCHEMA (정확히 준수):
{
  \"cve_id\": string|null,              // CVE 식별자 또는 null
  \"cve_summary\": string,              // 취약점 유형, 영향받는 시스템/버전, 공격 메커니즘, 전제조건, 영향 범위를 포함한 상세 설명 (200-400자)
  \"affected_products\": [              // 취약점이 영향을 미치는 제품 목록
    {
      \"vendor\": string,               // 제조사/개발사 
      \"product\": string,              // 제품명 
      \"vulnerable_versions\": string,  // 취약 버전 범위 
      \"patched_version\": string|null  // 패치 버전  또는 null
    }
  ],
  \"poc_analysis\": {
    \"attack_steps\": [
      {
        \"step\": integer,              // 1,2,3...
        \"packet_text\": string,        // 원시 HTTP/텍스트 요청 (CRLF 
 표기 권장)
        \"vuln_stage\": string,         // 단계명 (첨부된 POC 코드 기준으로 작성) 
        \"stage_description\": string,  // 단계의 목적, 기술적 행위, 예상 동작, 보안 영향, 탐지 포인트를 포함한 상세 설명 (최소 3-5문장, 150-300자)
        \"expected_response\": string,  // 공격 성공 시 서버 응답: HTTP 코드, 헤더, 본문 내용, 성공 지표, 실패 시 차이점 (최소 100-200자)
        \"mitre_tactic\": string|null,  // 예: \"Initial Access\" 또는 null
        \"mitre_technique\": string|null,// 예: \"T1190\" 또는 null
        \"snort_rule\": string          // Snort v2 문법 규칙(단일 문자열). 불가능하면 빈 문자열 \"\"
      }
    ]
  },
  \"remediation\": [ string ]           // 대응 방법(업데이트, 접근제한, 가상패치 등)
}
OUTPUT RULES (엄격):
- 오직 위 필드들만 포함. 추가 필드 금지.
- `attack_steps`는 POC에서 실제로 전송되는 **각 요청 유형(논리적 패킷)** 별로 1개 항목씩 포함(중복 제거).
- `packet_text`는 재현 가능하도록 start-line + headers + body 형식으로 보존. 원문 인코딩(hex 등)은 그대로 유지.
- `stage_description`은 단순 키워드 나열이 아닌 **완전한 문장**으로 기술적 세부사항을 포함하여 작성.
- `expected_response`는 POC 코드의 응답 검증 로직을 참고하여 **구체적인 응답 예시**를 포함하여 작성.
- `cve_summary`는 ./CVE_info.txt의 메타데이터와 POC 분석 결과를 종합하여 취약점의 본질을 명확히 전달.
- `snort_rule`은 가능한 한 정확한 Snort v2 형식으로 작성. SID가 필요하면 모델이 제안하되, 조직 규칙으로 재할당 가능.
- 불확실한 값은 `null` 또는 빈 문자열/배열로 표기.
- 출력이 유효한 JSON이 아니면 재시도 로직을 트리거하시오.

END.
"""

        # 1. 작업 디렉토리에 프롬프트 파일을 저장
        prompt_file_path = poc_path / PROMPT_FILE_NAME
        with open(prompt_file_path, 'w', encoding='utf-8') as f:
            f.write(prompt)
        logger.info(f"[Gemini] 프롬프트를 파일로 저장: {prompt_file_path}")
        # 지연 테스트
        time.sleep(60)
        # 2. 명령어 구성 (type | gemini 파이프라인)
        cmd = f'type "{PROMPT_FILE_NAME}" | gemini -m gemini-2.5-pro --include-directories . -p ""'

        logger.info(f"[Gemini] 실행 명령: {cmd}")
        logger.info(f"[Gemini] 작업 디렉토리: {poc_path}")
        logger.info(f"[Gemini] ⏰ 분석 시작 시간: {datetime.now().strftime('%H:%M:%S')}")
        logger.info(f"[Gemini] 타임아웃: 300초 (5분)")

        start_time = time.time()

        try:
            # Popen으로 프로세스 시작 (더 강력한 타임아웃 제어)
            process = subprocess.Popen(
                cmd,
                cwd=str(poc_path),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,  # stderr를 stdout으로 리다이렉트
                shell=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
            )
            
            try:
                stdout_bytes, stderr_bytes = process.communicate(timeout=300)
                returncode = process.returncode
                elapsed_time = time.time() - start_time
                stdout = decode_output_bytes(stdout_bytes, "stdout")
                stderr = decode_output_bytes(stderr_bytes, "stderr") if stderr_bytes else ""
                logger.info(f"[Gemini] ✅ 실행 완료 (소요 시간: {elapsed_time:.1f}초)")
                
                # result 객체 생성 (subprocess.run 결과와 호환)
                class Result:
                    def __init__(self, returncode, stdout, stderr):
                        self.returncode = returncode
                        self.stdout = stdout
                        self.stderr = stderr
                
                result = Result(returncode, stdout, stderr)
                
            except subprocess.TimeoutExpired:
                elapsed_time = time.time() - start_time
                logger.error(f"[Gemini] ⏰ 타임아웃 발생! (경과 시간: {elapsed_time:.1f}초)")
                
                # 프로세스 강제 종료
                try:
                    if os.name == 'nt':
                        # Windows: taskkill로 프로세스 트리 전체 종료
                        import signal
                        process.send_signal(signal.CTRL_BREAK_EVENT)
                        time.sleep(1)
                        process.kill()
                        logger.info(f"[Gemini] 프로세스 강제 종료 완료 (PID: {process.pid})")
                    else:
                        # Linux/Mac: SIGTERM → SIGKILL
                        process.terminate()
                        time.sleep(2)
                        if process.poll() is None:
                            process.kill()
                        logger.info(f"[Gemini] 프로세스 강제 종료 완료 (PID: {process.pid})")
                except Exception as kill_err:
                    logger.error(f"[Gemini] 프로세스 종료 실패: {kill_err}")
                
                # 타임아웃 전 부분 응답 수집
                try:
                    stdout_timeout, stderr_timeout = process.communicate(timeout=1)
                except:
                    stdout_timeout, stderr_timeout = b"", b""

                stdout = decode_output_bytes(stdout_timeout, "stdout-timeout") if stdout_timeout else ""
                stderr = decode_output_bytes(stderr_timeout, "stderr-timeout") if stderr_timeout else ""

                if stdout:
                    logger.error(f"[Gemini] 타임아웃 전 부분 응답:\n{stdout[:1000]}")
                if stderr:
                    logger.error(f"[Gemini] STDERR:\n{stderr[:1000]}")

                error_text = f"{stderr} {stdout}".lower() if (stderr or stdout) else ""
                if any(keyword in error_text for keyword in ['quota', 'limit', 'exceeded', 'resource']):
                    logger.error(f"[Gemini] 타임아웃 + 할당량 관련 메시지 → 할당량 초과로 추정")
                    return {'error': 'quota_exceeded', 'message': '타임아웃 (할당량 초과 가능성)'}
                
                logger.error(f"[Gemini] 타임아웃으로 인한 실패 (300초 초과)")
                return {
                    'error': 'timeout', 
                    'message': f'타임아웃 ({elapsed_time:.1f}초 경과)',
                    'raw_output': stdout,
                    'stderr': stderr,
                    'return_code': -1
                }

        except Exception as e:
            logger.error(f"[Gemini] 실행 중 예외 발생: {e}")
            return {
                'error': 'exception', 
                'message': str(e),
                'raw_output': '',
                'stderr': str(e),
                'return_code': -2
            }

        # ==========================================================
        # 🔑 응답 로깅 수정: STDOUT 전체 출력
        # ==========================================================
        logger.info(f"[Gemini] ==================== 응답 시작 ====================")
        logger.info(f"[Gemini] Return Code: {result.returncode}")
        logger.info(f"[Gemini] STDOUT 길이: {len(result.stdout)} 문자")
        logger.info(f"[Gemini] STDERR 길이: {len(result.stderr)} 문자")

        if result.stdout:
            # ✅ 전체 응답 출력 (길이 제한 없음)
            logger.info(f"[Gemini] STDOUT 전체:\n{result.stdout}")
        else:
            logger.warning(f"[Gemini] ⚠️ STDOUT이 비어있습니다!")

        if result.stderr:
            logger.warning(f"[Gemini] STDERR 전체:\n{result.stderr}")

        logger.info(f"[Gemini] ==================== 응답 끝 ====================")

        if result.returncode != 0:
            error_msg = result.stderr
            stdout_msg = result.stdout
            logger.error(f"[Gemini] 실행 실패 (코드: {result.returncode})")
            logger.error(f"[Gemini] STDERR:\n{error_msg[:500]}")
            logger.error(f"[Gemini] STDOUT:\n{stdout_msg[:500]}")

            # 할당량 초과 체크 (강화된 감지) - stderr와 stdout 모두 확인
            quota_keywords = [
                'quota exceeded',           # 직접적인 할당량 초과
                'RESOURCE_EXHAUSTED',       # gRPC 상태 코드
                'RATE_LIMIT_EXCEEDED',      # Rate Limit 에러
                'quota_limit',              # 할당량 제한
                'rateLimitExceeded',        # JSON 에러 reason
                '429',                      # HTTP 429 상태 코드
                'Too Many Requests',        # HTTP 429 메시지
                'Gemini 2.5 Pro Requests',  # Gemini 2.5 Pro 할당량
                'StreamGenerateContent Requests',  # StreamGenerateContent 할당량
                'Requests per day',         # 일일 요청 제한
                'GaxiosError',              # Gaxios 에러
                'status": 429',             # JSON에서 status 429
                'exhausted your capacity',  # 모델 용량 소진
                'API Error',                # API 에러 (용량 소진 포함)
                'quota will reset',         # 할당량 리셋 메시지
                'capacity on this model'    # 모델 용량 관련
            ]
            # stdout과 stderr 모두에서 검색
            full_error_text = f"{error_msg} {stdout_msg}".lower()

            is_quota_exceeded = any(keyword.lower() in full_error_text for keyword in quota_keywords)
            
            if is_quota_exceeded:
                # 상세 에러 메시지 추출 (100자로 제한)
                detailed_error = stdout_msg[:100] if stdout_msg else (error_msg[:100] if error_msg else "Quota exceeded")
                
                # JSON 에러에서 message 필드 추출 시도 (stdout 우선)
                try:
                    error_data = stdout_msg if ('"message":' in stdout_msg) else error_msg
                    if '"message":' in error_data or '"error":' in error_data:
                        import json as json_module
                        # JSON 배열 파싱 시도
                        if error_data.strip().startswith('['):
                            parsed = json_module.loads(error_data)
                            if isinstance(parsed, list) and len(parsed) > 0:
                                error_obj = parsed[0].get('error', {})
                                detailed_error = error_obj.get('message', detailed_error)[:100]
                        # JSON 객체 파싱 시도
                        elif error_data.strip().startswith('{'):
                            parsed = json_module.loads(error_data)
                            error_obj = parsed.get('error', {})
                            detailed_error = error_obj.get('message', detailed_error)[:100]
                except Exception as json_err:
                    pass  # JSON 파싱 실패는 무시
                
                logger.error(f"[Gemini] ⚠️ 429 Quota Exceeded: {detailed_error[:100]}")
                return {
                    'error': 'quota_exceeded', 
                    'message': detailed_error[:100],
                    'raw_output': stdout_msg,
                    'stderr': error_msg,
                    'return_code': result.returncode
                }

            # 일반 실패 - 상세 에러 메시지 포함
            detailed_error = error_msg[:500] if error_msg else f"Gemini CLI 실패 (코드: {result.returncode})"
            logger.error(f"[Gemini] 📝 상세 에러: {detailed_error[:200]}")
            return {
                'error': 'failed', 
                'message': detailed_error[:500],
                'raw_output': stdout_msg,
                'stderr': error_msg,
                'return_code': result.returncode
            }

        # JSON 파싱 (returncode == 0이어도 에러 체크 필요!)
        output = result.stdout.strip()
        
        if not output:
            logger.error(f"[Gemini] 출력이 비어있습니다!")
            logger.error(f"[Gemini] 전체 STDERR:\n{result.stderr}")
            return {
                'error': 'empty_output',
                'message': 'Gemini 출력이 비어있습니다',
                'raw_output': '',
                'stderr': result.stderr,
                'return_code': result.returncode
            }

        # JSON 추출 (```json ``` 제거)
        original_output = output
        json_extracted = False
        if '```json' in output:
            # JSON 블록 추출 시, 시작과 끝 코드를 기준으로 추출
            try:
                # '```json' 바로 다음부터 다음 '```'까지 추출
                output = output.split('```json', 1)[1].split('```', 1)[0].strip()
                json_extracted = True
                logger.info(f"[Gemini] JSON 블록 추출 완료 (```json```)")
            except IndexError:
                # ```json 태그가 시작만 있고 닫는 태그가 없을 경우 (혹시 모를 상황 대비)
                output = output.split('```json', 1)[1].strip()
                json_extracted = True
                logger.warning(f"[Gemini] ⚠️ 닫는 ``` 태그 없이 JSON 블록 추출")
        elif '```' in output:
            # ```json이 아닌 ``` 블록만 있을 경우 (JSON 추출 시도)
            try:
                output = output.split('```', 1)[1].split('```', 1)[0].strip()
                json_extracted = True
                logger.info(f"[Gemini] 코드 블록 추출 완료 (```)")
            except IndexError:
                output = output.split('```', 1)[1].strip()
                json_extracted = True
                logger.warning(f"[Gemini] ⚠️ 닫는 ``` 태그 없이 코드 블록 추출")

        logger.info(f"[Gemini] 파싱할 JSON (처음 500자):\n{output[:500]}")

        # JSON 파싱 시도 (성공하면 할당량 체크 건너뛰기)
        try:
            # JSON 파싱 전에 이스케이프 문제 해결
            # packet_text 필드의 특수 문자들을 안전하게 처리
            import re
            
            # packet_text 필드의 따옴표 이스케이프 문제 해결
            def fix_packet_text_quotes(match):
                packet_text = match.group(1)
                # 따옴표를 이스케이프 처리
                packet_text = packet_text.replace('"', '\\"')
                return f'"packet_text": "{packet_text}"'
            
            # packet_text 필드의 따옴표 문제 수정
            output = re.sub(r'"packet_text":\s*"([^"]*(?:\\.[^"]*)*)"', fix_packet_text_quotes, output, flags=re.DOTALL)
            
            analysis_result = json.loads(output)
            logger.info(f"[Gemini] ✅ JSON 파싱 성공!")
            logger.info(f"[Gemini] 분석 결과 키: {list(analysis_result.keys())}")
            
            # JSON 파싱 성공 시, 할당량 체크는 건너뛰고 성공 처리
            # 단, JSON 내부에 error 필드가 있는 경우만 할당량 체크 수행
            if isinstance(analysis_result, dict) and 'error' in analysis_result:
                # JSON 내부에 error 필드가 있는 경우 (실제 에러 응답)
                error_obj = analysis_result.get('error', {})
                error_message = str(error_obj) if isinstance(error_obj, dict) else str(error_obj)
                error_message_lower = error_message.lower()
                
                quota_keywords = [
                    'quota exceeded', '429', 'quota_limit', 'gemini 2.5 pro requests', 
                    'streamgeneratecontent requests', 'ratelimit exceeded', 'resource_exhausted',
                    'too many requests'
                ]
                
                if any(keyword in error_message_lower for keyword in quota_keywords):
                    logger.error(f"[Gemini] ⚠️ JSON 내부에 할당량 초과 에러 감지!")
                    return {
                        'error': 'quota_exceeded', 
                        'message': error_message[:500],
                        'raw_output': original_output,
                        'stderr': result.stderr,
                        'return_code': result.returncode
                    }
            
            # 정상적인 JSON 응답 - 성공 처리
            logger.info(f"[Gemini] 분석 결과 미리보기 (JSON):\n{json.dumps(analysis_result, indent=2, ensure_ascii=False)[:1000]}")
            return analysis_result
        except json.JSONDecodeError as e:
            logger.error(f"[Gemini] ❌ JSON 파싱 실패! 에러: {e}")
            logger.error(f"[Gemini] 에러 위치: Line {e.lineno}, Column {e.colno}")
            
            # JSON 파싱 실패 시, 원본 출력에서 할당량 에러 체크
            original_output_lower = original_output.lower()
            quota_keywords_stdout = [
                'quota exceeded', '429', 'quota_limit', 'gemini 2.5 pro requests', 
                'streamgeneratecontent requests', 'ratelimit exceeded', 'resource_exhausted',
                'gaxioserror', 'status": 429', 'too many requests',
                'exhausted your capacity',  # 모델 용량 소진
                'api error',                # API 에러 (용량 소진 포함)
                'quota will reset',         # 할당량 리셋 메시지
                'capacity on this model'    # 모델 용량 관련
            ]
            
            # 원본 출력에서 할당량 키워드 체크 (JSON 외부 메시지에서만)
            if any(keyword in original_output_lower for keyword in quota_keywords_stdout):
                # JSON 블록 외부에 할당량 키워드가 있는 경우
                # 하지만 JSON 파싱이 실패했으므로, 실제 에러인지 확인 필요
                logger.error(f"[Gemini] ⚠️ JSON 파싱 실패 + 할당량 키워드 감지!")
                logger.error(f"[Gemini] 원본 출력:\n{original_output[:500]}")
                
                # JSON 에러 파싱 시도
                detailed_error = original_output[:500]
                try:
                    if '"error":' in original_output:
                        import json as json_module
                        if original_output.strip().startswith('['):
                            parsed = json_module.loads(original_output)
                            if isinstance(parsed, list) and len(parsed) > 0:
                                error_obj = parsed[0].get('error', {})
                                detailed_error = error_obj.get('message', detailed_error)
                        elif original_output.strip().startswith('{'):
                            parsed = json_module.loads(original_output)
                            error_obj = parsed.get('error', {})
                            detailed_error = error_obj.get('message', detailed_error)
                except:
                    pass
                
                return {
                    'error': 'quota_exceeded', 
                    'message': detailed_error[:500],
                    'raw_output': original_output,
                    'stderr': result.stderr,
                    'return_code': result.returncode
                }
            
            # JSON 수정 시도
            try:
                logger.info(f"[Gemini] 🔧 JSON 수정 시도 중...")
                
                # 더 강력한 JSON 수정 로직
                fixed_output = output
                
                # 1. packet_text 필드의 따옴표 문제 수정
                fixed_output = re.sub(
                    r'"packet_text":\s*"([^"]*(?:\\.[^"]*)*)"',
                    lambda m: f'"packet_text": {json.dumps(m.group(1))}',
                    fixed_output,
                    flags=re.DOTALL
                )
                
                # 2. stage_description 필드의 따옴표 문제 수정
                fixed_output = re.sub(
                    r'"stage_description":\s*"([^"]*(?:\\.[^"]*)*)"',
                    lambda m: f'"stage_description": {json.dumps(m.group(1))}',
                    fixed_output,
                    flags=re.DOTALL
                )
                
                # 3. expected_response 필드의 따옴표 문제 수정
                fixed_output = re.sub(
                    r'"expected_response":\s*"([^"]*(?:\\.[^"]*)*)"',
                    lambda m: f'"expected_response": {json.dumps(m.group(1))}',
                    fixed_output,
                    flags=re.DOTALL
                )
                
                # 4. snort_rule 필드의 따옴표 문제 수정
                fixed_output = re.sub(
                    r'"snort_rule":\s*"([^"]*(?:\\.[^"]*)*)"',
                    lambda m: f'"snort_rule": {json.dumps(m.group(1))}',
                    fixed_output,
                    flags=re.DOTALL
                )
                
                analysis_result = json.loads(fixed_output)
                logger.info(f"[Gemini] ✅ JSON 수정 후 파싱 성공!")
                logger.info(f"[Gemini] 분석 결과 키: {list(analysis_result.keys())}")
                return analysis_result
                
            except Exception as fix_error:
                logger.error(f"[Gemini] ❌ JSON 수정도 실패: {fix_error}")
                logger.error(f"[Gemini] ==================== 원본 응답 전체 ====================")
                logger.error(f"[Gemini] 원본 출력 (전체):\n{original_output}")
                return {
                    'error': 'json_parse_failed',
                    'message': f'JSON 파싱 실패: {e}',
                    'raw_output': original_output,
                    'stderr': result.stderr,
                    'return_code': result.returncode
                }

    except Exception as e:
        logger.error(f"[Gemini] 오류 발생: {e}")
        return {
            'error': 'exception',
            'message': str(e),
            'raw_output': '',
            'stderr': str(e),
            'return_code': -3
        }
    finally:
        # 임시 프롬프트 파일 삭제 (성공/실패 여부와 관계없이)
        if prompt_file_path and prompt_file_path.exists():
            try:
                os.remove(prompt_file_path)
                logger.info(f"[Gemini] 임시 프롬프트 파일 삭제 완료: {prompt_file_path}")
            except Exception as e:
                logger.warning(f"[Gemini] 임시 파일 삭제 실패: {prompt_file_path} - {e}")


def save_analysis_to_db(conn, link, download_path, analysis_result):
    """
    Gemini 분석 결과를 DB에 저장
    """
    try:
        import json as json_module
        cursor = conn.cursor()

        # 에러 정보 확인
        error_info = None
        if isinstance(analysis_result, dict) and 'error' in analysis_result:
            error_type = analysis_result.get('error', 'unknown')
            
            # quota_exceeded나 rate_limit 에러는 저장하지 않음
            if error_type in ['quota_exceeded', 'rate_limit', 'quota_suspicious']:
                logger.warning(f"[DB] {error_type} 에러는 저장하지 않음")
                return False
            
            error_info = {
                'error_type': error_type,
                'error_message': analysis_result.get('message', ''),
                'raw_output': analysis_result.get('raw_output', ''),
                'stderr': analysis_result.get('stderr', ''),
                'return_code': analysis_result.get('return_code', 0)
            }
            error_info_json = json_module.dumps(error_info, ensure_ascii=False)
        else:
            error_info_json = None

        cve_summary = analysis_result.get('cve_summary', '')
        attack_steps = analysis_result.get('poc_analysis', {}).get('attack_steps', [])
        remediation = analysis_result.get('remediation', [])
        remediation_text = '\n'.join(remediation) if isinstance(remediation, list) else str(remediation)
        
        # affected_products를 JSON 문자열로 변환
        affected_products = analysis_result.get('affected_products', [])
        affected_products_json = json_module.dumps(affected_products, ensure_ascii=False) if affected_products else None

        # 공격 단계가 없는 경우 (에러 또는 빈 결과) 저장하지 않음
        if not attack_steps:
            logger.warning(f"[DB] 공격 단계가 없으므로 저장하지 않음: {link}")
            return False
        else:
            # 각 attack_step을 별도 row로 저장
            for step_data in attack_steps:
                cursor.execute('''
                INSERT INTO CVE_Packet_AI_Analysis
                (link, download_path, cve_summary, step, packet_text, vuln_stage,
                 stage_description, mitre_tactic, mitre_technique, snort_rule, remediation, expected_response, affected_products, error_info)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                link,
                download_path,
                cve_summary,
                step_data.get('step', 0),
                step_data.get('packet_text', ''),
                step_data.get('vuln_stage', ''),
                step_data.get('stage_description', ''),
                step_data.get('mitre_tactic'),
                step_data.get('mitre_technique'),
                step_data.get('snort_rule', ''),
                remediation_text,
                step_data.get('expected_response', ''),
                affected_products_json,
                error_info_json
            ))

        conn.commit()
        cursor.close()
        logger.info(f"[DB] {len(attack_steps)}개 분석 결과 저장 완료: {link}")
        if affected_products:
            logger.info(f"[DB] affected_products 저장: {len(affected_products)}개 제품")
            
            # CVE 코드 추출 (link에서 또는 analysis_result에서)
            cve_id = analysis_result.get('cve_id', '')
            if cve_id:
                # CVE_Info의 product 필드 업데이트 시도
                update_cve_info_product(conn, cve_id, affected_products)
        
        return True

    except Exception as e:
        logger.error(f"[DB] 저장 오류: {e}")
        conn.rollback()
        return False


def update_ai_check_status(conn, link, status='Y'):
    """
    GitHub_CVE_Info의 AI_chk 상태 업데이트
    """
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE Github_CVE_Info SET AI_chk = %s WHERE link = %s",
            (status, link)
        )
        conn.commit()
        cursor.close()
        logger.info(f"[DB] AI_chk 업데이트: {link} -> {status}")
    except Exception as e:
        logger.error(f"[DB] AI_chk 업데이트 오류: {e}")


def update_cve_info_product(conn, cve_code, affected_products):
    """
    CVE_Info 테이블의 product 필드가 비어있으면 AI 분석 결과로 업데이트
    
    Args:
        conn: DB 연결 객체
        cve_code: CVE 코드
        affected_products: AI 분석 결과의 affected_products 배열
    """
    try:
        if not cve_code or not affected_products:
            return
        
        cursor = conn.cursor(dictionary=True)
        
        # 현재 product 필드 확인
        cursor.execute(
            "SELECT product FROM CVE_Info WHERE CVE_Code = %s",
            (cve_code,)
        )
        result = cursor.fetchone()
        
        if not result:
            logger.debug(f"[CVE Product Update] CVE_Info에 {cve_code}가 없음")
            cursor.close()
            return
        
        current_product = result.get('product', '')
        
        # product가 비어있거나 N/A인 경우에만 업데이트
        if not current_product or current_product.strip() == '' or current_product.strip().upper() == 'N/A':
            # affected_products에서 제품명 추출
            products = []
            for item in affected_products:
                vendor = item.get('vendor', '').strip()
                product = item.get('product', '').strip()
                
                if vendor and product:
                    products.append(f"{vendor} {product}")
                elif product:
                    products.append(product)
            
            if products:
                # 여러 제품이 있으면 ", "로 연결
                product_text = ', '.join(products[:3])  # 최대 3개까지만
                
                # 업데이트
                cursor.execute(
                    "UPDATE CVE_Info SET product = %s WHERE CVE_Code = %s",
                    (product_text, cve_code)
                )
                conn.commit()
                logger.info(f"[CVE Product Update] {cve_code} product 업데이트: '{product_text}'")
            else:
                logger.debug(f"[CVE Product Update] {cve_code} - 추출할 제품명 없음")
        else:
            logger.debug(f"[CVE Product Update] {cve_code} - 이미 product 존재: '{current_product}'")
        
        cursor.close()
        
    except Exception as e:
        logger.error(f"[CVE Product Update] 업데이트 오류: {e}")