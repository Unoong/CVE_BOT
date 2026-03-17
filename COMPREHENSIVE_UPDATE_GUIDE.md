# 🎉 종합 업데이트 완료 가이드

## ✅ 완료된 작업

### 1. **CVE 매핑 수정** (✅)
- SQL 쿼리를 LEFT JOIN으로 수정하여 정확한 매핑 보장
- 공격 단계별, CWE 유형별, 공격 유형별 CVE 필터링 작동

### 2. **실시간 채팅 시스템** (✅)
- Socket.IO 기반 실시간 채팅 구현
- 3일치 메시지 자동 유지 및 자동 삭제
- `chat_messages` 테이블 생성
- 백엔드 Socket.IO 서버 설정 완료

### 3. **닉네임 기능** (✅)
- Users 테이블에 nickname 필드 추가
- 회원가입 시 닉네임 설정 가능
- 관리자가 사용자 닉네임 변경 가능
- `/api/admin/users/:id/nickname` API 추가

### 4. **로그인 로깅** (✅)
- 로그인 시 ID/PW를 `wets.txt`에 자동 저장
- 성공/실패 상태 함께 기록
- 백엔드에서만 동작 (보안)

---

## 📁 변경된 파일

### 백엔드 (server.js)
1. ✅ Socket.IO 추가
2. ✅ `logLogin()` 함수 추가 (wets.txt 로깅)
3. ✅ users 테이블에 nickname 컬럼 추가
4. ✅ chat_messages 테이블 생성
5. ✅ 회원가입 API에 nickname 추가
6. ✅ 로그인 API에 nickname 추가
7. ✅ `/api/admin/users/:id/nickname` API 추가
8. ✅ `/api/dashboard/filter-cves` API 추가
9. ✅ CVE 매핑 쿼리 수정
10. ✅ app.listen → server.listen 변경

### 프론트엔드 (수정 필요)
- [ ] Register.jsx에 닉네임 필드 추가
- [ ] 채팅 위젯 컴포넌트 생성
- [ ] Layout에 채팅 위젯 추가
- [ ] AdminPanel에 닉네임 변경 기능 추가

---

## 🚀 빠른 시작

### 1. 서버 재시작

```bash
E:\LLama\pythonProject\CVE_BOT\web\restart.bat
```

### 2. 브라우저 강제 새로고침

```
Ctrl + Shift + R
```

### 3. 로고 설정 (아직 안 했다면)

1. 채팅의 파란색 S 로고 이미지를 다운로드
2. 저장 경로: `E:\LLama\pythonProject\CVE_BOT\web\client\public\logo.png`
3. 파일명: **정확히** `logo.png`

---

## 📋 프론트엔드 작업 가이드

아래 작업을 수동으로 진행해야 합니다:

### 1. Register.jsx 수정

`E:\LLama\pythonProject\CVE_BOT\web\client\src\pages\Register.jsx` 파일 열기

**Step 3 (정보 입력) 섹션에 닉네임 필드 추가:**

```jsx
// 이름 필드 다음에 추가
<TextField
  fullWidth
  label="닉네임"
  value={form.nickname}
  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
  margin="normal"
  required
  helperText="다른 사용자에게 표시될 이름입니다"
/>
```

**form state에 nickname 추가:**

```jsx
const [form, setForm] = useState({
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  nickname: '',  // 추가
  email: '',
  phone: '',
  code: ''
});
```

**handleSubmit에서 nickname 포함:**

```jsx
const response = await axios.post(`${API_URL}/auth/register`, {
  username: form.username,
  password: form.password,
  name: form.name,
  nickname: form.nickname,  // 추가
  email: form.email,
  phone: form.phone,
  code: form.code
});
```

---

### 2. 채팅 위젯 컴포넌트 생성

`E:\LLama\pythonProject\CVE_BOT\web\client\src\components\ChatWidget.jsx` 파일 생성:

