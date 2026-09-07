import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateReel from './pages/CreateReel.jsx';
import ReelGenerating from './pages/ReelGenerating.jsx';
import ReelResult from './pages/ReelResult.jsx';
import MyReels from './pages/MyReels.jsx';
import Templates from './pages/Templates.jsx';
import BrandKit from './pages/BrandKit.jsx';
import Usage from './pages/Usage.jsx';
import Settings from './pages/Settings.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="screen-loader">
        <div className="spinner" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route
        path="/dashboard"
        element={<PrivateRoute><DashboardLayout /></PrivateRoute>}
      >
        <Route index element={<Dashboard />} />
        <Route path="create" element={<CreateReel />} />
        <Route path="reels" element={<MyReels />} />
        <Route path="reels/:id/generating" element={<ReelGenerating />} />
        <Route path="reels/:id" element={<ReelResult />} />
        <Route path="templates" element={<Templates />} />
        <Route path="brand-kit" element={<BrandKit />} />
        <Route path="usage" element={<Usage />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}