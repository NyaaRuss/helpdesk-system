// src/components/Admin/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Button,
  IconButton,
  MenuItem,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Menu,
} from '@mui/material';
import {
  AccessTime,
  ListAlt,
  DoneAll,
  Engineering,
  Equalizer,
  Assessment,
  Close,
  Visibility,
  Refresh,
  Download,
  Schedule,
  Speed,
  ErrorOutline,
  Timeline,
  Warning,
  PersonAdd,
  PersonOutline,
  PictureAsPdf,
  TableChart,
  FileCopy,
  ReportProblem,
  PersonOff,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, authAPI } from '../../api/api';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  BarChart as ReBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [activeTab, setActiveTab] = useState(0);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [engineerDetailsOpen, setEngineerDetailsOpen] = useState(false);
  const [selectedEngineerDetails, setSelectedEngineerDetails] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  
  const navigate = useNavigate();

  // Ticket metrics state
  const [ticketMetrics, setTicketMetrics] = useState({
    resolutionTime: { avg: 0, min: 0, max: 0 },
    averageTimeByPriority: { low: 0, medium: 0, high: 0, critical: 0 },
    natureOfCases: { low: 0, medium: 0, high: 0, critical: 0 },
    ticketsByDay: [],
    resolvedByDay: [],
    slaCompliance: { met: 0, breached: 0, percentage: 0 }
  });

  // Engineer performance state
  const [engineerPerformance, setEngineerPerformance] = useState([]);
  const [selectedEngineer, setSelectedEngineer] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = {};
      if (dateRange.start) params.start_date = dateRange.start.toISOString().split('T')[0];
      if (dateRange.end) params.end_date = dateRange.end.toISOString().split('T')[0];
      if (filterPriority !== 'all') params.priority = filterPriority;
      if (filterStatus !== 'all') params.status = filterStatus;

      const ticketsRes = await ticketAPI.getAllTickets();
      let allTickets = ticketsRes.data || [];
      
      if (dateRange.start) {
        allTickets = allTickets.filter(t => new Date(t.created_at) >= dateRange.start);
      }
      if (dateRange.end) {
        allTickets = allTickets.filter(t => new Date(t.created_at) <= dateRange.end);
      }
      if (filterPriority !== 'all') {
        allTickets = allTickets.filter(t => t.priority === filterPriority);
      }
      if (filterStatus !== 'all') {
        allTickets = allTickets.filter(t => t.status === filterStatus);
      }
      
      setTickets(allTickets);
      
      let engineersList = [];
      try {
        const usersRes = await authAPI.getUsers('engineer');
        engineersList = usersRes.data || [];
      } catch (err) {
        console.warn('Could not fetch engineers:', err);
      }
      
      calculateTicketMetrics(allTickets);
      calculateEngineerPerformance(allTickets, engineersList);
      calculateBasicStats(allTickets, engineersList);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data: ' + (err.message || 'Unknown error'));
      showSnackbar('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateRange, filterPriority, filterStatus]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const calculateBasicStats = (allTickets, engineersList) => {
    const unassignedCount = allTickets.filter(
      t => (!t.assigned_engineers || t.assigned_engineers.length === 0) && t.status !== 'resolved' && t.status !== 'closed'
    ).length;

    const resolvedCount = allTickets.filter(
      t => t.status === 'resolved' || t.status === 'closed'
    ).length;
    
    const openTickets = allTickets.filter(t => t.status === 'open').length;
    const inProgressTickets = allTickets.filter(t => t.status === 'in_progress').length;
    
    const highPriorityCount = allTickets.filter(
      t => t.priority === 'high' || t.priority === 'critical'
    ).length;

    // NEW: Calculate escalated tickets count
    const escalatedCount = allTickets.filter(
      t => t.status === 'escalated' || t.is_escalated === true
    ).length;

    // Calculate engineers with tasks vs without tasks
    let engineersWithTasks = 0;
    let engineersWithoutTasks = 0;
    
    engineersList.forEach(engineer => {
      const engineerTickets = allTickets.filter(t => 
        t.assigned_engineers?.some(e => e.engineer?.id === engineer.id || e.id === engineer.id)
      );
      if (engineerTickets.length > 0) {
        engineersWithTasks++;
      } else {
        engineersWithoutTasks++;
      }
    });

    setStats({
      total_tickets: allTickets.length,
      unassigned_tickets: unassignedCount,
      resolved_tickets: resolvedCount,
      open_tickets: openTickets,
      in_progress_tickets: inProgressTickets,
      high_priority_tickets: highPriorityCount,
      escalated_tickets: escalatedCount,
      total_engineers: engineersList.length,
      engineers_with_tasks: engineersWithTasks,
      engineers_without_tasks: engineersWithoutTasks,
    });
  };

  const calculateTicketMetrics = (tickets) => {
    const resolvedTickets = tickets.filter(t => 
      t.status === 'resolved' || t.status === 'closed'
    );
    
    let resolutionTimes = [];
    let priorityTimes = {
      low: [],
      medium: [],
      high: [],
      critical: []
    };
    
    resolvedTickets.forEach(ticket => {
      if (ticket.created_at && ticket.updated_at) {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.updated_at);
        const hours = (resolved - created) / (1000 * 60 * 60);
        resolutionTimes.push(hours);
        
        if (priorityTimes[ticket.priority]) {
          priorityTimes[ticket.priority].push(hours);
        }
      }
    });
    
    const avgResolutionTime = resolutionTimes.length > 0 
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length 
      : 0;
    
    const minResolutionTime = resolutionTimes.length > 0 ? Math.min(...resolutionTimes) : 0;
    const maxResolutionTime = resolutionTimes.length > 0 ? Math.max(...resolutionTimes) : 0;
    
    const averageTimeByPriority = {};
    Object.keys(priorityTimes).forEach(priority => {
      const times = priorityTimes[priority];
      averageTimeByPriority[priority] = times.length > 0 
        ? times.reduce((a, b) => a + b, 0) / times.length 
        : 0;
    });
    
    const natureOfCases = {
      low: tickets.filter(t => t.priority === 'low').length,
      medium: tickets.filter(t => t.priority === 'medium').length,
      high: tickets.filter(t => t.priority === 'high').length,
      critical: tickets.filter(t => t.priority === 'critical').length
    };
    
    let slaMet = 0;
    let slaBreached = 0;
    resolvedTickets.forEach(ticket => {
      if (ticket.created_at && ticket.updated_at) {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.updated_at);
        const hours = (resolved - created) / (1000 * 60 * 60);
        
        let slaLimit = 72;
        if (ticket.priority === 'critical') slaLimit = 24;
        else if (ticket.priority === 'high') slaLimit = 48;
        else if (ticket.priority === 'medium') slaLimit = 72;
        else if (ticket.priority === 'low') slaLimit = 120;
        
        if (hours <= slaLimit) {
          slaMet++;
        } else {
          slaBreached++;
        }
      }
    });
    
    const slaPercentage = resolvedTickets.length > 0 ? (slaMet / resolvedTickets.length) * 100 : 0;
    
    const ticketsByDate = {};
    tickets.forEach(ticket => {
      const date = new Date(ticket.created_at).toLocaleDateString();
      ticketsByDate[date] = (ticketsByDate[date] || 0) + 1;
    });
    
    const ticketsByDay = Object.entries(ticketsByDate).map(([date, count]) => ({ date, count }));
    
    setTicketMetrics({
      resolutionTime: {
        avg: avgResolutionTime.toFixed(1),
        min: minResolutionTime.toFixed(1),
        max: maxResolutionTime.toFixed(1)
      },
      averageTimeByPriority,
      natureOfCases,
      ticketsByDay,
      resolvedByDay: [],
      slaCompliance: {
        met: slaMet,
        breached: slaBreached,
        percentage: slaPercentage.toFixed(1)
      }
    });
  };

  const calculateEngineerPerformance = (tickets, engineersList) => {
    const performance = engineersList.map(engineer => {
      const engineerTickets = tickets.filter(t => 
        t.assigned_engineers?.some(e => e.engineer?.id === engineer.id || e.id === engineer.id)
      );
      
      const resolvedTickets = engineerTickets.filter(t => 
        t.status === 'resolved' || t.status === 'closed'
      );
      
      let totalHours = 0;
      resolvedTickets.forEach(ticket => {
        if (ticket.created_at && ticket.updated_at) {
          const created = new Date(ticket.created_at);
          const resolved = new Date(ticket.updated_at);
          totalHours += (resolved - created) / (1000 * 60 * 60);
        }
      });
      
      const avgResolutionTime = resolvedTickets.length > 0 
        ? totalHours / resolvedTickets.length 
        : 0;
      
      const resolutionRate = engineerTickets.length > 0 
        ? (resolvedTickets.length / engineerTickets.length) * 100 
        : 0;
      
      const priorityBreakdown = {
        low: engineerTickets.filter(t => t.priority === 'low').length,
        medium: engineerTickets.filter(t => t.priority === 'medium').length,
        high: engineerTickets.filter(t => t.priority === 'high').length,
        critical: engineerTickets.filter(t => t.priority === 'critical').length
      };
      
      let slaMet = 0;
      resolvedTickets.forEach(ticket => {
        if (ticket.created_at && ticket.updated_at) {
          const created = new Date(ticket.created_at);
          const resolved = new Date(ticket.updated_at);
          const hours = (resolved - created) / (1000 * 60 * 60);
          
          let slaLimit = 72;
          if (ticket.priority === 'critical') slaLimit = 24;
          else if (ticket.priority === 'high') slaLimit = 48;
          else if (ticket.priority === 'medium') slaLimit = 72;
          else if (ticket.priority === 'low') slaLimit = 120;
          
          if (hours <= slaLimit) slaMet++;
        }
      });
      
      const slaCompliance = resolvedTickets.length > 0 ? (slaMet / resolvedTickets.length) * 100 : 0;
      
      return {
        id: engineer.id,
        name: `${engineer.first_name || ''} ${engineer.last_name || ''}`.trim() || engineer.username,
        email: engineer.email,
        totalAssigned: engineerTickets.length,
        resolvedCount: resolvedTickets.length,
        avgResolutionTime: avgResolutionTime.toFixed(1),
        resolutionRate: resolutionRate.toFixed(1),
        slaCompliance: slaCompliance.toFixed(1),
        priorityBreakdown,
      };
    });
    
    performance.sort((a, b) => parseFloat(b.resolutionRate) - parseFloat(a.resolutionRate));
    setEngineerPerformance(performance);
  };

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      const summaryData = [
        ['DASHBOARD REPORT'],
        [`Generated: ${new Date().toLocaleString()}`],
        [''],
        ['TICKET SUMMARY'],
        ['Metric', 'Value'],
        ['Total Tickets', stats.total_tickets || 0],
        ['Open Tickets', stats.open_tickets || 0],
        ['In Progress', stats.in_progress_tickets || 0],
        ['Resolved Tickets', stats.resolved_tickets || 0],
        ['Unassigned Tickets', stats.unassigned_tickets || 0],
        ['Escalated Tickets', stats.escalated_tickets || 0],
        ['High Priority Tickets', stats.high_priority_tickets || 0],
        [''],
        ['ENGINEER SUMMARY'],
        ['Metric', 'Value'],
        ['Total Engineers', stats.total_engineers || 0],
        ['Engineers with Tasks', stats.engineers_with_tasks || 0],
        ['Available Engineers', stats.engineers_without_tasks || 0],
        [''],
        ['TICKET METRICS'],
        ['Metric', 'Value'],
        ['Average Resolution Time (hours)', ticketMetrics.resolutionTime.avg],
        ['Fastest Resolution (hours)', ticketMetrics.resolutionTime.min],
        ['Slowest Resolution (hours)', ticketMetrics.resolutionTime.max],
        ['SLA Compliance (%)', ticketMetrics.slaCompliance.percentage],
        ['SLA Met', ticketMetrics.slaCompliance.met],
        ['SLA Breached', ticketMetrics.slaCompliance.breached],
        [''],
        ['PRIORITY DISTRIBUTION'],
        ['Priority', 'Count'],
        ['Low', ticketMetrics.natureOfCases.low],
        ['Medium', ticketMetrics.natureOfCases.medium],
        ['High', ticketMetrics.natureOfCases.high],
        ['Critical', ticketMetrics.natureOfCases.critical],
        [''],
        ['AVERAGE RESOLUTION TIME BY PRIORITY (hours)'],
        ['Priority', 'Hours'],
        ['Low', ticketMetrics.averageTimeByPriority.low],
        ['Medium', ticketMetrics.averageTimeByPriority.medium],
        ['High', ticketMetrics.averageTimeByPriority.high],
        ['Critical', ticketMetrics.averageTimeByPriority.critical],
      ];
      
      const engineerData = [
        ['ENGINEER PERFORMANCE DETAILS'],
        ['Engineer Name', 'Email', 'Assigned Tickets', 'Resolved Tickets', 'Resolution Rate (%)', 'Avg Resolution Time (h)', 'SLA Compliance (%)', 'Low Priority', 'Medium Priority', 'High Priority', 'Critical Priority']
      ];
      
      engineerPerformance.forEach(eng => {
        engineerData.push([
          eng.name,
          eng.email,
          eng.totalAssigned,
          eng.resolvedCount,
          eng.resolutionRate,
          eng.avgResolutionTime,
          eng.slaCompliance,
          eng.priorityBreakdown.low,
          eng.priorityBreakdown.medium,
          eng.priorityBreakdown.high,
          eng.priorityBreakdown.critical
        ]);
      });
      
      const ticketData = [
        ['TICKET DETAILS'],
        ['Ticket #', 'Title', 'Priority', 'Status', 'Client', 'Created Date', 'Resolved Date', 'Assigned Engineers']
      ];
      
      tickets.forEach(ticket => {
        const assignedNames = ticket.assigned_engineers?.map(e => e.engineer?.username || e.username).join(', ') || 'None';
        ticketData.push([
          ticket.ticket_number,
          ticket.title,
          ticket.priority,
          ticket.status,
          ticket.client?.username || 'N/A',
          new Date(ticket.created_at).toLocaleString(),
          ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : 'Not resolved',
          assignedNames
        ]);
      });
      
      const allData = [...summaryData, [], ...engineerData, [], ...ticketData];
      const ws = XLSX.utils.aoa_to_sheet(allData);
      ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Report');
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `dashboard_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, filename);
      
      showSnackbar('Excel report exported successfully!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showSnackbar('Failed to export Excel report', 'error');
    }
  };

  // Export to CSV
  const handleExportToCSV = () => {
    try {
      const rows = [];
      rows.push(['Dashboard Report']);
      rows.push([`Generated: ${new Date().toLocaleString()}`]);
      rows.push([]);
      rows.push(['TICKET SUMMARY']);
      rows.push(['Total Tickets', stats.total_tickets || 0]);
      rows.push(['Open Tickets', stats.open_tickets || 0]);
      rows.push(['In Progress', stats.in_progress_tickets || 0]);
      rows.push(['Resolved Tickets', stats.resolved_tickets || 0]);
      rows.push(['Unassigned Tickets', stats.unassigned_tickets || 0]);
      rows.push(['Escalated Tickets', stats.escalated_tickets || 0]);
      rows.push(['High Priority Tickets', stats.high_priority_tickets || 0]);
      rows.push([]);
      rows.push(['PRIORITY DISTRIBUTION']);
      rows.push(['Priority', 'Count']);
      rows.push(['Low', ticketMetrics.natureOfCases.low]);
      rows.push(['Medium', ticketMetrics.natureOfCases.medium]);
      rows.push(['High', ticketMetrics.natureOfCases.high]);
      rows.push(['Critical', ticketMetrics.natureOfCases.critical]);
      rows.push([]);
      rows.push(['ENGINEER PERFORMANCE']);
      rows.push(['Engineer Name', 'Assigned', 'Resolved', 'Resolution Rate %', 'Avg Time (h)']);
      engineerPerformance.forEach(eng => {
        rows.push([eng.name, eng.totalAssigned, eng.resolvedCount, eng.resolutionRate, eng.avgResolutionTime]);
      });
      rows.push([]);
      rows.push(['TICKET DETAILS']);
      rows.push(['Ticket #', 'Title', 'Priority', 'Status', 'Client', 'Created Date', 'Assigned Engineers']);
      tickets.forEach(ticket => {
        const assignedNames = ticket.assigned_engineers?.map(e => e.engineer?.username || e.username).join(', ') || 'None';
        rows.push([
          ticket.ticket_number,
          ticket.title,
          ticket.priority,
          ticket.status,
          ticket.client?.username || 'N/A',
          new Date(ticket.created_at).toLocaleString(),
          assignedNames
        ]);
      });
      
      const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = `dashboard_report_${new Date().toISOString().split('T')[0]}.csv`;
      saveAs(blob, filename);
      
      showSnackbar('CSV report exported successfully!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showSnackbar('Failed to export CSV report', 'error');
    }
  };

  // Export to HTML
  const handleExportToHTML = () => {
    try {
      const htmlContent = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Dashboard Report - ${new Date().toLocaleString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #1a237e; border-bottom: 3px solid #1a237e; padding-bottom: 10px; }
          h2 { color: #1976d2; margin-top: 30px; border-left: 4px solid #1976d2; padding-left: 15px; }
          .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
          .card { background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e0e0e0; }
          .card h3 { margin: 0 0 10px 0; color: #666; }
          .card .value { font-size: 28px; font-weight: bold; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #1976d2; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Dashboard Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <h2>Ticket Summary</h2>
          <div class="summary-cards">
            <div class="card"><h3>Total Tickets</h3><p class="value">${stats.total_tickets || 0}</p></div>
            <div class="card"><h3>Open Tickets</h3><p class="value">${stats.open_tickets || 0}</p></div>
            <div class="card"><h3>In Progress</h3><p class="value">${stats.in_progress_tickets || 0}</p></div>
            <div class="card"><h3>Resolved</h3><p class="value">${stats.resolved_tickets || 0}</p></div>
            <div class="card"><h3>Unassigned</h3><p class="value">${stats.unassigned_tickets || 0}</p></div>
            <div class="card"><h3>Escalated</h3><p class="value">${stats.escalated_tickets || 0}</p></div>
          </div>
          <h2>Engineer Overview</h2>
          <div class="summary-cards">
            <div class="card"><h3>Total Engineers</h3><p class="value">${stats.total_engineers || 0}</p></div>
            <div class="card"><h3>With Tasks</h3><p class="value">${stats.engineers_with_tasks || 0}</p></div>
            <div class="card"><h3>Available</h3><p class="value">${stats.engineers_without_tasks || 0}</p></div>
          </div>
          <h2>Ticket Metrics</h2>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Average Resolution Time</td><td>${ticketMetrics.resolutionTime.avg} hours</td></tr>
            <tr><td>Fastest Resolution</td><td>${ticketMetrics.resolutionTime.min} hours</td></tr>
            <tr><td>Slowest Resolution</td><td>${ticketMetrics.resolutionTime.max} hours</td></tr>
            <tr><td>SLA Compliance</td><td>${ticketMetrics.slaCompliance.percentage}%</td></tr>
            <tr><td>SLA Met</td><td>${ticketMetrics.slaCompliance.met}</td></tr>
            <tr><td>SLA Breached</td><td>${ticketMetrics.slaCompliance.breached}</td></tr>
          </table>
          <h2>Priority Distribution</h2>
          <table>
            <tr><th>Priority</th><th>Count</th></tr>
            <tr><td>Low</td><td>${ticketMetrics.natureOfCases.low}</td></tr>
            <tr><td>Medium</td><td>${ticketMetrics.natureOfCases.medium}</td></tr>
            <tr><td>High</td><td>${ticketMetrics.natureOfCases.high}</td></tr>
            <tr><td>Critical</td><td>${ticketMetrics.natureOfCases.critical}</td></tr>
          </table>
          <h2>Engineer Performance</h2>
          <table>
            <thead><tr><th>Engineer</th><th>Assigned</th><th>Resolved</th><th>Resolution Rate</th><th>Avg Time (h)</th></tr></thead>
            <tbody>
              ${engineerPerformance.map(eng => `<tr><td>${eng.name}</td><td>${eng.totalAssigned}</td><td>${eng.resolvedCount}</td><td>${eng.resolutionRate}%</td><td>${eng.avgResolutionTime}</td></tr>`).join('')}
            </tbody>
          </table>
          <h2>Ticket Details (${tickets.length} tickets)</h2>
          <table>
            <thead><tr><th>Ticket #</th><th>Title</th><th>Priority</th><th>Status</th><th>Client</th><th>Created</th><th>Engineers</th></tr></thead>
            <tbody>
              ${tickets.slice(0, 50).map(ticket => `<tr><td>${ticket.ticket_number}</td><td>${ticket.title}</td><td>${ticket.priority}</td><td>${ticket.status}</td><td>${ticket.client?.username || 'N/A'}</td><td>${new Date(ticket.created_at).toLocaleDateString()}</td><td>${ticket.assigned_engineers?.map(e => e.engineer?.username || e.username).join(', ') || 'None'}</td></tr>`).join('')}
            </tbody>
          </table>
          ${tickets.length > 50 ? `<p><em>Showing first 50 of ${tickets.length} tickets</em></p>` : ''}
          <div class="footer"><p>Generated by Helpdesk System | ${new Date().toLocaleString()}</p></div>
        </div>
      </body>
      </html>`;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const filename = `dashboard_report_${new Date().toISOString().split('T')[0]}.html`;
      saveAs(blob, filename);
      
      showSnackbar('HTML report exported successfully!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showSnackbar('Failed to export HTML report', 'error');
    }
  };

  // Export to JSON
  const handleExportToJSON = () => {
    try {
      const reportData = {
        reportInfo: {
          generatedAt: new Date().toISOString(),
          generatedAtLocal: new Date().toLocaleString(),
          filters: {
            startDate: dateRange.start?.toISOString() || 'All',
            endDate: dateRange.end?.toISOString() || 'All',
            priority: filterPriority,
            status: filterStatus
          }
        },
        summary: {
          totalTickets: stats.total_tickets || 0,
          openTickets: stats.open_tickets || 0,
          inProgressTickets: stats.in_progress_tickets || 0,
          resolvedTickets: stats.resolved_tickets || 0,
          unassignedTickets: stats.unassigned_tickets || 0,
          escalatedTickets: stats.escalated_tickets || 0,
          highPriorityTickets: stats.high_priority_tickets || 0,
          totalEngineers: stats.total_engineers || 0,
          engineersWithTasks: stats.engineers_with_tasks || 0,
          availableEngineers: stats.engineers_without_tasks || 0
        },
        ticketMetrics: {
          resolutionTime: ticketMetrics.resolutionTime,
          averageTimeByPriority: ticketMetrics.averageTimeByPriority,
          natureOfCases: ticketMetrics.natureOfCases,
          slaCompliance: ticketMetrics.slaCompliance
        },
        engineerPerformance: engineerPerformance,
        tickets: tickets.map(ticket => ({
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          status: ticket.status,
          client: ticket.client?.username || 'Unknown',
          created_at: ticket.created_at,
          resolved_at: ticket.resolved_at,
          assigned_engineers: ticket.assigned_engineers?.map(e => e.engineer?.username || e.username) || []
        }))
      };
      
      const jsonString = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const filename = `dashboard_report_${new Date().toISOString().split('T')[0]}.json`;
      saveAs(blob, filename);
      
      showSnackbar('JSON report exported successfully!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showSnackbar('Failed to export JSON report', 'error');
    }
  };

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleViewEngineerDetails = (engineer) => {
    setSelectedEngineerDetails(engineer);
    setEngineerDetailsOpen(true);
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const priorityData = Object.entries(ticketMetrics.natureOfCases).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: getPriorityColor(name)
  }));

  const avgTimeData = Object.entries(ticketMetrics.averageTimeByPriority).map(([priority, hours]) => ({
    priority: priority.charAt(0).toUpperCase() + priority.slice(1),
    hours: parseFloat(hours).toFixed(1),
    color: getPriorityColor(priority)
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, bgcolor: '#f8f9fa', minHeight: '100vh' }}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Comprehensive ticket management and performance analytics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<Download />} 
              onClick={handleExportMenuOpen}
              sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
            >
              Export Report
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchDashboardData}>
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Export Menu */}
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={handleExportMenuClose}
        >
          <MenuItem onClick={() => { handleExportToExcel(); handleExportMenuClose(); }}>
            <TableChart sx={{ mr: 1, color: '#4caf50' }} /> Excel (.xlsx)
          </MenuItem>
          <MenuItem onClick={() => { handleExportToCSV(); handleExportMenuClose(); }}>
            <FileCopy sx={{ mr: 1, color: '#2196f3' }} /> CSV (.csv)
          </MenuItem>
          <MenuItem onClick={() => { handleExportToHTML(); handleExportMenuClose(); }}>
            <PictureAsPdf sx={{ mr: 1, color: '#f44336' }} /> HTML Report
          </MenuItem>
          <MenuItem onClick={() => { handleExportToJSON(); handleExportMenuClose(); }}>
            <Assessment sx={{ mr: 1, color: '#ff9800' }} /> JSON
          </MenuItem>
        </Menu>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {stats.unassigned_tickets > 0 && (
          <Alert 
            severity="error" 
            variant="filled" 
            sx={{ mb: 3, boxShadow: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/admin/tickets?status=open')}>
                Assign Now
              </Button>
            }
          >
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              ⚠️ {stats.unassigned_tickets} unassigned ticket(s) require immediate allocation.
            </Typography>
          </Alert>
        )}

        {stats.escalated_tickets > 0 && (
          <Alert 
            severity="warning" 
            variant="filled" 
            sx={{ mb: 3, boxShadow: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/admin/tickets?status=escalated')}>
                Review Escalated
              </Button>
            }
          >
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              🔴 {stats.escalated_tickets} escalated ticket(s) require immediate attention.
            </Typography>
          </Alert>
        )}

        {/* Filter Bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <DatePicker
                label="Start Date"
                value={dateRange.start}
                onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <DatePicker
                label="End Date"
                value={dateRange.end}
                onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select value={filterPriority} label="Priority" onChange={(e) => setFilterPriority(e.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                  <MenuItem value="escalated">Escalated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Stats Cards Row 1 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}
              onClick={() => navigate('/admin/tickets')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2">Total Tickets</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.total_tickets || 0}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#1976d2', width: 48, height: 48 }}>
                    <ListAlt />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}
              onClick={() => navigate('/admin/tickets?status=open')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2">Open</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#f44336">{stats.open_tickets || 0}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#ffebee', width: 48, height: 48 }}>
                    <ErrorOutline sx={{ color: '#f44336' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}
              onClick={() => navigate('/admin/tickets?status=in_progress')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2">In Progress</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#ff9800">{stats.in_progress_tickets || 0}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#fff3e0', width: 48, height: 48 }}>
                    <AccessTime sx={{ color: '#ff9800' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}
              onClick={() => navigate('/admin/tickets?status=resolved')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2">Resolved</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#4caf50">{stats.resolved_tickets || 0}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#e8f5e9', width: 48, height: 48 }}>
                    <DoneAll sx={{ color: '#4caf50' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
              }}
              onClick={() => navigate('/admin/tickets?status=escalated')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" variant="body2">Escalated</Typography>
                    <Typography variant="h4" fontWeight="bold" color="#d32f2f">{stats.escalated_tickets || 0}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#ffebee', width: 48, height: 48 }}>
                    <ReportProblem sx={{ color: '#d32f2f' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Stats Cards Row 2 - Unassigned Tickets Card */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                bgcolor: '#ff9800',
                color: 'white'
              }}
              onClick={() => navigate('/admin/tickets?status=open&unassigned=true')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2">Unassigned Tickets</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.unassigned_tickets || 0}</Typography>
                    <Typography variant="caption">Need engineer assignment</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <PersonOff />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                bgcolor: '#d32f2f',
                color: 'white'
              }}
              onClick={() => navigate('/admin/tickets?status=escalated')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2">Escalated Tickets</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.escalated_tickets || 0}</Typography>
                    <Typography variant="caption">Require immediate attention</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <ReportProblem />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                bgcolor: '#4caf50',
                color: 'white'
              }}
              onClick={() => navigate('/admin/tickets?priority=high,critical')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2">High/Critical</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.high_priority_tickets || 0}</Typography>
                    <Typography variant="caption">High priority tickets</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <Warning />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                bgcolor: '#2196f3',
                color: 'white'
              }}
              onClick={() => navigate('/admin/tickets?status=resolved')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2">Resolved</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.resolved_tickets || 0}</Typography>
                    <Typography variant="caption">Completed tickets</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <DoneAll />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Engineers Overview */}
        <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Engineering /> Engineers Overview
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                bgcolor: '#1976d2', 
                color: 'white'
              }}
              onClick={() => navigate('/admin/engineers')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2">Total Engineers</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.total_engineers || 0}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <Engineering />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                bgcolor: '#4caf50', 
                color: 'white'
              }}
              onClick={() => navigate('/admin/tickets?filter=assigned')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2">Engineers with Tasks</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.engineers_with_tasks || 0}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <PersonAdd />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                bgcolor: '#ff9800', 
                color: 'white'
              }}
              onClick={() => navigate('/admin/engineers?filter=available')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2">Available Engineers</Typography>
                    <Typography variant="h4" fontWeight="bold">{stats.engineers_without_tasks || 0}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <PersonOutline />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Ticket Metrics Section */}
        <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment /> Ticket Analytics
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule /> Resolution Time
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h2" color="primary.main" fontWeight="bold">
                  {ticketMetrics.resolutionTime.avg}
                </Typography>
                <Typography variant="body2" color="textSecondary">Average Hours</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                    <Typography variant="caption" color="textSecondary">Fastest</Typography>
                    <Typography variant="h6" color="success.main">{ticketMetrics.resolutionTime.min}h</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#ffebee', borderRadius: 2 }}>
                    <Typography variant="caption" color="textSecondary">Slowest</Typography>
                    <Typography variant="h6" color="error.main">{ticketMetrics.resolutionTime.max}h</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Equalizer /> Nature of Cases
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                {priorityData.map((item, idx) => (
                  <Tooltip key={idx} title={`${item.name} priority tickets: ${item.value}`}>
                    <Chip 
                      label={`${item.name}: ${item.value}`} 
                      size="small" 
                      sx={{ bgcolor: item.color, color: 'white', cursor: 'pointer' }}
                      onClick={() => navigate(`/admin/tickets?priority=${item.name.toLowerCase()}`)}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed /> SLA Compliance
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h2" color={ticketMetrics.slaCompliance.percentage >= 80 ? '#4caf50' : '#f44336'} fontWeight="bold">
                  {ticketMetrics.slaCompliance.percentage}%
                </Typography>
                <Typography variant="body2" color="textSecondary">SLA Met</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={ticketMetrics.slaCompliance.percentage} 
                sx={{ height: 10, borderRadius: 5, mb: 2 }}
                color={ticketMetrics.slaCompliance.percentage >= 80 ? "success" : "error"}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">Met: {ticketMetrics.slaCompliance.met}</Typography>
                <Typography variant="caption" color="error">Breached: {ticketMetrics.slaCompliance.breached}</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Average Resolution Time by Priority */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timeline /> Average Resolution Time by Priority
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <ResponsiveContainer width="100%" height={300}>
            <ReBarChart data={avgTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="priority" />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <ReTooltip />
              <Bar dataKey="hours" radius={[10, 10, 0, 0]}>
                {avgTimeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Engineer Performance Section */}
        <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Engineering /> Engineer Performance Metrics
        </Typography>

        <Paper sx={{ mb: 4, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="Leaderboard" />
              <Tab label="Performance Chart" />
              <Tab label="Individual Analysis" />
            </Tabs>
          </Box>

          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell>Engineer</TableCell>
                      <TableCell align="center">Assigned</TableCell>
                      <TableCell align="center">Resolved</TableCell>
                      <TableCell align="center">Resolution Rate</TableCell>
                      <TableCell align="center">Avg Time</TableCell>
                      <TableCell align="center">SLA Compliance</TableCell>
                      <TableCell align="center">Priority Breakdown</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {engineerPerformance.map((eng, index) => (
                      <TableRow key={eng.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: `hsl(${index * 45}, 70%, 50%)` }}>
                              {eng.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{eng.name}</Typography>
                              <Typography variant="caption" color="textSecondary">{eng.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={eng.totalAssigned} 
                            size="small" 
                            variant="outlined"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/admin/tickets?engineer=${eng.id}`)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={eng.resolvedCount} 
                            size="small" 
                            color="success"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/admin/tickets?engineer=${eng.id}&status=resolved`)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={parseFloat(eng.resolutionRate)} 
                              sx={{ width: 80, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="body2" fontWeight="bold">{eng.resolutionRate}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            icon={<AccessTime />} 
                            label={`${eng.avgResolutionTime}h`} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={`${eng.slaCompliance}%`} 
                            size="small" 
                            color={eng.slaCompliance >= 80 ? "success" : "warning"}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title={`Low: ${eng.priorityBreakdown.low}`}>
                              <Chip 
                                label={eng.priorityBreakdown.low} 
                                size="small" 
                                sx={{ bgcolor: '#4caf50', color: 'white', minWidth: 30, cursor: 'pointer' }}
                                onClick={() => navigate(`/admin/tickets?engineer=${eng.id}&priority=low`)}
                              />
                            </Tooltip>
                            <Tooltip title={`Medium: ${eng.priorityBreakdown.medium}`}>
                              <Chip 
                                label={eng.priorityBreakdown.medium} 
                                size="small" 
                                sx={{ bgcolor: '#ff9800', color: 'white', minWidth: 30, cursor: 'pointer' }}
                                onClick={() => navigate(`/admin/tickets?engineer=${eng.id}&priority=medium`)}
                              />
                            </Tooltip>
                            <Tooltip title={`High: ${eng.priorityBreakdown.high}`}>
                              <Chip 
                                label={eng.priorityBreakdown.high} 
                                size="small" 
                                sx={{ bgcolor: '#f44336', color: 'white', minWidth: 30, cursor: 'pointer' }}
                                onClick={() => navigate(`/admin/tickets?engineer=${eng.id}&priority=high`)}
                              />
                            </Tooltip>
                            <Tooltip title={`Critical: ${eng.priorityBreakdown.critical}`}>
                              <Chip 
                                label={eng.priorityBreakdown.critical} 
                                size="small" 
                                sx={{ bgcolor: '#d32f2f', color: 'white', minWidth: 30, cursor: 'pointer' }}
                                onClick={() => navigate(`/admin/tickets?engineer=${eng.id}&priority=critical`)}
                              />
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => handleViewEngineerDetails(eng)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Resolution Rate by Engineer</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <ReBarChart data={engineerPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <ReTooltip />
                      <Bar 
                        dataKey="resolutionRate" 
                        fill="#4caf50" 
                        name="Resolution Rate (%)" 
                        radius={[0, 10, 10, 0]}
                      >
                        {engineerPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                        ))}
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Average Resolution Time</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <ReBarChart data={engineerPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" label={{ value: 'Hours', position: 'bottom' }} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <ReTooltip />
                      <Bar 
                        dataKey="avgResolutionTime" 
                        fill="#ff9800" 
                        name="Avg Resolution Time (hours)" 
                        radius={[0, 10, 10, 0]}
                      />
                    </ReBarChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ p: 3 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Engineer</InputLabel>
                <Select value={selectedEngineer || ''} onChange={(e) => setSelectedEngineer(e.target.value)}>
                  {engineerPerformance.map(eng => (
                    <MenuItem key={eng.id} value={eng.id}>{eng.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {selectedEngineer && (() => {
                const engineer = engineerPerformance.find(e => e.id === selectedEngineer);
                return (
                  <Box>
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={3}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, fontSize: 40 }}>
                              {engineer.name.charAt(0)}
                            </Avatar>
                            <Typography variant="h6">{engineer.name}</Typography>
                            <Typography variant="caption" color="textSecondary">{engineer.email}</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Paper 
                            sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd', cursor: 'pointer' }}
                            onClick={() => navigate(`/admin/tickets?engineer=${engineer.id}`)}
                          >
                            <Typography variant="h4">{engineer.totalAssigned}</Typography>
                            <Typography variant="body2">Total Tickets</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Paper 
                            sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9', cursor: 'pointer' }}
                            onClick={() => navigate(`/admin/tickets?engineer=${engineer.id}&status=resolved`)}
                          >
                            <Typography variant="h4">{engineer.resolvedCount}</Typography>
                            <Typography variant="body2">Resolved Tickets</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                            <Typography variant="h4">{engineer.avgResolutionTime}h</Typography>
                            <Typography variant="body2">Avg Resolution Time</Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Paper>
                    
                    <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>Priority Breakdown</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Card 
                          sx={{ bgcolor: '#4caf50', color: 'white', textAlign: 'center', p: 2, cursor: 'pointer' }}
                          onClick={() => navigate(`/admin/tickets?engineer=${engineer.id}&priority=low`)}
                        >
                          <Typography variant="h3">{engineer.priorityBreakdown.low}</Typography>
                          <Typography variant="body2">Low Priority</Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Card 
                          sx={{ bgcolor: '#ff9800', color: 'white', textAlign: 'center', p: 2, cursor: 'pointer' }}
                          onClick={() => navigate(`/admin/tickets?engineer=${engineer.id}&priority=medium`)}
                        >
                          <Typography variant="h3">{engineer.priorityBreakdown.medium}</Typography>
                          <Typography variant="body2">Medium Priority</Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Card 
                          sx={{ bgcolor: '#f44336', color: 'white', textAlign: 'center', p: 2, cursor: 'pointer' }}
                          onClick={() => navigate(`/admin/tickets?engineer=${engineer.id}&priority=high`)}
                        >
                          <Typography variant="h3">{engineer.priorityBreakdown.high}</Typography>
                          <Typography variant="body2">High Priority</Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Card 
                          sx={{ bgcolor: '#d32f2f', color: 'white', textAlign: 'center', p: 2, cursor: 'pointer' }}
                          onClick={() => navigate(`/admin/tickets?engineer=${engineer.id}&priority=critical`)}
                        >
                          <Typography variant="h3">{engineer.priorityBreakdown.critical}</Typography>
                          <Typography variant="body2">Critical</Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })()}
            </Box>
          )}
        </Paper>

        {/* Engineer Details Dialog */}
        <Dialog open={engineerDetailsOpen} onClose={() => setEngineerDetailsOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Engineer Details</Typography>
              <IconButton onClick={() => setEngineerDetailsOpen(false)}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {selectedEngineerDetails && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ width: 80, height: 80, fontSize: 40 }}>
                    {selectedEngineerDetails.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h5">{selectedEngineerDetails.name}</Typography>
                    <Typography variant="body2" color="textSecondary">{selectedEngineerDetails.email}</Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Paper 
                      sx={{ p: 2, textAlign: 'center', cursor: 'pointer' }}
                      onClick={() => navigate(`/admin/tickets?engineer=${selectedEngineerDetails.id}`)}
                    >
                      <Typography variant="h4">{selectedEngineerDetails.totalAssigned}</Typography>
                      <Typography variant="body2">Assigned Tickets</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4">{selectedEngineerDetails.resolutionRate}%</Typography>
                      <Typography variant="body2">Resolution Rate</Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle1" gutterBottom>Performance Metrics</Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Resolution Rate</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedEngineerDetails.resolutionRate}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={selectedEngineerDetails.resolutionRate} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">SLA Compliance</Typography>
                    <Typography variant="body2" fontWeight="bold">{selectedEngineerDetails.slaCompliance}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={selectedEngineerDetails.slaCompliance} sx={{ height: 8, borderRadius: 4 }} color="success" />
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEngineerDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default AdminDashboard;