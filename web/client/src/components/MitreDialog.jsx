import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Box, Chip, Divider, CircularProgress, Alert, IconButton, Link, Paper
} from '@mui/material';
import { Close, OpenInNew, Security, Label, Description } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';

export default function MitreDialog({ open, onClose, techniqueId, stageName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && (techniqueId || stageName)) {
      loadMitreData();
    }
  }, [open, techniqueId, stageName]);

  const loadMitreData = async () => {
    setLoading(true);
    setError('');
    try {
      let response;
      if (stageName) {
        // 공격 단계 이름으로 검색
        console.log('[MITRE 검색] 공격 단계:', stageName);
        response = await axios.get(`${API_URL}/mitre/search/stage/${encodeURIComponent(stageName)}`);
        console.log('[MITRE 응답]', response.data);
        setData(response.data.matched);
      } else if (techniqueId) {
        // Technique ID로 검색
        console.log('[MITRE 검색] Technique ID:', techniqueId);
        response = await axios.get(`${API_URL}/mitre/${techniqueId}`);
        console.log('[MITRE 응답]', response.data);
        setData(response.data);
      }
    } catch (err) {
      console.error('MITRE 정보 로드 실패:', err);
      let errorMsg = err.response?.data?.error || 'MITRE ATT&CK 정보를 불러오는데 실패했습니다';
      
      // 추가 정보가 있으면 표시
      if (err.response?.data?.availableStages) {
        const stages = err.response.data.availableStages.slice(0, 5).join(', ');
        errorMsg += `\n\n사용 가능한 공격 단계 (일부):\n${stages}`;
      }
      
      if (err.response?.data?.suggestion) {
        errorMsg += `\n\n💡 ${err.response.data.suggestion}`;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setData(null);
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security />
          <Typography variant="h6" fontWeight={700}>
            MITRE ATT&CK 정보
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ whiteSpace: 'pre-wrap' }}>
            {error}
          </Alert>
        )}

        {data && !loading && !error && (
          <Box>
            {/* 기법 ID 및 링크 */}
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                mb: 3, 
                background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
                color: 'white'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>MITRE ATT&CK Technique</Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: 1 }}>
                    {data.techniqueId}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1, opacity: 0.95 }}>
                    {data.techniqueName}
                  </Typography>
                </Box>
                {data.mitreUrl && (
                  <Button 
                    variant="contained" 
                    href={data.mitreUrl} 
                    target="_blank" 
                    rel="noopener"
                    startIcon={<OpenInNew />}
                    sx={{ 
                      bgcolor: 'white', 
                      color: 'error.main',
                      '&:hover': { bgcolor: '#f5f5f5' }
                    }}
                  >
                    공식 문서
                  </Button>
                )}
              </Box>
            </Paper>

            {/* 전술 (Tactic) 상세 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#e3f2fd' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Label sx={{ fontSize: 28, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700} color="primary.main">
                  전술 (Tactic)
                </Typography>
                {data.tacticId && (
                  <Chip 
                    label={data.tacticId} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 1, fontWeight: 600 }}
                  />
                )}
              </Box>
              
              <Typography variant="h5" fontWeight={600} color="primary.dark" mb={2}>
                {data.tacticName}
              </Typography>
              
              <Typography variant="body1" color="text.primary" sx={{ lineHeight: 1.8 }}>
                {data.tacticDesc}
              </Typography>
            </Paper>

            <Divider sx={{ my: 3 }} />

            {/* 기법 (Technique) 상세 설명 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#fff3e0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Description sx={{ fontSize: 28, color: 'warning.main' }} />
                <Typography variant="h6" fontWeight={700} color="warning.main">
                  기법 (Technique) 상세 설명
                </Typography>
              </Box>
              
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: 'white', 
                  borderRadius: 1,
                  borderLeft: '4px solid',
                  borderColor: 'warning.main'
                }}
              >
                <Typography 
                  variant="body1" 
                  color="text.primary" 
                  sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
                >
                  {data.techniqueDesc}
                </Typography>
              </Box>
            </Paper>

            <Divider sx={{ my: 3 }} />

            {/* 주요 활용 예시 */}
            {data.examples && (
              <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#e8f5e9' }}>
                <Typography variant="h6" fontWeight={700} color="success.dark" mb={2}>
                  💡 실제 공격 활용 예시
                </Typography>
                <Box 
                  sx={{ 
                    p: 2.5, 
                    bgcolor: 'white', 
                    borderRadius: 1,
                    borderLeft: '4px solid',
                    borderColor: 'success.main'
                  }}
                >
                  <Typography 
                    variant="body1" 
                    color="text.primary"
                    sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
                  >
                    {data.examples}
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* 보안 전문가를 위한 정보 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: '#f3e5f5' }}>
              <Typography variant="h6" fontWeight={700} color="secondary.dark" mb={2}>
                🛡️ 보안 분석가를 위한 정보
              </Typography>
              
              <Box sx={{ pl: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} color="text.primary" mb={1}>
                  📍 공격 분류
                </Typography>
                <Box sx={{ pl: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    • 전술 단계: <strong>{data.tacticName}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • 기법 코드: <strong>{data.techniqueId}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • 기법 명칭: <strong>{data.techniqueName}</strong>
                  </Typography>
                </Box>

                <Typography variant="subtitle2" fontWeight={600} color="text.primary" mb={1}>
                  🔍 탐지 및 대응
                </Typography>
                <Box sx={{ pl: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    • 이 기법을 사용하는 공격을 탐지하려면 네트워크 트래픽 모니터링이 필요합니다
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • IDS/IPS 시그니처를 업데이트하여 실시간 탐지를 강화하세요
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • 로그 분석을 통해 의심스러운 패턴을 식별하세요
                  </Typography>
                </Box>

                <Typography variant="subtitle2" fontWeight={600} color="text.primary" mb={1}>
                  📚 추가 학습 자료
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    • MITRE ATT&CK 공식 문서에서 더 많은 정보를 확인하세요
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • 관련된 다른 기법들도 함께 학습하면 효과적입니다
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • 실제 사례 연구를 통해 이해도를 높이세요
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* 경고 메시지 */}
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                ⚠️ 보안 및 법적 고지사항
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                • 이 정보는 <strong>보안 연구, 분석, 방어 목적</strong>으로만 사용해야 합니다
              </Typography>
              <Typography variant="body2">
                • 무단 침입이나 공격에 사용하는 것은 <strong>형법상 범죄</strong>이며 엄격히 처벌됩니다
              </Typography>
              <Typography variant="body2">
                • 조직의 보안 정책과 관련 법규를 반드시 준수하세요
              </Typography>
            </Alert>

            <Alert severity="info">
              <Typography variant="caption">
                <strong>💡 TIP:</strong> POC 페이지에서 실제 공격 패킷과 Snort 탐지 룰을 함께 확인하면 
                더욱 효과적인 보안 분석이 가능합니다.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="contained">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
}

