import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Box, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, IconButton, Chip, Alert, Snackbar,
    Switch, FormControlLabel, Tooltip, InputAdornment
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import { formatDateTime } from '../utils/dateFormat';

const ApiTokens = () => {
    const [tokens, setTokens] = useState([]);
    const [open, setOpen] = useState(false);
    const [newTokenName, setNewTokenName] = useState('');
    const [newTokenExpires, setNewTokenExpires] = useState('');
    const [newTokenPermissions, setNewTokenPermissions] = useState({ read: true, write: false });
    const [generatedToken, setGeneratedToken] = useState('');
    const [showToken, setShowToken] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [visibleTokens, setVisibleTokens] = useState({});

    useEffect(() => {
        fetchTokens();
    }, []);

    const fetchTokens = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/tokens`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setTokens(response.data);
        } catch (err) {
            showSnackbarMessage('토큰 목록을 불러오는데 실패했습니다', 'error');
        }
    };

    const handleCreate = async () => {
        try {
            if (!newTokenName.trim()) {
                showSnackbarMessage('토큰 이름을 입력해주세요', 'error');
                return;
            }

            const response = await axios.post(
                `${API_URL}/admin/tokens`,
                {
                    name: newTokenName,
                    expiresInDays: newTokenExpires ? parseInt(newTokenExpires) : null,
                    permissions: newTokenPermissions
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );

            setGeneratedToken(response.data.token);
            setShowToken(true);
            setNewTokenName('');
            setNewTokenExpires('');
            setNewTokenPermissions({ read: true, write: false });
            setOpen(false);
            fetchTokens();
            showSnackbarMessage('토큰이 생성되었습니다', 'success');
        } catch (err) {
            showSnackbarMessage('토큰 생성에 실패했습니다', 'error');
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`토큰 "${name}"을(를) 삭제하시겠습니까?`)) {
            return;
        }

        try {
            await axios.delete(`${API_URL}/admin/tokens/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchTokens();
            showSnackbarMessage('토큰이 삭제되었습니다', 'success');
        } catch (err) {
            showSnackbarMessage('토큰 삭제에 실패했습니다', 'error');
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await axios.patch(
                `${API_URL}/admin/tokens/${id}/status`,
                { is_active: !currentStatus },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            fetchTokens();
            showSnackbarMessage(`토큰이 ${!currentStatus ? '활성화' : '비활성화'}되었습니다`, 'success');
        } catch (err) {
            showSnackbarMessage('토큰 상태 변경에 실패했습니다', 'error');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showSnackbarMessage('클립보드에 복사되었습니다', 'success');
    };

    const showSnackbarMessage = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const toggleTokenVisibility = (id) => {
        setVisibleTokens(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    🔑 API 토큰 관리
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpen(true)}
                >
                    새 토큰 생성
                </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
                <strong>API 토큰 사용 방법:</strong><br />
                1. HTTP 헤더: <code>X-API-Token: your_token_here</code><br />
                2. Query 파라미터: <code>?api_token=your_token_here</code>
            </Alert>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell><strong>토큰</strong></TableCell>
                            <TableCell><strong>이름</strong></TableCell>
                            <TableCell><strong>권한</strong></TableCell>
                            <TableCell><strong>생성자</strong></TableCell>
                            <TableCell><strong>생성일</strong></TableCell>
                            <TableCell><strong>마지막 사용</strong></TableCell>
                            <TableCell><strong>만료일</strong></TableCell>
                            <TableCell align="center"><strong>상태</strong></TableCell>
                            <TableCell align="center"><strong>작업</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tokens.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                    등록된 API 토큰이 없습니다
                                </TableCell>
                            </TableRow>
                        ) : (
                            tokens.map((token) => (
                                <TableRow key={token.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <code style={{ fontSize: '0.9em', fontFamily: 'monospace' }}>
                                                {visibleTokens[token.id] ? token.full_token : token.masked_token}
                                            </code>
                                            <Tooltip title={visibleTokens[token.id] ? '숨기기' : '보기'}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleTokenVisibility(token.id)}
                                                >
                                                    {visibleTokens[token.id] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="복사">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => copyToClipboard(token.full_token)}
                                                >
                                                    <CopyIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{token.name}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            {token.permissions.read && <Chip label="읽기" size="small" color="primary" />}
                                            {token.permissions.write && <Chip label="쓰기" size="small" color="secondary" />}
                                        </Box>
                                    </TableCell>
                                    <TableCell>{token.created_by}</TableCell>
                                    <TableCell>{formatDateTime(token.created_at)}</TableCell>
                                    <TableCell>
                                        {token.last_used_at ? formatDateTime(token.last_used_at) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {token.expires_at ? (
                                            <Box>
                                                {formatDateTime(token.expires_at)}
                                                {token.is_expired && <Chip label="만료" size="small" color="error" sx={{ ml: 1 }} />}
                                            </Box>
                                        ) : (
                                            <Chip label="무제한" size="small" />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Switch
                                            checked={token.is_active}
                                            onChange={() => handleToggleStatus(token.id, token.is_active)}
                                            color="primary"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="삭제">
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDelete(token.id, token.name)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* 토큰 생성 다이얼로그 */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>새 API 토큰 생성</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="토큰 이름"
                        value={newTokenName}
                        onChange={(e) => setNewTokenName(e.target.value)}
                        margin="normal"
                        helperText="토큰의 용도를 나타내는 이름을 입력하세요"
                    />
                    <TextField
                        fullWidth
                        type="number"
                        label="만료일 (일)"
                        value={newTokenExpires}
                        onChange={(e) => setNewTokenExpires(e.target.value)}
                        margin="normal"
                        helperText="비워두면 무제한"
                        InputProps={{
                            endAdornment: <InputAdornment position="end">일</InputAdornment>
                        }}
                    />
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>권한 설정</Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newTokenPermissions.read}
                                    onChange={(e) => setNewTokenPermissions({ ...newTokenPermissions, read: e.target.checked })}
                                />
                            }
                            label="읽기 권한"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newTokenPermissions.write}
                                    onChange={(e) => setNewTokenPermissions({ ...newTokenPermissions, write: e.target.checked })}
                                />
                            }
                            label="쓰기 권한"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>취소</Button>
                    <Button onClick={handleCreate} variant="contained">생성</Button>
                </DialogActions>
            </Dialog>

            {/* 생성된 토큰 표시 다이얼로그 */}
            <Dialog open={showToken} onClose={() => setShowToken(false)} maxWidth="md" fullWidth>
                <DialogTitle>✅ 토큰이 생성되었습니다</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <strong>⚠️ 중요!</strong> 이 토큰은 다시 확인할 수 없습니다. 안전한 곳에 보관하세요.
                    </Alert>
                    <TextField
                        fullWidth
                        label="생성된 API 토큰"
                        value={generatedToken}
                        InputProps={{
                            readOnly: true,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Tooltip title="복사">
                                        <IconButton onClick={() => copyToClipboard(generatedToken)}>
                                            <CopyIcon />
                                        </IconButton>
                                    </Tooltip>
                                </InputAdornment>
                            ),
                            sx: { fontFamily: 'monospace', fontSize: '0.9em' }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowToken(false)} variant="contained">확인</Button>
                </DialogActions>
            </Dialog>

            {/* 스낵바 */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ApiTokens;

