import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Grid, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Divider
} from '@mui/material';
import { Person, Edit, Lock, Save, Cancel } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import { formatDateTime } from '../utils/dateFormat';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 닉네임 변경
  const [nicknameDialog, setNicknameDialog] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  // 비밀번호 변경
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setNewNickname(response.data.nickname || response.data.username);
    } catch (err) {
      console.error('프로필 로드 실패:', err);
      setError('프로필을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameChange = async () => {
    setError('');
    setSuccess('');

    if (!newNickname || newNickname.length < 2) {
      setError('닉네임은 최소 2자 이상이어야 합니다');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/users/profile/nickname`, 
        { nickname: newNickname },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSuccess('닉네임이 변경되었습니다');
      setNicknameDialog(false);
      loadProfile();
      
      // 로컬 스토리지의 사용자 정보도 업데이트
      const user = JSON.parse(localStorage.getItem('user'));
      user.nickname = newNickname;
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err) {
      setError(err.response?.data?.error || '닉네임 변경 실패');
    }
  };

  const handlePasswordChange = async () => {
    setError('');
    setSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError('모든 필드를 입력해주세요');
      return;
    }

    if (passwordForm.newPassword.length < 4) {
      setError('새 비밀번호는 최소 4자 이상이어야 합니다');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/users/profile/password`, 
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSuccess('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      setPasswordDialog(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // 3초 후 로그아웃
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || '비밀번호 변경 실패');
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return '운영자';
      case 'analyst': return '분석가';
      default: return '일반 사용자';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'analyst': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="text.secondary">로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Person sx={{ fontSize: 40, color: 'primary.main', mr: 1 }} />
        <Typography variant="h4" fontWeight={700} color="primary.main">
          내 프로필
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* 기본 정보 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={3}>
                기본 정보
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">아이디</Typography>
                <Typography variant="body1" fontWeight={500}>{profile?.username}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">이름</Typography>
                <Typography variant="body1" fontWeight={500}>{profile?.name}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">닉네임</Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {profile?.nickname || profile?.username}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => {
                    setNewNickname(profile?.nickname || profile?.username);
                    setNicknameDialog(true);
                  }}
                >
                  변경
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">이메일</Typography>
                <Typography variant="body1" fontWeight={500}>{profile?.email}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">전화번호</Typography>
                <Typography variant="body1" fontWeight={500}>{profile?.phone || '-'}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">권한</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={getRoleLabel(profile?.role)} 
                    color={getRoleColor(profile?.role)} 
                    size="small"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="caption" color="text.secondary">가입일</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {profile?.created_at ? formatDateTime(profile.created_at) : '-'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 보안 설정 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={3}>
                보안 설정
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  비밀번호를 정기적으로 변경하여 계정을 안전하게 보호하세요.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Lock />}
                  onClick={() => {
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordDialog(true);
                  }}
                >
                  비밀번호 변경
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ bgcolor: 'info.lighter', p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  💡 보안 팁
                </Typography>
                <Typography variant="caption" display="block" mb={0.5}>
                  • 비밀번호는 최소 8자 이상 권장
                </Typography>
                <Typography variant="caption" display="block" mb={0.5}>
                  • 영문, 숫자, 특수문자 조합 사용
                </Typography>
                <Typography variant="caption" display="block" mb={0.5}>
                  • 다른 사이트와 동일한 비밀번호 사용 금지
                </Typography>
                <Typography variant="caption" display="block">
                  • 3개월마다 비밀번호 변경 권장
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 닉네임 변경 다이얼로그 */}
      <Dialog open={nicknameDialog} onClose={() => setNicknameDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>닉네임 변경</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="새 닉네임"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              helperText="최소 2자 이상 (채팅 및 게시판에 표시됩니다)"
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNicknameDialog(false)} startIcon={<Cancel />}>취소</Button>
          <Button onClick={handleNicknameChange} variant="contained" startIcon={<Save />}>변경</Button>
        </DialogActions>
      </Dialog>

      {/* 비밀번호 변경 다이얼로그 */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>비밀번호 변경</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type="password"
              label="현재 비밀번호"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              type="password"
              label="새 비밀번호"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              helperText="최소 4자 이상"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="새 비밀번호 확인"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)} startIcon={<Cancel />}>취소</Button>
          <Button onClick={handlePasswordChange} variant="contained" color="warning" startIcon={<Lock />}>
            변경
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

