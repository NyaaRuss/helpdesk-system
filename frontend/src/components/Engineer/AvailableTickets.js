import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton, TextField,
  InputAdornment, MenuItem, Select, FormControl, InputLabel, Button,
  Alert, CircularProgress, Tooltip, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControlLabel, Checkbox,
} from '@mui/material';
import {
  Search, Refresh, Visibility, PersonAdd, Group,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';
import { format } from 'date-fns';

// IMPORT YOUR LAYOUT COMPONENT
// Note: Ensure this path correctly points to where DashboardLayout.js is located
import DashboardLayout from '../../components/Layout/DashboardLayout'; 

const AvailableTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
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
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setCurrentUser(response.data);
    } catch (err) {
      console.error("Profile fetch error", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, engineersRes] = await Promise.all([
        ticketAPI.getAllTickets(),
        authAPI.getUsers('engineer')
      ]);
      setTickets(ticketsRes.data);
      setEngineers(engineersRes.data);
    } catch (err) {
      setError('Failed to load data from server');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTicket = (ticket) => {
    setSelectedTicket(ticket);
    const currentIds = ticket.assigned_engineers?.map(item => item.engineer.id) || [];
    setSelectedEngineerIds(currentIds);
    setAssignNote('');
    setAssignDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedTicket) return;
    setAssigning(true);
    try {
      await ticketAPI.assignTicket(selectedTicket.id, selectedEngineerIds, assignNote);
      setAssignDialogOpen(false);
      fetchData();
    } catch (err) {
      setError('Failed to update engineers');
    } finally {
      setAssigning(false);
    }
  };

  const handleEngineerToggle = (engineerId) => {
    setSelectedEngineerIds(prev =>
      prev.includes(engineerId)
        ? prev.filter(id => id !== engineerId)
        : [...prev, engineerId]
    );
  };

  const handleSelfAssign = async (ticket) => {
    const currentIds = ticket.assigned_engineers?.map(item => item.engineer.id) || [];
    if (!currentIds.includes(currentUser?.id)) {
      try {
        await ticketAPI.assignTicket(ticket.id, [...currentIds, currentUser.id], 'Self-assigned');
        fetchData();
      } catch (err) {
        setError('Failed to self-assign');
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
    const matchesSearch = !searchTerm ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.client?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) return (
    <DashboardLayout>
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <Box sx={{ p: 3 }}>
        {/* Header matches Dashboard layout */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>Available Tickets</Typography>
            <Typography variant="body1" color="textSecondary">View and claim any ticket in the system</Typography>
          </Box>
          <Button variant="contained" startIcon={<Refresh />} onClick={fetchData} sx={{ borderRadius: 2 }}>
            Refresh
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Filter Section */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  label="Priority"
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Table Section matching Admin view */}
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#fafafa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Ticket #</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Client</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Engineer(s)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((ticket) => (
                <TableRow key={ticket.id} hover>
                  <TableCell 
                    sx={{ fontWeight: 'bold', color: 'primary.main', cursor: 'pointer' }}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    {ticket.ticket_number}
                  </TableCell>
                  <TableCell>{ticket.title}</TableCell>
                  <TableCell>
                    <Chip 
                      label={ticket.priority} 
                      size="small" 
                      color={ticket.priority === 'high' ? 'error' : 'primary'} 
                    />
                  </TableCell>
                  <TableCell>{getStatusChip(ticket.status)}</TableCell>
                  <TableCell>{ticket.client?.username || 'N/A'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {ticket.assigned_engineers?.map(item => (
                        <Chip key={item.id} label={item.engineer.username} size="small" variant="outlined" />
                      )) || <Typography variant="caption">Unassigned</Typography>}
                    </Box>
                  </TableCell>
                  <TableCell>{format(new Date(ticket.created_at), 'MMM dd, HH:mm')}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                      
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
          />
        </TableContainer>

        {/* Assignment Dialog */}
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Manage Ticket Assignment: #{selectedTicket?.ticket_number}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={1}>
              {engineers.map(eng => (
                <Grid item xs={12} sm={6} key={eng.id}>
                  <FormControlLabel
                    control={<Checkbox checked={selectedEngineerIds.includes(eng.id)} onChange={() => handleEngineerToggle(eng.id)} />}
                    label={eng.username}
                  />
                </Grid>
              ))}
            </Grid>
            <TextField
              fullWidth
              label="Internal Note"
              multiline
              rows={2}
              sx={{ mt: 2 }}
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignSubmit} variant="contained" disabled={assigning}>
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default AvailableTickets;