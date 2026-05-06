// src/components/Auth/Register.jsx
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
  Grid,
  Stack,
} from '@mui/material';
import {
  PersonAdd,
  Email,
  Lock,
  Person,
  Phone,
  Badge,
  Assignment,
} from '@mui/icons-material';
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

// Public Registration Form with Background Effects - SCALED to 78%
const PublicRegistrationForm = ({ isAdmin, loading, error, success, onSubmit, control, errors, getUserTypes }) => (
  <Box
    sx={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
      overflow: 'hidden',
    }}
  >
    {/* Frolgate Logo as Watermark - Full size background */}
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 0.1,
        zIndex: 0,
        pointerEvents: 'none',
        textAlign: 'center',
        width: '100%',
      }}
    >
      <img 
        src="/frolgate logo vector.png" 
        alt="Frolgate Logo"
        style={{
          maxWidth: '500px',
          width: '70%',
          height: 'auto',
          filter: 'brightness(0) invert(1)',
        }}
      />
    </Box>

    {/* Floating animated shapes - Background effects */}
    <Box
      sx={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        animation: 'float 20s infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '50%': { transform: 'translate(50px, 50px) rotate(180deg)' },
        },
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        bottom: '10%',
        right: '5%',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        animation: 'float 15s infinite reverse',
      }}
    />

    {/* Content wrapper - SCALED to 78% */}
    <Box
      sx={{
        width: '100%',
        transform: 'scale(0.78)',
        transformOrigin: 'center center',
      }}
    >
      <Container component="main" maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4} alignItems="center">
          {/* Left side - Info section */}
          <Grid item xs={12} md={5}>
            <Box sx={{ px: 3 }}>
              <Box sx={{ mb: 4 }}>
                <img 
                  src="/frolgate logo vector.png" 
                  alt="Frolgate"
                  style={{
                    height: '70px',
                    width: 'auto',
                    filter: 'brightness(0) invert(1)',
                  }}
                />
              </Box>
              
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 'bold',
                  mb: 2,
                  color: 'white',
                  fontSize: { xs: '2rem', md: '2.2rem' },
                }}
              >
                Join Us Today
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  mb: 4,
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 'normal',
                }}
              >
                Create an account to start managing your support tickets
              </Typography>

              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'rgba(255,255,255,0.8)' }}>✓</Box>
                  <Typography sx={{ color: 'white' }}>Track your support tickets</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'rgba(255,255,255,0.8)' }}>✓</Box>
                  <Typography sx={{ color: 'white' }}>Get real-time updates</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'rgba(255,255,255,0.8)' }}>✓</Box>
                  <Typography sx={{ color: 'white' }}>24/7 support availability</Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>

          {/* Right side - Registration Form */}
          <Grid item xs={12} md={7}>
            <Paper
              elevation={24}
              sx={{
                padding: { xs: 3, md: 4 },
                width: '100%',
                maxWidth: '550px',
                borderRadius: 3,
                backgroundColor: 'white',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                mx: 'auto',
              }}
            >
              <Box
                sx={{
                  width: 65,
                  height: 65,
                  background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  mx: 'auto',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                }}
              >
                <PersonAdd sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              
              <Typography 
                component="h1" 
                variant="h4" 
                sx={{ 
                  mb: 1, 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Create Account
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Fill in your details to get started
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                  Registration successful! Redirecting to dashboard...
                </Alert>
              )}

              <form onSubmit={onSubmit}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  <Controller
                    name="first_name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="First Name"
                        fullWidth
                        size="small"
                        error={!!errors.first_name}
                        helperText={errors.first_name?.message}
                        disabled={loading}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                        size="small"
                        error={!!errors.last_name}
                        helperText={errors.last_name?.message}
                        disabled={loading}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                      margin="dense"
                      size="small"
                      error={!!errors.username}
                      helperText={errors.username?.message}
                      disabled={loading}
                      autoComplete="username"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      InputProps={{
                        startAdornment: <Person sx={{ mr: 1, color: '#1565c0', fontSize: '0.9rem' }} />,
                      }}
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
                      margin="dense"
                      size="small"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      disabled={loading}
                      autoComplete="email"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      InputProps={{
                        startAdornment: <Email sx={{ mr: 1, color: '#1565c0', fontSize: '0.9rem' }} />,
                      }}
                    />
                  )}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1, mb: 1 }}>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Password"
                        type="password"
                        fullWidth
                        size="small"
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        disabled={loading}
                        autoComplete="new-password"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        InputProps={{
                          startAdornment: <Lock sx={{ mr: 1, color: '#1565c0', fontSize: '0.9rem' }} />,
                        }}
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
                        size="small"
                        error={!!errors.password2}
                        helperText={errors.password2?.message}
                        disabled={loading}
                        autoComplete="new-password"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        InputProps={{
                          startAdornment: <Lock sx={{ mr: 1, color: '#1565c0', fontSize: '0.9rem' }} />,
                        }}
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
                      margin="dense"
                      size="small"
                      error={!!errors.user_type}
                      helperText={errors.user_type?.message}
                      disabled={loading}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {getUserTypes().map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {option.icon}
                            {option.label}
                          </Box>
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
                      margin="dense"
                      size="small"
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                      disabled={loading}
                      autoComplete="tel"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      InputProps={{
                        startAdornment: <Phone sx={{ mr: 1, color: '#1565c0', fontSize: '0.9rem' }} />,
                      }}
                    />
                  )}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{
                    mt: 2,
                    mb: 1.5,
                    py: 1,
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0d47a1 0%, #0a3d8f 100%)',
                    },
                  }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Sign Up'}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Already have an account?{' '}
                    <Link component={RouterLink} to="/login" variant="caption" sx={{ color: '#1565c0', fontWeight: 'bold' }}>
                      Sign in
                    </Link>
                  </Typography>
                </Box>
              </form>
            </Paper>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem' }}>
            © {new Date().getFullYear()} Frolgate Help Desk. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  </Box>
);

