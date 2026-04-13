import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, 
  TextField, Button, Grid, CircularProgress
} from '@mui/material';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '../Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api'; 

const SLAPage = () => {
  const { user } = useAuth();
  const [slas, setSlas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 1. ADDED 'scope' TO INITIAL STATE
  const [formData, setFormData] = useState({
    client_name: '',
    service_type: '',
    scope: '', 
    date_entered: '',
    expiry_date: '',
    description: ''
  });

  const fetchSLAs = async () => {
    try {
      const response = await api.get('/tickets/slas/');
      setSlas(response.data);
    } catch (error) {
      console.error("Error fetching SLAs:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user_type === 'admin' || user?.user_type === 'engineer') {
      fetchSLAs();
    }
  }, [user]);

  if (user && user.user_type === 'client') {
    return <Navigate to="/dashboard" />;
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddSLA = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 2. SENDING DATA TO BACKEND
      await api.post('/tickets/slas/', formData);
      await fetchSLAs();
      // Reset form including scope
      setFormData({ 
        client_name: '', service_type: '', scope: '', 
        date_entered: '', expiry_date: '', description: '' 
      });
    } catch (error) {
      alert("Error saving SLA record. Make sure the backend accepts 'scope' field.");
    } finally {
      setSubmitting(false);
    }
  };

  const getSLAStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: "Expired", color: "error" };
    if (diffDays <= 90) return { label: "Due Soon", color: "warning" };
    return { label: "Active", color: "success" };
  };

  return (
    <DashboardLayout>
      <Box p={3}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a237e' }}>
          SLA Management
        </Typography>
        
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1a237e' }}>Register New SLA</Typography>
          <form onSubmit={handleAddSLA}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Client Name" name="client_name" value={formData.client_name} onChange={handleInputChange} required size="small" />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Service Type" name="service_type" value={formData.service_type} onChange={handleInputChange} required size="small" />
              </Grid>
              
              {/* 3. SCOPE INPUT FIELD */}
              <Grid item xs={12} md={2}>
                <TextField 
                  fullWidth 
                  label="Scope" 
                  name="scope" 
                  value={formData.scope} 
                  onChange={handleInputChange} 
                  required 
                  size="small" 
                  placeholder="e.g. 8x5 or 24x7"
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Start Date" name="date_entered" type="date" value={formData.date_entered} onChange={handleInputChange} required size="small" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Expiry Date" name="expiry_date" type="date" value={formData.expiry_date} onChange={handleInputChange} required size="small" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} md={10}>
                <TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleInputChange} size="small" multiline rows={1} />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  type="submit" 
                  disabled={submitting} 
                  sx={{ height: '100%', bgcolor: '#1a237e', '&:hover': { bgcolor: '#0d1440' } }}
                >
                  {submitting ? <CircularProgress size={24} color="inherit" /> : "Save SLA"}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>

        {loading ? (
          <Box display="flex" justifyContent="center"><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Client Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
                  
                  {/* 4. SCOPE TABLE HEADER (BEFORE DATES) */}
                  <TableCell sx={{ fontWeight: 'bold' }}>Scope</TableCell>
                  
                  <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No records found.</TableCell>
                  </TableRow>
                ) : (
                  slas.map((sla) => {
                    const statusInfo = getSLAStatus(sla.expiry_date);
                    return (
                      <TableRow key={sla.id} hover>
                        <TableCell>{sla.client_name}</TableCell>
                        <TableCell>{sla.service_type}</TableCell>
                        
                        {/* 5. SCOPE TABLE CELL */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#1a237e' }}>
                            {sla.scope || "N/A"}
                          </Typography>
                        </TableCell>

                        <TableCell>{sla.date_entered}</TableCell>
                        <TableCell>{sla.expiry_date}</TableCell>
                        <TableCell>
                          <Chip 
                            label={statusInfo.label} 
                            color={statusInfo.color} 
                            size="small" 
                            sx={{ fontWeight: 'bold', minWidth: '100px' }} 
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </DashboardLayout>
  );
};

export default SLAPage;