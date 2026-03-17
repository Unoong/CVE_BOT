import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, MenuItem, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Pagination,
  Grid, InputAdornment, Chip, CircularProgress, Alert, LinearProgress
} from '@mui/material';
import { Storage, Search, FilterList, Clear } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';

export default function DBQuery() {
  const [table, setTable] = useState('Github_CVE_Info');
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [searchField, setSearchField] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tables = ['Github_CVE_Info', 'CVE_Info', 'CVE_Packet_AI_Analysis'];

  // 테이블별 검색 가능한 필드
  const tableFields = {
    'Github_CVE_Info': ['cve', 'title', 'writer', 'link', 'status', 'AI_chk'],
    'CVE_Info': ['CVE_Code', 'state', 'product', 'CVSS_Serverity', 'cweId'],
    'CVE_Packet_AI_Analysis': ['link', 'vuln_stage', 'mitre_tactic', 'mitre_technique']
  };

  const handleQuery = async (customPage = page) => {
    // 이벤트 객체가 전달된 경우 page 사용
    const targetPage = typeof customPage === 'number' ? customPage : page;
    
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    
    console.log('[DB 조회] 요청:', {
      table,
      page: targetPage,
      limit,
      searchField: searchField || undefined,
      searchValue: searchValue || undefined
    });

    try {
      const res = await axios.post(`${API_URL}/db/query`, { 
        table, 
        page: targetPage, 
        limit,
        searchField: searchField || undefined,
        searchValue: searchValue || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[DB 조회] 응답:', res.data);
      setData(res.data.rows);
      setTotal(res.data.total);
      setPage(targetPage);
    } catch (err) {
      console.error('[DB 조회] 에러:', err);
      const errorMsg = err.response?.data?.error || '조회 중 오류가 발생했습니다';
      setError(errorMsg);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFilter = () => {
    if (searchField && searchValue) {
      setFilters([...filters, { field: searchField, value: searchValue }]);
      setSearchField('');
      setSearchValue('');
    }
  };

  const handleRemoveFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
  };

  const handleClearAll = () => {
    setSearchField('');
    setSearchValue('');
    setFilters([]);
    setData([]);
    setPage(1);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1} color="primary.main">
        데이터베이스 조회
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        읽기 전용 모드 - 데이터 조회만 가능합니다
      </Typography>

      {/* 검색 및 필터 영역 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterList color="primary" />
            <Typography variant="h6" fontWeight={600}>
              테이블 선택 및 검색
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {/* 테이블 선택 */}
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="테이블 선택"
                value={table}
                onChange={(e) => {
                  setTable(e.target.value);
                  setSearchField('');
                  setSearchValue('');
                  setFilters([]);
                  setData([]);
                  setTotal(0);
                  setPage(1);
                  setError('');
                }}
                size="small"
                disabled={loading}
              >
                {tables.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>

            {/* 검색 필드 선택 */}
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="검색 필드"
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                size="small"
                disabled={loading}
              >
                <MenuItem value="">선택 안함</MenuItem>
                {tableFields[table]?.map(field => (
                  <MenuItem key={field} value={field}>{field}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* 검색 값 입력 */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="검색 값"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    e.preventDefault();
                    handleQuery();
                  }
                }}
                size="small"
                disabled={!searchField || loading}
                placeholder={searchField ? `${searchField}로 검색...` : '검색 필드를 먼저 선택하세요'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* 표시 개수 */}
            <Grid item xs={6} md={1}>
              <TextField
                select
                fullWidth
                label="개수"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                size="small"
                disabled={loading}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </TextField>
            </Grid>

            {/* 버튼들 */}
            <Grid item xs={6} md={1}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  fullWidth
                  variant="contained" 
                  onClick={() => handleQuery()}
                  disabled={loading}
                  size="small"
                >
                  조회
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleClearAll}
                  sx={{ minWidth: 40, px: 1 }}
                  size="small"
                  disabled={loading}
                >
                  <Clear />
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* 적용된 필터 표시 */}
          {(searchField || searchValue) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                검색 조건:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {searchField && searchValue && (
                  <Chip 
                    label={`${searchField}: ${searchValue}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 로딩 상태 */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            데이터를 조회하는 중...
          </Typography>
        </Box>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 결과 표시 */}
      {!loading && data.length > 0 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              총 <strong>{total.toLocaleString()}</strong>개의 레코드 발견
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {Object.keys(data[0]).map(key => (
                    <TableCell 
                      key={key} 
                      sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white', 
                        fontWeight: 600,
                        minWidth: 120
                      }}
                    >
                      {key}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow key={idx} hover>
                    {Object.values(row).map((val, i) => (
                      <TableCell 
                        key={i} 
                        sx={{ 
                          maxWidth: 300, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={String(val)}
                      >
                        {val === null ? (
                          <Typography variant="caption" color="text.secondary">NULL</Typography>
                        ) : (
                          String(val).substring(0, 200)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              페이지 {page} / {Math.ceil(total / limit)}
            </Typography>
            <Pagination
              count={Math.ceil(total / limit)}
              page={page}
              onChange={(e, v) => {
                setPage(v);
                handleQuery(v);
              }}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        </>
      )}

      {!loading && !error && data.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Storage sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            조회 버튼을 눌러 데이터를 확인하세요
          </Typography>
          <Typography variant="body2" color="text.secondary">
            테이블을 선택하고 조회 버튼을 클릭하세요
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            💡 검색 필드를 선택하지 않으면 전체 데이터를 조회합니다
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
