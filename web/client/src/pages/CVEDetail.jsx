import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Divider,
  List, ListItem, ListItemButton, ListItemText, Paper, CardActionArea, Button
} from '@mui/material';
import { Security, Code, Person, CalendarToday, ArrowBack } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import { formatDate } from '../utils/dateFormat';

export default function CVEDetail() {
  const { cveCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(null);

  useEffect(() => {
    // location.state에서 필터 상태 가져오기
    if (location.state?.filters) {
      setFilters(location.state.filters);
    }
  }, [location.state]);

  useEffect(() => {
    axios.get(`${API_URL}/cve/${cveCode}`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [cveCode]);

  if (!data) return <Typography>로딩 중...</Typography>;

  const { cve, pocs } = data;

  const handleBackToList = () => {
    if (filters) {
      // 필터 상태를 유지하면서 목록으로 이동
      const params = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 20,
        sortBy: filters.sortBy || 'datePublished',
        sortOrder: filters.sortOrder || 'DESC',
        ...(filters.search && { search: filters.search }),
        ...(filters.severityFilter && { severity: filters.severityFilter }),
        ...(filters.stateFilter && { state: filters.stateFilter }),
        ...(filters.hasPocFilter && { hasPoc: filters.hasPocFilter }),
        ...(filters.hasAiFilter && { hasAi: filters.hasAiFilter }),
        ...(filters.attackTypeFilter?.length > 0 && { attackTypes: filters.attackTypeFilter.join(',') })
      });
      navigate(`/cve?${params.toString()}`);
    } else {
      // 필터 상태가 없으면 기본 목록으로 이동
      navigate('/cve');
    }
  };

  return (
    <Box>
      {/* CVE 목록으로 돌아가기 버튼 */}
      <Button
        startIcon={<ArrowBack />}
        onClick={handleBackToList}
        variant="outlined"
        sx={{ mb: 2 }}
      >
        CVE 목록으로 돌아가기
      </Button>

      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', color: 'white' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            {cve.CVE_Code}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            {cve.state} • CVSS {cve.CVSS_Score} ({cve.CVSS_Serverity})
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2} color="primary">
                설명
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {cve.descriptions}
              </Typography>
            </CardContent>
          </Card>

          {cve.solutions && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2} color="primary">
                  해결 방법
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {cve.solutions}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2} color="primary">
                정보
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">제품</Typography>
                  <Typography variant="body2">{cve.product || 'N/A'}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">영향 버전</Typography>
                  <Typography variant="body2">{cve.effect_version || 'N/A'}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">CWE ID</Typography>
                  <Typography variant="body2">{cve.cweId || 'N/A'}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">공격 유형</Typography>
                  <Typography variant="body2">{cve.Attak_Type || 'N/A'}</Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">CVSS Vector</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {cve.CVSS_vertorString || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2} color="primary">
                날짜 정보
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption">등록: {cve.dateReserved ? formatDate(cve.dateReserved) : 'N/A'}</Typography>
                <Typography variant="caption">공개: {cve.datePublished ? formatDate(cve.datePublished) : 'N/A'}</Typography>
                <Typography variant="caption">업데이트: {cve.dateUpdated ? formatDate(cve.dateUpdated) : 'N/A'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" fontWeight={600} mt={4} mb={2} color="primary">
        관련 POC ({pocs.length}개)
      </Typography>

      <Grid container spacing={2}>
        {pocs.map((poc) => {
          const handlePocClick = (e) => {
            if (e.ctrlKey || e.metaKey) {
              // 컨트롤+클릭 또는 Cmd+클릭: 새 창에서 열기
              window.open(`/poc/${poc.id}`, '_blank');
            } else {
              // 일반 클릭: 같은 창에서 이동
              navigate(`/poc/${poc.id}`);
            }
          };

          return (
          <Grid item xs={12} md={6} key={poc.id}>
            <Card>
              <CardActionArea onClick={handlePocClick}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Code sx={{ color: 'primary.main', mt: 0.5 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {poc.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <Person sx={{ fontSize: 14, verticalAlign: 'middle' }} /> {poc.writer}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={1} sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {poc.trans_msg}
                      </Typography>
                      {poc.AI_chk === 'Y' && (
                        <Chip label="AI 분석 완료" color="success" size="small" sx={{ mt: 1 }} />
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

