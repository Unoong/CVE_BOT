/**
 * SSL 인증서 적용 스크립트
 * Let's Encrypt 인증서를 서버에 적용합니다.
 */

const fs = require('fs');
const path = require('path');

// Let's Encrypt 인증서 경로 (Windows Certbot 기본 경로)
const CERT_PATH = 'C:\\Certbot\\live\\www.ai-platform.store';

// 목표 경로 (웹 서버 디렉토리)
const TARGET_DIR = __dirname;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔒 SSL 인증서 적용 스크립트');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log();

try {
  // 1. Let's Encrypt 인증서 확인
  const privkeyPath = path.join(CERT_PATH, 'privkey.pem');
  const fullchainPath = path.join(CERT_PATH, 'fullchain.pem');

  console.log('📂 인증서 확인 중...');
  console.log(`   개인키: ${privkeyPath}`);
  console.log(`   인증서: ${fullchainPath}`);
  console.log();

  if (!fs.existsSync(privkeyPath)) {
    throw new Error(`개인키를 찾을 수 없습니다: ${privkeyPath}`);
  }

  if (!fs.existsSync(fullchainPath)) {
    throw new Error(`인증서를 찾을 수 없습니다: ${fullchainPath}`);
  }

  console.log('✅ Let\'s Encrypt 인증서 파일 확인 완료');
  console.log();

  // 2. 기존 파일 백업
  const serverKeyPath = path.join(TARGET_DIR, 'server.key');
  const serverCertPath = path.join(TARGET_DIR, 'server.cert');

  console.log('💾 기존 파일 백업 중...');

  if (fs.existsSync(serverKeyPath)) {
    const backupKeyPath = path.join(TARGET_DIR, `server.key.backup.${Date.now()}`);
    fs.copyFileSync(serverKeyPath, backupKeyPath);
    console.log(`   ✓ server.key → ${path.basename(backupKeyPath)}`);
  }

  if (fs.existsSync(serverCertPath)) {
    const backupCertPath = path.join(TARGET_DIR, `server.cert.backup.${Date.now()}`);
    fs.copyFileSync(serverCertPath, backupCertPath);
    console.log(`   ✓ server.cert → ${path.basename(backupCertPath)}`);
  }

  console.log();

  // 3. Let's Encrypt 인증서 복사
  console.log('📋 인증서 복사 중...');

  fs.copyFileSync(privkeyPath, serverKeyPath);
  console.log(`   ✓ privkey.pem → server.key`);

  fs.copyFileSync(fullchainPath, serverCertPath);
  console.log(`   ✓ fullchain.pem → server.cert`);

  console.log();

  // 4. 완료
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SSL 인증서 적용 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log('🚀 다음 단계:');
  console.log('   1. 웹 서버 재시작: node server.js');
  console.log('   2. HTTPS 접속 테스트: https://www.ai-platform.store:32578');
  console.log();
  console.log('🔄 자동 갱신 설정:');
  console.log('   - Windows 작업 스케줄러에 등록');
  console.log('   - 명령어: certbot renew --quiet');
  console.log('   - 실행 주기: 매월 1일');
  console.log();

} catch (error) {
  console.error('❌ 오류 발생:', error.message);
  console.error();
  console.error('💡 해결 방법:');
  console.error('   1. Certbot으로 인증서를 먼저 발급받으세요');
  console.error('   2. 인증서 경로를 확인하세요:', CERT_PATH);
  console.error('   3. 관리자 권한으로 실행하세요');
  process.exit(1);
}

