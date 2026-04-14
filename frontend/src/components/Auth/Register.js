import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  MenuItem,
  Link,
  CircularProgress,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../Layout/DashboardLayout';

const schema = yup.object().shape({
  username: yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  password: yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  password2: yup.string()
    .required('Confirm password is required')
    .oneOf([yup.ref('password'), null], 'Passwords must match'),
  user_type: yup.string().required('User type is required'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  phone: yup.string()
    .matches(/^[0-9+\-\s()]*$/, 'Invalid phone number format')
    .nullable(),
});

const RegisterContent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { register: registerUser, user } = useAuth();
  const navigate = useNavigate();

  // Check if current user is admin (when logged in)
  useEffect(() => {
    if (user && user.user_type === 'admin') {
      setIsAdmin(true);
    }
  }, [user]);

  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      password2: '',
      user_type: 'client',
      first_name: '',
      last_name: '',
      phone: '',
    },
  });

  // User types based on whether admin is logged in or not
  const getUserTypes = () => {
    if (isAdmin) {
      return [
        { value: 'client', label: 'Client' },
        { value: 'engineer', label: 'Engineer / Sales' },
        { value: 'admin', label: 'Administrator' },
      ];
    } else {
      // Non-logged in users or clients can only register as client
      return [
        { value: 'client', label: 'Client' },
      ];
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setApiError(null);

    console.log('Registration data:', data);

    const userData = {
      username: data.username,
      email: data.email,
      password: data.password,
      password2: data.password2,
      user_type: data.user_type,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || '',
    };

    const result = await registerUser(userData);
    console.log('Registration result:', result);
    
    if (result.success) {
      setSuccess(true);
      reset();
      
      setTimeout(() => {
        if (isAdmin) {
          // If admin created user, stay on register page to create more
          setSuccess(false);
          reset();
          setError('');
        } else {
          navigate('/dashboard');
        }
      }, 2000);
    } else {
      // Handle API errors
      if (result.error) {
        if (typeof result.error === 'string') {
          setError(result.error);
        } else if (result.error.detail) {
          setError(result.error.detail);
        } else if (result.error.non_field_errors) {
          setError(result.error.non_field_errors[0]);
        } else {
          // Handle field-specific errors
          const fieldErrors = [];
          for (const [field, messages] of Object.entries(result.error)) {
            if (Array.isArray(messages)) {
              fieldErrors.push(`${field}: ${messages[0]}`);
            } else {
              fieldErrors.push(`${field}: ${messages}`);
            }
          }
          setError(fieldErrors.join(', '));
        }
        setApiError(result.error);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
    
    setLoading(false);
  };

  // Different layout for admin vs non-admin
  const RegistrationForm = () => (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Typography component="h1" variant="h5" align="center" sx={{ mb: 3 }}>
            {isAdmin ? 'Create New User' : 'Create Account'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {isAdmin ? 'User created successfully! You can create another user.' : 'Registration successful! Redirecting to dashboard...'}
            </Alert>
          )}

          {apiError && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>API Error Details:</strong>
              </Typography>
              <Typography variant="body2">
                {JSON.stringify(apiError, null, 2)}
              </Typography>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Controller
                name="first_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name"
                    fullWidth
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message}
                    disabled={loading}
                  />
                )}
              />

              <Controller
                name="last_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name"
                    fullWidth
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message}
                    disabled={loading}
                  />
                )}
              />
            </Box>

            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Username"
                  fullWidth
                  margin="normal"
                  error={!!errors.username}
                  helperText={errors.username?.message}
                  disabled={loading}
                  autoComplete="username"
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  fullWidth
                  margin="normal"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={loading}
                  autoComplete="email"
                />
              )}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2, mb: 2 }}>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Password"
                    type="password"
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                )}
              />

              <Controller
                name="password2"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Confirm Password"
                    type="password"
                    fullWidth
                    error={!!errors.password2}
                    helperText={errors.password2?.message}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                )}
              />
            </Box>

            <Controller
              name="user_type"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="User Type"
                  fullWidth
                  margin="normal"
                  error={!!errors.user_type}
                  helperText={errors.user_type?.message}
                  disabled={loading}
                >
                  {getUserTypes().map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Phone Number (optional)"
                  fullWidth
                  margin="normal"
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  disabled={loading}
                  autoComplete="tel"
                />
              )}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? (isAdmin ? 'Creating User...' : 'Creating Account...') : (isAdmin ? 'Create User' : 'Sign Up')}
            </Button>

            {!isAdmin && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link component={RouterLink} to="/login" variant="body2">
                    Sign in
                  </Link>
                </Typography>
              </Box>
            )}

            {isAdmin && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <Link component={RouterLink} to="/admin/users" variant="body2">
                    Back to User Management
                  </Link>
                </Typography>
              </Box>
            )}

            {!isAdmin && (
              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" align="center">
                  Test Accounts (if available):
                </Typography>
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                  Client: client1 / password123
                </Typography>
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                  Engineer: engineer1 / password123
                </Typography>
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                  Admin: admin / admin123 or Nyasha / nyasha123
                </Typography>
              </Box>
            )}
          </form>
        </Paper>
      </Box>
    </Container>
  );

  // If admin is logged in, wrap with DashboardLayout
  if (isAdmin) {
    return (
      <DashboardLayout>
        <RegistrationForm />
      </DashboardLayout>
    );
  }

  // For non-admin users, return just the form without layout
  return <RegistrationForm />;
};

const Register = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // If user is already logged in and not admin, redirect to dashboard
  useEffect(() => {
    if (user && user.user_type !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  return <RegisterContent />;
};

export default Register;