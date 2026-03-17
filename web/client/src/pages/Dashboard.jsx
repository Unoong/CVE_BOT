import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Grid, Card, CardContent, Typography, Box, Paper, Chip, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Pagination,
  Collapse, List, ListItem, ListItemButton, ListItemText, Divider, Alert, Skeleton
} from '@mui/material';
import { 
  BugReport, Code, Analytics, TrendingUp, Security, CheckCircle, 
  HourglassEmpty, Shield, Category, Extension, Close, VisibilityOutlined,
  ExpandMore, ExpandLess, SmartToy, Speed, Timeline, ShowChart
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import MitreDialog from '../components/MitreDialog';
import { formatDate, formatDateTime } from '../utils/dateFormat';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function Dashboard({ user }) {
  console.log('[Dashboard] 컴포넌트 마운트됨, user:', user);
  const navigate = useNavigate();

  // 수집 현황 그래프용 클릭 가능한 점 (파랑/초록/보라 동그라미 클릭 시 세부 페이지 이동)
  const ClickableDot = (props) => {
    const { cx, cy, payload, fill } = props;
    if (cx == null || cy == null || !payload?.date) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={fill || '#666'}
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/collection-trends/${payload.date}`); }}
      />
    );
  };
  const [stats, setStats] = useState({
    total_cves: 0,
    total_pocs: 0,
    analyzed_pocs: 0,
    unique_analyzed_pocs: 0,
    pending_pocs: 0,
    recentStats: [],
    cvssDistribution: [],
    recentCVEs: [],
    recentCollectedCVEs: [],  // 최근 수집된 CVE
    latestCVEs: [],  // 최신 CVE
    recentPocs: [], // 최근 수집된 POC
    attackStageStats: [],
    cweTypeStats: [],
    attackTypeStats: [],
    productStats: [],
    aiQuotaStats: {  // AI 할당량 정보
      total_accounts: 0,
      active_accounts: 0,
      total_daily_analysis: 0,
      total_429_errors: 0
    },
    stats_updated_at: null,
    stats_date: null
  });
  const [quotaData, setQuotaData] = useState(null);
  const [collectionTrends, setCollectionTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState({ title: '', data: [], type: '' });
  const [cveDialogOpen, setCveDialogOpen] = useState(false);
  const [cveList, setCveList] = useState([]);
  const [cvePage, setCvePage] = useState(1);
  const [cveTotal, setCveTotal] = useState(0);
  const [cveLoading, setCveLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState({ type: '', value: '' });
  const [statsList, setStatsList] = useState([]);
  const [statsPage, setStatsPage] = useState(1);
  const [statsLimit] = useState(20); // 한 페이지당 20개
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [productCves, setProductCves] = useState({});
  const [mitreDialogOpen, setMitreDialogOpen] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState('');
  const [selectedStageName, setSelectedStageName] = useState('');

  useEffect(() => {
    loadStats();
    loadQuotaData();
    loadCollectionTrends();
    // 할당량은 30초마다 갱신
    const interval = setInterval(loadQuotaData, 30000);
    return () => clearInterval(interval);
  }, []); // 빈 의존성 배열로 한 번만 실행

  const loadStats = async () => {
    console.log('[대시보드] 통계 로딩 시작...');
    try {
      console.log('[대시보드] 통계 요청...');
      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        timeout: 60000 // 60초 타임아웃으로 증가
      });
      console.log('[대시보드] 통계 로딩 완료:', response.data);
      setStats(response.data);
      setLoading(false);
      
    } catch (error) {
      console.error('[대시보드] 통계 로드 실패:', error);
      console.error('에러 상세:', error.response?.data || error.message);
      setLoading(false);
    }
  };

  const loadQuotaData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/gemini/quota/today`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setQuotaData(response.data);
    } catch (error) {
      console.error('할당량 데이터 로드 실패:', error);
    }
  };

  const loadCollectionTrends = async () => {
    try {
      console.log('[대시보드] 수집 현황 데이터 요청...');
      const response = await axios.get(`${API_URL}/dashboard/collection-trends`, {
        timeout: 30000
      });
      console.log('[대시보드] 수집 현황 데이터 로드 완료:', response.data);
      setCollectionTrends(response.data);
    } catch (error) {
      console.error('[대시보드] 수집 현황 데이터 로드 실패:', error);
      console.error('에러 상세:', error.response?.data || error.message);
      // 에러가 발생해도 빈 데이터로 설정하여 그래프는 표시
      setCollectionTrends({ trends: [], totalCVE: 0, totalPOC: 0 });
    }
  };

  const getCVSSColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return '#d32f2f';
      case 'HIGH': return '#f57c00';
      case 'MEDIUM': return '#fbc02d';
      case 'LOW': return '#388e3c';
      default: return '#757575';
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      'Reconnaissance': '#1976d2',
      'Initial Access': '#f57c00',
      'Exploit Injection': '#d32f2f',
      'Privilege Escalation': '#9c27b0',
      'Persistence': '#e91e63',
      'Command Execution': '#ff5722',
      'Data Exfiltration': '#f44336'
    };
    return colors[stage] || '#607d8b';
  };

  const handleOpenDialog = (title, data, type) => {
    setStatsList(data); // 전체 데이터 저장
    setStatsPage(1); // 첫 페이지로 리셋
    setDialogData({ title, data, type });
    
    // 새 창으로 열기
    const newWindow = window.open('', '_blank', 'width=1200,height=800');
    
    // 다이얼로그는 현재 창에서 열기
    setDialogOpen(true);
    
    // 새 창에 HTML 작성
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
                margin: 0;
              }
              table { 
                border-collapse: collapse; 
                width: 100%; 
                margin-top: 20px;
              }
              th, td { 
                padding: 10px; 
                text-align: left; 
                border: 1px solid #ddd; 
              }
              th { 
                background-color: #1976d2; 
                color: white; 
              }
              tr:nth-child(even) { 
                background-color: #f2f2f2; 
              }
              .pagination { 
                margin-top: 20px;
                text-align: center;
              }
              button { 
                padding: 8px 16px; 
                margin: 0 4px; 
                cursor: pointer;
              }
            </style>
          </head>
          <body>
            <h2>${title}</h2>
            <div id="content"></div>
            <div class="pagination" id="pagination"></div>
          </body>
        </html>
      `);
      
      // 데이터를 새 창에 전달
      newWindow.statsData = data;
      newWindow.statsLimit = 20;
      
      // 페이지네이션 로직
      newWindow.currentPage = 1;
      newWindow.totalPages = Math.ceil(data.length / newWindow.statsLimit);
      
      function renderPage(page) {
        const startIndex = (page - 1) * newWindow.statsLimit;
        const endIndex = startIndex + newWindow.statsLimit;
        const pageData = data.slice(startIndex, endIndex);
        
        let html = '<table><thead><tr><th>순위</th><th>항목</th><th>건수</th></tr></thead><tbody>';
        
        pageData.forEach((item, idx) => {
          const globalIdx = startIndex + idx;
          html += `
            <tr>
              <td>${globalIdx + 1}</td>
              <td>${
                type === 'stage' ? item.attack_stage :
                type === 'cwe' ? item.cwe_type :
                type === 'attack' ? item.attack_type :
                item.product
              }</td>
              <td>${item.count}건</td>
            </tr>
          `;
        });
        
        html += '</tbody></table>';
        
        newWindow.document.getElementById('content').innerHTML = html;
        
        // 페이지네이션
        let paginationHtml = '';
        for (let i = 1; i <= newWindow.totalPages; i++) {
          paginationHtml += `<button onclick="window.currentPage=${i}; renderPage(${i})" ${i === page ? 'style="background:#1976d2;color:white"' : ''}>${i}</button>`;
        }
        newWindow.document.getElementById('pagination').innerHTML = paginationHtml;
      }
      
      // 초기 렌더링
      newWindow.renderPage = renderPage;
      renderPage(1);
    }
  };

  const handleStatsPageChange = (event, newPage) => {
    setStatsPage(newPage);
  };

  const getCurrentPageStats = () => {
    const startIndex = (statsPage - 1) * statsLimit;
    const endIndex = startIndex + statsLimit;
    return statsList.slice(startIndex, endIndex);
  };

  const handleOpenCveDialog = async (filterType, filterValue) => {
    setSelectedFilter({ type: filterType, value: filterValue });
    setCveDialogOpen(true);
    setCvePage(1);
    await loadFilteredCves(filterType, filterValue, 1);
  };

  const loadFilteredCves = async (filterType, filterValue, page = 1) => {
    setCveLoading(true);
    try {
      const response = await axios.post(`${API_URL}/dashboard/filter-cves`, {
        filterType,
        filterValue,
        page,
        limit: 100
      });
      setCveList(response.data.cves);
      setCveTotal(response.data.total);
    } catch (error) {
      console.error('CVE 목록 로드 실패:', error);
    } finally {
      setCveLoading(false);
    }
  };

  const handleCvePageChange = (event, newPage) => {
    setCvePage(newPage);
    loadFilteredCves(selectedFilter.type, selectedFilter.value, newPage);
  };

  const handleProductExpand = async (product) => {
    if (expandedProduct === product) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(product);
      if (!productCves[product]) {
        try {
          const response = await axios.post(`${API_URL}/dashboard/filter-cves`, {
            filterType: 'product',
            filterValue: product,
            page: 1,
            limit: 5
          });
          setProductCves(prev => ({
            ...prev,
            [product]: response.data.cves
          }));
        } catch (error) {
          console.error('제품 CVE 로드 실패:', error);
        }
      }
    }
  };

  // AI 분석 완료 = AI_chk='Y' (POC 수집 = 완료 + 대기 성립)
  const analyzedComplete = Math.max(0, (stats.total_pocs ?? 0) - (stats.pending_pocs ?? 0));
  const analysisProgress = stats.total_pocs > 0 
    ? Math.min(100, (analyzedComplete / stats.total_pocs * 100)).toFixed(1) 
    : 0;

  const cards = [
    { 
      title: 'CVE 정보', 
      value: stats.total_cves, 
      icon: <BugReport />, 
      color: '#1976d2',
      description: '수집된 CVE 총 개수'
    },
    { 
      title: 'POC 수집', 
      value: stats.total_pocs, 
      icon: <Code />, 
      color: '#42a5f5',
      description: 'GitHub POC 저장소 개수'
    },
    { 
      title: 'AI 분석 완료', 
      value: analyzedComplete, 
      icon: <CheckCircle />, 
      color: '#66bb6a',
      description: 'AI_chk=Y (분석 완료된 POC)'
    },
    { 
      title: 'AI 분석 대기', 
      value: stats.pending_pocs, 
      icon: <HourglassEmpty />, 
      color: '#ff9800',
      description: 'AI_chk=N (미분석 POC)'
    },
  ];

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>통계 로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1} color="primary.main">
        취약점 관리 대시보드
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="body1" color="text.secondary">
          실시간 CVE 취약점 정보 수집 및 AI 분석 시스템
        </Typography>
        {stats.stats_updated_at && (
          <Chip 
            icon={<Speed />}
            label={`통계 집계: ${formatDateTime(stats.stats_updated_at)}`}
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Box>
      
      {/* 통계 카드 */}
      <Grid container spacing={3} mb={3}>
        {cards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card 
              sx={{ 
                background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}dd 100%)`, 
                color: 'white', 
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
                      {card.title}
                    </Typography>
                    <Typography variant="h3" fontWeight={700}>
                      {card.value.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ fontSize: 50, opacity: 0.3 }}>
                    {card.icon}
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {card.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 보안분석 AI 할당량 요약 카드 */}
      {quotaData && (
        <Card 
          sx={{ 
            mb: 3, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            cursor: user?.role === 'admin' ? 'pointer' : 'default',
            transition: 'all 0.3s',
            '&:hover': user?.role === 'admin' ? { 
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(102, 126, 234, 0.4)'
            } : {},
            opacity: user?.role === 'admin' ? 1 : 0.95
          }}
          onClick={() => {
            if (user?.role === 'admin') {
              navigate('/gemini-quota');
            }
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SmartToy sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h5" fontWeight={700}>
                    🤖 보안분석 AI 할당량 현황
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                    실시간 AI 분석 시스템 모니터링
                  </Typography>
                </Box>
              </Box>
              {user?.role === 'admin' && (
                <Chip 
                  label="운영자 전용" 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.3)'
                  }} 
                />
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>오늘 요청</Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {quotaData.summary.total_requests}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    / {quotaData.summary.total_quota_limit} (사용률: {quotaData.summary.overall_usage_rate}%)
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>활성 계정</Typography>
                  <Typography variant="h4" fontWeight={700} color="success.light">
                    {quotaData.summary.active_accounts}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    / {quotaData.summary.total_accounts}개 계정
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>소진 계정</Typography>
                  <Typography variant="h4" fontWeight={700} color="error.light">
                    {quotaData.summary.exhausted_accounts}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    / {quotaData.summary.total_accounts}개 계정
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>AI 계정 관리</Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.aiQuotaStats.active_accounts || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    / {stats.aiQuotaStats.total_accounts || 0}개 계정
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                    429 에러: {stats.aiQuotaStats.total_429_errors || 0}회
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
              {user?.role === 'admin' ? (
                <>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    💡 클릭하면 상세 할당량 관리 페이지로 이동합니다
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    🔒 상세 정보는 운영자만 확인할 수 있습니다
                  </Typography>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 수집 현황 그래프 (최근 30일) */}
      {collectionTrends && (
        <Card sx={{ 
            mb: 3, 
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(46, 125, 50, 0.05) 100%)',
            border: '1px solid rgba(25, 118, 210, 0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ 
                  mr: 2, 
                  p: 1.5, 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.2), rgba(46, 125, 50, 0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShowChart sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                    📊 수집 현황 (최근 30일)
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, color: 'text.secondary' }}>
                    일별 CVE 및 POC 수집 추이 분석 · 그래프에서 날짜 클릭 시 해당 날짜 요약
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ 
              mb: 3, 
              display: 'flex', 
              gap: 4, 
              flexWrap: 'wrap',
              p: 2,
              borderRadius: '12px',
              background: 'rgba(0,0,0,0.02)'
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                p: 1.5,
                borderRadius: '8px',
                background: 'rgba(25, 118, 210, 0.1)',
                border: '1px solid rgba(25, 118, 210, 0.3)'
              }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: '#1976d2',
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.4)'
                }} />
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
                    CVE 수집
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#1976d2' }}>
                    {collectionTrends.totalCVE.toLocaleString()}건
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                p: 1.5,
                borderRadius: '8px',
                background: 'rgba(46, 125, 50, 0.1)',
                border: '1px solid rgba(46, 125, 50, 0.3)'
              }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: '#2e7d32',
                  boxShadow: '0 2px 8px rgba(46, 125, 50, 0.4)'
                }} />
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
                    POC 수집
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#2e7d32' }}>
                    {collectionTrends.totalPOC.toLocaleString()}건
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                p: 1.5,
                borderRadius: '8px',
                background: 'rgba(156, 39, 176, 0.1)',
                border: '1px solid rgba(156, 39, 176, 0.3)'
              }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  bgcolor: '#9c27b0',
                  boxShadow: '0 2px 8px rgba(156, 39, 176, 0.4)'
                }} />
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
                    AI 분석
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#9c27b0' }}>
                    {collectionTrends.totalAI?.toLocaleString() || 0}건
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ width: '100%', height: 400, mt: 2 }}>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart
                  data={collectionTrends.trends.map(t => ({ ...t, _click: Math.max(1, t.cve || 0, t.poc || 0, t.ai || 0) }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <defs>
                    <linearGradient id="colorCVE" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.9}/>
                      <stop offset="50%" stopColor="#1976d2" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorPOC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.9}/>
                      <stop offset="50%" stopColor="#2e7d32" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#2e7d32" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.9}/>
                      <stop offset="50%" stopColor="#9c27b0" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#9c27b0" stopOpacity={0.1}/>
                    </linearGradient>
                    <filter id="shadow">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="rgba(0,0,0,0.1)" 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="dateLabel" 
                    stroke="#666"
                    tick={{ fill: '#333', fontSize: 11, fontWeight: 500 }}
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={2}
                  />
                  <YAxis 
                    stroke="#666"
                    tick={{ fill: '#333', fontSize: 11, fontWeight: 500 }}
                    style={{ fontSize: '11px' }}
                    label={{ 
                      value: '수집 건수', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: '#333', fontSize: 12, fontWeight: 600 }
                    }}
                  />
                  <Tooltip 
                    content={({ payload, label }) => {
                      if (!payload || !payload.length) return null;
                      const filtered = payload.filter(p => p.dataKey !== '_click');
                      if (!filtered.length) return null;
                      const pl = payload[0]?.payload;
                      const dateLabel = pl?.fullDateLabel || label;
                      return (
                        <Paper sx={{ p: 2, minWidth: 140, boxShadow: 3 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>📅 {dateLabel}</Typography>
                          {filtered.map((p) => {
                            const name = p.dataKey === 'cve' ? 'CVE 수집' : p.dataKey === 'poc' ? 'POC 수집' : p.dataKey === 'ai' ? 'AI 분석' : p.dataKey;
                            const color = p.dataKey === 'cve' ? '#1976d2' : p.dataKey === 'poc' ? '#2e7d32' : '#9c27b0';
                            return (
                              <Typography key={p.dataKey} variant="body2" sx={{ color }}>{name}: {Number(p.value || 0).toLocaleString()}건</Typography>
                            );
                          })}
                        </Paper>
                      );
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      paddingTop: '30px',
                      paddingBottom: '10px'
                    }}
                    iconType="circle"
                    formatter={(value) => {
                      if (value === 'cve') return <span style={{ color: '#1976d2', fontWeight: 600 }}>CVE 수집</span>;
                      if (value === 'poc') return <span style={{ color: '#2e7d32', fontWeight: 600 }}>POC 수집</span>;
                      if (value === 'ai') return <span style={{ color: '#9c27b0', fontWeight: 600 }}>AI 분석</span>;
                      return value;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cve" 
                    stroke="#1976d2" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCVE)" 
                    name="cve"
                    dot={<ClickableDot fill="#1976d2" />}
                    activeDot={<ClickableDot fill="#1976d2" />}
                    animationDuration={800}
                    onClick={(e, payload) => { const p = payload ?? e?.payload ?? e; p?.date && navigate(`/dashboard/collection-trends/${p.date}`); }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="poc" 
                    stroke="#2e7d32" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPOC)" 
                    name="poc"
                    dot={<ClickableDot fill="#2e7d32" />}
                    activeDot={<ClickableDot fill="#2e7d32" />}
                    animationDuration={800}
                    onClick={(e, payload) => { const p = payload ?? e?.payload ?? e; p?.date && navigate(`/dashboard/collection-trends/${p.date}`); }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ai" 
                    stroke="#9c27b0" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAI)" 
                    name="ai"
                    dot={<ClickableDot fill="#9c27b0" />}
                    activeDot={<ClickableDot fill="#9c27b0" />}
                    animationDuration={800}
                    onClick={(e, payload) => { const p = payload ?? e?.payload ?? e; p?.date && navigate(`/dashboard/collection-trends/${p.date}`); }}
                  />
                  <Bar 
                    dataKey="_click" 
                    fill="transparent" 
                    cursor="pointer" 
                    onClick={(e) => e?.payload?.date && navigate(`/dashboard/collection-trends/${e.payload.date}`)}
                    barSize={60}
                    legendType="none"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 최근 수집된 CVE, 최신 등록된 CVE, 최근 수집된 POC - 한 줄 배치 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* 최근 수집된 CVE */}
        <Grid item xs={12} sm={6} md={4} sx={{ minWidth: 0 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  최근 수집된 CVE (Top 10)
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>CVE 코드</strong></TableCell>
                      <TableCell><strong>상태</strong></TableCell>
                      <TableCell><strong>CVSS 점수</strong></TableCell>
                      <TableCell><strong>위험도</strong></TableCell>
                      <TableCell><strong>수집 시간</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentCollectedCVEs && stats.recentCollectedCVEs.length > 0 ? (
                      stats.recentCollectedCVEs.map((cve, idx) => (
                        <TableRow 
                          key={idx} 
                          hover 
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/cve/${cve.CVE_Code}`)}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} color="primary">
                              {cve.CVE_Code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={cve.state || '-'} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {cve.CVSS_Score || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={cve.CVSS_Serverity || '-'} 
                              size="small" 
                              sx={{ 
                                bgcolor: getCVSSColor(cve.CVSS_Serverity),
                                color: cve.CVSS_Serverity ? 'white' : 'grey.600',
                                fontWeight: 600
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {cve.collect_time ? formatDate(cve.collect_time) : '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="text.secondary">
                            데이터가 없습니다
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
          </Grid>

          {/* 최신 등록된 CVE */}
          <Grid item xs={12} sm={6} md={4} sx={{ minWidth: 0 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Timeline color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  최신 등록된 CVE (Top 10)
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>CVE 코드</strong></TableCell>
                      <TableCell><strong>제품</strong></TableCell>
                      <TableCell><strong>CVSS</strong></TableCell>
                      <TableCell><strong>등록일</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.latestCVEs && stats.latestCVEs.length > 0 ? (
                      stats.latestCVEs.map((cve, idx) => (
                        <TableRow key={idx} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cve/${cve.CVE_Code}`)}>
                          <TableCell>
                            <Typography variant="body2" color="primary" fontWeight={500}>
                              {cve.CVE_Code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {cve.product || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={cve.CVSS_Score || '-'} 
                              size="small" 
                              sx={{ 
                                bgcolor: getCVSSColor(cve.CVSS_Score >= 9 ? 'CRITICAL' : cve.CVSS_Score >= 7 ? 'HIGH' : cve.CVSS_Score >= 4 ? 'MEDIUM' : 'LOW'),
                                color: 'white',
                                fontWeight: 600
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {cve.datePublished ? formatDate(cve.datePublished) : '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">
                            데이터가 없습니다
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
          </Grid>

          {/* 최근 수집된 POC */}
          <Grid item xs={12} sm={6} md={4} sx={{ minWidth: 0 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Code color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  최근 수집된 POC (Top 10)
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>제목</strong></TableCell>
                      <TableCell><strong>CVE</strong></TableCell>
                      <TableCell><strong>작성자</strong></TableCell>
                      <TableCell><strong>수집 시간</strong></TableCell>
                      <TableCell align="center"><strong>AI</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentPocs && stats.recentPocs.length > 0 ? (
                      stats.recentPocs.map((poc, idx) => {
                        const displayCollectedAt = poc.collect_time ? formatDateTime(poc.collect_time) : '-';
                        const aiStatus = poc.AI_chk === 'Y';
                        return (
                          <TableRow
                            key={poc.id || idx}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/poc/${poc.id}`)}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
                                {poc.title || '제목 없음'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="primary" fontWeight={500}>
                                {poc.cve || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                                {poc.writer || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {displayCollectedAt}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={aiStatus ? '완료' : '대기'}
                                size="small"
                                color={aiStatus ? 'success' : 'warning'}
                                variant={aiStatus ? 'filled' : 'outlined'}
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="text.secondary">
                            데이터가 없습니다
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 2번째 줄: CVSS 위험도, CWE 유형, AI 분석 진행률 */}
      <Grid container spacing={3} mb={3}>
        {/* CVSS 위험도 분포 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  CVSS 위험도 분포
                </Typography>
              </Box>
              <Box>
                {stats.cvssDistribution.length > 0 ? (
                  stats.cvssDistribution.map((item, idx) => {
                    const total = stats.cvssDistribution.reduce((sum, d) => sum + d.count, 0);
                    const percentage = (item.count / total * 100).toFixed(1);
                    return (
                      <Box key={idx} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box 
                              sx={{ 
                                width: 12, 
                                height: 12, 
                                borderRadius: '50%', 
                                bgcolor: getCVSSColor(item.CVSS_Serverity),
                                mr: 1
                              }} 
                            />
                            <Typography variant="body2" fontWeight={500}>
                              {item.CVSS_Serverity || '-'}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {item.count}건 ({percentage}%)
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={parseFloat(percentage)} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getCVSSColor(item.CVSS_Serverity)
                            }
                          }}
                        />
                      </Box>
                    );
                  })
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center">
                    데이터가 없습니다
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* CWE 유형별 분석 - TOP 5 + 클릭 가능 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Category color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    CWE 유형 (Top 5)
                  </Typography>
                </Box>
                {stats.cweTypeStats.length > 5 && (
                  <Button 
                    size="small" 
                    endIcon={<VisibilityOutlined />}
                    onClick={() => handleOpenDialog('CWE 유형 (전체)', stats.cweTypeStats, 'cwe')}
                  >
                    더보기
                  </Button>
                )}
              </Box>
              <Box>
                {stats.cweTypeStats.length === 0 ? (
                  // 로딩 스켈레톤
                  Array(5).fill(0).map((_, idx) => (
                    <Box key={idx} sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Skeleton variant="text" width="80%" height={20} />
                    </Box>
                  ))
                ) : (
                  stats.cweTypeStats.slice(0, 5).map((item, idx) => (
                    <Box 
                      key={idx} 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 1.5,
                        mb: 1,
                        bgcolor: idx % 2 === 0 ? 'grey.50' : 'white',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'primary.light',
                          transform: 'translateX(4px)',
                          transition: 'all 0.2s'
                        }
                      }}
                      onClick={() => handleOpenCveDialog('cwe', item.cwe_type)}
                    >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={`#${idx + 1}`} 
                        size="small" 
                        sx={{ 
                          bgcolor: idx < 3 ? '#1976d2' : 'grey.300', 
                          color: idx < 3 ? 'white' : 'black',
                          fontWeight: 600,
                          width: 36
                        }} 
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {item.cwe_type}
                      </Typography>
                    </Box>
                    <Chip label={`${item.count}건`} size="small" color="primary" variant="outlined" />
                  </Box>
                ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 보안전문가 AI 분석 진행률 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SmartToy color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  AI 분석 진행률
                </Typography>
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    분석 완료
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {analysisProgress}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={analysisProgress} 
                  sx={{ height: 10, borderRadius: 5, mb: 2 }}
                />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    완료: <strong>{analyzedComplete.toLocaleString()}</strong> / {stats.total_pocs.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    대기: <strong>{stats.pending_pocs.toLocaleString()}</strong>건
                  </Typography>
                </Box>

                <Paper sx={{ p: 1.5, bgcolor: '#e3f2fd', border: '1px solid #90caf9', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Speed sx={{ fontSize: 16, color: 'info.main' }} />
                    <Typography variant="caption" fontWeight={600} color="info.main">
                      분석 속도
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={600} color="info.dark">
                    분당 최대 3건 (3개 동시)
                  </Typography>
                </Paper>

                <Paper sx={{ p: 1.5, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Timeline sx={{ fontSize: 16, color: 'warning.main' }} />
                    <Typography variant="caption" fontWeight={600} color="warning.main">
                      예상 완료
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={600} color="warning.dark">
                    {stats.pending_pocs > 0 ? `약 ${Math.ceil(stats.pending_pocs * 3 / 60 / 3)}시간` : '완료'}
                  </Typography>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3번째 줄: 공격 단계별 분석, 공격 유형별 분석, 영향받는 제품 */}
      <Grid container spacing={3} mb={3}>
        {/* 공격 단계별 분석 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Shield color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    공격 단계별 분석 (Top 10)
                  </Typography>
                </Box>
                {stats.attackStageStats.length > 10 && (
                  <Button 
                    size="small" 
                    endIcon={<VisibilityOutlined />}
                    onClick={() => handleOpenDialog('공격 단계별 분석 (전체)', stats.attackStageStats, 'stage')}
                  >
                    더보기
                  </Button>
                )}
              </Box>
              <Box>
                {stats.attackStageStats.length === 0 ? (
                  Array(5).fill(0).map((_, idx) => (
                    <Box key={idx} sx={{ mb: 2 }}>
                      <Skeleton variant="text" width="60%" height={20} />
                      <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 4 }} />
                    </Box>
                  ))
                ) : (
                  stats.attackStageStats.slice(0, 10).map((item, idx) => {
                  const total = stats.attackStageStats.reduce((sum, d) => sum + d.count, 0);
                  const percentage = (item.count / total * 100).toFixed(1);
                  return (
                    <Box 
                      key={idx} 
                      sx={{ mb: 2, cursor: 'pointer' }}
                      onClick={() => handleOpenCveDialog('stage', item.attack_stage)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ '&:hover': { color: 'primary.main' } }}>
                          📌 {item.attack_stage}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.count}건 ({percentage}%)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={parseFloat(percentage)} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: getStageColor(item.vuln_stage)
                          }
                        }}
                      />
                    </Box>
                  );
                })
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 공격 유형별 통계 - TOP 20 + 클릭 가능 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Security color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    공격 유형별 분석 (Top 10)
                  </Typography>
                </Box>
                {stats.attackTypeStats.length > 10 && (
                  <Button 
                    size="small" 
                    endIcon={<VisibilityOutlined />}
                    onClick={() => handleOpenDialog('공격 유형별 분석 (전체)', stats.attackTypeStats, 'attack')}
                  >
                    더보기
                  </Button>
                )}
              </Box>
              <Box>
                {stats.attackTypeStats.length === 0 ? (
                  // 로딩 스켈레톤
                  Array(5).fill(0).map((_, idx) => (
                    <Box key={idx} sx={{ mb: 2 }}>
                      <Skeleton variant="text" width="70%" height={20} />
                      <Skeleton variant="rectangular" width="100%" height={6} sx={{ borderRadius: 3 }} />
                    </Box>
                  ))
                ) : (
                  stats.attackTypeStats.slice(0, 10).map((item, idx) => {
                    const total = stats.attackTypeStats.reduce((sum, d) => sum + d.count, 0);
                    const percentage = (item.count / total * 100).toFixed(1);
                    return (
                    <Box 
                      key={idx} 
                      sx={{ mb: 2, cursor: 'pointer' }}
                      onClick={() => handleOpenCveDialog('attack_type', item.attack_type)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={500} 
                          noWrap 
                          sx={{ maxWidth: '70%', '&:hover': { color: 'primary.main' } }}
                        >
                          🎯 {item.attack_type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.count}건
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={parseFloat(percentage)} 
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  );
                })
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 영향받는 제품 Top 20 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Extension color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    영향받는 제품 (Top 10)
                  </Typography>
                </Box>
                {stats.productStats.length > 10 && (
                  <Button 
                    size="small" 
                    endIcon={<VisibilityOutlined />}
                    onClick={() => handleOpenDialog('영향받는 제품 (전체)', stats.productStats, 'product')}
                  >
                    더보기
                  </Button>
                )}
              </Box>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {stats.productStats.length === 0 ? (
                  <List dense disablePadding>
                    {Array(5).fill(0).map((_, idx) => (
                      <Box key={idx} sx={{ p: 1.5, mb: 0.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Skeleton variant="text" width="90%" height={20} />
                      </Box>
                    ))}
                  </List>
                ) : (
                  <List dense disablePadding>
                    {stats.productStats.slice(0, 10).map((item, idx) => (
                      <Box key={idx}>
                        <ListItemButton 
                          onClick={() => handleOpenCveDialog('product', item.product)}
                          sx={{ 
                            borderRadius: 1,
                            mb: 0.5,
                            bgcolor: 'grey.50',
                            '&:hover': { bgcolor: 'primary.light' }
                          }}
                        >
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label={`#${idx + 1}`} 
                                  size="small" 
                                  color={idx < 3 ? 'error' : 'default'}
                                  sx={{ minWidth: 45 }}
                                />
                                <Typography variant="body2" fontWeight={500} noWrap>
                                  {item.product}
                                </Typography>
                              </Box>
                            }
                          />
                          <Chip 
                            label={`${item.count}건`} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        </ListItemButton>
                      </Box>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 더보기 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {dialogData.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              총 {statsList.length}개 (페이지: {statsPage}/{Math.ceil(statsList.length / statsLimit)})
            </Typography>
          </Box>
          <IconButton onClick={() => setDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>순위</strong></TableCell>
                  <TableCell><strong>항목</strong></TableCell>
                  <TableCell align="right"><strong>건수</strong></TableCell>
                  <TableCell align="center" colSpan={dialogData.type === 'stage' ? 2 : 1}><strong>상세</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getCurrentPageStats().map((item, idx) => {
                  const globalIdx = (statsPage - 1) * statsLimit + idx;
                  return (
                    <TableRow key={idx} hover>
                    <TableCell>
                      <Chip 
                        label={`#${globalIdx + 1}`} 
                        size="small" 
                        color={globalIdx < 3 ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {dialogData.type === 'stage' && item.attack_stage}
                      {dialogData.type === 'cwe' && item.cwe_type}
                      {dialogData.type === 'attack' && item.attack_type}
                      {dialogData.type === 'product' && item.product}
                    </TableCell>
                    <TableCell align="right">
                      <Chip label={`${item.count}건`} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          setDialogOpen(false);
                          handleOpenCveDialog(
                            dialogData.type,
                            dialogData.type === 'stage' ? item.attack_stage :
                            dialogData.type === 'cwe' ? item.cwe_type :
                            dialogData.type === 'attack' ? item.attack_type :
                            item.product
                          );
                        }}
                      >
                        CVE 보기
                      </Button>
                    </TableCell>
                    {dialogData.type === 'stage' && (
                      <TableCell align="center">
                        <Button 
                          size="small" 
                          variant="contained"
                          color="error"
                          startIcon={<Security />}
                          onClick={() => {
                            setSelectedTechnique('');
                            setSelectedStageName(item.attack_stage);
                            setMitreDialogOpen(true);
                          }}
                        >
                          MITRE 설명
                        </Button>
                      </TableCell>
                    )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', mb: 1 }}>
            <Pagination
              count={Math.ceil(statsList.length / statsLimit)}
              page={statsPage}
              onChange={handleStatsPageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
          <Button onClick={() => setDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* CVE 목록 다이얼로그 */}
      <Dialog open={cveDialogOpen} onClose={() => setCveDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              CVE 상세 목록
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedFilter.type === 'stage' && `공격 단계: ${selectedFilter.value}`}
              {selectedFilter.type === 'cwe' && `CWE 유형: ${selectedFilter.value}`}
              {selectedFilter.type === 'attack_type' && `공격 유형: ${selectedFilter.value}`}
              {selectedFilter.type === 'product' && `제품: ${selectedFilter.value}`}
            </Typography>
          </Box>
          <IconButton onClick={() => setCveDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {cveLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <LinearProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                CVE 목록을 불러오는 중...
              </Typography>
            </Box>
          ) : cveList.length > 0 ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      <TableCell sx={{ color: 'white' }}><strong>CVE 코드</strong></TableCell>
                      <TableCell sx={{ color: 'white' }}><strong>제품</strong></TableCell>
                      <TableCell sx={{ color: 'white' }}><strong>CVSS</strong></TableCell>
                      <TableCell sx={{ color: 'white' }}><strong>위험도</strong></TableCell>
                      <TableCell sx={{ color: 'white' }}><strong>상태</strong></TableCell>
                      <TableCell sx={{ color: 'white' }}><strong>수집 시간</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cveList.map((cve, idx) => (
                      <TableRow 
                        key={idx} 
                        hover 
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          setCveDialogOpen(false);
                          navigate(`/cve/${cve.CVE_Code}`);
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {cve.CVE_Code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {cve.product || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {cve.CVSS_Score || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={cve.CVSS_Serverity || '-'} 
                            size="small"
                            sx={{ 
                              bgcolor: getCVSSColor(cve.CVSS_Serverity),
                              color: cve.CVSS_Serverity ? 'white' : 'grey.600'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={cve.state || '-'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(cve.collect_time)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(cveTotal / 10)}
                  page={cvePage}
                  onChange={handleCvePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            </>
          ) : (
            <Alert severity="info">
              해당 조건에 맞는 CVE가 없습니다.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', ml: 2 }}>
            총 {cveTotal}개의 CVE 발견
          </Typography>
          <Button onClick={() => setCveDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* MITRE ATT&CK 다이얼로그 */}
      <MitreDialog 
        open={mitreDialogOpen} 
        onClose={() => {
          setMitreDialogOpen(false);
          setSelectedTechnique('');
          setSelectedStageName('');
        }} 
        techniqueId={selectedTechnique}
        stageName={selectedStageName}
      />
    </Box>
  );
}
