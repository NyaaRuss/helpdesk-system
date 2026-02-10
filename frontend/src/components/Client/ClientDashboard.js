import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  AddCircle,
  ListAlt,
  CheckCircle,
  HourglassEmpty,
  Error,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const ClientDashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await ticketAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create New Ticket',
      description: 'Report a new issue or request assistance',
      icon: <AddCircle />,
      color: 'primary',
      action: () => navigate('/tickets/new'),
    },
    {
      title: 'View All Tickets',
      description: 'Check status of all your tickets',
      icon: <ListAlt />,
      color: 'info',
      action: () => navigate('/tickets'),
    },
  ];

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.first_name || user?.username}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's what's happening with your tickets
        </Typography>
      </Box>

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
                  <Error sx={{ color: 'error.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Open Tickets
                  </Typography>
                  <Typography variant="h5">
                    {stats.open_tickets || 0}
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
                  <HourglassEmpty sx={{ color: 'warning.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    In Progress
                  </Typography>
                  <Typography variant="h5">
                    {stats.in_progress_tickets || 0}
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
                    Resolved
                  </Typography>
                  <Typography variant="h5">
                    {stats.resolved_tickets || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} md={6} key={index}>
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
    </Box>
  );
};

export default ClientDashboard;