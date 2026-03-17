import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, TextField, Button
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import axios from 'axios';
import logger from '../utils/logger';
import { API_URL } from '../config';

export default function BoardWrite() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = async () => {
    logger.info('========== 게시글 작성 시작 ==========');
    
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
    logger.debug('[3] 파일:', file ? file.name : '없음');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (file) formData.append('file', file);

    try {
      logger.debug('[4] API 요청 시작...');
      const response = await axios.post(`${API_URL}/board/posts`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'multipart/form-data' 
        }
      });
      logger.info('[5] 게시글 작성 성공 - ID:', response.data.id);
      alert('게시글이 작성되었습니다');
      navigate('/board');
    } catch (err) {
      logger.error('[게시글 작성 실패]', err.response?.data?.error || err.message);
      alert(err.response?.data?.error || '작성 실패');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3} color="primary.main">
        글쓰기
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
            <Button
              variant="outlined"
              component="label"
            >
              파일 첨부
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
                <Typography variant="body2" color="text.secondary">
                  첨부 파일: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
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
              • 보안을 위해 실행 파일 (.exe, .sh, .bat 등)은 업로드할 수 없습니다
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button variant="contained" startIcon={<Save />} onClick={handleSubmit} fullWidth>
              저장
            </Button>
            <Button variant="outlined" startIcon={<Cancel />} onClick={() => navigate('/board')} fullWidth>
              취소
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