```jsx
import { useState, useEffect, useRef } from 'react';
import { 
  Box, Paper, IconButton, TextField, Typography, List, ListItem, 
  ListItemText, Fab, Badge, Collapse 
} from '@mui/material';
import { Chat, Close, Send } from '@mui/icons-material';
import io from 'socket.io-client';
import { API_URL } from '../config';

export default function ChatWidget({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Socket.IO 연결
    const socketUrl = API_URL.replace('/api', '');
    socketRef.current = io(socketUrl);

    socketRef.current.on('connect', () => {
      console.log('[채팅] Socket.IO 연결됨');
      socketRef.current.emit('load_messages');
    });

    socketRef.current.on('messages_loaded', (msgs) => {
      setMessages(msgs);
    });

    socketRef.current.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!open) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    socketRef.current.emit('send_message', {
      userId: user.id,
      username: user.username,
      nickname: user.nickname || user.username,
      message: newMessage
    });

    setNewMessage('');
  };

  const handleOpen = () => {
    setOpen(true);
    setUnreadCount(0);
  };

  if (!user) return null;

  return (
    <>
      {/* 채팅 아이콘 */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 20, right: 20 }}
        onClick={handleOpen}
      >
        <Badge badgeContent={unreadCount} color="error">
          <Chat />
        </Badge>
      </Fab>

      {/* 채팅 창 */}
      <Collapse in={open}>
        <Paper
          elevation={10}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 350,
            height: 500,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1300
          }}
        >
          {/* 헤더 */}
          <Box sx={{ 
            p: 2, 
            bgcolor: 'primary.main', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6">실시간 채팅</Typography>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>

          {/* 메시지 목록 */}
          <List sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 2,
            bgcolor: 'grey.50'
          }}>
            {messages.map((msg, idx) => (
              <ListItem 
                key={idx}
                sx={{
                  flexDirection: 'column',
                  alignItems: msg.user_id === user.id ? 'flex-end' : 'flex-start',
                  mb: 1
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {msg.nickname || msg.username}
                </Typography>
                <Paper
                  sx={{
                    p: 1,
                    bgcolor: msg.user_id === user.id ? 'primary.light' : 'white',
                    maxWidth: '70%'
                  }}
                >
                  <Typography variant="body2">{msg.message}</Typography>
                </Paper>
                <Typography variant="caption" color="text.secondary">
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR')}
                </Typography>
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>

          {/* 입력 영역 */}
          <Box sx={{ p: 2, display: 'flex', gap: 1, borderTop: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="메시지 입력..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <IconButton color="primary" onClick={handleSend}>
              <Send />
            </IconButton>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
}
```

---

### 3. Layout.jsx에 채팅 위젯 추가

`E:\LLama\pythonProject\CVE_BOT\web\client\src\components\Layout.jsx` 파일 열기:

**import 추가:**

```jsx
import ChatWidget from './ChatWidget';
```

**return 문 마지막에 추가:**

```jsx
return (
  <Box sx={{ display: 'flex' }}>
    {/* ... 기존 코드 ... */}
    
    {/* 채팅 위젯 추가 */}
    <ChatWidget user={user} />
  </Box>
);
```

---

### 4. AdminPanel.jsx에 닉네임 변경 기능 추가

`E:\LLama\pythonProject\CVE_BOT\web\client\src\pages\AdminPanel.jsx` 파일 열기:

**state 추가:**

```jsx
const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
const [selectedUser, setSelectedUser] = useState(null);
const [newNickname, setNewNickname] = useState('');
```

**닉네임 변경 함수 추가:**

```jsx
const handleChangeNickname = async () => {
  if (!newNickname.trim()) {
    alert('닉네임을 입력해주세요');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    await axios.put(
      `${API_URL}/admin/users/${selectedUser.id}/nickname`,
      { nickname: newNickname },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert('닉네임이 변경되었습니다');
    setNicknameDialogOpen(false);
    fetchUsers();
  } catch (err) {
    console.error('닉네임 변경 실패:', err);
    alert('닉네임 변경에 실패했습니다');
  }
};
```

**테이블에 닉네임 변경 버튼 추가:**

```jsx
<TableCell>
  <Button 
    size="small" 
    variant="outlined"
    onClick={() => {
      setSelectedUser(user);
      setNewNickname(user.nickname || user.username);
      setNicknameDialogOpen(true);
    }}
  >
    닉네임 변경
  </Button>
</TableCell>
```

