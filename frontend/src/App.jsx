import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import ForcePasswordChange from './pages/ForcePasswordChange';
import MyTickets from './pages/MyTickets';
import NewTicket from './pages/NewTicket';
import TicketDetail from './pages/TicketDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminTickets from './pages/AdminTickets';
import AdminUsers from './pages/AdminUsers';
import AdminCategories from './pages/AdminCategories';
import AdminTemplates from './pages/AdminTemplates';
import AdminEmailSettings from './pages/AdminEmailSettings';
import AdminAuditLogs from './pages/AdminAuditLogs';
import Knowledge from './pages/Knowledge';
import KnowledgeDetail from './pages/KnowledgeDetail';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import { useAuth } from './contexts/AuthContext';

const HomeRoute = () => {
  const { user } = useAuth();
  if (['admin', 'technician', 'root'].includes(user?.role)) {
    return <Navigate to="/admin" replace />;
  }
  return <MyTickets />;
};

const App = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ForcePasswordChange />} />

            {/* User Routes */}
            <Route path="/" element={<PrivateRoute><HomeRoute /></PrivateRoute>} />
            <Route path="/new-ticket" element={<PrivateRoute><NewTicket /></PrivateRoute>} />
            <Route path="/tickets/:id" element={<PrivateRoute><TicketDetail /></PrivateRoute>} />
            <Route path="/knowledge" element={<PrivateRoute><Knowledge /></PrivateRoute>} />
            <Route path="/knowledge/:id" element={<PrivateRoute><KnowledgeDetail /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

            {/* Admin / Tech / Root Routes */}
            <Route path="/admin" element={<PrivateRoute roles={['admin', 'technician', 'root']}><AdminDashboard /></PrivateRoute>} />
            <Route path="/admin/tickets" element={<PrivateRoute roles={['admin', 'technician', 'root']}><AdminTickets /></PrivateRoute>} />
            <Route path="/admin/tickets/:id" element={<PrivateRoute roles={['admin', 'technician', 'root']}><TicketDetail /></PrivateRoute>} />
            <Route path="/admin/calendar" element={<PrivateRoute roles={['admin', 'technician', 'root']}><Calendar /></PrivateRoute>} />
            <Route path="/admin/knowledge" element={<PrivateRoute roles={['admin', 'technician', 'root']}><Knowledge /></PrivateRoute>} />
            <Route path="/admin/knowledge/:id" element={<PrivateRoute roles={['admin', 'technician', 'root']}><KnowledgeDetail /></PrivateRoute>} />
            <Route path="/admin/reports" element={<PrivateRoute roles={['admin', 'technician', 'root']}><Reports /></PrivateRoute>} />

            {/* Admin / Root Only Routes */}
            <Route path="/admin/users" element={<PrivateRoute roles={['admin', 'root']}><AdminUsers /></PrivateRoute>} />
            <Route path="/admin/categories" element={<PrivateRoute roles={['admin', 'root']}><AdminCategories /></PrivateRoute>} />
            <Route path="/admin/templates" element={<PrivateRoute roles={['admin', 'root']}><AdminTemplates /></PrivateRoute>} />
            <Route path="/admin/email-settings" element={<PrivateRoute roles={['admin', 'root']}><AdminEmailSettings /></PrivateRoute>} />
            <Route path="/admin/logs" element={<PrivateRoute roles={['admin', 'root']}><AdminAuditLogs /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
