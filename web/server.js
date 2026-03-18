const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fssync = require('fs');
const session = require('express-session');
const nodemailer = require('nodemailer');
const logger = require('./utils/logger');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const csvParser = require('csv-parser');
const iconv = require('iconv-lite');

// 환경변수(.env) 로드 (없어도 무시됨)
try {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
    // dotenv 미사용 환경에서도 정상 동작
}

const app = express();

// SSL 인증서 로드
let httpsOptions = null;
let isLetsEncrypt = false;
try {
    const certPath = path.join(__dirname, 'server.cert');
    const certContent = fssync.readFileSync(certPath, 'utf8');
    
    // Let's Encrypt 인증서 확인 (base64 인코딩된 내용에서도 확인)
    // "Let's Encrypt" 또는 "MZXQncyBFbmNyeXB0" (base64 인코딩된 "Let's Encrypt")
    if (certContent.includes("Let's Encrypt") || 
        certContent.includes("Let\\'s Encrypt") ||
        certContent.includes("MZXQncyBFbmNyeXB0") ||
        certContent.includes("lencr.org")) {
        isLetsEncrypt = true;
    }
    
    httpsOptions = {
        key: fssync.readFileSync(path.join(__dirname, 'server.key')),
        cert: fssync.readFileSync(certPath)
    };
    
    if (isLetsEncrypt) {
        console.log('✅ Let\'s Encrypt SSL 인증서 로드 완료');
    } else {
        console.log('✅ SSL 인증서 로드 완료 (자체 서명)');
    }
} catch (err) {
    console.log('⚠️  SSL 인증서 없음 - HTTP만 사용');
}

// HTTP 및 HTTPS 서버 생성
const httpServer = http.createServer(app);
const httpsServer = httpsOptions ? https.createServer(httpsOptions, app) : null;

// Socket.IO는 HTTPS 우선, 없으면 HTTP
const io = new Server(httpsServer || httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const HTTP_PORT = 32577;
const HTTPS_PORT = 32578;
const JWT_SECRET = 'cve-bot-secret-key-2025';
const SITE_NAME = process.env.SITE_NAME || 'AI보안위협관리시스템';

// 이메일 전송 설정
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'gpt8354@gmail.com',
        pass: 'qjkeqjvurvrxyffn'  // 앱 비밀번호 (공백 제거)
    }
});

// 인증 코드 저장소 (실제로는 Redis 사용 권장)
const verificationCodes = new Map();
const passwordResetCodes = {}; // 비밀번호 재설정 인증 코드

// ⚠️ 보안: 로그인 로그 파일(PW 포함)은 절대 저장하지 않습니다.
// 필요 시, 서버 콘솔/PM2 로그로만 최소 정보(아이디/성공여부/IP)만 기록하세요.

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB 연결 풀 (최적화)
const pool = mysql.createPool({
    host: 'localhost',
    port: 7002,
    user: 'root',
    password: '!db8354',
    database: 'TOTORO',
    charset: 'utf8mb4',  // 한글 등 멀티바이트 문자 정상 표시
    timezone: 'Z',  // MySQL TIMESTAMP는 UTC 저장 → UTC로 해석 (로컬 해석 시 9시간 밀림)
    connectionLimit: 100,  // 최대 100개 동시 연결 (증가)
    waitForConnections: true,  // 연결 대기
    queueLimit: 0,  // 대기열 무제한
    connectTimeout: 10000,  // 연결 타임아웃 10초
    acquireTimeout: 10000,  // 획득 타임아웃 10초
    idleTimeout: 60000,  // 유휴 연결 60초 후 해제
    enableKeepAlive: true,  // Keep-Alive 활성화
    keepAliveInitialDelay: 0  // Keep-Alive 즉시 시작
});

/** collect_time 등 KST로 저장된 DATETIME을 클라이언트용 문자열로 변환
 *  timezone:'Z'로 인해 mysql2가 KST 값을 UTC로 잘못 해석 → UTC 컴포넌트가 실제 KST 값
 */
function toKstDateTimeString(val) {
    if (val == null) return null;
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return null;
    const pad = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// 파일 업로드 설정 (보안 강화)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // 원본 파일명에서 확장자 추출
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // 안전한 파일명 생성 (특수문자 제거)
        const safeName = file.originalname.replace(/[^a-zA-Z0-9가-힣.]/g, '_');
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

// 허용된 파일 타입
const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed',
    'text/plain',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
];

// 허용된 확장자
const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.zip', '.rar', '.txt',
    '.doc', '.docx', '.xls', '.xlsx'
];

// 차단된 확장자 (실행 가능한 파일)
const blockedExtensions = [
    '.exe', '.sh', '.bat', '.cmd', '.com', '.pif', '.scr',
    '.js', '.jsx', '.ts', '.tsx', '.mjs',
    '.php', '.asp', '.aspx', '.jsp', '.jspx',
    '.py', '.rb', '.pl', '.cgi',
    '.html', '.htm', '.svg', '.xml',
    '.jar', '.war', '.ear',
    '.dll', '.so', '.dylib',
    '.vbs', '.vbe', '.wsf', '.wsh',
    '.ps1', '.psm1',
    '.app', '.deb', '.rpm'
];

// 파일 필터 (보안 강화)
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const originalName = file.originalname.toLowerCase();
    
    logger.info(`[파일 업로드 검증] 파일명: ${file.originalname}, 확장자: ${ext}, MIME: ${file.mimetype}`);
    
    // 🔒 1단계: 차단 리스트 확인 (실행 파일)
    if (blockedExtensions.includes(ext)) {
        logger.error(`[파일 업로드 차단] 위험한 파일 형식: ${ext}`);
        return cb(new Error(`보안상 위험한 파일 형식입니다: ${ext}`), false);
    }
    
    // 🔒 2단계: 이중 확장자 검증 (.php.jpg 등)
    const allExtensions = originalName.match(/\.[a-z0-9]+/gi);
    if (allExtensions && allExtensions.length > 1) {
        for (const e of allExtensions) {
            if (blockedExtensions.includes(e.toLowerCase())) {
                logger.error(`[파일 업로드 차단] 이중 확장자 위험: ${originalName}`);
                return cb(new Error('의심스러운 파일명입니다. 파일명을 변경해주세요.'), false);
            }
        }
    }
    
    // 🔒 3단계: 허용 리스트 확인
    if (!allowedExtensions.includes(ext)) {
        logger.error(`[파일 업로드 차단] 허용되지 않은 형식: ${ext}`);
        return cb(new Error(`허용되지 않은 파일 형식입니다. 허용 형식: ${allowedExtensions.join(', ')}`), false);
    }
    
    // 🔒 4단계: MIME 타입 검증
    if (!allowedMimeTypes.includes(file.mimetype)) {
        logger.error(`[파일 업로드 차단] 허용되지 않은 MIME 타입: ${file.mimetype}`);
        return cb(new Error('허용되지 않은 파일 타입입니다'), false);
    }
    
    // 🔒 5단계: Null byte 공격 방어
    if (originalName.includes('\0') || originalName.includes('%00')) {
        logger.error(`[파일 업로드 차단] Null byte 공격 시도`);
        return cb(new Error('잘못된 파일명입니다'), false);
    }
    
    logger.info(`[파일 업로드 허용] ${file.originalname}`);
    cb(null, true);
};

const upload = multer({ 
    storage, 
    limits: { 
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter
});

// XSS 방어: HTML sanitize 함수
function sanitizeHtml(html) {
    if (!html) return '';
    
    // 위험한 태그 제거
    const dangerousTags = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>|<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>|<embed[^>]*>/gi;
    html = html.replace(dangerousTags, '');
    
    // 위험한 이벤트 핸들러 제거
    const dangerousEvents = /on\w+\s*=\s*["'][^"']*["']|on\w+\s*=\s*[^\s>]*/gi;
    html = html.replace(dangerousEvents, '');
    
    // javascript: 프로토콜 제거
    html = html.replace(/javascript:/gi, '');
    
    // data: URI 제거 (base64 이미지 제외)
    html = html.replace(/data:(?!image\/(png|jpg|jpeg|gif|webp))[^,]*,/gi, '');
    
    return html;
}

// 입력값 검증 함수
function validateInput(input, minLength = 1, maxLength = 10000) {
    if (!input || typeof input !== 'string') {
        return { valid: false, error: '입력값이 유효하지 않습니다' };
    }
    
    if (input.length < minLength) {
        return { valid: false, error: `최소 ${minLength}자 이상 입력해주세요` };
    }
    
    if (input.length > maxLength) {
        return { valid: false, error: `최대 ${maxLength}자까지 입력 가능합니다` };
    }
    
    return { valid: true };
}

// JWT 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: '인증 토큰이 필요합니다' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
        req.user = user;
        next();
    });
};

// 권한 체크 미들웨어
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: '권한이 없습니다' });
        }
        next();
    };
};

// (중복 정의 제거) 위의 logLogin()을 사용합니다.

// ==================== 인증 API ====================

// 이메일 인증 코드 발송
app.post('/api/auth/send-verification', async (req, res) => {
    logger.info('========== 이메일 인증 코드 발송 시작 ==========');
    try {
        const { email } = req.body;
        logger.debug('[1] 요청 이메일:', email);
        
        // 이메일 중복 확인
        logger.debug('[2] 이메일 중복 확인 중...');
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        logger.debug('[2] 기존 사용자 수:', existing.length);
        if (existing.length > 0) {
            logger.error('[2] ❌ 이미 등록된 이메일');
            return res.status(400).json({ error: '이미 등록된 이메일입니다' });
        }
        
        // 6자리 랜덤 인증 코드 생성
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        logger.debug('[3] 생성된 인증 코드:', code);
        
        // 인증 코드 저장 (3분 유효)
        const expiresAt = Date.now() + 3 * 60 * 1000;
        verificationCodes.set(email, {
            code,
            expires: expiresAt
        });
        logger.debug('[4] 인증 코드 저장 완료 (유효시간: 3분)');
        logger.debug('[4] 만료 시각:', new Date(expiresAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
        
        // 이메일 발송
        logger.debug('[5] 이메일 발송 시작...');
        logger.debug('[5] 발신: gpt8354@gmail.com');
        logger.debug('[5] 수신:', email);
        
        await emailTransporter.sendMail({
            from: 'gpt8354@gmail.com',
            to: email,
            subject: '[CVE Bot] 이메일 인증 코드',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h2 style="color: #1976d2; text-align: center;">CVE Bot 이메일 인증</h2>
                        <p style="font-size: 16px; color: #333; margin: 20px 0;">안녕하세요,</p>
                        <p style="font-size: 16px; color: #333;">회원가입을 위한 인증 코드입니다:</p>
                        <div style="background-color: #e3f2fd; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                            <h1 style="color: #1976d2; font-size: 36px; margin: 0; letter-spacing: 5px;">${code}</h1>
                        </div>
                        <p style="font-size: 14px; color: #666;">이 코드는 3분간 유효합니다.</p>
                        <p style="font-size: 14px; color: #666;">본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
                    </div>
                </div>
            `
        });
        
        console.log('[6] ✅ 이메일 발송 완료');
        console.log('[7] 현재 저장된 인증 코드 목록:', Array.from(verificationCodes.keys()));
        console.log('========================================\n');
        
        res.json({ message: '인증 코드가 발송되었습니다' });
    } catch (err) {
        console.error('\n❌ [에러 발생]');
        console.error('에러 메시지:', err.message);
        console.error('에러 스택:', err.stack);
        console.error('========================================\n');
        res.status(500).json({ error: '이메일 발송에 실패했습니다', details: err.message });
    }
});

// 인증 코드 확인
app.post('/api/auth/verify-code', async (req, res) => {
    console.log('\n========== 인증 코드 확인 시작 ==========');
    try {
        const { email, code } = req.body;
        console.log('[1] 확인 요청 - 이메일:', email, '/ 코드:', code);
        
        const stored = verificationCodes.get(email);
        console.log('[2] 저장된 데이터:', stored);
        
        if (!stored) {
            console.log('[2] ❌ 인증 코드 없음');
            console.log('[2] 현재 저장된 이메일 목록:', Array.from(verificationCodes.keys()));
            return res.status(400).json({ error: '인증 코드가 존재하지 않습니다' });
        }
        
        const now = Date.now();
        const timeLeft = Math.floor((stored.expires - now) / 1000);
        console.log('[3] 현재 시각:', new Date(now).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
        console.log('[3] 만료 시각:', new Date(stored.expires).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
        console.log('[3] 남은 시간:', timeLeft, '초');
        
        if (now > stored.expires) {
            console.log('[3] ❌ 인증 코드 만료');
            verificationCodes.delete(email);
            return res.status(400).json({ error: '인증 코드가 만료되었습니다' });
        }
        
        console.log('[4] 코드 비교 - 입력:', code, '/ 저장:', stored.code);
        if (stored.code !== code) {
            console.log('[4] ❌ 인증 코드 불일치');
            return res.status(400).json({ error: '인증 코드가 일치하지 않습니다' });
        }
        
        console.log('[5] ✅ 인증 성공!');
        console.log('========================================\n');
        res.json({ message: '인증이 완료되었습니다' });
    } catch (err) {
        console.error('\n❌ [에러 발생]');
        console.error('에러 메시지:', err.message);
        console.error('에러 스택:', err.stack);
        console.error('========================================\n');
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 회원가입
app.post('/api/auth/register', async (req, res) => {
    console.log('\n========== 회원가입 시작 ==========');
    try {
        const { username, password, name, email, phone, code, nickname } = req.body;
        console.log('[1] 회원가입 정보:');
        console.log('    - 아이디:', username);
        console.log('    - 이름:', name);
        console.log('    - 닉네임:', nickname);
        console.log('    - 이메일:', email);
        console.log('    - 전화번호:', phone);
        console.log('    - 인증코드:', code);
        
        // 인증 코드 확인
        console.log('[2] 인증 코드 확인 중...');
        const stored = verificationCodes.get(email);
        console.log('[2] 저장된 인증 데이터:', stored);
        
        if (!stored || stored.code !== code) {
            console.log('[2] ❌ 인증 코드 불일치 또는 없음');
            return res.status(400).json({ error: '이메일 인증이 필요합니다' });
        }
        
        if (Date.now() > stored.expires) {
            console.log('[2] ❌ 인증 코드 만료');
            verificationCodes.delete(email);
            return res.status(400).json({ error: '인증 코드가 만료되었습니다' });
        }
        console.log('[2] ✅ 인증 코드 확인 완료');
        
        // 중복 확인
        console.log('[3] 사용자ID 중복 확인 중...');
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        console.log('[3] 기존 사용자 수:', existing.length);
        if (existing.length > 0) {
            console.log('[3] ❌ 이미 존재하는 사용자ID');
            return res.status(400).json({ error: '이미 존재하는 사용자ID입니다' });
        }
        console.log('[3] ✅ 사용자ID 사용 가능');

        // 비밀번호 해시
        console.log('[4] 비밀번호 암호화 중...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('[4] ✅ 비밀번호 암호화 완료');

        // 기본 권한 설정 읽기
        console.log('[5] 기본 권한 설정 확인 중...');
        const configPath = path.join(__dirname, '..', 'config.json');
        let defaultRole = 'user';
        try {
            const configData = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configData);
            defaultRole = config.user?.default_role || 'user';
            console.log('[5] 기본 권한:', defaultRole);
        } catch (err) {
            console.log('[5] ⚠️ 설정 파일 읽기 실패, 기본값(user) 사용:', err.message);
        }

        // 사용자 생성
        console.log('[6] 데이터베이스에 사용자 생성 중...');
        const [result] = await pool.query(
            'INSERT INTO users (username, password, name, email, phone, nickname, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, name, email, phone, nickname || username, defaultRole]
        );
        console.log('[6] ✅ 사용자 생성 완료 (ID:', result.insertId, ', 권한:', defaultRole, ')');
        
        // 인증 코드 삭제
        console.log('[7] 인증 코드 삭제 중...');
        verificationCodes.delete(email);
        console.log('[7] ✅ 인증 코드 삭제 완료');
        console.log('[8] 남은 인증 코드 목록:', Array.from(verificationCodes.keys()));
        
        console.log('[9] ✅ 회원가입 완료!');
        console.log('========================================\n');
        res.json({ message: '회원가입이 완료되었습니다' });
    } catch (err) {
        console.error('\n❌ [에러 발생]');
        console.error('에러 메시지:', err.message);
        console.error('에러 스택:', err.stack);
        console.error('========================================\n');
        res.status(500).json({ error: '서버 오류가 발생했습니다', details: err.message });
    }
});

// 현재 사용자 정보 확인 (JWT 토큰 검증)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        logger.debug('[인증 확인] 사용자 ID:', req.user.id);
        const [users] = await pool.query('SELECT id, username, name, nickname, email, phone, role FROM users WHERE id = ?', [req.user.id]);
        
        if (users.length === 0) {
            logger.error('[인증 확인] 사용자를 찾을 수 없음');
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }
        
        const user = users[0];
        user.nickname = user.nickname || user.username;
        
        logger.debug('[인증 확인] 사용자 정보 반환');
        res.json({ user });
    } catch (err) {
        logger.error('[인증 확인 에러]', err.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 로그인
app.post('/api/auth/login', async (req, res) => {
    logger.info('========== 로그인 시도 ==========');
    try {
        const { username, password } = req.body;
        logger.debug('[1] 로그인 요청 - 아이디:', username);

        logger.debug('[2] DB에서 사용자 조회 중...');
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            logger.error('[3] 사용자를 찾을 수 없음');
            logger.warn(`[로그인 실패] 존재하지 않는 사용자: ${username} (ip=${req.ip})`);
            return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
        }

        logger.debug('[3] 사용자 발견, 비밀번호 확인 중...');
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            logger.error('[4] 비밀번호 불일치');
            logger.warn(`[로그인 실패] 비밀번호 불일치: ${username} (ip=${req.ip})`);
            return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
        }

        logger.debug('[4] 비밀번호 확인 완료');
        logger.info(`[로그인 성공] ${username} (ip=${req.ip})`);

        // 마지막 로그인 시간 업데이트
        logger.debug('[5] 마지막 로그인 시간 업데이트 중...');
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        logger.debug('[6] JWT 토큰 생성 중...');
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        logger.info('[7] 로그인 성공 - 사용자:', username);
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                nickname: user.nickname || user.username,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (err) {
        logger.error('[로그인 에러]', err.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// ID 찾기
app.post('/api/auth/find-id', async (req, res) => {
    try {
        const { name, email } = req.body;
        const [users] = await pool.query('SELECT username FROM users WHERE name = ? AND email = ?', [name, email]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }

        res.json({ username: users[0].username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// PW 재설정 - 이메일 인증 코드 발송
app.post('/api/auth/reset-password-send-code', async (req, res) => {
    try {
        const { username, email } = req.body;
        
        logger.info(`[PW 재설정] 인증 코드 발송 요청: ${username}, ${email}`);
        
        // 사용자 확인
        const [users] = await pool.query('SELECT id FROM users WHERE username = ? AND email = ?', [username, email]);
        
        if (users.length === 0) {
            logger.warn('[PW 재설정] 사용자를 찾을 수 없음');
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }

        // 6자리 인증 코드 생성
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 3 * 60 * 1000; // 3분

        // 인증 코드 저장
        passwordResetCodes[email] = { code: verificationCode, expiry, username };

        // 이메일 발송
        const mailOptions = {
            from: 'gpt8354@gmail.com',
            to: email,
            subject: `[${SITE_NAME}] 비밀번호 재설정 인증 코드`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); padding: 20px; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🔒 비밀번호 재설정</h1>
                    </div>
                    <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 16px; color: #333;">안녕하세요, <strong>${username}</strong>님!</p>
                        <p style="font-size: 14px; color: #666;">비밀번호 재설정을 위한 인증 코드입니다.</p>
                        
                        <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; border: 2px solid #1976d2;">
                            <p style="margin: 0; color: #666; font-size: 12px;">인증 코드</p>
                            <h2 style="margin: 10px 0; color: #1976d2; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h2>
                            <p style="margin: 0; color: #666; font-size: 12px;">유효시간: 3분</p>
                        </div>
                        
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 3px;">
                            <p style="margin: 0; font-size: 13px; color: #856404;">
                                ⚠️ <strong>보안 주의사항</strong><br>
                                • 비밀번호 재설정을 요청하지 않으셨다면 이 메일을 무시하세요<br>
                                • 인증 코드는 절대 타인에게 알려주지 마세요<br>
                                • 의심스러운 활동이 있다면 즉시 관리자에게 문의하세요
                            </p>
                        </div>
                        
                        <p style="font-size: 12px; color: #999; margin-top: 20px;">
                            이 메일은 ${SITE_NAME}에서 자동으로 발송되었습니다.
                        </p>
                    </div>
                </div>
            `
        };

        await emailTransporter.sendMail(mailOptions);
        logger.info(`[PW 재설정] 인증 코드 발송 완료: ${email}`);

        res.json({ 
            message: '인증 코드가 이메일로 발송되었습니다',
            expiry: 3 * 60 // 3분 (초 단위)
        });
    } catch (err) {
        logger.error('[PW 재설정 코드 발송 실패]', err);
        res.status(500).json({ error: '인증 코드 발송에 실패했습니다' });
    }
});

// PW 재설정 - 인증 코드 확인
app.post('/api/auth/reset-password-verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        logger.info(`[PW 재설정] 인증 코드 확인 요청: ${email}`);
        
        const stored = passwordResetCodes[email];
        
        if (!stored) {
            logger.warn('[PW 재설정] 인증 코드 없음');
            return res.status(400).json({ error: '인증 코드를 먼저 요청해주세요' });
        }

        if (Date.now() > stored.expiry) {
            delete passwordResetCodes[email];
            logger.warn('[PW 재설정] 인증 코드 만료');
            return res.status(400).json({ error: '인증 코드가 만료되었습니다' });
        }

        if (stored.code !== code) {
            logger.warn('[PW 재설정] 인증 코드 불일치');
            return res.status(400).json({ error: '인증 코드가 일치하지 않습니다' });
        }

        logger.info('[PW 재설정] 인증 코드 확인 성공');
        res.json({ 
            message: '인증되었습니다',
            verified: true
        });
    } catch (err) {
        logger.error('[PW 재설정 코드 확인 실패]', err);
        res.status(500).json({ error: '인증 코드 확인에 실패했습니다' });
    }
});

// PW 재설정 - 최종 비밀번호 변경 (인증 완료 후)
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { username, email, code, newPassword } = req.body;
        
        logger.info(`[PW 재설정] 비밀번호 변경 요청: ${username}, ${email}`);
        
        // 인증 코드 재확인 (보안 강화)
        const stored = passwordResetCodes[email];
        
        if (!stored) {
            logger.warn('[PW 재설정] 인증 코드 없음');
            return res.status(400).json({ error: '인증이 필요합니다' });
        }

        if (Date.now() > stored.expiry) {
            delete passwordResetCodes[email];
            logger.warn('[PW 재설정] 인증 코드 만료');
            return res.status(400).json({ error: '인증 코드가 만료되었습니다. 다시 시도해주세요' });
        }

        if (stored.code !== code || stored.username !== username) {
            logger.warn('[PW 재설정] 인증 정보 불일치');
            return res.status(400).json({ error: '인증 정보가 일치하지 않습니다' });
        }

        // 사용자 확인
        const [users] = await pool.query('SELECT id FROM users WHERE username = ? AND email = ?', [username, email]);
        
        if (users.length === 0) {
            logger.warn('[PW 재설정] 사용자를 찾을 수 없음');
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }

        // 비밀번호 변경
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, users[0].id]);

        // 인증 코드 삭제
        delete passwordResetCodes[email];
        
        logger.info(`[PW 재설정] 비밀번호 변경 완료: ${username}`);
        res.json({ message: '비밀번호가 재설정되었습니다' });
    } catch (err) {
        logger.error('[PW 재설정 실패]', err);
        res.status(500).json({ error: '비밀번호 재설정에 실패했습니다' });
    }
});

