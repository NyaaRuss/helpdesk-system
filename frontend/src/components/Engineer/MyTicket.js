// src/components/Engineer/MyTicket.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton, TextField,
  InputAdornment, MenuItem, Select, FormControl, InputLabel, Button,
  Alert, CircularProgress, Grid, Tabs, Tab, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Card, CardContent, LinearProgress, Avatar,
  Divider, List, ListItem, ListItemText, ListItemAvatar,
} from '@mui/material';
import {
  Search, Refresh, Visibility, PersonAdd, Assignment,
  Timeline, AccessTime, CalendarToday, Schedule, Work, Pending,
  CheckCircle as CompletedIcon, Warning, Error, Speed,
  TrendingUp, EventNote, Today, DateRange, HourglassEmpty,
  Timer as TimerIcon,
  Close, DoneAll, CheckCircle,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';
import { format, differenceInHours } from 'date-fns';

// Priority deadline hours
const PRIORITY_DEADLINE_HOURS = {
  low: 120,
  medium: 72,
  high: 48,
  critical: 24
};

// Real-time Countdown Timer Component (memoized to prevent re-renders)
const CountdownTimer = React.memo(({ createdAt, priority, status, ticketId, onEscalate }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [percentageUsed, setPercentageUsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const calculateTime = () => {
      if (!createdAt) return;
      
      const now = new Date();
      const created = new Date(createdAt);
      const deadlineHours = PRIORITY_DEADLINE_HOURS[priority] || 72;
      const deadline = new Date(created.getTime() + (deadlineHours * 60 * 60 * 1000));
      
      const remainingMs = deadline - now;
      const totalMs = deadline - created;
      
      const elapsedHours = (now - created) / (1000 * 60 * 60);
      const usedPercentage = (elapsedHours / deadlineHours) * 100;
      setPercentageUsed(Math.min(usedPercentage, 100));
      
      if (remainingMs <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (status !== 'resolved' && status !== 'closed' && onEscalate) {
          onEscalate(ticketId);
        }
      } else {
        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTime();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(calculateTime, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [createdAt, priority, status, ticketId, onEscalate]);

  if (!timeLeft) return null;

  const getTimerColor = () => {
    if (percentageUsed >= 100) return '#d32f2f';
    if (percentageUsed >= 90) return '#f44336';
    if (percentageUsed >= 75) return '#ff9800';
    return '#4caf50';
  };

  const formatTimeDisplay = () => {
    if (percentageUsed >= 100) return 'OVERDUE!';
    if (timeLeft.days > 0) return `${timeLeft.days}d ${timeLeft.hours}h`;
    if (timeLeft.hours > 0) return `${timeLeft.hours}h ${timeLeft.minutes}m`;
    if (timeLeft.minutes > 0) return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    return `${timeLeft.seconds}s`;
  };

  return (
    <Tooltip title={`${percentageUsed.toFixed(0)}% of time used`}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <TimerIcon sx={{ fontSize: 16, color: getTimerColor() }} />
        <Typography 
          variant="caption" 
          sx={{ 
            fontWeight: 'bold',
            color: getTimerColor(),
            fontFamily: 'monospace'
          }}
        >
          {formatTimeDisplay()}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={percentageUsed} 
          sx={{ width: 50, height: 4, borderRadius: 2 }}
          color={percentageUsed >= 90 ? 'error' : percentageUsed >= 75 ? 'warning' : 'success'}
        />
      </Box>
    </Tooltip>
  );
});

// Ticket Timeline Dialog Component
const TicketTimelineDialog = ({ ticket, open, onClose }) => {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && ticket && !timeline) {
      fetchTimeline();
    }
  }, [open, ticket]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const response = await ticketAPI.getTicketTimeline(ticket.id);
      setTimeline(response.data);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DialogContent><CircularProgress /></DialogContent>;
  if (!timeline) return null;

  const deadlineHours = PRIORITY_DEADLINE_HOURS[ticket.priority] || 72;
  const percentageUsed = (timeline.time_elapsed_hours / deadlineHours) * 100;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Timeline: {ticket.ticket_number}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Alert severity={percentageUsed >= 90 ? 'error' : percentageUsed >= 75 ? 'warning' : 'info'} sx={{ mb: 2 }}>
            <Typography variant="subtitle2">
              Priority: {ticket.priority.toUpperCase()} | Deadline: {deadlineHours} hours from creation
            </Typography>
          </Alert>

          <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle2" gutterBottom>Time Progress</Typography>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(percentageUsed, 100)} 
              sx={{ height: 10, borderRadius: 5, mb: 1 }}
              color={percentageUsed >= 90 ? 'error' : percentageUsed >= 75 ? 'warning' : 'primary'}
            />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption">Created: {format(new Date(timeline.created_at), 'MMM dd, HH:mm')}</Typography>
              <Typography variant="caption">{percentageUsed.toFixed(0)}% used</Typography>
              <Typography variant="caption">
                Deadline: {format(new Date(timeline.deadline), 'MMM dd, HH:mm')}
              </Typography>
            </Box>
          </Paper>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                <Typography variant="caption">Time Elapsed</Typography>
                <Typography variant="h6">{timeline.time_elapsed_hours}h</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                <Typography variant="caption">Time Remaining</Typography>
                <Typography variant="h6">{timeline.time_remaining_hours}h</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                <Typography variant="caption">Time Spent</Typography>
                <Typography variant="h6">{timeline.time_spent_hours}h</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// Lazy-loaded Calendar Component to prevent re-renders
const TaskCalendar = React.memo(({ tickets, onTicketClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [filteredTickets, setFilteredTickets] = useState(tickets);
  const [calendarKey, setCalendarKey] = useState(Date.now());

  // Lazy load FullCalendar only when tab is active
  const [CalendarComponent, setCalendarComponent] = useState(null);

  useEffect(() => {
    // Dynamically import FullCalendar only when needed
    import('@fullcalendar/react').then(module => {
      setCalendarComponent(() => module.default);
    });
    import('@fullcalendar/daygrid');
    import('@fullcalendar/timegrid');
    import('@fullcalendar/interaction');
  }, []);

  useEffect(() => {
    let filtered = tickets;
    
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }
    
    setFilteredTickets(filtered);
    setCalendarKey(Date.now()); // Force calendar refresh
  }, [searchTerm, priorityFilter, tickets]);

  const events = filteredTickets.map(ticket => {
    if (!ticket.created_at) return null;
    
    const created = new Date(ticket.created_at);
    const deadlineHours = PRIORITY_DEADLINE_HOURS[ticket.priority] || 72;
    const deadline = new Date(created.getTime() + (deadlineHours * 60 * 60 * 1000));
    
    const now = new Date();
    const isOverdue = deadline < now && ticket.status !== 'resolved' && ticket.status !== 'closed';
    const isCompleted = ticket.status === 'resolved' || ticket.status === 'closed';
    
    let backgroundColor = '#1976d2';
    if (isCompleted) backgroundColor = '#4caf50';
    else if (isOverdue) backgroundColor = '#d32f2f';
    else if (ticket.priority === 'critical') backgroundColor = '#d32f2f';
    else if (ticket.priority === 'high') backgroundColor = '#f44336';
    else if (ticket.priority === 'medium') backgroundColor = '#ff9800';
    
    return {
      id: ticket.id,
      title: `${ticket.ticket_number}: ${ticket.title.substring(0, 40)}${ticket.title.length > 40 ? '...' : ''}`,
      start: deadline,
      backgroundColor,
      borderColor: backgroundColor,
      extendedProps: {
        priority: ticket.priority,
        status: ticket.status,
        ticket_number: ticket.ticket_number
      }
    };
  }).filter(event => event !== null);

  if (!CalendarComponent) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography>Loading calendar...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
        Ticket Deadlines Calendar
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by ticket number or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Priority Filter</InputLabel>
            <Select value={priorityFilter} label="Priority Filter" onChange={(e) => setPriorityFilter(e.target.value)}>
              <MenuItem value="all">All Priorities</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      <CalendarComponent
        key={calendarKey}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek'
        }}
        events={events}
        height={500}
        eventClick={(info) => onTicketClick(info.event.id)}
        nowIndicator={true}
      />
    </Paper>
  );
});

