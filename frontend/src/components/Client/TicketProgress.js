import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, LinearProgress, Chip, Grid,
  Alert, CircularProgress, Divider, Stepper, Step, StepLabel
} from '@mui/material';
import {
  CheckCircle, Error, HourglassEmpty, Warning
} from '@mui/icons-material';
import { ticketAPI } from '../../api/api';

const TicketProgress = ({ ticketId }) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, [ticketId]);

  const fetchProgress = async () => {
    try {
      const response = await ticketAPI.getTicketProgress(ticketId);
      setProgress(response.data);
    } catch (err) {
      setError('Failed to load progress');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <Error color="error" />;
      case 'in_progress': return <HourglassEmpty color="warning" />;
      case 'resolved': return <CheckCircle color="success" />;
      case 'escalated': return <Warning color="error" />;
      default: return <HourglassEmpty />;
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage < 30) return 'error';
    if (percentage < 70) return 'warning';
    return 'success';
  };

  const stages = [
    'Ticket Created',
    'Under Review',
    'Assigned',
    'In Progress',
    'Pending Client',
    'Resolved'
  ];

  const getActiveStep = () => {
    if (!progress) return 0;
    const statusMap = {
      'open': 1,
      'in_progress': 3,
      'pending_client': 4,
      'resolved': 5,
      'escalated': 3
    };
    return statusMap[progress.status] || 0;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error || !progress) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error || 'Unable to load progress information'}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Ticket Progress
      </Typography>

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="textSecondary">
            Overall Progress
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {progress.progress_percentage}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress.progress_percentage}
          color={getProgressColor(progress.progress_percentage)}
          sx={{ height: 10, borderRadius: 5 }}
        />
      </Box>

      {/* Status and Priority */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Typography variant="body2" color="textSecondary">Status</Typography>
          <Chip
            icon={getStatusIcon(progress.status)}
            label={progress.status?.replace('_', ' ').toUpperCase()}
            color={progress.status === 'resolved' ? 'success' : progress.status === 'escalated' ? 'error' : 'warning'}
            sx={{ mt: 0.5 }}
          />
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2" color="textSecondary">Priority</Typography>
          <Chip
            label={progress.priority?.toUpperCase()}
            color={progress.priority === 'critical' ? 'error' : progress.priority === 'high' ? 'warning' : 'info'}
            sx={{ mt: 0.5 }}
          />
        </Grid>
      </Grid>

      {/* Deadline Information */}
      {progress.deadline && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
          <Typography variant="body2" color="textSecondary">Deadline</Typography>
          <Typography variant="body1">
            {new Date(progress.deadline).toLocaleString()}
          </Typography>
          {progress.days_until_deadline !== undefined && (
            <Typography 
              variant="body2" 
              color={progress.days_until_deadline < 0 ? 'error' : progress.days_until_deadline < 1 ? 'warning' : 'textSecondary'}
            >
              {progress.days_until_deadline < 0 
                ? `Overdue by ${Math.abs(progress.days_until_deadline)} days`
                : `${progress.days_until_deadline} days remaining`}
            </Typography>
          )}
        </Box>
      )}

      {/* Escalation Information */}
      {progress.is_escalated && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">⚠️ Ticket Escalated</Typography>
          <Typography variant="body2">
            Reason: {progress.escalation_reason || 'Not specified'}
          </Typography>
        </Alert>
      )}

      {/* Client Timeline Request */}
      {progress.client_requested_timeline && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
          <Typography variant="body2" color="primary">Client Requested Timeline</Typography>
          <Typography variant="body1">
            {progress.client_requested_timeline}
          </Typography>
        </Box>
      )}

      {/* Stepper for visual progress */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Lifecycle Stage
      </Typography>
      <Stepper activeStep={getActiveStep()} alternativeLabel>
        {stages.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Last Activity */}
      <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="textSecondary">
          Last Activity: {progress.last_activity_at ? new Date(progress.last_activity_at).toLocaleString() : 'Never'}
        </Typography>
        <br />
        <Typography variant="caption" color="textSecondary">
          Created: {new Date(progress.created_at).toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default TicketProgress;