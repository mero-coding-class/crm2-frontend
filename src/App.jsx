import React, { useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";


import { AuthContext, AuthProvider } from "./context/AuthContext.jsx";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Clients from "./pages/Clients";
import TrashPage from "./pages/TrashPage";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Downloads from "./pages/Downloads";
import Archive from "./pages/Archive";
import Demo from "./pages/Demo";
import HelpPage from "./pages/HelpPage";

function AppContent() {
  const { authToken } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        {/* Public route for login */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        {/* If authToken exists, render MainLayout and its children; otherwise, redirect to login */}
        <Route
          element={
            authToken ? <MainLayout /> : <Navigate to="/login" replace />
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/enrolled-students" element={<Navigate to="/clients" replace />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/report" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/help" element={<HelpPage />} />
          {/* Catch-all route within the protected area, redirects to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          {/* Legacy direct routes removed in favor of Settings */}
        </Route>

        {/* Fallback for unauthenticated users trying to access any route directly that isn't /login */}
        {/* This ensures that if no other route matches and there's no token, they go to login */}
        {!authToken && (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
