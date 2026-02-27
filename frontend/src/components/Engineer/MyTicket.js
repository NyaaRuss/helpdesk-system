import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton, TextField,
  InputAdornment, MenuItem, Select, FormControl, InputLabel, Button,
  Alert, CircularProgress, Grid
} from '@mui/material';
import { Search, Refresh, Visibility, DoneAll, CheckCircle } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';
import { format } from 'date-fns';

const MyTicket = () => {
  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const navigate = useNavigate();
  const location = useLocation();
  const queryFilter = new URLSearchParams(location.search).get('filter') || 'all';

  useEffect(() => {
    fetchData();
  }, [location.search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = await authAPI.getProfile();
      setCurrentUser(profileRes.data);
      const ticketsRes = await ticketAPI.getAllTickets();
      setTickets(ticketsRes.data || []);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTickets = () => {
    const viewed = JSON.parse(localStorage.getItem('engineer_viewed_tasks') || '[]');
    
    // 1. Category Filter (from URL)
    let filtered = tickets;
    switch (queryFilter) {
      case 'mine': filtered = tickets.filter(t => t.assigned_engineers?.some(e => e.engineer.id === currentUser?.id)); break;
      case 'active': filtered = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed'); break;
      case 'pending': filtered = tickets.filter(t => t.status === 'open' && (!t.assigned_engineers || t.assigned_engineers.length === 0)); break;
      case 'resolved': filtered = tickets.filter(t => t.status === 'resolved' || t.status === 'closed'); break;
      case 'new': filtered = tickets.filter(t => t.assigned_engineers?.some(e => e.engineer.id === currentUser?.id) && !viewed.includes(t.id)); break;
      default: break;
    }

    // 2. Search and Dropdown Filters
    return filtered.filter(ticket => {
      const matchesSearch = !searchTerm || ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) || ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

  const displayTickets = getFilteredTickets();

  return (
    // NO DashboardLayout here so it fills the whole screen like the EngineerDashboard
    <Box p={3} sx={{ width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', textTransform: 'capitalize', color: '#1a237e' }}>
            {queryFilter} Tickets
          </Typography>
          <Typography variant="body2" color="textSecondary">Managing your categorized ticket view</Typography>
        </Box>
        <Button variant="contained" startIcon={<Refresh />} onClick={fetchData}>Refresh</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth size="small" placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#fafafa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Ticket #</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((t) => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>{t.ticket_number}</TableCell>
                <TableCell>{t.title}</TableCell>
                <TableCell><Chip label={t.priority} size="small" color={t.priority === 'high' ? 'error' : 'primary'} /></TableCell>
                <TableCell><Chip label={t.status} size="small" variant="outlined" color={t.status === 'open' ? 'error' : 'success'} /></TableCell>
                <TableCell>{t.created_at ? format(new Date(t.created_at), 'MMM dd, HH:mm') : 'N/A'}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => navigate(`/tickets/${t.id}`)}><Visibility fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination component="div" count={displayTickets.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, n) => setPage(n)} onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))} />
      </TableContainer>
    </Box>
  );
};

export default MyTicket;