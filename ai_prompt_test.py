import subprocess
import sys
import json
import os


def execute_command(command, working_dir=None):
    """
    명령어를 실행하고 출력을 반환하는 함수
    """
    try:
        # 작업 디렉터리 변경
        if working_dir:
            os.chdir(working_dir)
            print(f"작업 디렉터리 변경: {os.getcwd()}\n")

        # 명령어 실행 (인코딩을 cp949로 변경 - Windows 한글 처리)
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            encoding='cp949',  # Windows 한글 인코딩
            errors='ignore'  # 디코딩 에러 무시
        )

        # 표준 출력
        if result.stdout:
            print("=== 표준 출력 ===")
            print(result.stdout)

        # 표준 에러
        if result.stderr:
            print("=== 표준 에러 ===")
            print(result.stderr)

        # 반환 코드
        print(f"\n=== 반환 코드: {result.returncode} ===")

        return result.stdout, result.stderr, result.returncode

    except Exception as e:
        print(f"명령어 실행 중 오류 발생: {str(e)}")
        return None, str(e), -1


def validate_json_output(output):
    """
    출력이 유효한 JSON인지 검증하는 함수
    """
    try:
        json_data = json.loads(output)
        print("\n=== JSON 검증 성공 ===")
        print(json.dumps(json_data, indent=2, ensure_ascii=False))
        return True, json_data
    except json.JSONDecodeError as e:
        print(f"\n=== JSON 검증 실패 ===")
        print(f"오류: {str(e)}")
        return False, None


