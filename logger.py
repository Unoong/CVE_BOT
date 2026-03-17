"""
로깅 시스템 모듈
"""
import logging
from logging.handlers import TimedRotatingFileHandler
import os
from datetime import datetime


def setup_logger():
    """로거 설정 및 반환"""
    # 프로젝트 루트 기준 logs 폴더 사용 (cwd 영향 제거)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    logs_dir = os.path.join(base_dir, 'logs')
    os.makedirs(logs_dir, exist_ok=True)

    # ✅ 고정 파일 + 자정 로테이션 (장기 실행 프로세스에서도 날짜 롤오버)
    log_filename = os.path.join(logs_dir, 'cve_bot.log')
    
    # 로거 설정
    logger = logging.getLogger('CVE_BOT')
    logger.setLevel(logging.DEBUG)
    # 다른 모듈에서 basicConfig/FileHandler를 먼저 설정해둔 경우가 있어
    # 장기 실행 프로세스에서 날짜 롤오버가 되도록 여기서 로거 핸들러를 강제로 재구성합니다.
    logger.handlers.clear()
    
    # 파일 핸들러 (매일 자정 로테이션)
    file_handler = TimedRotatingFileHandler(
        log_filename,
        when='midnight',
        interval=1,
        backupCount=14,
        encoding='utf-8',
        utc=False
    )
    file_handler.setLevel(logging.DEBUG)
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # 포맷 설정
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.propagate = False
    
    return logger


def log_print(message, level='info'):
    """로그 출력 헬퍼 함수"""
    logger = logging.getLogger('CVE_BOT')
    if level == 'debug':
        logger.debug(message)
    elif level == 'info':
        logger.info(message)
    elif level == 'warning':
        logger.warning(message)
    elif level == 'error':
        logger.error(message)
    elif level == 'critical':
        logger.critical(message)
    else:
        logger.info(message)

