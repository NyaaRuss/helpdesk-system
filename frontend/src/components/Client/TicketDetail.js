import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Card,
  CardContent,
  CardHeader,
  Stack,
} from '@mui/material';
import {
  ArrowBack,
  Refresh,
  Chat as ChatIcon,
  Assignment,
  Description,
  History,
  CheckCircle,
  Error,
  HourglassEmpty,
  Send,
  Person,
  AccessTime,
  PriorityHigh,
  Category,
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ticketAPI } from '../../api/api';
import { format } from 'date-fns';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchTicketData();
    
    // Parse URL query for tab
    const query = new URLSearchParams(location.search);
    const tab = query.get('tab');
    if (tab === 'chat') setActiveTab(1);
    if (tab === 'history') setActiveTab(2);
  }, [id, location]);

  const fetchTicketData = async () => {
    setLoading(true);
    try {
      // Fetch ticket details
      const ticketResponse = await ticketAPI.getTicket(id);
      setTicket(ticketResponse.data);
      
      // Fetch messages
      const messagesResponse = await ticketAPI.getTicketMessages(id);
      setMessages(messagesResponse.data);
      
      // Fetch logs
      const logsResponse = await ticketAPI.getTicketLogs(id);
      setLogs(logsResponse.data);
      
      setError('');
    } catch (err) {
      setError('Failed to load ticket details. Please try again.');
      console.error('Error fetching ticket data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      await ticketAPI.sendMessage({
        ticket: id,
        content: newMessage.trim(),
      });
      
      setNewMessage('');
      fetchTicketData(); // Refresh data to show new message
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      open: { label: 'Open', color: 'error', icon: <Error /> },
      in_progress: { label: 'In Progress', color: 'warning', icon: <HourglassEmpty /> },
      pending_client: { label: 'Pending', color: 'info', icon: <HourglassEmpty /> },
      resolved: { label: 'Resolved', color: 'success', icon: <CheckCircle /> },
      closed: { label: 'Closed', color: 'default', icon: <CheckCircle /> },
      reopened: { label: 'Reopened', color: 'error', icon: <Error /> },
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="medium"
        sx={{ fontWeight: 'bold' }}
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
        size="medium"
        sx={{ fontWeight: 'bold' }}
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/tickets')} sx={{ mb: 3 }}>
          Back to Tickets
        </Button>
        <Alert severity="error">
          Ticket not found. It may have been deleted or you don't have permission to view it.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/tickets')} sx={{ mb: 1 }}>
            Back to Tickets
          </Button>
          <Typography variant="h4" gutterBottom>
            {ticket.title}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Ticket #{ticket.ticket_number}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchTicketData}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Description />} label="Details" />
          <Tab icon={<ChatIcon />} label="Chat" />
          <Tab icon={<History />} label="History" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Left Column - Ticket Info */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description /> Description
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {ticket.description}
              </Typography>
            </Paper>

            {/* Additional Info */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Additional Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Created Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(ticket.created_at)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(ticket.updated_at)}
                  </Typography>
                </Grid>
                {ticket.resolved_at && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Resolved Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(ticket.resolved_at)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Right Column - Ticket Metadata */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ticket Information
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {getStatusChip(ticket.status)}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Priority
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {getPriorityChip(ticket.priority)}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Category
                  </Typography>
                  <Chip
                    label={ticket.category.replace('_', ' ').toUpperCase()}
                    color="primary"
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Client
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {ticket.client?.first_name?.[0] || ticket.client?.username?.[0]}
                    </Avatar>
                    <Typography variant="body1">
                      {ticket.client?.first_name || ticket.client?.username}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Assigned Engineer
                  </Typography>
                  {ticket.engineer ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                        {ticket.engineer.first_name?.[0] || ticket.engineer.username?.[0]}
                      </Avatar>
                      <Typography variant="body1">
                        {ticket.engineer.first_name || ticket.engineer.username}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                      Not assigned yet
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>

            {/* Quick Actions */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<ChatIcon />}
                  onClick={() => setActiveTab(1)}
                  fullWidth
                >
                  Go to Chat
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchTicketData}
                  fullWidth
                >
                  Refresh Ticket
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Chat Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
              {/* Chat Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  Chat with Support
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Ticket #{ticket.ticket_number} - {ticket.title}
                </Typography>
              </Box>

              {/* Messages Container */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {messages.length === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color="textSecondary">
                      No messages yet. Start the conversation!
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {messages.map((message) => (
                      <ListItem
                        key={message.id}
                        alignItems="flex-start"
                        sx={{
                          flexDirection: message.sender?.user_type === 'client' ? 'row-reverse' : 'row',
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: message.sender?.user_type === 'client' ? 'primary.main' : 'secondary.main' }}>
                            {message.sender?.first_name?.[0] || message.sender?.username?.[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: message.sender?.user_type === 'client' ? 'flex-end' : 'flex-start',
                              gap: 1,
                              alignItems: 'center'
                            }}>
                              <Typography variant="subtitle2">
                                {message.sender?.first_name || message.sender?.username}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {formatDate(message.timestamp)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Paper 
                              sx={{ 
                                p: 2, 
                                mt: 1,
                                backgroundColor: message.sender?.user_type === 'client' ? 'primary.light' : 'grey.100',
                                color: message.sender?.user_type === 'client' ? 'primary.contrastText' : 'text.primary',
                                maxWidth: '70%',
                                ml: message.sender?.user_type === 'client' ? 'auto' : 0,
                                mr: message.sender?.user_type === 'client' ? 0 : 'auto',
                              }}
                            >
                              <Typography variant="body2">
                                {message.content}
                              </Typography>
                            </Paper>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs>
                    <TextField
                      fullWidth
                      multiline
                      maxRows={3}
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sendingMessage}
                    />
                  </Grid>
                  <Grid item>
                    <Button
                      variant="contained"
                      endIcon={<Send />}
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      {sendingMessage ? 'Sending...' : 'Send'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* History Tab */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History /> Activity Log
          </Typography>
          
          {logs.length === 0 ? (
            <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
              No activity recorded yet.
            </Typography>
          ) : (
            <List>
              {logs.map((log) => (
                <ListItem key={log.id} alignItems="flex-start" sx={{ py: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'grey.300' }}>
                      <AccessTime />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1">
                        {log.action}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="textSecondary">
                          By {log.user?.username || 'System'} • {formatDate(log.timestamp)}
                        </Typography>
                        {log.details && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {log.details}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default TicketDetail;