def main():
    # 작업 디렉터리 설정
    working_directory = r"E:\LLama\pythonProject\CVE_BOT\CVE\CVE-2006-5051\3\CVE-2024-6387_Check-main"

    # 실행할 명령어 (전체 프롬프트 포함)
    command = r'''gemini -m gemini-2.5-pro --all-files -p "SYSTEM:
    당신은 숙련된 침해사고 분석가 보조입니다. 아래 지침을 **정확히** 준수하십시오.

    CRITICAL INSTRUCTION:
    **절대로 파일을 수정하거나 변경하려고 시도하지 마십시오. 읽기와 분석만 수행하십시오.**
    **파일 쓰기, 수정, 교체 등의 작업은 일체 시도하지 마십시오.**
    **오직 제공된 파일들을 읽고 분석한 후 JSON 형식으로 결과만 출력하십시오.**

    CONTEXT:
    - gemini-cli의 `--all-files` 옵션으로 디렉터리 내 파일들(POC 코드, README 등, 그리고 ./CVE_info.txt)이 모델에 제공됩니다.
    - ./CVE_info.txt 파일에는 CVE 메타데이터(JSON 또는 텍스트)가 들어있으니 반드시 참고하여 분석에 반영하십시오.
    - **파일들을 읽기만 하고 절대 수정하지 마십시오.**

    INSTRUCTION (엄격):
    1) **반드시 단일 JSON 객체 한 개만** 출력하십시오. 추가 설명, 마크다운, 로그, 주석 등은 절대 출력하지 마십시오.
    2) 출력은 항상 **유효한 UTF-8 JSON**이어야 하며, 파싱 불가 시 실패로 간주합니다. 불확실한 값은 `null` 또는 빈 문자열(\"\" 또는 [])로 표기하십시오.
    3) 모델 호출 시 **temperature=0** 으로 결정적 결과를 유도하십시오.
    4) **파일 수정이나 쓰기 작업을 시도하지 마십시오. 오직 읽기와 분석만 수행하십시오.**

    TASK:
    제공된 파일들(POC 코드, README 등)과 `./CVE_info.txt`를 **읽고 분석하여** 아래 **정해진 스키마**로만 응답하십시오.

    ### affected_products 작성 지침 (신규):
    - **제조사(vendor)**: 제품을 개발/배포하는 조직 또는 개인 (예: \"Apache\", \"Microsoft\", \"D-Link\")
    - **제품명(product)**: 취약점이 발견된 구체적인 제품 또는 소프트웨어 이름 (예: \"Struts 2\", \"Windows Server\", \"DIR-615 Router\")
    - **취약 버전(vulnerable_versions)**: 취약점이 존재하는 버전 범위 (예: \"2.5.30 미만\", \"10.0.0 ~ 10.0.19041\", \"1.0.0 ~ 3.2.1\")
    - **패치 버전(patched_version)**: 취약점이 수정된 버전 (알려진 경우). 패치가 없으면 null
    - 여러 제품/버전이 영향받는 경우 배열로 모두 나열
    - ./CVE_info.txt의 CPE(Common Platform Enumeration) 정보를 우선 참고

    ### cve_summary 작성 지침 (상세화):
    - **취약점 유형**: 어떤 종류의 취약점인지 명확히 기술 (예: SQL Injection, Path Traversal, Remote Code Execution, Authentication Bypass 등)
    - **영향받는 시스템**: 제조사, 제품명, 취약한 버전 범위를 구체적으로 명시
    - **공격 메커니즘**: 취약점이 발생하는 기술적 원인 (예: 입력 검증 부재, 권한 확인 누락, 직렬화 취약점 등)
    - **공격 전제조건**: 네트워크 접근성, 인증 필요 여부, 특정 설정 요구사항 등
    - **영향 범위**: 기밀성/무결성/가용성 측면에서의 구체적 피해 (예: \"원격 공격자가 인증 없이 시스템 명령을 실행하여 완전한 시스템 장악 가능\")
    - ./CVE_info.txt의 CVSS 점수, CWE 분류 등도 활용하여 200-400자 분량으로 상세 작성

    ### attack_steps 작성 지침 (상세화):
    - POC 코드에서 실제로 전송되는 원시 패킷(HTTP start-line + headers + body)을 `packet_text`에 **그대로** 보존하여 넣으십시오 (CRLF `\r\n` 표기 권장).
    - 각 `attack_step`의 `stage_description`은 **최소 3-5문장**으로 다음을 포함:
      * **단계의 목적**: 이 단계가 전체 공격 체인에서 수행하는 역할
      * **기술적 행위**: 전송되는 HTTP 메서드, 엔드포인트, 주요 파라미터/헤더, 페이로드의 구조와 의미
      * **예상 동작**: 서버가 정상/취약한 경우 각각 어떻게 응답하는지
      * **보안 영향**: 이 단계가 성공하면 공격자가 얻는 이점 (예: \"세션 토큰 획득으로 인증 우회\", \"디렉터리 리스팅 노출로 민감 파일 경로 확인\")
      * 탐지 포인트: 이 행위를 탐지할 수 있는 시그니처 요소 (비정상 파라미터, 특정 문자열 패턴 등)

      예시:
      \"이 단계는 인증을 우회하여 관리자 세션을 획득하기 위한 초기 정찰 단계입니다. 공격자는 GET 요청을 /admin/config.php 엔드포인트로 전송하며, User-Agent 헤더에 '../'를 포함한 Path Traversal 페이로드를 삽입합니다. 취약한 서버는 입력 검증 없이 헤더 값을 파일 경로 생성에 사용하여 /etc/passwd 내용을 응답으로 반환합니다. 이를 통해 공격자는 시스템 사용자 목록을 확보하여 후속 Brute Force 공격의 표적을 식별할 수 있습니다. 탐지는 비정상적인 User-Agent 헤더 패턴과 민감 파일 접근 시도 로깅으로 가능합니다.\"

    ### expected_response 작성 지침 (신규):
    - 각 공격 단계에서 **취약점이 존재하고 공격이 성공했을 때** 서버가 반환하는 응답을 상세히 기술
    - 다음 요소를 포함:
      * **HTTP 응답 코드**: 200 OK, 500 Internal Server Error 등
      * **응답 헤더**: 특징적인 헤더 (Set-Cookie, Content-Type 등)
      * **응답 본문**: 실제 반환되는 데이터의 구조와 내용 (JSON, HTML, 에러 메시지, 파일 내용 등)
      * **성공 지표**: 공격 성공을 판단할 수 있는 특정 문자열, 패턴, 데이터 구조 (예: \"root:x:0:0\" 문자열 포함, 세션 토큰 값 존재, 명령 실행 결과 출력 등)
      * **실패 시 차이점**: 취약점이 없거나 공격이 실패했을 때의 응답과 어떻게 다른지

      예시:
      \"공격 성공 시 서버는 HTTP 200 OK를 반환하며, Content-Type: text/plain 헤더와 함께 /etc/passwd 파일의 전체 내용을 응답 본문에 포함합니다. 응답에는 'root:x:0:0:root:/root:/bin/bash'로 시작하는 사용자 계정 정보가 포함되며, 이는 Path Traversal 취약점이 성공적으로 악용되었음을 의미합니다. 정상적인 서버라면 403 Forbidden 또는 404 Not Found를 반환하거나, 헤더 값을 파일 경로로 해석하지 않고 빈 응답을 반환합니다.\"

    - POC 코드에서 응답 검증 로직(response.status_code 체크, 특정 문자열 검색 등)을 참고하여 작성
    - 가능하면 실제 응답 예시를 포함 (최소 100-200자)
    - 각 `attack_step`마다 대응용 Snort 규칙을 `snort_rule`에 포함하십시오. 불가능하면 빈 문자열(\"\") 허용.

    OUTPUT SCHEMA (정확히 준수):
    {
      \"cve_id\": string|null,              // CVE 식별자 (예: \"CVE-2024-1234\") 또는 null
      \"cve_summary\": string,              // 취약점 유형, 영향받는 시스템/버전, 공격 메커니즘, 전제조건, 영향 범위를 포함한 상세 설명 (200-400자)
      \"affected_products\": [              // 취약점이 영향을 미치는 제품 목록
        {
          \"vendor\": string,               // 제조사/개발사 (예: \"Apache\", \"Microsoft\")
          \"product\": string,              // 제품명 (예: \"Struts 2\", \"Windows Server\")
          \"vulnerable_versions\": string,  // 취약 버전 범위 (예: \"2.5.30 미만\", \"10.0.0 ~ 10.0.19041\")
          \"patched_version\": string|null  // 패치 버전 (예: \"2.5.30\") 또는 null
        }
      ],
      \"poc_analysis\": {
        \"attack_steps\": [
          {
            \"step\": integer,              // 1,2,3...
            \"packet_text\": string,        // 원시 HTTP/텍스트 요청 (CRLF \r\n 표기 권장)
            \"vuln_stage\": string,         // 단계명 (예: \"Reconnaissance\", \"Credential Harvesting\", \"Exploit Injection\", \"Persistence\")
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
    - **파일을 수정하지 마십시오. 오직 분석 결과만 JSON으로 출력하십시오.**
    - 오직 위 필드들만 포함. 추가 필드 금지.
    - `cve_id`는 ./CVE_info.txt에서 추출하거나, 파일명/내용에서 파악. 없으면 null.
    - `affected_products`는 최소 1개 이상 포함. ./CVE_info.txt의 CPE 정보 우선 참고.
    - `attack_steps`는 POC에서 실제로 전송되는 **각 요청 유형(논리적 패킷)** 별로 1개 항목씩 포함(중복 제거).
    - `packet_text`는 재현 가능하도록 start-line + headers + body 형식으로 보존. 원문 인코딩(hex 등)은 그대로 유지.
    - `stage_description`은 단순 키워드 나열이 아닌 **완전한 문장**으로 기술적 세부사항을 포함하여 작성.
    - `expected_response`는 POC 코드의 응답 검증 로직을 참고하여 **구체적인 응답 예시**를 포함하여 작성.
    - `cve_summary`는 ./CVE_info.txt의 메타데이터와 POC 분석 결과를 종합하여 취약점의 본질을 명확히 전달.
    - `snort_rule`은 가능한 한 정확한 Snort v2 형식으로 작성. SID가 필요하면 모델이 제안하되, 조직 규칙으로 재할당 가능.
    - 불확실한 값은 `null` 또는 빈 문자열/배열로 표기.
    - 출력이 유효한 JSON이 아니면 재시도 로직을 트리거하시오.
    - **다시 한번 강조: 파일 수정 없이 JSON 출력만 하십시오.**

    END."'''

    print("=== 명령어 실행 시작 ===")
    print(f"작업 디렉터리: {working_directory}")
    print(f"실행 명령어: gemini -m gemini-2.5-pro --all-files -p \"...\"\n")

    # 명령어 실행
    stdout, stderr, returncode = execute_command(command, working_directory)

    # JSON 검증 (stdout이 있을 경우)
    if stdout:
        validate_json_output(stdout)

    # 결과 저장 옵션
    save_option = input("\n결과를 파일로 저장하시겠습니까? (y/n): ")
    if save_option.lower() == 'y':
        filename = input("저장할 파일명을 입력하세요 (예: result.json): ")
        if not filename:
            filename = "result.json"

        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(stdout if stdout else stderr)
            print(f"결과가 {filename}에 저장되었습니다.")
        except Exception as e:
            print(f"파일 저장 실패: {str(e)}")


if __name__ == "__main__":
    main()