import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip,
  InputAdornment
} from '@mui/material';
import { Add, Delete, Edit, Save, Cancel, Visibility, VisibilityOff, 
  Warning, Storage, Info } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';

export default function CVEConfig() {
  const [defaultLimit, setDefaultLimit] = useState(5);
  const [cveSpecificLimits, setCveSpecificLimits] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 새 CVE 추가 다이얼로그
  const [addDialog, setAddDialog] = useState(false);
  const [newCVE, setNewCVE] = useState('');
  const [newLimit, setNewLimit] = useState(20);
  
  // 수정 중인 CVE
  const [editingCVE, setEditingCVE] = useState(null);
  const [editLimit, setEditLimit] = useState(20);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_URL}/admin/cve-limits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDefaultLimit(res.data.defaultLimit);
      setCveSpecificLimits(res.data.cveSpecificLimits || {});
      setIsAdmin(res.data.isAdmin);
    } catch (err) {
      console.error(err);
      setError('설정을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaultLimit = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `${API_URL}/admin/cve-limits`,
        { defaultLimit },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('기본 제한이 저장되었습니다');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '저장 실패');
    }
  };

  const handleAddCVE = () => {
    if (!newCVE || !/^CVE-\d{4}-\d+$/.test(newCVE)) {
      setError('올바른 CVE 형식을 입력하세요 (예: CVE-2025-1234)');
      return;
    }
    if (newLimit < 1) {
      setError('제한은 1 이상이어야 합니다');
      return;
    }
    
    setCveSpecificLimits(prev => ({
      ...prev,
      [newCVE.toUpperCase()]: newLimit
    }));
    setNewCVE('');
    setNewLimit(20);
    setAddDialog(false);
  };

  const handleEditCVE = (cve) => {
    setEditingCVE(cve);
    setEditLimit(cveSpecificLimits[cve]);
  };

  const handleSaveEdit = () => {
    if (editLimit < 1) {
      setError('제한은 1 이상이어야 합니다');
      return;
    }
    
    setCveSpecificLimits(prev => ({
      ...prev,
      [editingCVE]: editLimit
    }));
    setEditingCVE(null);
  };

  const handleDeleteCVE = (cve) => {
    if (window.confirm(`${cve}의 설정을 삭제하시겠습니까?`)) {
      setCveSpecificLimits(prev => {
        const newLimits = { ...prev };
        delete newLimits[cve];
        return newLimits;
      });
    }
  };

  const handleSaveAll = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `${API_URL}/admin/cve-limits`,
        { cveSpecificLimits },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('모든 설정이 저장되었습니다');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '저장 실패');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" color="text.secondary" sx={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
          로딩 중...
        </Typography>
      </Box>
    );
  }

  const cveEntries = Object.entries(cveSpecificLimits).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Box sx={{ 
      p: 3, 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      {/* 헤더 섹션 */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Warning sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"Noto Sans KR", sans-serif', mb: 0.5 }}>
              주의모니터링 취약점 설정
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: '"Noto Sans KR", sans-serif' }}>
              특정 CVE에 대한 POC 수집 개수를 개별적으로 설정합니다
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* 기본 제한 설정 */}
      <Card 
        elevation={4} 
        sx={{ 
          mb: 3, 
          borderRadius: 3,
          border: '1px solid #e0e0e0',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          '&:hover': { boxShadow: 6 }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Storage sx={{ fontSize: 28, color: '#f5576c' }} />
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                기본 POC 수집 제한
              </Typography>
            </Box>
            {!isAdmin && (
              <Chip 
                icon={<VisibilityOff />} 
                label="조회 전용" 
                size="medium" 
                sx={{ bgcolor: '#e0e0e0', fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 500 }}
              />
            )}
          </Box>
          <Alert severity="info" sx={{ mb: 2, fontFamily: '"Noto Sans KR", sans-serif' }}>
            <Info sx={{ mr: 1 }} />
            설정하지 않은 CVE는 이 기본값을 사용합니다
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              type="number"
              label="기본 제한 (개)"
              value={defaultLimit}
              onChange={(e) => setDefaultLimit(parseInt(e.target.value) || 5)}
              disabled={!isAdmin}
              inputProps={{ min: 1 }}
              sx={{ 
                width: 250,
                '& .MuiInputBase-input': {
                  fontFamily: '"Noto Sans KR", sans-serif',
                  fontSize: '1.1rem',
                  fontWeight: 600
                },
                '& .MuiInputLabel-root': {
                  fontFamily: '"Noto Sans KR", sans-serif',
                  fontWeight: 500
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Storage />
                  </InputAdornment>
                )
              }}
            />
            {isAdmin && (
              <Button
                variant="contained"
                size="large"
                startIcon={<Save />}
                onClick={handleSaveDefaultLimit}
                sx={{
                  px: 3,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  fontFamily: '"Noto Sans KR", sans-serif',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #e083eb 0%, #e5475c 100%)',
                  }
                }}
              >
                저장
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* CVE별 제한 설정 */}
      <Card 
        elevation={4} 
        sx={{ 
          borderRadius: 3,
          border: '1px solid #e0e0e0',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          '&:hover': { boxShadow: 6 }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Warning sx={{ fontSize: 28, color: '#f5576c' }} />
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                특정 CVE별 제한 설정
              </Typography>
            </Box>
            {!isAdmin && (
              <Chip 
                icon={<VisibilityOff />} 
                label="조회 전용" 
                size="medium" 
                sx={{ bgcolor: '#e0e0e0', fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 500 }}
              />
            )}
          </Box>
          <Alert severity="info" sx={{ mb: 3, fontFamily: '"Noto Sans KR", sans-serif' }}>
            <Info sx={{ mr: 1 }} />
            특정 CVE에 대해 기본값보다 더 많은 POC를 수집할 수 있습니다
          </Alert>

          {isAdmin && (
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setAddDialog(true)}
              sx={{ 
                mb: 3,
                px: 3,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                fontFamily: '"Noto Sans KR", sans-serif',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #e083eb 0%, #e5475c 100%)',
                }
              }}
            >
              CVE 추가
            </Button>
          )}

          {cveEntries.length === 0 ? (
            <Paper 
              elevation={0} 
              sx={{ 
                py: 6, 
                textAlign: 'center',
                bgcolor: '#f8f9fa',
                borderRadius: 2
              }}
            >
              <Warning sx={{ fontSize: 48, color: '#bdbdbd', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" sx={{ fontFamily: '"Noto Sans KR", sans-serif', fontSize: '1.1rem' }}>
                설정된 CVE가 없습니다
              </Typography>
            </Paper>
          ) : (
            <>
              <TableContainer 
                component={Paper} 
                variant="outlined" 
                sx={{ 
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid #e0e0e0'
                }}
              >
                <Table>
                  <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', fontSize: '1rem' }}>
                        CVE 코드
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', fontSize: '1rem' }}>
                        최대 수집 개수
                      </TableCell>
                      {isAdmin && (
                        <TableCell align="right" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', fontSize: '1rem' }}>
                          작업
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cveEntries.map(([cve, limit]) => (
                      <TableRow 
                        key={cve}
                        sx={{ 
                          '&:hover': { bgcolor: '#f5f5f5' },
                          '&:nth-of-type(even)': { bgcolor: '#fafafa' }
                        }}
                      >
                        <TableCell>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontFamily: 'monospace',
                              fontSize: '1.1rem',
                              fontWeight: 600,
                              color: '#2c3e50'
                            }}
                          >
                            {cve}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {editingCVE === cve ? (
                            <TextField
                              type="number"
                              value={editLimit}
                              onChange={(e) => setEditLimit(parseInt(e.target.value) || 1)}
                              inputProps={{ min: 1 }}
                              size="small"
                              sx={{ 
                                width: 120,
                                '& .MuiInputBase-input': {
                                  fontFamily: '"Noto Sans KR", sans-serif',
                                  fontSize: '1rem',
                                  fontWeight: 600
                                }
                              }}
                            />
                          ) : (
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontFamily: '"Noto Sans KR", sans-serif',
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                color: '#667eea'
                              }}
                            >
                              {limit}개
                            </Typography>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            {editingCVE === cve ? (
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <IconButton
                                  size="medium"
                                  color="primary"
                                  onClick={handleSaveEdit}
                                  sx={{ 
                                    bgcolor: '#e3f2fd',
                                    '&:hover': { bgcolor: '#bbdefb' }
                                  }}
                                >
                                  <Save />
                                </IconButton>
                                <IconButton
                                  size="medium"
                                  onClick={() => setEditingCVE(null)}
                                  sx={{ 
                                    bgcolor: '#f5f5f5',
                                    '&:hover': { bgcolor: '#e0e0e0' }
                                  }}
                                >
                                  <Cancel />
                                </IconButton>
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <IconButton
                                  size="medium"
                                  color="primary"
                                  onClick={() => handleEditCVE(cve)}
                                  sx={{ 
                                    bgcolor: '#e3f2fd',
                                    '&:hover': { bgcolor: '#bbdefb' }
                                  }}
                                >
                                  <Edit />
                                </IconButton>
                                <IconButton
                                  size="medium"
                                  color="error"
                                  onClick={() => handleDeleteCVE(cve)}
                                  sx={{ 
                                    bgcolor: '#ffebee',
                                    '&:hover': { bgcolor: '#ffcdd2' }
                                  }}
                                >
                                  <Delete />
                                </IconButton>
                              </Box>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {isAdmin && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Save />}
                    onClick={handleSaveAll}
                    disabled={editingCVE !== null}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      fontFamily: '"Noto Sans KR", sans-serif',
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #e083eb 0%, #e5475c 100%)',
                      },
                      '&:disabled': {
                        background: '#e0e0e0'
                      }
                    }}
                  >
                    모든 변경사항 저장
                  </Button>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* CVE 추가 다이얼로그 */}
      <Dialog 
        open={addDialog} 
        onClose={() => setAddDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 700, fontSize: '1.3rem' }}>
          CVE 추가
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="CVE 코드"
              placeholder="CVE-2025-1234"
              value={newCVE}
              onChange={(e) => setNewCVE(e.target.value.toUpperCase())}
              fullWidth
              helperText="형식: CVE-YYYY-NNNN"
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  fontWeight: 600
                },
                '& .MuiInputLabel-root': {
                  fontFamily: '"Noto Sans KR", sans-serif',
                  fontWeight: 500
                }
              }}
            />
            <TextField
              type="number"
              label="최대 수집 개수"
              value={newLimit}
              onChange={(e) => setNewLimit(parseInt(e.target.value) || 1)}
              inputProps={{ min: 1 }}
              fullWidth
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: '"Noto Sans KR", sans-serif',
                  fontSize: '1.1rem',
                  fontWeight: 600
                },
                '& .MuiInputLabel-root': {
                  fontFamily: '"Noto Sans KR", sans-serif',
                  fontWeight: 500
                }
              }}
            />
            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setAddDialog(false)}
            sx={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 500 }}
          >
            취소
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddCVE}
            sx={{
              fontFamily: '"Noto Sans KR", sans-serif',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #e083eb 0%, #e5475c 100%)',
              }
            }}
          >
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
