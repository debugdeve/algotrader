// AlgOTRADER PRO PRODUCTION BUILD TRIGGER
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ScannerPage from './pages/ScannerPage';
import TradePage from './pages/TradePage';
import ChartsPage from './pages/ChartsPage';
import BacktestPage from './pages/BacktestPage';
import CustomScreenerPage from './pages/CustomScreenerPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import MarketInsightsPage from './pages/MarketInsightsPage';
import './index.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading AlgoTrader...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return (
    <div className="app-container">
      <Sidebar />
      <main className="content">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected Trading Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/scanner" element={<ProtectedRoute><ScannerPage /></ProtectedRoute>} />
          <Route path="/trade" element={<ProtectedRoute><TradePage /></ProtectedRoute>} />
          <Route path="/charts" element={<ProtectedRoute><ChartsPage /></ProtectedRoute>} />
          <Route path="/backtest" element={<ProtectedRoute><BacktestPage /></ProtectedRoute>} />
          <Route path="/custom-screener" element={<ProtectedRoute><CustomScreenerPage /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><MarketInsightsPage /></ProtectedRoute>} />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
