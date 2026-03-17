"""
Google 번역 모듈 (무료) - deep-translator 사용
"""
from deep_translator import GoogleTranslator
from logger import log_print


def translate_to_korean(text):
    """
    Google Translate를 사용하여 텍스트를 한국어로 번역 (무료)
    
    Args:
        text: 번역할 텍스트
    
    Returns:
        str: 번역된 텍스트 또는 원본 텍스트
    """
    # 텍스트가 비어있거나 None인 경우
    if not text or len(text.strip()) == 0:
        return ""
    
    # 한국어는 번역 안 함
    if has_korean(text):
        return text
    
    # 텍스트가 너무 긴 경우 (5000자 제한)
    if len(text) > 5000:
        log_print("[번역] 텍스트가 너무 길어 일부만 번역합니다.", 'warning')
        text = text[:5000]
    
    try:
        translator = GoogleTranslator(source='auto', target='ko')
        result = translator.translate(text)
        log_print("[번역] Google 번역 성공", 'debug')
        return result
    except Exception as e:
        log_print(f"[번역 오류] {e} - 원본 텍스트 반환", 'warning')
        return text


def has_korean(text):
    """
    텍스트에 한글이 포함되어 있는지 확인
    
    Args:
        text: 확인할 텍스트
    
    Returns:
        bool: 한글 포함 여부
    """
    for char in text:
        if '가' <= char <= '힣':
            return True
    return False


def translate_with_fallback(text):
    """
    번역 실패 시 원본 텍스트 반환하는 안전한 번역 함수
    
    Args:
        text: 번역할 텍스트
    
    Returns:
        str: 번역된 텍스트 또는 원본
    """
    return translate_to_korean(text)

