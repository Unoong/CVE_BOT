-- ================================================================================
-- 001: 데이터베이스 생성 (선택 사항 - 이미 있으면 스킵)
-- ================================================================================
-- 실행 전 config.json 또는 환경에 맞게 DB 이름을 변경하세요.
-- 마이그레이션 실행 스크립트는 config.database.database 값을 사용합니다.

CREATE DATABASE IF NOT EXISTS TOTORO
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 사용할 DB 선택 (실행 스크립트에서 연결 시 지정하면 생략 가능)
-- USE TOTORO;
