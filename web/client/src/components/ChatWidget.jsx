import { useState, useEffect, useRef } from 'react';
import { 
  Box, Paper, IconButton, TextField, Typography, List, ListItem, 
  Fab, Badge, Collapse, Avatar, Divider, Chip, Tooltip
} from '@mui/material';
import { Chat, Close, Send, PhotoCamera, Image as ImageIcon } from '@mui/icons-material';
import io from 'socket.io-client';
import axios from 'axios';
import { API_URL } from '../config';
import { formatTime } from '../utils/dateFormat';

export default function ChatWidget({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Socket.IO 연결
    const socketUrl = API_URL.replace('/api', '');
    console.log('[채팅] Socket.IO 연결 시도:', socketUrl);
    socketRef.current = io(socketUrl);

    socketRef.current.on('connect', () => {
      console.log('[채팅] Socket.IO 연결 성공');
      socketRef.current.emit('load_messages');
    });

    socketRef.current.on('messages_loaded', (msgs) => {
      console.log('[채팅] 메시지 로드:', msgs.length, '개');
      setMessages(msgs);
    });

    socketRef.current.on('new_message', (msg) => {
      console.log('[채팅] 새 메시지:', msg);
      console.log('[채팅] 메시지 내용:', {
        message: msg.message,
        image_url: msg.image_url,
        image_name: msg.image_name,
        hasMessage: !!msg.message,
        hasImage: !!msg.image_url
      });
      setMessages(prev => [...prev, msg]);
      if (!open && msg.user_id !== user.id) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socketRef.current.on('error', (error) => {
      console.error('[채팅] 에러:', error);
      alert('채팅 오류: ' + error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log('[채팅] Socket.IO 연결 해제');
      }
    };
  }, [user]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedImage) return;

    try {
      if (selectedImage) {
        // 이미지 업로드
        const formData = new FormData();
        formData.append('file', selectedImage);
        
        const response = await axios.post(`${API_URL}/chat/upload-image`, formData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 10000 // 10초 타임아웃
        });

        if (response.status === 200) {
          const result = response.data;
          console.log('[이미지 업로드 성공]', result);
          
          // Socket.IO 연결 상태 확인
          if (!socketRef.current || !socketRef.current.connected) {
            console.error('[Socket.IO] 연결이 끊어져 있습니다');
            alert('채팅 연결이 끊어졌습니다. 페이지를 새로고침해주세요.');
            return;
          }
          
          const messageData = {
            userId: user.id,
            username: user.username,
            nickname: user.nickname || user.username,
            message: newMessage.trim() || '', // 빈 문자열 사용
            imageUrl: result.imageUrl,
            imageName: selectedImage.name
          };
          
          console.log('[Socket.IO] 메시지 전송 데이터:', messageData);
          
          // 이미지 메시지 전송
          socketRef.current.emit('send_message', messageData);
        } else {
          console.error('[이미지 업로드 실패]', response);
          alert('이미지 업로드에 실패했습니다.');
          return;
        }
      } else {
        // 텍스트 메시지 전송
        socketRef.current.emit('send_message', {
          userId: user.id,
          username: user.username,
          nickname: user.nickname || user.username,
          message: newMessage
        });
      }

      setNewMessage('');
      setSelectedImage(null);
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      if (error.response) {
        console.error('서버 응답:', error.response.data);
        alert(`메시지 전송 실패: ${error.response.data.error || error.response.statusText}`);
      } else if (error.request) {
        console.error('요청 실패:', error.request);
        alert('서버에 연결할 수 없습니다.');
      } else {
        console.error('오류:', error.message);
        alert('메시지 전송에 실패했습니다.');
      }
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    } else {
      alert('이미지 파일만 업로드 가능합니다.');
    }
  };

  const handlePaste = (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        setSelectedImage(file);
        break;
      }
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        sx={{ 
          position: 'fixed', 
          bottom: 20, 
          right: 20,
          zIndex: 1000
        }}
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
            width: 400,
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1300,
            borderRadius: 2
          }}
        >
          {/* 헤더 */}
          <Box sx={{ 
            p: 2, 
            bgcolor: 'primary.main', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chat />
              <Typography variant="h6" fontWeight={600}>실시간 채팅</Typography>
            </Box>
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
            {messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  아직 메시지가 없습니다.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  첫 메시지를 보내보세요!
                </Typography>
              </Box>
            ) : (
              messages.map((msg, idx) => {
                const isMyMessage = msg.user_id === user.id;
                return (
                  <ListItem 
                    key={idx}
                    sx={{
                      flexDirection: 'column',
                      alignItems: isMyMessage ? 'flex-end' : 'flex-start',
                      mb: 1,
                      p: 0
                    }}
                  >
                    {/* 발신자 정보 */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mb: 0.5,
                      flexDirection: isMyMessage ? 'row-reverse' : 'row'
                    }}>
                      <Avatar 
                        sx={{ 
                          width: 24, 
                          height: 24, 
                          bgcolor: isMyMessage ? 'primary.main' : 'secondary.main',
                          fontSize: 12
                        }}
                      >
                        {(msg.nickname || msg.username).charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {msg.nickname || msg.username}
                      </Typography>
                    </Box>

                    {/* 메시지 내용 */}
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor: isMyMessage ? 'primary.main' : 'white',
                        color: isMyMessage ? 'white' : 'text.primary',
                        maxWidth: '70%',
                        borderRadius: 2,
                        boxShadow: 1
                      }}
                    >
                      {msg.image_url && (
                        <Box sx={{ mb: msg.message ? 1 : 0 }}>
                          <img 
                            src={msg.image_url.startsWith('http') ? msg.image_url : `${API_URL.replace('/api', '')}${msg.image_url}`}
                            alt={msg.image_name || '이미지'}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '200px',
                              borderRadius: '8px',
                              display: 'block',
                              objectFit: 'contain',
                              backgroundColor: '#f5f5f5'
                            }}
                            loading="lazy"
                            onError={(e) => {
                              console.error('이미지 로드 실패:', e.target.src);
                              e.target.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log('이미지 로드 성공:', msg.image_url);
                            }}
                          />
                        </Box>
                      )}
                      {msg.message && msg.message.trim() && (
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {msg.message}
                        </Typography>
                      )}
                    </Paper>

                    {/* 시간 */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {formatTime(msg.created_at)}
                    </Typography>
                  </ListItem>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </List>

          <Divider />

          {/* 선택된 이미지 표시 */}
          {selectedImage && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon color="primary" />
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  {selectedImage.name}
                </Typography>
                <IconButton size="small" onClick={removeSelectedImage}>
                  <Close />
                </IconButton>
              </Box>
              <Box sx={{ mt: 1 }}>
                <img 
                  src={URL.createObjectURL(selectedImage)} 
                  alt="미리보기"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100px',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    backgroundColor: '#f5f5f5'
                  }}
                  onLoad={(e) => {
                    URL.revokeObjectURL(e.target.src); // 메모리 정리
                  }}
                />
              </Box>
            </Box>
          )}

          {/* 입력 영역 */}
          <Box sx={{ 
            p: 2, 
            display: 'flex', 
            gap: 1,
            bgcolor: 'white',
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8
          }}>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <Tooltip title="이미지 첨부">
              <IconButton 
                size="medium"
                onClick={() => fileInputRef.current?.click()}
                sx={{ 
                  alignSelf: 'flex-end',
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    transform: 'scale(1.05)',
                    transition: 'all 0.2s ease-in-out'
                  },
                  transition: 'all 0.2s ease-in-out',
                  border: '2px solid',
                  borderColor: 'primary.light'
                }}
              >
                <PhotoCamera />
              </IconButton>
            </Tooltip>
            <TextField
              fullWidth
              size="small"
              placeholder="메시지를 입력하세요... (Ctrl+V로 이미지 붙여넣기 가능)"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onPaste={handlePaste}
              multiline
              maxRows={3}
            />
            <IconButton 
              color="primary" 
              onClick={handleSend}
              disabled={!newMessage.trim() && !selectedImage}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                },
                '&:disabled': {
                  bgcolor: 'grey.300'
                }
              }}
            >
              <Send />
            </IconButton>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
}

