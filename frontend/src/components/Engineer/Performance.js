import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Paper,
  CircularProgress, Alert, Divider
} from '@mui/material';
import {
  CheckCircleOutline,
  HourglassEmpty,
  Speed,
  AssignmentTurnedIn,
} from '@mui/icons-material';
import { ticketAPI } from '../../api/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Performance = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyPerformance();
  }, []);

  const fetchMyPerformance = async () => {
    try {
      setLoading(true);
      // Fixed: matches the key 'getEngineerPerformance' in your api.js
      const response = await ticketAPI.getEngineerPerformance(); 
      setMetrics(response.data);
    } catch (err) {
      setError('Could not load performance metrics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

  // Data from your Backend: resolved_tickets, avg_resolution_time, success_rate, total_assigned
  const getStatusData = () => ({
    labels: ['Resolved', 'Remaining'],
    datasets: [{
      data: [metrics?.resolved_tickets || 0, (metrics?.total_assigned - metrics?.resolved_tickets) || 0],
      backgroundColor: ['#4caf50', '#eeeeee'],
    }],
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
        My Performance
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Personal productivity based on system calculations.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent>
              <AssignmentTurnedIn color="primary" sx={{ mb: 1 }} />
              <Typography variant="h4">{metrics?.total_assigned || 0}</Typography>
              <Typography variant="body2" color="textSecondary">Total Assigned</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent>
              <Speed color="success" sx={{ mb: 1 }} />
              <Typography variant="h4">{metrics?.success_rate || '0%'}</Typography>
              <Typography variant="body2" color="textSecondary">Success Rate</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent>
              <HourglassEmpty color="warning" sx={{ mb: 1 }} />
              <Typography variant="h4">{metrics?.avg_resolution_time || '0h'}</Typography>
              <Typography variant="body2" color="textSecondary">Avg. Solve Time</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <CardContent>
              <CheckCircleOutline color="success" sx={{ mb: 1 }} />
              <Typography variant="h4">{metrics?.resolved_tickets || 0}</Typography>
              <Typography variant="body2" color="textSecondary">Total Resolved</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Resolution Progress</Typography>
            <Box sx={{ height: 250, display: 'flex', justifyContent: 'center' }}>
               <Pie data={getStatusData()} options={{ maintainAspectRatio: false }} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Efficiency Breakdown</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" paragraph>
              • Your average resolution time is currently <strong>{metrics?.avg_resolution_time}</strong>.
            </Typography>
            <Typography variant="body2" paragraph>
              • You have completed <strong>{metrics?.resolved_tickets}</strong> out of <strong>{metrics?.total_assigned}</strong> tickets.
            </Typography>
            <Typography variant="body2">
              • Maintain a success rate above 80% to meet your performance KPIs.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Performance;