// src/components/Engineer/SLAPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, 
  TextField, Button, Grid, Dialog, DialogTitle, DialogContent, 
  Stepper, Step, StepLabel, IconButton, Divider, Tabs, Tab,
  Card, CardContent, LinearProgress, Alert, Snackbar,
  TablePagination, InputAdornment, FormControl, InputLabel, Select,
  CircularProgress, Avatar, Tooltip, MenuItem  // ADDED MenuItem here
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  PersonAdd as PersonAddIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '../Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';

const SLAPage = () => {
  const { user } = useAuth();
  const [slas, setSlas] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [metrics, setMetrics] = useState({
    totalSLAs: 0,
    activeSLAs: 0,
    expiredSLAs: 0,
    nearExpiry: 0,
    onTimeRate: 0
  });
  
  // State for Progress Tracking
  const [selectedSla, setSelectedSla] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [actionLog, setActionLog] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState('');

  const [formData, setFormData] = useState({
    client_name: '',
    service_type: '',
    scope: '',
    date_entered: '',
    expiry_date: '',
    description: '',
    current_stage: 0,
    status: 'Active'
  });

  const slaStages = ["Requirements & Baselining", "Negotiation & Drafting", "Implementation & Tooling", "Operations & Monitoring", "Reporting & Audit", "Billing & Renewal"];

  const fetchSLAs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets/slas/');
      console.log("Fetched SLAs:", response.data);
      setSlas(response.data);
      calculateMetrics(response.data);
    } catch (error) {
      console.error("Error fetching SLAs:", error);
      showSnackbar('Error fetching SLAs', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEngineers = async () => {
    try {
      const response = await api.get('/auth/users/?user_type=engineer');
      setEngineers(response.data);
    } catch (error) {
      console.error("Error fetching engineers:", error);
    }
  };

  useEffect(() => {
    if (user?.user_type === 'admin' || user?.user_type === 'engineer') {
      fetchSLAs();
      fetchEngineers();
    }
  }, [user, fetchSLAs]);

  const calculateMetrics = (slaList) => {
    const now = new Date();
    const active = slaList.filter(s => new Date(s.expiry_date) > now && s.current_stage < 5);
    const expired = slaList.filter(s => new Date(s.expiry_date) < now && s.current_stage < 5);
    const nearExpiry = slaList.filter(s => {
      const diffDays = Math.ceil((new Date(s.expiry_date) - now) / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays > 0 && s.current_stage < 5;
    });
    
    const completed = slaList.filter(s => s.current_stage >= 5);
    const onTime = completed.filter(s => new Date(s.expiry_date) > new Date(s.date_entered));
    const onTimeRate = completed.length > 0 ? (onTime.length / completed.length) * 100 : 0;
    
    setMetrics({
      totalSLAs: slaList.length,
      activeSLAs: active.length,
      expiredSLAs: expired.length,
      nearExpiry: nearExpiry.length,
      onTimeRate: onTimeRate.toFixed(1)
    });
  };

  if (user && user.user_type === 'client') return <Navigate to="/dashboard" />;

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddSLA = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/tickets/slas/', formData);
      console.log("SLA Created:", response.data);
      showSnackbar('SLA created successfully!', 'success');
      
      setFormData({
        client_name: '', service_type: '', scope: '', date_entered: '', expiry_date: '',
        description: '', current_stage: 0, status: 'Active'
      });
      
      await fetchSLAs();
      setActiveTab(0);
      
    } catch (error) {
      console.error('Error saving SLA:', error);
      showSnackbar('Error saving SLA record: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignEngineer = async () => {
    if (!selectedEngineer) {
      showSnackbar('Please select an engineer', 'warning');
      return;
    }
    
    try {
      await api.post(`/tickets/slas/${selectedSla.id}/assign/`, {
        engineer_id: selectedEngineer
      });
      showSnackbar('Engineer assigned successfully', 'success');
      setAssignDialogOpen(false);
      setSelectedEngineer('');
      fetchSLAs();
    } catch (error) {
      console.error('Error assigning engineer:', error);
      showSnackbar('Error assigning engineer', 'error');
    }
  };

  const handleOpenProgress = (sla) => {
    setSelectedSla(sla);
    setActionLog("");
    setOpenModal(true);
  };

  const handleUpdateProgress = async () => {
    if (!actionLog.trim()) {
      showSnackbar('Please record what was done in this stage', 'warning');
      return;
    }

    const nextStage = selectedSla.current_stage + 1;
    const isCompleted = selectedSla.current_stage >= 5;

    const updatedData = {
      current_stage: isCompleted ? 6 : nextStage,
      status: isCompleted ? "Completed" : "Active",
      description: `${selectedSla.description || ""}\n\n[Stage ${selectedSla.current_stage + 1}: ${slaStages[selectedSla.current_stage]}] - ${new Date().toLocaleString()}\nCompleted by: ${user?.username}\nWork done: ${actionLog}\n`
    };

    try {
      const response = await api.patch(`/tickets/slas/${selectedSla.id}/`, updatedData);
      setSelectedSla(response.data);
      setActionLog("");
      fetchSLAs();
      if (isCompleted) {
        setOpenModal(false);
        showSnackbar('SLA completed successfully!', 'success');
      } else {
        showSnackbar(`Moved to ${slaStages[nextStage]} stage`, 'success');
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      showSnackbar('Failed to update progress', 'error');
    }
  };

  const getSLAStatus = (expiryDate, currentStage) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (currentStage >= 5) return { label: "Completed", color: "success" };
    if (diffDays < 0) return { label: "Expired", color: "error" };
    if (diffDays <= 30) return { label: "Due Soon", color: "warning" };
    if (diffDays <= 90) return { label: "At Risk", color: "info" };
    return { label: "Active", color: "success" };
  };

  const getDaysRemaining = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredSLAs = slas.filter(sla => {
    const matchesSearch = sla.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sla.service_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box p={3}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold', color: '#1a237e' }}>
          SLA Management
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Service Level Agreements - Track, monitor, and manage SLAs
        </Typography>

        {/* Metrics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#1976d2', color: 'white' }}>
              <CardContent>
                <Typography variant="body2">Total SLAs</Typography>
                <Typography variant="h4">{metrics.totalSLAs}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#4caf50', color: 'white' }}>
              <CardContent>
                <Typography variant="body2">Active</Typography>
                <Typography variant="h4">{metrics.activeSLAs}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#ff9800', color: 'white' }}>
              <CardContent>
                <Typography variant="body2">Near Expiry</Typography>
                <Typography variant="h4">{metrics.nearExpiry}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#f44336', color: 'white' }}>
              <CardContent>
                <Typography variant="body2">Expired</Typography>
                <Typography variant="h4">{metrics.expiredSLAs}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#9c27b0', color: 'white' }}>
              <CardContent>
                <Typography variant="body2">On-Time Rate</Typography>
                <Typography variant="h4">{metrics.onTimeRate}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="SLA List" />
            <Tab label="Create SLA" />
          </Tabs>
        </Paper>

        {/* Tab 0: SLA List */}
        {activeTab === 0 && (
          <>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={9}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by client or service..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start">🔍</InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button fullWidth variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSLAs}>
                    Refresh
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Current Stage</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Days Left</TableCell>
                    <TableCell>Assigned Engineers</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSLAs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((sla) => {
                    const status = getSLAStatus(sla.expiry_date, sla.current_stage);
                    const daysLeft = getDaysRemaining(sla.expiry_date);
                    const assignedEngineers = sla.assigned_engineers || [];
                    
                    return (
                      <TableRow key={sla.id} hover>
                        <TableCell>{sla.client_name}</TableCell>
                        <TableCell>{sla.service_type}</TableCell>
                        <TableCell>
                          <Chip label={slaStages[sla.current_stage]} variant="outlined" size="small" />
                          <LinearProgress 
                            variant="determinate" 
                            value={(sla.current_stage / 5) * 100} 
                            sx={{ mt: 1, height: 4, borderRadius: 2 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={status.label} color={status.color} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={daysLeft <= 30 ? 'error' : daysLeft <= 90 ? 'warning' : 'textSecondary'}>
                            {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {assignedEngineers.length > 0 ? (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {assignedEngineers.map((eng, idx) => (
                                <Tooltip key={idx} title={eng.username}>
                                  <Avatar sx={{ width: 28, height: 28, fontSize: 14, bgcolor: '#1976d2' }}>
                                    {eng.username?.charAt(0).toUpperCase() || 'E'}
                                  </Avatar>
                                </Tooltip>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="textSecondary">No engineers assigned</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="View Progress">
                              <IconButton onClick={() => handleOpenProgress(sla)} size="small">
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            {user?.user_type === 'admin' && (
                              <Tooltip title="Assign Engineer">
                                <IconButton onClick={() => {
                                  setSelectedSla(sla);
                                  setAssignDialogOpen(true);
                                }} size="small" color="primary">
                                  <PersonAddIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={filteredSLAs.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </TableContainer>
          </>
        )}

        {/* Tab 1: Create SLA Form */}
        {activeTab === 1 && (
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1a237e' }}>Create New SLA</Typography>
            <form onSubmit={handleAddSLA}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField 
                    fullWidth 
                    label="Client Name" 
                    name="client_name" 
                    value={formData.client_name} 
                    onChange={handleInputChange} 
                    required 
                    size="small" 
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField 
                    fullWidth 
                    label="Service Type" 
                    name="service_type" 
                    value={formData.service_type} 
                    onChange={handleInputChange} 
                    required 
                    size="small" 
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField 
                    fullWidth 
                    label="Scope" 
                    name="scope" 
                    value={formData.scope} 
                    onChange={handleInputChange} 
                    required 
                    size="small" 
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    name="date_entered"
                    type="date"
                    value={formData.date_entered}
                    onChange={handleInputChange}
                    required
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    name="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    required
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    multiline
                    rows={3}
                    size="small"
                    placeholder="Enter SLA details, terms, and conditions..."
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    type="submit" 
                    disabled={submitting} 
                    sx={{ bgcolor: '#1a237e' }}
                  >
                    {submitting ? 'Creating SLA...' : 'Create SLA'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        )}

        {/* Progress Modal */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white' }}>
            SLA Progress Tracking: {selectedSla?.client_name}
            <IconButton
              aria-label="close"
              onClick={() => setOpenModal(false)}
              sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <Stepper activeStep={selectedSla?.current_stage} alternativeLabel sx={{ pt: 3, pb: 2 }}>
              {slaStages.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box sx={{ mt: 2, mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>Time Remaining:</strong> {getDaysRemaining(selectedSla?.expiry_date)} days
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Assigned Engineers:</strong> {(selectedSla?.assigned_engineers || []).map(e => e.username).join(', ') || 'None'}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Log New Activity</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Current Stage: <strong>{slaStages[selectedSla?.current_stage]}</strong>
                </Typography>
                <TextField 
                  fullWidth 
                  multiline 
                  rows={4} 
                  placeholder={`What was done during the ${slaStages[selectedSla?.current_stage]} phase?`} 
                  value={actionLog}
                  onChange={(e) => setActionLog(e.target.value)}
                  variant="outlined"
                />
                <Button 
                  fullWidth 
                  variant="contained" 
                  onClick={handleUpdateProgress}
                  sx={{ mt: 2, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                  startIcon={<CheckCircleIcon />}
                  disabled={selectedSla?.current_stage >= 6}
                >
                  Mark Stage as Done & Proceed
                </Button>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Activity History</Typography>
                <Paper variant="outlined" sx={{ p: 2, height: '250px', overflowY: 'auto', bgcolor: '#fafafa' }}>
                  <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                    {selectedSla?.description || "No activity logs yet."}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>

        {/* Assign Engineer Dialog */}
        <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Assign Engineer to SLA</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, color: 'textSecondary' }}>
              Assigning to: <strong>{selectedSla?.client_name}</strong>
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select Engineer</InputLabel>
              <Select value={selectedEngineer} label="Select Engineer" onChange={(e) => setSelectedEngineer(e.target.value)}>
                {engineers.map(eng => (
                  <MenuItem key={eng.id} value={eng.id}>{eng.username}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button fullWidth variant="contained" onClick={handleAssignEngineer}>Assign</Button>
              <Button fullWidth variant="outlined" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </DashboardLayout>
  );
};

export default SLAPage;