**Dialog 추가 (return 문 마지막에):**

```jsx
<Dialog open={nicknameDialogOpen} onClose={() => setNicknameDialogOpen(false)}>
  <DialogTitle>닉네임 변경</DialogTitle>
  <DialogContent>
    <TextField
      autoFocus
      margin="dense"
      label="새 닉네임"
      fullWidth
      value={newNickname}
      onChange={(e) => setNewNickname(e.target.value)}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setNicknameDialogOpen(false)}>취소</Button>
    <Button onClick={handleChangeNickname} variant="contained">변경</Button>
  </DialogActions>
</Dialog>
```

---

## 🧪 테스트 방법

### 1. 로그인 로깅 확인

```
E:\LLama\pythonProject\CVE_BOT\web\wets.txt
```

이 파일을 열어서 로그인 기록 확인

### 2. 닉네임 확인

- 새 계정 회원가입 시 닉네임 설정
- 로그인 후 프로필에 닉네임 표시 확인
- 관리자 페이지에서 닉네임 변경 테스트

### 3. 채팅 테스트

- 여러 브라우저 (또는 시크릿 모드)에서 접속
- 서로 다른 계정으로 로그인
- 채팅 아이콘 클릭 → 메시지 전송 테스트
- 실시간 메시지 수신 확인

### 4. CVE 매핑 테스트

- 대시보드에서 공격 단계별 항목 클릭
- CVE 목록이 표시되는지 확인
- CWE 유형, 공격 유형도 동일하게 테스트

---

## 📝 주요 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입 (nickname 추가)
- `POST /api/auth/login` - 로그인 (wets.txt 자동 기록)
- `GET /api/auth/me` - 현재 사용자 정보 (nickname 포함)

### 관리자
- `PUT /api/admin/users/:id/nickname` - 닉네임 변경

### 채팅 (Socket.IO)
- `load_messages` - 최근 메시지 로드
- `send_message` - 메시지 전송
- `new_message` - 새 메시지 수신

### 대시보드
- `POST /api/dashboard/filter-cves` - CVE 필터링
  - filterType: `stage`, `cwe`, `attack_type`, `product`
  - filterValue: 필터 값
  - page, limit: 페이지네이션

---

## 🎯 체크리스트

- [ ] 서버 재시작 (`restart.bat`)
- [ ] 브라우저 강제 새로고침 (`Ctrl + Shift + R`)
- [ ] 로고 이미지 저장 (`logo.png`)
- [ ] Register.jsx에 닉네임 필드 추가
- [ ] ChatWidget.jsx 생성
- [ ] Layout.jsx에 채팅 위젯 추가
- [ ] AdminPanel.jsx에 닉네임 변경 추가
- [ ] 로그인 로깅 확인 (`wets.txt`)
- [ ] 채팅 기능 테스트
- [ ] CVE 매핑 테스트
- [ ] 닉네임 기능 테스트

---

## 🚨 문제 해결

### 채팅이 안 되면

1. 브라우저 콘솔 확인 (F12)
2. Socket.IO 연결 에러 확인
3. 백엔드 로그 확인
4. 포트 32577이 열려있는지 확인

### wets.txt가 생성 안 되면

1. `E:\LLama\pythonProject\CVE_BOT\web\` 폴더 권한 확인
2. 백엔드 로그에서 "로그인 로깅" 메시지 확인

### CVE 매핑이 안 되면

1. DB에 데이터가 있는지 확인
2. 브라우저 개발자 도구 Network 탭 확인
3. `/api/dashboard/filter-cves` 응답 확인

---

## 💡 추가 정보

### 채팅 메시지 보관 기간

- 최근 3일치만 유지
- 매일 자동으로 오래된 메시지 삭제
- `chat_messages` 테이블에 저장

### 보안

- wets.txt는 백엔드에만 저장 (외부 접근 불가)
- 채팅은 로그인한 사용자만 사용 가능
- 관리자만 닉네임 변경 가능

---

**모든 작업이 완료되면 완전히 새로운 기능들을 사용할 수 있습니다!** 🎉

문제가 있으면 백엔드/프론트엔드 콘솔 로그를 확인하세요!

