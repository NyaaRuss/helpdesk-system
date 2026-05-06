// src/components/Dashboard/ClientDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  AddCircle,
  ListAlt,
  CheckCircle,
  HourglassEmpty,
  Error,
  Warning,
  Timeline,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ClientDashboard = () => {
  const [stats, setStats] = useState({});
  const [recentTickets, setRecentTickets] = useState([]);
  const [escalatedTickets, setEscalatedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myAnalytics, setMyAnalytics] = useState({
    avgResolutionTime: 0,
    resolutionRate: 0,
    priorityDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const statsRes = await ticketAPI.getDashboardStats();
      setStats(statsRes.data);
      
      const ticketsRes = await ticketAPI.getAllTickets();
      const userTickets = ticketsRes.data.filter(t => t.client?.id === user?.id);
      
      setRecentTickets(userTickets.slice(0, 3));
      
      const escalated = userTickets.filter(t => t.is_escalated === true);
      setEscalatedTickets(escalated);
      
      // Calculate client analytics
      calculateClientAnalytics(userTickets);
      
      setError('');
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const calculateClientAnalytics = (userTickets) => {
    const resolvedTickets = userTickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    
    // Calculate average resolution time
    let totalHours = 0;
    resolvedTickets.forEach(ticket => {
      if (ticket.created_at && ticket.updated_at) {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.updated_at);
        totalHours += (resolved - created) / (1000 * 60 * 60);
      }
    });
    
    const avgResolutionTime = resolvedTickets.length > 0 ? totalHours / resolvedTickets.length : 0;
    const resolutionRate = userTickets.length > 0 ? (resolvedTickets.length / userTickets.length) * 100 : 0;
    
    const priorityDistribution = {
      low: userTickets.filter(t => t.priority === 'low').length,
      medium: userTickets.filter(t => t.priority === 'medium').length,
      high: userTickets.filter(t => t.priority === 'high').length,
      critical: userTickets.filter(t => t.priority === 'critical').length
    };
    
    setMyAnalytics({
      avgResolutionTime: avgResolutionTime.toFixed(1),
      resolutionRate: resolutionRate.toFixed(1),
      priorityDistribution
    });
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const getTicketProgressValue = (status) => {
    const progressMap = {
      'open': 10,
      'in_progress': 40,
      'pending_client': 60,
      'escalated': 70,
      'resolved': 100,
      'closed': 100,
    };
    return progressMap[status] || 0;
  };

  const getTicketProgressLabel = (status) => {
    const labelMap = {
      'open': 'Just started',
      'in_progress': 'In progress',
      'pending_client': 'Waiting for your response',
      'escalated': 'Escalated - Admin attention',
      'resolved': 'Completed',
      'closed': 'Closed',
    };
    return labelMap[status] || 'Processing';
  };

  const getStatusChip = (status) => {
    const config = {
      open: { label: 'Open', color: 'error' },
      in_progress: { label: 'In Progress', color: 'warning' },
      pending_client: { label: 'Pending Your Reply', color: 'info' },
      escalated: { label: 'Escalated', color: 'error' },
      resolved: { label: 'Resolved', color: 'success' },
      closed: { label: 'Closed', color: 'default' },
    };
    const s = config[status] || { label: status, color: 'default' };
    return <Chip label={s.label} color={s.color} size="small" />;
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const priorityData = Object.entries(myAnalytics.priorityDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: getPriorityColor(name)
  }));

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
    {
      title: 'Ticket Progress',
      description: 'Track resolution progress',
      icon: <Timeline />,
      color: 'success',
      action: () => navigate('/tickets'),
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
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
          Welcome back, {user?.first_name || user?.username}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Track your tickets and support requests
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {escalatedTickets.length > 0 && (
        <Alert 
          severity="error" 
          variant="filled" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/tickets?filter=escalated')}>
              View
            </Button>
          }
        >
          <Typography variant="body2">
            ⚠️ You have <strong>{escalatedTickets.length}</strong> escalated ticket(s) requiring attention!
          </Typography>
        </Alert>
      )}

      {/* Stats Cards with Clickable Links */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ height: '100%', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}
            onClick={() => navigate('/tickets')}
          >
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ backgroundColor: 'primary.light', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                  <ListAlt sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">Total Tickets</Typography>
                  <Typography variant="h4">{stats.total_tickets || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ height: '100%', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}
            onClick={() => navigate('/tickets?status=open')}
          >
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ backgroundColor: 'error.light', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                  <Error sx={{ color: 'error.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">Open Tickets</Typography>
                  <Typography variant="h4" color="error.main">{stats.open_tickets || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ height: '100%', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}
            onClick={() => navigate('/tickets?status=in_progress')}
          >
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ backgroundColor: 'warning.light', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                  <HourglassEmpty sx={{ color: 'warning.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">In Progress</Typography>
                  <Typography variant="h4" color="warning.main">{stats.in_progress_tickets || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ height: '100%', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}
            onClick={() => navigate('/tickets?status=resolved')}
          >
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ backgroundColor: 'success.light', borderRadius: '50%', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                  <CheckCircle sx={{ color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">Resolved</Typography>
                  <Typography variant="h4" color="success.main">{stats.resolved_tickets || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Client Analytics Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2, fontWeight: 'bold' }}>
        <TrendingUp sx={{ mr: 1 }} /> My Ticket Analytics
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule /> Average Resolution Time
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" color="primary.main" fontWeight="bold">
                {myAnalytics.avgResolutionTime}
              </Typography>
              <Typography variant="body2" color="textSecondary">hours per resolved ticket</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp /> Resolution Rate
            </Typography>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h2" color={myAnalytics.resolutionRate >= 70 ? '#4caf50' : '#ff9800'} fontWeight="bold">
                {myAnalytics.resolutionRate}%
              </Typography>
              <Typography variant="body2" color="textSecondary">of your tickets resolved</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={myAnalytics.resolutionRate} 
              sx={{ height: 10, borderRadius: 5 }}
              color={myAnalytics.resolutionRate >= 70 ? "success" : "warning"}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Priority Distribution Chart */}
      {priorityData.some(p => p.value > 0) && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning /> My Ticket Priority Distribution
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ReTooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Recent Ticket Progress Section */}
      {recentTickets.length > 0 && (
        <Box sx={{ mt: 2, mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Recent Ticket Progress
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Track the status of your most recent tickets
          </Typography>
          <Grid container spacing={2}>
            {recentTickets.map((ticket) => (
              <Grid item xs={12} key={ticket.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer', 
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
                    borderLeft: ticket.is_escalated ? '4px solid #f44336' : 'none'
                  }} 
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {ticket.ticket_number}
                        </Typography>
                        {getStatusChip(ticket.status)}
                        {ticket.priority === 'high' && (
                          <Chip label="High Priority" size="small" color="warning" variant="outlined" />
                        )}
                        {ticket.priority === 'critical' && (
                          <Chip label="Critical" size="small" color="error" variant="outlined" />
                        )}
                        {ticket.is_escalated && (
                          <Chip label="Escalated" size="small" color="error" icon={<Warning />} />
                        )}
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        Created: {new Date(ticket.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {ticket.title}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flexGrow: 1, minWidth: 150 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="textSecondary">Progress</Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {getTicketProgressValue(ticket.status)}%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={getTicketProgressValue(ticket.status)} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              backgroundColor: ticket.is_escalated ? '#f44336' : 
                                             ticket.status === 'resolved' ? '#4caf50' :
                                             ticket.status === 'in_progress' ? '#ff9800' : '#1976d2'
                            }
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {getTicketProgressLabel(ticket.status)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {recentTickets.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button variant="text" onClick={() => navigate('/tickets')}>
                View All Tickets →
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Quick Actions Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2, fontWeight: 'bold' }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Paper
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              }}
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

      {/* Empty State */}
      {recentTickets.length === 0 && stats.total_tickets === 0 && (
        <Paper sx={{ p: 6, mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom color="textSecondary">
            You don't have any tickets yet
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Create your first support ticket to get started
          </Typography>
          <Button variant="contained" startIcon={<AddCircle />} onClick={() => navigate('/tickets/new')} size="large">
            Create Your First Ticket
          </Button>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 3 }}>
            📧 Or simply send an email to the helpdesk to create a ticket automatically!
          </Typography>
        </Paper>
      )}

      {/* Email Tip */}
      {recentTickets.length > 0 && (
        <Paper sx={{ p: 2, mt: 4, bgcolor: '#e3f2fd', borderRadius: 2 }}>
          <Typography variant="body2" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>💡</span> 
            <strong>Pro Tip:</strong> Reply to any email notification from us to add comments to your tickets!
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ClientDashboard;