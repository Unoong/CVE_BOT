import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Paper, Accordion,
  AccordionSummary, AccordionDetails, Divider, Link as MuiLink,
  List, ListItem, ListItemButton, ListItemText, CircularProgress, Alert, Button,
  TextField, IconButton, Avatar, Stack
} from '@mui/material';
import { ExpandMore, GitHub, Person, CalendarToday, Code, Psychology, Security, ArrowBack, BugReport, Refresh, ThumbUp, ThumbDown, Comment, Send, Edit, Delete, History, Cancel } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import MitreDialog from '../components/MitreDialog';
import { formatDate, formatDateTime } from '../utils/dateFormat';

export default function POCDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mitreDialogOpen, setMitreDialogOpen] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeSuccess, setReanalyzeSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [rating, setRating] = useState({ likes: 0, dislikes: 0, userRating: null });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [reanalyzeHistory, setReanalyzeHistory] = useState([]);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  useEffect(() => {
    // 사용자 정보 로드
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('사용자 정보 파싱 실패:', e);
      }
    }

    // POC 데이터 로드
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const promises = [
          axios.get(`${API_URL}/poc/${id}`),
          axios.get(`${API_URL}/poc/${id}/comments`).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/poc/${id}/reanalyze-history`).catch(() => ({ data: [] }))
        ];
        
        // 평가는 로그인한 경우에만 조회
        if (token) {
          promises.push(
            axios.get(`${API_URL}/poc/${id}/rating`, { headers }).catch(() => ({ data: { likes: 0, dislikes: 0, userRating: null } }))
          );
        } else {
          promises.push(Promise.resolve({ data: { likes: 0, dislikes: 0, userRating: null } }));
        }
        
        const [pocRes, commentsRes, historyRes, ratingRes] = await Promise.all(promises);
        
        setData(pocRes.data);
        setRating(ratingRes.data);
        setComments(commentsRes.data);
        setReanalyzeHistory(historyRes.data);
        setLoading(false);
      } catch (err) {
        setError('데이터를 불러오는데 실패했습니다');
        setLoading(false);
        console.error(err);
      }
    };
    
    loadData();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return <Alert severity="error">{error || '데이터를 찾을 수 없습니다'}</Alert>;
  }

  const { poc, aiAnalysis, relatedPocs = [], cveInfo = null } = data;

  const handleBackToCVE = () => {
    if (cveInfo?.CVE_Code) {
      navigate(`/cve/${cveInfo.CVE_Code}`);
    } else {
      navigate('/cve');
    }
  };

  const handlePocClick = (pocId, e) => {
    if (e.ctrlKey || e.metaKey) {
      // 컨트롤+클릭 또는 Cmd+클릭: 새 창에서 열기
      window.open(`/poc/${pocId}`, '_blank');
    } else {
      // 일반 클릭: 같은 창에서 이동
      navigate(`/poc/${pocId}`);
    }
  };

  const handleCveCodeClick = (cveCode, e) => {
    if (e.ctrlKey || e.metaKey) {
      // 컨트롤+클릭 또는 Cmd+클릭: 새 창에서 열기
      window.open(`/cve/${cveCode}`, '_blank');
    } else {
      // 일반 클릭: 같은 창에서 이동
      navigate(`/cve/${cveCode}`);
    }
  };

  const handleReanalyze = async () => {
    if (!window.confirm('이 POC를 재분석하시겠습니까? 기존 분석 결과는 삭제되고 새로 분석됩니다.')) {
      return;
    }

    setReanalyzing(true);
    setReanalyzeSuccess('');
    setError('');
    
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        `${API_URL}/poc/${id}/reanalyze`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setReanalyzeSuccess(res.data.message || '재분석이 요청되었습니다. AI 분석기가 실행되면 자동으로 분석됩니다.');
      
      // 3초 후 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || '재분석 요청에 실패했습니다');
      setReanalyzing(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  const handleRating = async (ratingValue) => {
    if (!user) {
      alert('로그인이 필요합니다');
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      if (rating.userRating === ratingValue) {
        // 같은 평가를 다시 클릭하면 삭제
        await axios.delete(`${API_URL}/poc/${id}/rating`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRating({ ...rating, userRating: null, [ratingValue === 1 ? 'likes' : 'dislikes']: rating[ratingValue === 1 ? 'likes' : 'dislikes'] - 1 });
      } else {
        // 새 평가 등록 또는 변경
        await axios.post(
          `${API_URL}/poc/${id}/rating`,
          { rating: ratingValue },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        let newLikes = rating.likes;
        let newDislikes = rating.dislikes;
        
        if (rating.userRating === 1) {
          newLikes--;
        } else if (rating.userRating === -1) {
          newDislikes--;
        }
        
        if (ratingValue === 1) {
          newLikes++;
        } else {
          newDislikes++;
        }
        
        setRating({ likes: newLikes, dislikes: newDislikes, userRating: ratingValue });
      }
    } catch (err) {
      setError(err.response?.data?.error || '평가 저장에 실패했습니다');
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) {
      return;
    }
    
    if (!user) {
      alert('로그인이 필요합니다');
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        `${API_URL}/poc/${id}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (err) {
      setError(err.response?.data?.error || '댓글 작성에 실패했습니다');
    }
  };

  const handleCommentEdit = async (commentId) => {
    if (!editCommentContent.trim()) {
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const res = await axios.put(
        `${API_URL}/poc/${id}/comments/${commentId}`,
        { content: editCommentContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(comments.map(c => c.id === commentId ? res.data : c));
      setEditingCommentId(null);
      setEditCommentContent('');
    } catch (err) {
      setError(err.response?.data?.error || '댓글 수정에 실패했습니다');
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) {
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      await axios.delete(
        `${API_URL}/poc/${id}/comments/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      setError(err.response?.data?.error || '댓글 삭제에 실패했습니다');
    }
  };

  return (
    <Box>
      {/* CVE 목록으로 돌아가기 버튼 */}
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={handleBackToCVE}
        sx={{ mb: 3 }}
      >
        {cveInfo?.CVE_Code ? `${cveInfo.CVE_Code} 상세로 이동` : 'CVE 목록으로 돌아가기'}
      </Button>

      {/* POC 헤더 */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', color: 'white' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {poc.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                <Chip icon={<Person />} label={poc.writer} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                <Chip label={poc.cve} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                <Chip icon={<CalendarToday />} label={`작성일 ${poc.date ? formatDateTime(poc.date) : '-'}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                <Chip icon={<CalendarToday />} label={`수집일 ${poc.collect_time ? formatDateTime(poc.collect_time) : '-'}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              </Box>
            </Box>
            {isAdmin && (
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={handleReanalyze}
                disabled={reanalyzing}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)',
                  }
                }}
              >
                {reanalyzing ? '재분석 중...' : '재분석'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {reanalyzeSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setReanalyzeSuccess('')}>
          {reanalyzeSuccess}
        </Alert>
      )}

      {/* CVE 상세 정보 */}
      {cveInfo && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" fontWeight={700} mb={3} color="primary">
              <Security sx={{ fontSize: 35, verticalAlign: 'middle', mr: 1 }} />
              CVE 상세 정보
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={600}>CVE 코드</Typography>
                  <Box 
                    component="span"
                    onClick={(e) => handleCveCodeClick(cveInfo.CVE_Code, e)}
                    sx={{ 
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      mt: 1,
                      '&:hover': { 
                        color: 'primary.main',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    <BugReport sx={{ fontSize: 20 }} />
                    <Typography variant="h6">{cveInfo.CVE_Code}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    클릭하여 상세보기 (Ctrl+클릭: 새 창)
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={600}>상태</Typography>
                  <Chip label={cveInfo.state} color="primary" sx={{ mt: 1 }} />
                </Paper>
              </Grid>

              {cveInfo.product && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={600}>영향받는 제품</Typography>
                    <Typography variant="body2" mt={1}>{cveInfo.product}</Typography>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={600}>취약점 설명 (한국어)</Typography>
                  <Typography variant="body2" mt={1} sx={{ whiteSpace: 'pre-wrap' }}>
                    {cveInfo.descriptions || '설명 없음'}
                  </Typography>
                </Paper>
              </Grid>

              {cveInfo.effect_version && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={600}>영향받는 버전</Typography>
                    <Typography variant="body2" mt={1}>{cveInfo.effect_version}</Typography>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
                  <Typography variant="caption" color="text.secondary">CVSS 점수</Typography>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {cveInfo.CVSS_Score || 'N/A'}
                  </Typography>
                  <Chip label={cveInfo.CVSS_Serverity || 'N/A'} color="error" size="small" sx={{ mt: 1 }} />
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={600}>공격 벡터</Typography>
                  <Typography variant="body2" mt={1}>{cveInfo.CVSS_Vertor || 'N/A'}</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={600}>CVSS 벡터 문자열</Typography>
                  <Typography variant="body2" mt={1} sx={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    {cveInfo.CVSS_vertorString || 'N/A'}
                  </Typography>
                </Paper>
              </Grid>

              {cveInfo.cweId && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={600}>CWE ID</Typography>
                    <Typography variant="body2" mt={1}>{cveInfo.cweId}</Typography>
                  </Paper>
                </Grid>
              )}

              {cveInfo.Attak_Type && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={600}>공격 유형</Typography>
                    <Typography variant="body2" mt={1}>{cveInfo.Attak_Type}</Typography>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">등록일</Typography>
                  <Typography variant="body2" mt={0.5}>
                    {cveInfo.dateReserved ? formatDate(cveInfo.dateReserved) : 'N/A'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">공개일</Typography>
                  <Typography variant="body2" mt={0.5}>
                    {cveInfo.datePublished ? formatDate(cveInfo.datePublished) : 'N/A'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">최종 업데이트</Typography>
                  <Typography variant="body2" mt={0.5}>
                    {cveInfo.dateUpdated ? formatDate(cveInfo.dateUpdated) : 'N/A'}
                  </Typography>
                </Paper>
              </Grid>

              {cveInfo.solutions && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                    <Typography variant="subtitle2" color="success.dark" fontWeight={600}>해결 방법 (한국어)</Typography>
                    <Typography variant="body2" mt={1} sx={{ whiteSpace: 'pre-wrap' }}>
                      {cveInfo.solutions}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* README 번역 */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2} color="primary">
                <Code sx={{ verticalAlign: 'middle', mr: 1 }} />
                README (한국어)
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
                {poc.trans_msg}
              </Typography>
            </CardContent>
          </Card>

          {/* AI 분석 결과 */}
          {poc.AI_chk === 'Y' && aiAnalysis && aiAnalysis.length > 0 && (
            <Card sx={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
              <CardContent>
                <Typography variant="h5" fontWeight={700} mb={3} color="primary">
                  <Psychology sx={{ fontSize: 35, verticalAlign: 'middle', mr: 1 }} />
                  AI 모델 POC 분석 결과
                </Typography>

                {/* CVE 요약 */}
                {aiAnalysis[0]?.cve_summary && (
                  <Paper sx={{ p: 3, mb: 3, bgcolor: 'white', border: '2px solid #1976d2' }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={700} mb={1}>
                      📋 취약점 요약
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                      {aiAnalysis[0].cve_summary}
                    </Typography>
                  </Paper>
                )}

                {/* 영향받는 제품 정보 */}
                {aiAnalysis[0]?.affected_products && (
                  <Paper sx={{ p: 3, mb: 3, bgcolor: 'white' }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={700} mb={2}>
                      🎯 영향받는 제품 및 버전
                    </Typography>
                    <Grid container spacing={2}>
                      {(() => {
                        try {
                          let products;
                          if (!aiAnalysis[0].affected_products) {
                            products = [];
                          } else if (typeof aiAnalysis[0].affected_products === 'string') {
                            // 문자열이 실제 JSON인지 확인
                            try {
                              products = JSON.parse(aiAnalysis[0].affected_products);
                            } catch (e) {
                              console.error('affected_products JSON parse failed:', e);
                              products = [];
                            }
                          } else {
                            products = aiAnalysis[0].affected_products;
                          }
                          
                          return products.map((product, idx) => (
                            <Grid item xs={12} md={6} key={idx}>
                              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                                <Typography variant="body2" fontWeight={600} color="primary">
                                  {product.vendor ? `${product.vendor} ${product.product}` : product.product}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                  취약 버전: {product.vulnerable_versions || 'N/A'}
                                </Typography>
                                {product.patched_version && (
                                  <Chip 
                                    label={`패치 버전: ${product.patched_version}`} 
                                    size="small" 
                                    color="success" 
                                    sx={{ mt: 1 }}
                                  />
                                )}
                              </Paper>
                            </Grid>
                          ));
                        } catch (e) {
                          console.error('affected_products 파싱 오류:', e);
                          return null;
                        }
                      })()}
                    </Grid>
                  </Paper>
                )}

                {/* 공격 단계 상세 분석 */}
                <Typography variant="h6" fontWeight={600} mb={2} color="primary.dark">
                  🔍 공격 단계 상세 분석 ({aiAnalysis.length}단계)
                </Typography>
                <Typography variant="body2" mb={3} color="text.secondary">
                  각 공격 단계의 패킷 정보, MITRE ATT&CK 매핑, Snort 탐지 규칙을 확인할 수 있습니다.
                </Typography>

                {aiAnalysis.map((step) => {
                  // 에러 정보 확인
                  const hasError = step.error_info && step.vuln_stage === 'ERROR';
                  let errorInfo = null;
                  if (hasError) {
                    try {
                      if (typeof step.error_info === 'string') {
                        errorInfo = JSON.parse(step.error_info);
                      } else {
                        errorInfo = step.error_info;
                      }
                    } catch (e) {
                      console.error('error_info JSON parse failed:', e);
                      errorInfo = null;
                    }
                  }
                  
                  return (
                  <Accordion key={step.id} sx={{ mb: 2, '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: hasError ? 'rgba(211, 47, 47, 0.05)' : 'rgba(25, 118, 210, 0.05)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Chip 
                          label={`Step ${step.step}`} 
                          color={hasError ? 'error' : 'primary'} 
                          size="small" 
                        />
                        <Typography fontWeight={600} color={hasError ? 'error.main' : 'inherit'}>
                          {step.vuln_stage}
                        </Typography>
                        {hasError && (
                          <Chip 
                            label="에러 상세보기" 
                            size="small" 
                            color="error"
                            variant="outlined"
                            sx={{ ml: 'auto', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // 에러 상세 다이얼로그 열기
                              setSelectedTechnique(JSON.stringify(errorInfo, null, 2));
                              setMitreDialogOpen(true);
                            }}
                          />
                        )}
                        {step.mitre_technique && (
                          <Chip 
                            label={step.mitre_technique} 
                            size="small" 
                            variant="outlined" 
                            sx={{ ml: 'auto', cursor: 'pointer', '&:hover': { bgcolor: 'error.light', color: 'white' } }} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTechnique(step.mitre_technique);
                              setMitreDialogOpen(true);
                            }}
                          />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {hasError ? (
                          // 에러가 있는 경우
                          <Grid item xs={12}>
                            <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
                              <Typography variant="subtitle2" color="error.dark" fontWeight={600} mb={1}>
                                ❌ AI 분석 실패 상세 정보
                              </Typography>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, mb: 2 }}>
                                {step.stage_description}
                              </Typography>
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="error.dark" fontWeight={600} mb={1}>
                                  🔍 에러 타입: {errorInfo?.error_type || 'Unknown'}
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, mb: 2 }}>
                                  {errorInfo?.error_message || '에러 메시지 없음'}
                                </Typography>
                                {errorInfo?.raw_output && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" color="error.dark" fontWeight={600} mb={1}>
                                      📄 원시 출력 (처음 500자):
                                    </Typography>
                                    <Paper sx={{ p: 2, bgcolor: '#263238', color: '#ffcdd2', fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.8rem', overflow: 'auto', maxHeight: 200 }}>
                                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {errorInfo.raw_output.substring(0, 500)}
                                        {errorInfo.raw_output.length > 500 ? '...' : ''}
                                      </pre>
                                    </Paper>
                                  </Box>
                                )}
                                {errorInfo?.stderr && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" color="error.dark" fontWeight={600} mb={1}>
                                      ⚠️ 표준 에러 출력:
                                    </Typography>
                                    <Paper sx={{ p: 2, bgcolor: '#263238', color: '#ffcdd2', fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.8rem', overflow: 'auto', maxHeight: 200 }}>
                                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {errorInfo.stderr}
                                      </pre>
                                    </Paper>
                                  </Box>
                                )}
                              </Box>
                            </Paper>
                          </Grid>
                        ) : (
                          // 정상 분석 결과인 경우
                          <>
                            <Grid item xs={12}>
                              <Paper sx={{ p: 2, bgcolor: '#fff8e1' }}>
                                <Typography variant="subtitle2" color="warning.dark" fontWeight={600} mb={1}>
                                  📌 공격 단계 설명
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                                  {step.stage_description}
                                </Typography>
                              </Paper>
                            </Grid>

                        <Grid item xs={12}>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="subtitle2" color="error.dark" fontWeight={600} mb={1}>
                            🚨 공격 패킷 상세 내용
                          </Typography>
                          <Paper sx={{ p: 3, bgcolor: '#263238', color: '#aed581', fontFamily: 'Consolas, Monaco, monospace', fontSize: '0.9rem', overflow: 'auto', maxHeight: 500 }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
{step.packet_text}
                            </pre>
                          </Paper>
                          <Typography variant="caption" color="text.secondary" mt={1} display="block">
                            ⚠️ 위 패킷은 실제 공격에 사용된 HTTP 요청 또는 네트워크 패킷입니다.
                          </Typography>
                        </Grid>

                        {step.mitre_tactic && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="primary" fontWeight={600}>
                              MITRE Tactic
                            </Typography>
                            <Typography variant="body2" mt={0.5}>{step.mitre_tactic}</Typography>
                          </Grid>
                        )}

                        {step.mitre_technique && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="primary" fontWeight={600}>
                              MITRE Technique
                            </Typography>
                            <Chip 
                              label={step.mitre_technique} 
                              color="error" 
                              size="small" 
                              sx={{ mt: 0.5, cursor: 'pointer', fontWeight: 600 }} 
                              onClick={() => {
                                setSelectedTechnique(step.mitre_technique);
                                setMitreDialogOpen(true);
                              }}
                            />
                          </Grid>
                        )}

                        {step.expected_response && (
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" color="success.dark" fontWeight={600} mb={1}>
                              ✅ 예상 서버 응답
                            </Typography>
                            <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                                {step.expected_response}
                              </Typography>
                            </Paper>
                          </Grid>
                        )}

                        {step.snort_rule && (
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" color="primary" fontWeight={600}>
                              <Security sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                              Snort 탐지 규칙
                            </Typography>
                            <Paper sx={{ p: 2, mt: 1, bgcolor: '#fff3e0', fontFamily: 'monospace', fontSize: '0.8rem', overflow: 'auto' }}>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {step.snort_rule}
                              </pre>
                            </Paper>
                          </Grid>
                        )}
                          </>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                  );
                })}

                {/* 대응 방법 */}
                {aiAnalysis[0].remediation && (
                  <Paper sx={{ p: 2, mt: 3, bgcolor: 'white' }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={600} mb={1}>
                      대응 방법
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {aiAnalysis[0].remediation}
                    </Typography>
                  </Paper>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* 사이드바 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2} color="primary">
                POC 정보
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">GitHub 링크</Typography>
                  <MuiLink href={poc.link} target="_blank" rel="noopener" sx={{ display: 'block', mt: 0.5, wordBreak: 'break-all' }}>
                    {poc.link}
                  </MuiLink>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">작성자</Typography>
                  <Typography variant="body2" mt={0.5}>{poc.writer}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">작성일 (GitHub)</Typography>
                  <Typography variant="body2" mt={0.5}>{poc.date ? formatDateTime(poc.date) : '-'}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">수집일 (시스템)</Typography>
                  <Typography variant="body2" mt={0.5}>{poc.collect_time ? formatDateTime(poc.collect_time) : '-'}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">다운로드 경로</Typography>
                  <Typography variant="body2" mt={0.5} sx={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    {poc.download_path}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 관련 POC 목록 */}
      {relatedPocs.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2} color="primary">
              같은 CVE의 다른 POC
            </Typography>
            <List>
              {relatedPocs.map((p) => (
                <ListItem key={p.id} disablePadding>
                  <ListItemButton onClick={(e) => handlePocClick(p.id, e)}>
                    <ListItemText
                      primary={p.title}
                      secondary={`${p.writer} • ${p.AI_chk === 'Y' ? 'AI 분석 완료' : '미분석'} • Ctrl+클릭: 새 창`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* 평가 섹션 */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2} color="primary">
            평가
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant={rating.userRating === 1 ? "contained" : "outlined"}
              color="success"
              startIcon={<ThumbUp />}
              onClick={() => handleRating(1)}
              disabled={!user}
            >
              좋아요 ({rating.likes})
            </Button>
            <Button
              variant={rating.userRating === -1 ? "contained" : "outlined"}
              color="error"
              startIcon={<ThumbDown />}
              onClick={() => handleRating(-1)}
              disabled={!user}
            >
              싫어요 ({rating.dislikes})
            </Button>
            {!user && (
              <Typography variant="caption" color="text.secondary">
                평가하려면 로그인이 필요합니다
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* 댓글 섹션 */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2} color="primary">
            댓글 ({comments.length})
          </Typography>
          
          {/* 댓글 작성 */}
          {user && (
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="댓글을 입력하세요..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<Send />}
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim()}
                >
                  댓글 작성
                </Button>
              </Box>
            </Box>
          )}

          {/* 댓글 목록 */}
          {comments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              아직 댓글이 없습니다
            </Typography>
          ) : (
            <List>
              {comments.map((comment) => (
                <ListItem
                  key={comment.id}
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid #e0e0e0',
                    pb: 2,
                    mb: 2
                  }}
                >
                  <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                      {(comment.nickname || comment.name || comment.username || 'U')[0].toUpperCase()}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {comment.nickname || comment.name || comment.username}
                        {comment.role === 'admin' && (
                          <Chip label="관리자" size="small" color="error" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                        )}
                        {comment.role === 'analyst' && (
                          <Chip label="분석가" size="small" color="warning" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(comment.created_at)}
                        {comment.updated_at !== comment.created_at && ' (수정됨)'}
                      </Typography>
                    </Box>
                    {(user?.id === comment.user_id || isAdmin) && (
                      <Box>
                        {editingCommentId === comment.id ? (
                          <>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleCommentEdit(comment.id)}
                            >
                              <Send fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditCommentContent('');
                              }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            {user?.id === comment.user_id && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditCommentContent(comment.content);
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleCommentDelete(comment.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    )}
                  </Box>
                  {editingCommentId === comment.id ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      sx={{ mt: 1 }}
                    />
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', ml: 5 }}>
                      {comment.content}
                    </Typography>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* 재분석 기록 섹션 */}
      {reanalyzeHistory.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2} color="primary">
              <History sx={{ verticalAlign: 'middle', mr: 1 }} />
              재분석 기록
            </Typography>
            <List>
              {reanalyzeHistory.map((record) => (
                <ListItem key={record.id}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" />
                        <Typography variant="body2" fontWeight={600}>
                          {record.nickname || record.name || record.username || '알 수 없음'}
                          {record.role === 'admin' && (
                            <Chip label="관리자" size="small" color="error" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                          )}
                        </Typography>
                      </Box>
                    }
                    secondary={formatDateTime(record.created_at)}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* MITRE ATT&CK 다이얼로그 */}
      <MitreDialog 
        open={mitreDialogOpen} 
        onClose={() => setMitreDialogOpen(false)} 
        techniqueId={selectedTechnique} 
      />
    </Box>
  );
}

