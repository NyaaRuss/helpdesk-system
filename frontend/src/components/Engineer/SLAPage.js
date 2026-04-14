import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, 
  TextField, Button, Grid,
  Dialog, DialogTitle, DialogContent, Stepper, Step, StepLabel, IconButton, Divider, 
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '../Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api'; 

const SLAPage = () => {
  const { user } = useAuth();
  const [slas, setSlas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // State for Progress Tracking
  const [selectedSla, setSelectedSla] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [actionLog, setActionLog] = useState(""); // Input for "what I did"

  const [formData, setFormData] = useState({
    client_name: '',
    service_type: '',
    scope: '', 
    date_entered: '',
    expiry_date: '',
    description: '',
    current_stage: 0
  });

  const slaStages = ["Baselining", "Negotiation", "Implementation", "Operations", "Reporting", "Billing"];

  const fetchSLAs = async () => {
    try {
      const response = await api.get('/tickets/slas/');
      setSlas(response.data);
    } catch (error) {
      console.error("Error fetching SLAs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.user_type === 'admin' || user?.user_type === 'engineer') {
      fetchSLAs();
    }
  }, [user]);

  if (user && user.user_type === 'client') return <Navigate to="/dashboard" />;

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddSLA = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/tickets/slas/', formData);
      await fetchSLAs();
      setFormData({ client_name: '', service_type: '', scope: '', date_entered: '', expiry_date: '', description: '', current_stage: 0 });
    } catch (error) {
      alert("Error saving SLA record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenProgress = (sla) => {
    setSelectedSla(sla);
    setActionLog(""); // Reset action field
    setOpenModal(true);
  };

  // Logic to save progress and move to next step
  const handleUpdateProgress = async () => {
    if (!actionLog.trim()) return alert("Please record what was done in this stage.");

    const nextStage = selectedSla.current_stage + 1;
    const isCompleted = selectedSla.current_stage >= 5;

    // We send a PATCH request to update the stage and the description/log
    // Note: In a real system, you'd have a 'StageHistory' model, 
    // but here we append to the description to keep it simple.
    const updatedData = {
      current_stage: isCompleted ? 5 : nextStage,
      status: isCompleted ? "Completed" : "Active",
      description: `${selectedSla.description || ""}\n\n[Stage: ${slaStages[selectedSla.current_stage]}] Logged by ${user.username}: ${actionLog}`
    };

    try {
      const response = await api.patch(`/tickets/slas/${selectedSla.id}/`, updatedData);
      setSelectedSla(response.data);
      setActionLog("");
      fetchSLAs(); // Refresh table
      if (isCompleted) setOpenModal(false);
    } catch (error) {
      alert("Failed to update progress.");
    }
  };

  const getSLAStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: "Expired", color: "error" };
    if (diffDays <= 90) return { label: "Due Soon", color: "warning" };
    return { label: "Active", color: "success" };
  };

  return (
    <DashboardLayout>
      <Box p={3}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a237e' }}>SLA Management</Typography>
        
        {/* Registration Form (Keep as is) */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1a237e' }}>Register New SLA</Typography>
            <form onSubmit={handleAddSLA}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={3}><TextField fullWidth label="Client Name" name="client_name" value={formData.client_name} onChange={handleInputChange} required size="small" /></Grid>
                    <Grid item xs={12} md={3}><TextField fullWidth label="Service Type" name="service_type" value={formData.service_type} onChange={handleInputChange} required size="small" /></Grid>
                    <Grid item xs={12} md={2}><TextField fullWidth label="Scope" name="scope" value={formData.scope} onChange={handleInputChange} required size="small" /></Grid>
                    <Grid item xs={12} md={2}><TextField fullWidth label="Start Date" name="date_entered" type="date" value={formData.date_entered} onChange={handleInputChange} required size="small" InputLabelProps={{ shrink: true }} /></Grid>
                    <Grid item xs={12} md={2}><TextField fullWidth label="Expiry Date" name="expiry_date" type="date" value={formData.expiry_date} onChange={handleInputChange} required size="small" InputLabelProps={{ shrink: true }} /></Grid>
                    <Grid item xs={12} md={10}><TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleInputChange} size="small" /></Grid>
                    <Grid item xs={12} md={2}><Button fullWidth variant="contained" type="submit" disabled={submitting} sx={{ height: '100%', bgcolor: '#1a237e' }}>Save SLA</Button></Grid>
                </Grid>
            </form>
        </Paper>

        {/* Table with Eye Icon */}
        <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Current Stage</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slas.map((sla) => (
                <TableRow key={sla.id}>
                  <TableCell>{sla.client_name}</TableCell>
                  <TableCell>{sla.service_type}</TableCell>
                  <TableCell>
                    <Chip label={slaStages[sla.current_stage]} variant="outlined" size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={getSLAStatus(sla.expiry_date).label} color={getSLAStatus(sla.expiry_date).color} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleOpenProgress(sla)} sx={{ color: '#1a237e' }}>
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* INTERACTIVE PROGRESS MODAL */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white' }}>
            Stage Tracking: {selectedSla?.client_name}
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <Stepper activeStep={selectedSla?.current_stage} alternativeLabel sx={{ pt: 3, pb: 2 }}>
              {slaStages.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

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
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Change History</Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: '200px', overflowY: 'auto', bgcolor: '#fafafa' }}>
                        <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                            {selectedSla?.description || "No activity logs yet."}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
};

export default SLAPage;