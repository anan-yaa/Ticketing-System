import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './features/auth/Login';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ProfileSettings from './features/profile/ProfileSettings';
import ChangePassword from './features/profile/ChangePassword';
import { UnauthorizedPage } from './components/UnauthorizedPage';
import CustomerTicketPortal from './features/customer/CustomerTicketPortal';
import MainLayout from './components/MainLayout';
import Dashboard from './features/admin/Dashboard';
import { AdminTicketsQueue } from './features/admin/AdminTicketsQueue';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Main Layout Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route element={<ProtectedRoute requiredPermission="USER_VIEW" />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/super-admin/dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
              </Route>
              
              <Route element={<ProtectedRoute requiredPermission="TICKET_VIEW" />}>
                <Route path="/tickets" element={<AdminTicketsQueue />} />
              </Route>
              
              <Route path="/settings" element={<ProfileSettings />} />
              <Route path="/settings/change-password" element={<ChangePassword />} />
            </Route>
          </Route>
          
          <Route element={<ProtectedRoute requiredPermission="TICKET_CREATE" />}>
            <Route path="/customer/dashboard" element={<CustomerTicketPortal />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
