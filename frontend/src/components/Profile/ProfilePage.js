// src/components/Profile/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Delete as DeleteIcon,
  Person,
  Email,
  Phone,
  Badge,
  Business,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/api';
import DashboardLayout from '../Layout/DashboardLayout';

const ProfilePage = () => {
  const { user: currentUser, login, refreshUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
  });

  // Helper function to get profile picture URL
  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) return null;
    // If it already starts with http, use as is
    if (profilePicture.startsWith('http')) return profilePicture;
    // Otherwise prepend the API base URL
    return `http://localhost:8000${profilePicture}`;
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await authAPI.getProfile();
      console.log('Profile data:', response.data); // Debug log
      setUser(response.data);
      setFormData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        department: response.data.department || '',
      });
      setError('');
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await authAPI.updateProfile(formData);
      console.log('Update response:', response.data); // Debug log
      setUser(response.data.user);
      
      // Refresh the user in context
      if (refreshUser) {
        await refreshUser();
      }
      
      setSuccess('Profile updated successfully!');
      setEditMode(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('profile_picture', file);
    
    setUploading(true);
    setError('');
    
    try {
      const response = await authAPI.updateProfile(formData);
      console.log('Upload response:', response.data); // Debug log
      setUser(response.data.user);
      
      // Refresh the user in context
      if (refreshUser) {
        await refreshUser();
      }
      
      setSuccess('Profile picture updated!');
      // Force re-render by updating a timestamp
      setUser(prev => ({ ...prev, profile_picture: response.data.user.profile_picture }));
    } catch (err) {
      console.error('Error uploading picture:', err);
      setError(err.response?.data?.error || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleDeleteProfilePicture = async () => {
    setDeleteDialogOpen(false);
    setUploading(true);
    
    try {
      const response = await authAPI.deleteProfilePicture();
      console.log('Delete response:', response.data); // Debug log
      setUser({ ...user, profile_picture: null });
      
      // Refresh the user in context
      if (refreshUser) {
        await refreshUser();
      }
      
      setSuccess('Profile picture removed');
    } catch (err) {
      console.error('Error deleting picture:', err);
      setError('Failed to delete profile picture');
    } finally {
      setUploading(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
    });
    setEditMode(false);
    setError('');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  const profileImageUrl = getProfilePictureUrl(user?.profile_picture);
  console.log('Profile image URL:', profileImageUrl); // Debug log

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
        {/* Header */}
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold', color: '#1a237e' }}>
          My Profile
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
          Manage your personal information and profile picture
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Left Column - Profile Picture */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={profileImageUrl}
                  sx={{
                    width: 180,
                    height: 180,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: 64,
                  }}
                  onError={(e) => {
                    console.log('Avatar failed to load:', profileImageUrl);
                    e.target.onerror = null;
                    e.target.src = '';
                  }}
                >
                  {!user?.profile_picture && (user?.first_name?.[0] || user?.username?.[0] || 'U')}
                </Avatar>
                
                {uploading && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 180,
                      height: 180,
                      borderRadius: '50%',
                      bgcolor: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CircularProgress sx={{ color: 'white' }} />
                  </Box>
                )}
                
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-picture-upload"
                  type="file"
                  onChange={handleProfilePictureUpload}
                />
                <label htmlFor="profile-picture-upload">
                  <IconButton
                    component="span"
                    sx={{
                      position: 'absolute',
                      bottom: 20,
                      right: '50%',
                      transform: 'translateX(50%)',
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                    disabled={uploading}
                  >
                    <PhotoCamera />
                  </IconButton>
                </label>
              </Box>
              
              {user?.profile_picture && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                  sx={{ mt: 2 }}
                  disabled={uploading}
                >
                  Remove Photo
                </Button>
              )}
              
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Account Information
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Badge fontSize="small" color="action" />
                  <Typography variant="body2">
                    <strong>Username:</strong> {user?.username}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Badge fontSize="small" color="action" />
                  <Typography variant="body2">
                    <strong>User Type:</strong> {user?.user_type?.toUpperCase()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Badge fontSize="small" color="action" />
                  <Typography variant="body2">
                    <strong>Member Since:</strong> {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column - Profile Details */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
                  Personal Information
                </Typography>
                {!editMode ? (
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => setEditMode(true)}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? <CircularProgress size={20} /> : 'Save'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    disabled={!editMode || saving}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Person sx={{ mr: 1, color: '#1565c0' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    disabled={!editMode || saving}
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!editMode || saving}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: '#1565c0' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!editMode || saving}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: '#1565c0' }} />,
                    }}
                    placeholder="+1234567890"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    disabled={!editMode || saving}
                    variant="outlined"
                    InputProps={{
                      startAdornment: <Business sx={{ mr: 1, color: '#1565c0' }} />,
                    }}
                    placeholder="IT, Sales, Support, etc."
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Account Security
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • To change your password, please use the "Forgot Password" feature on the login page.
                </Typography>
                <Typography variant="body2">
                  • For security reasons, password changes require email verification.
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Delete Profile Picture Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remove Profile Picture</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove your profile picture? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteProfilePicture} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
};

export default ProfilePage;