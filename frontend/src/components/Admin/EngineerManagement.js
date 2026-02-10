import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  Refresh,
  Engineering,
  Assignment,
  CheckCircle,
  Pending,
  Email,
  Phone,
  BarChart,
} from '@mui/icons-material';
import { authAPI, ticketAPI } from '../../api/api';

const EngineerManagement = () => {
  const [engineers, setEngineers] = useState([]);
  const [engineerStats, setEngineerStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchEngineers();
  }, []);

  const fetchEngineers = async () => {
    setLoading(true);
    try {
      // Fetch engineers
      const engineersResponse = await authAPI.getUsers('engineer');
      setEngineers(engineersResponse.data);

      // Fetch stats for each engineer
      const stats = {};
      for (const engineer of engineersResponse.data) {
        try {
          const ticketsResponse = await ticketAPI.getAllTickets();
          const engineerTickets = ticketsResponse.data.filter(t => t.engineer?.id === engineer.id);
          
          stats[engineer.id] = {
            total: engineerTickets.length,
            active: engineerTickets.filter(t => t.status === 'in_progress').length,
            resolved: engineerTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
            pending: engineerTickets.filter(t => t.status === 'pending_client').length,
          };
        } catch (err) {
          console.error(`Error fetching stats for engineer ${engineer.id}:`, err);
        }
      }
      setEngineerStats(stats);
    } catch (err) {
      setError('Failed to load engineers');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEngineers = engineers.filter(engineer => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      engineer.username.toLowerCase().includes(searchLower) ||
      engineer.email.toLowerCase().includes(searchLower) ||
      engineer.first_name.toLowerCase().includes(searchLower) ||
      engineer.last_name.toLowerCase().includes(searchLower)
    );
  });

  const getEngineerPerformance = (engineerId) => {
    const stats = engineerStats[engineerId];
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.resolved / stats.total) * 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Engineer Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage engineers and view performance
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchEngineers}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search engineers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              onClick={() => setSearchTerm('')}
              fullWidth
            >
              Clear Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2" gutterBottom>
                Total Engineers
              </Typography>
              <Typography variant="h4">
                {engineers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2" gutterBottom>
                Active Engineers
              </Typography>
              <Typography variant="h4">
                {Object.values(engineerStats).filter(stats => stats?.active > 0).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2" gutterBottom>
                Avg. Resolution Rate
              </Typography>
              <Typography variant="h4">
                {engineers.length > 0
                  ? `${Math.round(
                      engineers.reduce((acc, eng) => acc + getEngineerPerformance(eng.id), 0) / engineers.length
                    )}%`
                  : '0%'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Engineers Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Engineer</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Performance</TableCell>
                <TableCell>Ticket Stats</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEngineers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No engineers found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEngineers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((engineer) => {
                  const stats = engineerStats[engineer.id] || { total: 0, active: 0, resolved: 0, pending: 0 };
                  const performance = getEngineerPerformance(engineer.id);
                  
                  return (
                    <TableRow key={engineer.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {engineer.first_name} {engineer.last_name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            @{engineer.username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email fontSize="small" />
                            {engineer.email}
                          </Typography>
                          {engineer.phone && (
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Phone fontSize="small" />
                              {engineer.phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Resolution Rate
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={performance}
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                              color={performance >= 80 ? 'success' : performance >= 60 ? 'warning' : 'error'}
                            />
                            <Typography variant="body2">
                              {performance}%
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">
                              Total
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {stats.total}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">
                              Active
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="warning.main">
                              {stats.active}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">
                              Resolved
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              {stats.resolved}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">
                              Pending
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="info.main">
                              {stats.pending}
                            </Typography>
                          </Grid>
                        </Grid>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Performance">
                            <IconButton size="small">
                              <BarChart fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Assign Tickets">
                            <IconButton size="small">
                              <Assignment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredEngineers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
};

export default EngineerManagement;