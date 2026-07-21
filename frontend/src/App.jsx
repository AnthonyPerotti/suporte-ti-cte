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
import Knowledge from './pages/Knowledge';
import KnowledgeDetail from './pages/KnowledgeDetail';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';

const App = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ForcePasswordChange />} />

            {/* User Routes */}
            <Route path="/" element={<PrivateRoute><MyTickets /></PrivateRoute>} />
            <Route path="/new-ticket" element={<PrivateRoute><NewTicket /></PrivateRoute>} />
            <Route path="/tickets/:id" element={<PrivateRoute><TicketDetail /></PrivateRoute>} />
            <Route path="/knowledge" element={<PrivateRoute><Knowledge /></PrivateRoute>} />
            <Route path="/knowledge/:id" element={<PrivateRoute><KnowledgeDetail /></PrivateRoute>} />

            {/* Admin / Tech Routes */}
            <Route path="/admin" element={<PrivateRoute roles={['admin', 'technician']}><AdminDashboard /></PrivateRoute>} />
            <Route path="/admin/tickets" element={<PrivateRoute roles={['admin', 'technician']}><AdminTickets /></PrivateRoute>} />
            <Route path="/admin/tickets/:id" element={<PrivateRoute roles={['admin', 'technician']}><TicketDetail /></PrivateRoute>} />
            <Route path="/admin/calendar" element={<PrivateRoute roles={['admin', 'technician']}><Calendar /></PrivateRoute>} />
            <Route path="/admin/knowledge" element={<PrivateRoute roles={['admin', 'technician']}><Knowledge /></PrivateRoute>} />
            <Route path="/admin/knowledge/:id" element={<PrivateRoute roles={['admin', 'technician']}><KnowledgeDetail /></PrivateRoute>} />
            <Route path="/admin/reports" element={<PrivateRoute roles={['admin', 'technician']}><Reports /></PrivateRoute>} />

            {/* Admin Only Routes */}
            <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><AdminUsers /></PrivateRoute>} />
            <Route path="/admin/categories" element={<PrivateRoute roles={['admin']}><AdminCategories /></PrivateRoute>} />
            <Route path="/admin/templates" element={<PrivateRoute roles={['admin']}><AdminTemplates /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
