import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container, Paper, TextField, Button, Typography, Box, Alert, Tabs, Tab,
  LinearProgress, Chip
} from '@mui/material';
import { Search, CheckCircle, Timer, Lock } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';

export default function FindAccount() {
  const [tab, setTab] = useState(0);
  const [findIdForm, setFindIdForm] = useState({ name: '', email: '' });
  
  // 비밀번호 재설정 3단계 프로세스
  const [resetStep, setResetStep] = useState(1);
  const [resetPwForm, setResetPwForm] = useState({ 
    username: '', 
    email: '', 
    code: '', 
    newPassword: '' 
  });
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && codeSent) {
      setCodeSent(false);
      setError('인증 시간이 만료되었습니다. 다시 발송해주세요.');
    }
  }, [countdown, codeSent]);

  const handleFindId = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      const res = await axios.post(`${API_URL}/auth/find-id`, findIdForm);
      setMessage(`아이디: ${res.data.username}`);
    } catch (err) {
      setError(err.response?.data?.error || '사용자를 찾을 수 없습니다');
    }
  };

  // 1단계: 인증 코드 발송
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!resetPwForm.username || !resetPwForm.email) {
      setError('아이디와 이메일을 입력해주세요');
      return;
    }
    
    try {
      const res = await axios.post(`${API_URL}/auth/reset-password-send-code`, {
        username: resetPwForm.username,
        email: resetPwForm.email
      });
      
      setCodeSent(true);
      setCountdown(180); // 3분
      setMessage(res.data.message || '인증 코드가 이메일로 발송되었습니다');
      setResetStep(2);
    } catch (err) {
      setError(err.response?.data?.error || '인증 코드 발송에 실패했습니다');
    }
  };

  // 2단계: 인증 코드 확인
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!resetPwForm.code) {
      setError('인증 코드를 입력해주세요');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/auth/reset-password-verify-code`, {
        email: resetPwForm.email,
        code: resetPwForm.code
      });
      
      setIsVerified(true);
      setMessage('✅ 인증되었습니다! 새 비밀번호를 입력해주세요');
      setResetStep(3);
    } catch (err) {
      setError(err.response?.data?.error || '인증 코드가 일치하지 않습니다');
    }
  };

  // 3단계: 비밀번호 재설정
  const handleResetPw = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!resetPwForm.newPassword) {
      setError('새 비밀번호를 입력해주세요');
      return;
    }
    
    if (resetPwForm.newPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        username: resetPwForm.username,
        email: resetPwForm.email,
        code: resetPwForm.code,
        newPassword: resetPwForm.newPassword
      });
      
      setMessage('🎉 비밀번호가 재설정되었습니다! 로그인 페이지로 이동합니다...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || '비밀번호 재설정 실패');
    }
  };

  // 탭 변경 시 초기화
  const handleTabChange = (e, v) => {
    setTab(v);
    setResetStep(1);
    setResetPwForm({ username: '', email: '', code: '', newPassword: '' });
    setCodeSent(false);
    setIsVerified(false);
    setCountdown(0);
    setMessage('');
    setError('');
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper elevation={10} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <img src="/logo.png" alt="Logo" style={{ width: 60, height: 60, borderRadius: '50%' }} />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              계정 찾기
            </Typography>
          </Box>

          <Tabs value={tab} onChange={handleTabChange} centered sx={{ mb: 3 }}>
            <Tab label="ID 찾기" />
            <Tab label="PW 재설정" />
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

          {tab === 0 ? (
            // ID 찾기
            <form onSubmit={handleFindId}>
              <TextField fullWidth label="이름" value={findIdForm.name} onChange={(e) => setFindIdForm({ ...findIdForm, name: e.target.value })} margin="normal" required />
              <TextField fullWidth label="이메일" type="email" value={findIdForm.email} onChange={(e) => setFindIdForm({ ...findIdForm, email: e.target.value })} margin="normal" required />
              <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3 }}>
                ID 찾기
              </Button>
            </form>
          ) : (
            // 비밀번호 재설정 (3단계 프로세스)
            <Box>
              {/* 단계 표시 */}
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip 
                  icon={resetStep >= 1 ? <CheckCircle /> : <Timer />}
                  label="1. 본인확인" 
                  color={resetStep >= 1 ? "primary" : "default"}
                  variant={resetStep === 1 ? "filled" : "outlined"}
                />
                <Box sx={{ flex: 1, height: 2, bgcolor: resetStep >= 2 ? 'primary.main' : 'grey.300', mx: 1 }} />
                <Chip 
                  icon={resetStep >= 2 ? <CheckCircle /> : <Lock />}
                  label="2. 인증" 
                  color={resetStep >= 2 ? "primary" : "default"}
                  variant={resetStep === 2 ? "filled" : "outlined"}
                />
                <Box sx={{ flex: 1, height: 2, bgcolor: resetStep >= 3 ? 'primary.main' : 'grey.300', mx: 1 }} />
                <Chip 
                  icon={resetStep >= 3 ? <CheckCircle /> : <Lock />}
                  label="3. 비밀번호 변경" 
                  color={resetStep >= 3 ? "success" : "default"}
                  variant={resetStep === 3 ? "filled" : "outlined"}
                />
              </Box>

              {/* 1단계: 본인 확인 */}
              {resetStep === 1 && (
                <form onSubmit={handleSendCode}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    🔒 보안을 위해 이메일 인증이 필요합니다
                  </Alert>
                  <TextField 
                    fullWidth 
                    label="아이디" 
                    value={resetPwForm.username} 
                    onChange={(e) => setResetPwForm({ ...resetPwForm, username: e.target.value })} 
                    margin="normal" 
                    required 
                    autoFocus
                  />
                  <TextField 
                    fullWidth 
                    label="이메일" 
                    type="email" 
                    value={resetPwForm.email} 
                    onChange={(e) => setResetPwForm({ ...resetPwForm, email: e.target.value })} 
                    margin="normal" 
                    required 
                  />
                  <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3 }}>
                    인증 코드 발송
                  </Button>
                </form>
              )}

              {/* 2단계: 인증 코드 확인 */}
              {resetStep === 2 && (
                <form onSubmit={handleVerifyCode}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    ⏱️ 인증 코드 유효시간: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </Alert>
                  {countdown > 0 && (
                    <LinearProgress 
                      variant="determinate" 
                      value={(countdown / 180) * 100} 
                      sx={{ mb: 2, height: 8, borderRadius: 5 }}
                    />
                  )}
                  <TextField 
                    fullWidth 
                    label="인증 코드 (6자리)" 
                    value={resetPwForm.code} 
                    onChange={(e) => setResetPwForm({ ...resetPwForm, code: e.target.value })} 
                    margin="normal" 
                    required 
                    autoFocus
                    inputProps={{ maxLength: 6 }}
                    helperText={`${resetPwForm.email}로 전송된 인증 코드를 입력하세요`}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      onClick={handleSendCode}
                      disabled={countdown > 150}
                    >
                      재발송
                    </Button>
                    <Button type="submit" fullWidth variant="contained">
                      인증 확인
                    </Button>
                  </Box>
                </form>
              )}

              {/* 3단계: 새 비밀번호 입력 */}
              {resetStep === 3 && (
                <form onSubmit={handleResetPw}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    ✅ 본인 인증이 완료되었습니다
                  </Alert>
                  <TextField 
                    fullWidth 
                    label="새 비밀번호" 
                    type="password" 
                    value={resetPwForm.newPassword} 
                    onChange={(e) => setResetPwForm({ ...resetPwForm, newPassword: e.target.value })} 
                    margin="normal" 
                    required 
                    autoFocus
                    helperText="최소 6자 이상 입력해주세요"
                  />
                  <Button type="submit" fullWidth variant="contained" size="large" color="success" sx={{ mt: 3 }}>
                    비밀번호 재설정 완료
                  </Button>
                </form>
              )}
            </Box>
          )}

          <Button fullWidth component={Link} to="/login" sx={{ mt: 2 }}>
            로그인으로 돌아가기
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}

