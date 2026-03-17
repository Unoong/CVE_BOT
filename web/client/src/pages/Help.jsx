import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Accordion, AccordionSummary, AccordionDetails,
  Chip, Divider, Alert, List, ListItem, ListItemIcon, ListItemText, Paper
} from '@mui/material';
import {
  ExpandMore, Dashboard, BugReport, Forum, Person, Lock, Search,
  CloudUpload, AdminPanelSettings, CheckCircle, Warning, VpnKey, CloudDownload,
  Api, Code, Message, Security, Settings
} from '@mui/icons-material';
import { SITE_NAME } from '../config';

export default function Help() {
  const [expanded, setExpanded] = useState('panel1');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" fontWeight={700} color="primary.main" mb={2}>
          📚 {SITE_NAME} 사용 가이드
        </Typography>
        <Typography variant="h6" color="text.secondary">
          모든 기능을 쉽고 빠르게 이해하세요!
        </Typography>
      </Box>

      {/* 오픈톡방 링크 */}
      <Paper 
        elevation={4} 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif' }}>
            💬 CVE 취약점 알림방
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: 'white', mt: 1.5, mb: 2, fontFamily: '"Noto Sans KR", sans-serif' }}>
          LLM 취약점 분석 내용을 실시간으로 알림받을 수 있는 오픈톡방입니다:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography 
            component="a" 
            href="https://open.kakao.com/o/gro0PATf" 
            target="_blank" 
            rel="noopener noreferrer"
            sx={{ 
              color: 'white', 
              fontSize: '1.2rem',
              fontWeight: 600,
              textDecoration: 'underline',
              fontFamily: '"Noto Sans KR", sans-serif',
              '&:hover': {
                color: '#e0e0e0',
                textDecoration: 'underline'
              }
            }}
          >
            🔗 오픈톡방 참여하기 (클릭)
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1, fontFamily: '"Noto Sans KR", sans-serif' }}>
          https://open.kakao.com/o/gro0PATf
        </Typography>
      </Paper>

      {/* 상세 메뉴얼 링크 */}
      <Paper 
        elevation={4} 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, fontFamily: '"Noto Sans KR", sans-serif' }}>
            📖 상세 메뉴얼
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: 'white', mt: 1.5, mb: 2, fontFamily: '"Noto Sans KR", sans-serif' }}>
          더 자세한 사용 가이드와 스크린샷은 다음 링크에서 확인하실 수 있습니다:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography 
            component="a" 
            href="https://totoro8354.notion.site/29462ae3bb9780848fa4cbe4aceb4834?source=copy_link" 
            target="_blank" 
            rel="noopener noreferrer"
            sx={{ 
              color: 'white', 
              fontSize: '1.2rem',
              fontWeight: 600,
              textDecoration: 'underline',
              fontFamily: '"Noto Sans KR", sans-serif',
              '&:hover': {
                color: '#e0e0e0',
                textDecoration: 'underline'
              }
            }}
          >
            🔗 메뉴얼 보기 (클릭)
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1, fontFamily: '"Noto Sans KR", sans-serif' }}>
          https://totoro8354.notion.site/29462ae3bb9780848fa4cbe4aceb4834
        </Typography>
      </Paper>

      {/* 빠른 시작 가이드 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={1}>
          💡 처음 사용하시나요?
        </Typography>
        <Typography variant="body2">
          1. 회원가입 → 2. 로그인 → 3. 대시보드에서 CVE 통계 확인 → 4. CVE 정보에서 상세 조회!
        </Typography>
      </Alert>

      {/* 메인 기능 가이드 */}
      <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Dashboard sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>대시보드 (홈)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="primary.main" mb={2}>
              📊 대시보드 기능 설명
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f5f9ff' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  1️⃣ 전체 통계 카드
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="총 CVE 수" 
                      secondary="수집된 모든 CVE(취약점) 개수를 표시합니다" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="총 POC 수" 
                      secondary="GitHub에서 수집한 POC(Proof of Concept, 공격 코드) 개수입니다" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="AI 분석 완료/대기" 
                      secondary="보안전문가 AI가 분석한 POC와 아직 분석되지 않은 POC 개수입니다" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f5f9ff' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  2️⃣ CVSS 위험도 분포
                </Typography>
                <Typography variant="body2" mb={1}>
                  CVE의 위험도를 색상으로 구분하여 표시합니다:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Chip label="CRITICAL (치명적)" color="error" size="small" />
                  <Chip label="HIGH (높음)" color="warning" size="small" />
                  <Chip label="MEDIUM (보통)" color="info" size="small" />
                  <Chip label="LOW (낮음)" color="success" size="small" />
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#f5f9ff' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  3️⃣ 클릭 가능한 통계
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><Search color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="공격 단계별 분석, CWE 유형, 공격 유형" 
                      secondary="각 항목을 클릭하면 해당 CVE 목록을 볼 수 있습니다!" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Search color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="영향받는 제품" 
                      secondary="제품명을 클릭하면 해당 제품의 모든 취약점을 확인할 수 있습니다" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <BugReport sx={{ mr: 2, color: 'error.main' }} />
          <Typography variant="h6" fontWeight={600}>CVE 정보</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="error.main" mb={2}>
              🔍 CVE 조회 및 상세 정보
            </Typography>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fff5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📝 CVE란?
                </Typography>
                <Typography variant="body2" mb={1}>
                  CVE(Common Vulnerabilities and Exposures)는 공개적으로 알려진 보안 취약점을 식별하는 고유한 번호입니다.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  예: CVE-2025-12345
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fff5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  🔎 검색 및 필터링
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="CVE 코드 또는 제품 검색" 
                      secondary="검색창에 CVE-2025-... 또는 제품명 입력" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="위험도 필터" 
                      secondary="CRITICAL, HIGH, MEDIUM, LOW 중 선택" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="상태 필터" 
                      secondary="PUBLISHED(공개됨), REJECTED(거부됨) 중 선택" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#fff5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📄 CVE 상세 페이지
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="CVE 기본 정보" 
                      secondary="상태, 등록일, 공개일, 업데이트일, 영향받는 제품" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="취약점 설명" 
                      secondary="취약점의 상세 설명 (한국어 번역)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="CVSS 정보" 
                      secondary="위험도 점수, 공격 벡터, 복잡도 등" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="해결 방안" 
                      secondary="취약점 해결 방법 (한국어 번역)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="관련 POC 목록" 
                      secondary="GitHub에서 수집한 공격 코드 예제들" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'panel3'} onChange={handleChange('panel3')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <BugReport sx={{ mr: 2, color: 'warning.main' }} />
          <Typography variant="h6" fontWeight={600}>POC 상세 및 AI 분석</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="warning.main" mb={2}>
              🤖 AI 기반 보안 분석 (Gemini Pro)
            </Typography>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fffbf0' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📝 POC란?
                </Typography>
                <Typography variant="body2" mb={1}>
                  POC(Proof of Concept)는 취약점을 실제로 증명하는 코드입니다. 
                  해커가 어떻게 시스템을 공격할 수 있는지 보여주는 예제 코드로, GitHub에서 수집한 실제 공격 코드입니다.
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fffbf0' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📋 POC 상세 페이지에서 볼 수 있는 정보
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="GitHub 정보" 
                      secondary="저장소 제목, 작성자, README, 수집일" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="번역된 README" 
                      secondary="한국어로 자동 번역된 설명 (Google Translate)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="AI 분석 상태" 
                      secondary="보안전문가 AI가 분석했는지 여부 (AI_chk: Y/N)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="관련 POC 목록" 
                      secondary="동일한 CVE의 다른 POC 최대 10개" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="success.main">
                  🔄 POC 재분석 기능 (관리자 전용)
                </Typography>
                <Typography variant="body2" mb={1}>
                  AI 분석 결과가 잘못되었거나 개선이 필요한 경우, 관리자는 POC 상세 페이지에서 재분석을 요청할 수 있습니다.
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                    <ListItemText 
                      primary="재분석 버튼 위치" 
                      secondary="POC 상세 페이지 헤더 우측에 표시 (관리자 권한일 때만)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                    <ListItemText 
                      primary="재분석 동작 방식" 
                      secondary="1. 기존 AI 분석 결과 삭제 → 2. AI_chk를 'N'으로 변경 → 3. AI 분석기가 자동으로 재분석" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                    <ListItemText 
                      primary="재분석 완료 확인" 
                      secondary="AI 분석기가 실행되면 자동으로 분석되며, 완료 후 페이지를 새로고침하면 새로운 분석 결과가 표시됩니다" 
                    />
                  </ListItem>
                </List>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>참고:</strong> 재분석은 AI 분석기가 실행 중일 때만 자동으로 처리됩니다. 
                    재분석 요청 후 <code>run_ai_analysis.py</code>가 실행되면 해당 POC가 자동으로 재분석됩니다.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fff8e1' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="warning.main">
                  🤖 AI 분석 결과 (AI_chk = 'Y'인 경우만 표시)
                </Typography>
                <Typography variant="body2" mb={1}>
                  보안전문가 AI 모델(Gemini Pro)이 POC 코드를 심층 분석한 결과를 제공합니다:
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    ⚡ <strong>병렬 분석 시스템:</strong> 최대 5개 POC를 동시에 분석하여 3분당 5건 처리 (기존 대비 5배 빠름!)
                  </Typography>
                </Alert>

                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  1️⃣ 취약점 요약 (CVE Summary)
                </Typography>
                <Typography variant="body2" mb={2} color="text.secondary">
                  • 어떤 취약점인지 한눈에 이해할 수 있는 간단한 설명<br />
                  • 공격 대상, 취약점 유형, 위험도 요약
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  2️⃣ 공격 단계별 분석 (Attack Steps)
                </Typography>
                <Typography variant="body2" mb={1} color="text.secondary">
                  각 공격 단계마다 다음 정보를 제공합니다:
                </Typography>
                <Box sx={{ pl: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>• 단계 번호:</strong> Step 1, Step 2, Step 3...<br />
                    <strong>• 취약점 단계:</strong> 정찰(Reconnaissance), 무기화(Weaponization), 전달(Delivery), 
                    악용(Exploitation), 설치(Installation), C2(Command & Control), 목표달성(Actions on Objectives)<br />
                    <strong>• 단계 설명:</strong> 각 단계에서 무슨 일이 일어나는지 자세한 설명
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  3️⃣ 공격 패킷 샘플 (Packet Sample)
                </Typography>
                <Typography variant="body2" mb={1} color="text.secondary">
                  각 단계별로 실제 네트워크에서 전송되는 패킷 데이터를 보여줍니다:
                </Typography>
                <Box sx={{ pl: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    • HTTP 요청/응답 예시<br />
                    • SQL 쿼리 예시<br />
                    • 악성 페이로드 예시<br />
                    • 명령어 실행 예시
                  </Typography>
                </Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    💡 패킷 샘플은 분석 및 방어 목적으로만 사용하세요. 실제 공격에 사용하면 불법입니다!
                  </Typography>
                </Alert>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  4️⃣ MITRE ATT&CK 프레임워크 매핑
                </Typography>
                <Typography variant="body2" mb={1} color="text.secondary">
                  국제 표준 공격 프레임워크에 따른 분류:
                </Typography>
                <Box sx={{ pl: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>• Tactic (전술):</strong> Initial Access, Execution, Persistence, Privilege Escalation 등<br />
                    <strong>• Technique (기법):</strong> T1190 (Exploit Public-Facing Application), T1059 (Command Injection) 등<br />
                    <strong>• 활용:</strong> 조직의 보안 전략 수립, 탐지 규칙 작성에 사용
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  5️⃣ Snort 탐지 룰 (Detection Rule)
                </Typography>
                <Typography variant="body2" mb={1} color="text.secondary">
                  각 공격 단계별로 Snort IDS/IPS에서 사용할 수 있는 탐지 규칙을 제공합니다:
                </Typography>
                <Box sx={{ pl: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    • 공격 패킷을 탐지하는 규칙<br />
                    • 실시간 네트워크 모니터링에 활용<br />
                    • Snort, Suricata 등 IDS에 적용 가능
                  </Typography>
                </Box>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#263238', color: '#aed581', fontFamily: 'monospace', fontSize: '0.85rem', mb: 2 }}>
                  alert tcp any any -&gt; any 80 (msg:"SQL Injection Attempt"; 
                  content:"UNION SELECT"; nocase; sid:1000001;)
                </Paper>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  6️⃣ 대응 방안 (Remediation)
                </Typography>
                <Typography variant="body2" mb={1} color="text.secondary">
                  실무에서 바로 적용할 수 있는 구체적인 대응 방법:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>• 즉시 대응:</strong> 긴급하게 취해야 할 조치<br />
                    <strong>• 패치 정보:</strong> 업데이트 버전, 패치 다운로드 링크<br />
                    <strong>• 완화 방법:</strong> 패치가 불가능할 때의 임시 대응책<br />
                    <strong>• 장기 대책:</strong> 재발 방지를 위한 시스템 개선 방안<br />
                    <strong>• 모니터링:</strong> 공격 시도를 탐지하는 방법
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="primary.main">
                  💡 AI 분석을 활용하는 방법
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="1. 취약점 이해" 
                      secondary="CVE 요약과 공격 단계를 읽고 취약점의 본질을 파악하세요" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="2. 패킷 분석" 
                      secondary="공격 패킷 샘플을 보고 어떤 데이터가 오가는지 확인하세요" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="3. 탐지 규칙 적용" 
                      secondary="Snort 룰을 IDS에 추가하여 실시간 탐지를 시작하세요" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="4. 대응 방안 실행" 
                      secondary="제시된 대응 방안을 따라 시스템을 보호하세요" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="5. MITRE 매핑 활용" 
                      secondary="Tactic & Technique을 보안 전략 수립에 반영하세요" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'panel4'} onChange={handleChange('panel4')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Forum sx={{ mr: 2, color: 'success.main' }} />
          <Typography variant="h6" fontWeight={600}>자유게시판</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="success.main" mb={2}>
              💬 커뮤니티 소통
            </Typography>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f0fff4' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  ✍️ 글쓰기
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="제목과 내용 입력" 
                      secondary="최대 제목 200자, 내용 50,000자" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CloudUpload color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="파일 첨부 (선택사항)" 
                      secondary="허용 형식: 이미지(jpg, png, gif, webp), 문서(pdf, doc, docx, xls, xlsx, txt), 압축(zip, rar)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Warning color="warning" /></ListItemIcon>
                    <ListItemText 
                      primary="파일 제한사항" 
                      secondary="• 최대 크기: 10MB | • 차단: 실행 파일(.exe, .sh, .bat), 스크립트(.js, .php, .jsp), HTML 파일" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f0fff4' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📝 수정/삭제
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="본인 작성 글" 
                      secondary="수정 및 삭제 버튼이 표시됩니다" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="운영자(admin)" 
                      secondary="모든 게시글을 수정/삭제할 수 있습니다" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#f0fff4' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  🔎 검색 기능
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="제목으로 검색" 
                      secondary="게시글 제목에서 검색" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="내용으로 검색" 
                      secondary="게시글 본문에서 검색" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="작성자로 검색" 
                      secondary="작성자 이름으로 검색" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="전체 검색" 
                      secondary="제목, 내용, 작성자 모두에서 검색" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'panel5'} onChange={handleChange('panel5')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Person sx={{ mr: 2, color: 'info.main' }} />
          <Typography variant="h6" fontWeight={600}>내 프로필</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="info.main" mb={2}>
              👤 계정 관리
            </Typography>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f0f9ff' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📋 기본 정보
                </Typography>
                <Typography variant="body2" mb={1}>
                  아이디, 이름, 닉네임, 이메일, 전화번호, 권한, 가입일을 확인할 수 있습니다.
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f0f9ff' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  ✏️ 닉네임 변경
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="변경 방법" 
                      secondary="닉네임 옆 '변경' 버튼 클릭 → 새 닉네임 입력 (최소 2자)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="적용 범위" 
                      secondary="채팅, 게시판 등 모든 곳에서 새 닉네임으로 표시됩니다" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ bgcolor: '#f0f9ff' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  🔒 비밀번호 변경
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><Lock color="warning" /></ListItemIcon>
                    <ListItemText 
                      primary="보안 인증" 
                      secondary="현재 비밀번호를 먼저 입력해야 합니다 (본인 확인)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="새 비밀번호" 
                      secondary="최소 4자 이상 (8자 이상 권장)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="자동 로그아웃" 
                      secondary="변경 후 3초 뒤 자동으로 로그아웃됩니다. 새 비밀번호로 다시 로그인하세요!" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'panel6'} onChange={handleChange('panel6')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <AdminPanelSettings sx={{ mr: 2, color: 'secondary.main' }} />
          <Typography variant="h6" fontWeight={600}>관리자 기능 (admin 전용)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              이 기능은 <strong>admin</strong> 권한을 가진 사용자만 사용할 수 있습니다.
            </Alert>

            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  👥 사용자 관리
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="권한 변경" 
                      secondary="일반 사용자 / 분석가 / 운영자 권한 부여" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="닉네임 변경" 
                      secondary="다른 사용자의 닉네임을 변경할 수 있습니다" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="비밀번호 초기화" 
                      secondary="사용자가 비밀번호를 잊었을 때 새로운 비밀번호 설정" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="계정 삭제" 
                      secondary="사용자 계정을 삭제할 수 있습니다 (본인은 삭제 불가)" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📊 DB 조회 (analyst, admin)
                </Typography>
                <Typography variant="body2" mb={1}>
                  데이터베이스의 CVE 정보, GitHub POC, AI 분석 결과를 직접 조회할 수 있습니다.
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="검색 및 필터" 
                      secondary="테이블, 필드, 값으로 상세 검색 가능" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="읽기 전용" 
                      secondary="보안을 위해 조회만 가능하며 수정은 불가합니다" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📄 로그 확인 (admin)
                </Typography>
                <Typography variant="body2">
                  시스템 로그를 확인하여 오류나 비정상 접근을 모니터링할 수 있습니다.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'panel7'} onChange={handleChange('panel7')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <VpnKey sx={{ mr: 2, color: '#9c27b0' }} />
          <Typography variant="h6" fontWeight={600}>API 토큰 관리 (admin 전용)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              이 기능은 <strong>admin</strong> 권한을 가진 사용자만 사용할 수 있습니다.
            </Alert>

            <Typography variant="subtitle1" fontWeight={600} color="secondary.main" mb={2}>
              🔑 외부 시스템 연동을 위한 API 인증
            </Typography>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f3e5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📝 API 토큰이란?
                </Typography>
                <Typography variant="body2" mb={1}>
                  API 토큰은 외부 시스템이나 프로그램이 본 시스템의 CVE 데이터를 안전하게 수집할 수 있도록 
                  인증하는 보안 키입니다. 토큰을 사용하면 로그인 없이도 API 엔드포인트에 접근할 수 있습니다.
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f3e5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  ✨ 주요 기능
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><Api color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="토큰 생성" 
                      secondary="이름, 만료일, 권한을 설정하여 새로운 API 토큰 생성" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                    <ListItemText 
                      primary="토큰 목록 조회" 
                      secondary="생성된 모든 토큰의 상태, 권한, 마지막 사용 시간 확인" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lock color="warning" /></ListItemIcon>
                    <ListItemText 
                      primary="활성/비활성화" 
                      secondary="필요에 따라 토큰을 즉시 비활성화하거나 다시 활성화" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Warning color="error" /></ListItemIcon>
                    <ListItemText 
                      primary="토큰 삭제" 
                      secondary="더 이상 사용하지 않는 토큰 영구 삭제" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="warning.main">
                  🛠️ 토큰 생성 방법
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="1. 토큰 이름 입력" 
                      secondary="예: '회사 PC 수집 모듈', 'SOC 팀 연동'" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="2. 만료일 설정 (선택)" 
                      secondary="만료일을 설정하면 해당 날짜 이후 토큰이 자동으로 무효화됩니다" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="3. 권한 선택" 
                      secondary="• cve:read (CVE 데이터 조회) | • poc:read (POC 코드 조회) | • analysis:read (AI 분석 결과 조회)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="4. 토큰 복사" 
                      secondary="생성된 토큰은 한 번만 표시됩니다. 안전한 곳에 보관하세요!" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="success.main">
                  💡 활용 예시
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="사내 보안 시스템 연동" 
                      secondary="회사의 SIEM, SOAR 시스템에 CVE 데이터를 자동으로 전송" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="카카오톡 알림 봇" 
                      secondary="Python 수집 모듈로 새로운 CVE를 수집하고 카카오톡으로 실시간 알림" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="외부 분석 도구" 
                      secondary="다른 PC에서 CVE 데이터를 수집하여 추가 분석 수행" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="정기 리포트 자동화" 
                      secondary="주간/월간 보안 리포트 생성을 위한 데이터 수집" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                ⚠️ 보안 주의사항
              </Typography>
              <Typography variant="body2">
                • API 토큰은 비밀번호와 동일하게 취급해야 합니다<br />
                • 토큰을 절대 공개 저장소나 채팅에 공유하지 마세요<br />
                • 토큰이 유출되었다면 즉시 비활성화하거나 삭제하세요<br />
                • 정기적으로 사용하지 않는 토큰을 삭제하세요<br />
                • 필요한 최소한의 권한만 부여하세요
              </Typography>
            </Alert>

            <Card variant="outlined" sx={{ bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="primary.main">
                  📊 토큰 관리 팁
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="명확한 이름 사용" 
                      secondary="어디서 사용되는 토큰인지 쉽게 알 수 있도록 명명하세요" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="만료일 활용" 
                      secondary="임시 프로젝트는 만료일을 설정하여 자동으로 무효화되도록 하세요" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="마지막 사용 시간 확인" 
                      secondary="오랫동안 사용되지 않은 토큰은 삭제를 고려하세요" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="정기 점검" 
                      secondary="월 1회 토큰 목록을 점검하여 불필요한 토큰을 정리하세요" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'panel8'} onChange={handleChange('panel8')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <CloudDownload sx={{ mr: 2, color: '#00695c' }} />
          <Typography variant="h6" fontWeight={600}>외부 데이터 수집 시스템</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="success.main" mb={2}>
              🌐 원격 PC에서 CVE 데이터 자동 수집
            </Typography>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#e0f2f1' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📋 시스템 개요
                </Typography>
                <Typography variant="body2" mb={2}>
                  본 {SITE_NAME}은 웹 인터페이스뿐만 아니라, <strong>외부 PC에서도 Python 스크립트를 통해 
                  CVE 데이터를 자동으로 수집</strong>할 수 있습니다. 수집된 데이터는 회사 카카오톡으로 실시간 알림을 
                  보낼 수 있어, 보안팀이 신속하게 최신 취약점 정보를 받아볼 수 있습니다.
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" fontWeight={600} mb={1}>
                  🔄 동작 흐름
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    1️⃣ <strong>서버에서 데이터 생성:</strong> GitHub POC 수집 → CVE 정보 수집 → AI 분석 → 통합 테이블 생성<br />
                    2️⃣ <strong>외부 PC에서 수집:</strong> Python 스크립트가 API를 통해 최신 CVE 데이터 요청<br />
                    3️⃣ <strong>데이터 가공:</strong> 수집된 JSON 데이터를 읽기 쉬운 메시지 형태로 포맷팅<br />
                    4️⃣ <strong>카카오톡 전송:</strong> Intent 제어 방식으로 회사 카카오톡에 알림 전송<br />
                    5️⃣ <strong>주기적 반복:</strong> 5분마다 자동으로 새로운 CVE 확인 및 수집
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fff8e1' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="warning.main">
                  🔌 API 엔드포인트
                </Typography>
                <Typography variant="body2" mb={2}>
                  외부 수집 시스템은 다음 API를 사용합니다:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#263238', color: '#aed581', fontFamily: 'monospace', fontSize: '0.9rem', mb: 2 }}>
                  GET /api/cve/export
                </Paper>
                <Typography variant="body2" mb={1}>
                  <strong>제공 데이터:</strong>
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="POC 정보" 
                      secondary="GitHub 저장소 링크, 제목, 작성자, README, 수집일" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="CVE 상세 정보" 
                      secondary="CVE 코드, 상태, 설명, CVSS 점수, 영향받는 제품, 해결 방안" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="AI 분석 결과" 
                      secondary="공격 단계, 패킷 샘플, MITRE 매핑, Snort 룰, 대응 방안" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="모든 공격 단계" 
                      secondary="하나의 POC에 포함된 모든 공격 단계를 통합하여 제공" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f3e5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="secondary.main">
                  💻 Python 수집 모듈 (cve_api_collector.py)
                </Typography>
                <Typography variant="body2" mb={2}>
                  시스템과 함께 제공되는 Python 스크립트로, 외부 PC에서 쉽게 CVE 데이터를 수집할 수 있습니다.
                </Typography>
                
                <Typography variant="body2" fontWeight={600} mb={1}>
                  📦 주요 기능:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="자동 수집" 
                      secondary="5분 간격으로 최신 CVE 데이터를 자동 수집" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="메시지 포맷팅" 
                      secondary="수집된 JSON 데이터를 사람이 읽기 쉬운 텍스트로 자동 변환" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="필터링 지원" 
                      secondary="특정 CVE, 심각도(CRITICAL/HIGH), 날짜 범위로 필터링 가능" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="페이지네이션" 
                      secondary="대량의 CVE 데이터를 페이지 단위로 효율적으로 수집" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="에러 처리" 
                      secondary="네트워크 오류, API 토큰 만료 등 다양한 오류 상황 자동 처리" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="HTTPS 지원" 
                      secondary="자체 서명 인증서 환경에서도 안전하게 데이터 수집" 
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" fontWeight={600} mb={1}>
                  ⚙️ 설정 항목:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="API_BASE_URL" 
                      secondary={`${SITE_NAME}의 서버 주소 (HTTPS)`} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="API_TOKEN" 
                      secondary="API 토큰 관리 페이지에서 생성한 인증 토큰" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="PAGE_SIZE" 
                      secondary="한 번에 가져올 CVE 개수 (기본값: 50)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="REPEAT_INTERVAL" 
                      secondary="수집 반복 간격 (초 단위, 기본값: 300초=5분)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="VERIFY_SSL" 
                      secondary="SSL 인증서 검증 여부 (자체 서명 인증서는 False)" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="success.main">
                  💬 카카오톡 연동 (Intent 제어)
                </Typography>
                <Typography variant="body2" mb={2}>
                  Python 수집 모듈은 <strong>Intent 제어 방식</strong>으로 카카오톡 메시지를 자동으로 전송할 수 있습니다. 
                  이는 회사 PC에서 실행되어, 보안팀 카카오톡 채팅방에 새로운 CVE 정보를 실시간으로 알립니다.
                </Typography>
                
                <Typography variant="body2" fontWeight={600} mb={1}>
                  📤 메시지 전송 흐름:
                </Typography>
                <Box sx={{ pl: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    1. Python 스크립트가 CVE 데이터를 수집하여 메시지로 포맷팅<br />
                    2. Intent 제어 모듈이 카카오톡 앱을 자동으로 실행<br />
                    3. 지정된 채팅방 또는 연락처로 메시지 전송<br />
                    4. 전송 완료 후 카카오톡 앱 종료 또는 백그라운드 실행
                  </Typography>
                </Box>

                <Typography variant="body2" fontWeight={600} mb={1}>
                  📋 전송되는 메시지 내용:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><Message color="primary" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="CVE 코드 및 제목" 
                      secondary="CVE-2025-12345: Apache Struts RCE Vulnerability" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Warning color="error" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="위험도 및 CVSS 점수" 
                      secondary="CRITICAL (9.8점) - 즉시 대응 필요" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><BugReport color="warning" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="취약점 요약" 
                      secondary="AI가 분석한 취약점의 핵심 내용" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Code color="info" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="공격 단계 요약" 
                      secondary="주요 공격 단계와 MITRE ATT&CK 매핑" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Security color="success" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="대응 방안" 
                      secondary="즉시 적용 가능한 보안 조치" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Api color="primary" fontSize="small" /></ListItemIcon>
                    <ListItemText 
                      primary="상세 정보 링크" 
                      secondary="웹사이트의 CVE 상세 페이지 바로가기" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="warning.main">
                  🚀 구축 가이드
                </Typography>
                <Typography variant="body2" mb={2}>
                  외부 PC에서 CVE 수집 시스템을 구축하는 방법:
                </Typography>
                
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" mb={1} fontWeight={600}>
                    1️⃣ 준비 사항
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    • Python 3.8 이상 설치<br />
                    • requests, urllib3 라이브러리 설치<br />
                    • {SITE_NAME} 서버의 IP 주소 및 포트 확인<br />
                    • API 토큰 발급 (관리자가 발급)
                  </Typography>

                  <Typography variant="body2" mb={1} fontWeight={600}>
                    2️⃣ 스크립트 설정
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    • cve_api_collector.py 파일 다운로드<br />
                    • Config 클래스에 서버 주소와 API 토큰 입력<br />
                    • 수집 간격 및 페이지 크기 조정 (필요 시)<br />
                    • SSL 인증서 검증 설정 (자체 서명 인증서는 False)
                  </Typography>

                  <Typography variant="body2" mb={1} fontWeight={600}>
                    3️⃣ 카카오톡 연동 추가 (선택)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    • Intent 제어 모듈 추가 (회사 내부 솔루션)<br />
                    • 메시지 전송 대상 채팅방 설정<br />
                    • 메시지 포맷 커스터마이징 (필요 시)
                  </Typography>

                  <Typography variant="body2" mb={1} fontWeight={600}>
                    4️⃣ 실행 및 모니터링
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • 스크립트 실행: python cve_api_collector.py<br />
                    • 로그 확인: 수집 현황, 에러, 전송 결과 확인<br />
                    • 백그라운드 실행 설정 (Windows 작업 스케줄러, Linux cron)
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                ✅ 장점 및 활용 사례
              </Typography>
              <Typography variant="body2">
                <strong>• 실시간 알림:</strong> 새로운 취약점 발견 즉시 보안팀에 알림<br />
                <strong>• 자동화:</strong> 수동 확인 없이 24시간 자동 모니터링<br />
                <strong>• 중앙 집중화:</strong> 여러 PC에서 수집한 데이터를 한곳에 통합<br />
                <strong>• 신속한 대응:</strong> 카카오톡으로 즉시 확인하여 긴급 패치 적용<br />
                <strong>• 보고서 자동화:</strong> 수집된 데이터로 주간/월간 보안 리포트 생성
              </Typography>
            </Alert>

            <Card variant="outlined" sx={{ bgcolor: '#e1f5fe' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="primary.main">
                  📊 데이터 활용 예시
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="보안 대시보드 구축" 
                      secondary="수집된 CVE 데이터로 조직 맞춤형 보안 현황판 제작" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="자산 관리 시스템 연동" 
                      secondary="조직의 IT 자산과 매칭하여 영향 받는 시스템 자동 파악" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="패치 우선순위 결정" 
                      secondary="CVSS 점수와 공격 단계 분석으로 패치 순서 자동 산정" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="위협 인텔리전스 생성" 
                      secondary="MITRE ATT&CK 매핑으로 조직 맞춤형 위협 모델 구축" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="탐지 룰 자동 배포" 
                      secondary="Snort 룰을 IDS/IPS에 자동으로 추가하여 실시간 보호" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'panel9'} onChange={handleChange('panel9')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Settings sx={{ mr: 2, color: '#607d8b' }} />
          <Typography variant="h6" fontWeight={600}>시스템 설정 관리</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>

            <Typography variant="subtitle1" fontWeight={600} color="primary.main" mb={2}>
              ⚙️ 시스템 설정 관리 기능
            </Typography>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📋 설정 관리 개요
                </Typography>
                <Typography variant="body2" mb={1}>
                  시스템 설정 관리 페이지에서는 <strong>CVE 수집 설정</strong>과 <strong>AI 분석 설정</strong>을 웹 인터페이스에서 직접 관리할 수 있습니다.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 웹에서 변경하면 설정 파일(config.json, ai_analysis_config.json)도 자동으로 업데이트됩니다<br />
                  • 설정 파일을 직접 수정해도 웹에서 "새로고침" 버튼을 클릭하면 최신 설정이 반영됩니다<br />
                  • 관리자만 수정 가능하며, 일반 사용자는 조회만 가능합니다
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="primary.main">
                  1️⃣ CVE 수집 설정 탭
                </Typography>
                
                <Typography variant="body2" fontWeight={600} mb={1}>
                  GitHub API 설정:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="최대 페이지 수" 
                      secondary="수집할 최대 페이지 수 (1페이지 = 30개 저장소)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="검색 쿼리" 
                      secondary="GitHub 검색 쿼리 템플릿 ({year}는 자동 치환)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="정렬 기준" 
                      secondary="updated(최신 업데이트순), created(생성일순), stars(인기순), best-match(관련도순)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="정렬 순서" 
                      secondary="desc(내림차순), asc(오름차순)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="대상 년도" 
                      secondary="예: 2025 또는 2025, 2024, 2023 또는 current" 
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" fontWeight={600} mb={1}>
                  수집 동작 설정:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="CVE당 최대 POC 개수" 
                      secondary="동일 CVE당 수집할 최대 GitHub POC 개수 (기본: 5개)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Rate Limit 대기 시간" 
                      secondary="GitHub API Rate Limit 도달 시 대기 시간 (분 단위)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="CVE Info 자동 수집" 
                      secondary="cve_info_status='N'인 CVE를 자동으로 CVE API에서 수집" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="통합 테이블 자동 생성" 
                      secondary="3개 테이블을 자동 조인하여 통합 테이블 생성" 
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" fontWeight={600} mb={1}>
                  파일 경로 설정:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="CVE 폴더" 
                      secondary="다운로드한 CVE POC ZIP 파일을 저장할 폴더명" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="로그 폴더" 
                      secondary="로그 파일을 저장할 폴더명" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="warning.main">
                  2️⃣ AI 분석 설정 탭
                </Typography>
                
                <Typography variant="body2" fontWeight={600} mb={1}>
                  병렬 처리 설정:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="병렬 처리 활성화" 
                      secondary="여러 POC를 동시에 분석하여 처리 속도 향상" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="최대 동시 작업 수" 
                      secondary="병렬 처리 시 동시에 실행할 최대 작업 수" 
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" fontWeight={600} mb={1}>
                  API 제한 설정:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="분당 요청 수" 
                      secondary="LLM API 분당 최대 요청 수 (기본: 60)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="최소 요청 간격" 
                      secondary="요청 간 최소 대기 시간 (초 단위)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="타임아웃" 
                      secondary="API 요청 타임아웃 시간 (초 단위)" 
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" fontWeight={600} mb={1}>
                  재시도 설정:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="최대 재시도 횟수" 
                      secondary="일시적 오류 시 재시도할 최대 횟수" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="재시도 대기 시간" 
                      secondary="재시도 전 대기 시간 (초 단위)" 
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" fontWeight={600} mb={1}>
                  POC 제한 설정:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="최대 폴더 크기 (MB)" 
                      secondary="이 크기를 초과하면 AI 분석을 건너뜁니다" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="success.main">
                  💡 사용 방법
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="1. 설정 조회" 
                      secondary="시스템 설정 메뉴에 접속하면 현재 설정이 자동으로 로드됩니다" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="2. 설정 변경 (관리자만)" 
                      secondary="원하는 설정 값을 변경한 후 '저장' 버튼을 클릭합니다" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="3. 설정 파일 동기화" 
                      secondary="저장하면 config.json 또는 ai_analysis_config.json 파일이 자동으로 업데이트됩니다" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircle color="primary" /></ListItemIcon>
                    <ListItemText 
                      primary="4. 새로고침" 
                      secondary="설정 파일을 직접 수정한 경우 '새로고침' 버튼을 클릭하여 최신 설정을 불러옵니다" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                ⚠️ 주의사항
              </Typography>
              <Typography variant="body2">
                • 설정 변경 후 저장하면 즉시 적용됩니다<br />
                • 잘못된 설정은 시스템 동작에 영향을 줄 수 있으므로 신중하게 변경하세요<br />
                • 관리자만 수정할 수 있으며, 일반 사용자는 조회만 가능합니다<br />
                • 설정 파일을 직접 수정한 경우 웹에서 새로고침하여 동기화하세요
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === 'panel10'} onChange={handleChange('panel10')}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Warning sx={{ mr: 2, color: '#f5576c' }} />
          <Typography variant="h6" fontWeight={600}>주의모니터링 취약점 설정</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="primary.main" mb={2}>
              ⚠️ 주의모니터링 취약점 설정 기능
            </Typography>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fff5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  📋 기능 개요
                </Typography>
                <Typography variant="body2" mb={1}>
                  특정 CVE에 대해 기본값보다 더 많은 POC를 수집할 수 있도록 개별 제한을 설정할 수 있습니다.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 기본적으로 모든 CVE는 동일한 수집 제한(기본값: 5개)을 사용합니다<br />
                  • 특정 CVE는 이슈가 많아서 더 많은 POC를 수집해야 할 경우 개별 제한을 설정할 수 있습니다<br />
                  • 설정한 CVE는 기본값보다 우선 적용됩니다<br />
                  • 관리자만 수정 가능하며, 일반 사용자는 조회만 가능합니다
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="warning.main">
                  1️⃣ 기본 POC 수집 제한
                </Typography>
                <Typography variant="body2" mb={1}>
                  설정하지 않은 모든 CVE에 적용되는 기본 수집 개수입니다.
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="기본 제한 설정" 
                      secondary="모든 CVE에 공통으로 적용되는 최대 POC 수집 개수 (기본: 5개)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="적용 범위" 
                      secondary="특별히 설정하지 않은 모든 CVE에 적용됩니다" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="primary.main">
                  2️⃣ 특정 CVE별 제한 설정
                </Typography>
                <Typography variant="body2" mb={1}>
                  특정 CVE에 대해 기본값보다 더 많은 POC를 수집할 수 있도록 설정합니다.
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="CVE 추가" 
                      secondary="CVE 코드를 입력하고 수집할 최대 개수를 설정합니다 (예: CVE-2025-1234, 20개)" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="CVE 수정" 
                      secondary="이미 설정된 CVE의 수집 개수를 변경할 수 있습니다" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="CVE 삭제" 
                      secondary="더 이상 특별한 제한이 필요 없는 CVE는 삭제하여 기본값을 사용할 수 있습니다" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2, bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1} color="success.main">
                  💡 사용 예시
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="시나리오 1: 특정 CVE 이슈가 많은 경우" 
                      secondary="CVE-2025-55182는 GitHub에 POC가 많아서 20개까지 수집하고 싶다면, CVE-2025-55182를 추가하고 제한을 20으로 설정" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="시나리오 2: 중요 취약점 집중 모니터링" 
                      secondary="조직에서 중요하게 모니터링해야 하는 CVE는 더 많은 POC를 수집하여 상세 분석" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="시나리오 3: 기본값으로 복귀" 
                      secondary="더 이상 특별한 제한이 필요 없으면 해당 CVE 설정을 삭제하여 기본값(5개) 사용" 
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                ℹ️ 동작 방식
              </Typography>
              <Typography variant="body2">
                • CVE 수집 시 먼저 특정 CVE별 제한 설정을 확인합니다<br />
                • 설정이 있으면 해당 제한을 사용하고, 없으면 기본 제한을 사용합니다<br />
                • 예: 기본 제한 5개, CVE-2025-55182는 20개로 설정 → CVE-2025-55182는 20개까지 수집, 나머지는 5개까지 수집
              </Typography>
            </Alert>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                ⚠️ 주의사항
              </Typography>
              <Typography variant="body2">
                • 설정 변경 후 저장하면 즉시 적용됩니다<br />
                • CVE 코드는 정확한 형식(CVE-YYYY-NNNN)으로 입력해야 합니다<br />
                • 수집 개수는 1 이상의 숫자여야 합니다<br />
                • 관리자만 수정할 수 있으며, 일반 사용자는 조회만 가능합니다
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 권한별 기능 요약 */}
      <Paper elevation={3} sx={{ p: 3, mt: 4, bgcolor: 'primary.light', color: 'white' }}>
        <Typography variant="h5" fontWeight={700} mb={3}>
          👥 사용자 권한별 기능
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} color="primary.main" mb={1}>
                일반 사용자
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="• 대시보드 조회" /></ListItem>
                <ListItem><ListItemText primary="• CVE 정보 조회" /></ListItem>
                <ListItem><ListItemText primary="• POC 상세 조회" /></ListItem>
                <ListItem><ListItemText primary="• 게시판 글쓰기" /></ListItem>
                <ListItem><ListItemText primary="• 채팅 사용" /></ListItem>
                <ListItem><ListItemText primary="• 프로필 관리" /></ListItem>
                <ListItem><ListItemText primary="• 시스템 설정 조회" /></ListItem>
                <ListItem><ListItemText primary="• 주의모니터링 취약점 설정 조회" /></ListItem>
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} color="warning.main" mb={1}>
                분석가 (Analyst)
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="• 일반 사용자 기능" /></ListItem>
                <ListItem><ListItemText primary="+ DB 직접 조회" /></ListItem>
                <ListItem><ListItemText primary="+ 상세 데이터 분석" /></ListItem>
                <ListItem><ListItemText primary="• 시스템 설정 조회" /></ListItem>
                <ListItem><ListItemText primary="• 주의모니터링 취약점 설정 조회" /></ListItem>
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} color="error.main" mb={1}>
                운영자 (Admin)
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="• 분석가 기능" /></ListItem>
                <ListItem><ListItemText primary="+ 사용자 관리" /></ListItem>
                <ListItem><ListItemText primary="+ 권한 부여" /></ListItem>
                <ListItem><ListItemText primary="+ 로그 확인" /></ListItem>
                <ListItem><ListItemText primary="+ 모든 게시글 수정/삭제" /></ListItem>
                <ListItem><ListItemText primary="+ API 토큰 관리" /></ListItem>
                <ListItem><ListItemText primary="+ 시스템 설정 수정" sx={{ fontWeight: 600, color: 'error.main' }} /></ListItem>
                <ListItem><ListItemText primary="+ 주의모니터링 취약점 설정 수정" sx={{ fontWeight: 600, color: 'error.main' }} /></ListItem>
                <ListItem><ListItemText primary="+ 기본 권한 설정" sx={{ fontWeight: 600, color: 'error.main' }} /></ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* 문의 */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={1}>
          💬 추가 문의사항이 있으신가요?
        </Typography>
        <Typography variant="body2">
          자유게시판에 질문을 남겨주시면 운영자가 답변해드립니다!
        </Typography>
      </Alert>
    </Box>
  );
}

