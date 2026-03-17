import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, MenuItem, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert
} from '@mui/material';
import { Delete, Edit, LockReset, SupervisorAccount, Badge } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import { formatDate, formatTime } from '../utils/dateFormat';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [editDialog, setEditDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [nicknameDialog, setNicknameDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setError('사용자 목록을 불러오지 못했습니다');
    }
  };

  const handleChangeRole = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/admin/users/${selectedUser.id}/role`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSuccess('권한이 변경되었습니다');
      setEditDialog(false);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || '권한 변경 실패');
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');
    
    if (!newPassword || newPassword.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/admin/users/${selectedUser.id}/reset-password`, 
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSuccess('비밀번호가 초기화되었습니다');
      setResetDialog(false);
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || '비밀번호 초기화 실패');
    }
  };

  const handleChangeNickname = async () => {
    setError('');
    setSuccess('');
    
    if (!newNickname || newNickname.length < 2) {
      setError('닉네임은 최소 2자 이상이어야 합니다');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/admin/users/${selectedUser.id}/nickname`, 
        { nickname: newNickname },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSuccess('닉네임이 변경되었습니다');
      setNicknameDialog(false);
      setNewNickname('');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || '닉네임 변경 실패');
    }
  };

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`정말로 ${username} 계정을 삭제하시겠습니까?`)) return;
    
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('사용자가 삭제되었습니다');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || '삭제 실패');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'analyst': return 'warning';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return '운영자';
      case 'analyst': return '분석가';
      default: return '일반 사용자';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SupervisorAccount sx={{ fontSize: 40, color: 'primary.main', mr: 1 }} />
        <Typography variant="h4" fontWeight={700} color="primary.main">
          관리자 패널
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              사용자 계정 관리
            </Typography>
            <Chip label={`총 ${users.length}명`} color="primary" />
          </Box>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>ID</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>아이디</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>이름</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>닉네임</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>이메일</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>전화번호</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>권한</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>가입일</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>최근 로그인</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600, textAlign: 'center' }}>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      사용자가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell><strong>{user.id}</strong></TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {user.username}
                        </Typography>
                      </TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.nickname || user.username} 
                          size="small" 
                          variant="outlined"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>{user.email}</TableCell>
                      <TableCell>{user.phone || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getRoleLabel(user.role)} 
                          color={getRoleColor(user.role)} 
                          size="small" 
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(user.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {user.last_login ? (
                          <Box>
                            <Typography variant="caption" display="block" fontWeight={500}>
                              {formatDate(user.last_login)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {formatTime(user.last_login)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => { 
                              setSelectedUser(user); 
                              setNewRole(user.role); 
                              setEditDialog(true); 
                            }}
                            title="권한 변경"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => { 
                              setSelectedUser(user); 
                              setNewNickname(user.nickname || user.username); 
                              setNicknameDialog(true); 
                            }}
                            title="닉네임 변경"
                          >
                            <Badge fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="warning"
                            onClick={() => { 
                              setSelectedUser(user); 
                              setNewPassword(''); 
                              setResetDialog(true); 
                            }}
                            title="비밀번호 초기화"
                          >
                            <LockReset fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDelete(user.id, user.username)}
                            title="계정 삭제"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 권한 변경 다이얼로그 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>권한 변경</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                사용자: <strong>{selectedUser.username}</strong> ({selectedUser.name})
              </Typography>
              <TextField
                select
                fullWidth
                label="권한"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <MenuItem value="user">일반 사용자</MenuItem>
                <MenuItem value="analyst">분석가 (DB 조회 가능)</MenuItem>
                <MenuItem value="admin">운영자 (전체 권한)</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>취소</Button>
          <Button onClick={handleChangeRole} variant="contained">변경</Button>
        </DialogActions>
      </Dialog>

      {/* 비밀번호 초기화 다이얼로그 */}
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>비밀번호 초기화</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                사용자: <strong>{selectedUser.username}</strong> ({selectedUser.name})
              </Typography>
              <TextField
                fullWidth
                type="password"
                label="새 비밀번호"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="최소 4자 이상"
                autoFocus
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>취소</Button>
          <Button onClick={handleResetPassword} variant="contained" color="warning">초기화</Button>
        </DialogActions>
      </Dialog>

      {/* 닉네임 변경 다이얼로그 */}
      <Dialog open={nicknameDialog} onClose={() => setNicknameDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>닉네임 변경</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                사용자: <strong>{selectedUser.username}</strong> ({selectedUser.name})
              </Typography>
              <TextField
                fullWidth
                label="새 닉네임"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                helperText="최소 2자 이상 (채팅 및 게시판에 표시됩니다)"
                autoFocus
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNicknameDialog(false)}>취소</Button>
          <Button onClick={handleChangeNickname} variant="contained" color="info">변경</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
