import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip,
  Grid, CircularProgress, IconButton, Tooltip, Stack, Paper, InputAdornment
} from '@mui/material';
import {
  Add, Delete, Warning, Info, Refresh, OpenInNew, DoneAll,
  NewReleases, Storage, Save
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';

const font = '"Noto Sans KR", sans-serif';
const CARD_HEIGHT = 220;

function severityColor(sev) {
  const s = String(sev || '').toUpperCase();
  if (s.includes('CRITICAL')) return '#b71c1c';
  if (s.includes('HIGH')) return '#e65100';
  if (s.includes('MEDIUM')) return '#f9a825';
  if (s.includes('LOW')) return '#2e7d32';
  return '#78909c';
}

export default function CVEConfig() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [defaultLimit, setDefaultLimit] = useState(5);
  const [monitorDefaultLimit, setMonitorDefaultLimit] = useState(20);
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalNew, setTotalNew] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [addDialog, setAddDialog] = useState(false);
  const [newCVE, setNewCVE] = useState('');
  const [newLimit, setNewLimit] = useState(20);
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState(null);
  const [savingDefault, setSavingDefault] = useState(false);

  const token = () => localStorage.getItem('token');

  const loadList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/monitored-cves`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setItems(res.data.items || []);
      setDefaultLimit(res.data.defaultLimit ?? 5);
      setMonitorDefaultLimit(res.data.monitorDefaultLimit ?? 20);
      setIsAdmin(!!res.data.isAdmin);
      setTotalNew(Number(res.data.total_new_pocs || 0));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || '모니터링 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    const t = setInterval(loadList, 60000);
    return () => clearInterval(t);
  }, []);

  const handleSaveDefaultLimit = async () => {
    setSavingDefault(true);
    setError('');
    setSuccess('');
    try {
      await axios.put(
        `${API_URL}/admin/cve-limits`,
        { defaultLimit },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setSuccess('기본 수집 한도가 저장되었습니다');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || '기본 한도 저장 실패');
    } finally {
      setSavingDefault(false);
    }
  };

  const handleAddCVE = async () => {
    if (!/^CVE-\d{4}-\d+$/.test(newCVE)) {
      setError('올바른 CVE 형식을 입력하세요 (예: CVE-2025-1234)');
      return;
    }
    if (!newReason.trim()) {
      setError('주의모니터링 사유를 입력해주세요');
      return;
    }
    if (newLimit < 1) {
      setError('제한은 1 이상이어야 합니다');
      return;
    }
    setAdding(true);
    setError('');
    setAddResult(null);
    try {
      const res = await axios.post(
        `${API_URL}/monitored-cves`,
        {
          cve: newCVE.toUpperCase(),
          limit: newLimit,
          reason: newReason.trim(),
          collect: true,
        },
        { headers: { Authorization: `Bearer ${token()}` }, timeout: 200000 }
      );
      setAddResult(res.data);
      setSuccess(res.data.message || '추가 완료');
      setNewCVE('');
      setNewReason('');
      setNewLimit(monitorDefaultLimit);
      await loadList();
    } catch (err) {
      setError(err.response?.data?.error || 'CVE 추가 실패');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (cve) => {
    if (!window.confirm(`${cve} 모니터링을 해제할까요?`)) return;
    try {
      await axios.delete(`${API_URL}/monitored-cves/${cve}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setSuccess(`${cve} 모니터링 해제됨`);
      await loadList();
    } catch (err) {
      setError(err.response?.data?.error || '삭제 실패');
    }
  };

  const handleAck = async (cve, e) => {
    e?.stopPropagation?.();
    try {
      await axios.post(
        `${API_URL}/monitored-cves/${cve}/ack`,
        {},
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      await loadList();
    } catch (err) {
      setError(err.response?.data?.error || '확인 처리 실패');
    }
  };

  const openDetail = (cve) => navigate(`/cve/${cve}`);
  const newItems = useMemo(() => items.filter((i) => i.has_new_poc), [items]);

  if (loading && items.length === 0) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f4f6f8' }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: '1px solid #ffe0b2',
          background: 'linear-gradient(120deg, #fff8e1 0%, #ffecb3 55%, #ffe0b2 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Warning sx={{ fontSize: 40, color: '#e65100' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: font, color: '#3e2723' }}>
                주의모니터링 취약점
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: font, color: '#5d4037' }}>
                등록 CVE의 심각도·모니터링 사유·PoC/AI 현황을 확인합니다
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {totalNew > 0 && (
              <Chip
                icon={<NewReleases />}
                label={`신규 PoC ${totalNew}건`}
                color="error"
                sx={{ fontWeight: 700, fontFamily: font }}
              />
            )}
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadList}
              sx={{ fontFamily: font, borderColor: '#ef6c00', color: '#e65100' }}
            >
              새로고침
            </Button>
            {isAdmin && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setAddDialog(true);
                  setAddResult(null);
                  setNewReason('');
                  setNewLimit(monitorDefaultLimit);
                }}
                sx={{
                  fontFamily: font,
                  fontWeight: 700,
                  bgcolor: '#e65100',
                  '&:hover': { bgcolor: '#bf360c' },
                }}
              >
                CVE 추가
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, fontFamily: font }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, fontFamily: font }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: font }}>
                <Storage sx={{ mr: 1, verticalAlign: 'middle', color: '#e65100' }} />
                일반 CVE 기본 PoC 수집 한도
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: font }}>
                모니터링 미등록 CVE는 이 기본값을 사용합니다
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="number"
                size="small"
                label="기본 한도"
                value={defaultLimit}
                disabled={!isAdmin}
                onChange={(e) => setDefaultLimit(parseInt(e.target.value, 10) || 5)}
                inputProps={{ min: 1 }}
                sx={{ width: 140 }}
              />
              {isAdmin && (
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  disabled={savingDefault}
                  onClick={handleSaveDefaultLimit}
                  sx={{ fontFamily: font, bgcolor: '#455a64' }}
                >
                  저장
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {newItems.length > 0 && (
        <Alert severity="warning" icon={<NewReleases />} sx={{ mb: 2, fontFamily: font, fontWeight: 600 }}>
          신규 PoC가 수집된 모니터링 CVE {newItems.length}건 — 「신규 확인」으로 배지를 해제할 수 있습니다.
        </Alert>
      )}

      {items.length === 0 ? (
        <Paper sx={{ py: 8, textAlign: 'center', borderRadius: 2 }}>
          <Warning sx={{ fontSize: 56, color: '#bdbdbd', mb: 1 }} />
          <Typography sx={{ fontFamily: font, color: 'text.secondary' }}>
            등록된 주의모니터링 CVE가 없습니다
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {items.map((item) => {
            const severity = item.severity || item.cve_info?.CVSS_Serverity || null;
            const score = item.cvss_score || item.cve_info?.CVSS_Score || null;
            const isNew = !!item.has_new_poc;
            const reason = item.reason || '사유 미등록';

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.cve}>
                <Card
                  elevation={isNew ? 4 : 1}
                  onClick={() => openDetail(item.cve)}
                  sx={{
                    height: CARD_HEIGHT,
                    cursor: 'pointer',
                    borderRadius: 2,
                    border: isNew ? '2px solid #d32f2f' : '1px solid #e0e0e0',
                    background: isNew ? '#fff8f8' : '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  {isNew && (
                    <Chip
                      icon={<NewReleases />}
                      label={`NEW ${item.new_poc_count}`}
                      color="error"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        fontWeight: 800,
                        fontFamily: font,
                        zIndex: 1,
                      }}
                    />
                  )}
                  <CardContent
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      p: 2,
                      '&:last-child': { pb: 2 },
                      minHeight: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'ui-monospace, Consolas, monospace',
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        pr: isNew ? 9 : 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {item.cve}
                    </Typography>

                    <Box>
                      {severity ? (
                        <Chip
                          size="small"
                          label={`${severity}${score ? ` ${score}` : ''}`}
                          sx={{
                            bgcolor: severityColor(severity),
                            color: '#fff',
                            fontWeight: 700,
                            fontFamily: font,
                          }}
                        />
                      ) : (
                        <Chip size="small" label="심각도 없음" variant="outlined" sx={{ fontFamily: font }} />
                      )}
                    </Box>

                    <Typography
                      variant="body2"
                      title={reason}
                      sx={{
                        fontFamily: font,
                        color: item.reason ? '#37474f' : '#9e9e9e',
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.45,
                      }}
                    >
                      {reason}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1}>
                        <Chip
                          size="small"
                          label={`PoC ${item.poc_count}`}
                          sx={{ fontFamily: font, fontWeight: 600 }}
                        />
                        <Chip
                          size="small"
                          label={`AI ${item.ai_count}`}
                          sx={{ fontFamily: font, fontWeight: 600 }}
                        />
                      </Stack>
                      <Stack direction="row" spacing={0} onClick={(e) => e.stopPropagation()}>
                        {isNew && (
                          <Tooltip title="신규 확인">
                            <IconButton size="small" color="error" onClick={(e) => handleAck(item.cve, e)}>
                              <DoneAll fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="상세">
                          <IconButton size="small" onClick={() => openDetail(item.cve)}>
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          <Tooltip title="모니터링 해제">
                            <IconButton size="small" color="error" onClick={() => handleDelete(item.cve)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog
        open={addDialog}
        onClose={() => !adding && setAddDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontFamily: font, fontWeight: 700 }}>
          주의모니터링 CVE 추가
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, fontFamily: font }} icon={<Info />}>
            모니터링 사유는 필수입니다. 추가 시 PoC 한도 {monitorDefaultLimit}개로 등록하고 CIRCL/GitHub 보강을 수행합니다.
          </Alert>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="CVE 코드"
              placeholder="CVE-2025-1234"
              value={newCVE}
              disabled={adding}
              onChange={(e) => setNewCVE(e.target.value.toUpperCase())}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Warning sx={{ color: '#e65100' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontWeight: 700 } }}
            />
            <TextField
              label="주의모니터링 사유"
              placeholder="예: 사내 사용 제품 영향, 긴급 패치 필요 등"
              value={newReason}
              disabled={adding}
              onChange={(e) => setNewReason(e.target.value)}
              fullWidth
              required
              multiline
              minRows={3}
              inputProps={{ maxLength: 500 }}
              helperText={`${newReason.length}/500`}
              sx={{ '& .MuiInputBase-input': { fontFamily: font } }}
            />
            <TextField
              type="number"
              label="최대 PoC 수집 개수"
              value={newLimit}
              disabled={adding}
              onChange={(e) => setNewLimit(parseInt(e.target.value, 10) || 1)}
              inputProps={{ min: 1 }}
              fullWidth
            />
            {adding && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={22} />
                <Typography sx={{ fontFamily: font }}>
                  CIRCL/GitHub 조회 및 수집 중…
                </Typography>
              </Box>
            )}
            {addResult?.enrich && (
              <Alert severity="success" sx={{ fontFamily: font }}>
                CVE_Info: {addResult.enrich.cve_info_status === 'inserted' ? '신규 저장'
                  : addResult.enrich.cve_info_status === 'exists' ? 'DB 기존' : '없음'}
                {' / '}
                PoC {addResult.enrich.github_in_db ?? 0}건
              </Alert>
            )}
            {addResult?.enrichError && (
              <Alert severity="warning" sx={{ fontFamily: font }}>
                보강 경고: {addResult.enrichError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button disabled={adding} onClick={() => setAddDialog(false)} sx={{ fontFamily: font }}>
            닫기
          </Button>
          <Button
            variant="contained"
            disabled={adding || !newReason.trim()}
            onClick={handleAddCVE}
            sx={{ fontFamily: font, fontWeight: 700, bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}
          >
            {adding ? '처리 중…' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