// Performance Dashboard Component
const PerformanceDashboard = React.memo(({ myTickets, onViewTicket }) => {
  const [stats, setStats] = useState({
    totalAssigned: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    escalated: 0,
    completionRate: 0,
    totalTimeSpent: 0,
    avgTimePerTicket: 0,
    onTimeRate: 0,
    ticketsByPriority: { low: 0, medium: 0, high: 0, critical: 0 }
  });

  useEffect(() => {
    calculateStats();
  }, [myTickets]);

  const calculateStats = () => {
    const total = myTickets.length;
    const completed = myTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const inProgress = myTickets.filter(t => t.status === 'in_progress').length;
    
    const now = new Date();
    const overdue = myTickets.filter(ticket => {
      if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
      const created = new Date(ticket.created_at);
      const deadlineHours = PRIORITY_DEADLINE_HOURS[ticket.priority] || 72;
      const deadline = new Date(created.getTime() + (deadlineHours * 60 * 60 * 1000));
      return deadline < now;
    }).length;
    
    const escalated = myTickets.filter(t => t.is_escalated === true || t.status === 'escalated').length;
    
    let totalTimeSpent = 0;
    let onTime = 0;
    
    const ticketsByPriority = {
      low: 0, medium: 0, high: 0, critical: 0
    };
    
    myTickets.forEach(ticket => {
      ticketsByPriority[ticket.priority]++;
      
      if (ticket.time_spent_hours) {
        totalTimeSpent += ticket.time_spent_hours;
      }
      
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.updated_at);
        const deadlineHours = PRIORITY_DEADLINE_HOURS[ticket.priority] || 72;
        const deadline = new Date(created.getTime() + (deadlineHours * 60 * 60 * 1000));
        if (resolved <= deadline) onTime++;
      }
    });
    
    const avgTimePerTicket = completed > 0 ? (totalTimeSpent / completed).toFixed(1) : 0;
    
    setStats({
      totalAssigned: total,
      completed,
      inProgress,
      overdue,
      escalated,
      completionRate: total ? ((completed / total) * 100).toFixed(1) : 0,
      totalTimeSpent: totalTimeSpent.toFixed(1),
      avgTimePerTicket,
      onTimeRate: completed ? ((onTime / completed) * 100).toFixed(1) : 0,
      ticketsByPriority
    });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
        Performance Dashboard
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#1976d2', color: 'white', cursor: 'pointer' }} onClick={() => onViewTicket('all')}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2">Assigned</Typography>
                  <Typography variant="h4">{stats.totalAssigned}</Typography>
                </Box>
                <Assignment sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#4caf50', color: 'white', cursor: 'pointer' }} onClick={() => onViewTicket('resolved')}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2">Completed</Typography>
                  <Typography variant="h4">{stats.completed}</Typography>
                </Box>
                <CompletedIcon sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#ff9800', color: 'white', cursor: 'pointer' }} onClick={() => onViewTicket('in_progress')}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2">In Progress</Typography>
                  <Typography variant="h4">{stats.inProgress}</Typography>
                </Box>
                <Pending sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#d32f2f', color: 'white', cursor: 'pointer' }} onClick={() => onViewTicket('overdue')}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2">Overdue</Typography>
                  <Typography variant="h4">{stats.overdue}</Typography>
                </Box>
                <Warning sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#9c27b0', color: 'white', cursor: 'pointer' }} onClick={() => onViewTicket('escalated')}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2">Escalated</Typography>
                  <Typography variant="h4">{stats.escalated}</Typography>
                </Box>
                <Error sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: '#4caf50', color: 'white' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2">Completion Rate</Typography>
                  <Typography variant="h4">{stats.completionRate}%</Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
              Time Metrics
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Total Time Spent</Typography>
                <Typography variant="h5">{stats.totalTimeSpent}h</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Avg Per Ticket</Typography>
                <Typography variant="h5">{stats.avgTimePerTicket}h</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">On-Time Rate</Typography>
                <Typography variant="h5" color={stats.onTimeRate >= 80 ? '#4caf50' : '#ff9800'}>
                  {stats.onTimeRate}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Escalated Tickets</Typography>
                <Typography variant="h5" color="#d32f2f">{stats.escalated}</Typography>
              </Grid>
            </Grid>
            <LinearProgress 
              variant="determinate" 
              value={stats.onTimeRate} 
              sx={{ mt: 2, height: 8, borderRadius: 4 }}
              color={stats.onTimeRate >= 80 ? "success" : "warning"}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
              Priority Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={3} textAlign="center">
                <Chip label="Critical" size="small" color="error" />
                <Typography variant="h4">{stats.ticketsByPriority.critical}</Typography>
              </Grid>
              <Grid item xs={3} textAlign="center">
                <Chip label="High" size="small" color="warning" />
                <Typography variant="h4">{stats.ticketsByPriority.high}</Typography>
              </Grid>
              <Grid item xs={3} textAlign="center">
                <Chip label="Medium" size="small" color="info" />
                <Typography variant="h4">{stats.ticketsByPriority.medium}</Typography>
              </Grid>
              <Grid item xs={3} textAlign="center">
                <Chip label="Low" size="small" color="success" />
                <Typography variant="h4">{stats.ticketsByPriority.low}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
});