// ==================== CVE 정보 API ====================

// CVE 목록 조회 (페이징 + 검색 + 필터)
app.get('/api/cve/list', async (req, res) => {
    try {
        const startTime = Date.now();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const severity = req.query.severity || '';
        const state = req.query.state || '';
        const hasPoc = req.query.hasPoc || ''; // POC 존재 여부
        const hasAi = req.query.hasAi || ''; // AI 분석 여부
        const attackTypes = req.query.attackTypes || ''; // 공격 유형 (콤마로 구분)
        const sortBy = req.query.sortBy || 'latest';
        const sortOrder = req.query.sortOrder || 'DESC';
        
        logger.info(`[CVE 목록] 조회 - hasPoc:"${hasPoc}", hasAi:"${hasAi}", sortBy:"${sortBy}", types:"${attackTypes}"`);

        let whereConditions = [];
        let params = [];

        // 검색 조건 (대소문자 구분 없음 - CVE코드, 제품명, 설명)
        if (search) {
            whereConditions.push('(LOWER(ci.CVE_Code) LIKE LOWER(?) OR LOWER(ci.product) LIKE LOWER(?) OR LOWER(ci.descriptions) LIKE LOWER(?))');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // 위험도 필터
        if (severity) {
            whereConditions.push('ci.CVSS_Serverity = ?');
            params.push(severity);
        }

        // 상태 필터
        if (state) {
            whereConditions.push('ci.state = ?');
            params.push(state);
        }

        // POC 존재 여부 필터 (JOIN 방식 - 빠름, 최신 POC 우선)
        let joinClause = '';
        let filterJoinClause = ''; // 필터용 JOIN (전체 조회 시 사용)
        
        // 필터 우선순위: hasPoc와 hasAi 조합을 명확히 처리
        if (hasPoc === 'Y' && hasAi === 'Y') {
            // POC 있고 AI 분석 완료 (모든 POC가 AI 분석 완료된 CVE만)
            joinClause = `INNER JOIN (
                SELECT 
                    g.cve, 
                    MAX(g.id) as max_id,
                    COUNT(*) as poc_count,
                    SUM(CASE WHEN g.AI_chk = 'Y' THEN 1 ELSE 0 END) as ai_count
                FROM Github_CVE_Info g 
                GROUP BY g.cve
                HAVING COUNT(*) = SUM(CASE WHEN g.AI_chk = 'Y' THEN 1 ELSE 0 END)
            ) gi ON ci.CVE_Code = gi.cve`;
        } else if (hasPoc === 'Y' && hasAi === 'N') {
            // POC 있고 AI 분석 미완료
            joinClause = `INNER JOIN (
                SELECT 
                    g.cve, 
                    MAX(g.id) as max_id,
                    COUNT(*) as poc_count,
                    SUM(CASE WHEN g.AI_chk = 'Y' THEN 1 ELSE 0 END) as ai_count
                FROM Github_CVE_Info g 
                WHERE g.AI_chk = 'N'
                GROUP BY g.cve
            ) gi ON ci.CVE_Code = gi.cve`;
        } else if (hasPoc === 'N' && hasAi === 'N') {
            // POC 없음
            joinClause = 'LEFT JOIN Github_CVE_Info gi ON ci.CVE_Code = gi.cve';
            whereConditions.push('gi.cve IS NULL');
        } else if (hasPoc === 'N' && hasAi === 'Y') {
            // POC 없는데 AI 분석 완료는 불가능하므로 빈 결과
            joinClause = 'LEFT JOIN Github_CVE_Info gi ON ci.CVE_Code = gi.cve';
            whereConditions.push('1 = 0'); // 항상 false
        } else if (hasPoc === 'Y' && !hasAi) {
            // POC 있음 (AI 상관없음)
            joinClause = `INNER JOIN (
                SELECT 
                    cve, 
                    MAX(id) as max_id,
                    COUNT(*) as poc_count,
                    SUM(CASE WHEN AI_chk = 'Y' THEN 1 ELSE 0 END) as ai_count
                FROM Github_CVE_Info 
                GROUP BY cve
            ) gi ON ci.CVE_Code = gi.cve`;
        } else if (hasPoc === 'N' && !hasAi) {
            // POC 없음
            joinClause = 'LEFT JOIN Github_CVE_Info gi ON ci.CVE_Code = gi.cve';
            whereConditions.push('gi.cve IS NULL');
        } else if (!hasPoc && hasAi === 'Y') {
            // AI 분석 완료 (POC 자동 포함)
            joinClause = `INNER JOIN (
                SELECT 
                    g.cve, 
                    MAX(g.id) as max_id,
                    COUNT(*) as poc_count,
                    SUM(CASE WHEN g.AI_chk = 'Y' THEN 1 ELSE 0 END) as ai_count
                FROM Github_CVE_Info g 
                WHERE g.AI_chk = 'Y'
                GROUP BY g.cve
            ) gi ON ci.CVE_Code = gi.cve`;
        } else if (!hasPoc && hasAi === 'N') {
            // AI 분석 미완료 (POC는 있지만 AI 분석 안 됨)
            joinClause = `INNER JOIN (
                SELECT 
                    g.cve, 
                    MAX(g.id) as max_id,
                    COUNT(*) as poc_count,
                    SUM(CASE WHEN g.AI_chk = 'Y' THEN 1 ELSE 0 END) as ai_count
                FROM Github_CVE_Info g 
                WHERE g.AI_chk = 'N'
                GROUP BY g.cve
            ) gi ON ci.CVE_Code = gi.cve`;
        } else if (!hasPoc && !hasAi) {
            // 전체 조회 시에는 JOIN 없이 빠르게 (POC count는 별도 쿼리 또는 0으로)
            filterJoinClause = '';
        }

        // 공격 유형 다중 선택 필터
        if (attackTypes) {
            const types = attackTypes.split(',').filter(t => t.trim());
            if (types.length > 0) {
                const placeholders = types.map(() => '?').join(',');
                whereConditions.push(`ci.Attak_Type IN (${placeholders})`);
                params.push(...types);
            }
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // 정렬 기준 설정
        let orderClause = 'ORDER BY ';
        switch (sortBy) {
            case 'latest':
                // 최신 등록순: POC 있으면 POC 기준, 없으면 CVE 기준
                if (joinClause && (hasPoc === 'Y' || hasAi === 'Y' || hasAi === 'N')) {
                    orderClause += `gi.max_id ${sortOrder}`;
                } else if (filterJoinClause) {
                    // 전체 조회 시 POC 있는 것 우선, 없으면 CVE id 순
                    orderClause += `gi.max_id ${sortOrder}, ci.id ${sortOrder}`;
                } else {
                    orderClause += `ci.id ${sortOrder}`;
                }
                break;
            case 'dateReserved':
                // 등록일 정렬: NULL 값은 맨 뒤로, 그 다음 날짜 순으로 정렬
                if (sortOrder === 'DESC') {
                    orderClause += `ci.dateReserved IS NULL, ci.dateReserved DESC, ci.id DESC`;
                } else {
                    orderClause += `ci.dateReserved IS NULL, ci.dateReserved ASC, ci.id ASC`;
                }
                break;
            case 'datePublished':
                // 공개일 정렬: NULL 값은 맨 뒤로, 그 다음 CVE ID로 정렬
                if (sortOrder === 'DESC') {
                    orderClause += `ci.datePublished IS NULL, ci.datePublished DESC, ci.id DESC`;
                } else {
                    orderClause += `ci.datePublished IS NULL, ci.datePublished ASC, ci.id ASC`;
                }
                break;
            case 'dateUpdated':
                // 업데이트일 정렬: NULL 값은 맨 뒤로, 그 다음 CVE ID로 정렬
                if (sortOrder === 'DESC') {
                    orderClause += `ci.dateUpdated IS NULL, ci.dateUpdated DESC, ci.id DESC`;
                } else {
                    orderClause += `ci.dateUpdated IS NULL, ci.dateUpdated ASC, ci.id ASC`;
                }
                break;
            case 'collectTime':
                // 수집시간 정렬: NULL 값은 맨 뒤로, 그 다음 CVE ID로 정렬
                if (sortOrder === 'DESC') {
                    orderClause += `ci.collect_time IS NULL, ci.collect_time DESC, ci.id DESC`;
                } else {
                    orderClause += `ci.collect_time IS NULL, ci.collect_time ASC, ci.id ASC`;
                }
                break;
            case 'cvssScore':
                // CVSS 점수 정렬: POC/AI 필터와 관계없이 CVE 점수 기준
                orderClause += `ci.CVSS_Score ${sortOrder}, ci.id DESC`;
                break;
            default:
                orderClause += `ci.id ${sortOrder}`;
        }

        // 실제 사용할 JOIN (필터 적용 또는 전체 조회용)
        const finalJoinClause = joinClause || filterJoinClause;

        // total 개수 정확하게 계산 (필터 적용)
        // 검색어가 있으면 빠른 카운트, 없고 필터도 없으면 전체 개수 반환
        let total;
        if (!search && !finalJoinClause && !whereClause) {
            // 전체 조회: 고정값 사용 (빠름)
            [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM CVE_Info');
        } else {
            // 필터/검색 적용: 정확한 카운트
            const countQuery = `
                SELECT COUNT(DISTINCT ci.CVE_Code) as total
                FROM CVE_Info ci
                ${finalJoinClause}
                ${whereClause}
            `;
            [[{ total }]] = await pool.query(countQuery, params);
        }
        logger.debug(`[CVE 카운트] 필터 적용 후 총 ${total}개 (검색어: "${search}")`);

        // 디버깅: 실제 실행될 쿼리 로그
        // POC 없음 필터는 poc_count/ai_count가 없으므로 0 처리
        const isPocNone = hasPoc === 'N';
        
        const query = finalJoinClause ? `
            SELECT 
                ci.CVE_Code,
                ci.state,
                ci.product,
                ci.CVSS_Score,
                ci.CVSS_Serverity,
                ci.collect_time,
                ci.dateReserved,
                ci.datePublished,
                ci.dateUpdated,
                ${isPocNone ? '0' : 'IFNULL(gi.poc_count, 0)'} as poc_count,
                ${isPocNone ? '0' : 'IFNULL(gi.ai_count, 0)'} as ai_count
            FROM CVE_Info ci
            ${finalJoinClause}
            ${whereClause}
            ${orderClause}
            LIMIT ? OFFSET ?
        ` : `
            SELECT 
                ci.CVE_Code,
                ci.state,
                ci.product,
                ci.CVSS_Score,
                ci.CVSS_Serverity,
                ci.collect_time,
                ci.dateReserved,
                ci.datePublished,
                ci.dateUpdated,
                0 as poc_count,
                0 as ai_count
            FROM CVE_Info ci 
            ${whereClause}
            ${orderClause}
            LIMIT ? OFFSET ?
        `;
        
        logger.debug(`[쿼리] JOIN: ${finalJoinClause ? 'YES' : 'NO'}, WHERE: ${whereClause ? 'YES' : 'NO'}`);
        logger.debug(`[정렬] sortBy: ${sortBy}, sortOrder: ${sortOrder}, orderClause: ${orderClause}`);
        logger.info(`[CVE 정렬] ${sortBy} ${sortOrder} - ${orderClause}`);
        logger.debug(`[쿼리 전체]\n${query}\nParams: ${JSON.stringify([...params, limit, offset])}`);
        
        const [cves] = await pool.query(query, [...params, limit, offset]);

        const elapsed = Date.now() - startTime;
        logger.info(`[CVE 목록] 조회 완료 (${elapsed}ms) - ${cves.length}건 반환`);
        
        // 디버깅: 첫 번째 CVE의 등록일 확인
        if (cves.length > 0 && sortBy === 'dateReserved') {
            const firstCve = cves[0];
            logger.info(`[디버깅] 첫 번째 CVE: ${firstCve.CVE_Code}, 등록일: ${firstCve.dateReserved}`);
        }

        const fixCollectTime = arr => (arr || []).map(r => ({ ...r, collect_time: r.collect_time instanceof Date ? toKstDateTimeString(r.collect_time) : r.collect_time }));
        res.json({ cves: fixCollectTime(cves), total, page, limit });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 최종 패턴(Snort 룰) 목록 조회 (검색 + 필터)
app.get('/api/cve/final-patterns', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = (req.query.search || '').trim();
        const severity = req.query.severity || '';
        const vulnStage = req.query.vulnStage || '';

        let whereConditions = ['g.AI_chk = ?', 'a.snort_rule IS NOT NULL', "a.snort_rule != ''"];
        let params = ['Y'];

        if (search) {
            whereConditions.push('(g.cve LIKE ? OR c.product LIKE ? OR a.snort_rule LIKE ? OR a.vuln_stage LIKE ?)');
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        if (severity) {
            whereConditions.push('c.CVSS_Serverity = ?');
            params.push(severity);
        }
        if (vulnStage) {
            whereConditions.push('a.vuln_stage LIKE ?');
            params.push(`%${vulnStage}%`);
        }

        const whereClause = whereConditions.join(' AND ');

        const [countResult] = await pool.query(`
            SELECT COUNT(*) as total
            FROM Github_CVE_Info g
            INNER JOIN CVE_Packet_AI_Analysis a ON g.link = a.link
            LEFT JOIN CVE_Info c ON g.cve = c.CVE_Code
            WHERE ${whereClause}
        `, params);

        const total = countResult[0]?.total || 0;

        const [rows] = await pool.query(`
            SELECT 
                g.cve as cve_code,
                c.product,
                c.CVSS_Serverity as severity,
                a.step,
                a.vuln_stage,
                a.snort_rule,
                g.link,
                g.title as poc_title
            FROM Github_CVE_Info g
            INNER JOIN CVE_Packet_AI_Analysis a ON g.link = a.link
            LEFT JOIN CVE_Info c ON g.cve = c.CVE_Code
            WHERE ${whereClause}
            ORDER BY g.cve DESC, a.step ASC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        res.json({ patterns: rows, total, page, limit });
    } catch (err) {
        logger.error('[최종 패턴] 조회 오류:', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// CVE 상세 정보
app.get('/api/cve/:cve_code', async (req, res) => {
    try {
        const { cve_code } = req.params;

        const [cveInfo] = await pool.query('SELECT * FROM CVE_Info WHERE CVE_Code = ?', [cve_code]);
        
        if (cveInfo.length === 0) {
            return res.status(404).json({ error: 'CVE를 찾을 수 없습니다' });
        }

        const [pocs] = await pool.query(
            'SELECT id, title, writer, trans_msg, link, AI_chk FROM Github_CVE_Info WHERE cve = ?',
            [cve_code]
        );

        const cve = cveInfo[0];
        if (cve.collect_time instanceof Date) cve.collect_time = toKstDateTimeString(cve.collect_time);
        res.json({ cve, pocs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 대시보드 통계 (집계 테이블 기반 - 초고속)
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        logger.info('[대시보드] 통계 조회 시작 (집계 테이블 사용)');
        const startTime = Date.now();
        
        // 1. 기본 통계 (집계 테이블에서 조회 - 0.01초)
        const [[basicStats]] = await pool.query(`
            SELECT * FROM dashboard_stats_daily
            ORDER BY stat_date DESC
            LIMIT 1
        `);
        
        if (!basicStats) {
            logger.warn('[대시보드] 집계 데이터 없음 - 초기화 필요');
            return res.status(500).json({ 
                error: '통계 데이터가 없습니다. 관리자에게 문의하세요.',
                hint: 'node init_dashboard_stats.js 실행 필요'
            });
        }
        
        // pending_pocs는 실시간 조회 (run_ai_analysis와 동기화 - 캐시 stale 방지)
        try {
            const [[row]] = await pool.query(
                "SELECT COUNT(*) as pending_pocs FROM Github_CVE_Info WHERE AI_chk = 'N'"
            );
            basicStats.pending_pocs = Number(row?.pending_pocs ?? basicStats.pending_pocs);
        } catch (e) {
            logger.warn('[대시보드] pending_pocs 실시간 조회 실패, 캐시값 사용:', e.message);
        }
        
        // 집계 날짜를 문자열로 변환 (Date 객체인 경우 처리)
        const statDate = basicStats.stat_date instanceof Date 
            ? basicStats.stat_date.toISOString().split('T')[0] 
            : basicStats.stat_date;
        
        logger.info(`[대시보드] 집계 날짜: ${statDate}`);
        
        // 2. 나머지 쿼리 병렬 실행 (순차 대비 대폭 단축)
        const [
            cvssDistribution,
            attackStageStats,
            cweTypeStats,
            attackTypeStats,
            productStats,
            recentCollectedCVEs,
            latestCVEs,
            recentPocs,
            quotaStats
        ] = await Promise.all([
            // CVSS 분포 (집계 테이블 우선, stat_date 불일치 시 MAX(stat_date) 재시도 후 fallback)
            (async () => {
                const t = Date.now();
                try {
                    let [cvssData] = await pool.query(`
                        SELECT severity AS CVSS_Serverity, count
                        FROM dashboard_cvss_distribution
                        WHERE stat_date = ?
                        ORDER BY FIELD(severity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW') ASC
                    `, [statDate]);
                    if (!cvssData || cvssData.length === 0) {
                        [cvssData] = await pool.query(`
                            SELECT severity AS CVSS_Serverity, count
                            FROM dashboard_cvss_distribution
                            WHERE stat_date = (SELECT MAX(stat_date) FROM dashboard_cvss_distribution)
                            ORDER BY FIELD(severity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW') ASC
                        `);
                    }
                    if (cvssData && cvssData.length > 0) {
                        logger.info(`[대시보드] CVSS 분포(집계) ${Date.now() - t}ms`);
                        return cvssData;
                    }
                    logger.info('[대시보드] CVSS 분포 실시간 계산 (집계 테이블 비어있음)');
                    const [fallback] = await pool.query(`
                        SELECT CVSS_Serverity, COUNT(*) as count
                        FROM CVE_Info
                        WHERE CVSS_Serverity IS NOT NULL AND CVSS_Serverity != ''
                        GROUP BY CVSS_Serverity
                        ORDER BY FIELD(CVSS_Serverity, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW') ASC
                    `);
                    logger.info(`[대시보드] CVSS 분포(실시간) ${Date.now() - t}ms`);
                    return fallback || [];
                } catch (e) {
                    logger.warn('[대시보드] CVSS 분포 조회 실패:', e.message);
                    return [];
                }
            })(),
            // attackStageStats
            pool.query(`SELECT vuln_stage as attack_stage, count FROM dashboard_attack_stage_stats ORDER BY stat_date DESC, rank_order ASC LIMIT 100`).then(([r]) => r || []).catch(() => []),
            // cweTypeStats
            pool.query(`SELECT cwe_id as cwe_type, count FROM dashboard_cwe_stats ORDER BY stat_date DESC, rank_order ASC LIMIT 100`).then(([r]) => r || []).catch(() => []),
            // attackTypeStats
            pool.query(`SELECT attack_type, count FROM dashboard_attack_type_stats ORDER BY stat_date DESC, rank_order ASC LIMIT 100`).then(([r]) => r || []).catch(() => []),
            // productStats
            pool.query(`SELECT product, count FROM dashboard_product_stats ORDER BY stat_date DESC, rank_order ASC LIMIT 100`).then(([r]) => r || []).catch(() => []),
            // recentCollectedCVEs (집계 없으면 원본 조회)
            (async () => {
                const t = Date.now();
                try {
                    const [r] = await pool.query(`SELECT cve_code as CVE_Code, product, collect_time, cvss_score as CVSS_Score, cvss_severity as CVSS_Serverity, state FROM dashboard_recent_cves ORDER BY stat_date DESC, rank_order ASC LIMIT 10`);
                    if (r && r.length > 0) { logger.info(`[대시보드] recentCVE(집계) ${Date.now() - t}ms`); return r; }
                    logger.info('[대시보드] recentCVE fallback(원본)');
                    const [d] = await pool.query(`SELECT CVE_Code, product, collect_time, CVSS_Score, CVSS_Serverity, state FROM CVE_Info WHERE collect_time IS NOT NULL ORDER BY collect_time DESC LIMIT 10`);
                    logger.info(`[대시보드] recentCVE(원본) ${Date.now() - t}ms`);
                    return d || [];
                } catch (e) {
                    logger.error('[대시보드] 최근 CVE 조회 오류:', e.message);
                    return [];
                }
            })(),
            // latestCVEs (집계 없으면 원본 조회)
            (async () => {
                const t = Date.now();
                try {
                    const [r] = await pool.query(`SELECT cve_code as CVE_Code, product, datePublished, cvss_score as CVSS_Score, cvss_severity as CVSS_Serverity, state FROM dashboard_latest_cves ORDER BY stat_date DESC, rank_order ASC LIMIT 10`);
                    if (r && r.length > 0) { logger.info(`[대시보드] latestCVE(집계) ${Date.now() - t}ms`); return r; }
                    logger.info('[대시보드] latestCVE fallback(원본)');
                    const [d] = await pool.query(`SELECT CVE_Code, product, datePublished, CVSS_Score, CVSS_Serverity, state FROM CVE_Info WHERE datePublished IS NOT NULL ORDER BY datePublished DESC LIMIT 10`);
                    logger.info(`[대시보드] latestCVE(원본) ${Date.now() - t}ms`);
                    return d || [];
                } catch (e) {
                    logger.error('[대시보드] 최신 CVE 조회 오류:', e.message);
                    return [];
                }
            })(),
            // recentPocs (집계 없으면 원본 조회)
            (async () => {
                const t = Date.now();
                try {
                    const [r] = await pool.query(`SELECT poc_id AS id, title, writer, cve, collect_time, ai_chk AS AI_chk, status, link FROM dashboard_recent_pocs ORDER BY stat_date DESC, rank_order ASC LIMIT 10`);
                    if (r && r.length > 0) { logger.info(`[대시보드] recentPOC(집계) ${Date.now() - t}ms`); return r; }
                    logger.info('[대시보드] recentPOC fallback(원본)');
                    const [d] = await pool.query(`SELECT id, title, writer, cve, collect_time, AI_chk, status, link FROM Github_CVE_Info WHERE collect_time IS NOT NULL ORDER BY collect_time DESC LIMIT 10`);
                    logger.info(`[대시보드] recentPOC(원본) ${Date.now() - t}ms`);
                    return d || [];
                } catch (e) {
                    logger.error('[대시보드] 최근 POC 조회 오류:', e.message);
                    return [];
                }
            })(),
            // quotaStats
            pool.query(`SELECT COUNT(*) as total_accounts, SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_accounts, SUM(daily_analysis_count) as total_daily_analysis, SUM(quota_exhausted_count) as total_429_errors FROM AI_Quota_Management`).then(([r]) => r || [{ total_accounts: 0, active_accounts: 0, total_daily_analysis: 0, total_429_errors: 0 }]).catch(() => [{ total_accounts: 0, active_accounts: 0, total_daily_analysis: 0, total_429_errors: 0 }])
        ]);

        const elapsed = Date.now() - startTime;
        logger.info(`[대시보드] 기본 통계 조회 완료 (${elapsed}ms) - 집계 테이블 사용`);
        // collect_time: DATETIME이면 timezone:'Z' 보정, TEXT(문자열)면 그대로
        const fixCollectTime = arr => (arr || []).map(r => ({ ...r, collect_time: r.collect_time instanceof Date ? toKstDateTimeString(r.collect_time) : r.collect_time }));
        
        res.json({
            total_cves: basicStats.total_cves,
            total_pocs: basicStats.total_pocs,
            analyzed_pocs: basicStats.analyzed_pocs,
            unique_analyzed_pocs: basicStats.unique_analyzed_pocs,
            pending_pocs: basicStats.pending_pocs,
            recentStats: [],
            cvssDistribution,
            recentCVEs: [],
            recentCollectedCVEs: fixCollectTime(recentCollectedCVEs),  // 최근 수집된 CVE
            latestCVEs,  // 최신 CVE
            recentPocs: fixCollectTime(recentPocs), // 최근 수집된 POC
            attackStageStats,  // 공격 단계별 분석
            cweTypeStats,  // CWE 유형별 분석
            attackTypeStats,  // 공격 유형별 분석
            productStats,  // 영향받는 제품
            // AI 할당량 정보
            aiQuotaStats: quotaStats[0] || {
                total_accounts: 0,
                active_accounts: 0,
                total_daily_analysis: 0,
                total_429_errors: 0
            },
            // 집계 시점 정보
            stats_updated_at: basicStats.updated_at,
            stats_date: basicStats.stat_date
        });
    } catch (err) {
        logger.error('[대시보드 통계 실패]', err);
        logger.error('에러 상세:', err.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다', details: err.message });
    }
});

// 대시보드 수집 현황 (최근 30일)
app.get('/api/dashboard/collection-trends', async (req, res) => {
    try {
        logger.info('[대시보드] 수집 현황 조회 시작 (최근 30일)');
        const startTime = Date.now();
        
        // 최근 30일간의 날짜 목록 생성
        const dates = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
        }
        
        // 일별 CVE 수집 수 (collect_time 기준) - 인덱스 활용을 위해 날짜 범위 명시
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        
        const [cveData] = await pool.query(`
            SELECT 
                DATE(collect_time) as date,
                COUNT(*) as count
            FROM CVE_Info
            WHERE collect_time >= ?
                AND collect_time IS NOT NULL
            GROUP BY DATE(collect_time)
            ORDER BY date ASC
        `, [startDate]);
        
        // 일별 POC 수집 수 (collect_time 기준)
        const [pocData] = await pool.query(`
            SELECT 
                DATE(collect_time) as date,
                COUNT(*) as count
            FROM Github_CVE_Info
            WHERE collect_time >= ?
                AND collect_time IS NOT NULL
            GROUP BY DATE(collect_time)
            ORDER BY date ASC
        `, [startDate]);
        
        // 일별 AI 분석 완료 수 (AI_chk = 'Y'이고 collect_time 기준)
        const [aiData] = await pool.query(`
            SELECT 
                DATE(collect_time) as date,
                COUNT(*) as count
            FROM Github_CVE_Info
            WHERE collect_time >= ?
                AND collect_time IS NOT NULL
                AND AI_chk = 'Y'
            GROUP BY DATE(collect_time)
            ORDER BY date ASC
        `, [startDate]);
        
        // 날짜별로 데이터 매핑
        const cveMap = new Map(cveData.map(item => [item.date.toISOString().split('T')[0], item.count]));
        const pocMap = new Map(pocData.map(item => [item.date.toISOString().split('T')[0], item.count]));
        const aiMap = new Map(aiData.map(item => [item.date.toISOString().split('T')[0], item.count]));
        
        // 30일간의 데이터 배열 생성 (없는 날짜는 0으로)
        const trends = dates.map(date => {
            const dateObj = new Date(date);
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
            
            // 날짜 레이블: M/D (요일) 형식
            const dateLabel = `${month}/${day}`;
            // 툴팁용 전체 날짜: YYYY년 M월 D일 (요일)
            const fullDateLabel = `${dateObj.getFullYear()}년 ${month}월 ${day}일 (${dayOfWeek})`;
            
            return {
                date: date,
                dateLabel: dateLabel,
                fullDateLabel: fullDateLabel,
                cve: cveMap.get(date) || 0,
                poc: pocMap.get(date) || 0,
                ai: aiMap.get(date) || 0
            };
        });
        
        const elapsed = Date.now() - startTime;
        logger.info(`[대시보드] 수집 현황 조회 완료 (${elapsed}ms) - ${trends.length}일`);
        
        res.json({
            trends: trends,
            totalCVE: trends.reduce((sum, item) => sum + item.cve, 0),
            totalPOC: trends.reduce((sum, item) => sum + item.poc, 0),
            totalAI: trends.reduce((sum, item) => sum + item.ai, 0)
        });
    } catch (err) {
        logger.error('[대시보드 수집 현황 실패]', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다', details: err.message });
    }
});

// 수집 현황 날짜별 세부 항목 (CVE, POC, AI 목록)
app.get('/api/dashboard/collection-trends/:date', async (req, res) => {
    try {
        const { date } = req.params;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: '유효한 날짜(YYYY-MM-DD)가 필요합니다' });
        }
        // DATE() 대신 범위 사용 - 타임존/형식 이슈 회피 (해당 날짜 전체 포함)
        const startDt = `${date} 00:00:00`;
        const [y, m, d] = date.split('-').map(Number);
        const nextDay = new Date(y, m - 1, d + 1);
        const nextDateStr = nextDay.getFullYear() + '-' + String(nextDay.getMonth() + 1).padStart(2, '0') + '-' + String(nextDay.getDate()).padStart(2, '0');
        const endDt = `${nextDateStr} 00:00:00`;
        const [[cves], [pocs], [ai]] = await Promise.all([
            pool.query(`
                SELECT CVE_Code, product, CVSS_Score, CVSS_Serverity, state, collect_time
                FROM CVE_Info
                WHERE collect_time >= ? AND collect_time < ?
                ORDER BY collect_time DESC
            `, [startDt, endDt]),
            pool.query(`
                SELECT g.id, g.cve, g.title, g.link, g.collect_time, g.AI_chk
                FROM Github_CVE_Info g
                WHERE g.collect_time >= ? AND g.collect_time < ?
                ORDER BY g.collect_time DESC
            `, [startDt, endDt]),
            pool.query(`
                SELECT g.id, g.cve, g.title, g.link, g.collect_time
                FROM Github_CVE_Info g
                WHERE g.collect_time >= ? AND g.collect_time < ?
                  AND g.AI_chk = 'Y'
                ORDER BY g.collect_time DESC
            `, [startDt, endDt])
        ]);

        logger.info(`[수집 현황 세부] ${date} → CVE ${cves?.length || 0}건, POC ${pocs?.length || 0}건, AI ${ai?.length || 0}건`);
        const fixCollectTime = arr => (arr || []).map(r => ({ ...r, collect_time: r.collect_time instanceof Date ? toKstDateTimeString(r.collect_time) : r.collect_time }));
        res.json({ cves: fixCollectTime(cves || []), pocs: fixCollectTime(pocs || []), ai: fixCollectTime(ai || []) });
    } catch (err) {
        logger.error('[수집 현황 세부 실패]', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다', details: err.message });
    }
});

// 대시보드 상세 통계 (집계 테이블 기반 - 초고속)
app.get('/api/dashboard/detailed-stats', async (req, res) => {
    try {
        logger.info('[대시보드] 상세 통계 조회 시작 (집계 테이블 사용)');
        const startTime = Date.now();
        
        // 최신 날짜 조회 (한 번만)
        const [[latestDate]] = await pool.query(`
            SELECT MAX(stat_date) as latest_date FROM dashboard_stats_daily
        `);
        const targetDate = latestDate?.latest_date;
        
        if (!targetDate) {
            logger.warn('[대시보드] 상세 통계 데이터 없음');
            return res.json({
                attackStageStats: [],
                cweTypeStats: [],
                attackTypeStats: [],
                productStats: []
            });
        }
        
        // 병렬로 모든 상세 통계 조회
        const [
            [attackStageStats],
            [cweTypeStats],
            [attackTypeStats],
            [productStats]
        ] = await Promise.all([
            pool.query(`
                SELECT vuln_stage, count
                FROM dashboard_attack_stage_stats
                WHERE stat_date = ?
                ORDER BY rank_order ASC
            LIMIT 10
            `, [targetDate]),
            pool.query(`
                SELECT cwe_id AS cweId, count
                FROM dashboard_cwe_stats
                WHERE stat_date = ?
                ORDER BY rank_order ASC
                LIMIT 10
            `, [targetDate]),
            pool.query(`
                SELECT attack_type AS Attak_Type, count
                FROM dashboard_attack_type_stats
                WHERE stat_date = ?
                ORDER BY rank_order ASC
                LIMIT 10
            `, [targetDate]),
            pool.query(`
                SELECT product, count
                FROM dashboard_product_stats
                WHERE stat_date = ?
                ORDER BY rank_order ASC
                LIMIT 10
            `, [targetDate])
        ]);
        
        const elapsed = Date.now() - startTime;
        logger.info(`[대시보드] 상세 통계 조회 완료 (${elapsed}ms) - 집계 테이블 사용`);
        
        res.json({
            attackStageStats,
            cweTypeStats,
            attackTypeStats,
            productStats
        });
    } catch (err) {
        logger.error('[대시보드 상세 통계 실패]', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// POC 상세 정보
app.get('/api/poc/:id', async (req, res) => {
    logger.debug('[POC 상세] 요청 ID:', req.params.id);
    try {
        const { id } = req.params;

        logger.debug('[POC 상세] Github_CVE_Info 조회 중...');
        const [poc] = await pool.query('SELECT * FROM Github_CVE_Info WHERE id = ?', [id]);
        
        if (poc.length === 0) {
            logger.error('[POC 상세] POC를 찾을 수 없음');
            return res.status(404).json({ error: 'POC를 찾을 수 없습니다' });
        }

        logger.debug('[POC 상세] CVE 코드:', poc[0].cve);

        // CVE 상세 정보 조회
        logger.debug('[POC 상세] CVE_Info 조회 중...');
        const [cveInfo] = await pool.query('SELECT * FROM CVE_Info WHERE CVE_Code = ?', [poc[0].cve]);
        logger.debug('[POC 상세] CVE_Info 결과:', cveInfo.length > 0 ? '발견' : '없음');

        let aiAnalysis = null;
        if (poc[0].AI_chk === 'Y') {
            logger.debug('[POC 상세] AI 분석 결과 조회 중...');
            const [analysis] = await pool.query(
                'SELECT * FROM CVE_Packet_AI_Analysis WHERE link = ? ORDER BY step',
                [poc[0].link]
            );
            aiAnalysis = analysis;
            logger.debug('[POC 상세] AI 분석 단계 수:', analysis.length);
        }

        // 같은 CVE의 다른 POC 목록
        logger.debug('[POC 상세] 관련 POC 조회 중...');
        const [relatedPocs] = await pool.query(
            'SELECT id, title, writer, AI_chk FROM Github_CVE_Info WHERE cve = ? AND id != ? LIMIT 10',
            [poc[0].cve, id]
        );
        logger.debug('[POC 상세] 관련 POC 수:', relatedPocs.length);

        logger.info('[POC 상세] 조회 완료');
        const pocRow = poc[0];
        const cveRow = cveInfo.length > 0 ? cveInfo[0] : null;
        // collect_time: DATETIME이면 timezone:'Z' 잘못 해석 보정, TEXT(문자열)면 그대로 전달
        // poc.date(작성일) = GitHub created_at "2026-03-15T22:21:01Z" → 변환하지 않음
        if (pocRow.collect_time instanceof Date) pocRow.collect_time = toKstDateTimeString(pocRow.collect_time);
        if (cveRow?.collect_time instanceof Date) cveRow.collect_time = toKstDateTimeString(cveRow.collect_time);
        res.json({ 
            poc: pocRow, 
            aiAnalysis, 
            relatedPocs,
            cveInfo: cveRow
        });
    } catch (err) {
        logger.error('[POC 상세 에러]', err.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// POC 재분석 (관리자만)
app.post('/api/poc/:id/reanalyze', authenticateToken, checkRole(['admin']), async (req, res) => {
    const { id } = req.params;
    logger.info(`[POC 재분석] 요청 ID: ${id}, 사용자: ${req.user.username}`);
    
    try {
        // POC 정보 조회
        const [poc] = await pool.query('SELECT * FROM Github_CVE_Info WHERE id = ?', [id]);
        
        if (poc.length === 0) {
            return res.status(404).json({ error: 'POC를 찾을 수 없습니다' });
        }

        const pocData = poc[0];
        
        // AI_chk를 'N'으로 변경하여 재분석 대기 상태로 설정
        await pool.query(
            'UPDATE Github_CVE_Info SET AI_chk = ? WHERE id = ?',
            ['N', id]
        );
        
        logger.info(`[POC 재분석] AI_chk를 'N'으로 변경 완료: ${pocData.link}`);
        
        // 기존 AI 분석 결과 삭제 (선택사항 - 재분석 시 덮어쓰기)
        await pool.query(
            'DELETE FROM CVE_Packet_AI_Analysis WHERE link = ?',
            [pocData.link]
        );
        
        logger.info(`[POC 재분석] 기존 AI 분석 결과 삭제 완료: ${pocData.link}`);
        
        // 재분석 기록 저장
        await pool.query(
            'INSERT INTO poc_reanalyze_history (poc_id, user_id) VALUES (?, ?)',
            [id, req.user.id]
        );
        
        logger.info(`[POC 재분석] 재분석 기록 저장 완료: POC ID ${id}, 사용자 ID ${req.user.id}`);
        
        res.json({ 
            success: true,
            message: '재분석이 요청되었습니다. AI 분석기가 실행되면 자동으로 분석됩니다.',
            pocId: id,
            link: pocData.link
        });
        
    } catch (err) {
        logger.error('[POC 재분석 에러]', err.message);
        res.status(500).json({ error: '재분석 요청 중 오류가 발생했습니다' });
    }
});

// POC 평가 조회 (로그인 선택적)
app.get('/api/poc/:id/rating', async (req, res) => {
    const { id } = req.params;
    try {
        // 전체 평가 통계
        const [stats] = await pool.query(`
            SELECT 
                COUNT(CASE WHEN rating = 1 THEN 1 END) as likes,
                COUNT(CASE WHEN rating = -1 THEN 1 END) as dislikes,
                COUNT(*) as total
            FROM poc_ratings
            WHERE poc_id = ?
        `, [id]);
        
        // 현재 사용자의 평가 (로그인한 경우만)
        let userRating = null;
        if (req.user && req.user.id) {
            const [userRatingResult] = await pool.query(
                'SELECT rating FROM poc_ratings WHERE poc_id = ? AND user_id = ?',
                [id, req.user.id]
            );
            if (userRatingResult.length > 0) {
                userRating = userRatingResult[0].rating;
            }
        }
        
        res.json({
            likes: stats[0].likes || 0,
            dislikes: stats[0].dislikes || 0,
            total: stats[0].total || 0,
            userRating: userRating
        });
    } catch (err) {
        logger.error('[POC 평가 조회 에러]', err.message);
        res.status(500).json({ error: '평가 조회 중 오류가 발생했습니다' });
    }
});

// POC 평가 등록/수정
app.post('/api/poc/:id/rating', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { rating } = req.body;
    
    if (![1, -1].includes(rating)) {
        return res.status(400).json({ error: '평가는 1(좋아요) 또는 -1(싫어요)만 가능합니다' });
    }
    
    try {
        // 기존 평가 확인
        const [existing] = await pool.query(
            'SELECT id, rating FROM poc_ratings WHERE poc_id = ? AND user_id = ?',
            [id, req.user.id]
        );
        
        if (existing.length > 0) {
            // 기존 평가 수정
            await pool.query(
                'UPDATE poc_ratings SET rating = ? WHERE id = ?',
                [rating, existing[0].id]
            );
            logger.info(`[POC 평가] 평가 수정: POC ID ${id}, 사용자 ID ${req.user.id}, 평가 ${rating}`);
        } else {
            // 새 평가 등록
            await pool.query(
                'INSERT INTO poc_ratings (poc_id, user_id, rating) VALUES (?, ?, ?)',
                [id, req.user.id, rating]
            );
            logger.info(`[POC 평가] 평가 등록: POC ID ${id}, 사용자 ID ${req.user.id}, 평가 ${rating}`);
        }
        
        res.json({ success: true, message: '평가가 저장되었습니다' });
    } catch (err) {
        logger.error('[POC 평가 등록 에러]', err.message);
        res.status(500).json({ error: '평가 저장 중 오류가 발생했습니다' });
    }
});

// POC 평가 삭제
app.delete('/api/poc/:id/rating', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(
            'DELETE FROM poc_ratings WHERE poc_id = ? AND user_id = ?',
            [id, req.user.id]
        );
        logger.info(`[POC 평가] 평가 삭제: POC ID ${id}, 사용자 ID ${req.user.id}`);
        res.json({ success: true, message: '평가가 삭제되었습니다' });
    } catch (err) {
        logger.error('[POC 평가 삭제 에러]', err.message);
        res.status(500).json({ error: '평가 삭제 중 오류가 발생했습니다' });
    }
});

// POC 댓글 목록 조회
app.get('/api/poc/:id/comments', async (req, res) => {
    const { id } = req.params;
    try {
        const [comments] = await pool.query(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                c.updated_at,
                u.id as user_id,
                u.username,
                u.nickname,
                u.name,
                u.role
            FROM poc_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.poc_id = ?
            ORDER BY c.created_at ASC
        `, [id]);
        
        res.json(comments);
    } catch (err) {
        logger.error('[POC 댓글 조회 에러]', err.message);
        res.status(500).json({ error: '댓글 조회 중 오류가 발생했습니다' });
    }
});

// POC 댓글 작성
app.post('/api/poc/:id/comments', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: '댓글 내용을 입력해주세요' });
    }
    
    if (content.length > 2000) {
        return res.status(400).json({ error: '댓글은 2000자 이하여야 합니다' });
    }
    
    try {
        const [result] = await pool.query(
            'INSERT INTO poc_comments (poc_id, user_id, content) VALUES (?, ?, ?)',
            [id, req.user.id, content.trim()]
        );
        
        logger.info(`[POC 댓글] 댓글 작성: POC ID ${id}, 사용자 ID ${req.user.id}, 댓글 ID ${result.insertId}`);
        
        // 작성된 댓글 조회
        const [comment] = await pool.query(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                c.updated_at,
                u.id as user_id,
                u.username,
                u.nickname,
                u.name,
                u.role
            FROM poc_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);
        
        res.json(comment[0]);
    } catch (err) {
        logger.error('[POC 댓글 작성 에러]', err.message);
        res.status(500).json({ error: '댓글 작성 중 오류가 발생했습니다' });
    }
});

// POC 댓글 수정
app.put('/api/poc/:id/comments/:commentId', authenticateToken, async (req, res) => {
    const { id, commentId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: '댓글 내용을 입력해주세요' });
    }
    
    if (content.length > 2000) {
        return res.status(400).json({ error: '댓글은 2000자 이하여야 합니다' });
    }
    
    try {
        // 댓글 소유자 확인
        const [comment] = await pool.query(
            'SELECT user_id FROM poc_comments WHERE id = ? AND poc_id = ?',
            [commentId, id]
        );
        
        if (comment.length === 0) {
            return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
        }
        
        // 본인 댓글이거나 관리자인지 확인
        if (comment[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: '댓글을 수정할 권한이 없습니다' });
        }
        
        await pool.query(
            'UPDATE poc_comments SET content = ? WHERE id = ?',
            [content.trim(), commentId]
        );
        
        logger.info(`[POC 댓글] 댓글 수정: 댓글 ID ${commentId}, 사용자 ID ${req.user.id}`);
        
        // 수정된 댓글 조회
        const [updated] = await pool.query(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                c.updated_at,
                u.id as user_id,
                u.username,
                u.nickname,
                u.name,
                u.role
            FROM poc_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [commentId]);
        
        res.json(updated[0]);
    } catch (err) {
        logger.error('[POC 댓글 수정 에러]', err.message);
        res.status(500).json({ error: '댓글 수정 중 오류가 발생했습니다' });
    }
});

// POC 댓글 삭제
app.delete('/api/poc/:id/comments/:commentId', authenticateToken, async (req, res) => {
    const { id, commentId } = req.params;
    
    try {
        // 댓글 소유자 확인
        const [comment] = await pool.query(
            'SELECT user_id FROM poc_comments WHERE id = ? AND poc_id = ?',
            [commentId, id]
        );
        
        if (comment.length === 0) {
            return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
        }
        
        // 본인 댓글이거나 관리자인지 확인
        if (comment[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: '댓글을 삭제할 권한이 없습니다' });
        }
        
        await pool.query('DELETE FROM poc_comments WHERE id = ?', [commentId]);
        
        logger.info(`[POC 댓글] 댓글 삭제: 댓글 ID ${commentId}, 사용자 ID ${req.user.id}`);
        
        res.json({ success: true, message: '댓글이 삭제되었습니다' });
    } catch (err) {
        logger.error('[POC 댓글 삭제 에러]', err.message);
        res.status(500).json({ error: '댓글 삭제 중 오류가 발생했습니다' });
    }
});

