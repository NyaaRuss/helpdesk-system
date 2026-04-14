import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  BarChart,
  TrendingUp,
  People,
  Assignment,
  Refresh,
  Download,
  FilterList,
  Clear,
} from '@mui/icons-material';
import { ticketAPI, authAPI } from '../../api/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports = () => {
  const [stats, setStats] = useState({});
  const [tickets, setTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEngineers, setSelectedEngineers] = useState([]);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('excel');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, usersRes, statsRes] = await Promise.all([
        ticketAPI.getAllTickets(),
        authAPI.getUsers(''),
        ticketAPI.getDashboardStats(),
      ]);

      setAllTickets(ticketsRes.data);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      
      // Get engineers list
      const engineersList = usersRes.data.filter(u => u.user_type === 'engineer');
      setEngineers(engineersList);
      
      // Apply filters
      applyFilters(ticketsRes.data, timeRange, startDate, endDate, selectedEngineers);
    } catch (err) {
      setError('Failed to load report data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (ticketData, range, sDate, eDate, engineersList) => {
    let filtered = [...ticketData];
    
    // Filter by date range
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    filtered = filtered.filter(ticket => {
      const createdDate = new Date(ticket.created_at);
      
      if (range === 'week') {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        return createdDate >= weekAgo;
      } else if (range === 'month') {
        const monthAgo = new Date(now.setMonth(currentMonth - 1));
        return createdDate >= monthAgo;
      } else if (range === 'quarter') {
        const quarterAgo = new Date(now.setMonth(currentMonth - 3));
        return createdDate >= quarterAgo;
      } else if (range === 'year') {
        const yearAgo = new Date(now.setFullYear(currentYear - 1));
        return createdDate >= yearAgo;
      } else if (range === 'custom' && sDate && eDate) {
        const start = new Date(sDate);
        const end = new Date(eDate);
        end.setHours(23, 59, 59);
        return createdDate >= start && createdDate <= end;
      }
      return true;
    });
    
    // Filter by engineers
    if (engineersList && engineersList.length > 0) {
      filtered = filtered.filter(ticket => {
        const ticketEngineers = ticket.assigned_engineers?.map(e => e.engineer?.id) || [];
        return engineersList.some(engId => ticketEngineers.includes(engId));
      });
    }
    
    setTickets(filtered);
  };

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    if (range !== 'custom') {
      setStartDate('');
      setEndDate('');
      applyFilters(allTickets, range, '', '', selectedEngineers);
    } else {
      setShowDateFilter(true);
    }
  };

  const handleDateFilterApply = () => {
    setShowDateFilter(false);
    applyFilters(allTickets, timeRange, startDate, endDate, selectedEngineers);
  };

  const handleEngineerFilterChange = (event) => {
    const { value } = event.target;
    setSelectedEngineers(value);
    applyFilters(allTickets, timeRange, startDate, endDate, value);
  };

  const clearAllFilters = () => {
    setTimeRange('all');
    setStartDate('');
    setEndDate('');
    setSelectedEngineers([]);
    setShowDateFilter(false);
    setTickets(allTickets);
  };

  const getStatusDistribution = () => {
    const statusCounts = {
      open: 0,
      in_progress: 0,
      pending_client: 0,
      resolved: 0,
      closed: 0,
    };

    tickets.forEach(ticket => {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
    });

    return {
      labels: ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'],
      datasets: [
        {
          label: 'Tickets by Status',
          data: [
            statusCounts.open,
            statusCounts.in_progress,
            statusCounts.pending_client,
            statusCounts.resolved,
            statusCounts.closed,
          ],
          backgroundColor: [
            '#f44336',
            '#ff9800',
            '#2196f3',
            '#4caf50',
            '#9e9e9e',
          ],
        },
      ],
    };
  };

  const getPriorityDistribution = () => {
    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    tickets.forEach(ticket => {
      priorityCounts[ticket.priority] = (priorityCounts[ticket.priority] || 0) + 1;
    });

    return {
      labels: ['Low', 'Medium', 'High', 'Critical'],
      datasets: [
        {
          label: 'Tickets by Priority',
          data: [
            priorityCounts.low,
            priorityCounts.medium,
            priorityCounts.high,
            priorityCounts.critical,
          ],
          backgroundColor: [
            '#4caf50',
            '#2196f3',
            '#ff9800',
            '#f44336',
          ],
        },
      ],
    };
  };

  const getUserDistribution = () => {
    const userTypes = {
      admin: users.filter(u => u.user_type === 'admin').length,
      engineer: users.filter(u => u.user_type === 'engineer').length,
      client: users.filter(u => u.user_type === 'client').length,
    };

    return {
      labels: ['Admins', 'Engineers', 'Clients'],
      datasets: [
        {
          label: 'Users by Type',
          data: [userTypes.admin, userTypes.engineer, userTypes.client],
          backgroundColor: [
            '#f44336',
            '#ff9800',
            '#2196f3',
          ],
        },
      ],
    };
  };

  const getResolutionRate = () => {
    const total = tickets.length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    return total > 0 ? Math.round((resolved / total) * 100) : 0;
  };

  const getAverageResolutionTime = () => {
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    if (resolvedTickets.length === 0) return 'N/A';

    const totalDays = resolvedTickets.reduce((acc, ticket) => {
      if (ticket.created_at && ticket.resolved_at) {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.resolved_at);
        const diffDays = (resolved - created) / (1000 * 60 * 60 * 24);
        return acc + diffDays;
      }
      return acc;
    }, 0);

    return (totalDays / resolvedTickets.length).toFixed(1) + ' days';
  };

  const exportReport = async () => {
    try {
      // Prepare data for export
      const exportData = tickets.map(ticket => ({
        'Ticket Number': ticket.ticket_number,
        'Title': ticket.title,
        'Status': ticket.status,
        'Priority': ticket.priority,
        'Category': ticket.category,
        'Client': ticket.client?.username || 'N/A',
        'Assigned Engineers': ticket.assigned_engineers?.map(e => e.engineer?.username).join(', ') || 'Unassigned',
        'Created Date': new Date(ticket.created_at).toLocaleString(),
        'Resolved Date': ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : 'Not Resolved',
        'Time to Resolution (Days)': ticket.resolved_at ? 
          ((new Date(ticket.resolved_at) - new Date(ticket.created_at)) / (1000 * 60 * 60 * 24)).toFixed(2) : 'N/A'
      }));

      // Add summary sheet
      const summaryData = [
        { Metric: 'Total Tickets', Value: tickets.length },
        { Metric: 'Resolution Rate', Value: `${getResolutionRate()}%` },
        { Metric: 'Average Resolution Time', Value: getAverageResolutionTime() },
        { Metric: 'Open Tickets', Value: tickets.filter(t => t.status === 'open').length },
        { Metric: 'In Progress', Value: tickets.filter(t => t.status === 'in_progress').length },
        { Metric: 'Resolved/Closed', Value: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length },
        { Metric: 'High Priority', Value: tickets.filter(t => t.priority === 'high' || t.priority === 'critical').length },
        { Metric: 'Date Range', Value: getDateRangeText() },
        { Metric: 'Engineers Filter', Value: selectedEngineers.length > 0 ? engineers.filter(e => selectedEngineers.includes(e.id)).map(e => e.username).join(', ') : 'All Engineers' },
      ];

      if (exportFormat === 'excel') {
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Add tickets sheet
        const ticketsWs = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ticketsWs, 'Tickets Report');
        
        // Add summary sheet
        const summaryWs = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
        
        // Generate Excel file
        XLSX.writeFile(wb, `helpdesk_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else if (exportFormat === 'csv') {
        // Export as CSV
        const csvData = exportData.map(row => Object.values(row).join(',')).join('\n');
        const headers = Object.keys(exportData[0]).join(',');
        const csv = `${headers}\n${csvData}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `helpdesk_report_${new Date().toISOString().split('T')[0]}.csv`);
      } else if (exportFormat === 'json') {
        // Export as JSON
        const jsonData = JSON.stringify({ tickets: exportData, summary: summaryData }, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        saveAs(blob, `helpdesk_report_${new Date().toISOString().split('T')[0]}.json`);
      }
      
      setExportDialogOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export report');
    }
  };

  const getDateRangeText = () => {
    if (timeRange === 'week') return 'Last 7 Days';
    if (timeRange === 'month') return 'Last 30 Days';
    if (timeRange === 'quarter') return 'Last 90 Days';
    if (timeRange === 'year') return 'Last Year';
    if (timeRange === 'custom' && startDate && endDate) return `${startDate} to ${endDate}`;
    return 'All Time';
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (timeRange !== 'all') count++;
    if (selectedEngineers.length > 0) count++;
    if (startDate && endDate) count++;
    return count;
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
            System Reports
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Analytics and performance metrics
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {getActiveFiltersCount() > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Clear />}
              onClick={clearAllFilters}
              size="small"
            >
              Clear Filters ({getActiveFiltersCount()})
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchReportData}
          >
            Refresh
          </Button>
          
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => setExportDialogOpen(true)}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Filters Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => handleTimeRangeChange(e.target.value)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="quarter">Last Quarter</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Engineers</InputLabel>
              <Select
                multiple
                value={selectedEngineers}
                onChange={handleEngineerFilterChange}
                input={<OutlinedInput label="Engineers" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const engineer = engineers.find(e => e.id === value);
                      return <Chip key={value} label={engineer?.username || value} size="small" />;
                    })}
                  </Box>
                )}
              >
                {engineers.map((engineer) => (
                  <MenuItem key={engineer.id} value={engineer.id}>
                    <Checkbox checked={selectedEngineers.indexOf(engineer.id) > -1} />
                    <ListItemText primary={`${engineer.first_name} ${engineer.last_name} (@${engineer.username})`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Showing {tickets.length} of {allTickets.length} tickets
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Custom Date Range Dialog */}
      <Dialog open={showDateFilter} onClose={() => setShowDateFilter(false)}>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDateFilter(false)}>Cancel</Button>
          <Button onClick={handleDateFilterApply} variant="contained">Apply</Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Report</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <MenuItem value="excel">Excel (.xlsx)</MenuItem>
              <MenuItem value="csv">CSV (.csv)</MenuItem>
              <MenuItem value="json">JSON (.json)</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Exporting {tickets.length} tickets with current filters applied
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={exportReport} variant="contained">Download</Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'primary.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Assignment sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Tickets
                  </Typography>
                  <Typography variant="h4">
                    {tickets.length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Filtered from {allTickets.length} total
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'success.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp sx={{ color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Resolution Rate
                  </Typography>
                  <Typography variant="h4">
                    {getResolutionRate()}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'warning.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <People sx={{ color: 'warning.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Total Users
                  </Typography>
                  <Typography variant="h4">
                    {users.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: 'info.light',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BarChart sx={{ color: 'info.main' }} />
                </Box>
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Avg. Resolution Time
                  </Typography>
                  <Typography variant="h4">
                    {getAverageResolutionTime()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ticket Status Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <Pie data={getStatusDistribution()} options={{
                maintainAspectRatio: false,
                responsive: true,
              }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Priority Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <Bar data={getPriorityDistribution()} options={{
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <Pie data={getUserDistribution()} options={{
                maintainAspectRatio: false,
                responsive: true,
              }} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      Unassigned Tickets
                    </Typography>
                    <Typography variant="h5" color="error">
                      {tickets.filter(t => !t.assigned_engineers || t.assigned_engineers.length === 0).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      High Priority
                    </Typography>
                    <Typography variant="h5" color="warning.main">
                      {tickets.filter(t => t.priority === 'high' || t.priority === 'critical').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      Active Engineers
                    </Typography>
                    <Typography variant="h5" color="info.main">
                      {users.filter(u => u.user_type === 'engineer').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="textSecondary">
                      Total Clients
                    </Typography>
                    <Typography variant="h5" color="primary.main">
                      {users.filter(u => u.user_type === 'client').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;