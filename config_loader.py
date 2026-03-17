"""
환경별 설정 파일 로더
테스트/운영 환경 분리를 위한 설정 관리 모듈
"""
import json
import os
from pathlib import Path
from typing import Dict, Optional


class ConfigLoader:
    """환경별 설정 파일 로더"""
    
    # 환경 변수명
    ENV_VAR = 'CVE_BOT_ENV'
    
    # 지원하는 환경
    ENV_TEST = 'TEST'
    ENV_PROD = 'PROD'
    ENV_DEV = 'DEV'  # 개발 환경 (기본값)
    
    # 기본 환경 (환경 변수가 없을 때)
    DEFAULT_ENV = ENV_DEV
    
    @classmethod
    def get_current_env(cls) -> str:
        """
        현재 환경 반환
        
        Returns:
            str: 현재 환경 (TEST, PROD, DEV)
        """
        env = os.environ.get(cls.ENV_VAR, cls.DEFAULT_ENV).upper()
        
        # 유효한 환경인지 확인
        if env not in [cls.ENV_TEST, cls.ENV_PROD, cls.ENV_DEV]:
            print(f"[경고] 잘못된 환경 변수 값: {env}, 기본값({cls.DEFAULT_ENV}) 사용")
            env = cls.DEFAULT_ENV
        
        return env
    
    @classmethod
    def get_config_file_path(cls, env: Optional[str] = None) -> Path:
        """
        환경별 설정 파일 경로 반환
        
        Args:
            env: 환경 (None이면 현재 환경 사용)
            
        Returns:
            Path: 설정 파일 경로
        """
        if env is None:
            env = cls.get_current_env()
        
        # 프로젝트 루트 디렉토리
        project_root = Path(__file__).resolve().parent
        
        # 환경별 설정 파일명
        if env == cls.ENV_TEST:
            config_file = 'config.test.json'
        elif env == cls.ENV_PROD:
            config_file = 'config.prod.json'
        else:  # DEV
            config_file = 'config.json'
        
        return project_root / config_file
    
    @classmethod
    def load_config(cls, env: Optional[str] = None, config_path: Optional[str] = None) -> Optional[Dict]:
        """
        환경별 설정 파일 로드
        
        Args:
            env: 환경 (None이면 현재 환경 사용)
            config_path: 직접 설정 파일 경로 지정 (우선순위 최상위)
            
        Returns:
            dict: 설정 딕셔너리 또는 None
        """
        # 직접 경로가 지정된 경우
        if config_path:
            config_file = Path(config_path)
            if not config_file.is_absolute():
                config_file = Path(__file__).resolve().parent / config_file
        else:
            config_file = cls.get_config_file_path(env)
        
        current_env = cls.get_current_env() if env is None else env
        
        print(f"[설정] 환경: {current_env}")
        print(f"[설정] 설정 파일: {config_file}")
        
        if not config_file.exists():
            print(f"[오류] 설정 파일을 찾을 수 없습니다: {config_file}")
            print(f"[안내] {config_file.name} 파일을 생성하거나 환경 변수 {cls.ENV_VAR}를 확인하세요.")
            return None
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 환경 정보를 설정에 추가
            config['_env'] = current_env
            config['_config_file'] = str(config_file)
            
            print(f"[설정] 설정 파일 로드 성공: {config_file}")
            return config
            
        except json.JSONDecodeError as e:
            print(f"[오류] JSON 파싱 오류: {e}")
            print(f"[오류] 파일: {config_file}")
            return None
        except Exception as e:
            print(f"[오류] 설정 파일 로드 실패: {e}")
            print(f"[오류] 파일: {config_file}")
            return None
    
    @classmethod
    def create_config_template(cls, env: str, template_path: Optional[Path] = None) -> bool:
        """
        환경별 설정 파일 템플릿 생성
        
        Args:
            env: 환경 (TEST, PROD)
            template_path: 참조할 템플릿 파일 경로 (기본값: config.json)
            
        Returns:
            bool: 성공 여부
        """
        if env not in [cls.ENV_TEST, cls.ENV_PROD]:
            print(f"[오류] 지원하지 않는 환경: {env}")
            return False
        
        if template_path is None:
            template_path = Path(__file__).resolve().parent / 'config.json'
        
        if not template_path.exists():
            print(f"[오류] 템플릿 파일을 찾을 수 없습니다: {template_path}")
            return False
        
        try:
            # 템플릿 파일 읽기
            with open(template_path, 'r', encoding='utf-8') as f:
                template = json.load(f)
            
            # 환경별 설정 파일 경로
            target_file = cls.get_config_file_path(env)
            
            # 환경별로 다른 설정 적용
            if env == cls.ENV_TEST:
                # 테스트 환경 설정
                template['database']['database'] = template['database'].get('database', 'TOTORO') + '_TEST'
                template['_comment_env'] = "테스트 환경 설정 파일"
            elif env == cls.ENV_PROD:
                # 운영 환경 설정
                template['_comment_env'] = "운영 환경 설정 파일"
                template['_comment_warning'] = "⚠️ 운영 환경 설정 - 신중하게 수정하세요!"
            
            # 파일 저장
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(template, f, indent=4, ensure_ascii=False)
            
            print(f"[성공] {env} 환경 설정 파일 생성: {target_file}")
            return True
            
        except Exception as e:
            print(f"[오류] 설정 파일 템플릿 생성 실패: {e}")
            return False


# 편의 함수
def load_config(config_path: Optional[str] = None) -> Optional[Dict]:
    """
    현재 환경의 설정 파일 로드 (하위 호환성)
    
    Args:
        config_path: 직접 설정 파일 경로 지정
        
    Returns:
        dict: 설정 딕셔너리 또는 None
    """
    return ConfigLoader.load_config(config_path=config_path)


if __name__ == '__main__':
    """설정 파일 템플릿 생성 스크립트"""
    import sys
    
    if len(sys.argv) > 1:
        env = sys.argv[1].upper()
        if env in [ConfigLoader.ENV_TEST, ConfigLoader.ENV_PROD]:
            ConfigLoader.create_config_template(env)
        else:
            print(f"사용법: python config_loader.py [TEST|PROD]")
    else:
        # 모든 환경 템플릿 생성
        print("=" * 60)
        print("환경별 설정 파일 템플릿 생성")
        print("=" * 60)
        
        for env in [ConfigLoader.ENV_TEST, ConfigLoader.ENV_PROD]:
            print(f"\n[{env} 환경]")
            ConfigLoader.create_config_template(env)
        
        print("\n" + "=" * 60)
        print("완료!")
        print("=" * 60)
        print("\n다음 단계:")
        print("1. config.test.json과 config.prod.json 파일을 열어서")
        print("2. 각 환경에 맞게 설정을 수정하세요.")
        print("3. 환경 변수 CVE_BOT_ENV를 설정하여 환경을 전환하세요.")
        print("   - Windows: set CVE_BOT_ENV=TEST")
        print("   - Linux/Mac: export CVE_BOT_ENV=TEST")
