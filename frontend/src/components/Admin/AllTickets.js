import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton, TextField,
  MenuItem, Select, Button, Alert, CircularProgress, Tooltip, Grid, 
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, 
  Checkbox, Badge,
} from '@mui/material';
import {
  Search, Refresh, Group, Chat, DoneAll, CheckCircle, PersonAdd
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';
import { format } from 'date-fns';

const AllTickets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // PARSE URL PARAMS: Extracts ?status=resolved from the URL
  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') || 'all';

  const [tickets, setTickets] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedEngineerIds, setSelectedEngineerIds] = useState([]);
  const [assignNote, setAssignNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
    fetchProfile();
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, []);

  // Update filter if URL changes while component is mounted
  useEffect(() => {
    const status = new URLSearchParams(location.search).get('status');
    if (status) setStatusFilter(status);
  }, [location.search]);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setCurrentUser(response.data);
    } catch (err) { console.error("Profile error", err); }
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [ticketsRes, engineersRes] = await Promise.all([
        ticketAPI.getAllTickets(),
        authAPI.getUsers('engineer')
      ]);

      const lastViewed = JSON.parse(localStorage.getItem('admin_last_viewed') || '{}');
      const updatedTickets = ticketsRes.data.map(ticket => {
        const ticketLastActivity = new Date(ticket.updated_at).getTime();
        const adminLastSeen = new Date(lastViewed[ticket.id] || 0).getTime();
        return { ...ticket, has_unread_messages: ticketLastActivity > adminLastSeen };
      });

      setTickets(updatedTickets);
      setEngineers(engineersRes.data);
    } catch (err) { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleMarkAsDone = async (ticketId) => {
    try {
      await ticketAPI.updateTicket(ticketId, { status: 'resolved' });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t));
    } catch (err) { setError('Update failed'); }
  };

  const handlePriorityChange = async (ticketId, newPriority) => {
    try {
      await ticketAPI.updateTicket(ticketId, { priority: newPriority });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority: newPriority } : t));
    } catch (err) { setError('Priority update failed'); }
  };

  const handleAssignTicket = (ticket) => {
    setSelectedTicket(ticket);
    setSelectedEngineerIds(ticket.assigned_engineers?.map(item => item.engineer.id) || []);
    setAssignDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    setAssigning(true);
    try {
      await ticketAPI.assignTicket(selectedTicket.id, selectedEngineerIds, assignNote);
      setAssignDialogOpen(false);
      fetchData();
    } catch (err) { setError('Assignment failed'); }
    finally { setAssigning(false); }
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
    const matchesSearch = !searchTerm || 
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'resolved' ? (ticket.status === 'resolved' || ticket.status === 'closed') : ticket.status === statusFilter);
    
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e' }}>All Tickets</Typography>
        <Button variant="contained" startIcon={<Refresh />} onClick={() => fetchData()}>Refresh</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField 
                fullWidth 
                placeholder="Search..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'gray' }} /> }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Select fullWidth value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} size="small">
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </Select>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#fafafa' }}>
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
              <TableRow key={ticket.id} hover>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{ticket.ticket_number}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell>
                  {currentUser?.user_type === 'admin' ? (
                    <Select value={ticket.priority} onChange={(e) => handlePriorityChange(ticket.id, e.target.value)} size="small" variant="standard" disableUnderline>
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                    </Select>
                  ) : (
                    <Chip label={ticket.priority} size="small" />
                  )}
                </TableCell>
                <TableCell>{getStatusChip(ticket.status)}</TableCell>
                <TableCell>{ticket.client?.username || 'N/A'}</TableCell>
                <TableCell>
                  {ticket.assigned_engineers?.map(item => (
                    <Chip key={item.id} label={item.engineer.username} size="small" sx={{ m: 0.3 }} />
                  ))}
                </TableCell>
                <TableCell>{format(new Date(ticket.created_at), 'MMM dd, HH:mm')}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <IconButton onClick={() => navigate(`/tickets/${ticket.id}`)}>
                      <Badge color="error" variant="dot" invisible={!ticket.has_unread_messages}><Chat fontSize="small" /></Badge>
                    </IconButton>
                    {ticket.status === 'resolved' || ticket.status === 'closed' ? (
                        <CheckCircle color="success" sx={{ p: 0.5 }} fontSize="small" />
                    ) : (
                        <IconButton color="success" size="small" onClick={() => handleMarkAsDone(ticket.id)}><DoneAll fontSize="small" /></IconButton>
                    )}
                    {currentUser?.user_type === 'admin' && (
                      <IconButton size="small" onClick={() => handleAssignTicket(ticket)}><Group fontSize="small" /></IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={filteredTickets.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, n) => setPage(n)} />
      </TableContainer>

      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Manage Assignment: #{selectedTicket?.ticket_number}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {engineers.map(eng => (
              <FormControlLabel
                key={eng.id}
                control={<Checkbox checked={selectedEngineerIds.includes(eng.id)} onChange={() => {
                  setSelectedEngineerIds(prev => prev.includes(eng.id) ? prev.filter(id => id !== eng.id) : [...prev, eng.id]);
                }} />}
                label={eng.username}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignSubmit} disabled={assigning}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllTickets;