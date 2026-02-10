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
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  HourglassEmpty,
  Pending,
  BarChart,
  Refresh,
  AddTask,
  Message,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';

const EngineerDashboard = () => {
  const [stats, setStats] = useState({});
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        ticketAPI.getDashboardStats(),
        ticketAPI.getAllTickets(),
      ]);
      
      setStats(statsRes.data);
      setTickets(ticketsRes.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUnassignedTickets = () => {
    return tickets.filter(ticket => !ticket.engineer);
  };

  const handleSelfAssign = async (ticketId) => {
    try {
      // Get current user
      const profileResponse = await authAPI.getProfile();
      const currentUser = profileResponse.data;
      
      await ticketAPI.assignTicket(ticketId, currentUser.id, 'Self-assigned by engineer');
      fetchDashboardData(); // Refresh data
    } catch (err) {
      console.error('Self-assign error:', err);
      setError('Failed to self-assign ticket');
    }
  };

  const quickActions = [
    {
      title: 'My Tickets',
      description: 'View all assigned tickets',
      icon: <Assignment />,
      color: 'primary',
      action: () => navigate('/engineer/tickets'),
    },
    {
      title: 'Available Tickets',
      description: 'View and claim unassigned tickets',
      icon: <AddTask />,
      color: 'info',
      action: () => navigate('/engineer/available'),
    },
    {
      title: 'Performance',
      description: 'View your performance metrics',
      icon: <BarChart />,
      color: 'warning',
      action: () => navigate('/engineer/performance'),
    },
    {
      title: 'Messages',
      description: 'Check client communications',
      icon: <Message />,
      color: 'secondary',
      action: () => navigate('/engineer/messages'),
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Engineer Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage your tickets and view performance
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
                  <Assignment sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Assigned Tickets
                  </Typography>
                  <Typography variant="h5">
                    {stats.assigned_tickets || 0}
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
                    Active Tickets
                  </Typography>
                  <Typography variant="h5">
                    {stats.active_tickets || 0}
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
                    backgroundColor: 'info.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <Pending sx={{ color: 'info.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Pending Response
                  </Typography>
                  <Typography variant="h5">
                    {stats.pending_tickets || 0}
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

      {/* Available Tickets */}
      {getUnassignedTickets().length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Available Tickets ({getUnassignedTickets().length})
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchDashboardData}
                size="small"
              >
                Refresh
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              {getUnassignedTickets().slice(0, 3).map((ticket) => (
                <Grid item xs={12} key={ticket.id}>
                  <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {ticket.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        #{ticket.ticket_number} • {ticket.category.replace('_', ' ')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={ticket.priority}
                        color={
                          ticket.priority === 'critical' ? 'error' :
                          ticket.priority === 'high' ? 'warning' :
                          ticket.priority === 'medium' ? 'info' : 'success'
                        }
                        size="small"
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleSelfAssign(ticket.id)}
                      >
                        Claim Ticket
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            
            {getUnassignedTickets().length > 3 && (
              <Button
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => navigate('/engineer/available')}
              >
                View All Available Tickets
              </Button>
            )}
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default EngineerDashboard;