// POC 재분석 기록 조회
app.get('/api/poc/:id/reanalyze-history', async (req, res) => {
    const { id } = req.params;
    try {
        const [history] = await pool.query(`
            SELECT 
                h.id,
                h.created_at,
                u.id as user_id,
                u.username,
                u.nickname,
                u.name,
                u.role
            FROM poc_reanalyze_history h
            LEFT JOIN users u ON h.user_id = u.id
            WHERE h.poc_id = ?
            ORDER BY h.created_at DESC
        `, [id]);
        
        res.json(history);
    } catch (err) {
        logger.error('[POC 재분석 기록 조회 에러]', err.message);
        res.status(500).json({ error: '재분석 기록 조회 중 오류가 발생했습니다' });
    }
});

// ==================== 게시판 API ====================

// 게시글 목록 (검색 지원)
app.get('/api/board/posts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const searchType = req.query.searchType || 'title';

        let whereCondition = '';
        let params = [];

        if (search) {
            switch (searchType) {
                case 'title':
                    whereCondition = 'WHERE p.title LIKE ?';
                    params.push(`%${search}%`);
                    break;
                case 'content':
                    whereCondition = 'WHERE p.content LIKE ?';
                    params.push(`%${search}%`);
                    break;
                case 'author':
                    whereCondition = 'WHERE u.name LIKE ? OR u.username LIKE ?';
                    params.push(`%${search}%`, `%${search}%`);
                    break;
                case 'all':
                    whereCondition = 'WHERE (p.title LIKE ? OR p.content LIKE ? OR u.name LIKE ? OR u.username LIKE ?)';
                    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
                    break;
            }
        }

        const [posts] = await pool.query(`
            SELECT p.*, u.username, u.name as author_name
            FROM board_posts p
            JOIN users u ON p.user_id = u.id
            ${whereCondition}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const [[{ total }]] = await pool.query(`
            SELECT COUNT(*) as total 
            FROM board_posts p
            JOIN users u ON p.user_id = u.id
            ${whereCondition}
        `, params);

        res.json({ posts, total, page, limit });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 게시글 상세
app.get('/api/board/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [posts] = await pool.query(`
            SELECT p.*, u.username, u.name as author_name
            FROM board_posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [id]);

        if (posts.length === 0) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
        }

        // 조회수 증가
        await pool.query('UPDATE board_posts SET views = views + 1 WHERE id = ?', [id]);

        res.json(posts[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 게시글 작성 (보안 강화)
app.post('/api/board/posts', authenticateToken, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: '파일 크기는 10MB를 초과할 수 없습니다' });
            }
            return res.status(400).json({ error: `파일 업로드 오류: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    logger.info('========== 게시글 작성 시작 ==========');
    try {
        const { title, content } = req.body;
        const userId = req.user.id;
        const filePath = req.file ? req.file.filename : null;

        logger.debug('[1] 사용자 ID:', userId);
        logger.debug('[2] 제목:', title);
        logger.debug('[3] 내용 길이:', content ? content.length : 0);
        logger.debug('[4] 파일:', filePath || '없음');

        // 입력값 검증
        const titleValidation = validateInput(title, 1, 200);
        if (!titleValidation.valid) {
            return res.status(400).json({ error: `제목: ${titleValidation.error}` });
        }

        const contentValidation = validateInput(content, 1, 50000);
        if (!contentValidation.valid) {
            return res.status(400).json({ error: `내용: ${contentValidation.error}` });
        }

        // XSS 방어: 내용 sanitize
        const sanitizedContent = sanitizeHtml(content);
        logger.debug('[5] XSS 방어 적용 완료');

        logger.debug('[6] DB 저장 중...');
        const [result] = await pool.query(
            'INSERT INTO board_posts (user_id, title, content, file_path) VALUES (?, ?, ?, ?)',
            [userId, title, sanitizedContent, filePath]
        );

        logger.info('[7] 게시글 작성 완료 - ID:', result.insertId);
        res.json({ message: '게시글이 작성되었습니다', id: result.insertId });
    } catch (err) {
        logger.error('[게시글 작성 에러]', err.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 게시글 수정 (보안 강화 + 에러 처리 개선)
app.put('/api/board/posts/:id', authenticateToken, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                logger.error('[게시글 수정] 파일 크기 초과');
                return res.status(400).json({ error: '파일 크기는 10MB를 초과할 수 없습니다' });
            }
            logger.error('[게시글 수정] Multer 오류:', err.message);
            return res.status(400).json({ error: `파일 업로드 오류: ${err.message}` });
        } else if (err) {
            logger.error('[게시글 수정] 파일 검증 실패:', err.message);
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    logger.info('========== 게시글 수정 시작 ==========');
    try {
        const { id } = req.params;
        const { title, content } = req.body;
        const userId = req.user.id;
        const role = req.user.role;
        const newFilePath = req.file ? req.file.filename : null;

        logger.debug('[1] 게시글 ID:', id);
        logger.debug('[2] 사용자 ID:', userId);
        logger.debug('[3] 새 파일:', newFilePath || '없음');

        // 입력값 검증
        const titleValidation = validateInput(title, 1, 200);
        if (!titleValidation.valid) {
            return res.status(400).json({ error: `제목: ${titleValidation.error}` });
        }

        const contentValidation = validateInput(content, 1, 50000);
        if (!contentValidation.valid) {
            return res.status(400).json({ error: `내용: ${contentValidation.error}` });
        }

        // 게시글 조회 및 권한 확인
        const [posts] = await pool.query('SELECT user_id, file_path FROM board_posts WHERE id = ?', [id]);
        
        if (posts.length === 0) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
        }

        if (posts[0].user_id !== userId && role !== 'admin') {
            return res.status(403).json({ error: '권한이 없습니다' });
        }

        // XSS 방어: 내용 sanitize
        const sanitizedContent = sanitizeHtml(content);
        logger.debug('[4] XSS 방어 적용 완료');

        // 파일 업로드가 있으면 기존 파일 삭제
        if (newFilePath && posts[0].file_path) {
            const oldFilePath = path.join(__dirname, 'uploads', posts[0].file_path);
            try {
                await fs.unlink(oldFilePath);
                logger.debug('[5] 기존 파일 삭제:', posts[0].file_path);
            } catch (err) {
                logger.error('[5] 기존 파일 삭제 실패:', err.message);
            }
        }

        // DB 업데이트
        const updateFilePath = newFilePath || posts[0].file_path;
        await pool.query(
            'UPDATE board_posts SET title = ?, content = ?, file_path = ? WHERE id = ?',
            [title, sanitizedContent, updateFilePath, id]
        );

        logger.info('[6] 게시글 수정 완료');
        res.json({ message: '게시글이 수정되었습니다' });
    } catch (err) {
        logger.error('[게시글 수정 에러]', err.message);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 게시글 삭제
app.delete('/api/board/posts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        const [posts] = await pool.query('SELECT user_id FROM board_posts WHERE id = ?', [id]);
        
        if (posts.length === 0) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
        }

        if (posts[0].user_id !== userId && role !== 'admin') {
            return res.status(403).json({ error: '권한이 없습니다' });
        }

        await pool.query('DELETE FROM board_posts WHERE id = ?', [id]);

        res.json({ message: '게시글이 삭제되었습니다' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// ==================== DB 조회 API (분석가/운영자) ====================

app.post('/api/db/query', authenticateToken, checkRole(['analyst', 'admin']), async (req, res) => {
    try {
        const { table, page = 1, limit = 20, searchField, searchValue } = req.body;
        const offset = (page - 1) * limit;

        logger.info(`[DB 조회] 테이블: ${table}, 페이지: ${page}, 검색: ${searchField}=${searchValue}`);

        const allowedTables = ['Github_CVE_Info', 'CVE_Info', 'CVE_Packet_AI_Analysis'];
        if (!allowedTables.includes(table)) {
            logger.error(`[DB 조회] 잘못된 테이블명: ${table}`);
            return res.status(400).json({ error: '잘못된 테이블명입니다' });
        }

        // WHERE 절 구성
        let whereClause = '';
        let queryParams = [];
        
        if (searchField && searchValue) {
            // 허용된 필드인지 확인
            const allowedFields = {
                'Github_CVE_Info': ['cve', 'title', 'writer', 'link', 'status', 'AI_chk'],
                'CVE_Info': ['CVE_Code', 'state', 'product', 'CVSS_Serverity', 'cweId', 'Attak_Type'],
                'CVE_Packet_AI_Analysis': ['link', 'vuln_stage', 'mitre_tactic', 'mitre_technique']
            };

            if (!allowedFields[table] || !allowedFields[table].includes(searchField)) {
                logger.error(`[DB 조회] 잘못된 검색 필드: ${searchField}`);
                return res.status(400).json({ error: '잘못된 검색 필드입니다' });
            }

            whereClause = ` WHERE ${searchField} LIKE ?`;
            queryParams.push(`%${searchValue}%`);
            logger.debug(`[DB 조회] WHERE 절: ${whereClause}, 값: %${searchValue}%`);
        }

        // 데이터 조회
        const dataQuery = `SELECT * FROM ${table}${whereClause} LIMIT ? OFFSET ?`;
        const dataParams = [...queryParams, limit, offset];
        logger.debug(`[DB 조회] 쿼리: ${dataQuery}`);
        
        const [rows] = await pool.query(dataQuery, dataParams);

        // 총 개수 조회
        const countQuery = `SELECT COUNT(*) as total FROM ${table}${whereClause}`;
        const [[{ total }]] = await pool.query(countQuery, queryParams);

        logger.info(`[DB 조회 성공] ${rows.length}개 조회, 전체: ${total}개`);
        res.json({ rows, total, page, limit });
    } catch (err) {
        logger.error('[DB 조회 실패]', err);
        res.status(500).json({ error: '조회 중 오류가 발생했습니다: ' + err.message });
    }
});

// ==================== 로그 조회 API (운영자) ====================

app.get('/api/admin/logs', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { type } = req.query; // cve_bot, ai_analysis
        const logType = type || 'cve_bot';

        // 로그인 로그는 보안상 제공/노출하지 않음
        if (logType === 'login') {
            return res.status(400).json({ error: '로그인 로그는 보안상 제공하지 않습니다' });
        }

        // 날짜 기반 파일명 (Python 로그는 보통 로컬 시간 기준으로 생성되므로 로컬 날짜 사용)
        const formatYYYYMMDD = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}${mm}${dd}`;
        };
        const now = new Date();
        const dates = [
            formatYYYYMMDD(now),
            formatYYYYMMDD(new Date(now.getTime() - 24 * 60 * 60 * 1000)), // 어제
        ];

        const logsDir = path.join(__dirname, '..', 'logs');

        // logs 폴더에서 "최신 비어있지 않은" 파일 선택
        // - 우선 고정 파일(<name>.log)이 있으면 그걸 사용
        // - 없으면 prefix_YYYYMMDD.log 형태(레거시)를 mtime 기준으로 선택
        const pickLatestNonEmpty = (fixedNames, prefixes) => {
            try {
                if (!fssync.existsSync(logsDir)) return null;

                for (const name of fixedNames) {
                    const full = path.join(logsDir, name);
                    try {
                        if (fssync.existsSync(full) && fssync.statSync(full).size > 0) return full;
                    } catch {
                        // ignore
                    }
                }

                const files = fssync.readdirSync(logsDir);
                const candidates = files
                    .filter((f) => prefixes.some((p) => f.startsWith(`${p}_`) && f.endsWith('.log')))
                    .map((f) => {
                        const full = path.join(logsDir, f);
                        let stat;
                        try { stat = fssync.statSync(full); } catch { return null; }
                        return { full, name: f, mtimeMs: stat.mtimeMs, size: stat.size };
                    })
                    .filter(Boolean)
                    .filter((x) => x.size > 0)
                    .sort((a, b) => b.mtimeMs - a.mtimeMs);
                return candidates.length ? candidates[0].full : null;
            } catch {
                return null;
            }
        };

        // (운영 환경마다 달라질 수 있어) 여러 후보 경로를 순서대로 탐색
        const candidatesByType = {
            cve_bot: [
                ...dates.map((d) => path.join(__dirname, '..', 'logs', `cve_bot_${d}.log`)),
                path.join(__dirname, '..', 'logs', 'cve_bot.log'),
            ],
            ai_analysis: [
                ...dates.map((d) => path.join(__dirname, '..', 'logs', `ai_analysis_${d}.log`)),
                path.join(__dirname, '..', 'logs', 'ai_analysis.log'),
                // 실제 운영에서 많이 쓰이는 AI 분석 로그 파일명
                ...dates.map((d) => path.join(__dirname, '..', 'logs', `ai_analyzer_${d}.log`)),
            ],
        };

        const candidates = candidatesByType[logType];
        if (!candidates) {
            return res.status(400).json({ error: '잘못된 로그 타입입니다' });
        }

        // 1) 최신 비어있지 않은 로그 파일이 있으면 그걸 우선 사용 (오늘/어제 파일이 비어있어도 로그는 보여줘야 함)
        const latestNonEmpty =
            logType === 'cve_bot'
                ? pickLatestNonEmpty(['cve_bot.log'], ['cve_bot'])
                : pickLatestNonEmpty(['ai_analyzer.log', 'ai_analysis.log', 'ai_analysis.log.1'], ['ai_analyzer', 'ai_analysis']);

        if (latestNonEmpty) {
            const content = await fs.readFile(latestNonEmpty, 'utf8');
            const lines = content.split('\n');
            const recentLines = lines.slice(-1000).join('\n');
            return res.json({ logs: `✅ 사용 로그 파일: ${latestNonEmpty}\n\n${recentLines}` });
        }

        let foundPath = null;
        for (const p of candidates) {
            if (fssync.existsSync(p)) {
                foundPath = p;
                break;
            }
        }

        if (!foundPath) {
            return res.json({
                logs: `로그 파일이 없습니다\n\n검색 경로:\n- ${candidates.join('\n- ')}`
            });
        }

        const content = await fs.readFile(foundPath, 'utf8');
        if (!content || !content.trim()) {
            return res.json({
                logs: `📝 로그 파일이 비어있습니다.\n\n경로: ${foundPath}\n\n아직 로그가 기록되지 않았거나, 로그가 다른 위치/파일명으로 생성되고 있습니다.`
            });
        }

        // 마지막 1000줄만 반환
        const lines = content.split('\n');
        const recentLines = lines.slice(-1000).join('\n');
        res.json({ logs: recentLines });
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.json({ logs: '로그 파일이 없습니다' });
        } else {
            console.error(err);
            res.status(500).json({ error: '서버 오류가 발생했습니다' });
        }
    }
});

