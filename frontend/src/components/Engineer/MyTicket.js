import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Chip, CircularProgress 
} from '@mui/material';
import { Visibility, DoneAll, CheckCircle } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';

const MyTicket = () => {
  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const filter = new URLSearchParams(useLocation().search).get('filter');

  useEffect(() => {
    const init = async () => {
      try {
        const res = await authAPI.getProfile();
        setCurrentUser(res.data);
        const tRes = await ticketAPI.getAllTickets();
        setTickets(tRes.data || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const handleMarkAsDone = async (ticketId) => {
    try {
      await ticketAPI.updateTicketStatus(ticketId, 'resolved');
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t));
    } catch (err) { alert("Update failed."); }
  };

  const getFilteredTickets = () => {
    const viewed = JSON.parse(localStorage.getItem('engineer_viewed_tasks') || '[]');
    switch (filter) {
      case 'mine': return tickets.filter(t => t.assigned_engineers?.some(e => e.engineer.id === currentUser?.id));
      case 'active': return tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');
      case 'pending': return tickets.filter(t => t.status === 'open' && (!t.assigned_engineers || t.assigned_engineers.length === 0));
      case 'resolved': return tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
      case 'new': return tickets.filter(t => t.assigned_engineers?.some(e => e.engineer.id === currentUser?.id) && !viewed.includes(t.id));
      default: return tickets;
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3} sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{filter} Tickets</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: '#fafafa' }}><TableRow><TableCell>Ticket #</TableCell><TableCell>Title</TableCell><TableCell>Status</TableCell><TableCell align="center">Actions</TableCell></TableRow></TableHead>
          <TableBody>
            {getFilteredTickets().map((t) => (
              <TableRow key={t.id} hover>
                <TableCell sx={{ fontWeight: 'bold' }}>{t.ticket_number}</TableCell>
                <TableCell>{t.title}</TableCell>
                <TableCell><Chip label={t.status} size="small" color={t.status === 'resolved' ? 'success' : 'default'} /></TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => navigate(`/tickets/${t.id}`)}><Visibility fontSize="small" /></IconButton>
                  {t.status === 'resolved' ? <CheckCircle color="success" /> : <IconButton color="success" onClick={() => handleMarkAsDone(t.id)}><DoneAll fontSize="small" /></IconButton>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MyTicket;