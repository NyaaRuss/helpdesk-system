import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Snackbar,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const schema = yup.object().shape({
  title: yup.string().required('Title is required').max(200),
  description: yup.string().required('Description is required'),
  category: yup.string().required('Category is required'),
});

const CreateTicket = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdTicketNumber, setCreatedTicketNumber] = useState('');
  const [showNotificationSent, setShowNotificationSent] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdminOrEngineer = user?.user_type === 'admin' || user?.user_type === 'engineer';

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category: 'technical',
      priority: 'medium',
    },
  });

  const categories = [
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing' },
    { value: 'account', label: 'Account Issue' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'other', label: 'Other' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'default' },
    { value: 'medium', label: 'Medium', color: 'info' },
    { value: 'high', label: 'High', color: 'warning' },
    { value: 'critical', label: 'Critical', color: 'error' },
  ];

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');
    setCreatedTicketNumber('');

    const ticketData = {
      title: data.title,
      description: data.description,
      category: data.category,
    };

    if (isAdminOrEngineer && data.priority) {
      ticketData.priority = data.priority;
    }

    try {
      const response = await ticketAPI.createTicket(ticketData);
      console.log('Response:', response.data);
      
      // Get ticket number from response
      const ticketNumber = response.data.ticket_number || 
                          response.data.data?.ticket_number || 
                          'Created';
      const ticketId = response.data.id || response.data.data?.id;
      
      setCreatedTicketNumber(ticketNumber);
      setSuccess(`✅ Ticket ${ticketNumber} has been created successfully!`);
      
      setShowNotificationSent(true);
      reset();
      
      // Redirect after 3 seconds
      setTimeout(() => {
        if (ticketId) {
          navigate(`/tickets/${ticketId}`);
        } else if (user?.user_type === 'admin') {
          navigate('/admin/tickets');
        } else if (user?.user_type === 'engineer') {
          navigate('/engineer/tickets');
        } else {
          navigate('/tickets');
        }
      }, 3000);
      
    } catch (err) {
      console.error('Create ticket error:', err);
      let errorMessage = 'Failed to create ticket. Please try again.';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Create New Ticket
        </Typography>
        <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 4 }}>
          {user?.user_type === 'client' 
            ? "Submit your issue or request. Our support team will review and prioritize it."
            : "Fill in the details below to create a new support ticket"}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Ticket Title"
                    fullWidth
                    required
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    placeholder="Brief description of your issue"
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Category"
                    fullWidth
                    required
                    error={!!errors.category}
                    helperText={errors.category?.message}
                    disabled={loading}
                  >
                    {categories.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {isAdminOrEngineer && (
              <Grid item xs={12}>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Priority"
                      fullWidth
                      error={!!errors.priority}
                      helperText={errors.priority?.message}
                      disabled={loading}
                      SelectProps={{
                        renderValue: (selected) => {
                          const priority = priorities.find(p => p.value === selected);
                          return priority ? (
                            <Chip
                              label={priority.label}
                              color={priority.color}
                              size="small"
                            />
                          ) : selected;
                        },
                      }}
                    >
                      {priorities.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Chip
                            label={option.label}
                            color={option.color}
                            size="small"
                            sx={{ width: 80 }}
                          />
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    multiline
                    rows={6}
                    fullWidth
                    required
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    placeholder="Please provide detailed information about your issue..."
                    disabled={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (user?.user_type === 'admin') {
                      navigate('/admin/tickets');
                    } else if (user?.user_type === 'engineer') {
                      navigate('/engineer/tickets');
                    } else {
                      navigate('/tickets');
                    }
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading && <CircularProgress size={20} />}
                >
                  {loading ? 'Creating...' : 'Create Ticket'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar
        open={showNotificationSent}
        autoHideDuration={6000}
        onClose={() => setShowNotificationSent(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          📧 Email notifications have been sent to all engineers and admins!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateTicket;