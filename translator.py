"""
Google 번역 모듈 (무료) - deep-translator 사용
"""
import re
from deep_translator import GoogleTranslator
from logger import log_print

# Google Translate 장애 시 HTML/에러 페이지가 번역 결과로 들어오는 패턴
_TRANSLATE_ERROR_PATTERNS = (
    re.compile(r"Error\s*50[0-9]\s*\(Server Error\)", re.I),
    re.compile(r"That[\u2019']s an error", re.I),
    re.compile(r"Please try again later", re.I),
    re.compile(r"That[\u2019']s all we know", re.I),
    re.compile(r"<!DOCTYPE\s+html", re.I),
    re.compile(r"<html[\s>]", re.I),
)


def is_translate_error_text(text):
    """번역 API/페이지 장애 문구인지 판별"""
    if not text or not isinstance(text, str):
        return False
    sample = text.strip()[:800]
    if not sample:
        return False
    return any(p.search(sample) for p in _TRANSLATE_ERROR_PATTERNS)


def translate_to_korean(text):
    """
    Google Translate를 사용하여 텍스트를 한국어로 번역 (무료)

    번역 실패·에러 페이지 응답이면 원문(영문)을 그대로 반환한다.
    """
    if not text or len(text.strip()) == 0:
        return ""

    if has_korean(text):
        return text

    if is_translate_error_text(text):
        log_print("[번역] 입력이 이미 에러 문구라 번역 생략", "warning")
        return text

    original = text
    if len(text) > 5000:
        log_print("[번역] 텍스트가 너무 길어 일부만 번역합니다.", "warning")
        text = text[:5000]

    try:
        translator = GoogleTranslator(source="auto", target="ko")
        result = translator.translate(text)
        if not result or not str(result).strip():
            log_print("[번역] 빈 결과 → 원문 유지", "warning")
            return original
        if is_translate_error_text(result):
            log_print("[번역] Google 에러 페이지 응답 감지 → 원문 유지", "warning")
            return original
        log_print("[번역] Google 번역 성공", "debug")
        return result
    except Exception as e:
        log_print(f"[번역 오류] {e} - 원본 텍스트 반환", "warning")
        return original


def has_korean(text):
    """텍스트에 한글이 포함되어 있는지 확인"""
    for char in text:
        if "가" <= char <= "힣":
            return True
    return False


def translate_with_fallback(text):
    """번역 실패 시 원본 텍스트 반환하는 안전한 번역 함수"""
    return translate_to_korean(text)
