import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Box, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton, Avatar, Menu, MenuItem
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, BugReport, Forum, Storage,
  Description, AdminPanelSettings, Logout, Person, HelpOutline, VpnKey, SmartToy, Warning, Settings
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import ChatWidget from './ChatWidget';
import { SITE_NAME } from '../config';

const drawerWidth = 240;

export default function Layout({ user, setUser }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    // 로그인 후에도 탭 제목은 항상 사이트명으로 유지
    document.title = SITE_NAME;
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const menuItems = [
    { text: '대시보드', icon: <Dashboard />, path: '/', roles: ['user', 'analyst', 'admin'] },
    { text: 'CVE 정보', icon: <BugReport />, path: '/cve', roles: ['user', 'analyst', 'admin'] },
    { text: '자유게시판', icon: <Forum />, path: '/board', roles: ['user', 'analyst', 'admin'] },
    { text: '사용 가이드', icon: <HelpOutline />, path: '/help', roles: ['user', 'analyst', 'admin'] },
    { text: 'DB 조회', icon: <Storage />, path: '/db-query', roles: ['analyst', 'admin'] },
    { text: '주의모니터링 취약점 설정', icon: <Warning />, path: '/cve-config', roles: ['user', 'analyst', 'admin'] },
    { text: '시스템 설정', icon: <Settings />, path: '/system-config', roles: ['user', 'analyst', 'admin'] },
    { text: 'AI 할당량', icon: <SmartToy />, path: '/gemini-quota', roles: ['admin'] },
    { text: '로그 확인', icon: <Description />, path: '/logs', roles: ['admin'] },
    { text: 'API 토큰', icon: <VpnKey />, path: '/api-tokens', roles: ['admin'] },
    { text: '관리자', icon: <AdminPanelSettings />, path: '/admin', roles: ['admin'] },
  ];

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <img src="/logo.png" alt="Logo" style={{ width: 35, height: 35, borderRadius: '50%' }} />
        <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
          {SITE_NAME}
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => {
          if (!user || !item.roles.includes(user.role)) return null;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton onClick={() => navigate(item.path)}>
                <ListItemIcon sx={{ color: 'primary.main' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
              {SITE_NAME}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">{user?.name} ({user?.role})</Typography>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>{user?.name?.charAt(0)}</Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
                <Person sx={{ mr: 1 }} /> 내 프로필
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} /> 로그아웃
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: drawerWidth,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>

      {/* 채팅 위젯 */}
      <ChatWidget user={user} />
    </Box>
  );
}

