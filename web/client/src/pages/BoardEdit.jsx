import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, Button
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../config';

export default function BoardEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      const response = await axios.get(`${API_URL}/board/posts/${id}`);
      setTitle(response.data.title);
      setContent(response.data.content);
      setCurrentFile(response.data.file_path);
    } catch (err) {
      console.error('게시글 로드 실패:', err);
      alert('게시글을 불러오는데 실패했습니다');
      navigate('/board');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    logger.info('========== 게시글 수정 시작 ==========');
    
    if (!title.trim()) {
      logger.error('[게시글] 제목 없음');
      alert('제목을 입력해주세요');
      return;
    }
    
    if (!content.trim()) {
      logger.error('[게시글] 내용 없음');
      alert('내용을 입력해주세요');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      logger.error('[게시글] 토큰 없음');
      alert('로그인이 필요합니다');
      navigate('/login');
      return;
    }

    logger.debug('[1] 제목:', title);
    logger.debug('[2] 내용 길이:', content.length);
    logger.debug('[3] 새 파일:', file ? file.name : '없음');
    logger.debug('[4] 기존 파일:', currentFile || '없음');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (file) formData.append('file', file);

    try {
      logger.debug('[5] API 요청 시작...');
      await axios.put(`${API_URL}/board/posts/${id}`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'multipart/form-data' 
        }
      });
      logger.info('[6] 게시글 수정 성공');
      alert('게시글이 수정되었습니다');
      navigate(`/board/${id}`);
    } catch (err) {
      logger.error('[게시글 수정 실패]', err.response?.data?.error || err.message);
      alert(err.response?.data?.error || '수정 실패');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3} color="primary.main">
        글 수정
      </Typography>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <TextField
            fullWidth
            label="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            multiline
            rows={15}
            sx={{ mb: 3 }}
            placeholder="게시글 내용을 입력하세요..."
          />

          <Box sx={{ mb: 3 }}>
            {currentFile && !file && (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">현재 첨부 파일</Typography>
                <Typography variant="body2">{currentFile}</Typography>
              </Box>
            )}
            
            <Button
              variant="outlined"
              component="label"
            >
              {file || currentFile ? '파일 변경' : '파일 첨부'}
              <input
                type="file"
                hidden
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.zip,.rar,.txt,.doc,.docx,.xls,.xlsx"
                onChange={(e) => {
                  const selectedFile = e.target.files[0];
                  if (selectedFile) {
                    // 파일 크기 검증 (10MB)
                    if (selectedFile.size > 10 * 1024 * 1024) {
                      alert('파일 크기는 10MB를 초과할 수 없습니다');
                      e.target.value = '';
                      return;
                    }
                    setFile(selectedFile);
                  }
                }}
              />
            </Button>
            {file && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="primary.main" fontWeight={600}>
                  새 파일: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                </Typography>
                <Button
                  size="small"
                  color="error"
                  onClick={() => setFile(null)}
                >
                  삭제
                </Button>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              📌 파일 업로드 조건:<br />
              • 허용 형식: 이미지 (jpg, png, gif, webp), 문서 (pdf, doc, docx, xls, xlsx, txt), 압축 (zip, rar)<br />
              • 최대 크기: 10MB<br />
              • 새 파일을 선택하면 기존 파일이 교체됩니다
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button variant="contained" startIcon={<Save />} onClick={handleSubmit} fullWidth>
              수정
            </Button>
            <Button variant="outlined" startIcon={<Cancel />} onClick={() => navigate(`/board/${id}`)} fullWidth>
              취소
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

