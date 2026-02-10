import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PrivateRoute from './components/Auth/PrivateRoute';
import DashboardLayout from './components/Layout/DashboardLayout';

// Client components
import ClientDashboard from './components/Client/ClientDashboard';
import CreateTicket from './components/Client/CreateTicket';
import TicketList from './components/Client/TicketList';
import TicketDetail from './components/Client/TicketDetail';

// Admin components
import AdminDashboard from './components/Admin/AdminDashboard';
import AllTickets from './components/Admin/AllTickets';
import UserManagement from './components/Admin/UserManagement';
import EngineerManagement from './components/Admin/EngineerManagement';
import Reports from './components/Admin/Reports';

// Engineer components
import EngineerDashboard from './components/Engineer/EngineerDashboard';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Component to render correct dashboard based on user type
const UserDashboard = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  switch (user.user_type) {
    case 'client':
      return <ClientDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'engineer':
      return <EngineerDashboard />;
    default:
      return <Navigate to="/login" />;
  }
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={
                  <DashboardLayout>
                    <UserDashboard />
                  </DashboardLayout>
                } />
                
                {/* Client routes */}
                <Route path="/tickets/new" element={
                  <DashboardLayout>
                    <CreateTicket />
                  </DashboardLayout>
                } />
                <Route path="/tickets" element={
                  <DashboardLayout>
                    <TicketList />
                  </DashboardLayout>
                } />
                <Route path="/tickets/:id" element={
                  <DashboardLayout>
                    <TicketDetail />
                  </DashboardLayout>
                } />
                
                {/* Admin routes */}
                <Route path="/admin/tickets" element={
                  <DashboardLayout>
                    <AllTickets />
                  </DashboardLayout>
                } />
                <Route path="/admin/users" element={
                  <DashboardLayout>
                    <UserManagement />
                  </DashboardLayout>
                } />
                <Route path="/admin/engineers" element={
                  <DashboardLayout>
                    <EngineerManagement />
                  </DashboardLayout>
                } />
                <Route path="/admin/reports" element={
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                } />
                
                {/* Engineer routes */}
                <Route path="/engineer/tickets" element={
                  <DashboardLayout>
                    <TicketList />
                  </DashboardLayout>
                } />
                <Route path="/engineer/performance" element={
                  <DashboardLayout>
                    <EngineerDashboard />
                  </DashboardLayout>
                } />
                
                {/* Redirect root to dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;