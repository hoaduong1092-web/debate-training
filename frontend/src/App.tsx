import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Dashboard } from './components/Dashboard';
import Login from './components/Login';

export default function App() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500 text-sm">
        Đang khởi tạo hệ thống...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/arena" replace />} />
      <Route path="/arena" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/arena" : "/login"} replace />} />
    </Routes>
  );
}
