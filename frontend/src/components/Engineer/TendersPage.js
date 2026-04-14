import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, Link, TableContainer, CircularProgress, Alert, Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardLayout from '../Layout/DashboardLayout';
import { ticketAPI } from '../../api/api'; 

const TendersPage = () => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTenders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetches live data from the PRAZ e-GP portal backend
      const response = await ticketAPI.getTenders();
      setTenders(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(err.response?.data?.error || "Connection error. Ensure Django is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  return (
    <DashboardLayout>
      <Box p={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
            eGP System - Live Bulletin Board
          </Typography>
          <Button 
            variant="contained" size="small" startIcon={<RefreshIcon />} 
            onClick={fetchTenders} disabled={loading}
            sx={{ bgcolor: '#303f9f', '&:hover': { bgcolor: '#1a237e' } }}
          >
            {loading ? "Refreshing..." : "Refresh Tenders"}
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ width: '100%', mb: 2, borderRadius: 0, border: '1px solid #303f9f' }}>
          {loading ? (
            <Box p={8} textAlign="center">
              <CircularProgress size={40} sx={{ color: '#303f9f' }} />
              <Typography mt={2} color="textSecondary">
                Syncing with PRAZ Portal... (&lt; 3s)
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: '75vh' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {/* 8 Headers defined to match the official PRAZ Bulletin Board */}
                    <TableCell sx={{ bgcolor: '#303f9f', color: 'white', fontWeight: 'bold' }}>Tender Id</TableCell>
                    <TableCell sx={{ bgcolor: '#303f9f', color: 'white', fontWeight: 'bold' }}>Reference Number</TableCell>
                    <TableCell sx={{ bgcolor: '#303f9f', color: 'white', fontWeight: 'bold' }}>Tender Title</TableCell>
                    <TableCell sx={{ bgcolor: '#303f9f', color: 'white', fontWeight: 'bold' }}>Supplier Category</TableCell>
                    <TableCell sx={{ bgcolor: '#303f9f', color: 'white', fontWeight: 'bold' }}>Procuring Entity</TableCell>
                    <TableCell sx={{ bgcolor: '#303f9f', color: 'white', fontWeight: 'bold' }}>Scope</TableCell>
                    <TableCell sx={{ bgcolor: '#303f9f', color: 'white', fontWeight: 'bold' }}>Publish Date</TableCell>
                    {/* 8 Headers defined to match the official PRAZ Bulletin Board <TableCell sx={{ bgcolor: '#303f9f', color: 'white', fontWeight: 'bold' }}>Closing Date</TableCell>*/}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenders.length > 0 ? (
                    tenders.map((t, i) => (
                      <TableRow key={i} hover>
                        {/* 1. Tender ID */}
                        <TableCell>
                          <Link 
                            href={`https://egp.praz.org.zw/view/${t.tenderId}`} 
                            target="_blank" 
                            sx={{ fontWeight: 'bold' }}
                          >
                            {t.tenderId}
                          </Link>
                        </TableCell>
                        {/* 2. Reference Number */}
                        <TableCell>{t.referenceNumber}</TableCell>
                        {/* 3. Title */}
                        <TableCell>{t.title}</TableCell>
                        {/* 4. Category */}
                        <TableCell sx={{ fontSize: '0.7rem' }}>{t.category}</TableCell>
                        {/* 5. Entity */}
                        <TableCell>{t.entity}</TableCell>
                        
                        {/* 6. Scope - Added to stop date shifting */}
                        <TableCell>{t.scope || 'Open'}</TableCell>
                        
                        {/* 7. Publish Date 
                        <TableCell>{t.closingDate}</TableCell>
                        */}
                        {/* 8. Closing Date - Correctly fetching from the API */}
                        <TableCell sx={{ fontWeight: 'bold', color: '#d32f2f', whiteSpace: 'nowrap' }}>
                          {t.closingDate}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      {/* Full colSpan to span across all 8 columns */}
                      <TableCell colSpan={9} align="center">No active tenders found. Click Refresh.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </DashboardLayout>
  );
};

export default TendersPage;