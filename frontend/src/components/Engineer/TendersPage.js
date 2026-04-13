import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, Link, TableContainer, CircularProgress, Alert
} from '@mui/material';
import DashboardLayout from '../Layout/DashboardLayout';

const TendersPage = () => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch directly from your backend scraper
    fetch('http://localhost:5000/api/tenders')
      .then(res => res.json())
      .then(data => {
        setTenders(data);
        setLoading(false);
      })
      .catch(err => {
        setError("Could not connect to the e-GP scraper.");
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <Box p={1}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32', mb: 2 }}>
          eGP System - Live Bulletin Board
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ width: '100%', mb: 2, borderRadius: 0, border: '1px solid #303f9f' }}>
          {loading ? (
            <Box p={4} textAlign="center"><CircularProgress size={24} /><Typography mt={1}>Scraping e-GP Portal...</Typography></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#303f9f' }}>
                    {["Tender Id", "Reference Number", "Tender Title", "Category Code", "Entity", "Scope", "Published", "Closing"].map((head) => (
                      <TableCell key={head} sx={{ color: 'white', fontWeight: 'bold', border: '1px solid #fff', fontSize: '0.7rem' }}>{head}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenders.map((t) => (
                    <TableRow key={t.tenderId} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#f9f9f9' } }}>
                      <TableCell sx={{ border: '1px solid #e0e0e0', textAlign: 'center' }}>
                        <Link href={`https://egp.praz.org.zw/view/${t.tenderId}`} target="_blank" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                          {t.tenderId}
                        </Link>
                      </TableCell>
                      <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '0.7rem' }}>{t.refNo}</TableCell>
                      <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '0.7rem' }}>{t.title}</TableCell>
                      <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '0.7rem' }}>{t.categoryCode}</TableCell>
                      <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '0.7rem' }}>{t.entity}</TableCell>
                      <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '0.7rem' }}>{t.scope}</TableCell>
                      <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '0.7rem' }}>{t.publishDate}</TableCell>
                      <TableCell sx={{ border: '1px solid #e0e0e0', fontSize: '0.7rem', fontWeight: 'bold' }}>{t.closingDate}</TableCell>
                    </TableRow>
                  ))}
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