// ==================== 관리자 API ====================

// 사용자 목록
app.get('/api/admin/users', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, name, nickname, email, phone, role, created_at, last_login FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 사용자 권한 변경
app.put('/api/admin/users/:id/role', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const allowedRoles = ['user', 'analyst', 'admin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ error: '잘못된 권한입니다' });
        }

        await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        res.json({ message: '권한이 변경되었습니다' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 사용자 비밀번호 초기화
app.put('/api/admin/users/:id/reset-password', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({ error: '비밀번호는 최소 4자 이상이어야 합니다' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        
        res.json({ message: '비밀번호가 초기화되었습니다' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 사용자 삭제
app.delete('/api/admin/users/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        // 자기 자신 삭제 방지
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: '자신의 계정은 삭제할 수 없습니다' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: '사용자가 삭제되었습니다' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// ==================== CVE 제한 설정 API ====================

// CVE별 제한 설정 조회 (모든 사용자 조회 가능, 수정은 관리자만)
app.get('/api/admin/cve-limits', authenticateToken, async (req, res) => {
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        const defaultLimit = config.collection?.max_cve_per_item || 5;
        const cveSpecificLimits = config.collection?.cve_specific_limits || {};
        
        res.json({
            defaultLimit,
            cveSpecificLimits,
            isAdmin: req.user.role === 'admin'
        });
    } catch (err) {
        console.error('[CVE Limits API Error]', err);
        logger.error('[CVE Limits API] 설정 파일 읽기 실패:', err);
        res.status(500).json({ error: `설정 파일을 읽을 수 없습니다: ${err.message}` });
    }
});

// ==================== 시스템 설정 관리 API ====================

// CVE 수집 설정 조회 (모든 사용자 조회 가능, 수정은 관리자만)
app.get('/api/admin/system-config/collection', authenticateToken, async (req, res) => {
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        // 민감한 정보 제거 (토큰, 비밀번호 등)
        const safeConfig = {
            github: {
                max_pages: config.github?.max_pages || 100,
                target_years: config.github?.target_years || [2025],
                sort_by: config.github?.sort_by || 'updated',
                sort_order: config.github?.sort_order || 'desc',
                search_query: config.github?.search_query || 'CVE-{year} language:python'
            },
            collection: {
                max_cve_per_item: config.collection?.max_cve_per_item || 5,
                cve_specific_limits: config.collection?.cve_specific_limits || {},
                rate_limit_wait_minutes: config.collection?.rate_limit_wait_minutes || 10,
                auto_collect_cve_info: config.collection?.auto_collect_cve_info !== false,
                auto_create_integrated_data: config.collection?.auto_create_integrated_data !== false,
                last_collection_time: config.collection?.last_collection_time || null
            },
            paths: {
                cve_folder: config.paths?.cve_folder || 'CVE',
                logs_folder: config.paths?.logs_folder || 'logs'
            },
            isAdmin: req.user.role === 'admin'
        };
        
        res.json(safeConfig);
    } catch (err) {
        console.error('[Collection Config API Error]', err);
        logger.error('[Collection Config API] 설정 파일 읽기 실패:', err);
        res.status(500).json({ error: `설정 파일을 읽을 수 없습니다: ${err.message}` });
    }
});

// CVE 수집 설정 수정 (관리자만)
app.put('/api/admin/system-config/collection', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const updates = req.body;
        
        // config.json 파일 읽기
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        // GitHub 설정 업데이트
        if (updates.github) {
            if (!config.github) config.github = {};
            if (updates.github.max_pages !== undefined) config.github.max_pages = updates.github.max_pages;
            if (updates.github.target_years !== undefined) config.github.target_years = updates.github.target_years;
            if (updates.github.sort_by !== undefined) config.github.sort_by = updates.github.sort_by;
            if (updates.github.sort_order !== undefined) config.github.sort_order = updates.github.sort_order;
            if (updates.github.search_query !== undefined) config.github.search_query = updates.github.search_query;
        }
        
        // Collection 설정 업데이트
        if (updates.collection) {
            if (!config.collection) config.collection = {};
            if (updates.collection.max_cve_per_item !== undefined) config.collection.max_cve_per_item = updates.collection.max_cve_per_item;
            if (updates.collection.cve_specific_limits !== undefined) config.collection.cve_specific_limits = updates.collection.cve_specific_limits;
            if (updates.collection.rate_limit_wait_minutes !== undefined) config.collection.rate_limit_wait_minutes = updates.collection.rate_limit_wait_minutes;
            if (updates.collection.auto_collect_cve_info !== undefined) config.collection.auto_collect_cve_info = updates.collection.auto_collect_cve_info;
            if (updates.collection.auto_create_integrated_data !== undefined) config.collection.auto_create_integrated_data = updates.collection.auto_create_integrated_data;
        }
        
        // Paths 설정 업데이트
        if (updates.paths) {
            if (!config.paths) config.paths = {};
            if (updates.paths.cve_folder !== undefined) config.paths.cve_folder = updates.paths.cve_folder;
            if (updates.paths.logs_folder !== undefined) config.paths.logs_folder = updates.paths.logs_folder;
        }
        
        // 파일 저장
        await fs.writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');
        
        logger.info('[Collection Config API] 설정 파일 업데이트 완료');
        res.json({ message: '설정이 저장되었습니다' });
    } catch (err) {
        console.error('[Collection Config API Error]', err);
        logger.error('[Collection Config API] 설정 파일 저장 실패:', err);
        res.status(500).json({ error: `설정 파일을 저장할 수 없습니다: ${err.message}` });
    }
});

// AI 분석 설정 조회 (모든 사용자 조회 가능, 수정은 관리자만)
app.get('/api/admin/system-config/ai-analysis', authenticateToken, async (req, res) => {
    try {
        const configPath = path.join(__dirname, '..', 'ai_analysis_config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        res.json({
            ...config,
            isAdmin: req.user.role === 'admin'
        });
    } catch (err) {
        console.error('[AI Analysis Config API Error]', err);
        logger.error('[AI Analysis Config API] 설정 파일 읽기 실패:', err);
        res.status(500).json({ error: `설정 파일을 읽을 수 없습니다: ${err.message}` });
    }
});

// AI 분석 설정 수정 (관리자만)
app.put('/api/admin/system-config/ai-analysis', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const updates = req.body;
        
        // ai_analysis_config.json 파일 읽기
        const configPath = path.join(__dirname, '..', 'ai_analysis_config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        // 설정 업데이트
        if (updates.parallel_processing !== undefined) {
            config.parallel_processing = updates.parallel_processing;
        }
        if (updates.api_limits !== undefined) {
            config.api_limits = updates.api_limits;
        }
        if (updates.retry !== undefined) {
            config.retry = updates.retry;
        }
        if (updates.poc_limits !== undefined) {
            config.poc_limits = updates.poc_limits;
        }
        
        // 파일 저장
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
        
        logger.info('[AI Analysis Config API] 설정 파일 업데이트 완료');
        res.json({ message: '설정이 저장되었습니다' });
    } catch (err) {
        console.error('[AI Analysis Config API Error]', err);
        logger.error('[AI Analysis Config API] 설정 파일 저장 실패:', err);
        res.status(500).json({ error: `설정 파일을 저장할 수 없습니다: ${err.message}` });
    }
});

// 기본 권한 설정 조회
app.get('/api/admin/system-config/default-role', authenticateToken, async (req, res) => {
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        const defaultRole = config.user?.default_role || 'user';
        
        res.json({
            defaultRole,
            isAdmin: req.user.role === 'admin'
        });
    } catch (err) {
        console.error('[Default Role Config API Error]', err);
        logger.error('[Default Role Config API] 설정 파일 읽기 실패:', err);
        res.status(500).json({ error: `설정 파일을 읽을 수 없습니다: ${err.message}` });
    }
});

// 기본 권한 설정 수정 (관리자만)
app.put('/api/admin/system-config/default-role', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { defaultRole } = req.body;
        
        // 유효성 검사
        if (!['user', 'analyst'].includes(defaultRole)) {
            return res.status(400).json({ error: '기본 권한은 user 또는 analyst여야 합니다' });
        }
        
        // config.json 파일 읽기
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        // 설정 업데이트
        if (!config.user) {
            config.user = {};
        }
        config.user.default_role = defaultRole;
        
        // 파일 저장 (동기화 보장)
        const configString = JSON.stringify(config, null, 4);
        await fs.writeFile(configPath, configString, 'utf-8');
        
        // 저장 확인: 파일을 다시 읽어서 확인
        const verifyData = await fs.readFile(configPath, 'utf-8');
        const verifyConfig = JSON.parse(verifyData);
        const savedRole = verifyConfig.user?.default_role || 'user';
        
        if (savedRole !== defaultRole) {
            logger.error('[Default Role Config API] 저장 확인 실패: 저장된 값이 다릅니다', { expected: defaultRole, actual: savedRole });
            return res.status(500).json({ error: '설정 저장 후 확인에 실패했습니다' });
        }
        
        logger.info('[Default Role Config API] 기본 권한 설정 업데이트 완료:', defaultRole);
        res.json({ 
            message: '기본 권한 설정이 저장되었습니다',
            defaultRole: savedRole
        });
    } catch (err) {
        console.error('[Default Role Config API Error]', err);
        logger.error('[Default Role Config API] 설정 파일 저장 실패:', err);
        res.status(500).json({ error: `설정 파일을 저장할 수 없습니다: ${err.message}` });
    }
});

// CVE별 제한 설정 수정 (관리자만)
app.put('/api/admin/cve-limits', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { defaultLimit, cveSpecificLimits } = req.body;
        
        // 유효성 검사
        if (defaultLimit !== undefined && (typeof defaultLimit !== 'number' || defaultLimit < 1)) {
            return res.status(400).json({ error: '기본 제한은 1 이상의 숫자여야 합니다' });
        }
        
        if (cveSpecificLimits && typeof cveSpecificLimits !== 'object') {
            return res.status(400).json({ error: 'CVE별 제한은 객체 형식이어야 합니다' });
        }
        
        // CVE 코드 형식 검증
        if (cveSpecificLimits) {
            for (const [cve, limit] of Object.entries(cveSpecificLimits)) {
                if (!/^CVE-\d{4}-\d+$/.test(cve)) {
                    return res.status(400).json({ error: `잘못된 CVE 형식: ${cve}` });
                }
                if (typeof limit !== 'number' || limit < 1) {
                    return res.status(400).json({ error: `CVE ${cve}의 제한은 1 이상의 숫자여야 합니다` });
                }
            }
        }
        
        // config.json 파일 읽기
        const configPath = path.join(__dirname, '..', 'config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        // 설정 업데이트
        if (defaultLimit !== undefined) {
            if (!config.collection) {
                config.collection = {};
            }
            config.collection.max_cve_per_item = defaultLimit;
        }
        
        if (cveSpecificLimits !== undefined) {
            if (!config.collection) {
                config.collection = {};
            }
            config.collection.cve_specific_limits = cveSpecificLimits;
        }
        
        // 파일 저장
        await fs.writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');
        
        res.json({ 
            message: '설정이 저장되었습니다',
            defaultLimit: config.collection?.max_cve_per_item,
            cveSpecificLimits: config.collection?.cve_specific_limits || {}
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '설정 파일을 저장할 수 없습니다' });
    }
});

