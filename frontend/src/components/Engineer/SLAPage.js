import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, Alert 
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import DashboardLayout from '../Layout/DashboardLayout'; // Ensure path is correct

const SLAPage = () => {
  const [slas] = useState([
    { id: 1, client: "Zim-Revenue", type: "Network Maint", expiry: "2026-04-15", status: "Active" },
    { id: 2, client: "Harare City Council", type: "Printer Support", expiry: "2026-05-12", status: "Active" }
  ]);

  const isExpiringSoon = (date) => {
    const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff < 7;
  };

  return (
    <DashboardLayout>
      <Box p={1}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold', color: '#1a237e' }}>SLA Management</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>Monitor and renew service agreements</Typography>
        
        {slas.some(s => isExpiringSoon(s.expiry)) && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 3, borderRadius: 2 }}>
            Attention: You have SLAs expiring this week!
          </Alert>
        )}

        <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#fafafa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Client Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Service Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Expiry Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slas.map((sla) => (
                <TableRow key={sla.id} hover>
                  <TableCell>{sla.client}</TableCell>
                  <TableCell>{sla.type}</TableCell>
                  <TableCell>
                    {sla.expiry} 
                    {isExpiringSoon(sla.expiry) && 
                      <Chip label="RENEW SOON" color="error" size="small" sx={{ ml: 1, fontSize: '10px' }} />
                    }
                  </TableCell>
                  <TableCell><Chip label={sla.status} color="success" size="small" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </DashboardLayout>
  );
};

export default SLAPage;