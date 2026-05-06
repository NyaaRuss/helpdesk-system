// src/components/Dashboard/EngineerDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid, Paper, Typography, Box, Button, Card, CardContent, Alert, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, IconButton, Tooltip, TextField, LinearProgress
} from '@mui/material';
import {
  CheckCircle, Refresh, Visibility, DoneAll, Search,
  TrendingUp, Schedule, Speed, Assignment, Warning, Error as ErrorIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const EngineerDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTicketsState, setFilteredTicketsState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCount, setNewCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [myPerformance, setMyPerformance] = useState({
    totalAssigned: 0,
    resolved: 0,
    resolutionRate: 0,
    avgResolutionTime: 0,
    priorityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 }
  });
  
  const navigate = useNavigate();

  // Fetch current user on mount
  useEffect(() => {
    const init = async () => {
      try {
        const response = await authAPI.getProfile();
        setCurrentUser(response.data);
      } catch (err) { 
        console.error("Initialization error:", err); 
      }
    };
    init();
  }, []);

  // Fetch tickets when user is loaded
  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ticketAPI.getAllTickets();
      const allTickets = res.data || [];
      
      // Filter tickets assigned to current engineer
      const myTickets = allTickets.filter(t => 
        t.assigned_engineers?.some(e => e.engineer?.id === currentUser?.id || e.id === currentUser?.id)
      );
      
      setTickets(myTickets);
      setFilteredTicketsState(myTickets);
      
      // Check for new tickets
      const viewed = JSON.parse(localStorage.getItem('engineer_viewed_tasks') || '[]');
      const myNewTickets = myTickets.filter(t => 
        !viewed.includes(t.id) && t.status !== 'resolved' && t.status !== 'closed'
      );
      setNewCount(myNewTickets.length);
      
      // Calculate performance metrics
      calculatePerformance(myTickets);
      
    } catch (err) { 
      console.error("Fetch error:", err); 
    } finally { 
      setLoading(false); 
    }
  }, [currentUser]);

  const calculatePerformance = (myTickets) => {
    const resolvedTickets = myTickets.filter(t => 
      t.status === 'resolved' || t.status === 'closed'
    );
    
    // Calculate resolution times
    let totalHours = 0;
    resolvedTickets.forEach(ticket => {
      if (ticket.created_at && ticket.updated_at) {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.updated_at);
        totalHours += (resolved - created) / (1000 * 60 * 60);
      }
    });
    
    const avgResolutionTime = resolvedTickets.length > 0 
      ? totalHours / resolvedTickets.length 
      : 0;
    
    const resolutionRate = myTickets.length > 0 
      ? (resolvedTickets.length / myTickets.length) * 100 
      : 0;
    
    const priorityBreakdown = {
      low: myTickets.filter(t => t.priority === 'low').length,
      medium: myTickets.filter(t => t.priority === 'medium').length,
      high: myTickets.filter(t => t.priority === 'high').length,
      critical: myTickets.filter(t => t.priority === 'critical').length
    };
    
    setMyPerformance({
      totalAssigned: myTickets.length,
      resolved: resolvedTickets.length,
      resolutionRate: resolutionRate.toFixed(1),
      avgResolutionTime: avgResolutionTime.toFixed(1),
      priorityBreakdown
    });
  };

  const handleMarkAsDone = async (ticketId) => {
    try {
      await ticketAPI.updateTicket(ticketId, { status: 'resolved' });
      
      // Update local state
      const updatedTickets = tickets.map(t => 
        t.id === ticketId ? { ...t, status: 'resolved', updated_at: new Date().toISOString() } : t
      );
      setTickets(updatedTickets);
      applyFilters(updatedTickets, searchTerm, priorityFilter, statusFilter);
      
      // Recalculate performance
      calculatePerformance(updatedTickets);
      
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleViewTicket = (ticketId) => {
    const viewed = JSON.parse(localStorage.getItem('engineer_viewed_tasks') || '[]');
    if (!viewed.includes(ticketId)) {
      viewed.push(ticketId);
      localStorage.setItem('engineer_viewed_tasks', JSON.stringify(viewed));
      setNewCount(prev => Math.max(0, prev - 1));
    }
    navigate(`/tickets/${ticketId}`);
  };

  const applyFilters = (ticketList, search, priority, status) => {
    let filtered = [...ticketList];
    
    // Apply search filter
    if (search) {
      filtered = filtered.filter(t => 
        t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
        t.title?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply priority filter
    if (priority !== 'all') {
      filtered = filtered.filter(t => t.priority === priority);
    }
    
    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }
    
    setFilteredTicketsState(filtered);
    setPage(0); // Reset to first page when filtering
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(tickets, value, priorityFilter, statusFilter);
  };

  const handlePriorityFilter = (e) => {
    const value = e.target.value;
    setPriorityFilter(value);
    applyFilters(tickets, searchTerm, value, statusFilter);
  };

  const handleStatusFilter = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    applyFilters(tickets, searchTerm, priorityFilter, value);
  };

  const handleRefresh = () => {
    fetchDashboardData();
    setSearchTerm('');
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'Critical';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return priority;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  // Stats for cards
  const stats = {
    my_assigned: tickets.length,
    my_in_progress: tickets.filter(t => t.status === 'in_progress').length,
    my_open: tickets.filter(t => t.status === 'open').length,
    my_resolved: myPerformance.resolved,
    high_priority: tickets.filter(t => t.priority === 'high' || t.priority === 'critical').length
  };

  // Priority breakdown data for pie chart
  const priorityData = Object.entries(myPerformance.priorityBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: getPriorityColor(name)
  })).filter(item => item.value > 0);

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredTicketsState.slice(startIndex, endIndex);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold', color: '#1a237e' }}>
        Engineer Dashboard
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Track your performance and manage assigned tickets
      </Typography>

      {newCount > 0 && (
        <Alert 
          severity="info" 
          variant="filled" 
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => {
              setPriorityFilter('all');
              setStatusFilter('all');
              setSearchTerm('');
            }}>
              VIEW ALL
            </Button>
          }
        >
          You have {newCount} new task(s) assigned to you!
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              bgcolor: '#1976d2', 
              color: 'white', 
              cursor: 'pointer', 
              transition: 'transform 0.2s', 
              '&:hover': { transform: 'translateY(-4px)' }
            }}
            onClick={() => {
              setPriorityFilter('all');
              setStatusFilter('all');
            }}
          >
            <CardContent>
              <Typography variant="body2">My Assigned Tasks</Typography>
              <Typography variant="h4">{stats.my_assigned}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              bgcolor: '#ed6c02', 
              color: 'white', 
              cursor: 'pointer', 
              transition: 'transform 0.2s', 
              '&:hover': { transform: 'translateY(-4px)' }
            }}
            onClick={() => handleStatusFilter({ target: { value: 'in_progress' } })}
          >
            <CardContent>
              <Typography variant="body2">In Progress</Typography>
              <Typography variant="h4">{stats.my_in_progress}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              bgcolor: '#f44336', 
              color: 'white', 
              cursor: 'pointer', 
              transition: 'transform 0.2s', 
              '&:hover': { transform: 'translateY(-4px)' }
            }}
            onClick={() => handleStatusFilter({ target: { value: 'open' } })}
          >
            <CardContent>
              <Typography variant="body2">Open</Typography>
              <Typography variant="h4">{stats.my_open}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              bgcolor: '#2e7d32', 
              color: 'white', 
              cursor: 'pointer', 
              transition: 'transform 0.2s', 
              '&:hover': { transform: 'translateY(-4px)' }
            }}
            onClick={() => handleStatusFilter({ target: { value: 'resolved' } })}
          >
            <CardContent>
              <Typography variant="body2">Resolved</Typography>
              <Typography variant="h4">{stats.my_resolved}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card 
            sx={{ 
              bgcolor: '#d32f2f', 
              color: 'white', 
              cursor: 'pointer', 
              transition: 'transform 0.2s', 
              '&:hover': { transform: 'translateY(-4px)' }
            }}
            onClick={() => handlePriorityFilter({ target: { value: 'high' } })}
          >
            <CardContent>
              <Typography variant="body2">High/Critical</Typography>
              <Typography variant="h4">{stats.high_priority}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Analytics Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2, fontWeight: 'bold' }}>
        <TrendingUp sx={{ mr: 1 }} /> My Performance Analytics
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Speed /> Resolution Rate
            </Typography>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h2" color={myPerformance.resolutionRate >= 80 ? '#4caf50' : '#ff9800'} fontWeight="bold">
                {myPerformance.resolutionRate}%
              </Typography>
              <Typography variant="body2" color="textSecondary">of assigned tickets resolved</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={myPerformance.resolutionRate} 
              sx={{ height: 10, borderRadius: 5 }}
              color={myPerformance.resolutionRate >= 80 ? "success" : "warning"}
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">Resolved: {myPerformance.resolved}</Typography>
              <Typography variant="caption">Total: {myPerformance.totalAssigned}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule /> Average Resolution Time
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h2" color="primary.main" fontWeight="bold">
                {myPerformance.avgResolutionTime}
              </Typography>
              <Typography variant="body2" color="textSecondary">hours per ticket</Typography>
            </Box>
            {myPerformance.resolved > 0 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">
                  Based on {myPerformance.resolved} resolved ticket(s)
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment /> Priority Breakdown
            </Typography>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="textSecondary">No tickets assigned yet</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {priorityData.map((item, idx) => (
                <Chip 
                  key={idx}
                  label={`${item.name}: ${item.value}`}
                  size="small"
                  sx={{ bgcolor: item.color, color: 'white' }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tickets Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Box p={3} borderBottom="1px solid #eee">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField 
                fullWidth
                size="small" 
                label="Search tickets..."
                variant="outlined"
                value={searchTerm} 
                onChange={handleSearch}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                select
                label="Priority Filter"
                value={priorityFilter}
                onChange={handlePriorityFilter}
                SelectProps={{ native: true }}
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                select
                label="Status Filter"
                value={statusFilter}
                onChange={handleStatusFilter}
                SelectProps={{ native: true }}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={handleRefresh}>
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#fafafa' }}>
              <TableRow>
                <TableCell>Ticket #</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getCurrentPageData().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No tickets found matching your filters
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                getCurrentPageData().map((ticket) => {
                  const viewed = JSON.parse(localStorage.getItem('engineer_viewed_tasks') || '[]');
                  const isNew = !viewed.includes(ticket.id) && ticket.status !== 'resolved' && ticket.status !== 'closed';
                  
                  return (
                    <TableRow key={ticket.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        <Box component="span" sx={{ color: '#1976d2' }}>
                          {ticket.ticket_number}
                        </Box>
                        {isNew && (
                          <Chip 
                            label="NEW" 
                            size="small" 
                            color="info" 
                            sx={{ ml: 1, height: 20, fontSize: '10px' }} 
                          />
                        )}
                      </TableCell>
                      <TableCell>{ticket.title}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getPriorityLabel(ticket.priority)} 
                          size="small" 
                          sx={{ 
                            bgcolor: getPriorityColor(ticket.priority), 
                            color: 'white', 
                            fontWeight: 'bold', 
                            textTransform: 'capitalize' 
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={ticket.status?.replace('_', ' ')} 
                          size="small" 
                          color={getStatusColor(ticket.status)} 
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton onClick={() => handleViewTicket(ticket.id)}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {ticket.status !== 'resolved' && ticket.status !== 'closed' ? (
                            <Tooltip title="Mark as Resolved">
                              <IconButton 
                                color="success" 
                                onClick={() => handleMarkAsDone(ticket.id)}
                              >
                                <DoneAll fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Resolved">
                              <CheckCircle color="success" />
                            </Tooltip>
                          )}
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
          component="div"
          count={filteredTicketsState.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          labelRowsPerPage="Tickets per page:"
        />
      </Paper>
    </Box>
  );
};

export default EngineerDashboard;