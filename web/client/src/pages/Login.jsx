import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Paper, TextField, Button, Typography, Box, Alert, Grid } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL, SITE_NAME } from '../config';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    logger.info('========== 로그인 시도 ==========');
    logger.debug('[1] 입력 아이디:', form.username);
    
    try {
      logger.debug('[2] API 요청 시작...');
      const res = await axios.post(`${API_URL}/auth/login`, form);
      
      logger.debug('[3] 로그인 성공, 토큰 저장');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      logger.info('[4] 메인 페이지로 이동');
      window.location.href = '/';
    } catch (err) {
      logger.error('[로그인 실패]', err.response?.data?.error || err.message);
      setError(err.response?.data?.error || '로그인 실패');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm">
        <Paper elevation={10} sx={{ p: 5, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box sx={{ mb: 2 }}>
              <img src="/logo.png" alt="Logo" style={{ width: 80, height: 80, borderRadius: '50%' }} />
            </Box>
            <Typography variant="h4" fontWeight={700} color="primary.main">{SITE_NAME}</Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>CVE Vulnerability Management System</Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="아이디" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} margin="normal" required />
            <TextField fullWidth label="비밀번호" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} margin="normal" required />
            <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3, mb: 2, py: 1.5 }}>로그인</Button>
            <Grid container spacing={2}>
              <Grid item xs={6}><Button fullWidth component={Link} to="/find-account" color="inherit">ID/PW 찾기</Button></Grid>
              <Grid item xs={6}><Button fullWidth component={Link} to="/register" color="primary">회원가입</Button></Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
