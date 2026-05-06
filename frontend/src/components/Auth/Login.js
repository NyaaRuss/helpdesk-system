// src/components/Auth/Login.jsx
import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Link,
  CircularProgress,
  Grid,
  Divider,
  Stack,
} from '@mui/material';
import {
  LockOutlined,
  Visibility,
  VisibilityOff,
  Person,
  Business,
  SupportAgent,
  Security,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      const errorMsg = result.error?.detail || 
                      result.error?.non_field_errors?.[0] || 
                      'Invalid credentials. Please try again.';
      setError(errorMsg);
    }
    
    setLoading(false);
  };

  const features = [
    { icon: <SupportAgent />, title: '24/7 Support', description: 'Round the clock assistance' },
    { icon: <Security />, title: 'Secure Platform', description: 'Enterprise-grade security' },
    { icon: <Business />, title: 'Multi-tenant', description: 'Support multiple departments' },
  ];

  return (
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
          opacity: 0.15,
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
            maxWidth: '600px',
            width: '80%',
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
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          right: '15%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          animation: 'float 25s infinite',
        }}
      />

      {/* Content wrapper - ONLY THIS IS SCALED to 80% */}
      <Box
        sx={{
          width: '100%',
          transform: 'scale(0.8)',
          transformOrigin: 'center center',
        }}
      >
        <Container component="main" maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            {/* Left side - Features section */}
            <Grid item xs={12} md={6}>
              <Box sx={{ px: 3 }}>
                {/* Company Logo - Visible */}
                <Box sx={{ mb: 4 }}>
                  <img 
                    src="/frolgate logo vector.png" 
                    alt="Frolgate"
                    style={{
                      height: '80px',
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
                    fontSize: { xs: '2rem', md: '2.5rem' },
                  }}
                >
                  Welcome Back
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 4,
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 'normal',
                  }}
                >
                  Sign in to access your help desk dashboard and manage support tickets
                </Typography>
                
                <Stack spacing={3} sx={{ mt: 4 }}>
                  {features.map((feature, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {React.cloneElement(feature.icon, { sx: { color: 'white', fontSize: 28 } })}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white' }}>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          {feature.description}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>

                {/* Testimonial */}
                <Box
                  sx={{
                    mt: 6,
                    p: 3,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderLeft: '4px solid white',
                  }}
                >
                  <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, color: 'rgba(255,255,255,0.9)' }}>
                    "To Enable and Empower people and businesses to archive more with less"
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    — Nyasha Zhou, IT 
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Right side - Login form */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Paper
                  elevation={24}
                  sx={{
                    padding: { xs: 3, md: 4 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: '500px',
                    borderRadius: 3,
                    backgroundColor: 'white',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    mx: 'auto',
                  }}
                >
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <LockOutlined sx={{ color: 'white', fontSize: 35 }} />
                  </Box>
                  
                  <Typography 
                    component="h1" 
                    variant="h4" 
                    sx={{ 
                      mb: 1, 
                      fontWeight: 'bold',
                      background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    Sign In
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Enter your credentials to access your account
                  </Typography>

                  {error && (
                    <Alert 
                      severity="error" 
                      sx={{ width: '100%', mb: 2, borderRadius: 2 }}
                      onClose={() => setError('')}
                    >
                      {error}
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="username"
                      label="Username or Email"
                      name="username"
                      autoComplete="username"
                      autoFocus
                      value={formData.username}
                      onChange={handleChange}
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: '#1565c0',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1565c0',
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person sx={{ color: '#1565c0' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          '&:hover fieldset': {
                            borderColor: '#1565c0',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#1565c0',
                          },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlined sx={{ color: '#1565c0' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              disabled={loading}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      sx={{
                        mt: 3,
                        mb: 2,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #0d47a1 0%, #0a3d8f 100%)',
                        },
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <CircularProgress size={24} sx={{ color: 'white' }} />
                      ) : (
                        'Sign In'
                      )}
                    </Button>

                    <Divider sx={{ my: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        OR
                      </Typography>
                    </Divider>

                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Don't have an account?{' '}
                        <Link 
                          component={RouterLink} 
                          to="/register" 
                          variant="body2"
                          sx={{ 
                            color: '#1565c0',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          Create an account
                        </Link>
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                      <Link 
                        component={RouterLink} 
                        to="/forgot-password" 
                        variant="body2"
                        sx={{ 
                          color: '#1565c0',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        Forgot Password?
                      </Link>
                    </Box>
                  </form>
                </Paper>
              </Box>
            </Grid>
          </Grid>

          {/* Footer */}
          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              © {new Date().getFullYear()} Frolgate Help Desk. All rights reserved. | 
              <Link href="#" sx={{ color: 'rgba(255,255,255,0.7)', ml: 1, textDecoration: 'none' }}>
                Privacy Policy
              </Link> | 
              <Link href="#" sx={{ color: 'rgba(255,255,255,0.7)', ml: 1, textDecoration: 'none' }}>
                Terms of Service
              </Link>
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Login;