import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  Visibility,
  Assignment,
  Chat,
  CheckCircle,
  Error,
  HourglassEmpty,
  Pending,
  PersonAdd,
  Group,
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
  
  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedEngineers, setSelectedEngineers] = useState([]);
  const [assignNote, setAssignNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, statusFilter, priorityFilter, assignFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all tickets
      const ticketsResponse = await ticketAPI.getAllTickets();
      setTickets(ticketsResponse.data);
      
      // Fetch engineers
      const engineersResponse = await authAPI.getUsers('engineer');
      setEngineers(engineersResponse.data);
    } catch (err) {
      setError('Failed to load data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAssignTicket = (ticket) => {
    setSelectedTicket(ticket);
    setSelectedEngineers(ticket.engineer ? [ticket.engineer.id] : []);
    setAssignNote('');
    setAssignDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedTicket || selectedEngineers.length === 0) return;
    
    setAssigning(true);
    try {
      // Assign each engineer to the ticket
      for (const engineerId of selectedEngineers) {
        await ticketAPI.assignTicket(selectedTicket.id, engineerId, assignNote);
      }
      
      setAssignDialogOpen(false);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Assignment error:', err);
      setError('Failed to assign engineers');
    } finally {
      setAssigning(false);
    }
  };

  const handleEngineerToggle = (engineerId) => {
    setSelectedEngineers(prev => {
      if (prev.includes(engineerId)) {
        return prev.filter(id => id !== engineerId);
      } else {
        return [...prev, engineerId];
      }
    });
  };

  const handleSelfAssign = async (ticketId) => {
    try {
      // Get current user (engineer)
      const profileResponse = await authAPI.getProfile();
      const currentUser = profileResponse.data;
      
      if (currentUser.user_type === 'engineer') {
        await ticketAPI.assignTicket(ticketId, currentUser.id, 'Self-assigned by engineer');
        fetchData();
      }
    } catch (err) {
      console.error('Self-assign error:', err);
      setError('Failed to self-assign ticket');
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      open: { label: 'Open', color: 'error', icon: <Error fontSize="small" /> },
      in_progress: { label: 'In Progress', color: 'warning', icon: <HourglassEmpty fontSize="small" /> },
      pending_client: { label: 'Pending', color: 'info', icon: <Pending fontSize="small" /> },
      resolved: { label: 'Resolved', color: 'success', icon: <CheckCircle fontSize="small" /> },
      closed: { label: 'Closed', color: 'default', icon: <CheckCircle fontSize="small" /> },
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  const getPriorityChip = (priority) => {
    const priorityConfig = {
      low: { label: 'Low', color: 'success' },
      medium: { label: 'Medium', color: 'info' },
      high: { label: 'High', color: 'warning' },
      critical: { label: 'Critical', color: 'error' },
    };

    const config = priorityConfig[priority] || { label: priority, color: 'default' };
    
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
      />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      ticket.ticket_number.toLowerCase().includes(searchLower) ||
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.client?.username?.toLowerCase().includes(searchLower) ||
      (ticket.engineer?.username?.toLowerCase().includes(searchLower) || '')
    );
  }).filter(ticket => {
    if (assignFilter === 'assigned') return ticket.engineer;
    if (assignFilter === 'unassigned') return !ticket.engineer;
    return true;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            All Tickets
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage all system tickets
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchData}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="pending_client">Pending</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
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
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Assignment</InputLabel>
              <Select
                value={assignFilter}
                label="Assignment"
                onChange={(e) => setAssignFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="assigned">Assigned</MenuItem>
                <MenuItem value="unassigned">Unassigned</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2} sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setAssignFilter('all');
                setSearchTerm('');
              }}
              fullWidth
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tickets Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="medium">
            <TableHead>
              <TableRow>
                <TableCell width="120px">Ticket #</TableCell>
                <TableCell>Title</TableCell>
                <TableCell width="100px">Priority</TableCell>
                <TableCell width="120px">Status</TableCell>
                <TableCell width="120px">Client</TableCell>
                <TableCell width="150px">Engineer(s)</TableCell>
                <TableCell width="120px">Created</TableCell>
                <TableCell width="150px" align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No tickets found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((ticket) => (
                  <TableRow 
                    key={ticket.id}
                    hover
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {ticket.ticket_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {ticket.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: 300, display: 'block' }}>
                          {ticket.description.substring(0, 80)}...
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {getPriorityChip(ticket.priority)}
                    </TableCell>
                    <TableCell>
                      {getStatusChip(ticket.status)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {ticket.client?.username}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {ticket.engineer ? (
                        <Chip
                          label={ticket.engineer.username}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="caption" color="textSecondary">
                          Not assigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(ticket.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Assign Engineer(s)">
                          <IconButton
                            size="small"
                            onClick={() => handleAssignTicket(ticket)}
                          >
                            <Group fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {!ticket.engineer && (
                          <Tooltip title="Self-Assign">
                            <IconButton
                              size="small"
                              onClick={() => handleSelfAssign(ticket.id)}
                            >
                              <PersonAdd fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredTickets.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Engineers to Ticket #{selectedTicket?.ticket_number}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Select one or more engineers to assign to this ticket:
          </Typography>
          
          <Box sx={{ mt: 2, mb: 2 }}>
            {engineers.map((engineer) => (
              <FormControlLabel
                key={engineer.id}
                control={
                  <Checkbox
                    checked={selectedEngineers.includes(engineer.id)}
                    onChange={() => handleEngineerToggle(engineer.id)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{engineer.username}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      ({engineer.first_name} {engineer.last_name})
                    </Typography>
                  </Box>
                }
              />
            ))}
          </Box>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Assignment Note"
            value={assignNote}
            onChange={(e) => setAssignNote(e.target.value)}
            placeholder="Add instructions or notes for the engineer(s)..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAssignSubmit}
            disabled={selectedEngineers.length === 0 || assigning}
            startIcon={assigning && <CircularProgress size={20} />}
          >
            {assigning ? 'Assigning...' : 'Assign Selected Engineers'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllTickets;