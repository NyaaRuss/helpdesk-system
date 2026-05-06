// src/components/Auth/ForgotPassword.jsx
import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Link,
  Grid,
  Stack,
} from '@mui/material';
import { LockReset, Email, Verified, Lock, ArrowBack } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { authAPI } from '../../api/api';

const ForgotPassword = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const steps = ['Enter Email', 'Verify Code', 'Reset Password'];

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.requestPasswordReset(email);
      setSuccess(response.data.message || 'Password reset code sent to your email');
      setActiveStep(1);
    } catch (err) {
      const errorMessage = err.response?.data?.email?.[0] || 
                          err.response?.data?.message || 
                          err.response?.data?.error ||
                          'Failed to send reset code. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.verifyResetCode(email, code);
      setSuccess('Code verified successfully!');
      setActiveStep(2);
    } catch (err) {
      const errorMessage = err.response?.data?.code?.[0] || 
                          err.response?.data?.message || 
                          'Invalid or expired code. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.resetPassword(email, code, newPassword, confirmPassword);
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.code?.[0] || 
                          err.response?.data?.confirm_password?.[0] ||
                          err.response?.data?.message || 
                          'Failed to reset password. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = () => {
    switch (activeStep) {
      case 0: return <Email sx={{ fontSize: 40 }} />;
      case 1: return <Verified sx={{ fontSize: 40 }} />;
      case 2: return <Lock sx={{ fontSize: 40 }} />;
      default: return <LockReset sx={{ fontSize: 40 }} />;
    }
  };

  const getStepTitle = () => {
    switch (activeStep) {
      case 0: return 'Enter your email address';
      case 1: return 'Enter the verification code';
      case 2: return 'Create new password';
      default: return '';
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <form onSubmit={handleRequestCode}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder="Enter your registered email address"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              }}
              disabled={loading || !email}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send Reset Code'}
            </Button>
          </form>
        );
      
      case 1:
        return (
          <form onSubmit={handleVerifyCode}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Verification Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder="Enter 6-digit code"
              helperText="Check your email for the 6-digit verification code"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              }}
              disabled={loading || !code}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Verify Code'}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => setActiveStep(0)}
              disabled={loading}
              startIcon={<ArrowBack />}
              sx={{ color: '#1565c0' }}
            >
              Back to Email
            </Button>
          </form>
        );
      
      case 2:
        return (
          <form onSubmit={handleResetPassword}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              placeholder="Minimum 6 characters"
              helperText="Password must be at least 6 characters"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Re-enter your new password"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
              }}
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Reset Password'}
            </Button>
          </form>
        );
      
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Frolgate Logo as Watermark */}
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

      {/* Floating animated shapes */}
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

      <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <img 
                src="/frolgate logo vector.png" 
                alt="Frolgate"
                style={{
                  height: '60px',
                  width: 'auto',
                  filter: 'brightness(0) invert(1)',
                }}
              />
            </Box>
          </Grid>
        </Grid>

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
              borderRadius: 3,
              backgroundColor: 'white',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              }}
            >
              {getStepIcon()}
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
              Reset Password
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              {getStepTitle()}
            </Typography>

            <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
                {success}
              </Alert>
            )}

            {getStepContent(activeStep)}

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Remember your password?{' '}
                <Link component={RouterLink} to="/login" variant="body2" sx={{ color: '#1565c0', fontWeight: 'bold' }}>
                  Back to Login
                </Link>
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            © {new Date().getFullYear()} Frolgate Help Desk. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default ForgotPassword;