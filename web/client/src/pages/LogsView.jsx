import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, MenuItem, TextField, Paper
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';

export default function LogsView() {
  const [logType, setLogType] = useState('cve_bot');
  // null: 아직 불러오기 전 / string: 로드된 로그(빈 문자열 포함)
  const [logs, setLogs] = useState(null);

  const handleLoad = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_URL}/admin/logs?type=${logType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(typeof res.data?.logs === 'string' ? res.data.logs : '');
    } catch (err) {
      alert(err.response?.data?.error || '로그 로드 실패');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3} color="primary.main">
        프로그램 로그 확인
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="로그 타입"
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="cve_bot">CVE 수집 로그</MenuItem>
              <MenuItem value="ai_analysis">AI 분석 로그</MenuItem>
            </TextField>
            <Button variant="contained" startIcon={<Refresh />} onClick={handleLoad}>
              로그 불러오기
            </Button>
          </Box>
        </CardContent>
      </Card>

      {logs !== null && (
        <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', maxHeight: 600, overflow: 'auto' }}>
          <pre style={{ margin: 0, fontFamily: 'Consolas, monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
            {logs.trim()
              ? logs
              : '📝 로그가 비어있습니다. (프로그램이 아직 로그를 기록하지 않았거나, 로그 경로/파일명이 다를 수 있습니다.)'}
          </pre>
        </Paper>
      )}
    </Box>
  );
}

