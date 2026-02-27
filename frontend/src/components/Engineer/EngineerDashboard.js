import React, { useState, useEffect } from 'react';
import {
  Grid, Paper, Typography, Box, Button, Card, CardContent, Alert, Chip,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, IconButton, Tooltip, TextField, Badge
} from '@mui/material';
import {
  CheckCircle, Refresh, Visibility, DoneAll, Search
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';

const EngineerDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCount, setNewCount] = useState(0);
  
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const response = await authAPI.getProfile();
        setCurrentUser(response.data);
        fetchDashboardData(response.data);
      } catch (err) { console.error("Initialization error:", err); }
    };
    init();
  }, []);

  const fetchDashboardData = async (userOverride = null) => {
    const user = userOverride || currentUser;
    try {
      const res = await ticketAPI.getAllTickets();
      const allTickets = res.data || [];
      setTickets(allTickets);

      // --- NEW ASSIGNED TASK LOGIC ---
      if (user) {
        const viewed = JSON.parse(localStorage.getItem('engineer_viewed_tasks') || '[]');
        const myNewTickets = allTickets.filter(t => 
          t.assigned_engineers?.some(e => e.engineer.id === user.id) && 
          !viewed.includes(t.id) &&
          t.status !== 'resolved'
        );
        setNewCount(myNewTickets.length);
      }
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  };

  const handleMarkAsDone = async (ticketId) => {
    try {
      // Transition status to 'resolved'
      await ticketAPI.updateTicketStatus(ticketId, 'resolved');
      
      // Update UI state locally
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status: 'resolved' } : t
      ));

      // Refresh counts
      fetchDashboardData();
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update status. Check if your backend View permits PATCH requests for 'status'.");
    }
  };

  const handleViewTicket = (ticketId) => {
    // Add to viewed list to clear the "NEW" notification badge
    const viewed = JSON.parse(localStorage.getItem('engineer_viewed_tasks') || '[]');
    if (!viewed.includes(ticketId)) {
      viewed.push(ticketId);
      localStorage.setItem('engineer_viewed_tasks', JSON.stringify(viewed));
    }
    navigate(`/tickets/${ticketId}`);
  };

  // --- STATS CALCULATIONS ---
  const stats = {
    my_assigned: tickets.filter(t => t.assigned_engineers?.some(e => e.engineer.id === currentUser?.id)).length,
    active: tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length,
    pending: tickets.filter(t => t.status === 'open' && (!t.assigned_engineers || t.assigned_engineers.length === 0)).length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  };

  const filteredTickets = tickets.filter(t => 
    t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold', color: '#1a237e' }}>Engineer Dashboard</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>System health and ticket management overview</Typography>

      {/* ALERT BOX FOR NEW ASSIGNMENTS */}
      {newCount > 0 && (
        <Alert 
          severity="info" 
          variant="filled" 
          sx={{ mb: 3, borderRadius: 2 }}
          action={<Button color="inherit" size="small" onClick={() => navigate('/engineer/tickets?filter=new')}>VIEW NEW</Button>}
        >
          You have {newCount} new task(s) assigned to you!
        </Alert>
      )}

      {/* STAT CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1976d2', color: 'white', cursor: 'pointer' }} onClick={() => navigate('/engineer/tickets?filter=mine')}>
            <CardContent><Typography variant="body2">My Assigned Tasks</Typography><Typography variant="h4">{stats.my_assigned}</Typography></CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#ed6c02', color: 'white', cursor: 'pointer' }} onClick={() => navigate('/engineer/tickets?filter=active')}>
            <CardContent><Typography variant="body2">System Active</Typography><Typography variant="h4">{stats.active}</Typography></CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#0288d1', color: 'white', cursor: 'pointer' }} onClick={() => navigate('/engineer/tickets?filter=pending')}>
            <CardContent><Typography variant="body2">System Pending</Typography><Typography variant="h4">{stats.pending}</Typography></CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#2e7d32', color: 'white', cursor: 'pointer' }} onClick={() => navigate('/engineer/tickets?filter=resolved')}>
            <CardContent><Typography variant="body2">System Resolved</Typography><Typography variant="h4">{stats.resolved}</Typography></CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* TICKETS TABLE */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Box p={3} display="flex" justifyContent="space-between" alignItems="center" borderBottom="1px solid #eee">
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Latest System Tickets</Typography>
          <Box display="flex" gap={2}>
            <TextField size="small" placeholder="Search..." InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 1, color: 'gray' }} /> }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Button variant="outlined" startIcon={<Refresh />} onClick={() => fetchDashboardData()}>Refresh</Button>
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#fafafa' }}>
              <TableRow>
                <TableCell>Ticket #</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((t) => {
                const viewed = JSON.parse(localStorage.getItem('engineer_viewed_tasks') || '[]');
                const isNew = t.assigned_engineers?.some(e => e.engineer.id === currentUser?.id) && !viewed.includes(t.id);
                
                return (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {t.ticket_number}
                      {isNew && <Chip label="NEW" size="small" color="info" sx={{ ml: 1, height: 20, fontSize: '10px' }} />}
                    </TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>
                      <Chip 
                        label={t.status} 
                        size="small" 
                        color={t.status === 'open' ? 'error' : (t.status === 'resolved' || t.status === 'closed') ? 'success' : 'warning'} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={1}>
                        <IconButton onClick={() => handleViewTicket(t.id)}><Visibility fontSize="small" /></IconButton>
                        
                        {/* ICON SWITCH LOGIC */}
                        {t.status === 'resolved' || t.status === 'closed' ? (
                          <Tooltip title="Resolved"><CheckCircle color="success" /></Tooltip>
                        ) : (
                          <Tooltip title="Mark as Resolved">
                            <IconButton color="success" onClick={() => handleMarkAsDone(t.id)}><DoneAll fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={filteredTickets.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, n) => setPage(n)} />
      </Paper>
    </Box>
  );
};

export default EngineerDashboard;