import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Paper,
  LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Tabs, Tab, Divider, Tooltip
} from '@mui/material';
import {
  SmartToy, CheckCircle, Cancel, TrendingUp, HourglassEmpty,
  Speed, BarChart, Timeline, History, PlayArrow
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import { formatDate, formatDateLong, formatDateTime, formatDateTimeShort } from '../utils/dateFormat';
import { useNavigate } from 'react-router-dom';

export default function GeminiQuota() {
  const navigate = useNavigate();
  const [todayData, setTodayData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadData();
    // 30초마다 자동 갱신
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      console.log('API 요청 시작...');
      
      const [todayRes, historyRes, eventsRes] = await Promise.all([
        axios.get(`${API_URL}/gemini/quota/today`, config),
        axios.get(`${API_URL}/gemini/quota/history?days=7`, config),
        axios.get(`${API_URL}/gemini/quota/events?limit=50`, config)
      ]);

      console.log('Today API 응답:', todayRes.data);
      console.log('History API 응답:', historyRes.data);
      console.log('Events API 응답:', eventsRes.data);

      // 데이터 구조 확인
      if (todayRes.data) {
        console.log('Today 데이터 구조:', {
          accounts: todayRes.data.accounts?.length || 0,
          summary: todayRes.data.summary,
          hasAccounts: !!todayRes.data.accounts,
          hasSummary: !!todayRes.data.summary
        });
      }

      setTodayData(todayRes.data);
      setHistoryData(historyRes.data);
      setEventsData(eventsRes.data.events || eventsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('할당량 데이터 로드 실패:', error);
      console.error('에러 상세:', error.response?.data || error.message);
      console.error('에러 상태:', error.response?.status);
      setLoading(false);
    }
  };

  const getAccountStatus = (account) => {
    const isExhausted = account.is_quota_exceeded || !!account.quota_exceeded_at;
    const isCurrentRunning = todayData?.current_active_account
      && (account.real_account_email || account.account_email || '').toLowerCase() === (todayData.current_active_account || '').toLowerCase();
    if (isExhausted) {
      return { label: '할당량 소진', color: 'error', icon: <Cancel />, tooltip: '오늘 할당량을 모두 사용함' };
    } else if (isCurrentRunning) {
      return { label: '오늘 사용', color: 'success', icon: <PlayArrow />, tooltip: 'run_ai_analysis가 현재 사용 중인 계정' };
    } else {
      return { label: '대기', color: 'default', icon: <HourglassEmpty />, tooltip: '오늘 아직 사용하지 않음' };
    }
  };

  const getEventTypeInfo = (eventType) => {
    const types = {
      'success': { label: '성공', color: 'success', icon: '✅' },
      'failed': { label: '실패', color: 'error', icon: '❌' },
      'quota_exceeded': { label: '할당량 초과', color: 'warning', icon: '⚠️' },
      'rate_limit': { label: 'Rate Limit', color: 'info', icon: '⏳' },
      'account_switched': { label: '계정 전환', color: 'primary', icon: '🔄' }
    };
    return types[eventType] || { label: eventType, color: 'default', icon: '📝' };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!todayData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Alert severity="error">데이터를 불러올 수 없습니다.</Alert>
      </Box>
    );
  }

  // 데이터 구조 디버깅
  console.log('렌더링 시 todayData:', todayData);
  console.log('accounts:', todayData.accounts);
  console.log('summary:', todayData.summary);

  return (
    <Box>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToy sx={{ fontSize: 40 }} />
          보안분석 AI 할당량 관리
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          계정별 일일 할당량 사용 현황과 로테이션 상태를 확인할 수 있습니다.
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          ※ &quot;오늘 사용&quot; = run_ai_analysis가 현재 실행 중일 때 사용 중인 계정 (실행 중이 아니면 표시되지 않음)
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            ⚡ <strong>분석 모드:</strong> 설정에 따라 순차(1건) 또는 병렬(최대 3건) 처리. 429 발생 시 3회 연속 시 다음 계정으로 자동 전환 (RPM: 60회/분)
          </Typography>
        </Alert>
      </Box>

      {/* 오늘의 전체 통계 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Speed />
                <Typography variant="subtitle2">전체 요청</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700}>
                {todayData.summary.total_requests.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                성공: {todayData.summary.total_success} | 실패: {todayData.summary.total_failed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PlayArrow />
                <Typography variant="subtitle2">오늘 사용</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700}>
                {todayData.summary.used_today_count ?? todayData.accounts.filter(a => a.request_count > 0).length}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                / {todayData.summary.total_accounts}개 (API 요청한 계정, 429 시 전환으로 2개 이상 가능)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: 'inherit' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle />
                <Typography variant="subtitle2">가용 계정</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700}>
                {todayData.summary.active_accounts}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                / {todayData.summary.total_accounts}개 (소진 제외)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Cancel />
                <Typography variant="subtitle2">소진 계정</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700}>
                {todayData.summary.exhausted_accounts}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                / {todayData.summary.total_accounts}개 계정
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp />
                <Typography variant="subtitle2">성공률</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700}>
                {todayData.summary.success_rate}%
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {todayData.summary.total_success} / {todayData.summary.total_requests}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 탭 메뉴 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="fullWidth">
          <Tab label="계정별 현황" icon={<BarChart />} iconPosition="start" />
          <Tab label="사용 히스토리" icon={<Timeline />} iconPosition="start" />
          <Tab label="이벤트 로그" icon={<History />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* 탭 1: 계정별 현황 */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={3} color="primary">
              🔑 계정별 할당량 사용 현황 (오늘)
            </Typography>

            <Grid container spacing={2}>
              {todayData.accounts.map((account, idx) => {
                const status = getAccountStatus(account);
                const isExhausted = account.is_quota_exceeded || !!account.quota_exceeded_at;
                const quotaLimit = account.daily_quota_limit || 1000;
                const usagePercent = parseFloat(account.usage_rate) || 0;

                return (
                  <Grid item xs={12} key={account.id}>
                    <Paper 
                      sx={{ 
                        p: 3, 
                        border: '2px solid',
                        borderColor: isExhausted ? 'error.light' : 'primary.light',
                        bgcolor: isExhausted ? '#fff5f5' : '#f0f7ff',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* 배경 순서 번호 */}
                      <Typography
                        sx={{
                          position: 'absolute',
                          top: -20,
                          right: 10,
                          fontSize: '120px',
                          fontWeight: 900,
                          color: isExhausted ? 'rgba(211, 47, 47, 0.05)' : 'rgba(25, 118, 210, 0.05)',
                          userSelect: 'none'
                        }}
                      >
                        {idx + 1}
                      </Typography>

                      <Box sx={{ position: 'relative', zIndex: 1 }}>
                        {/* 계정 헤더 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <SmartToy sx={{ fontSize: 40, color: isExhausted ? 'error.main' : 'primary.main' }} />
                            <Box>
                              <Typography variant="h6" fontWeight={700}>
                                {account.account_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {account.account_email || account.account_name}
                              </Typography>
                            </Box>
                          </Box>
                          <Tooltip title={status.tooltip || ''}>
                            <Chip 
                              label={status.label}
                              color={status.color}
                              icon={status.icon}
                              sx={{ fontWeight: 600, px: 2 }}
                            />
                          </Tooltip>
                        </Box>

                        {/* 사용량 프로그레스 */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              사용량
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {account.request_count} / {quotaLimit} 요청 ({usagePercent}%)
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={usagePercent}
                            sx={{ 
                              height: 10, 
                              borderRadius: 5,
                              bgcolor: 'rgba(0,0,0,0.1)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: isExhausted ? 'error.main' : 'primary.main'
                              }
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {usagePercent}% 사용됨
                          </Typography>
                        </Box>

                        {/* 상세 통계 */}
                        <Grid container spacing={2}>
                          <Grid item xs={4}>
                            <Paper sx={{ p: 1.5, bgcolor: 'success.50', textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">성공</Typography>
                              <Typography variant="h6" fontWeight={700} color="success.main">
                                {account.success_count}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={4}>
                            <Paper sx={{ p: 1.5, bgcolor: 'error.50', textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">실패</Typography>
                              <Typography variant="h6" fontWeight={700} color="error.main">
                                {account.failed_count}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={4}>
                            <Paper sx={{ p: 1.5, bgcolor: 'grey.100', textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">전체</Typography>
                              <Typography variant="h6" fontWeight={700}>
                                {account.request_count}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>

                        {/* 시간 정보 */}
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                          {account.last_used_at && (
                            <Typography variant="caption" color="text.secondary">
                              🕒 마지막 사용: {formatDateTime(account.last_used_at)}
                            </Typography>
                          )}
                          {account.quota_exceeded_at && (
                            <Typography variant="caption" color="error.main" fontWeight={600}>
                              ⚠️ 소진 시각: {formatDateTime(account.quota_exceeded_at)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 탭 2: 사용 히스토리 */}
      {tabValue === 1 && historyData && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={3} color="primary">
              📊 최근 7일 사용 히스토리
            </Typography>

            {historyData.history.length === 0 ? (
              <Alert severity="info">사용 히스토리가 없습니다.</Alert>
            ) : (
              <Box>
                {historyData.history.map((day) => (
                  <Paper key={day.date} sx={{ p: 3, mb: 2, bgcolor: '#fafafa' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6" fontWeight={700}>
                        📅 {formatDateLong(day.date)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Chip 
                          label={`총 ${day.total_requests}회`} 
                          color="primary" 
                          size="small" 
                        />
                        <Chip 
                          label={`성공 ${day.total_success}회`} 
                          color="success" 
                          size="small" 
                        />
                        {day.total_failed > 0 && (
                          <Chip 
                            label={`실패 ${day.total_failed}회`} 
                            color="error" 
                            size="small" 
                          />
                        )}
                      </Box>
                    </Box>

                    <Grid container spacing={1.5}>
                      {day.accounts.map((account, idx) => {
                        const histExhausted = account.is_quota_exceeded || !!account.quota_exceeded_at;
                        return (
                        <Grid item xs={12} sm={6} md={4} lg={2.4} key={idx}>
                          <Paper sx={{ 
                            p: 1.5, 
                            textAlign: 'center',
                            bgcolor: histExhausted ? '#ffebee' : 'white',
                            border: '1px solid',
                            borderColor: histExhausted ? 'error.light' : 'divider'
                          }}>
                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                              {account.account_name?.replace?.('.gemini_', '') || account.account_name}
                            </Typography>
                            <Typography variant="h6" fontWeight={700} color={histExhausted ? 'error.main' : 'primary.main'}>
                              {account.request_count}
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              ✓ {account.success_count}
                            </Typography>
                            {histExhausted && (
                              <Chip label="할당량 소진" size="small" color="error" sx={{ mt: 0.5 }} />
                            )}
                          </Paper>
                        </Grid>
                      ); })}
                    </Grid>
                  </Paper>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* 탭 3: 이벤트 로그 */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={3} color="primary">
              📜 최근 이벤트 로그 (최근 50개)
            </Typography>
            {eventsData.length > 0 && (
              <Typography variant="body2" color="text.secondary" mb={2}>
                ✅ 성공 {eventsData.filter(e => e.event_type === 'success').length}건
                {' · '}
                ❌ 실패 {eventsData.filter(e => e.event_type === 'failed').length}건
              </Typography>
            )}

            {eventsData.length === 0 ? (
              <Alert severity="info">이벤트 로그가 없습니다.</Alert>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>시간</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>계정</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>이벤트</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>CVE</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>POC</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: '#f5f5f5' }}>메시지</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {eventsData.map((event) => {
                      const eventInfo = getEventTypeInfo(event.event_type);
                      return (
                        <TableRow 
                          key={event.id}
                          sx={{ '&:hover': { bgcolor: 'grey.50' } }}
                        >
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTimeShort(event.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontFamily="monospace">
                              {event.account_name.replace('.gemini_', '')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={eventInfo.label}
                              color={eventInfo.color}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" fontWeight={600} color="primary">
                              {event.cve_code || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {event.poc_id ? (
                              <Typography
                                variant="caption"
                                fontWeight={600}
                                color="primary.main"
                                sx={{ cursor: 'pointer', textDecoration: 'underline', '&:hover': { color: 'primary.dark' } }}
                                onClick={() => navigate(`/poc/${event.poc_id}`)}
                              >
                                #{event.poc_id}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {event.error_message ? (
                              <Tooltip title={event.error_message} placement="left">
                                <Typography 
                                  variant="caption" 
                                  color="error.dark"
                                  fontWeight={500}
                                  sx={{
                                    maxWidth: 300,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'block',
                                    cursor: 'help',
                                    '&:hover': {
                                      textDecoration: 'underline'
                                    }
                                  }}
                                >
                                  ⚠️ {event.error_message}
                                </Typography>
                              </Tooltip>
                            ) : event.event_type === 'success' ? (
                              <Typography 
                                variant="caption" 
                                color="success.main"
                                fontWeight={600}
                              >
                                {event.poc_id ? 'POC 상세 보기' : '성공'}
                              </Typography>
                            ) : event.poc_link ? (
                              <Tooltip title={event.poc_link}>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{
                                    maxWidth: 300,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'block'
                                  }}
                                >
                                  {event.poc_link}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* 안내 메시지 */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" fontWeight={600} mb={1}>
          💡 할당량 로테이션 시스템 안내
        </Typography>
        <Typography variant="caption" display="block">
          • 계정별 일일 할당량 소진 시 자동으로 다음 계정으로 전환됩니다.
        </Typography>
        <Typography variant="caption" display="block">
          • 모든 계정 소진 시 날짜가 변경될 때까지 대기 후 자동 재개됩니다.
        </Typography>
        <Typography variant="caption" display="block">
          • 데이터는 30초마다 자동으로 갱신됩니다.
        </Typography>
      </Alert>
    </Box>
  );
}

