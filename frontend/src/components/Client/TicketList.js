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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../api/api';
import { format } from 'date-fns';

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, [page, rowsPerPage, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let url = `/tickets/?limit=${rowsPerPage}&offset=${page * rowsPerPage}`;
      
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (priorityFilter !== 'all') {
        url += `&priority=${priorityFilter}`;
      }
      
      const response = await ticketAPI.getAllTickets();
      setTickets(response.data);
      setTotalCount(response.data.length);
    } catch (err) {
      setError('Failed to load tickets. Please try again.');
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilter = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handlePriorityFilter = (event) => {
    setPriorityFilter(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      open: { label: 'Open', color: 'error', icon: <Error fontSize="small" /> },
      in_progress: { label: 'In Progress', color: 'warning', icon: <HourglassEmpty fontSize="small" /> },
      pending_client: { label: 'Pending', color: 'info', icon: <Pending fontSize="small" /> },
      resolved: { label: 'Resolved', color: 'success', icon: <CheckCircle fontSize="small" /> },
      closed: { label: 'Closed', color: 'default', icon: <CheckCircle fontSize="small" /> },
      reopened: { label: 'Reopened', color: 'error', icon: <Error fontSize="small" /> },
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

  const getCategoryChip = (category) => {
    const categoryConfig = {
      technical: { label: 'Technical', color: 'primary' },
      billing: { label: 'Billing', color: 'secondary' },
      account: { label: 'Account', color: 'info' },
      feature_request: { label: 'Feature Request', color: 'warning' },
      other: { label: 'Other', color: 'default' },
    };

    const config = categoryConfig[category] || { label: category, color: 'default' };
    
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
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
      ticket.description.toLowerCase().includes(searchLower) ||
      (ticket.engineer?.username?.toLowerCase().includes(searchLower) || '')
    );
  });

  if (loading && tickets.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            My Tickets
          </Typography>
          <Typography variant="body1" color="textSecondary">
            View and manage all your support tickets
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Assignment />}
          onClick={() => navigate('/tickets/new')}
        >
          New Ticket
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
                onChange={handleStatusFilter}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="pending_client">Pending</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={handlePriorityFilter}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setSearchTerm('');
              }}
            >
              Clear Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchTickets}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {tickets.filter(t => t.status === 'open').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Open
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              {tickets.filter(t => t.status === 'in_progress').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              In Progress
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              {tickets.filter(t => t.status === 'pending_client').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Pending
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Resolved
            </Typography>
          </Paper>
        </Grid>
      </Grid>

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
                <TableCell width="120px">Category</TableCell>
                <TableCell width="150px">Engineer</TableCell>
                <TableCell width="150px">Created</TableCell>
                <TableCell width="150px">Updated</TableCell>
                <TableCell width="100px" align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No tickets found. Create your first ticket!
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((ticket) => (
                  <TableRow 
                    key={ticket.id}
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
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
                      {getCategoryChip(ticket.category)}
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
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(ticket.updated_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tickets/${ticket.id}`);
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Chat">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tickets/${ticket.id}?tab=chat`);
                            }}
                          >
                            <Chat fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Empty State */}
      {tickets.length === 0 && !loading && (
        <Paper sx={{ p: 6, mt: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom color="textSecondary">
            No tickets yet
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Create your first support ticket to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<Assignment />}
            onClick={() => navigate('/tickets/new')}
            size="large"
          >
            Create First Ticket
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default TicketList;