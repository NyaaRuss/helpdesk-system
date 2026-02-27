import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  CheckCircleOutline,
  HourglassEmpty,
  Speed,
  AssignmentTurnedIn,
} from '@mui/icons-material';
import { ticketAPI } from '../../api/api';
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
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Performance = () => {
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyPerformance();
  }, []);

  const fetchMyPerformance = async () => {
    try {
      setLoading(true);
      // Fetches only tickets assigned to the logged-in user
      const response = await ticketAPI.getAssignedTickets(); 
      setMyTickets(response.data);
    } catch (err) {
      setError('Could not load performance metrics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Logic to calculate stats based on 'myTickets'
  const stats = {
    total: myTickets.length,
    resolved: myTickets.filter(t => t.status === 'resolved').length,
    inProgress: myTickets.filter(t => t.status === 'in_progress').length,
    open: myTickets.filter(t => t.status === 'open').length,
  };

  const resolutionRate = stats.total > 0 
    ? Math.round((stats.resolved / stats.total) * 100) 
    : 0;

  const getStatusData = () => ({
    labels: ['Resolved', 'In Progress', 'Open'],
    datasets: [{
      data: [stats.resolved, stats.inProgress, stats.open],
      backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
    }],
  });

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>My Performance</Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Personal productivity and ticket resolution overview.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Metric Cards */}
        {[
          { label: 'Assigned Tasks', value: stats.total, icon: <AssignmentTurnedIn />, color: 'primary.main' },
          { label: 'Resolution Rate', value: `${resolutionRate}%`, icon: <Speed />, color: 'success.main' },
          { label: 'Active Fixes', value: stats.inProgress, icon: <HourglassEmpty />, color: 'warning.main' },
          { label: 'Completed', value: stats.resolved, icon: <CheckCircleOutline />, color: 'success.dark' },
        ].map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ color: item.color, mb: 1 }}>{item.icon}</Box>
                <Typography variant="h4">{item.value}</Typography>
                <Typography variant="body2" color="textSecondary">{item.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Workload Distribution</Typography>
            <Box sx={{ height: 300 }}>
              <Pie data={getStatusData()} options={{ maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Efficiency Tips</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" paragraph>
              • <strong>Prioritize Criticals:</strong> You currently have {myTickets.filter(t => t.priority === 'critical').length} critical tickets.
            </Typography>
            <Typography variant="body2" paragraph>
              • <strong>Stale Tickets:</strong> Ensure "In Progress" tickets are updated daily to maintain a high resolution rate.
            </Typography>
            <Typography variant="body2">
              • <strong>Resolution Goal:</strong> Aim to keep your resolution rate above 80% for optimal system health.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Performance;