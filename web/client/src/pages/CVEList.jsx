import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CardActionArea, Chip, Grid,
  Pagination, TextField, MenuItem, InputAdornment, Button, Paper,
  Select, OutlinedInput, Checkbox, ListItemText, FormControl, InputLabel,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { BugReport, WorkspacePremium, Search, FilterList, Clear, Code, Security, ContentCopy } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import { formatDate } from '../utils/dateFormat';

export default function CVEList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0); // 0: CVE 목록, 1: 최종 패턴
  const [cves, setCves] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [hasPocFilter, setHasPocFilter] = useState('Y'); // 기본값: POC 있음
  const [hasAiFilter, setHasAiFilter] = useState('Y'); // 기본값: AI 분석 완료
  const [attackTypeFilter, setAttackTypeFilter] = useState([]); // 다중 선택
  const [sortBy, setSortBy] = useState('datePublished'); // 기본값: 공개일순
  const [sortOrder, setSortOrder] = useState('DESC');
  const [availableAttackTypes, setAvailableAttackTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  // 최종 패턴 탭 상태
  const [patterns, setPatterns] = useState([]);
  const [patternTotal, setPatternTotal] = useState(0);
  const [patternPage, setPatternPage] = useState(1);
  const [patternLimit, setPatternLimit] = useState(20);
  const [patternSearch, setPatternSearch] = useState('');
  const [patternSearchInput, setPatternSearchInput] = useState('');
  const [patternSeverity, setPatternSeverity] = useState('');
  const [patternVulnStage, setPatternVulnStage] = useState('');
  const [patternLoading, setPatternLoading] = useState(false);

  // URL 파라미터에서 필터 상태 복원
  useEffect(() => {
    const urlPage = searchParams.get('page');
    const urlLimit = searchParams.get('limit');
    const urlSearch = searchParams.get('search');
    const urlSeverity = searchParams.get('severity');
    const urlState = searchParams.get('state');
    const urlHasPoc = searchParams.get('hasPoc');
    const urlHasAi = searchParams.get('hasAi');
    const urlAttackTypes = searchParams.get('attackTypes');
    const urlSortBy = searchParams.get('sortBy');
    const urlSortOrder = searchParams.get('sortOrder');

    if (urlPage) setPage(parseInt(urlPage));
    if (urlLimit) setLimit(parseInt(urlLimit));
    if (urlSearch) {
      setSearch(urlSearch);
      setSearchInput(urlSearch);
    }
    if (urlSeverity !== null) setSeverityFilter(urlSeverity || '');
    if (urlState !== null) setStateFilter(urlState || '');
    // URL에 파라미터가 있으면 사용, 없으면 기본값 유지 (Y)
    if (urlHasPoc !== null) setHasPocFilter(urlHasPoc || 'Y');
    if (urlHasAi !== null) setHasAiFilter(urlHasAi || 'Y');
    if (urlAttackTypes) setAttackTypeFilter(urlAttackTypes.split(','));
    if (urlSortBy) setSortBy(urlSortBy);
    if (urlSortOrder) setSortOrder(urlSortOrder);
    const urlTab = searchParams.get('tab');
    if (urlTab === 'patterns') setActiveTab(1);
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  useEffect(() => {
    loadAvailableAttackTypes(); // 공격 유형 목록 로드
  }, []);

  useEffect(() => {
    if (activeTab === 1) loadPatterns();
  }, [activeTab, patternPage, patternLimit, patternSearch, patternSeverity, patternVulnStage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCVEs();
    }, 300); // 300ms 디바운싱
    
    return () => clearTimeout(timer);
  }, [page, limit, search, severityFilter, stateFilter, hasPocFilter, hasAiFilter, attackTypeFilter, sortBy, sortOrder]);

  const loadAvailableAttackTypes = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/detailed-stats`);
      const types = res.data.attackTypeStats.map(item => item.Attak_Type).filter(t => t);
      setAvailableAttackTypes(types);
    } catch (err) {
      console.error('공격 유형 목록 로드 실패:', err);
    }
  };

  const loadCVEs = async () => {
    if (loading) return; // 이미 로딩 중이면 중복 호출 방지
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(severityFilter && { severity: severityFilter }),
        ...(stateFilter && { state: stateFilter }),
        ...(hasPocFilter && { hasPoc: hasPocFilter }),
        ...(hasAiFilter && { hasAi: hasAiFilter }),
        ...(attackTypeFilter.length > 0 && { attackTypes: attackTypeFilter.join(',') })
      });
      
      // URL 업데이트 (필터 상태 유지)
      setSearchParams(params, { replace: true });
      
      console.log('[CVE 필터] hasPoc:', hasPocFilter, 'hasAi:', hasAiFilter, 'sortBy:', sortBy, 'sortOrder:', sortOrder);
      const res = await axios.get(`${API_URL}/cve/list?${params}`);
      setCves(res.data.cves);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPatterns = async () => {
    if (patternLoading) return;
    try {
      setPatternLoading(true);
      const params = new URLSearchParams({
        page: patternPage.toString(),
        limit: patternLimit.toString(),
        ...(patternSearch && { search: patternSearch }),
        ...(patternSeverity && { severity: patternSeverity }),
        ...(patternVulnStage && { vulnStage: patternVulnStage })
      });
      const res = await axios.get(`${API_URL}/cve/final-patterns?${params}`);
      setPatterns(res.data.patterns);
      setPatternTotal(res.data.total);
    } catch (err) {
      console.error('최종 패턴 조회 실패:', err);
    } finally {
      setPatternLoading(false);
    }
  };

  const handlePatternSearch = () => {
    setPatternSearch(patternSearchInput);
    setPatternPage(1);
  };

  const handleCopySnortRule = (rule) => {
    navigator.clipboard.writeText(rule);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchInput('');
    setSeverityFilter('');
    setStateFilter('');
    setHasPocFilter('Y'); // POC 있음 (기본값)
    setHasAiFilter('Y'); // AI 분석 완료 (기본값)
    setAttackTypeFilter([]);
    setSortBy('datePublished'); // 공개일순 (기본값)
    setSortOrder('DESC');
    setPage(1);
  };

  const getSeverityColor = (severity) => {
    if (!severity) return 'default';
    if (severity === 'CRITICAL') return 'error';
    if (severity === 'HIGH') return 'warning';
    if (severity === 'MEDIUM') return 'info';
    return 'success';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight={700} color="primary.main">
          CVE 정보
        </Typography>
        <Tabs value={activeTab} onChange={(e, v) => { setActiveTab(v); const next = new URLSearchParams(searchParams); if (v === 1) next.set('tab', 'patterns'); else next.delete('tab'); setSearchParams(next, { replace: true }); }}>
          <Tab label="CVE 목록" icon={<BugReport />} iconPosition="start" />
          <Tab label="최종 패턴" icon={<Security />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* CVE 목록 탭 */}
      {activeTab === 0 && (
      <>
      {/* 검색 및 필터 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterList color="primary" />
          <Typography variant="h6" fontWeight={600}>
            검색 및 필터
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {/* 첫 번째 줄 */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="CVE 코드, 제품명, 설명 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSearch}
              startIcon={<Search />}
              size="medium"
              sx={{ height: '40px' }}
            >
              검색
            </Button>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              label="위험도"
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="CRITICAL">CRITICAL</MenuItem>
              <MenuItem value="HIGH">HIGH</MenuItem>
              <MenuItem value="MEDIUM">MEDIUM</MenuItem>
              <MenuItem value="LOW">LOW</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              value={hasPocFilter}
              onChange={(e) => {
                setHasPocFilter(e.target.value);
                setPage(1);
              }}
              label="POC 존재"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Code fontSize="small" />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="Y">있음 ✅</MenuItem>
              <MenuItem value="N">없음</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              value={hasAiFilter}
              onChange={(e) => {
                setHasAiFilter(e.target.value);
                setPage(1);
              }}
              label="AI 분석"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <WorkspacePremium fontSize="small" />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="Y">완료 ✅</MenuItem>
              <MenuItem value="N">미완료</MenuItem>
            </TextField>
          </Grid>

          {/* 두 번째 줄 */}
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              label="상태"
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="PUBLISHED">PUBLISHED</MenuItem>
              <MenuItem value="REJECTED">REJECTED</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>공격 유형</InputLabel>
              <Select
                multiple
                value={attackTypeFilter}
                onChange={(e) => {
                  setAttackTypeFilter(e.target.value);
                  setPage(1);
                }}
                input={<OutlinedInput label="공격 유형" />}
                renderValue={(selected) => selected.length > 0 ? `${selected.length}개 선택` : '전체'}
              >
                {availableAttackTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    <Checkbox checked={attackTypeFilter.indexOf(type) > -1} size="small" />
                    <ListItemText primary={type} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              label="정렬 기준"
            >
              <MenuItem value="datePublished">공개일 ⭐</MenuItem>
              <MenuItem value="dateReserved">예약일</MenuItem>
              <MenuItem value="dateUpdated">업데이트일</MenuItem>
              <MenuItem value="collectTime">수집시간</MenuItem>
              <MenuItem value="latest">최신 등록순</MenuItem>
              <MenuItem value="cvssScore">CVSS 점수</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              label="순서"
            >
              <MenuItem value="DESC">최신순</MenuItem>
              <MenuItem value="ASC">오래된순</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value);
                setPage(1);
              }}
              label="표시 개수"
            >
              <MenuItem value={10}>10개</MenuItem>
              <MenuItem value={20}>20개</MenuItem>
              <MenuItem value={50}>50개</MenuItem>
              <MenuItem value={100}>100개</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleClearFilters}
              startIcon={<Clear />}
              size="medium"
            >
              필터 초기화
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 결과 개수 및 활성 필터 */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          {loading ? (
            <>조회 중...</>
          ) : (
            <>총 <strong>{total.toLocaleString()}</strong>개의 CVE 발견</>
          )}
        </Typography>
        {hasPocFilter && (
          <Chip 
            label={hasPocFilter === 'Y' ? '✅ POC 있음' : '❌ POC 없음'} 
            size="small" 
            color={hasPocFilter === 'Y' ? 'success' : 'default'}
            onDelete={() => {
              setHasPocFilter('');
              setPage(1);
              // 필터 제거 후 검색 실행
              setTimeout(() => handleSearch(), 0);
            }}
          />
        )}
        {hasAiFilter && (
          <Chip 
            label={hasAiFilter === 'Y' ? '🤖 AI 분석 완료' : '⏳ AI 분석 미완료'} 
            size="small" 
            color={hasAiFilter === 'Y' ? 'primary' : 'default'}
            onDelete={() => {
              setHasAiFilter('');
              setPage(1);
              // 필터 제거 후 검색 실행
              setTimeout(() => handleSearch(), 0);
            }}
          />
        )}
        {attackTypeFilter.length > 0 && (
          <Chip 
            label={`🎯 공격유형: ${attackTypeFilter.length}개`}
            size="small" 
            color="secondary"
            onDelete={() => setAttackTypeFilter([])}
          />
        )}
        {sortBy === 'latest' && (
          <Chip label="⭐ 최신 등록순" size="small" color="info" variant="outlined" />
        )}
      </Box>

      {/* CVE 목록 - 좌우 균일하게 정렬 */}
      <Grid container spacing={2}>
        {cves.length > 0 ? (
          cves.map((cve) => {
            const handleCveClick = (e) => {
              if (e.ctrlKey || e.metaKey) {
                // 컨트롤+클릭 또는 Cmd+클릭: 새 창에서 열기
                window.open(`/cve/${cve.CVE_Code}`, '_blank');
              } else {
                // 일반 클릭: 같은 창에서 이동
                navigate(`/cve/${cve.CVE_Code}`, {
                  state: {
                    filters: {
                      search,
                      severityFilter,
                      stateFilter,
                      hasPocFilter,
                      hasAiFilter,
                      attackTypeFilter,
                      sortBy,
                      sortOrder,
                      page,
                      limit
                    }
                  }
                });
              }
            };

            return (
            <Grid item xs={12} md={6} key={cve.CVE_Code}>
              <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 } }}>
                <CardActionArea onClick={handleCveClick} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      {/* 상단: CVE 코드 및 아이콘 */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                        <BugReport sx={{ fontSize: 40, color: 'primary.main', flexShrink: 0 }} />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="h6" fontWeight={600} noWrap>
                            {cve.CVE_Code}
                          </Typography>
                          {cve.product && (
                            <Typography variant="body2" color="text.secondary" noWrap title={cve.product}>
                              제품: {cve.product}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            예약일: {cve.dateReserved ? formatDate(cve.dateReserved) : 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* 하단: 태그들 - 균일한 간격 */}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
                        <Chip
                          label={cve.CVSS_Serverity || 'N/A'}
                          color={getSeverityColor(cve.CVSS_Serverity)}
                          size="small"
                        />
                        <Chip
                          label={`CVSS ${cve.CVSS_Score || 'N/A'}`}
                          variant="outlined"
                          size="small"
                        />
                        {cve.poc_count > 0 && (
                          <Chip
                            icon={<Code />}
                            label={`POC ${cve.poc_count}개`}
                            color="success"
                            size="small"
                          />
                        )}
                        {cve.ai_count > 0 && (
                          <Chip
                            icon={<WorkspacePremium />}
                            label={`AI 분석 완료`}
                            color="primary"
                            size="small"
                          />
                        )}
                        {cve.state && (
                          <Chip
                            label={cve.state}
                            size="small"
                            variant="outlined"
                            color="default"
                          />
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {loading ? '조회 중...' : '검색 결과가 없습니다'}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* 페이지네이션 */}
      {total > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(total / limit)}
            page={page}
            onChange={(e, v) => setPage(v)}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
      </>
      )}

      {/* 최종 패턴 탭 */}
      {activeTab === 1 && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterList color="primary" />
              <Typography variant="h6" fontWeight={600}>검색 및 필터</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="CVE 코드, 제품명, Snort 룰, 공격 단계 검색..."
                  value={patternSearchInput}
                  onChange={(e) => setPatternSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePatternSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><Search /></InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" onClick={handlePatternSearch} startIcon={<Search />} size="medium" sx={{ height: '40px' }}>
                  검색
                </Button>
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField select fullWidth size="small" value={patternSeverity} onChange={(e) => { setPatternSeverity(e.target.value); setPatternPage(1); }} label="위험도">
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="CRITICAL">CRITICAL</MenuItem>
                  <MenuItem value="HIGH">HIGH</MenuItem>
                  <MenuItem value="MEDIUM">MEDIUM</MenuItem>
                  <MenuItem value="LOW">LOW</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="공격 단계 (예: RCE, Exploitation)"
                  value={patternVulnStage}
                  onChange={(e) => { setPatternVulnStage(e.target.value); setPatternPage(1); }}
                  label="공격 단계"
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField select fullWidth size="small" value={patternLimit} onChange={(e) => { setPatternLimit(Number(e.target.value)); setPatternPage(1); }} label="표시 개수">
                  <MenuItem value={10}>10개</MenuItem>
                  <MenuItem value={20}>20개</MenuItem>
                  <MenuItem value={50}>50개</MenuItem>
                  <MenuItem value={100}>100개</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} md={2}>
                <Button fullWidth variant="outlined" onClick={() => { setPatternSearch(''); setPatternSearchInput(''); setPatternSeverity(''); setPatternVulnStage(''); setPatternPage(1); }} startIcon={<Clear />}>
                  필터 초기화
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {patternLoading ? '조회 중...' : <>총 <strong>{patternTotal.toLocaleString()}</strong>개의 Snort 룰</>}
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>CVE</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>위험도</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 80 }}>Step</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>공격 단계</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Snort 룰</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 60 }}>복사</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patterns.length > 0 ? (
                  patterns.map((p, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate(`/cve/${p.cve_code}`)}>
                          {p.cve_code}
                        </Typography>
                        {p.product && <Typography variant="caption" color="text.secondary" display="block">{p.product}</Typography>}
                      </TableCell>
                      <TableCell><Chip label={p.severity || 'N/A'} color={getSeverityColor(p.severity)} size="small" /></TableCell>
                      <TableCell>{p.step}</TableCell>
                      <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 160 }} title={p.vuln_stage}>{p.vuln_stage || '-'}</Typography></TableCell>
                      <TableCell>
                        <Box component="pre" sx={{ m: 0, fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 80, overflow: 'auto' }}>
                          {p.snort_rule}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleCopySnortRule(p.snort_rule)} startIcon={<ContentCopy />}>복사</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">{patternLoading ? '조회 중...' : '검색 결과가 없습니다'}</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {patternTotal > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(patternTotal / patternLimit)}
                page={patternPage}
                onChange={(e, v) => setPatternPage(v)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
