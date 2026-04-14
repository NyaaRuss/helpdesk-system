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
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Search,
  Refresh,
  Assignment,
  Email,
  Phone,
  BarChart,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authAPI, ticketAPI } from '../../api/api';

const EngineerManagement = () => {
  const navigate = useNavigate();
  const [engineers, setEngineers] = useState([]);
  const [engineerStats, setEngineerStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [availableTickets, setAvailableTickets] = useState([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchEngineers();
  }, []);

  const fetchEngineers = async () => {
    setLoading(true);
    try {
      const engineersResponse = await authAPI.getUsers('engineer');
      setEngineers(engineersResponse.data);

      const stats = {};
      const ticketsResponse = await ticketAPI.getAllTickets();
      const allTickets = ticketsResponse.data;

      engineersResponse.data.forEach(engineer => {
        const engTickets = allTickets.filter(ticket => 
          ticket.assigned_engineers?.some(eng => eng.engineer?.id === engineer.id)
        );
        
        const resolved = engTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
        const active = engTickets.filter(t => t.status === 'in_progress').length;
        const pending = engTickets.filter(t => t.status === 'pending_client').length;
        
        stats[engineer.id] = {
          total: engTickets.length,
          active: active,
          resolved: resolved,
          pending: pending,
        };
      });
      setEngineerStats(stats);
    } catch (err) {
      setError('Failed to load engineers');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTickets = async () => {
    try {
      const response = await ticketAPI.getAllTickets();
      const unassignedOrOpen = response.data.filter(ticket => 
        (!ticket.assigned_engineers || ticket.assigned_engineers.length === 0) && 
        ticket.status !== 'resolved' && 
        ticket.status !== 'closed'
      );
      setAvailableTickets(unassignedOrOpen);
    } catch (err) {
      setError('Failed to load available tickets');
    }
  };

  const handleOpenAssignDialog = async (engineer) => {
    setSelectedEngineer(engineer);
    setSelectedTicketIds([]);
    await fetchAvailableTickets();
    setAssignDialogOpen(true);
  };

  const handleAssignTickets = async () => {
    if (selectedTicketIds.length === 0) {
      setError('Please select at least one ticket to assign');
      return;
    }
    
    setAssigning(true);
    try {
      // Get current tickets assigned to this engineer
      const currentTickets = availableTickets.filter(t => 
        selectedTicketIds.includes(t.id)
      );
      
      // Assign each selected ticket
      for (const ticket of currentTickets) {
        const currentEngineerIds = ticket.assigned_engineers?.map(e => e.engineer.id) || [];
        if (!currentEngineerIds.includes(selectedEngineer.id)) {
          const updatedEngineerIds = [...currentEngineerIds, selectedEngineer.id];
          await ticketAPI.assignTicket(ticket.id, updatedEngineerIds, `Assigned to ${selectedEngineer.username}`);
        }
      }
      
      setAssignDialogOpen(false);
      fetchEngineers();
      setSuccess(`Assigned ${selectedTicketIds.length} ticket(s) to ${selectedEngineer.first_name} ${selectedEngineer.last_name}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to assign tickets');
    } finally {
      setAssigning(false);
    }
  };

  const filteredEngineers = engineers.filter(engineer => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      engineer.username.toLowerCase().includes(searchLower) ||
      engineer.email.toLowerCase().includes(searchLower) ||
      engineer.first_name.toLowerCase().includes(searchLower) ||
      engineer.last_name.toLowerCase().includes(searchLower)
    );
  });

  const getEngineerPerformance = (engineerId) => {
    const stats = engineerStats[engineerId];
    if (!stats || stats.total === 0) return 0;
    const rate = (stats.resolved / stats.total) * 100;
    return Math.round(rate);
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Engineer Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage engineers and view performance
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Refresh />} onClick={fetchEngineers}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search engineers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button variant="outlined" onClick={() => setSearchTerm('')} fullWidth>
              Clear Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2" gutterBottom>Total Engineers</Typography>
              <Typography variant="h4">{engineers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2" gutterBottom>Active Engineers</Typography>
              <Typography variant="h4">
                {Object.values(engineerStats).filter(stats => stats?.active > 0).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2" gutterBottom>Avg. Resolution Rate</Typography>
              <Typography variant="h4">
                {engineers.length > 0
                  ? `${Math.round(engineers.reduce((acc, eng) => acc + getEngineerPerformance(eng.id), 0) / engineers.length)}%`
                  : '0%'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Engineer</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Performance</TableCell>
                <TableCell>Ticket Stats</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEngineers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">No engineers found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEngineers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((engineer) => {
                  const stats = engineerStats[engineer.id] || { total: 0, active: 0, resolved: 0, pending: 0 };
                  const performance = getEngineerPerformance(engineer.id);
                  
                  return (
                    <TableRow key={engineer.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">{engineer.first_name} {engineer.last_name}</Typography>
                          <Typography variant="body2" color="textSecondary">@{engineer.username}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email fontSize="small" />{engineer.email}
                          </Typography>
                          {engineer.phone && (
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Phone fontSize="small" />{engineer.phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            Resolution Rate: {performance}%
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={performance}
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                              color={performance >= 80 ? 'success' : performance >= 60 ? 'warning' : 'error'}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Total</Typography>
                            <Typography variant="body2" fontWeight="bold">{stats.total}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Active</Typography>
                            <Typography variant="body2" fontWeight="bold" color="warning.main">{stats.active}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Resolved</Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">{stats.resolved}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">Pending</Typography>
                            <Typography variant="body2" fontWeight="bold" color="info.main">{stats.pending}</Typography>
                          </Grid>
                        </Grid>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Performance">
                            <IconButton 
                              size="small" 
                              onClick={() => navigate(`/admin/performance/${engineer.id}`)}
                            >
                              <BarChart fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Assign Tickets">
                            <IconButton 
                              size="small"
                              onClick={() => handleOpenAssignDialog(engineer)}
                            >
                              <Assignment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredEngineers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Assign Tickets Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          Assign Tickets to {selectedEngineer?.first_name} {selectedEngineer?.last_name} (@{selectedEngineer?.username})
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Select tickets to assign to this engineer:
          </Typography>
          {availableTickets.length === 0 ? (
            <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
              No available tickets to assign
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {availableTickets.map(ticket => (
                <FormControlLabel
                  key={ticket.id}
                  control={
                    <Checkbox
                      checked={selectedTicketIds.includes(ticket.id)}
                      onChange={() => {
                        setSelectedTicketIds(prev =>
                          prev.includes(ticket.id)
                            ? prev.filter(id => id !== ticket.id)
                            : [...prev, ticket.id]
                        );
                      }}
                    />
                  }
                  label={`#${ticket.ticket_number} - ${ticket.title} (Priority: ${ticket.priority})`}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAssignTickets} 
            disabled={selectedTicketIds.length === 0 || assigning}
          >
            {assigning ? <CircularProgress size={24} /> : `Assign ${selectedTicketIds.length} Ticket(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EngineerManagement;