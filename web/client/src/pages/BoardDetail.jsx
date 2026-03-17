import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Divider
} from '@mui/material';
import { Edit, Delete, ArrowBack, Download } from '@mui/icons-material';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { API_URL } from '../config';
import { formatDateTime } from '../utils/dateFormat';

export default function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    axios.get(`${API_URL}/board/posts/${id}`)
      .then(res => setPost(res.data))
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/board/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('삭제되었습니다');
      navigate('/board');
    } catch (err) {
      alert(err.response?.data?.error || '삭제 실패');
    }
  };

  const handleEdit = () => {
    navigate(`/board/edit/${id}`);
  };

  if (!post) return <Typography>로딩 중...</Typography>;

  const canModify = user.id === post.user_id || user.role === 'admin';

  // XSS 방어: DOMPurify로 HTML sanitize
  const sanitizedContent = DOMPurify.sanitize(post.content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'a', 'img'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id']
  });

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/board')} sx={{ mb: 2 }}>
        목록으로
      </Button>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={700} mb={2}>
            {post.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            작성자: {post.author_name} • {formatDateTime(post.created_at)} • 조회 {post.views}
          </Typography>
          
          <Divider sx={{ my: 3 }} />

          <Box 
            dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
            sx={{ minHeight: 200, whiteSpace: 'pre-wrap' }} 
          />

          {post.file_path && (
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Download color="primary" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">첨부파일</Typography>
                <Typography variant="body2">{post.file_path}</Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download />}
                href={`${API_URL.replace('/api', '')}/uploads/${post.file_path}`}
                target="_blank"
                download
              >
                다운로드
              </Button>
            </Box>
          )}

          {canModify && (
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button variant="outlined" startIcon={<Edit />} onClick={handleEdit}>
                수정
              </Button>
              <Button variant="outlined" color="error" startIcon={<Delete />} onClick={handleDelete}>
                삭제
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

