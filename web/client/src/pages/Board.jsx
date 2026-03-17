import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, CardActionArea, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Pagination,
  TextField, InputAdornment, MenuItem, Grid
} from '@mui/material';
import { Add, Visibility, Search } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';
import { formatDate } from '../utils/dateFormat';

export default function Board() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchType, setSearchType] = useState('title');

  useEffect(() => {
    loadPosts();
  }, [page, limit, search, searchType]);

  const loadPosts = async () => {
    try {
      const params = new URLSearchParams({
        page,
        limit,
        ...(search && { search, searchType })
      });
      const res = await axios.get(`${API_URL}/board/posts?${params}`);
      setPosts(res.data.posts);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="primary.main">
          자유게시판
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/board/write')}>
          글쓰기
        </Button>
      </Box>

      {/* 검색 영역 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              label="검색 타입"
            >
              <MenuItem value="title">제목</MenuItem>
              <MenuItem value="content">내용</MenuItem>
              <MenuItem value="author">작성자</MenuItem>
              <MenuItem value="all">전체</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="검색어를 입력하세요..."
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
            >
              검색
            </Button>
          </Grid>
          <Grid item xs={12} md={1}>
            <TextField
              select
              fullWidth
              size="small"
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value);
                setPage(1);
              }}
              label="개수"
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </TextField>
          </Grid>
        </Grid>
        {search && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              '{search}' 검색 결과: {total}건
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 게시판 테이블 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 600, width: '10%' }}>번호</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, width: '50%' }}>제목</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, width: '15%' }}>작성자</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, width: '15%' }}>날짜</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 600, width: '10%' }}>조회</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {posts.length > 0 ? (
              posts.map((post) => (
                <TableRow
                  key={post.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/board/${post.id}`)}
                >
                  <TableCell>{post.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {post.title}
                    </Typography>
                  </TableCell>
                  <TableCell>{post.author_name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(post.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Visibility sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      {post.views}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    게시글이 없습니다
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 페이지네이션 */}
      {total > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={Math.ceil(total / limit)}
            page={page}
            onChange={(e, v) => setPage(v)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}
