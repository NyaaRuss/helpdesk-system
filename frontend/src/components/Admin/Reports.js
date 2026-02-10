import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  TrendingUp,
  People,
  Assignment,
  Refresh,
  Download,
} from '@mui/icons-material';
import { ticketAPI, authAPI } from '../../api/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports = () => {
  const [stats, setStats] = useState({});
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch all data
      const [ticketsRes, usersRes, statsRes] = await Promise.all([
        ticketAPI.getAllTickets(),
        authAPI.getUsers(''),
        ticketAPI.getDashboardStats(),
      ]);

      setTickets(ticketsRes.data);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setError('Failed to load report data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDistribution = () => {
    const statusCounts = {
      open: 0,
      in_progress: 0,
      pending_client: 0,
      resolved: 0,
      closed: 0,
    };

    tickets.forEach(ticket => {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
    });

    return {
      labels: ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'],
      datasets: [
        {
          label: 'Tickets by Status',
          data: [
            statusCounts.open,
            statusCounts.in_progress,
            statusCounts.pending_client,
            statusCounts.resolved,
            statusCounts.closed,
          ],
          backgroundColor: [
            '#f44336',
            '#ff9800',
            '#2196f3',
            '#4caf50',
            '#9e9e9e',
          ],
        },
      ],
    };
  };

  const getPriorityDistribution = () => {
    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    tickets.forEach(ticket => {
      priorityCounts[ticket.priority] = (priorityCounts[ticket.priority] || 0) + 1;
    });

    return {
      labels: ['Low', 'Medium', 'High', 'Critical'],
      datasets: [
        {
          label: 'Tickets by Priority',
          data: [
            priorityCounts.low,
            priorityCounts.medium,
            priorityCounts.high,
            priorityCounts.critical,
          ],
          backgroundColor: [
            '#4caf50',
            '#2196f3',
            '#ff9800',
            '#f44336',
          ],
        },
      ],
    };
  };

  const getUserDistribution = () => {
    const userTypes = {
      admin: users.filter(u => u.user_type === 'admin').length,
      engineer: users.filter(u => u.user_type === 'engineer').length,
      client: users.filter(u => u.user_type === 'client').length,
    };

    return {
      labels: ['Admins', 'Engineers', 'Clients'],
      datasets: [
        {
          label: 'Users by Type',
          data: [userTypes.admin, userTypes.engineer, userTypes.client],
          backgroundColor: [
            '#f44336',
            '#ff9800',
            '#2196f3',
          ],
        },
      ],
    };
  };

  const getResolutionRate = () => {
    const total = tickets.length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    return total > 0 ? Math.round((resolved / total) * 100) : 0;
  };

  const getAverageResolutionTime = () => {
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    if (resolvedTickets.length === 0) return 'N/A';

    const totalDays = resolvedTickets.reduce((acc, ticket) => {
      if (ticket.created_at && ticket.resolved_at) {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.resolved_at);
        const diffDays = (resolved - created) / (1000 * 60 * 60 * 24);
        return acc + diffDays;
      }
      return acc;
    }, 0);

    return (totalDays / resolvedTickets.length).toFixed(1) + ' days';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            System Reports
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Analytics and performance metrics
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
              size="small"
            >
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="quarter">Last Quarter</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchReportData}
          >
            Refresh
          </Button>
          
          <Button
            variant="contained"
            startIcon={<Download />}
          >
            Export
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'primary.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Assignment sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Tickets
                  </Typography>
                  <Typography variant="h4">
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'success.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp sx={{ color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Resolution Rate
                  </Typography>
                  <Typography variant="h4">
                    {getResolutionRate()}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'warning.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <People sx={{ color: 'warning.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Users
                  </Typography>
                  <Typography variant="h4">
                    {users.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'info.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChart sx={{ color: 'info.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Avg. Resolution Time
                  </Typography>
                  <Typography variant="h4">
                    {getAverageResolutionTime()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ticket Status Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <Pie data={getStatusDistribution()} options={{
                maintainAspectRatio: false,
                responsive: true,
              }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Priority Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar data={getPriorityDistribution()} options={{
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <Pie data={getUserDistribution()} options={{
                maintainAspectRatio: false,
                responsive: true,
              }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      Unassigned Tickets
                    </Typography>
                    <Typography variant="h5" color="error">
                      {stats.unassigned_tickets || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      High Priority
                    </Typography>
                    <Typography variant="h5" color="warning.main">
                      {stats.high_priority_tickets || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      Active Engineers
                    </Typography>
                    <Typography variant="h5" color="info.main">
                      {users.filter(u => u.user_type === 'engineer').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      Total Clients
                    </Typography>
                    <Typography variant="h5" color="primary.main">
                      {users.filter(u => u.user_type === 'client').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;