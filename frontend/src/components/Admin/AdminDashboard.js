import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Box, Card, CardContent,
  LinearProgress, Alert, Button,
} from '@mui/material';
import {
  People, Assignment, Warning, CheckCircle,
  AccessTime, BarChart, ListAlt, DoneAll,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ticketsRes, usersRes] = await Promise.all([
        ticketAPI.getDashboardStats(),
        ticketAPI.getAllTickets(),
        authAPI.getUsers('engineer')
      ]);

      const allTickets = ticketsRes.data;
      
      const unassignedCount = allTickets.filter(
        t => (!t.assigned_engineers || t.assigned_engineers.length === 0) && t.status !== 'resolved'
      ).length;

      const resolvedCount = allTickets.filter(
        t => t.status === 'resolved' || t.status === 'closed'
      ).length;

      setStats({
        ...statsRes.data,
        total_tickets: allTickets.length,
        unassigned_tickets: unassignedCount,
        resolved_tickets: resolvedCount,
        active_engineers: usersRes.data.length
      });
      
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'All Tickets', description: 'View and manage all tickets', icon: <ListAlt />, color: 'primary', action: () => navigate('/admin/tickets') },
    { title: 'Manage Users', description: 'View and manage all users', icon: <People />, color: 'secondary', action: () => navigate('/admin/users') },
    { title: 'Engineers', description: 'Manage engineers and assignments', icon: <Assignment />, color: 'info', action: () => navigate('/admin/engineers') },
    { title: 'Reports', description: 'View system reports and analytics', icon: <BarChart />, color: 'warning', action: () => navigate('/admin/reports') },
  ];

  if (loading) return <LinearProgress />;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          System overview and management
        </Typography>
      </Box>

      {/* ERROR MESSAGE FOR API FAILURES */}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* CRITICAL ALERT: Changed to "error" (Red) */}
      {stats.unassigned_tickets > 0 && (
        <Alert 
          severity="error" 
          variant="filled" 
          sx={{ mb: 4, boxShadow: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate('/admin/tickets?status=open')}
            >
              View Now
            </Button>
          }
        >
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            Attention: You have <strong>{stats.unassigned_tickets}</strong> unassigned tickets that require engineer allocation.
          </Typography>
        </Alert>
      )}

      {/* Stats Cards Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ backgroundColor: 'primary.light', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                  <ListAlt sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">Total Tickets</Typography>
                  <Typography variant="h5">{stats.total_tickets || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ backgroundColor: 'error.light', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                  <Warning sx={{ color: 'error.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">Unassigned</Typography>
                  <Typography variant="h5">{stats.unassigned_tickets || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ backgroundColor: 'warning.light', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                  <AccessTime sx={{ color: 'warning.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">High Priority</Typography>
                  <Typography variant="h5">{stats.high_priority_tickets || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: '#f1f8e9' } }} 
            onClick={() => navigate('/admin/tickets?status=resolved')}
          >
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ backgroundColor: '#e8f5e9', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                  <DoneAll sx={{ color: '#2e7d32' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">Resolved</Typography>
                  <Typography variant="h5">{stats.resolved_tickets || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ backgroundColor: 'success.light', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                  <People sx={{ color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">Active Engineers</Typography>
                  <Typography variant="h5">{stats.active_engineers || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>Quick Actions</Typography>
      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}
              onClick={action.action}
            >
              <Box sx={{ backgroundColor: `${action.color}.light`, borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                {React.cloneElement(action.icon, { sx: { fontSize: 40, color: `${action.color}.main` } })}
              </Box>
              <Typography variant="h6" gutterBottom>{action.title}</Typography>
              <Typography variant="body2" color="textSecondary">{action.description}</Typography>
              <Button variant="outlined" sx={{ mt: 2 }} color={action.color}>Go Now</Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AdminDashboard;