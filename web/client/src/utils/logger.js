/**
 * 프론트엔드 로그 유틸리티
 * 
 * 로그 레벨 설명:
 * - info (0): 기본 정보 (페이지 이동, API 호출 등)
 * - error (1): 에러 메시지 + 기본 정보
 * - debug (2): 모든 단계별 실행 내용 상세 출력 (디버깅용)
 * 
 * 설정 변경 방법:
 * 아래 LOG_LEVEL 상수를 변경하세요
 * 'info' | 'error' | 'debug'
 */

// ===== 여기서 로그 레벨을 변경하세요 =====
const LOG_LEVEL = 'debug';
// ========================================

const LOG_LEVELS = {
    info: 0,
    error: 1,
    debug: 2
};

const currentLevel = LOG_LEVELS[LOG_LEVEL] || 0;

/**
 * 로그 출력 함수
 * @param {string} level - 로그 레벨
 * @param {string} message - 메시지
 * @param {any} data - 추가 데이터
 */
function log(level, message, data = null) {
    const requiredLevel = LOG_LEVELS[level] || 0;
    
    // 현재 설정된 레벨보다 낮은 레벨은 출력하지 않음
    if (requiredLevel > currentLevel) {
        return;
    }
    
    const timestamp = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    const style = {
        info: 'color: #2196F3; font-weight: bold',
        error: 'color: #f44336; font-weight: bold',
        debug: 'color: #4CAF50; font-weight: bold'
    }[level];
    
    if (level === 'error') {
        console.error(`%c${prefix}`, style, message);
        if (data) console.error(data);
    } else {
        console.log(`%c${prefix}`, style, message);
        if (data) console.log(data);
    }
}

const logger = {
    // info: 기본 정보 (항상 출력)
    info: (message, data) => log('info', message, data),
    
    // error: 에러 정보 (info 이상일 때 출력)
    error: (message, data) => log('error', message, data),
    
    // debug: 상세 디버그 정보 (debug 레벨일 때만 출력)
    debug: (message, data) => log('debug', message, data),
    
    // 현재 로그 레벨 확인
    getLevel: () => LOG_LEVEL
};

export default logger;

