import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert, 
  InputAdornment, IconButton, Stepper, Step, StepLabel, CircularProgress, LinearProgress
} from '@mui/material';
import { PersonAdd, Email, CheckCircle, Send, Timer } from '@mui/icons-material';
import axios from 'axios';
import { API_URL, SITE_NAME } from '../config';

export default function Register() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    username: '', password: '', confirmPassword: '',
    name: '', nickname: '', email: '', phone: '', code: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [debugLog, setDebugLog] = useState([]);

  const steps = ['이메일 인증', '정보 입력', '가입 완료'];

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
    const log = { timestamp, message, type };
    setDebugLog(prev => [...prev.slice(-4), log]); // 최근 5개만 유지
    console.log(`[${timestamp}] ${message}`);
  };

  // 타이머 카운트다운
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          addLog('⏰ 인증 코드 만료! 재발송 필요', 'error');
          setError('인증 코드가 만료되었습니다. 다시 발송해주세요.');
          setCodeSent(false);
          setForm((prevForm) => ({ ...prevForm, code: '' }));
          return 0;
        }
        if (prev === 60) {
          addLog('⚠️ 1분 남았습니다!', 'error');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 11자리 제한
    const limitedNumbers = numbers.slice(0, 11);
    
    // 포맷팅
    if (limitedNumbers.length <= 3) {
      return limitedNumbers;
    } else if (limitedNumbers.length <= 7) {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`;
    } else {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 7)}-${limitedNumbers.slice(7)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setForm({ ...form, phone: formatted });
  };

  const handleSendCode = async () => {
    setError('');
    setSuccess('');
    addLog('🚀 인증 코드 발송 시작', 'info');
    
    if (!form.email) {
      addLog('❌ 이메일을 입력해주세요', 'error');
      setError('이메일을 입력해주세요');
      return;
    }

    addLog(`📧 이메일: ${form.email}`, 'info');
    setLoading(true);
    addLog('📡 서버에 요청 보내는 중...', 'info');
    
    try {
      const response = await axios.post(`${API_URL}/auth/send-verification`, { email: form.email });
      addLog('✅ 인증 코드 발송 완료!', 'success');
      
      setCodeSent(true);
      setTimeLeft(180); // 3분 = 180초
      addLog('⏰ 타이머 시작: 3분 (180초)', 'info');
      setSuccess('인증 코드가 이메일로 전송되었습니다. (3분간 유효)');
    } catch (err) {
      addLog(`❌ 에러: ${err.response?.data?.error || err.message}`, 'error');
      setError(err.response?.data?.error || '이메일 전송 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setSuccess('');
    addLog('🔐 인증 코드 확인 시작', 'info');

    if (!form.code) {
      addLog('❌ 인증 코드를 입력해주세요', 'error');
      setError('인증 코드를 입력해주세요');
      return;
    }

    addLog(`🔢 코드: ${form.code} (남은 시간: ${Math.floor(timeLeft / 60)}분 ${timeLeft % 60}초)`, 'info');
    setLoading(true);
    addLog('📡 서버에 확인 요청 중...', 'info');
    
    try {
      const response = await axios.post(`${API_URL}/auth/verify-code`, { 
        email: form.email, 
        code: form.code 
      });
      addLog('✅ 인증 완료!', 'success');
      
      setEmailVerified(true);
      setSuccess('이메일 인증이 완료되었습니다!');
      
      addLog('➡️ 1초 후 다음 단계로 이동', 'info');
      setTimeout(() => {
        setActiveStep(1);
        addLog('📝 정보 입력 단계', 'info');
      }, 1000);
    } catch (err) {
      addLog(`❌ 에러: ${err.response?.data?.error || err.message}`, 'error');
      setError(err.response?.data?.error || '인증 코드가 일치하지 않습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    addLog('👤 회원가입 시작', 'info');

    if (!emailVerified) {
      addLog('❌ 이메일 인증을 먼저 완료해주세요', 'error');
      setError('이메일 인증을 먼저 완료해주세요');
      return;
    }

    if (!form.name || form.name.trim().length < 2) {
      addLog('❌ 이름은 최소 2자 이상 입력해주세요', 'error');
      setError('이름은 최소 2자 이상 입력해주세요');
      return;
    }

    if (!form.phone || form.phone.length < 12) {
      addLog('❌ 전화번호를 올바르게 입력해주세요 (예: 010-1234-5678)', 'error');
      setError('전화번호를 올바르게 입력해주세요 (예: 010-1234-5678)');
      return;
    }

    if (form.password !== form.confirmPassword) {
      addLog('❌ 비밀번호가 일치하지 않습니다', 'error');
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    if (form.password.length < 4) {
      addLog('❌ 비밀번호는 최소 4자 이상', 'error');
      setError('비밀번호는 최소 4자 이상이어야 합니다');
      return;
    }

    addLog(`📝 아이디: ${form.username}, 이름: ${form.name}, 전화번호: ${form.phone}`, 'info');
    setLoading(true);
    addLog('📡 서버에 회원가입 요청 중...', 'info');
    
    try {
      const response = await axios.post(`${API_URL}/auth/register`, form);
      addLog('✅ 회원가입 완료!', 'success');
      
      setActiveStep(2);
      setSuccess('회원가입이 완료되었습니다!');
      
      addLog('➡️ 2초 후 로그인 페이지로 이동', 'info');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      addLog(`❌ 에러: ${err.response?.data?.error || err.message}`, 'error');
      setError(err.response?.data?.error || '회원가입 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', display: 'flex', alignItems: 'center', py: 4 }}>
      <Container maxWidth="sm">
        <Paper elevation={10} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <img src="/logo.png" alt="Logo" style={{ width: 60, height: 60, borderRadius: '50%' }} />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              회원가입
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>{SITE_NAME}</Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {/* 실시간 로그 */}
          {debugLog.length > 0 && (
            <Paper sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', maxHeight: 150, overflow: 'auto' }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                📋 진행 상황
              </Typography>
              {debugLog.map((log, idx) => (
                <Typography 
                  key={idx} 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    fontFamily: 'monospace',
                    color: log.type === 'error' ? '#d32f2f' : log.type === 'success' ? '#388e3c' : '#666',
                    mb: 0.5
                  }}
                >
                  [{log.timestamp}] {log.message}
                </Typography>
              ))}
            </Paper>
          )}

          {activeStep === 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                회원가입을 위해 이메일 인증을 진행해주세요
              </Typography>
              
              <TextField 
                fullWidth 
                label="이메일" 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                margin="normal" 
                required 
                disabled={codeSent}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                  endAdornment: codeSent && (
                    <InputAdornment position="end">
                      <CheckCircle color="success" />
                    </InputAdornment>
                  )
                }}
              />

              {!codeSent ? (
                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large" 
                  onClick={handleSendCode}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                  sx={{ mt: 2 }}
                >
                  {loading ? '전송 중...' : '인증 코드 발송'}
                </Button>
              ) : (
                <>
                  {/* 타이머 표시 */}
                  {timeLeft > 0 && !emailVerified && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: timeLeft <= 60 ? '#fff3e0' : '#e3f2fd', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        <Timer sx={{ fontSize: 20, mr: 1, color: timeLeft <= 60 ? '#f57c00' : '#1976d2' }} />
                        <Typography 
                          variant="h5" 
                          fontWeight={700}
                          color={timeLeft <= 60 ? '#f57c00' : '#1976d2'}
                        >
                          {formatTime(timeLeft)}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={(timeLeft / 180) * 100}
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: 'rgba(0,0,0,0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: timeLeft <= 60 ? '#f57c00' : '#1976d2'
                          }
                        }}
                      />
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ display: 'block', textAlign: 'center', mt: 1 }}
                      >
                        {timeLeft <= 60 ? '⚠️ 곧 만료됩니다!' : '인증 코드 유효 시간'}
                      </Typography>
                    </Box>
                  )}

                  <TextField 
                    fullWidth 
                    label="인증 코드 (6자리)" 
                    value={form.code} 
                    onChange={(e) => setForm({ ...form, code: e.target.value })} 
                    margin="normal" 
                    required 
                    disabled={emailVerified || timeLeft === 0}
                    inputProps={{ maxLength: 6, style: { letterSpacing: '8px', fontSize: '20px', textAlign: 'center' } }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      onClick={handleSendCode}
                      disabled={loading}
                    >
                      재발송
                    </Button>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      onClick={handleVerifyCode}
                      disabled={loading || emailVerified || timeLeft === 0}
                      startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                    >
                      {loading ? '확인 중...' : '인증하기'}
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}

          {activeStep === 1 && (
            <form onSubmit={handleSubmit}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                회원 정보를 입력해주세요
              </Typography>
              
              <TextField 
                fullWidth 
                label="아이디" 
                value={form.username} 
                onChange={(e) => setForm({ ...form, username: e.target.value })} 
                margin="normal" 
                required 
                helperText="최소 3자 이상"
              />
              <TextField 
                fullWidth 
                label="비밀번호" 
                type="password" 
                value={form.password} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                margin="normal" 
                required 
                helperText="최소 4자 이상" 
              />
              <TextField 
                fullWidth 
                label="비밀번호 확인" 
                type="password" 
                value={form.confirmPassword} 
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} 
                margin="normal" 
                required 
              />
              <TextField 
                fullWidth 
                label="이름 *" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                margin="normal" 
                required 
                error={form.name && form.name.trim().length < 2}
                helperText="최소 2자 이상 (필수)"
              />
              <TextField 
                fullWidth 
                label="닉네임" 
                value={form.nickname} 
                onChange={(e) => setForm({ ...form, nickname: e.target.value })} 
                margin="normal" 
                helperText="다른 사용자에게 표시될 이름입니다 (선택)"
              />
              <TextField 
                fullWidth 
                label="이메일" 
                type="email" 
                value={form.email} 
                margin="normal" 
                disabled 
              />
              <TextField 
                fullWidth 
                label="전화번호 *" 
                value={form.phone} 
                onChange={handlePhoneChange} 
                margin="normal" 
                required 
                placeholder="010-1234-5678" 
                helperText="자동으로 '-' 포맷 적용됩니다 (필수)"
                error={form.phone && form.phone.length > 0 && form.phone.length < 12}
                inputProps={{ maxLength: 13 }}
              />
              
              <Button 
                type="submit" 
                fullWidth 
                variant="contained" 
                size="large" 
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
                startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
              >
                {loading ? '가입 중...' : '가입하기'}
              </Button>
            </form>
          )}

          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>
                회원가입 완료!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                잠시 후 로그인 페이지로 이동합니다...
              </Typography>
              <CircularProgress />
            </Box>
          )}

          {activeStep < 2 && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button component={Link} to="/login">
                로그인으로 돌아가기
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