// Resolve Ticket Dialog
const ResolveTicketDialog = ({ open, ticket, onClose, onConfirm }) => {
  const [resolutionNote, setResolutionNote] = useState('');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#4caf50', color: 'white' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <CheckCircle /> Resolve Ticket
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Ticket:</strong> {ticket?.ticket_number} - {ticket?.title}
            </Typography>
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Resolution Notes"
            placeholder="Please provide details about how this ticket was resolved..."
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            variant="outlined"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={() => onConfirm(ticket?.id, resolutionNote)} 
          variant="contained" 
          color="success"
          startIcon={<DoneAll />}
        >
          Mark as Resolved
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main Component
const MyTicket = () => {
  const [myTickets, setMyTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [assigning, setAssigning] = useState(false);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const queryFilter = new URLSearchParams(location.search).get('filter') || 'all';

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const profileRes = await authAPI.getProfile();
      setCurrentUser(profileRes.data);
      const ticketsRes = await ticketAPI.getAllTickets();
      const allTicketsData = ticketsRes.data || [];
      setAllTickets(allTicketsData);
      
      const myTicketsData = allTicketsData.filter(t => 
        t.assigned_engineers?.some(e => e.engineer?.id === profileRes.data?.id || e.id === profileRes.data?.id)
      );
      setMyTickets(myTicketsData);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load only
  useEffect(() => {
    fetchData();
    
    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
    setTimeout(() => {
      setNotification({ open: false, message: '', severity: 'success' });
    }, 5000);
  };

  const handleSelfAssign = async (ticket) => {
    if (!currentUser) return;
    
    const currentIds = ticket.assigned_engineers?.map(item => item.engineer?.id || item.id) || [];
    
    if (currentIds.includes(currentUser.id)) {
      showNotification(`⚠️ You are already assigned to ticket ${ticket.ticket_number}`, 'warning');
      return;
    }
    
    setAssigning(true);
    try {
      await ticketAPI.assignTicket(ticket.id, [...currentIds, currentUser.id], 'Self-assigned');
      showNotification(`✅ Successfully assigned to ticket ${ticket.ticket_number}!`, 'success');
      await fetchData(false);
    } catch (err) {
      console.error('Failed to self-assign ticket:', err);
      showNotification(`❌ Failed to assign to ticket ${ticket.ticket_number}. Please try again.`, 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenTimeline = (ticket) => {
    setSelectedTicket(ticket);
    setTimelineDialogOpen(true);
  };

  const handleOpenResolveDialog = (ticket) => {
    setResolvingTicket(ticket);
    setResolveDialogOpen(true);
  };

  const handleResolveTicket = async (ticketId, resolutionNote) => {
    try {
      await ticketAPI.updateTicket(ticketId, { status: 'resolved' });
      
      if (resolutionNote) {
        await ticketAPI.sendMessage({
          ticket: ticketId,
          content: `✅ Ticket resolved. Resolution notes: ${resolutionNote}`,
          is_internal: false
        });
      }
      
      showNotification(`Ticket resolved successfully!`, 'success');
      setResolveDialogOpen(false);
      fetchData(false);
    } catch (err) {
      console.error('Failed to resolve ticket:', err);
      showNotification('Failed to resolve ticket', 'error');
    }
  };

  const handleEscalateTicket = async (ticketId) => {
    try {
      await ticketAPI.escalateTicket(ticketId, 'Auto-escalated: Deadline exceeded');
      showNotification(`Ticket escalated due to deadline breach`, 'warning');
      fetchData(false);
    } catch (err) {
      console.error('Failed to escalate ticket:', err);
    }
  };

  const getFilteredTickets = useCallback(() => {
    let filtered = tabValue === 0 ? myTickets : allTickets;
    
    if (queryFilter === 'overdue') {
      const now = new Date();
      filtered = filtered.filter(ticket => {
        if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
        const created = new Date(ticket.created_at);
        const deadlineHours = PRIORITY_DEADLINE_HOURS[ticket.priority] || 72;
        const deadline = new Date(created.getTime() + (deadlineHours * 60 * 60 * 1000));
        return deadline < now;
      });
    } else if (queryFilter === 'escalated') {
      filtered = filtered.filter(t => t.is_escalated === true || t.status === 'escalated');
    } else if (queryFilter === 'resolved') {
      filtered = filtered.filter(t => t.status === 'resolved' || t.status === 'closed');
    } else if (queryFilter === 'in_progress') {
      filtered = filtered.filter(t => t.status === 'in_progress');
    } else if (queryFilter === 'open') {
      filtered = filtered.filter(t => t.status === 'open');
    }

    return filtered.filter(ticket => {
      const matchesSearch = !searchTerm || 
        ticket.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        ticket.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [myTickets, allTickets, tabValue, queryFilter, searchTerm, statusFilter, priorityFilter]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
  };

  const handlePerformanceView = (filter) => {
    navigate(`/engineer/tickets?filter=${filter}`);
    setTabValue(0);
  };

  const handleManualRefresh = () => {
    fetchData(true);
  };

  if (loading && myTickets.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const displayTickets = getFilteredTickets();

  return (
    <Box p={3} sx={{ width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
            {tabValue === 0 ? 'My Tickets' : tabValue === 1 ? 'All Tickets' : tabValue === 2 ? 'Calendar View' : 'Performance Dashboard'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {tabValue === 0 ? 'View and manage tickets assigned to you' : 
              tabValue === 1 ? 'View all tickets in the system' : 
              tabValue === 2 ? 'Calendar view of ticket deadlines' :
              'Track your performance metrics'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isRefreshing && <CircularProgress size={24} />}
          <Button 
            variant="contained" 
            startIcon={<Refresh />} 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {notification.open && (
        <Alert 
          severity={notification.severity} 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setNotification({ open: false, message: '', severity: 'success' })}
        >
          {notification.message}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`My Tickets (${myTickets.length})`} />
          <Tab label={`All Tickets (${allTickets.length})`} />
          <Tab label="Calendar View" />
          <Tab label="Performance Dashboard" />
        </Tabs>
      </Paper>

      {tabValue === 2 && (
        <TaskCalendar tickets={myTickets} onTicketClick={(id) => navigate(`/tickets/${id}`)} />
      )}

      {tabValue === 3 && (
        <PerformanceDashboard myTickets={myTickets} onViewTicket={handlePerformanceView} />
      )}

      {(tabValue === 0 || tabValue === 1) && (
        <>
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth size="small" placeholder="Search by ticket number or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                    <MenuItem value="escalated">Escalated</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
                    <MenuItem value="all">All Priorities</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
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
                  <TableCell sx={{ fontWeight: 'bold' }}>Time Remaining</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Deadline</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        No tickets found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((ticket) => {
                    const assignedIds = ticket.assigned_engineers?.map(item => item.engineer?.id || item.id) || [];
                    const isAssignedToMe = currentUser && assignedIds.includes(currentUser.id);
                    const isSelfAssignable = tabValue === 1 && !isAssignedToMe && ticket.status !== 'resolved' && ticket.status !== 'closed';
                    
                    const created = new Date(ticket.created_at);
                    const deadlineHours = PRIORITY_DEADLINE_HOURS[ticket.priority] || 72;
                    const deadline = new Date(created.getTime() + (deadlineHours * 60 * 60 * 1000));
                    
                    return (
                      <TableRow key={ticket.id} hover>
                        <TableCell 
                          sx={{ fontWeight: 'bold', color: '#1976d2', cursor: 'pointer' }}
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          {ticket.ticket_number}
                          {ticket.is_escalated && (
                            <Chip label="ESCALATED" size="small" color="error" sx={{ ml: 1, height: 20 }} />
                          )}
                        </TableCell>
                        <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} sx={{ cursor: 'pointer' }}>
                          {ticket.title}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ticket.priority} 
                            size="small" 
                            color={ticket.priority === 'critical' ? 'error' : ticket.priority === 'high' ? 'warning' : ticket.priority === 'medium' ? 'info' : 'success'} 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ticket.status.replace('_', ' ')} 
                            size="small" 
                            variant="outlined" 
                            color={ticket.status === 'open' ? 'error' : ticket.status === 'resolved' ? 'success' : ticket.status === 'closed' ? 'default' : 'warning'} 
                          />
                        </TableCell>
                        <TableCell>
                          {isAssignedToMe && ticket.status !== 'resolved' && ticket.status !== 'closed' ? (
                            <CountdownTimer 
                              createdAt={ticket.created_at}
                              priority={ticket.priority}
                              status={ticket.status}
                              ticketId={ticket.id}
                              onEscalate={handleEscalateTicket}
                            />
                          ) : (
                            <Typography variant="caption" color="textSecondary">
                              {ticket.status === 'resolved' ? 'Completed' : 'N/A'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={deadline < new Date() && ticket.status !== 'resolved' ? 'error' : 'textSecondary'}>
                            {format(deadline, 'MMM dd, HH:mm')}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Tooltip title="View Timeline">
                              <IconButton size="small" onClick={() => handleOpenTimeline(ticket)}>
                                <Timeline fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {isAssignedToMe && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                              <Tooltip title="Mark as Resolved">
                                <IconButton 
                                  size="small" 
                                  color="success" 
                                  onClick={() => handleOpenResolveDialog(ticket)}
                                >
                                  <DoneAll fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isSelfAssignable && (
                              <Tooltip title="Self Assign to this Ticket">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleSelfAssign(ticket)}
                                  disabled={assigning}
                                >
                                  <PersonAdd fontSize="small" />
                                </IconButton>
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
            {displayTickets.length > 0 && (
              <TablePagination 
                component="div" 
                count={displayTickets.length} 
                rowsPerPage={rowsPerPage} 
                page={page} 
                onPageChange={(e, n) => setPage(n)} 
                onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))} 
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            )}
          </TableContainer>
        </>
      )}

      <TicketTimelineDialog 
        ticket={selectedTicket}
        open={timelineDialogOpen}
        onClose={() => setTimelineDialogOpen(false)}
      />

      <ResolveTicketDialog 
        open={resolveDialogOpen}
        ticket={resolvingTicket}
        onClose={() => setResolveDialogOpen(false)}
        onConfirm={handleResolveTicket}
      />
    </Box>
  );
};

export default MyTicket;