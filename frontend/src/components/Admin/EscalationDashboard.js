import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Button, IconButton, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField
} from '@mui/material';
import {
  Warning, Error, Refresh, Visibility, Assignment
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../api/api';

const EscalationDashboard = () => {
  const [escalatedTickets, setEscalatedTickets] = useState([]);
  const [pendingEscalation, setPendingEscalation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignReason, setReassignReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchEscalationStatus();
    const interval = setInterval(fetchEscalationStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchEscalationStatus = async () => {
    try {
      const response = await ticketAPI.getEscalationStatus();
      setEscalatedTickets(response.data.escalated_tickets || []);
      setPendingEscalation(response.data.pending_escalation || []);
    } catch (err) {
      setError('Failed to load escalation status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = (ticket) => {
    setSelectedTicket(ticket);
    setReassignDialogOpen(true);
  };

  const handleReassignSubmit = async () => {
    // This would call an API to reassign the ticket
    // For now, just close and refresh
    setReassignDialogOpen(false);
    await fetchEscalationStatus();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
          Escalation Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Monitor and manage escalated tickets
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#f44336', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2">Escalated Tickets</Typography>
                  <Typography variant="h3">{escalatedTickets.length}</Typography>
                </Box>
                <Error sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#ff9800', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2">Pending Escalation</Typography>
                  <Typography variant="h3">{pendingEscalation.length}</Typography>
                </Box>
                <Warning sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Escalated Tickets Table */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Escalated Tickets
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#fafafa' }}>
            <TableRow>
              <TableCell>Ticket #</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Escalation Reason</TableCell>
              <TableCell>Escalated At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {escalatedTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No escalated tickets</Typography>
                </TableCell>
              </TableRow>
            ) : (
              escalatedTickets.map((ticket) => (
                <TableRow key={ticket.id} hover>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {ticket.ticket_number}
                  </TableCell>
                  <TableCell>{ticket.title}</TableCell>
                  <TableCell>
                    <Chip 
                      label={ticket.priority} 
                      color={getPriorityColor(ticket.priority)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{ticket.escalation_reason || 'Not specified'}</TableCell>
                  <TableCell>{new Date(ticket.escalated_at).toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleReassign(ticket)}
                      >
                        <Assignment fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pending Escalation Table */}
      <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2 }}>
        Tickets Pending Escalation (5 min inactivity)
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: '#fafafa' }}>
            <TableRow>
              <TableCell>Ticket #</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Last Activity</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingEscalation.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No tickets pending escalation</Typography>
                </TableCell>
              </TableRow>
            ) : (
              pendingEscalation.map((ticket) => (
                <TableRow key={ticket.id} hover sx={{ bgcolor: '#fff3e0' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {ticket.ticket_number}
                  </TableCell>
                  <TableCell>{ticket.title}</TableCell>
                  <TableCell>
                    <Chip 
                      label={ticket.priority} 
                      color={getPriorityColor(ticket.priority)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {ticket.last_activity_at ? new Date(ticket.last_activity_at).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      size="small" 
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onClose={() => setReassignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reassign Escalated Ticket</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ticket: <strong>{selectedTicket?.ticket_number}</strong> - {selectedTicket?.title}
          </Typography>
          <TextField
            fullWidth
            label="Reassignment Reason"
            multiline
            rows={3}
            value={reassignReason}
            onChange={(e) => setReassignReason(e.target.value)}
            placeholder="Why is this ticket being reassigned?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleReassignSubmit}>Confirm Reassign</Button>
        </DialogActions>
      </Dialog>

      {/* Refresh Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchEscalationStatus}
        >
          Refresh
        </Button>
      </Box>
    </Box>
  );
};

export default EscalationDashboard;