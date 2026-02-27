import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton, TextField,
  InputAdornment, MenuItem, Select, FormControl, InputLabel, Button,
  Alert, CircularProgress, Tooltip, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControlLabel, Checkbox,Badge,
} from '@mui/material';
import {
  Search, FilterList, Refresh, Visibility, CheckCircle, Error,
  HourglassEmpty, Pending, PersonAdd, Group,Chat,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';
import { format } from 'date-fns';

const AllTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignFilter, setAssignFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedEngineerIds, setSelectedEngineerIds] = useState([]);
  const [assignNote, setAssignNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    fetchProfile(); // This is what was causing the error

    // Polling: Refresh data every 20 seconds to catch new messages
    const interval = setInterval(() => {
      fetchData(false); // Pass false to prevent showing the loading spinner every time
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setCurrentUser(response.data);
    } catch (err) {
      console.error("Profile fetch error", err);
    }
  };

  const fetchData = async (showLoading = true) => {
  if (showLoading) setLoading(true);
  try {
    const [ticketsRes, engineersRes] = await Promise.all([
      ticketAPI.getAllTickets(),
      authAPI.getUsers('engineer')
    ]);

    // Get the object where we store when the admin last clicked each ticket
    // Format: { "ticket_id": "ISO_TIMESTAMP" }
    const lastViewed = JSON.parse(localStorage.getItem('admin_last_viewed') || '{}');

    const updatedTickets = ticketsRes.data.map(ticket => {
      const ticketLastActivity = new Date(ticket.updated_at).getTime();
      const adminLastSeen = new Date(lastViewed[ticket.id] || 0).getTime();

      return {
        ...ticket,
        // The dot appears ONLY if the ticket was updated AFTER the admin last viewed it
        has_unread_messages: ticketLastActivity > adminLastSeen
      };
    });

    setTickets(updatedTickets);
    setEngineers(engineersRes.data);
  } catch (err) {
    setError('Failed to load data');
  } finally {
    setLoading(false);
  }
};

  const handlePriorityChange = async (ticketId, newPriority) => {
    try {
      setError(''); 
      // This calls the backend
      await ticketAPI.updateTicket(ticketId, { priority: newPriority });
      
      // OPTIONAL: Update state locally so the UI is snappy
      setTickets(prevTickets => 
        prevTickets.map(t => t.id === ticketId ? { ...t, priority: newPriority } : t)
      );
      
      // Still refresh to be safe
      fetchData(false); 
    } catch (err) {
      // If you still see this, check the Browser Console (F12) to see the exact error
      setError('Failed to update priority: ' + (err.response?.data?.detail || 'Unauthorized'));
      console.error("Update Error:", err.response?.data);
    }
  };
  const handleAssignTicket = (ticket) => {
    setSelectedTicket(ticket);
    // FIX: Extract ONLY the engineer IDs into the state array
    const currentIds = ticket.assigned_engineers?.map(item => item.engineer.id) || [];
    setSelectedEngineerIds(currentIds);
    setAssignNote('');
    setError('');
    setAssignDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedTicket) return;
    setAssigning(true);
    try {
      // FIX: By sending the modified array of IDs, the backend will sync 
      // (add or remove) based on what is present in this list
      await ticketAPI.assignTicket(selectedTicket.id, selectedEngineerIds, assignNote);
      setAssignDialogOpen(false);
      fetchData(); // Refresh list to show updated chips
    } catch (err) {
      setError('Failed to update engineers');
    } finally {
      setAssigning(false);
    }
  };

  const handleEngineerToggle = (engineerId) => {
    setSelectedEngineerIds(prev => 
      prev.includes(engineerId) 
        ? prev.filter(id => id !== engineerId) // REMOVE logic
        : [...prev, engineerId]               // ADD logic
    );
  };

  const handleSelfAssign = async (ticket) => {
    if (currentUser?.user_type === 'engineer') {
      const currentIds = ticket.assigned_engineers?.map(item => item.engineer.id) || [];
      if (!currentIds.includes(currentUser.id)) {
        try {
          await ticketAPI.assignTicket(ticket.id, [...currentIds, currentUser.id], 'Self-assigned');
          fetchData();
        } catch (err) { setError('Failed to self-assign'); }
      }
    }
  };

  const getStatusChip = (status) => {
    const config = {
      open: { label: 'Open', color: 'error' },
      in_progress: { label: 'In Progress', color: 'warning' },
      resolved: { label: 'Resolved', color: 'success' },
    };
    const s = config[status] || { label: status, color: 'default' };
    return <Chip label={s.label} color={s.color} size="small" variant="outlined" />;
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchTerm || ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) || ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">All Tickets</Typography>
        <Button variant="contained" startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ticket #</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Engineer(s)</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{ticket.ticket_number}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell>
                  {currentUser?.user_type === 'admin' ? (
                    <Select
                      value={ticket.priority}
                      onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                      size="small"
                      variant="standard"
                      disableUnderline
                      sx={{ 
                        fontWeight: 'bold',
                        color: 
                          ticket.priority === 'critical' ? 'error.main' : 
                          ticket.priority === 'high' ? 'warning.main' : 'primary.main' 
                      }}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                    </Select>
                  ) : (
                    <Chip 
                      label={ticket.priority} 
                      size="small" 
                      color={
                        ticket.priority === 'critical' ? 'error' : 
                        ticket.priority === 'high' ? 'warning' : 'primary'
                      } 
                    />
                  )}
                </TableCell>
                <TableCell>{getStatusChip(ticket.status)}</TableCell>
                <TableCell>{ticket.client?.username || 'N/A'}</TableCell>
                <TableCell>
                  {/* FIX: Mapping through assigned_engineers objects */}
                  {ticket.assigned_engineers?.length > 0 ? (
                    ticket.assigned_engineers.map(item => (
                      <Chip key={item.id} label={item.engineer.username} size="small" sx={{ m: 0.3 }} />
                    ))
                  ) : <Typography variant="caption" color="gray">Not assigned</Typography>}
                </TableCell>
                <TableCell>{format(new Date(ticket.created_at), 'MMM dd, HH:mm')}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Tooltip title="View Chat">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          // 1. Record that we are viewing this ticket NOW
                          const lastViewed = JSON.parse(localStorage.getItem('admin_last_viewed') || '{}');
                          lastViewed[ticket.id] = new Date().toISOString();
                          localStorage.setItem('admin_last_viewed', JSON.stringify(lastViewed));

                          // 2. Navigate to the ticket
                          navigate(`/tickets/${ticket.id}`);
                        }}
                      >
                        <Badge 
                          color="error" 
                          variant="dot" 
                          invisible={!ticket.has_unread_messages}
                        >
                          <Chat fontSize="small" />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                    {currentUser?.user_type === 'admin' && (
                      <Tooltip title="Manage Engineers"><IconButton size="small" onClick={() => handleAssignTicket(ticket)}><Group fontSize="small" /></IconButton></Tooltip>
                    )}
                    {currentUser?.user_type === 'engineer' && !ticket.assigned_engineers?.some(e => e.engineer.id === currentUser.id) && (
                      <Tooltip title="Self-Assign"><IconButton size="small" onClick={() => handleSelfAssign(ticket)}><PersonAdd fontSize="small" color="primary" /></IconButton></Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={filteredTickets.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, n) => setPage(n)} />
      </TableContainer>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Manage Ticket Assignment: #{selectedTicket?.ticket_number}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {engineers.map(eng => (
              <FormControlLabel
                key={eng.id}
                control={<Checkbox checked={selectedEngineerIds.includes(eng.id)} onChange={() => handleEngineerToggle(eng.id)} />}
                label={`${eng.username} (${eng.first_name} ${eng.last_name})`}
              />
            ))}
          </Box>
          <TextField fullWidth multiline rows={2} label="Internal Note" sx={{ mt: 2 }} value={assignNote} onChange={(e) => setAssignNote(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignSubmit} disabled={assigning}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllTickets;