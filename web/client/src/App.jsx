import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { useState, useEffect } from 'react';
import { API_URL, SITE_NAME } from './config';

// 페이지 컴포넌트
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import FindAccount from './pages/FindAccount';
import Dashboard from './pages/Dashboard';
import CVEList from './pages/CVEList';
import CVEDetail from './pages/CVEDetail';
import POCDetail from './pages/POCDetail';
import Board from './pages/Board';
import BoardDetail from './pages/BoardDetail';
import BoardWrite from './pages/BoardWrite';
import BoardEdit from './pages/BoardEdit';
import Profile from './pages/Profile';
import Help from './pages/Help';
import DBQuery from './pages/DBQuery';
import LogsView from './pages/LogsView';
import AdminPanel from './pages/AdminPanel';
import ApiTokens from './pages/ApiTokens';
import GeminiQuota from './pages/GeminiQuota';
import CVEConfig from './pages/CVEConfig';
import SystemConfig from './pages/SystemConfig';
import CollectionTrendsDetail from './pages/CollectionTrendsDetail';

// 파란색 테마
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#2196f3',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Noto Sans KR", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(25, 118, 210, 0.1)',
        },
      },
    },
  },
});

// Protected Route
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && userStr) {
    const user = JSON.parse(userStr);
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/" />;
    }
  }

  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 브라우저 탭 제목(사이트명) 설정
    document.title = SITE_NAME;
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // JWT 토큰으로 사용자 정보 확인
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          // 토큰이 유효하지 않으면 로컬스토리지 클리어
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.error('인증 확인 실패:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Typography>로딩 중...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/find-account" element={<FindAccount />} />
          
          <Route path="/" element={<Layout user={user} setUser={setUser} />}>
            <Route index element={<Dashboard user={user} />} />
            <Route path="dashboard/collection-trends/:date" element={<CollectionTrendsDetail />} />
            
            {/* CVE 관련 */}
            <Route path="cve" element={<CVEList />} />
            <Route path="cve/:cveCode" element={<CVEDetail />} />
            <Route path="poc/:id" element={<POCDetail />} />
            
            {/* 게시판 */}
            <Route path="board" element={<Board />} />
            <Route path="board/:id" element={<BoardDetail />} />
            <Route path="board/write" element={
              <ProtectedRoute>
                <BoardWrite />
              </ProtectedRoute>
            } />
            <Route path="board/edit/:id" element={
              <ProtectedRoute>
                <BoardEdit />
              </ProtectedRoute>
            } />
            
            {/* 프로필 */}
            <Route path="profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* 도움말 */}
            <Route path="help" element={<Help />} />
            
            {/* 분석가/운영자 */}
            <Route path="db-query" element={
              <ProtectedRoute allowedRoles={['analyst', 'admin']}>
                <DBQuery />
              </ProtectedRoute>
            } />
            
            {/* 운영자 */}
            <Route path="cve-config" element={<CVEConfig />} />
            <Route path="system-config" element={<SystemConfig />} />
            <Route path="logs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LogsView />
              </ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            } />
            <Route path="api-tokens" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ApiTokens />
              </ProtectedRoute>
            } />
            <Route path="gemini-quota" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <GeminiQuota />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
