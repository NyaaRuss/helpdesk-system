import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  People,
  Assignment,
  Warning,
  CheckCircle,
  AccessTime,
  BarChart,
  Add,
  ListAlt,
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
      const response = await ticketAPI.getDashboardStats();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'All Tickets',
      description: 'View and manage all tickets',
      icon: <ListAlt />,
      color: 'primary',
      action: () => navigate('/admin/tickets'),
    },
    {
      title: 'Manage Users',
      description: 'View and manage all users',
      icon: <People />,
      color: 'secondary',
      action: () => navigate('/admin/users'),
    },
    {
      title: 'Engineers',
      description: 'Manage engineers and assignments',
      icon: <Assignment />,
      color: 'info',
      action: () => navigate('/admin/engineers'),
    },
    {
      title: 'Reports',
      description: 'View system reports and analytics',
      icon: <BarChart />,
      color: 'warning',
      action: () => navigate('/admin/reports'),
    },
  ];

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          System overview and management
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box
                  sx={{
                    backgroundColor: 'primary.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <ListAlt sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Tickets
                  </Typography>
                  <Typography variant="h5">
                    {stats.total_tickets || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box
                  sx={{
                    backgroundColor: 'error.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <Warning sx={{ color: 'error.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Unassigned
                  </Typography>
                  <Typography variant="h5">
                    {stats.unassigned_tickets || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box
                  sx={{
                    backgroundColor: 'warning.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <AccessTime sx={{ color: 'warning.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    High Priority
                  </Typography>
                  <Typography variant="h5">
                    {stats.high_priority_tickets || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box
                  sx={{
                    backgroundColor: 'success.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <CheckCircle sx={{ color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Active Engineers
                  </Typography>
                  <Typography variant="h5">
                    {stats.active_engineers || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={action.action}
            >
              <Box
                sx={{
                  backgroundColor: `${action.color}.light`,
                  borderRadius: '50%',
                  width: 80,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                {React.cloneElement(action.icon, {
                  sx: { fontSize: 40, color: `${action.color}.main` },
                })}
              </Box>
              <Typography variant="h6" gutterBottom>
                {action.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {action.description}
              </Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                color={action.color}
              >
                Go Now
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Alerts Section */}
      {stats.unassigned_tickets > 0 && (
        <Alert severity="warning" sx={{ mt: 4 }}>
          <Typography variant="body1">
            You have {stats.unassigned_tickets} unassigned tickets
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 1 }}
            onClick={() => navigate('/admin/tickets?filter=unassigned')}
          >
            View Unassigned Tickets
          </Button>
        </Alert>
      )}
    </Box>
  );
};

export default AdminDashboard;