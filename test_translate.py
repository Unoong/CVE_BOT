"""
Google 번역 테스트
"""
from translator import translate_to_korean

# 테스트 텍스트
test_text = """
This is a proof of concept for CVE-2025-12345.
It demonstrates a critical vulnerability in the authentication system.
Please use this for educational purposes only.
"""

print("원본 텍스트:")
print(test_text)
print("\n번역 중...\n")

translated = translate_to_korean(test_text)

print("번역된 텍스트:")
print(translated)

