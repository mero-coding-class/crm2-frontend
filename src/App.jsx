import React, { lazy, Suspense, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";


import { AuthContext } from "./context/authContext.js";
import { AuthProvider } from "./context/AuthContext.jsx";
import MainLayout from "./layouts/MainLayout";
import PageLoadingState from "./components/common/PageLoadingState.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Leads = lazy(() => import("./pages/Leads.jsx"));
const Clients = lazy(() => import("./pages/Clients.jsx"));
const TrashPage = lazy(() => import("./pages/TrashPage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Downloads = lazy(() => import("./pages/Downloads.jsx"));
const Demo = lazy(() => import("./pages/Demo.jsx"));
const HelpPage = lazy(() => import("./pages/HelpPage.jsx"));
const Approvals = lazy(() => import("./pages/Approvals.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));

function AdminOnly({ children }) {
  const { user } = useContext(AuthContext);
  const role = String(user?.role || localStorage.getItem("role") || "").toLowerCase();
  return role === "admin" ? children : <Navigate to="/dashboard" replace />;
}

function RestrictedRole({ children, deniedRoles, redirectTo, preserveSearch = false }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const role = String(user?.role || localStorage.getItem("role") || "").toLowerCase();
  return deniedRoles.includes(role)
    ? <Navigate
      to={preserveSearch ? { pathname: redirectTo, search: location.search } : redirectTo}
      replace
    />
    : children;
}

function AppContent() {
  const { authToken } = useContext(AuthContext);

  return (
    <Router>
      <Suspense fallback={<PageLoadingState />}>
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
          <Route path="/approvals" element={<AdminOnly><Approvals /></AdminOnly>} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/leads"
            element={(
              <RestrictedRole deniedRoles={["academic"]} redirectTo="/demo" preserveSearch>
                <Leads />
              </RestrictedRole>
            )}
          />
          <Route path="/clients" element={<Clients />} />
          <Route path="/enrolled-students" element={<Navigate to="/clients" replace />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/trash" element={<Navigate to="/archive" replace />} />
          <Route
            path="/archive"
            element={(
              <RestrictedRole deniedRoles={["academic"]} redirectTo="/dashboard">
                <TrashPage />
              </RestrictedRole>
            )}
          />
          <Route
            path="/report"
            element={(
              <RestrictedRole deniedRoles={["academic", "b2c"]} redirectTo="/dashboard">
                <Reports />
              </RestrictedRole>
            )}
          />
          <Route path="/settings" element={<AdminOnly><Settings /></AdminOnly>} />
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
      </Suspense>
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