// Admin Registration Form (embedded in DashboardLayout - no background effects)
const AdminRegistrationForm = ({ isAdmin, loading, error, success, onSubmit, control, errors, getUserTypes }) => (
  <Container component="main" maxWidth="md" sx={{ py: 4 }}>
    <Paper
      elevation={3}
      sx={{
        padding: { xs: 3, md: 4 },
        width: '100%',
        maxWidth: '600px',
        borderRadius: 2,
        backgroundColor: 'white',
        mx: 'auto',
      }}
    >
      <Box
        sx={{
          width: 60,
          height: 60,
          background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          mx: 'auto',
        }}
      >
        <PersonAdd sx={{ color: 'white', fontSize: 30 }} />
      </Box>
      
      <Typography 
        component="h1" 
        variant="h4" 
        sx={{ 
          mb: 1, 
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#1a237e',
        }}
      >
        Create New User
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
        Fill in the details to add a new user to the system
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          User created successfully! You can create another user.
        </Alert>
      )}

      <form onSubmit={onSubmit}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <Controller
            name="first_name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="First Name"
                fullWidth
                size="small"
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
                size="small"
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
              margin="dense"
              size="small"
              error={!!errors.username}
              helperText={errors.username?.message}
              disabled={loading}
              autoComplete="username"
              InputProps={{
                startAdornment: <Person sx={{ mr: 1, color: '#1565c0' }} />,
              }}
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
              margin="dense"
              size="small"
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={loading}
              autoComplete="email"
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: '#1565c0' }} />,
              }}
            />
          )}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1, mb: 1 }}>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                fullWidth
                size="small"
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={loading}
                autoComplete="new-password"
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: '#1565c0' }} />,
                }}
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
                size="small"
                error={!!errors.password2}
                helperText={errors.password2?.message}
                disabled={loading}
                autoComplete="new-password"
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: '#1565c0' }} />,
                }}
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
              margin="dense"
              size="small"
              error={!!errors.user_type}
              helperText={errors.user_type?.message}
              disabled={loading}
            >
              {getUserTypes().map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option.icon}
                    {option.label}
                  </Box>
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
              margin="dense"
              size="small"
              error={!!errors.phone}
              helperText={errors.phone?.message}
              disabled={loading}
              autoComplete="tel"
              InputProps={{
                startAdornment: <Phone sx={{ mr: 1, color: '#1565c0' }} />,
              }}
            />
          )}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{
            mt: 2,
            mb: 1.5,
            py: 1,
            background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            '&:hover': {
              background: 'linear-gradient(135deg, #0d47a1 0%, #0a3d8f 100%)',
            },
          }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Create User'}
        </Button>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <Link component={RouterLink} to="/admin/users" variant="body2" sx={{ color: '#1565c0' }}>
              Back to User Management
            </Link>
          </Typography>
        </Box>
      </form>
    </Paper>
  </Container>
);

const RegisterContent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { register: registerUser, user } = useAuth();
  const navigate = useNavigate();

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

  const getUserTypes = () => {
    if (isAdmin) {
      return [
        { value: 'client', label: 'Client', icon: <Person /> },
        { value: 'engineer', label: 'Engineer / Sales', icon: <Assignment /> },
        { value: 'admin', label: 'Administrator', icon: <Badge /> },
      ];
    } else {
      return [
        { value: 'client', label: 'Client', icon: <Person /> },
      ];
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setApiError(null);

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
    
    if (result.success) {
      setSuccess(true);
      reset();
      
      setTimeout(() => {
        if (isAdmin) {
          setSuccess(false);
          reset();
          setError('');
        } else {
          navigate('/dashboard');
        }
      }, 2000);
    } else {
      if (result.error) {
        if (typeof result.error === 'string') {
          setError(result.error);
        } else if (result.error.detail) {
          setError(result.error.detail);
        } else if (result.error.non_field_errors) {
          setError(result.error.non_field_errors[0]);
        } else {
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

  // If admin is logged in, render inside DashboardLayout (no background effects)
  if (isAdmin) {
    return (
      <DashboardLayout>
        <AdminRegistrationForm 
          isAdmin={isAdmin}
          loading={loading}
          error={error}
          success={success}
          onSubmit={handleSubmit(onSubmit)}
          control={control}
          errors={errors}
          getUserTypes={getUserTypes}
        />
      </DashboardLayout>
    );
  }

  // For public registration (non-logged in users), show background effects
  return (
    <PublicRegistrationForm 
      isAdmin={isAdmin}
      loading={loading}
      error={error}
      success={success}
      onSubmit={handleSubmit(onSubmit)}
      control={control}
      errors={errors}
      getUserTypes={getUserTypes}
    />
  );
};

const Register = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user && user.user_type !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  return <RegisterContent />;
};

export default Register;