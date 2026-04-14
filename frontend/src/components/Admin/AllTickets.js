import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton, TextField,
  MenuItem, Select, Button, Alert, CircularProgress, Tooltip, Grid, 
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, 
  Checkbox, Badge, Divider, FormControl, InputLabel
} from '@mui/material';
import {
  Search, Refresh, Group, Chat, DoneAll, CheckCircle, PersonAdd,
  PersonRemove, Close, Add
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';
import { format } from 'date-fns';

const AllTickets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const initialStatus = queryParams.get('status') || 'all';

  const [tickets, setTickets] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  // New state for remove engineer dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removeEngineerId, setRemoveEngineerId] = useState(null);
  const [removeEngineerName, setRemoveEngineerName] = useState('');

  // New state for add single engineer dialog
  const [addEngineerDialogOpen, setAddEngineerDialogOpen] = useState(false);
  const [singleEngineerId, setSingleEngineerId] = useState('');
  const [addingEngineer, setAddingEngineer] = useState(false);

  useEffect(() => {
    fetchData();
    fetchProfile();
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, []);

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
    } catch (err) { 
      setError('Failed to load data'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleMarkAsDone = async (ticketId) => {
    try {
      await ticketAPI.updateTicket(ticketId, { status: 'resolved' });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t));
      setSuccess('Ticket marked as resolved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { 
      setError('Update failed'); 
    }
  };

  const handlePriorityChange = async (ticketId, newPriority) => {
    try {
      await ticketAPI.updateTicket(ticketId, { priority: newPriority });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority: newPriority } : t));
      setSuccess('Priority updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { 
      setError('Priority update failed'); 
    }
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
      setAssignNote('');
      fetchData();
      setSuccess('Engineers assigned successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { 
      setError('Assignment failed'); 
    } finally { 
      setAssigning(false); 
    }
  };

  // Handle removing an engineer from a ticket
  const handleRemoveEngineer = (ticket, engineerId, engineerName) => {
    setSelectedTicket(ticket);
    setRemoveEngineerId(engineerId);
    setRemoveEngineerName(engineerName);
    setRemoveDialogOpen(true);
  };

  const confirmRemoveEngineer = async () => {
    setAssigning(true);
    try {
      const currentEngineerIds = selectedTicket.assigned_engineers?.map(item => item.engineer.id) || [];
      const updatedEngineerIds = currentEngineerIds.filter(id => id !== removeEngineerId);
      
      await ticketAPI.assignTicket(selectedTicket.id, updatedEngineerIds, `Removed engineer: ${removeEngineerName}`);
      setRemoveDialogOpen(false);
      fetchData();
      setSuccess(`Removed ${removeEngineerName} from ticket`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { 
      setError('Failed to remove engineer'); 
    } finally { 
      setAssigning(false); 
    }
  };

  // Handle adding a single engineer to a ticket
  const handleAddEngineer = (ticket) => {
    setSelectedTicket(ticket);
    setSingleEngineerId('');
    setAddEngineerDialogOpen(true);
  };

  const confirmAddEngineer = async () => {
    if (!singleEngineerId) {
      setError('Please select an engineer');
      return;
    }
    
    setAddingEngineer(true);
    try {
      const currentEngineerIds = selectedTicket.assigned_engineers?.map(item => item.engineer.id) || [];
      if (currentEngineerIds.includes(singleEngineerId)) {
        setError('Engineer is already assigned to this ticket');
        setAddingEngineer(false);
        return;
      }
      
      const updatedEngineerIds = [...currentEngineerIds, singleEngineerId];
      const engineerName = engineers.find(e => e.id === singleEngineerId)?.username;
      
      await ticketAPI.assignTicket(selectedTicket.id, updatedEngineerIds, `Added engineer: ${engineerName}`);
      setAddEngineerDialogOpen(false);
      fetchData();
      setSuccess(`Added ${engineerName} to ticket`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { 
      setError('Failed to add engineer'); 
    } finally { 
      setAddingEngineer(false); 
    }
  };

  const getStatusChip = (status) => {
    const config = {
      open: { label: 'Open', color: 'error' },
      in_progress: { label: 'In Progress', color: 'warning' },
      resolved: { label: 'Resolved', color: 'success' },
      closed: { label: 'Closed', color: 'default' },
      pending_client: { label: 'Pending Client', color: 'info' },
    };
    const s = config[status] || { label: status, color: 'default' };
    return <Chip label={s.label} color={s.color} size="small" variant="outlined" />;
  };

  const getAvailableEngineers = () => {
    const assignedIds = selectedTicket?.assigned_engineers?.map(item => item.engineer.id) || [];
    return engineers.filter(eng => !assignedIds.includes(eng.id));
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchTerm || 
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'resolved' ? (ticket.status === 'resolved' || ticket.status === 'closed') : ticket.status === statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e' }}>All Tickets</Typography>
        <Button variant="contained" startIcon={<Refresh />} onClick={() => fetchData()}>Refresh</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                    {ticket.assigned_engineers?.map(item => (
                      <Chip 
                        key={item.id} 
                        label={item.engineer.username} 
                        size="small" 
                        sx={{ m: 0.3 }}
                        onDelete={currentUser?.user_type === 'admin' ? () => handleRemoveEngineer(ticket, item.engineer.id, item.engineer.username) : undefined}
                        deleteIcon={<PersonRemove />}
                      />
                    ))}
                    {currentUser?.user_type === 'admin' && (
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={() => handleAddEngineer(ticket)}
                        sx={{ ml: 0.5 }}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{format(new Date(ticket.created_at), 'MMM dd, HH:mm')}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Tooltip title="View Details">
                      <IconButton onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        <Badge color="error" variant="dot" invisible={!ticket.has_unread_messages}>
                          <Chat fontSize="small" />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                    {ticket.status === 'resolved' || ticket.status === 'closed' ? (
                        <CheckCircle color="success" sx={{ p: 0.5 }} fontSize="small" />
                    ) : (
                        <Tooltip title="Mark as Resolved">
                          <IconButton color="success" size="small" onClick={() => handleMarkAsDone(ticket.id)}>
                            <DoneAll fontSize="small" />
                          </IconButton>
                        </Tooltip>
                    )}
                    {currentUser?.user_type === 'admin' && (
                      <Tooltip title="Manage Assignments">
                        <IconButton size="small" onClick={() => handleAssignTicket(ticket)}>
                          <Group fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination 
          component="div" 
          count={filteredTickets.length} 
          rowsPerPage={rowsPerPage} 
          page={page} 
          onPageChange={(e, n) => setPage(n)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>

      {/* Bulk Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Manage Assignment: #{selectedTicket?.ticket_number}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
            Current Engineers:
          </Typography>
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selectedTicket?.assigned_engineers?.map(item => (
              <Chip key={item.id} label={item.engineer.username} size="small" />
            ))}
            {(!selectedTicket?.assigned_engineers || selectedTicket.assigned_engineers.length === 0) && (
              <Typography variant="body2" color="textSecondary">No engineers assigned</Typography>
            )}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Select Engineers to Assign:
          </Typography>
          <Box sx={{ mt: 1, maxHeight: 300, overflow: 'auto' }}>
            {engineers.map(eng => (
              <FormControlLabel
                key={eng.id}
                control={
                  <Checkbox 
                    checked={selectedEngineerIds.includes(eng.id)} 
                    onChange={() => {
                      setSelectedEngineerIds(prev => 
                        prev.includes(eng.id) ? prev.filter(id => id !== eng.id) : [...prev, eng.id]
                      );
                    }} 
                  />
                }
                label={`${eng.first_name} ${eng.last_name} (@${eng.username})`}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignSubmit} disabled={assigning}>
            {assigning ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Engineer Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onClose={() => setRemoveDialogOpen(false)}>
        <DialogTitle>Remove Engineer</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{removeEngineerName}</strong> from ticket <strong>#{selectedTicket?.ticket_number}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmRemoveEngineer} color="error" variant="contained" disabled={assigning}>
            {assigning ? <CircularProgress size={24} /> : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Single Engineer Dialog */}
      <Dialog open={addEngineerDialogOpen} onClose={() => setAddEngineerDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Engineer to Ticket #{selectedTicket?.ticket_number}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Current Engineers: {selectedTicket?.assigned_engineers?.map(e => e.engineer.username).join(', ') || 'None'}
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Select Engineer</InputLabel>
            <Select
              value={singleEngineerId}
              onChange={(e) => setSingleEngineerId(e.target.value)}
              label="Select Engineer"
            >
              {getAvailableEngineers().map(eng => (
                <MenuItem key={eng.id} value={eng.id}>
                  {eng.first_name} {eng.last_name} (@{eng.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEngineerDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmAddEngineer} variant="contained" disabled={!singleEngineerId || addingEngineer}>
            {addingEngineer ? <CircularProgress size={24} /> : 'Add Engineer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllTickets;