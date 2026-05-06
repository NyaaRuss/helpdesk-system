// src/components/Layout/DashboardLayout.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton,
  ListItem, ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Badge,
  Tooltip, Paper, Button,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, Add, List as ListIcon, People,
  Notifications, Assignment, BarChart, Engineering, Gavel, EventNote, WorkOutline, PersonAdd,
  ArrowBack, Home as HomeIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const drawerWidth = 240;

// Helper function to get profile picture URL
const getProfilePictureUrl = (profilePicture) => {
  if (!profilePicture) return null;
  if (profilePicture.startsWith('http')) return profilePicture;
  return `http://localhost:8000${profilePicture}`;
};

// Helper function to get page title from path
const getPageTitle = (pathname) => {
  const path = pathname.split('/').filter(Boolean);
  if (path.length === 0) return 'Dashboard';
  
  // Handle specific paths
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/tickets/new') return 'Create New Ticket';
  if (pathname === '/tickets') return 'My Tickets';
  if (pathname === '/admin/tickets') return 'All Tickets';
  if (pathname === '/admin/users') return 'User Management';
  if (pathname === '/admin/engineers') return 'Engineer Management';
  if (pathname === '/admin/reports') return 'Reports';
  if (pathname === '/engineer/sla') return 'SLA Management';
  if (pathname === '/engineer/performance') return 'Performance';
  if (pathname === '/profile') return 'My Profile';
  if (pathname.includes('/tickets/')) return 'Ticket Details';
  if (pathname.includes('/engineer/tickets')) return 'Assigned Tickets';
  if (pathname === '/register') return 'Add New User';
  
  // Fallback
  const lastSegment = path[path.length - 1];
  return lastSegment
    .replace(/[-_]/g, ' ')
    .replace(/\?.*$/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const DashboardLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  useEffect(() => {
    // Update profile image URL when user changes
    if (user?.profile_picture) {
      setProfileImageUrl(getProfilePictureUrl(user.profile_picture));
    } else {
      setProfileImageUrl(null);
    }
  }, [user]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);
  const handleLogout = () => { logout(); navigate('/login'); };
  
  // Handle back navigation
  const handleGoBack = () => {
    navigate(-1);
  };
  
  // Handle home navigation
  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const getNavItems = () => {
    const commonItems = [{ text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' }];
    
    if (user?.user_type === 'client') {
      return [
        ...commonItems,
        { text: 'New Ticket', icon: <Add />, path: '/tickets/new' },
        { text: 'My Tickets', icon: <ListIcon />, path: '/tickets' },
      ];
    } else if (user?.user_type === 'engineer') {
      return [
        ...commonItems,
        { text: 'New Ticket', icon: <Add />, path: '/tickets/new' },
        { text: 'Assigned Tickets', icon: <Assignment />, path: '/engineer/tickets?filter=mine' },
        { text: 'SLA Management', icon: <Gavel />, path: '/engineer/sla' },
        { text: 'Performance', icon: <BarChart />, path: '/engineer/performance' },
      ];
    } else if (user?.user_type === 'admin') {
      return [
        ...commonItems,
        { text: 'New Ticket', icon: <Add />, path: '/tickets/new' },
        { text: 'All Tickets', icon: <ListIcon />, path: '/admin/tickets' },
        { text: 'Users', icon: <People />, path: '/admin/users' },
        { text: 'Engineers/Sales', icon: <Engineering />, path: '/admin/engineers' },
        { text: 'Add New User', icon: <PersonAdd />, path: '/register' },
        { text: 'SLA Management', icon: <Gavel />, path: '/engineer/sla' },
        { text: 'Reports', icon: <BarChart />, path: '/admin/reports' },
      ];
    }
    return commonItems;
  };

  const drawer = (
    <div>
      {/* Sidebar User Container - EXACT same height as AppBar Toolbar (64px) */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'flex-start',
          px: 2,
          height: 64, // EXACT same height as AppBar
          minHeight: 64,
          background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
          width: '100%',
        }}
      >
        <Avatar 
          src={profileImageUrl}
          sx={{ width: 36, height: 36, mr: 1.5, bgcolor: 'rgba(255,255,255,0.2)' }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '';
          }}
        >
          {!profileImageUrl && (user?.first_name?.[0] || user?.username?.[0] || 'U')}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography 
            noWrap 
            sx={{ 
              color: 'white', 
              fontWeight: 'bold', 
              fontSize: '0.9rem',
              lineHeight: 1.2,
            }}
          >
            {user?.first_name || user?.username}
          </Typography>
          <Typography 
            sx={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: '0.7rem',
              lineHeight: 1.2,
            }}
          >
            {user?.user_type?.toUpperCase()}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(0,0,0,0.12)' }} />
      <List sx={{ py: 0 }}>
        {getNavItems().map((item) => (
          <ListItem 
            button 
            key={item.text} 
            onClick={() => navigate(item.path)} 
            selected={location.pathname === item.path || location.pathname === item.path.split('?')[0]}
            sx={{ 
              py: 1,
              '&.Mui-selected': { 
                backgroundColor: '#e3f2fd', 
                color: '#1565c0', 
                '& .MuiListItemIcon-root': { color: '#1565c0' },
                '&:hover': { backgroundColor: '#e3f2fd' }
              },
              '&:hover': { backgroundColor: '#f5f5f5' }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{ fontSize: '0.85rem' }}
            />
          </ListItem>
        ))}
      </List>
    </div>
  );

  // Check if we're on the dashboard (don't show back button on dashboard)
  const isDashboard = location.pathname === '/dashboard';
  const pageTitle = getPageTitle(location.pathname);

  return (
    <Box sx={{ display: 'flex', position: 'relative', minHeight: '100vh' }}>
      {/* Background with Frolgate Logo Watermark */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
          zIndex: -2,
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.03,
          zIndex: -1,
          pointerEvents: 'none',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <img 
          src="/frolgate logo vector.png" 
          alt="Frolgate Logo"
          style={{
            maxWidth: '600px',
            width: '80%',
            height: 'auto',
          }}
        />
      </Box>

      {/* Floating animated shapes */}
      <Box
        sx={{
          position: 'fixed',
          top: '10%',
          left: '5%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: '#1565c0',
          opacity: 0.02,
          animation: 'float 20s infinite',
          zIndex: -1,
          '@keyframes float': {
            '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
            '50%': { transform: 'translate(50px, 50px) rotate(180deg)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          bottom: '10%',
          right: '5%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: '#0d47a1',
          opacity: 0.02,
          animation: 'float 15s infinite reverse',
          zIndex: -1,
        }}
      />

      <AppBar 
        position="fixed" 
        sx={{ 
          width: { sm: `calc(100% - ${drawerWidth}px)` }, 
          ml: { sm: `${drawerWidth}px` },
          background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar sx={{ height: 64, minHeight: 64, px: { xs: 2, sm: 3 } }}>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          
          {/* Logo in AppBar */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img 
              src="/frolgate logo vector.png" 
              alt="Frolgate"
              style={{
                height: '32px',
                width: 'auto',
                filter: 'brightness(0) invert(1)',
                marginRight: '12px',
              }}
            />
            <Typography variant="h6" noWrap sx={{ fontWeight: 'bold', letterSpacing: '1px', fontSize: '1.1rem' }}>
              Help Desk
            </Typography>
          </Box>
          
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={0} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          <IconButton onClick={handleProfileMenuOpen} color="inherit">
            <Avatar 
              src={profileImageUrl}
              sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '';
              }}
            >
              {!profileImageUrl && (user?.first_name?.[0] || user?.username?.[0] || 'U')}
            </Avatar>
          </IconButton>
          
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleProfileMenuClose}>
            <MenuItem onClick={() => navigate('/profile')}>Profile</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: 'white',
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: 'white',
              borderRight: '1px solid #e0e0e0',
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` }, 
          mt: 8,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Back Button and Page Title Section - Below AppBar, above content */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!isDashboard && (
              <Tooltip title="Go Back">
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={handleGoBack}
                  sx={{ 
                    textTransform: 'none',
                    borderRadius: 2,
                    borderColor: '#1565c0',
                    color: '#1565c0',
                    '&:hover': {
                      borderColor: '#0d47a1',
                      backgroundColor: 'rgba(21, 101, 192, 0.04)'
                    }
                  }}
                >
                  Back
                </Button>
              </Tooltip>
            )}
            
            <Tooltip title="Go to Dashboard">
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2,
                  borderColor: '#4caf50',
                  color: '#4caf50',
                  '&:hover': {
                    borderColor: '#388e3c',
                    backgroundColor: 'rgba(76, 175, 80, 0.04)'
                  }
                }}
              >
                Home
              </Button>
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a237e', fontSize: '1.1rem' }}>
              {pageTitle}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
              {new Date().toLocaleDateString()}
            </Typography>
          </Box>
        </Paper>
        
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;