// 사용자 삭제
app.delete('/api/admin/users/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: '자기 자신은 삭제할 수 없습니다' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: '사용자가 삭제되었습니다' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 사용자 닉네임 변경 (관리자)
app.put('/api/admin/users/:id/nickname', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { nickname } = req.body;

        if (!nickname || nickname.length < 2) {
            return res.status(400).json({ error: '닉네임은 최소 2자 이상이어야 합니다' });
        }

        await pool.query('UPDATE users SET nickname = ? WHERE id = ?', [nickname, id]);
        logger.info(`[관리자] 사용자 ${id}의 닉네임을 "${nickname}"으로 변경`);
        
        res.json({ message: '닉네임이 변경되었습니다' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// ==================== 사용자 프로필 API (보안 강화) ====================

// 사용자 본인 정보 조회 (파라미터 변조 방어)
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    logger.info(`[프로필 조회] 사용자 ID: ${req.user.id}, 사용자명: ${req.user.username}`);
    try {
        // 🔒 보안: JWT 토큰의 user.id만 사용 (파라미터 변조 불가)
        const userId = parseInt(req.user.id);
        
        if (!userId || isNaN(userId)) {
            logger.error('[프로필 조회] 잘못된 사용자 ID');
            return res.status(400).json({ error: '잘못된 요청입니다' });
        }

        const [users] = await pool.query(
            'SELECT id, username, name, nickname, email, phone, role, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            logger.error('[프로필 조회] 사용자를 찾을 수 없음');
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }
        
        logger.info('[프로필 조회 성공]');
        res.json(users[0]);
    } catch (err) {
        logger.error('[프로필 조회 실패]', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 사용자 본인 닉네임 변경 (파라미터 변조 방어)
app.put('/api/users/profile/nickname', authenticateToken, async (req, res) => {
    logger.info(`[닉네임 변경] 사용자 ID: ${req.user.id}`);
    try {
        // 🔒 보안: JWT 토큰의 user.id만 사용
        const userId = parseInt(req.user.id);
        const { nickname } = req.body;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: '잘못된 요청입니다' });
        }

        // 입력값 검증
        const validation = validateInput(nickname, 2, 50);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // XSS 방어: 닉네임 sanitize
        const sanitizedNickname = nickname.replace(/<[^>]*>/g, '').trim();

        // 🔒 보안: WHERE 절에 userId 명시 (다른 사용자 수정 불가)
        const [result] = await pool.query(
            'UPDATE users SET nickname = ? WHERE id = ?',
            [sanitizedNickname, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }

        logger.info(`[닉네임 변경 성공] 사용자 ${req.user.username} → "${sanitizedNickname}"`);
        res.json({ message: '닉네임이 변경되었습니다' });
    } catch (err) {
        logger.error('[닉네임 변경 실패]', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// 사용자 본인 비밀번호 변경 (파라미터 변조 방어)
app.put('/api/users/profile/password', authenticateToken, async (req, res) => {
    logger.info(`[비밀번호 변경] 사용자 ID: ${req.user.id}`);
    try {
        // 🔒 보안: JWT 토큰의 user.id만 사용
        const userId = parseInt(req.user.id);
        const { currentPassword, newPassword } = req.body;

        if (!userId || isNaN(userId)) {
            logger.error('[비밀번호 변경] 잘못된 사용자 ID');
            return res.status(400).json({ error: '잘못된 요청입니다' });
        }

        // 입력값 검증
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요' });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ error: '새 비밀번호는 최소 4자 이상이어야 합니다' });
        }

        if (newPassword.length > 100) {
            return res.status(400).json({ error: '비밀번호는 최대 100자까지 가능합니다' });
        }

        // 🔒 보안: 현재 비밀번호 확인 (본인 인증)
        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
        
        if (users.length === 0) {
            logger.error('[비밀번호 변경] 사용자를 찾을 수 없음');
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
        }

        const isValid = await bcrypt.compare(currentPassword, users[0].password);
        if (!isValid) {
            logger.error('[비밀번호 변경] 현재 비밀번호 불일치');
            return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다' });
        }

        // 새 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // 🔒 보안: WHERE 절에 userId 명시 (다른 사용자 수정 불가)
        const [result] = await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: '비밀번호 변경에 실패했습니다' });
        }

        logger.info(`[비밀번호 변경 성공] 사용자: ${req.user.username}`);
        res.json({ message: '비밀번호가 변경되었습니다' });
    } catch (err) {
        logger.error('[비밀번호 변경 실패]', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
});

// ==================== MITRE ATT&CK 정보 로드 ====================

// MITRE ATT&CK 데이터를 메모리에 캐싱
let mitreData = {};

// CSV 파일 로드 함수
async function loadMitreData() {
    return new Promise((resolve, reject) => {
        const results = [];
        const csvPath = path.join(__dirname, 'mitre_attack_matrix.csv');
        
        if (!fssync.existsSync(csvPath)) {
            logger.warn('[MITRE] CSV 파일이 존재하지 않습니다:', csvPath);
            resolve({});
            return;
        }

        // EUC-KR 인코딩으로 읽기
        fssync.createReadStream(csvPath)
            .pipe(iconv.decodeStream('euc-kr'))
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                // Technique ID를 키로 하는 맵 생성
                const dataMap = {};
                results.forEach(row => {
                    const techniqueId = row['기법ID'] || row.techniqueId;
                    if (techniqueId) {
                        dataMap[techniqueId] = {
                            tacticId: row['전술ID'] || row.tacticId,
                            tacticName: row['전술'] || row.tactic,
                            tacticDesc: row['전술 설명'] || row.tacticDesc,
                            techniqueId: techniqueId,
                            techniqueName: row['기법명'] || row.techniqueName,
                            techniqueDesc: row['기법 설명'] || row.techniqueDesc,
                            examples: row['주요 활용 예시'] || row.examples,
                            mitreUrl: row['MITRE 링크'] || row.mitreUrl
                        };
                    }
                });
                
                logger.info(`[MITRE] ${Object.keys(dataMap).length}개 기법 로드 완료`);
                resolve(dataMap);
            })
            .on('error', (err) => {
                logger.error('[MITRE] CSV 로드 실패:', err);
                resolve({});
            });
    });
}

// 서버 시작 시 MITRE 데이터 로드
loadMitreData().then(data => {
    mitreData = data;
});

// ==================== MITRE ATT&CK 정보 API ====================

// MITRE ATT&CK 기법 정보 조회
app.get('/api/mitre/:techniqueId', async (req, res) => {
    try {
        const { techniqueId } = req.params;
        logger.info(`[MITRE 조회] 기법 ID: ${techniqueId}`);

        const info = mitreData[techniqueId];
        
        if (!info) {
            logger.warn(`[MITRE] 기법을 찾을 수 없음: ${techniqueId}`);
            return res.status(404).json({ 
                error: 'MITRE ATT&CK 정보를 찾을 수 없습니다',
                techniqueId 
            });
        }

        res.json(info);
    } catch (err) {
        logger.error('[MITRE 조회 실패]', err);
        res.status(500).json({ error: 'MITRE ATT&CK 정보를 불러오는데 실패했습니다' });
    }
});

// 전술(Tactic)별 기법 목록 조회
app.get('/api/mitre/tactic/:tacticId', async (req, res) => {
    try {
        const { tacticId } = req.params;
        logger.info(`[MITRE 전술 조회] 전술 ID: ${tacticId}`);

        const techniques = Object.values(mitreData).filter(item => item.tacticId === tacticId);
        
        if (techniques.length === 0) {
            return res.status(404).json({ 
                error: '해당 전술의 기법을 찾을 수 없습니다',
                tacticId 
            });
        }

        res.json({ tacticId, techniques });
    } catch (err) {
        logger.error('[MITRE 전술 조회 실패]', err);
        res.status(500).json({ error: 'MITRE ATT&CK 정보를 불러오는데 실패했습니다' });
    }
});

// 공격 단계(stage) 이름으로 MITRE 정보 검색 (개선된 매핑)
app.get('/api/mitre/search/stage/:stageName', async (req, res) => {
    try {
        let { stageName } = req.params;
        stageName = decodeURIComponent(stageName);
        logger.info(`[MITRE 단계 검색] 단계명: ${stageName}`);

        // 공격 단계 이름을 MITRE 전술 이름에 매핑 (한글 포함)
        const stageMapping = {
            // 영문
            'Reconnaissance': 'Reconnaissance',
            'Resource Development': 'Resource Development',
            'Initial Access': 'Initial Access',
            'Execution': 'Execution',
            'Persistence': 'Persistence',
            'Privilege Escalation': 'Privilege Escalation',
            'Defense Evasion': 'Defense Evasion',
            'Credential Access': 'Credential Access',
            'Discovery': 'Discovery',
            'Lateral Movement': 'Lateral Movement',
            'Collection': 'Collection',
            'Command and Control': 'Command and Control',
            'Exfiltration': 'Exfiltration',
            'Impact': 'Impact',
            // 약어 및 변형
            'Exploitation': 'Initial Access',
            'Weaponization': 'Resource Development',
            'Delivery': 'Initial Access',
            'Installation': 'Persistence',
            'C2': 'Command and Control',
            'Actions on Objectives': 'Impact',
            // 한글
            '정찰': 'Reconnaissance',
            '자원 개발': 'Resource Development',
            '초기 접근': 'Initial Access',
            '실행': 'Execution',
            '지속성': 'Persistence',
            '권한 상승': 'Privilege Escalation',
            '방어 회피': 'Defense Evasion',
            '자격증명 접근': 'Credential Access',
            '탐색': 'Discovery',
            '측면 이동': 'Lateral Movement',
            '수집': 'Collection',
            '명령 및 제어': 'Command and Control',
            '유출': 'Exfiltration',
            '영향': 'Impact',
            // 추가 변형 (소문자)
            'reconnaissance': 'Reconnaissance',
            'initial access': 'Initial Access',
            'execution': 'Execution',
            'persistence': 'Persistence',
            'exploitation': 'Initial Access',
            'weaponization': 'Resource Development',
            'delivery': 'Initial Access',
            'installation': 'Persistence',
            'command and control': 'Command and Control',
            'exfiltration': 'Exfiltration',
            'impact': 'Impact'
        };

        // 1단계: 정확한 매칭
        let tacticName = stageMapping[stageName];
        
        // 2단계: 대소문자 무시 매칭
        if (!tacticName) {
            const lowerStageName = stageName.toLowerCase();
            for (const [key, value] of Object.entries(stageMapping)) {
                if (key.toLowerCase() === lowerStageName) {
                    tacticName = value;
                    break;
                }
            }
        }

        // 3단계: 부분 문자열 매칭
        if (!tacticName) {
            for (const [key, value] of Object.entries(stageMapping)) {
                if (stageName.toLowerCase().includes(key.toLowerCase()) || 
                    key.toLowerCase().includes(stageName.toLowerCase())) {
                    tacticName = value;
                    logger.info(`[MITRE] 부분 매칭 성공: ${stageName} → ${key} → ${value}`);
                    break;
                }
            }
        }

        // 4단계: MITRE 데이터에서 직접 검색 (전술 이름)
        if (!tacticName) {
            const techniques = Object.values(mitreData).filter(item => 
                item.tacticName && (
                    item.tacticName.toLowerCase().includes(stageName.toLowerCase()) ||
                    stageName.toLowerCase().includes(item.tacticName.toLowerCase())
                )
            );
            
            if (techniques.length > 0) {
                logger.info(`[MITRE] 직접 검색 성공: ${stageName} → ${techniques[0].tacticName}`);
                return res.json({ 
                    stageName, 
                    tacticName: techniques[0].tacticName,
                    matched: techniques[0],
                    allTechniques: techniques.slice(0, 5)
                });
            }
        }

        // 5단계: MITRE 데이터에서 직접 검색 (기법 이름)
        if (!tacticName) {
            const techniques = Object.values(mitreData).filter(item => 
                item.techniqueName && (
                    item.techniqueName.toLowerCase().includes(stageName.toLowerCase()) ||
                    stageName.toLowerCase().includes(item.techniqueName.toLowerCase())
                )
            );
            
            if (techniques.length > 0) {
                logger.info(`[MITRE] 기법명 검색 성공: ${stageName} → ${techniques[0].techniqueName}`);
                return res.json({ 
                    stageName, 
                    tacticName: techniques[0].tacticName,
                    matched: techniques[0],
                    allTechniques: techniques.slice(0, 5)
                });
            }
        }

        // 매칭 실패
        if (!tacticName) {
            logger.warn(`[MITRE] 공격 단계를 찾을 수 없음: ${stageName}`);
            
            // 사용 가능한 모든 공격 단계 반환
            const availableStages = [...new Set(Object.values(mitreData).map(item => item.tacticName))];
            
            return res.status(404).json({ 
                error: 'MITRE ATT&CK 정보를 찾을 수 없습니다',
                stageName,
                suggestion: '공격 단계 이름을 확인해주세요',
                availableStages: availableStages.slice(0, 10)
            });
        }

        // 전술 이름으로 기법 찾기
        const techniques = Object.values(mitreData).filter(item => 
            item.tacticName && item.tacticName.includes(tacticName)
        );

        if (techniques.length === 0) {
            logger.warn(`[MITRE] 기법을 찾을 수 없음: ${tacticName}`);
            return res.status(404).json({ 
                error: '해당 공격 단계의 기법을 찾을 수 없습니다',
                stageName,
                tacticName
            });
        }

        logger.info(`[MITRE] 검색 성공: ${stageName} → ${tacticName}, ${techniques.length}개 기법 발견`);

        // 대표 기법 반환 (첫 번째 기법)
        res.json({ 
            stageName, 
            tacticName,
            matched: techniques[0], // 대표 기법
            allTechniques: techniques.slice(0, 5), // 상위 5개 기법
            totalTechniques: techniques.length
        });
    } catch (err) {
        logger.error('[MITRE 단계 검색 실패]', err);
        res.status(500).json({ error: 'MITRE ATT&CK 정보를 불러오는데 실패했습니다' });
    }
});

// ==================== 로그 조회 API ====================

// (Legacy) 로그 파일 조회 API - 중복 라우트 방지용으로 비활성화
// 예전 구현은 fs.promises/fs 동기 API 혼용으로 런타임 오류 가능성이 있어
// 신규 구현(/api/admin/logs)만 사용합니다.
app.get('/api/admin/logs-legacy', authenticateToken, async (req, res) => {
    try {
        // 권한 확인
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: '권한이 없습니다' });
        }

        const { type = 'cve_bot' } = req.query;
        logger.info(`[로그 조회] 타입: ${type}, 사용자: ${req.user.username}`);

        // 로그 파일 경로 매핑
        const logFilePaths = {
            'cve_bot': path.join(__dirname, '..', 'logs', 'cve_bot.log'),
            'ai_analysis': path.join(__dirname, '..', 'logs', 'ai_analysis.log'),
            'login': path.join(__dirname, 'wets.txt')
        };

        const logFilePath = logFilePaths[type];
        
        if (!logFilePath) {
            return res.status(400).json({ error: '잘못된 로그 타입입니다' });
        }

        // 파일 존재 확인
        if (!fs.existsSync(logFilePath)) {
            logger.warn(`[로그 조회] 파일 없음: ${logFilePath}`);
            return res.json({ 
                logs: `📝 로그 파일이 아직 생성되지 않았습니다.\n\n경로: ${logFilePath}\n\n시스템이 실행되면 자동으로 로그가 생성됩니다.` 
            });
        }

        // 파일 읽기 (최대 1MB, 마지막 부분만)
        const stats = fs.statSync(logFilePath);
        const fileSize = stats.size;
        const maxSize = 1024 * 1024; // 1MB

        let logs = '';
        if (fileSize > maxSize) {
            // 파일이 1MB보다 크면 마지막 1MB만 읽기
            const fd = fs.openSync(logFilePath, 'r');
            const buffer = Buffer.alloc(maxSize);
            fs.readSync(fd, buffer, 0, maxSize, fileSize - maxSize);
            fs.closeSync(fd);
            logs = `⚠️  파일 크기: ${(fileSize / 1024 / 1024).toFixed(2)}MB (마지막 1MB만 표시)\n\n` + buffer.toString('utf-8');
        } else {
            logs = fs.readFileSync(logFilePath, 'utf-8');
        }

        // 로그가 비어있을 경우
        if (!logs.trim()) {
            logs = `📝 로그 파일이 비어있습니다.\n\n경로: ${logFilePath}\n\n아직 로그가 기록되지 않았습니다.`;
        }

        logger.info(`[로그 조회 성공] 타입: ${type}, 크기: ${fileSize}바이트`);
        res.json({ logs });
    } catch (err) {
        logger.error('[로그 조회 실패]', err);
        res.status(500).json({ error: '로그를 불러오는데 실패했습니다' });
    }
});

// ==================== 대시보드 필터링 API ====================

// 특정 조건의 CVE 목록 조회
app.post('/api/dashboard/filter-cves', async (req, res) => {
    try {
        const { filterType, filterValue, page = 1, limit = 100 } = req.body;
        logger.info(`[CVE 필터링] 타입: ${filterType}, 값: ${filterValue}`);

        const offset = (page - 1) * limit;
        let query = '';
        let params = [];
        let countQuery = '';

        switch (filterType) {
            case 'product':
                // 인덱스 활용 (앞쪽 매칭만)
                query = `
                    SELECT CVE_Code, product, CVSS_Score, CVSS_Serverity, 
                           state, collect_time, descriptions, dateReserved
                    FROM CVE_Info
                    WHERE product LIKE CONCAT(?, '%')
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM CVE_Info
                    WHERE product LIKE CONCAT(?, '%')
                `;
                params = [filterValue, limit, offset];
                break;

            case 'stage':
                query = `
                    SELECT c.CVE_Code, c.product, c.CVSS_Score, c.CVSS_Serverity,
                           c.state, c.collect_time, c.dateReserved, a.vuln_stage
                    FROM CVE_Packet_AI_Analysis a
                    LEFT JOIN Github_CVE_Info g ON a.link = g.link
                    LEFT JOIN CVE_Info c ON g.cve = c.CVE_Code
                    WHERE a.vuln_stage = ? AND c.CVE_Code IS NOT NULL
                    GROUP BY c.CVE_Code
                    ORDER BY 
                        CASE WHEN c.dateReserved IS NULL THEN 1 ELSE 0 END,
                        c.dateReserved DESC, 
                        c.CVE_Code DESC
                    LIMIT ? OFFSET ?
                `;
                countQuery = `
                    SELECT COUNT(DISTINCT c.CVE_Code) as total
                    FROM CVE_Packet_AI_Analysis a
                    LEFT JOIN Github_CVE_Info g ON a.link = g.link
                    LEFT JOIN CVE_Info c ON g.cve = c.CVE_Code
                    WHERE a.vuln_stage = ? AND c.CVE_Code IS NOT NULL
                `;
                params = [filterValue, limit, offset];
                break;

            case 'cwe':
                // 인덱스 활용 (id DESC로 빠르게)
                query = `
                    SELECT CVE_Code, product, CVSS_Score, CVSS_Serverity,
                           state, collect_time, cweId, descriptions, dateReserved
                    FROM CVE_Info
                    WHERE cweId = ?
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM CVE_Info
                    WHERE cweId = ?
                `;
                params = [filterValue, limit, offset];
                break;

            case 'attack_type':
                // 인덱스 활용 (id DESC로 빠르게)
                query = `
                    SELECT CVE_Code, product, CVSS_Score, CVSS_Serverity,
                           state, collect_time, Attak_Type, descriptions, dateReserved
                    FROM CVE_Info
                    WHERE Attak_Type = ?
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?
                `;
                countQuery = `
                    SELECT COUNT(*) as total
                    FROM CVE_Info
                    WHERE Attak_Type = ?
                `;
                params = [filterValue, limit, offset];
                break;

            default:
                return res.status(400).json({ error: '잘못된 필터 타입입니다' });
        }

        // 데이터 조회
        const [cves] = await pool.query(query, params);
        
        // 총 개수 조회
        let total = 0;
        if (countQuery) {
            const countParams = params.slice(0, -2); // LIMIT, OFFSET 제거
            const [countResult] = await pool.query(countQuery, countParams);
            total = countResult[0].total;
        }

        logger.info(`[CVE 필터링 완료] ${cves.length}개 결과 (전체: ${total}개)`);
        const fixCollectTime = arr => (arr || []).map(r => ({ ...r, collect_time: r.collect_time instanceof Date ? toKstDateTimeString(r.collect_time) : r.collect_time }));

        res.json({
            cves: fixCollectTime(cves),
            total,
            page,
            limit,
            filterType,
            filterValue
        });
    } catch (err) {
        logger.error('[CVE 필터링 실패]', err);
        res.status(500).json({ error: '조회 중 오류가 발생했습니다' });
    }
});

// ==================== DB 조회 API ====================

// DB 쿼리 (읽기 전용)
app.post('/api/db/query', authenticateToken, checkRole(['analyst', 'admin']), async (req, res) => {
    try {
        const { table, page = 1, limit = 20, searchField, searchValue } = req.body;
        
        logger.info(`[DB 조회] 사용자: ${req.user.username}, 테이블: ${table}, 검색: ${searchField}=${searchValue}`);

        // 허용된 테이블만 조회 가능
        const allowedTables = ['Github_CVE_Info', 'CVE_Info', 'CVE_Packet_AI_Analysis'];
        if (!allowedTables.includes(table)) {
            return res.status(400).json({ error: '허용되지 않은 테이블입니다' });
        }

        const offset = (page - 1) * limit;

        // 검색 조건 추가
        let whereClause = '';
        let params = [];
        
        if (searchField && searchValue) {
            whereClause = `WHERE ${searchField} LIKE ?`;
            params = [`%${searchValue}%`];
        }

        // 전체 개수 조회
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM ${table} ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // 데이터 조회
        const [rows] = await pool.query(
            `SELECT * FROM ${table} ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        logger.info(`[DB 조회 완료] ${rows.length}개 결과 (전체 ${total}개)`);

        res.json({ rows, total, page, limit });
    } catch (err) {
        logger.error('[DB 조회 실패]', err);
        res.status(500).json({ error: '조회 중 오류가 발생했습니다' });
    }
});

// ==================== 서버 시작 ====================

async function initDatabase() {
    try {
        const conn = await pool.getConnection();

        // users 테이블 생성
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                nickname VARCHAR(50),
                email VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                role ENUM('user', 'analyst', 'admin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // nickname 컬럼 추가 (기존 테이블에 없을 경우)
        try {
            const [nicknameColumn] = await conn.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'TOTORO' 
                AND TABLE_NAME = 'users' 
                AND COLUMN_NAME = 'nickname'
            `);
            
            if (nicknameColumn.length === 0) {
                await conn.query(`ALTER TABLE users ADD COLUMN nickname VARCHAR(50)`);
                console.log('✅ nickname 컬럼 추가 완료');
            } else {
                console.log('ℹ️  nickname 컬럼이 이미 존재합니다');
            }
        } catch (err) {
            console.error('⚠️  nickname 컬럼 추가 실패:', err.message);
        }

        // last_login 컬럼 추가 (기존 테이블에 없을 경우)
        try {
            const [lastLoginColumn] = await conn.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'TOTORO' 
                AND TABLE_NAME = 'users' 
                AND COLUMN_NAME = 'last_login'
            `);
            
            if (lastLoginColumn.length === 0) {
                await conn.query(`ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL COMMENT '마지막 로그인 시간'`);
                console.log('✅ last_login 컬럼 추가 완료');
            } else {
                console.log('ℹ️  last_login 컬럼이 이미 존재합니다');
            }
        } catch (err) {
            console.error('⚠️  last_login 컬럼 추가 실패:', err.message);
        }

        // board_posts 테이블 생성
        await conn.query(`
            CREATE TABLE IF NOT EXISTS board_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(200) NOT NULL,
                content LONGTEXT NOT NULL,
                file_path VARCHAR(255),
                views INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // poc_ratings 테이블 생성 (POC 평가)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS poc_ratings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                poc_id INT NOT NULL,
                user_id INT NOT NULL,
                rating TINYINT NOT NULL COMMENT '1: 좋아요, -1: 싫어요',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_poc (user_id, poc_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_poc_id (poc_id),
                INDEX idx_user_id (user_id)
            )
        `);

        // poc_comments 테이블 생성 (POC 댓글)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS poc_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                poc_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_poc_id (poc_id),
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            )
        `);

        // poc_reanalyze_history 테이블 생성 (재분석 기록)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS poc_reanalyze_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                poc_id INT NOT NULL,
                user_id INT NULL COMMENT '재분석을 요청한 사용자 (사용자 삭제 시 NULL)',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_poc_id (poc_id),
                INDEX idx_created_at (created_at)
            )
        `);

        // chat_messages 테이블 생성
        await conn.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                username VARCHAR(50) NOT NULL,
                nickname VARCHAR(50),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_created_at (created_at)
            )
        `);

        // api_tokens 테이블 생성
        await conn.query(`
            CREATE TABLE IF NOT EXISTS api_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                token VARCHAR(64) UNIQUE NOT NULL COMMENT 'API 토큰',
                name VARCHAR(100) NOT NULL COMMENT '토큰 이름/설명',
                created_by VARCHAR(50) NOT NULL COMMENT '생성자 ID',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시간',
                last_used_at TIMESTAMP NULL COMMENT '마지막 사용 시간',
                expires_at TIMESTAMP NULL COMMENT '만료 시간',
                is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 상태',
                permissions TEXT COMMENT '권한 (JSON 형식)',
                INDEX idx_token (token),
                INDEX idx_created_by (created_by),
                INDEX idx_is_active (is_active)
            )
        `);
        console.log('✅ api_tokens 테이블 생성/확인 완료');

        // 기본 관리자 계정 생성 (없을 경우)
        const [adminExists] = await conn.query('SELECT id FROM users WHERE username = ?', ['admin']);
        if (adminExists.length === 0) {
            const hashedPassword = await bcrypt.hash('admin1234', 10);
            await conn.query(
                'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
                ['admin', hashedPassword, '관리자', 'admin@cvebot.com', 'admin']
            );
            console.log('✅ 기본 관리자 계정 생성 완료 (ID: admin, PW: admin1234)');
        }

        // gemini_accounts 테이블에 daily_quota_limit 컬럼 추가
        try {
            const [quotaLimitColumn] = await conn.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'TOTORO' 
                AND TABLE_NAME = 'gemini_accounts' 
                AND COLUMN_NAME = 'daily_quota_limit'
            `);
            
            if (quotaLimitColumn.length === 0) {
                await conn.query(`ALTER TABLE gemini_accounts ADD COLUMN daily_quota_limit INT DEFAULT 1000 COMMENT '일일 할당량 한도'`);
                console.log('✅ gemini_accounts.daily_quota_limit 컬럼 추가 완료');
                
                // 계정별 한도 설정
                await conn.query(`UPDATE gemini_accounts SET daily_quota_limit = 1000 WHERE account_name = '.gemini_gpt8354'`);
                await conn.query(`UPDATE gemini_accounts SET daily_quota_limit = 1000 WHERE account_name = '.gemini_imjong1111'`);
                await conn.query(`UPDATE gemini_accounts SET daily_quota_limit = 1000 WHERE account_name = '.gemini_lim902931'`);
                await conn.query(`UPDATE gemini_accounts SET daily_quota_limit = 2000 WHERE account_name = '.gemini_now'`);
                await conn.query(`UPDATE gemini_accounts SET daily_quota_limit = 1000 WHERE account_name = '.gemini_shinhands_gpt'`);
                console.log('✅ 계정별 할당량 한도 설정 완료 (now: 2000, 나머지: 1000)');
            } else {
                console.log('ℹ️  daily_quota_limit 컬럼이 이미 존재합니다');
            }
        } catch (err) {
            console.error('⚠️  daily_quota_limit 컬럼 추가 실패:', err.message);
        }

        conn.release();
        console.log('✅ 데이터베이스 초기화 완료');
    } catch (err) {
        console.error('❌ 데이터베이스 초기화 실패:', err);
    }
}

// Socket.IO 채팅 기능
// ============================================
// API 토큰 관리 (관리자 전용)
// ============================================

// 토큰 생성 (운영자만)
app.post('/api/admin/tokens', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '운영자만 접근 가능합니다' });
        }

        const { name, expiresInDays, permissions } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: '토큰 이름을 입력해주세요' });
        }

        // 랜덤 토큰 생성 (64자)
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');

        // 만료 시간 계산
        let expiresAt = null;
        if (expiresInDays && expiresInDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
        }

        // 권한 JSON 변환
        const permissionsJson = permissions ? JSON.stringify(permissions) : JSON.stringify({ read: true, write: false });

        // DB에 저장
        await pool.query(
            'INSERT INTO api_tokens (token, name, created_by, expires_at, permissions) VALUES (?, ?, ?, ?, ?)',
            [token, name, req.user.username, expiresAt, permissionsJson]
        );

        logger.info(`[API 토큰] 생성: ${name} by ${req.user.username}`);

        res.json({
            message: '토큰이 생성되었습니다',
            token,
            name,
            expiresAt,
            permissions: JSON.parse(permissionsJson)
        });

    } catch (err) {
        logger.error('[API 토큰 생성 실패]', err);
        res.status(500).json({ message: '토큰 생성에 실패했습니다' });
    }
});

// 토큰 목록 조회 (운영자만)
app.get('/api/admin/tokens', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '운영자만 접근 가능합니다' });
        }

        const [tokens] = await pool.query(`
            SELECT 
                id,
                CONCAT(LEFT(token, 8), '...', RIGHT(token, 8)) as masked_token,
                token as full_token,
                name,
                created_by,
                created_at,
                last_used_at,
                expires_at,
                is_active,
                permissions
            FROM api_tokens
            ORDER BY created_at DESC
        `);

        // 권한 JSON 파싱
        const processedTokens = tokens.map(t => ({
            ...t,
            permissions: t.permissions ? JSON.parse(t.permissions) : {},
            is_expired: t.expires_at ? new Date(t.expires_at) < new Date() : false
        }));

        res.json(processedTokens);

    } catch (err) {
        logger.error('[API 토큰 목록 조회 실패]', err);
        res.status(500).json({ message: '토큰 목록 조회에 실패했습니다' });
    }
});

// 토큰 삭제 (운영자만)
app.delete('/api/admin/tokens/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '운영자만 접근 가능합니다' });
        }

        const { id } = req.params;

        // 토큰 정보 조회 (로깅용)
        const [tokens] = await pool.query('SELECT name, created_by FROM api_tokens WHERE id = ?', [id]);
        
        if (tokens.length === 0) {
            return res.status(404).json({ message: '토큰을 찾을 수 없습니다' });
        }

        // 삭제
        await pool.query('DELETE FROM api_tokens WHERE id = ?', [id]);

        logger.info(`[API 토큰] 삭제: ${tokens[0].name} by ${req.user.username}`);

        res.json({ message: '토큰이 삭제되었습니다' });

    } catch (err) {
        logger.error('[API 토큰 삭제 실패]', err);
        res.status(500).json({ message: '토큰 삭제에 실패했습니다' });
    }
});

// 토큰 활성화/비활성화 (운영자만)
app.patch('/api/admin/tokens/:id/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '운영자만 접근 가능합니다' });
        }

        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ message: '유효하지 않은 상태 값입니다' });
        }

        // 상태 업데이트
        const [result] = await pool.query(
            'UPDATE api_tokens SET is_active = ? WHERE id = ?',
            [is_active, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '토큰을 찾을 수 없습니다' });
        }

        logger.info(`[API 토큰] 상태 변경: ID ${id} -> ${is_active ? '활성화' : '비활성화'} by ${req.user.username}`);

        res.json({ message: `토큰이 ${is_active ? '활성화' : '비활성화'}되었습니다` });

    } catch (err) {
        logger.error('[API 토큰 상태 변경 실패]', err);
        res.status(500).json({ message: '토큰 상태 변경에 실패했습니다' });
    }
});

// API 토큰 인증 미들웨어
async function authenticateApiToken(req, res, next) {
    try {
        const token = req.headers['x-api-token'] || req.query.api_token;

        if (!token) {
            return res.status(401).json({ message: 'API 토큰이 필요합니다' });
        }

        // DB에서 토큰 확인
        const [tokens] = await pool.query(
            'SELECT * FROM api_tokens WHERE token = ? AND is_active = TRUE',
            [token]
        );

        if (tokens.length === 0) {
            return res.status(401).json({ message: '유효하지 않은 API 토큰입니다' });
        }

        const apiToken = tokens[0];

        // 만료 확인
        if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
            return res.status(401).json({ message: '만료된 API 토큰입니다' });
        }

        // 권한 정보 파싱
        apiToken.permissions = apiToken.permissions ? JSON.parse(apiToken.permissions) : {};

        // 마지막 사용 시간 업데이트
        await pool.query(
            'UPDATE api_tokens SET last_used_at = NOW() WHERE id = ?',
            [apiToken.id]
        );

        req.apiToken = apiToken;
        next();

    } catch (err) {
        logger.error('[API 토큰 인증 실패]', err);
        return res.status(500).json({ message: '토큰 인증 중 오류가 발생했습니다' });
    }
}

// ============================================
// CVE 데이터 Export API (외부 수집용)
// ============================================

// CVE 통합 데이터 조회 (API 토큰 인증)
app.get('/api/export/cve', authenticateApiToken, async (req, res) => {
    logger.info('[API Export] /api/export/cve 엔드포인트 호출됨');
    logger.info(`[API Export] Query Parameters: ${JSON.stringify(req.query)}`);
    
    try {
        // 읽기 권한 확인
        if (!req.apiToken.permissions.read) {
            logger.warn('[API Export] 읽기 권한 없음');
            return res.status(403).json({ 
                success: false,
                message: '읽기 권한이 없습니다' 
            });
        }

        // 페이징 파라미터
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;

        // 필터 파라미터
        const cveFilter = req.query.cve || null;
        const severityFilter = req.query.severity || null;
        const fromDate = req.query.from_date || null;

        logger.info(`[API Export] 요청 - Token: ${req.apiToken.name}, Page: ${page}, Limit: ${limit}`);

        // WHERE 조건 생성
        let whereConditions = [];
        let queryParams = [];

        if (cveFilter) {
            whereConditions.push('g.cve = ?');
            queryParams.push(cveFilter);
        }

        if (severityFilter) {
            whereConditions.push('c.CVSS_Serverity = ?');
            queryParams.push(severityFilter);
        }

        if (fromDate) {
            whereConditions.push('g.collect_time >= ?');
            queryParams.push(fromDate);
        }

        // status가 'N'이고 AI 분석이 완료된 것만 (AI_chk = 'Y')
        whereConditions.push("g.status = 'N'");
        whereConditions.push("g.AI_chk = 'Y'");

        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // 전체 개수 조회
        const countQuery = `
            SELECT COUNT(DISTINCT g.link) as total
            FROM Github_CVE_Info g
            LEFT JOIN CVE_Info c ON g.cve = c.CVE_Code
            ${whereClause}
        `;
        const [countResult] = await pool.query(countQuery, queryParams);
        const totalCount = countResult[0].total;

        // 메인 쿼리 (POC별 데이터 조회)
        const dataQuery = `
            SELECT 
                g.cve,
                g.link,
                g.title,
                g.writer,
                g.date,
                g.collect_time as github_collect_time,
                g.readme,
                g.trans_msg,
                g.download_path,
                c.collect_time as cve_collect_time,
                c.CVE_Code,
                c.state,
                c.dateReserved,
                c.datePublished,
                c.dateUpdated,
                c.product,
                c.descriptions,
                c.effect_version,
                c.cweId,
                c.Attak_Type as attack_type,
                c.CVSS_Score as cvss_score,
                c.CVSS_Vertor as cvss_vector,
                c.CVSS_Serverity as cvss_severity,
                c.CVSS_vertorString as cvss_vector_string,
                c.solutions
            FROM Github_CVE_Info g
            LEFT JOIN CVE_Info c ON g.cve = c.CVE_Code
            ${whereClause}
            ORDER BY g.collect_time DESC
            LIMIT ? OFFSET ?
        `;
        queryParams.push(limit, offset);
        
        const [pocList] = await pool.query(dataQuery, queryParams);

        // 각 POC에 대한 AI 분석 결과 조회
        const results = [];
        for (const poc of pocList) {
            // 공격 단계 조회
            const [attackSteps] = await pool.query(`
                SELECT 
                    step,
                    packet_text,
                    vuln_stage,
                    stage_description,
                    expected_response,
                    mitre_tactic,
                    mitre_technique,
                    snort_rule,
                    cve_summary,
                    remediation
                FROM CVE_Packet_AI_Analysis
                WHERE link = ?
                ORDER BY step ASC
            `, [poc.link]);

            // JSON 구조로 변환 (collect_time: KST 문자열로 변환)
            const result = {
                cve_code: poc.cve,
                github_info: {
                    link: poc.link,
                    title: poc.title,
                    writer: poc.writer,
                    date: poc.date,
                    collect_time: poc.github_collect_time instanceof Date ? toKstDateTimeString(poc.github_collect_time) : poc.github_collect_time,
                    readme: poc.readme,
                    trans_msg: poc.trans_msg,
                    download_path: poc.download_path
                },
                cve_info: poc.CVE_Code ? {
                    collect_time: poc.cve_collect_time instanceof Date ? toKstDateTimeString(poc.cve_collect_time) : poc.cve_collect_time,
                    state: poc.state,
                    date_reserved: poc.dateReserved,
                    date_published: poc.datePublished,
                    date_updated: poc.dateUpdated,
                    product: poc.product,
                    descriptions: poc.descriptions,
                    effect_version: poc.effect_version,
                    cwe_id: poc.cweId,
                    attack_type: poc.attack_type,
                    cvss: {
                        score: poc.cvss_score,
                        vector: poc.cvss_vector,
                        severity: poc.cvss_severity,
                        vector_string: poc.cvss_vector_string
                    },
                    solutions: poc.solutions
                } : null,
                ai_analysis: attackSteps.length > 0 ? {
                    summary: attackSteps[0].cve_summary || '',
                    attack_steps: attackSteps.map(step => ({
                        step: step.step,
                        vuln_stage: step.vuln_stage,
                        stage_description: step.stage_description,
                        packet_text: step.packet_text,
                        expected_response: step.expected_response,
                        mitre_tactic: step.mitre_tactic,
                        mitre_technique: step.mitre_technique,
                        snort_rule: step.snort_rule
                    })),
                    remediation: attackSteps[0].remediation || ''
                } : null
            };

            results.push(result);
        }

        // 응답
        res.json({
            success: true,
            pagination: {
                page: page,
                limit: limit,
                total: totalCount,
                total_pages: Math.ceil(totalCount / limit)
            },
            data: results
        });

        logger.info(`[API Export] 응답 완료 - ${results.length}개 CVE 전송`);

    } catch (err) {
        logger.error('[API Export 실패]', err);
        res.status(500).json({ 
            success: false,
            message: '데이터 조회 중 오류가 발생했습니다',
            error: err.message 
        });
    }
});

// CVE 수집 완료 처리 (status를 'Y'로 업데이트)
app.post('/api/export/cve/confirm', authenticateApiToken, async (req, res) => {
    try {
        // 쓰기 권한 확인 (필요하면 주석 해제)
        // if (!req.apiToken.permissions.write) {
        //     return res.status(403).json({ 
        //         success: false,
        //         message: '쓰기 권한이 없습니다' 
        //     });
        // }

        const { links } = req.body; // links: [link1, link2, ...]

        if (!Array.isArray(links) || links.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'links 배열이 필요합니다'
            });
        }

        logger.info(`[API Export Confirm] ${links.length}개 링크의 status 업데이트 요청`);

        // status를 'Y'로 업데이트
        const placeholders = links.map(() => '?').join(',');
        const updateQuery = `
            UPDATE Github_CVE_Info 
            SET status = 'Y' 
            WHERE link IN (${placeholders})
        `;
        
        const [result] = await pool.query(updateQuery, links);

        logger.info(`[API Export Confirm] ${result.affectedRows}개 행 업데이트 완료`);

        res.json({
            success: true,
            message: `${result.affectedRows}개 데이터의 status가 'Y'로 업데이트되었습니다`,
            updated_count: result.affectedRows
        });

    } catch (err) {
        logger.error('[API Export Confirm 실패]', err);
        res.status(500).json({ 
            success: false,
            message: 'status 업데이트 중 오류가 발생했습니다',
            error: err.message 
        });
    }
});

// CVE 상세 조회 (단일 CVE)
app.get('/api/export/cve/:cveCode', authenticateApiToken, async (req, res) => {
    const { cveCode } = req.params;
    logger.info(`[API Export] /api/export/cve/:cveCode 엔드포인트 호출됨 - cveCode: ${cveCode}`);
    logger.info(`[API Export] Query Parameters: ${JSON.stringify(req.query)}`);
    
    try {
        // 읽기 권한 확인
        if (!req.apiToken.permissions.read) {
            return res.status(403).json({ 
                success: false,
                message: '읽기 권한이 없습니다' 
            });
        }

        logger.info(`[API Export] CVE 상세 조회 - ${cveCode}`);

        // CVE 정보 조회
        const [cveInfo] = await pool.query(`
            SELECT * FROM CVE_Info WHERE CVE_Code = ?
        `, [cveCode]);

        if (cveInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'CVE 정보를 찾을 수 없습니다'
            });
        }

        // 해당 CVE의 모든 POC 조회
        const [pocList] = await pool.query(`
            SELECT * FROM Github_CVE_Info WHERE cve = ? AND AI_chk = 'Y'
        `, [cveCode]);

        // 각 POC의 AI 분석 결과 조회
        const pocs = [];
        for (const poc of pocList) {
            const [attackSteps] = await pool.query(`
                SELECT * FROM CVE_Packet_AI_Analysis WHERE link = ? ORDER BY step ASC
            `, [poc.link]);

            pocs.push({
                github_info: {
                    link: poc.link,
                    title: poc.title,
                    writer: poc.writer,
                    date: poc.date,
                    trans_msg: poc.trans_msg
                },
                ai_analysis: attackSteps.length > 0 ? {
                    summary: attackSteps[0].cve_summary,
                    attack_steps: attackSteps.map(s => ({
                        step: s.step,
                        vuln_stage: s.vuln_stage,
                        stage_description: s.stage_description,
                        packet_text: s.packet_text,
                        expected_response: s.expected_response,
                        mitre_tactic: s.mitre_tactic,
                        mitre_technique: s.mitre_technique,
                        snort_rule: s.snort_rule
                    })),
                    remediation: attackSteps[0].remediation
                } : null
            });
        }

        res.json({
            success: true,
            cve_code: cveCode,
            cve_info: {
                state: cveInfo[0].state,
                date_published: cveInfo[0].datePublished,
                product: cveInfo[0].product,
                descriptions: cveInfo[0].descriptions,
                cvss_score: cveInfo[0].CVSS_Score,
                cvss_severity: cveInfo[0].CVSS_Serverity,
                solutions: cveInfo[0].solutions
            },
            pocs: pocs
        });

    } catch (err) {
        logger.error('[API Export CVE 상세 조회 실패]', err);
        res.status(500).json({ 
            success: false,
            message: '데이터 조회 중 오류가 발생했습니다' 
        });
    }
});

// ==================== AI 할당량 관리 API ====================

// AI 할당량 현황 조회 (오늘) - 운영자만
app.get('/api/gemini/quota/today', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        // 한국 시간대(Asia/Seoul) 기준 오늘 날짜 (Python log_quota_event와 동일)
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
        console.log('[AI 할당량 API] 조회 날짜:', today);
        
        // gemini_quota_events에서 오늘(KST) 집계 - 전체=COUNT(*), success 외는 모두 failed로 집계
        const conn = await pool.getConnection();
        let eventsTotalReq = 0, eventsTotalSucc = 0, eventsTotalFail = 0;
        try {
            await conn.query("SET time_zone = '+09:00'");
            const [evToday] = await conn.query(`
                SELECT 
                    COUNT(*) as req,
                    SUM(CASE WHEN gqe.event_type = 'success' THEN 1 ELSE 0 END) as succ
                FROM gemini_quota_events gqe
                WHERE DATE(gqe.created_at) = ?
            `, [today]);
            eventsTotalReq = Number(evToday[0]?.req || 0);
            eventsTotalSucc = Number(evToday[0]?.succ || 0);
            eventsTotalFail = eventsTotalReq - eventsTotalSucc;
        } finally {
            conn.release();
        }
        
        // gemini_quota_usage 테이블에서 계정별 현황 조회
        const [quotaUsage] = await pool.query(`
            SELECT 
                ga.account_name,
                ga.account_name as account_email,
                ga.account_email as real_account_email,
                ga.daily_quota_limit,
                COALESCE(gqu.request_count, 0) as daily_analysis_count,
                COALESCE(gqu.success_count, 0) as success_count,
                COALESCE(gqu.failed_count, 0) as failed_count,
                COALESCE(gqu.is_quota_exceeded, FALSE) as quota_exhausted_count,
                gqu.quota_exceeded_at as last_429_error_time,
                gqu.updated_at as last_used_at,
                ga.is_active,
                ga.created_at
            FROM gemini_accounts ga
            LEFT JOIN gemini_quota_usage gqu ON ga.id = gqu.account_id AND gqu.usage_date = ?
            ORDER BY ga.display_order ASC, ga.created_at DESC
        `, [today]);
        
        // run_ai_analysis가 현재 사용 중인 계정 (logs/current_running_account.json)
        let currentActiveAccountEmail = null;
        try {
            const currentAccountPath = path.join(__dirname, '..', 'logs', 'current_running_account.json');
            const currentAccountRaw = await fs.readFile(currentAccountPath, 'utf8');
            const currentAccount = JSON.parse(currentAccountRaw);
            currentActiveAccountEmail = currentAccount?.email || null;
        } catch (e) {
            // 파일 없음 또는 파싱 실패 시 무시
        }

        // 계정별 사용률 계산 (일일 분석 건수 기준)
        const accountsWithUsage = quotaUsage.map(acc => ({
            id: acc.account_name,
            account_name: acc.account_name.replace('.gemini_', ''),
            account_email: acc.account_name,
            real_account_email: acc.real_account_email || null,
            display_order: 1,
            daily_quota_limit: acc.daily_quota_limit || 1500,
            request_count: acc.daily_analysis_count,
            success_count: acc.success_count,
            failed_count: acc.failed_count,
            is_quota_exceeded: acc.quota_exceeded_count,
            quota_exceeded_at: acc.last_429_error_time ? toKstDateTimeString(acc.last_429_error_time) : null,
            last_used_at: acc.last_used_at ? toKstDateTimeString(acc.last_used_at) : null,
            usage_rate: acc.daily_analysis_count > 0 
                ? ((acc.daily_analysis_count / (acc.daily_quota_limit || 1500)) * 100).toFixed(1) 
                : 0,
            remaining: (acc.daily_quota_limit || 1500) - acc.daily_analysis_count
        }));
        
        // 전체 통계 - gemini_quota_events 기반 (이벤트 로그와 동일한 수치)
        let totalQuotaLimit = accountsWithUsage.reduce((sum, acc) => sum + (acc.daily_quota_limit || 1500), 0);
        const totalRequests = eventsTotalReq;
        const totalSuccess = eventsTotalSucc;
        const totalFailed = eventsTotalFail;
        
        // 계정별 수치도 events에서 집계 (이벤트 로그와 일치) - KST 세션 유지
        const conn2 = await pool.getConnection();
        let evByAccount = [];
        try {
            await conn2.query("SET time_zone = '+09:00'");
            [evByAccount] = await conn2.query(`
                SELECT 
                    ga.id, ga.account_name,
                    COUNT(*) as req,
                    SUM(CASE WHEN gqe.event_type = 'success' THEN 1 ELSE 0 END) as succ
                FROM gemini_quota_events gqe
                JOIN gemini_accounts ga ON gqe.account_id = ga.id
                WHERE DATE(gqe.created_at) = ?
                GROUP BY ga.id, ga.account_name
            `, [today]);
        } finally {
            conn2.release();
        }
        const byAccountName = Object.fromEntries(evByAccount.map(r => [r.account_name, r]));
        accountsWithUsage.forEach(acc => {
            const match = byAccountName[acc.account_email] || evByAccount.find(e => e.account_name === acc.account_email);
            acc.request_count = match ? Number(match.req || 0) : 0;
            acc.success_count = match ? Number(match.succ || 0) : 0;
            acc.failed_count = acc.request_count - acc.success_count;
            acc.usage_rate = (acc.daily_quota_limit || 1500) > 0 ? ((acc.request_count / (acc.daily_quota_limit || 1500)) * 100).toFixed(1) : 0;
            acc.remaining = (acc.daily_quota_limit || 1500) - acc.request_count;
        });
        
        const totalRemaining = totalQuotaLimit - totalRequests;
        const exhaustedCount = accountsWithUsage.filter(acc => acc.is_quota_exceeded).length;
        const activeCount = accountsWithUsage.filter(acc => !acc.is_quota_exceeded).length;
        // run_ai_analysis 실행 중이면 현재 계정만 '오늘 사용', 아니면 0
        let usedTodayCount = currentActiveAccountEmail
            ? (accountsWithUsage.some(a => (a.real_account_email || '').toLowerCase() === (currentActiveAccountEmail || '').toLowerCase()) ? 1 : 0)
            : 0;
        
        res.json({
            date: today,
            accounts: accountsWithUsage,
            current_active_account: currentActiveAccountEmail,
            summary: {
                total_accounts: accountsWithUsage.length,
                active_accounts: activeCount,
                exhausted_accounts: exhaustedCount,
                used_today_count: usedTodayCount,
                total_quota_limit: totalQuotaLimit,
                total_requests: totalRequests,
                total_success: totalSuccess,
                total_failed: totalFailed,
                total_remaining: totalRemaining,
                overall_usage_rate: totalQuotaLimit > 0 ? ((totalRequests / totalQuotaLimit) * 100).toFixed(1) : 0,
                success_rate: totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(1) : 0
            }
        });
    } catch (err) {
        logger.error('[AI 할당량 조회 실패]', err);
        res.status(500).json({ error: 'AI 할당량 조회 중 오류가 발생했습니다' });
    }
});

// AI 할당량 상세 내역 (최근 7일) - 운영자만
app.get('/api/gemini/quota/history', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        
        // gemini_quota_usage 테이블에서 최근 7일 데이터 조회
        const [history] = await pool.query(`
            SELECT 
                gqu.usage_date,
                ga.account_name as account_email,
                gqu.request_count,
                gqu.success_count,
                gqu.failed_count,
                gqu.is_quota_exceeded,
                gqu.quota_exceeded_at,
                gqu.updated_at
            FROM gemini_quota_usage gqu
            JOIN gemini_accounts ga ON gqu.account_id = ga.id
            WHERE gqu.usage_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            ORDER BY gqu.usage_date DESC, ga.display_order ASC
        `, [days]);
        
        // 날짜별 통계 집계
        const dailyStats = {};
        history.forEach(row => {
            const dateKey = row.usage_date.toISOString().split('T')[0];
            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = {
                    date: dateKey,
                    total_requests: 0,
                    total_success: 0,
                    total_failed: 0,
                    accounts: []
                };
            }
            dailyStats[dateKey].total_requests += row.request_count;
            dailyStats[dateKey].total_success += row.success_count;
            dailyStats[dateKey].total_failed += row.failed_count;
            dailyStats[dateKey].accounts.push({
                account_name: row.account_email.split('@')[0],
                request_count: row.request_count,
                success_count: row.success_count,
                is_quota_exceeded: row.is_quota_exceeded
            });
        });
        
        res.json({
            history: Object.values(dailyStats).sort((a, b) => b.date.localeCompare(a.date)),
            raw_data: history
        });
    } catch (err) {
        logger.error('[AI 할당량 히스토리 조회 실패]', err);
        res.status(500).json({ error: 'AI 할당량 히스토리 조회 중 오류가 발생했습니다' });
    }
});

// AI 할당량 이벤트 로그 조회 - 운영자만
app.get('/api/gemini/quota/events', authenticateToken, checkRole(['admin']), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const accountEmail = req.query.account || null;
        
        let whereClause = '';
        let params = [];
        
        if (accountEmail) {
            whereClause = 'WHERE account_email = ?';
            params.push(accountEmail);
        }
        
        // gemini_quota_events 테이블에서 이벤트 로그 조회 (POC ID 포함)
        const [quotaData] = await pool.query(`
            SELECT 
                gqe.id,
                ga.account_name as account_email,
                gqe.event_type,
                gqe.cve_code,
                gqe.poc_link,
                gqe.error_message,
                gqe.created_at,
                gch.id as poc_id
            FROM gemini_quota_events gqe
            JOIN gemini_accounts ga ON gqe.account_id = ga.id
            LEFT JOIN Github_CVE_Info gch ON gqe.poc_link = gch.link
            ${accountEmail ? 'WHERE ga.account_name = ?' : ''}
            ORDER BY gqe.created_at DESC
            LIMIT ?
        `, [...(accountEmail ? [accountEmail] : []), limit]);
        
        // 이벤트 로그 형태로 변환 (created_at: mysql2가 KST를 UTC로 잘못 해석 → toKstDateTimeString으로 보정)
        const events = quotaData.map((row, index) => ({
            id: row.id,
            event_type: row.event_type,
            cve_code: row.cve_code || '',
            poc_link: row.poc_link || '',
            poc_id: row.poc_id || null,
            error_message: row.error_message || '',
            created_at: row.created_at ? toKstDateTimeString(row.created_at) : null,
            account_name: row.account_email.split('@')[0]
        }));
        
        res.json({ events });
    } catch (err) {
        logger.error('[AI 할당량 이벤트 조회 실패]', err);
        res.status(500).json({ error: 'AI 할당량 이벤트 조회 중 오류가 발생했습니다' });
    }
});

// 채팅 이미지 업로드
app.post('/api/chat/upload-image', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '이미지 파일이 필요합니다' });
        }

        // 이미지 파일인지 확인
        if (!req.file.mimetype.startsWith('image/')) {
            // 파일 삭제
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('파일 삭제 실패:', err);
            }
            return res.status(400).json({ error: '이미지 파일만 업로드 가능합니다' });
        }

        // 이미지 URL 생성
        const imageUrl = `/uploads/${req.file.filename}`;
        
        res.json({
            success: true,
            imageUrl: imageUrl,
            fileName: req.file.filename,
            originalName: req.file.originalname
        });

        logger.info(`[채팅 이미지 업로드] ${req.user.username}: ${req.file.originalname}`);
    } catch (err) {
        logger.error('[채팅 이미지 업로드 실패]', err);
        res.status(500).json({ error: '이미지 업로드에 실패했습니다' });
    }
});

// ============================================
// Socket.IO 연결 처리
// ============================================
io.on('connection', (socket) => {
    logger.info('[Socket.IO] 새로운 연결:', socket.id);

    // 최근 메시지 조회 (3일치)
    socket.on('load_messages', async () => {
        try {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const [messages] = await pool.query(
                `SELECT id, user_id, username, nickname, message, image_url, image_name, created_at 
                 FROM chat_messages 
                 WHERE created_at >= ?
                 ORDER BY created_at ASC`,
                [threeDaysAgo]
            );
            socket.emit('messages_loaded', messages);
            logger.debug(`[Socket.IO] 메시지 로드: ${messages.length}개`);
        } catch (err) {
            logger.error('[Socket.IO] 메시지 로드 실패:', err);
        }
    });

    // 새 메시지 전송
    socket.on('send_message', async (data) => {
        try {
            const { userId, username, nickname, message, imageUrl, imageName } = data;
            
            logger.info(`[Socket.IO] 메시지 수신:`, { 
                userId: userId, 
                username: username, 
                message: message, 
                imageUrl: imageUrl, 
                imageName: imageName,
                messageType: typeof message,
                imageUrlType: typeof imageUrl
            });
            
            // 필수 필드 검증
            if (!userId || !username) {
                throw new Error('사용자 정보가 누락되었습니다');
            }
            
            // DB에 저장할 값 준비 (message 컬럼이 NOT NULL이므로 null/undefined 대신 빈 문자열 사용)
            const messageValue = !message || message === null || message === undefined ? '' : message;
            const imageUrlValue = imageUrl || null;
            const imageNameValue = imageName || null;
            
            logger.debug(`[Socket.IO] 저장할 값들:`, {
                userId,
                username, 
                nickname: nickname || username,
                message: messageValue,
                imageUrl: imageUrlValue,
                imageName: imageNameValue
            });
            
            const [result] = await pool.query(
                'INSERT INTO chat_messages (user_id, username, nickname, message, image_url, image_name) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, username, nickname || username, messageValue, imageUrlValue, imageNameValue]
            );
            logger.debug(`[Socket.IO] DB 저장 완료, ID: ${result.insertId}`);
            
            const newMessage = {
                id: result.insertId,
                user_id: userId,
                username,
                nickname: nickname || username,
                message: messageValue,
                image_url: imageUrlValue,
                image_name: imageNameValue,
                created_at: new Date()
            };
            
            logger.info(`[Socket.IO] 새 메시지 객체 생성:`, newMessage);
            
            // 모든 클라이언트에게 전송
            io.emit('new_message', newMessage);
            logger.info(`[Socket.IO] 새 메시지 전송 완료: ${username} - ${messageValue ? messageValue.substring(0, 20) : (imageUrlValue ? '[이미지]' : '[빈 메시지]')}`);
        } catch (err) {
            logger.error('[Socket.IO] 메시지 전송 실패:', err);
            logger.error('[Socket.IO] 에러 상세:', {
                message: err.message,
                stack: err.stack,
                data: data
            });
            socket.emit('error', `메시지 전송에 실패했습니다: ${err.message}`);
        }
    });

    socket.on('disconnect', () => {
        logger.info('[Socket.IO] 연결 해제:', socket.id);
    });
});

// 3일 이상 된 채팅 메시지 자동 삭제 (매일 실행)
setInterval(async () => {
    try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const [result] = await pool.query('DELETE FROM chat_messages WHERE created_at < ?', [threeDaysAgo]);
        if (result.affectedRows > 0) {
            logger.info(`[채팅 정리] ${result.affectedRows}개의 오래된 메시지 삭제`);
        }
    } catch (err) {
        logger.error('[채팅 정리 실패]', err);
    }
}, 24 * 60 * 60 * 1000); // 24시간마다

// 채팅 메시지 테이블에 이미지 필드 추가
async function addImageFieldsToChatMessages() {
    try {
        // 먼저 테이블 구조 확인
        const [columns] = await pool.query('SHOW COLUMNS FROM chat_messages');
        const columnNames = columns.map(col => col.Field);
        
        // image_url 필드가 없으면 추가
        if (!columnNames.includes('image_url')) {
            await pool.query(`
                ALTER TABLE chat_messages 
                ADD COLUMN image_url VARCHAR(500) NULL
            `);
            console.log('✅ image_url 필드 추가 완료');
        }
        
        // image_name 필드가 없으면 추가
        if (!columnNames.includes('image_name')) {
            await pool.query(`
                ALTER TABLE chat_messages 
                ADD COLUMN image_name VARCHAR(255) NULL
            `);
            console.log('✅ image_name 필드 추가 완료');
        }
        
        console.log('✅ 채팅 메시지 테이블 이미지 필드 확인 완료');
    } catch (err) {
        console.log('⚠️ 채팅 메시지 테이블 이미지 필드 추가 실패:', err.message);
    }
}

initDatabase().then(async () => {
    // 채팅 이미지 필드 추가
    await addImageFieldsToChatMessages();
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    
    // 모든 네트워크 인터페이스의 IPv4 주소 수집
    for (const interfaceName in networkInterfaces) {
        for (const iface of networkInterfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    
    // HTTP 서버 시작
    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🚀 CVE Bot 웹서버 실행 중`);
        console.log(`\n📡 HTTP 서버:`);
        console.log(`   📍 로컬: http://localhost:${HTTP_PORT}`);
        if (addresses.length > 0) {
            addresses.forEach(addr => {
                console.log(`   📍 외부: http://${addr}:${HTTP_PORT}`);
            });
        }
    });
    
    // HTTPS 서버 시작 (인증서가 있는 경우)
    if (httpsServer) {
        httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
            console.log(`\n🔒 HTTPS 서버:`);
            console.log(`   📍 로컬: https://localhost:${HTTPS_PORT}`);
            if (addresses.length > 0) {
                addresses.forEach(addr => {
                    console.log(`   📍 외부: https://${addr}:${HTTPS_PORT}`);
                });
            }
            if (isLetsEncrypt) {
                console.log(`   ✅ Let's Encrypt 인증서 사용 (신뢰할 수 있는 인증서)`);
            } else {
                console.log(`   ⚠️  자체 서명 인증서 사용 (브라우저 경고 무시 필요)`);
                console.log(`   💡 나중에 Let's Encrypt로 교체 가능`);
            }
        });
    } else {
        console.log(`\n⚠️  HTTPS 비활성화 (인증서 없음)`);
    }
    
    console.log(`\n🔐 기본 관리자: ID=admin, PW=admin1234`);
    console.log(`📝 현재 로그 레벨: ${logger.getLevel()}`);
    console.log(`💡 로그 레벨 변경: logger.config.json 수정 후 서버 재시작`);
    console.log(`${'='.repeat(80)}\n`);
});

