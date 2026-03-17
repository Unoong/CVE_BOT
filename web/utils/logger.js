const fs = require('fs');
const path = require('path');

/**
 * 로그 레벨 설정 파일 로드
 * 
 * 로그 레벨 설명:
 * - info (0): 서버 시작/종료, API 요청 등 기본 정보만 출력
 * - error (1): 에러 메시지 + 기본 정보 출력
 * - debug (2): 모든 단계별 실행 내용 상세 출력 (디버깅용)
 * 
 * 설정 변경 방법:
 * logger.config.json 파일의 "logLevel" 값을 변경하세요
 * "info" | "error" | "debug"
 */

let config = { logLevel: 'info', levels: { info: 0, error: 1, debug: 2 } };

try {
    const configPath = path.join(__dirname, '..', 'logger.config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
} catch (err) {
    console.warn('[Logger] 설정 파일을 읽을 수 없습니다. 기본값(info) 사용');
}

const currentLevel = config.levels[config.logLevel] || 0;

/**
 * 로그 출력 함수
 * @param {string} level - 로그 레벨 ('info', 'error', 'debug')
 * @param {string} message - 출력할 메시지
 * @param {object} data - 추가 데이터 (선택)
 */
function log(level, message, data = null) {
    const requiredLevel = config.levels[level] || 0;
    
    // 현재 설정된 레벨보다 낮은 레벨은 출력하지 않음
    if (requiredLevel > currentLevel) {
        return;
    }
    
    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error') {
        console.error(prefix, message);
        if (data) console.error(data);
    } else {
        console.log(prefix, message);
        if (data) console.log(data);
    }
}

module.exports = {
    // info: 기본 정보 (항상 출력)
    info: (message, data) => log('info', message, data),
    
    // error: 에러 정보 (info 이상일 때 출력)
    error: (message, data) => log('error', message, data),
    
    // debug: 상세 디버그 정보 (debug 레벨일 때만 출력)
    debug: (message, data) => log('debug', message, data),
    
    // 현재 로그 레벨 확인
    getLevel: () => config.logLevel,
    
    // 로그 레벨 변경 (런타임)
    setLevel: (level) => {
        if (config.levels[level] !== undefined) {
            config.logLevel = level;
            currentLevel = config.levels[level];
        }
    }
};

