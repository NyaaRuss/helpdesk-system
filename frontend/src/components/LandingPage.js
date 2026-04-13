import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
  Container, 
  Card,
  Grid,
  alpha,
  useTheme,
  Stack
} from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
          top: '-200px',
          right: '-100px',
          animation: 'float 8s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
            '50%': { transform: 'translateY(-20px) rotate(5deg)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.06)} 0%, transparent 70%)`,
          bottom: '-100px',
          left: '-100px',
          animation: 'float 10s ease-in-out infinite reverse',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
            '50%': { transform: 'translateY(-15px) rotate(-5deg)' },
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
            <SpeedIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <SecurityIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
          </Stack>
          
          <Typography 
            variant="h2" 
            fontWeight={800} 
            gutterBottom
            sx={{ 
              fontSize: { xs: '2rem', md: '3.5rem' },
              background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Frolgate Technology Group
          </Typography>
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary', 
              fontWeight: 400,
              maxWidth: 500,
              mx: 'auto',
              opacity: 0.8
            }}
          >
            Enterprise solutions for modern businesses
          </Typography>
        </Box>

        {/* System Cards */}
        <Grid container spacing={4} justifyContent="center">
          {/* Help Desk Card */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4,
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                '&:hover': {
                  transform: 'translateY(-12px)',
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  boxShadow: `0 25px 50px ${alpha(theme.palette.primary.main, 0.15)}`,
                }
              }}
            >
              {/* Gradient Border Effect */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }}
              />
              
              <Box sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '20px',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    boxShadow: `0 10px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  <SupportAgentIcon sx={{ fontSize: 35, color: 'white' }} />
                </Box>
                
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Help Desk
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.7 }}>
                  Technical support, ticket management, and client assistance portal for seamless service delivery.
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      For Clients
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      Submit & Track Tickets
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      For Engineers
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      Resolve & Manage
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      For Admins
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      Oversee Operations
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 10px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                    }
                  }}
                  endIcon={<ArrowForwardIcon />}
                >
                  Access Help Desk
                </Button>
              </Box>
            </Card>
          </Grid>

          {/* IMS Card */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4,
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                '&:hover': {
                  transform: 'translateY(-12px)',
                  borderColor: alpha(theme.palette.secondary.main, 0.3),
                  boxShadow: `0 25px 50px ${alpha(theme.palette.secondary.main, 0.15)}`,
                }
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                }}
              />
              
              <Box sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '20px',
                    background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    boxShadow: `0 10px 20px ${alpha(theme.palette.secondary.main, 0.3)}`,
                  }}
                >
                  <BusinessIcon sx={{ fontSize: 35, color: 'white' }} />
                </Box>
                
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Enterprise IMS
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.7 }}>
                  Corporate operations, employee records, and internal resources for comprehensive group management.
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      HR Management
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      Employee Records
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Operations
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      Resource Planning
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Analytics
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      Performance Tracking
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={() => window.location.href = 'https://internal.frolgate.com'}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 10px 20px ${alpha(theme.palette.secondary.main, 0.3)}`,
                    }
                  }}
                  endIcon={<ArrowForwardIcon />}
                >
                  Access IMS
                </Button>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.disabled', opacity: 0.7 }}>
            © {new Date().getFullYear()} Frolgate Technology Group. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default LandingPage;