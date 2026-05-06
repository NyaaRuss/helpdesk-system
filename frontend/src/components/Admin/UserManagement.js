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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Search,
  Refresh,
  Visibility,
  Person,
  Engineering,
  AdminPanelSettings,
  Email,
  Phone,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Close,
} from '@mui/icons-material';
import { authAPI } from '../../api/api';
import { format } from 'date-fns';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  
  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, userTypeFilter]);

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getProfile();
      setCurrentUser(response.data);
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getUsers('');
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchLower))
      );
    }

    if (userTypeFilter !== 'all') {
      filtered = filtered.filter(user => user.user_type === userTypeFilter);
    }

    setFilteredUsers(filtered);
    setPage(0);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    // Prevent admin from deleting themselves
    if (currentUser && currentUser.id === userToDelete.id) {
      showSnackbar('You cannot delete your own account', 'error');
      setDeleteDialogOpen(false);
      return;
    }
    
    setDeleting(true);
    try {
      await authAPI.deleteUser(userToDelete.id, deleteReason);
      showSnackbar(`User ${userToDelete.username} has been deleted successfully`, 'success');
      setDeleteDialogOpen(false);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error deleting user:', err);
      showSnackbar(err.response?.data?.error || 'Failed to delete user', 'error');
    } finally {
      setDeleting(false);
      setUserToDelete(null);
      setDeleteReason('');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => {
      setSnackbar(prev => ({ ...prev, open: false }));
    }, 6000);
  };

  const getUserTypeIcon = (type) => {
    switch (type) {
      case 'admin': return <AdminPanelSettings />;
      case 'engineer': return <Engineering />;
      case 'client': return <Person />;
      default: return <Person />;
    }
  };

  const getUserTypeChip = (type) => {
    const config = {
      admin: { label: 'Admin', color: 'error' },
      engineer: { label: 'Engineer', color: 'warning' },
      client: { label: 'Client', color: 'info' },
    }[type] || { label: type, color: 'default' };

    return (
      <Chip
        icon={getUserTypeIcon(type)}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
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
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a237e' }}>
            User Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage all system users
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={fetchUsers}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search users by name, username or email..."
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
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>User Type</InputLabel>
              <Select
                value={userTypeFilter}
                label="User Type"
                onChange={(e) => setUserTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="admin">Admins</MenuItem>
                <MenuItem value="engineer">Engineers</MenuItem>
                <MenuItem value="client">Clients</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setUserTypeFilter('all');
              }}
              fullWidth
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#fafafa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Joined</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {user.first_name} {user.last_name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          @{user.username}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {getUserTypeChip(user.user_type)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email fontSize="small" sx={{ color: '#1565c0' }} />
                        <Typography variant="body2">
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {user.phone ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" sx={{ color: '#4caf50' }} />
                          <Typography variant="body2">
                            {user.phone}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          Not set
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(user.date_joined)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewUser(user)}
                            sx={{ color: '#1976d2' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(user)}
                            sx={{ color: '#d32f2f' }}
                            disabled={currentUser && currentUser.id === user.id}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* User Details Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a237e', color: 'white' }}>
          User Details
          <IconButton
            aria-label="close"
            onClick={() => setUserDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Basic Information
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body1">
                      <strong>Name:</strong> {selectedUser.first_name} {selectedUser.last_name}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Username:</strong> {selectedUser.username}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Email:</strong> {selectedUser.email}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Phone:</strong> {selectedUser.phone || 'Not set'}
                    </Typography>
                    <Typography variant="body1">
                      <strong>User Type:</strong> {getUserTypeChip(selectedUser.user_type)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Account Information
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Joined:</strong> {formatDate(selectedUser.date_joined)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Last Login:</strong> {formatDate(selectedUser.last_login) || 'Never'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Active:</strong> {selectedUser.is_active ? 'Yes' : 'No'}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            Delete User: {userToDelete?.username}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 2, mb: 2, color: '#d32f2f' }}>
            ⚠️ Warning: This action cannot be undone. This will permanently delete the user and all associated data.
          </Typography>
          
          {userToDelete && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>User Details:</strong>
              </Typography>
              <Typography variant="body2">
                Name: {userToDelete.first_name} {userToDelete.last_name}
              </Typography>
              <Typography variant="body2">
                Username: {userToDelete.username}
              </Typography>
              <Typography variant="body2">
                Email: {userToDelete.email}
              </Typography>
              <Typography variant="body2">
                Type: {userToDelete.user_type?.toUpperCase()}
              </Typography>
            </Paper>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for deletion (optional)"
            placeholder="Please provide a reason for deleting this user..."
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            margin="normal"
            variant="outlined"
            helperText="This reason will be sent to the user via email"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteUser} 
            color="error" 
            variant="contained" 
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;