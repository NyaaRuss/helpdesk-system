import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, Button, TextField } from '@mui/material';
import DashboardLayout from '../Layout/DashboardLayout';

const LeavePage = () => {
  const ACCRUAL_RATE = 2.5; 
  const [totalAccrued, setTotalAccrued] = useState(15); 
  const [daysToTake, setDaysToTake] = useState(0);

  const handleApply = () => {
    if (daysToTake > 0 && daysToTake <= totalAccrued) {
      setTotalAccrued(prev => prev - daysToTake);
      alert(`Leave application for ${daysToTake} days submitted.`);
    } else {
      alert("Invalid number of days or insufficient balance!");
    }
  };

  return (
    <DashboardLayout>
      <Box p={1}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1a237e' }}>Leave Management</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#e3f2fd', borderRadius: 2 }}>
              <Typography variant="h6">Available Balance</Typography>
              <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold' }}>{totalAccrued}</Typography>
              <Typography variant="body2" color="textSecondary">
                Accrual Rate: {ACCRUAL_RATE} days / month
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
              <Typography variant="h6" gutterBottom>Request Leave</Typography>
              <Box display="flex" gap={2} alignItems="center" mt={2}>
                <TextField 
                  type="number" 
                  label="Days Requested" 
                  size="small"
                  value={daysToTake}
                  onChange={(e) => setDaysToTake(Number(e.target.value))}
                />
                <Button variant="contained" color="primary" onClick={handleApply}>
                  Submit to HR
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default LeavePage;