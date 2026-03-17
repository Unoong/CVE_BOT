import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Switch, FormControlLabel,
  Tabs, Tab, Alert, Chip, Divider, Grid, Paper, InputAdornment
} from '@mui/material';
import { Save, Refresh, Visibility, VisibilityOff, Settings, Code, SmartToy, 
  Folder, Storage, Speed, Timer, Repeat, FolderOpen, Person } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SystemConfig() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // CVE 수집 설정
  const [collectionConfig, setCollectionConfig] = useState({
    github: {
      max_pages: 100,
      target_years: [2025],
      sort_by: 'updated',
      sort_order: 'desc',
      search_query: 'CVE-{year} language:python'
    },
    collection: {
      max_cve_per_item: 5,
      cve_specific_limits: {},
      rate_limit_wait_minutes: 10,
      auto_collect_cve_info: true,
      auto_create_integrated_data: true,
      last_collection_time: null
    },
    paths: {
      cve_folder: 'CVE',
      logs_folder: 'logs'
    },
    isAdmin: false
  });
  
  // AI 분석 설정
  const [aiConfig, setAiConfig] = useState({
    parallel_processing: {
      enabled: false,
      max_workers: 1
    },
    api_limits: {
      requests_per_minute: 60,
      min_request_interval_seconds: 1.5,
      timeout_seconds: 300
    },
    retry: {
      max_retries: 1,
      retry_delay_seconds: 2
    },
    poc_limits: {
      max_folder_size_mb: 1.0
    },
    isAdmin: false
  });

  // 기본 권한 설정
  const [defaultRole, setDefaultRole] = useState('user');
  const [defaultRoleIsAdmin, setDefaultRoleIsAdmin] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const [collectionRes, aiRes, defaultRoleRes] = await Promise.all([
        axios.get(`${API_URL}/admin/system-config/collection`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/system-config/ai-analysis`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/system-config/default-role`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setCollectionConfig(collectionRes.data);
      setAiConfig(aiRes.data);
      setDefaultRole(defaultRoleRes.data.defaultRole);
      setDefaultRoleIsAdmin(defaultRoleRes.data.isAdmin);
    } catch (err) {
      console.error(err);
      setError('설정을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCollection = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `${API_URL}/admin/system-config/collection`,
        collectionConfig,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('CVE 수집 설정이 저장되었습니다');
      setTimeout(() => setSuccess(''), 3000);
      loadConfigs();
    } catch (err) {
      setError(err.response?.data?.error || '저장 실패');
    }
  };

  const handleSaveAI = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `${API_URL}/admin/system-config/ai-analysis`,
        aiConfig,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('AI 분석 설정이 저장되었습니다');
      setTimeout(() => setSuccess(''), 3000);
      loadConfigs();
    } catch (err) {
      setError(err.response?.data?.error || '저장 실패');
    }
  };

  const handleSaveDefaultRole = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(
        `${API_URL}/admin/system-config/default-role`,
        { defaultRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // 응답에서 저장된 값을 직접 사용
      if (response.data && response.data.defaultRole) {
        setDefaultRole(response.data.defaultRole);
      }
      setSuccess('기본 권한 설정이 저장되었습니다');
      setTimeout(() => setSuccess(''), 3000);
      // 저장 후 약간의 지연을 두고 다시 로드 (파일 시스템 동기화 대기)
      setTimeout(() => {
        loadConfigs();
      }, 500);
    } catch (err) {
      setError(err.response?.data?.error || '저장 실패');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" color="text.secondary">로딩 중...</Typography>
      </Box>
    );
  }

  const isAdmin = collectionConfig.isAdmin || aiConfig.isAdmin;

  return (
    <Box sx={{ 
      p: 3, 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      {/* 헤더 섹션 */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Settings sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: '"Noto Sans KR", sans-serif', mb: 0.5 }}>
                시스템 설정 관리
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                CVE 수집 및 AI 분석 설정을 관리합니다
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {!isAdmin && (
              <Chip 
                icon={<VisibilityOff />} 
                label="조회 전용" 
                size="medium" 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            )}
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={loadConfigs}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
            >
              새로고침
            </Button>
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

      <Paper elevation={4} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          sx={{ 
            bgcolor: '#f8f9fa',
            '& .MuiTab-root': {
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: '"Noto Sans KR", sans-serif',
              minHeight: 64,
              textTransform: 'none'
            },
            '& .Mui-selected': {
              color: '#667eea'
            }
          }}
        >
          <Tab 
            icon={<Code sx={{ mb: 0.5 }} />} 
            iconPosition="start"
            label="CVE 수집 설정" 
          />
          <Tab 
            icon={<SmartToy sx={{ mb: 0.5 }} />} 
            iconPosition="start"
            label="AI 분석 설정" 
          />
          <Tab 
            icon={<Person sx={{ mb: 0.5 }} />} 
            iconPosition="start"
            label="기본 권한 설정" 
          />
        </Tabs>

        <CardContent sx={{ bgcolor: '#ffffff', p: 4 }}>
          {/* CVE 수집 설정 탭 */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                CVE 수집 설정
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                GitHub에서 CVE 정보를 수집하는 방법을 설정합니다
              </Typography>
            </Box>

            {/* GitHub 설정 */}
            <Card 
              elevation={2} 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                '&:hover': { boxShadow: 4 }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Code sx={{ fontSize: 28, color: '#667eea' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                    GitHub API 설정
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="최대 페이지 수"
                      value={collectionConfig.github.max_pages}
                      onChange={(e) => setCollectionConfig({
                        ...collectionConfig,
                        github: { ...collectionConfig.github, max_pages: parseInt(e.target.value) || 100 }
                      })}
                      disabled={!isAdmin}
                      helperText="1페이지 = 30개 저장소"
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem'
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="검색 쿼리"
                      value={collectionConfig.github.search_query}
                      onChange={(e) => setCollectionConfig({
                        ...collectionConfig,
                        github: { ...collectionConfig.github, search_query: e.target.value }
                      })}
                      disabled={!isAdmin}
                      helperText="{year}는 자동 치환됩니다"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Code fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: '0.95rem'
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="정렬 기준"
                      select
                      SelectProps={{ native: true }}
                      value={collectionConfig.github.sort_by}
                      onChange={(e) => setCollectionConfig({
                        ...collectionConfig,
                        github: { ...collectionConfig.github, sort_by: e.target.value }
                      })}
                      disabled={!isAdmin}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem'
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    >
                      <option value="updated">최신 업데이트순</option>
                      <option value="created">생성일순</option>
                      <option value="stars">인기순</option>
                      <option value="best-match">관련도순</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="정렬 순서"
                      select
                      SelectProps={{ native: true }}
                      value={collectionConfig.github.sort_order}
                      onChange={(e) => setCollectionConfig({
                        ...collectionConfig,
                        github: { ...collectionConfig.github, sort_order: e.target.value }
                      })}
                      disabled={!isAdmin}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem'
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    >
                      <option value="desc">내림차순</option>
                      <option value="asc">오름차순</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="대상 년도"
                      value={Array.isArray(collectionConfig.github.target_years) 
                        ? collectionConfig.github.target_years.join(', ') 
                        : collectionConfig.github.target_years}
                      onChange={(e) => {
                        const value = e.target.value;
                        const years = value === 'current' ? 'current' : value.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
                        setCollectionConfig({
                          ...collectionConfig,
                          github: { ...collectionConfig.github, target_years: years }
                        });
                      }}
                      disabled={!isAdmin}
                      helperText="예: 2025 또는 2025, 2024, 2023 또는 current"
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem'
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 수집 동작 설정 */}
            <Card 
              elevation={2} 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                '&:hover': { boxShadow: 4 }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Speed sx={{ fontSize: 28, color: '#667eea' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                    수집 동작 설정
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="CVE당 최대 POC 개수"
                      value={collectionConfig.collection.max_cve_per_item}
                      onChange={(e) => setCollectionConfig({
                        ...collectionConfig,
                        collection: { ...collectionConfig.collection, max_cve_per_item: parseInt(e.target.value) || 5 }
                      })}
                      disabled={!isAdmin}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Storage fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Rate Limit 대기 시간 (분)"
                      value={collectionConfig.collection.rate_limit_wait_minutes}
                      onChange={(e) => setCollectionConfig({
                        ...collectionConfig,
                        collection: { ...collectionConfig.collection, rate_limit_wait_minutes: parseInt(e.target.value) || 10 }
                      })}
                      disabled={!isAdmin}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Timer fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={collectionConfig.collection.auto_collect_cve_info}
                            onChange={(e) => setCollectionConfig({
                              ...collectionConfig,
                              collection: { ...collectionConfig.collection, auto_collect_cve_info: e.target.checked }
                            })}
                            disabled={!isAdmin}
                            sx={{ 
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#667eea'
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                bgcolor: '#667eea'
                              }
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 500, fontSize: '1rem' }}>
                            CVE Info 자동 수집
                          </Typography>
                        }
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4.5, mt: 0.5, fontFamily: '"Noto Sans KR", sans-serif' }}>
                        cve_info_status='N'인 CVE를 자동으로 CVE API에서 수집
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={collectionConfig.collection.auto_create_integrated_data}
                            onChange={(e) => setCollectionConfig({
                              ...collectionConfig,
                              collection: { ...collectionConfig.collection, auto_create_integrated_data: e.target.checked }
                            })}
                            disabled={!isAdmin}
                            sx={{ 
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#667eea'
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                bgcolor: '#667eea'
                              }
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 500, fontSize: '1rem' }}>
                            통합 테이블 자동 생성
                          </Typography>
                        }
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4.5, mt: 0.5, fontFamily: '"Noto Sans KR", sans-serif' }}>
                        3개 테이블을 자동 조인하여 통합 테이블 생성
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 경로 설정 */}
            <Card 
              elevation={2} 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                '&:hover': { boxShadow: 4 }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Folder sx={{ fontSize: 28, color: '#667eea' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                    파일 경로 설정
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="CVE 폴더"
                      value={collectionConfig.paths.cve_folder}
                      onChange={(e) => setCollectionConfig({
                        ...collectionConfig,
                        paths: { ...collectionConfig.paths, cve_folder: e.target.value }
                      })}
                      disabled={!isAdmin}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FolderOpen fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: '1rem'
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="로그 폴더"
                      value={collectionConfig.paths.logs_folder}
                      onChange={(e) => setCollectionConfig({
                        ...collectionConfig,
                        paths: { ...collectionConfig.paths, logs_folder: e.target.value }
                      })}
                      disabled={!isAdmin}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FolderOpen fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: '1rem'
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {isAdmin && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Save />}
                  onClick={handleSaveCollection}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    fontFamily: '"Noto Sans KR", sans-serif',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    }
                  }}
                >
                  저장
                </Button>
              </Box>
            )}
          </TabPanel>

          {/* AI 분석 설정 탭 */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                AI 분석 설정
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                Gemini AI를 사용한 POC 분석 설정을 관리합니다
              </Typography>
            </Box>

            {/* 병렬 처리 설정 */}
            <Card 
              elevation={2} 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                '&:hover': { boxShadow: 4 }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Speed sx={{ fontSize: 28, color: '#667eea' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                    병렬 처리 설정
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={aiConfig.parallel_processing.enabled}
                            onChange={(e) => setAiConfig({
                              ...aiConfig,
                              parallel_processing: { ...aiConfig.parallel_processing, enabled: e.target.checked }
                            })}
                            disabled={!isAdmin}
                            sx={{ 
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#667eea'
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                bgcolor: '#667eea'
                              }
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 500, fontSize: '1rem' }}>
                            병렬 처리 활성화
                          </Typography>
                        }
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4.5, mt: 0.5, fontFamily: '"Noto Sans KR", sans-serif' }}>
                        여러 POC를 동시에 분석하여 처리 속도 향상
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="최대 동시 작업 수"
                      value={aiConfig.parallel_processing.max_workers}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        parallel_processing: { ...aiConfig.parallel_processing, max_workers: parseInt(e.target.value) || 1 }
                      })}
                      disabled={!isAdmin || !aiConfig.parallel_processing.enabled}
                      helperText="병렬 처리 활성화 시에만 적용"
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* API 제한 설정 */}
            <Card 
              elevation={2} 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                '&:hover': { boxShadow: 4 }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Timer sx={{ fontSize: 28, color: '#667eea' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                    API 제한 설정
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="분당 요청 수"
                      value={aiConfig.api_limits.requests_per_minute}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        api_limits: { ...aiConfig.api_limits, requests_per_minute: parseInt(e.target.value) || 60 }
                      })}
                      disabled={!isAdmin}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="최소 요청 간격 (초)"
                      value={aiConfig.api_limits.min_request_interval_seconds}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        api_limits: { ...aiConfig.api_limits, min_request_interval_seconds: parseFloat(e.target.value) || 1.5 }
                      })}
                      disabled={!isAdmin}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Speed fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="타임아웃 (초)"
                      value={aiConfig.api_limits.timeout_seconds}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        api_limits: { ...aiConfig.api_limits, timeout_seconds: parseInt(e.target.value) || 300 }
                      })}
                      disabled={!isAdmin}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Timer fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 재시도 설정 */}
            <Card 
              elevation={2} 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                '&:hover': { boxShadow: 4 }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Repeat sx={{ fontSize: 28, color: '#667eea' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                    재시도 설정
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="최대 재시도 횟수"
                      value={aiConfig.retry.max_retries}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        retry: { ...aiConfig.retry, max_retries: parseInt(e.target.value) || 1 }
                      })}
                      disabled={!isAdmin}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Repeat fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="재시도 대기 시간 (초)"
                      value={aiConfig.retry.retry_delay_seconds}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        retry: { ...aiConfig.retry, retry_delay_seconds: parseInt(e.target.value) || 2 }
                      })}
                      disabled={!isAdmin}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Timer fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* POC 제한 설정 */}
            <Card 
              elevation={2} 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                '&:hover': { boxShadow: 4 }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Storage sx={{ fontSize: 28, color: '#667eea' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                    POC 제한 설정
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="최대 폴더 크기 (MB)"
                      value={aiConfig.poc_limits.max_folder_size_mb}
                      onChange={(e) => setAiConfig({
                        ...aiConfig,
                        poc_limits: { ...aiConfig.poc_limits, max_folder_size_mb: parseFloat(e.target.value) || 1.0 }
                      })}
                      disabled={!isAdmin}
                      helperText="이 크기를 초과하면 AI 분석을 건너뜁니다"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Storage fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {isAdmin && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Save />}
                  onClick={handleSaveAI}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    fontFamily: '"Noto Sans KR", sans-serif',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    }
                  }}
                >
                  저장
                </Button>
              </Box>
            )}
          </TabPanel>

          {/* 기본 권한 설정 탭 */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                기본 권한 설정
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Noto Sans KR", sans-serif' }}>
                신규 회원가입 시 부여할 기본 권한을 설정합니다
              </Typography>
            </Box>

            <Card 
              elevation={2} 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                '&:hover': { boxShadow: 4 }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Person sx={{ fontSize: 28, color: '#667eea' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif', color: '#2c3e50' }}>
                    신규 회원 기본 권한
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="기본 권한"
                      select
                      SelectProps={{ native: true }}
                      value={defaultRole}
                      onChange={(e) => setDefaultRole(e.target.value)}
                      disabled={!defaultRoleIsAdmin}
                      helperText="회원가입 시 자동으로 부여되는 권한입니다"
                      sx={{
                        '& .MuiInputBase-input': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontSize: '1rem',
                          fontWeight: 500
                        },
                        '& .MuiInputLabel-root': {
                          fontFamily: '"Noto Sans KR", sans-serif',
                          fontWeight: 500
                        }
                      }}
                    >
                      <option value="user">일반 사용자 (user)</option>
                      <option value="analyst">분석가 (analyst)</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontFamily: '"Noto Sans KR", sans-serif', mb: 1 }}>
                        권한별 기능
                      </Typography>
                      <Box sx={{ pl: 2 }}>
                        <Typography variant="body2" sx={{ fontFamily: '"Noto Sans KR", sans-serif', mb: 1 }}>
                          <strong>일반 사용자 (user):</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Noto Sans KR", sans-serif', mb: 2, pl: 2 }}>
                          • CVE 정보 조회<br />
                          • POC 상세 조회<br />
                          • 게시판 글쓰기<br />
                          • 채팅 사용
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: '"Noto Sans KR", sans-serif', mb: 1 }}>
                          <strong>분석가 (analyst):</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"Noto Sans KR", sans-serif', pl: 2 }}>
                          • 일반 사용자 기능 +<br />
                          • DB 직접 조회<br />
                          • 상세 데이터 분석
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {defaultRoleIsAdmin && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Save />}
                  onClick={handleSaveDefaultRole}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    fontFamily: '"Noto Sans KR", sans-serif',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    }
                  }}
                >
                  저장
                </Button>
              </Box>
            )}
          </TabPanel>
        </CardContent>
      </Paper>
    </Box>
  );
}
