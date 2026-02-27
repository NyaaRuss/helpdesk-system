import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Alert, CircularProgress, Tooltip
} from '@mui/material';
import { Visibility, Group, Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../api/api';

const UnassignedTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchUnassigned = async () => {
    setLoading(true);
    try {
      const response = await ticketAPI.getAllTickets();
      // Filter logic: Only keep tickets with no engineers assigned
      const unassigned = response.data.filter(
        t => !t.assigned_engineers || t.assigned_engineers.length === 0
      );
      setTickets(unassigned);
    } catch (err) {
      setError('Failed to load unassigned tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnassigned();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">Unassigned Tickets</Typography>
        <IconButton onClick={fetchUnassigned} color="primary"><Refresh /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f8f9fa' }}>
            <TableRow>
              <TableCell>Ticket #</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <TableRow key={ticket.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{ticket.ticket_number}</TableCell>
                  <TableCell>{ticket.title}</TableCell>
                  <TableCell>
                    <Chip label="Unassigned" size="small" variant="outlined" color="error" />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton color="info" onClick={() => navigate(`/admin/tickets/${ticket.id}`)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Assign Now">
                      <IconButton color="primary" onClick={() => navigate('/admin/tickets')}>
                        <Group />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">All caught up! No unassigned tickets.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UnassignedTickets;