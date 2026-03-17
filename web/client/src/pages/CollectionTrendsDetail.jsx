/**
 * 수집 현황 날짜별 상세 - CVE, POC, AI 목록
 * 대시보드 그래프 클릭 시 같은 창에서 페이지로 이동
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Skeleton, Alert, Button, Chip
} from '@mui/material';
import { ArrowBack, ShowChart } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';

const getCVSSColor = (severity) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return '#d32f2f';
    case 'HIGH': return '#f57c00';
    case 'MEDIUM': return '#fbc02d';
    case 'LOW': return '#388e3c';
    default: return '#757575';
  }
};

export default function CollectionTrendsDetail() {
  const { date } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!date) return;
    loadData();
  }, [date]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/dashboard/collection-trends/${date}`, { timeout: 15000 });
      setData(res.data);
    } catch (err) {
      console.error('수집 현황 세부 로드 실패:', err);
      setError(err.response?.data?.error || err.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateLabel = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-').map(Number);
    const dateObj = new Date(y, m - 1, day);
    const w = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
    return `${y}년 ${m}월 ${day}일 (${w})`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ mt: 2 }}>
          대시보드로
        </Button>
      </Box>
    );
  }

  const { cves = [], pocs = [], ai = [] } = data || {};

  return (
    <Box sx={{ p: 3 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
        대시보드로
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <ShowChart sx={{ fontSize: 36, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            📊 수집 현황 상세
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {formatDateLabel(date)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, minWidth: 140, bgcolor: 'rgba(25, 118, 210, 0.08)', border: '1px solid rgba(25, 118, 210, 0.3)' }}>
          <Typography variant="caption" color="text.secondary">CVE 수집</Typography>
          <Typography variant="h5" fontWeight={700} color="#1976d2">{cves.length.toLocaleString()}건</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 140, bgcolor: 'rgba(46, 125, 50, 0.08)', border: '1px solid rgba(46, 125, 50, 0.3)' }}>
          <Typography variant="caption" color="text.secondary">POC 수집</Typography>
          <Typography variant="h5" fontWeight={700} color="#2e7d32">{pocs.length.toLocaleString()}건</Typography>
        </Paper>
        <Paper sx={{ p: 2, minWidth: 140, bgcolor: 'rgba(156, 39, 176, 0.08)', border: '1px solid rgba(156, 39, 176, 0.3)' }}>
          <Typography variant="caption" color="text.secondary">AI 분석</Typography>
          <Typography variant="h5" fontWeight={700} color="#9c27b0">{ai.length.toLocaleString()}건</Typography>
        </Paper>
      </Box>

      {cves.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1976d2' }}>CVE 수집</Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>CVE 코드</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>제품</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>CVSS</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>위험도</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cves.map((c, i) => (
                  <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cve/${c.CVE_Code}`)}>
                    <TableCell>{c.CVE_Code}</TableCell>
                    <TableCell>{c.product || '-'}</TableCell>
                    <TableCell>{c.CVSS_Score ?? '-'}</TableCell>
                    <TableCell>{c.CVSS_Serverity ? <Chip label={c.CVSS_Serverity} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: getCVSSColor(c.CVSS_Serverity), color: '#fff' }} /> : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {pocs.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#2e7d32' }}>POC 수집</Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>CVE</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>제목</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pocs.map((p, i) => (
                  <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/poc/${p.id}`)}>
                    <TableCell>#{p.id}</TableCell>
                    <TableCell>{p.cve}</TableCell>
                    <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title || p.link || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {ai.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#9c27b0' }}>AI 분석</Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>CVE</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>제목</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ai.map((a, i) => (
                  <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/poc/${a.id}`)}>
                    <TableCell>#{a.id}</TableCell>
                    <TableCell>{a.cve}</TableCell>
                    <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title || a.link || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {cves.length === 0 && pocs.length === 0 && ai.length === 0 && (
        <Typography variant="body2" color="text.secondary">해당 날짜에 수집된 항목이 없습니다.</Typography>
      )}
    </Box>
  );
}
