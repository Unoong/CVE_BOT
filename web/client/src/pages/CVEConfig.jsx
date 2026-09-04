import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip,
  Grid, CircularProgress, IconButton, Tooltip, Divider, Stack,
  Paper, InputAdornment
} from '@mui/material';
import {
  Add, Delete, Warning, Info, Refresh, OpenInNew, DoneAll,
  NewReleases, Security, Storage, Edit, Save, Cancel
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import { formatDate } from '../utils/dateFormat';

const font = '"Noto Sans KR", sans-serif';

function severityColor(sev) {
  const s = String(sev || '').toUpperCase();
  if (s.includes('CRITICAL')) return '#b71c1c';
  if (s.includes('HIGH')) return '#e65100';
  if (s.includes('MEDIUM')) return '#f9a825';
  if (s.includes('LOW')) return '#2e7d32';
  return '#607d8b';
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
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState(null);

  const [editingCVE, setEditingCVE] = useState(null);
  const [editLimit, setEditLimit] = useState(20);
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
        { cve: newCVE.toUpperCase(), limit: newLimit, collect: true },
        { headers: { Authorization: `Bearer ${token()}` }, timeout: 200000 }
      );
      setAddResult(res.data);
      setSuccess(res.data.message || '추가 완료');
      setNewCVE('');
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

  const handleSaveLimit = async (cve) => {
    try {
      await axios.put(
        `${API_URL}/monitored-cves/${cve}`,
        { limit: editLimit },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setEditingCVE(null);
      await loadList();
    } catch (err) {
      setError(err.response?.data?.error || '한도 저장 실패');
    }
  };

  const openDetail = (cve) => {
    navigate(`/cve/${cve}`);
  };

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
                등록 CVE의 CIRCL 정보·PoC 현황을 카드로 확인하고, 신규 PoC 수집 시 강조 표시합니다 (수집 한도 기본 {monitorDefaultLimit}개)
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

      {/* 기본 한도 */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: font }}>
                <Storage sx={{ mr: 1, verticalAlign: 'middle', color: '#e65100' }} />
                일반 CVE 기본 PoC 수집 한도
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: font }}>
                모니터링에 등록되지 않은 CVE는 이 기본값을 사용합니다 (현재 모니터링 CVE는 개별 한도 적용)
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
          신규 PoC가 수집된 모니터링 CVE {newItems.length}건이 있습니다. 카드의 「신규 확인」으로 배지를 해제할 수 있습니다.
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
            const info = item.cve_info;
            const isNew = !!item.has_new_poc;
            return (
              <Grid item xs={12} md={6} lg={4} key={item.cve}>
                <Card
                  elevation={isNew ? 6 : 1}
                  onClick={() => openDetail(item.cve)}
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    borderRadius: 2,
                    border: isNew ? '2px solid #d32f2f' : '1px solid #e0e0e0',
                    boxShadow: isNew ? '0 0 0 3px rgba(211,47,47,0.18)' : undefined,
                    background: isNew
                      ? 'linear-gradient(180deg, #fff5f5 0%, #ffffff 40%)'
                      : '#fff',
                    transition: 'transform .15s ease, box-shadow .15s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    position: 'relative',
                  }}
                >
                  {isNew && (
                    <Chip
                      icon={<NewReleases />}
                      label={`NEW PoC ${item.new_poc_count}`}
                      color="error"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        fontWeight: 800,
                        fontFamily: font,
                        zIndex: 1,
                      }}
                    />
                  )}
                  <CardContent>
                    <Stack spacing={1.2}>
                      <Typography
                        variant="h6"
                        sx={{ fontFamily: 'ui-monospace, Consolas, monospace', fontWeight: 800, pr: isNew ? 12 : 0 }}
                      >
                        {item.cve}
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {info?.CVSS_Serverity && (
                          <Chip
                            size="small"
                            label={`${info.CVSS_Serverity}${info.CVSS_Score ? ` ${info.CVSS_Score}` : ''}`}
                            sx={{
                              bgcolor: severityColor(info.CVSS_Serverity),
                              color: '#fff',
                              fontWeight: 700,
                            }}
                          />
                        )}
                        {info?.state && <Chip size="small" label={info.state} variant="outlined" />}
                        {!item.has_cve_info && (
                          <Chip size="small" color="warning" label="CVE_Info 없음" />
                        )}
                      </Stack>

                      <Typography
                        variant="subtitle2"
                        sx={{ fontFamily: font, fontWeight: 700, color: '#37474f' }}
                        noWrap
                        title={info?.product || ''}
                      >
                        {info?.product || '제품 정보 없음'}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontFamily: font,
                          minHeight: 44,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {info?.descriptions || 'CIRCL 설명 데이터가 없습니다. CVE 추가 시 API로 보강됩니다.'}
                      </Typography>

                      <Divider />

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip
                          size="small"
                          icon={<Security />}
                          label={`PoC ${item.poc_count}/${item.limit}`}
                          sx={{ fontFamily: font }}
                        />
                        <Chip size="small" label={`AI ${item.ai_count}`} sx={{ fontFamily: font }} />
                        {info?.datePublished && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`게시 ${formatDate(info.datePublished) || info.datePublished}`}
                            sx={{ fontFamily: font }}
                          />
                        )}
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isNew && (
                          <Tooltip title="신규 PoC 확인 처리">
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              startIcon={<DoneAll />}
                              onClick={(e) => handleAck(item.cve, e)}
                              sx={{ fontFamily: font, fontWeight: 700 }}
                            >
                              신규 확인
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip title="상세 페이지">
                          <IconButton size="small" onClick={() => openDetail(item.cve)}>
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {isAdmin && (
                          editingCVE === item.cve ? (
                            <>
                              <TextField
                                type="number"
                                size="small"
                                value={editLimit}
                                onChange={(e) => setEditLimit(parseInt(e.target.value, 10) || 1)}
                                inputProps={{ min: 1 }}
                                sx={{ width: 88 }}
                              />
                              <IconButton color="primary" onClick={() => handleSaveLimit(item.cve)}>
                                <Save fontSize="small" />
                              </IconButton>
                              <IconButton onClick={() => setEditingCVE(null)}>
                                <Cancel fontSize="small" />
                              </IconButton>
                            </>
                          ) : (
                            <>
                              <Tooltip title="수집 한도 수정">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingCVE(item.cve);
                                    setEditLimit(item.limit);
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="모니터링 해제">
                                <IconButton size="small" color="error" onClick={() => handleDelete(item.cve)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )
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
            추가 시 PoC 수집 한도 {monitorDefaultLimit}개(변경 가능)로 등록하고, DB에 CVE 정보가 없으면 CIRCL API로
            가져오며 GitHub에서 관련 PoC를 확인·수집합니다.
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
                  CIRCL/GitHub 조회 및 수집 중… (최대 수 분 소요될 수 있습니다)
                </Typography>
              </Box>
            )}
            {addResult?.enrich && (
              <Alert severity="success" sx={{ fontFamily: font }}>
                CIRCL: {addResult.enrich.cve_info_fetched ? '신규 수집' : addResult.enrich.cve_info_existed ? 'DB 기존' : '없음'}
                {' / '}
                GitHub 검색 {addResult.enrich.github_found ?? 0}건, DB PoC {addResult.enrich.github_in_db ?? 0}건,
                신규 수집 {addResult.enrich.github_collected_new ?? 0}건
              </Alert>
            )}
            {addResult?.enrichError && (
              <Alert severity="warning" sx={{ fontFamily: font }}>
                보강 스크립트 경고: {addResult.enrichError}
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
            disabled={adding}
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
