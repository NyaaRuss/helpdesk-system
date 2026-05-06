import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Alert, CircularProgress,
  TextField, Grid, Card, CardContent, Divider
} from '@mui/material';
import {
  Email, Refresh, Send, CheckCircle, Error as ErrorIcon
} from '@mui/icons-material';
import { ticketAPI } from '../../api/api';

const EmailProcessingPanel = () => {
  const [processing, setProcessing] = useState(false);
  const [testEmail, setTestEmail] = useState({
    from_email: '',
    subject: '',
    body: ''
  });
  const [testResult, setTestResult] = useState(null);
  const [processResult, setProcessResult] = useState(null);
  const [error, setError] = useState('');

  const handleProcessEmails = async () => {
    setProcessing(true);
    setError('');
    setProcessResult(null);
    
    try {
      const response = await ticketAPI.processEmails();
      setProcessResult(response.data);
    } catch (err) {
      setError('Failed to process emails: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.from_email) {
      setError('Please enter a test email address');
      return;
    }
    
    setProcessing(true);
    setError('');
    setTestResult(null);
    
    try {
      const response = await ticketAPI.testEmailToTicket(testEmail);
      setTestResult(response.data);
    } catch (err) {
      setError('Test failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleTestInputChange = (field) => (e) => {
    setTestEmail(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
        Email Processing
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Manage inbound email processing for ticket creation and comments
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Process Emails Panel */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Email sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Process Incoming Emails</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Check the helpdesk inbox for new emails and convert them to tickets or comments.
            </Typography>
            
            <Button
              variant="contained"
              startIcon={processing ? <CircularProgress size={20} /> : <Refresh />}
              onClick={handleProcessEmails}
              disabled={processing}
              fullWidth
            >
              {processing ? 'Processing...' : 'Process Emails Now'}
            </Button>

            {processResult && (
              <Box sx={{ mt: 3, p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" /> Processing Complete
                </Typography>
                <Typography variant="body2">
                  📧 Emails Processed: {processResult.processed || 0}
                </Typography>
                <Typography variant="body2">
                  🎫 Tickets Created: {processResult.tickets_created || 0}
                </Typography>
                <Typography variant="body2">
                  💬 Comments Added: {processResult.comments_added || 0}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Test Email Panel */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Send sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="h6">Test Email to Ticket</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Simulate an incoming email to test the system.
            </Typography>
            
            <TextField
              fullWidth
              label="From Email"
              placeholder="client@example.com"
              value={testEmail.from_email}
              onChange={handleTestInputChange('from_email')}
              margin="dense"
              size="small"
            />
            <TextField
              fullWidth
              label="Subject"
              placeholder="Test Ticket Subject"
              value={testEmail.subject}
              onChange={handleTestInputChange('subject')}
              margin="dense"
              size="small"
            />
            <TextField
              fullWidth
              label="Body"
              placeholder="Ticket description..."
              multiline
              rows={3}
              value={testEmail.body}
              onChange={handleTestInputChange('body')}
              margin="dense"
              size="small"
            />
            
            <Button
              variant="outlined"
              startIcon={processing ? <CircularProgress size={20} /> : <Send />}
              onClick={handleTestEmail}
              disabled={processing || !testEmail.from_email}
              fullWidth
              sx={{ mt: 2 }}
            >
              Send Test Email
            </Button>

            {testResult && (
              <Box sx={{ mt: 3, p: 2, bgcolor: testResult.error ? '#ffebee' : '#e8f5e9', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {testResult.error ? <ErrorIcon color="error" /> : <CheckCircle color="success" />}
                  {testResult.error ? 'Test Failed' : 'Test Successful'}
                </Typography>
                {testResult.ticket_number && (
                  <Typography variant="body2">
                    🎫 Created Ticket: {testResult.ticket_number}
                  </Typography>
                )}
                {testResult.comment_added && (
                  <Typography variant="body2">
                    💬 Comment added to ticket
                  </Typography>
                )}
                {testResult.error && (
                  <Typography variant="body2" color="error">
                    Error: {testResult.error}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Instructions Panel */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          📧 Email Integration Guide
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Creating Tickets via Email</Typography>
            <Typography variant="body2" color="textSecondary">
              Simply send an email to the helpdesk email address. The system will:
            </Typography>
            <ul>
              <li>Automatically create a user account if the email is new</li>
              <li>Create a ticket with the email subject as title</li>
              <li>Send confirmation email with ticket details</li>
              <li>Notify admins and engineers</li>
            </ul>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Adding Comments via Email</Typography>
            <Typography variant="body2" color="textSecondary">
              To add a comment to an existing ticket, include the ticket number in the subject line:
            </Typography>
            <ul>
              <li>Format: "Re: TICKET-XXXXX" or "[TICKET-XXXXX]"</li>
              <li>Reply to any email notification from the system</li>
              <li>Your reply will be added as a comment</li>
              <li>All participants will be notified</li>
            </ul>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default EmailProcessingPanel;