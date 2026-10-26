// src/context/AuthContext.jsx
import React, { useState, useEffect, useCallback } from "react";
import { BASE_URL } from "../config";
import { AuthContext } from "./authContext.js";

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("authToken") || null
  );

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) return JSON.parse(raw);
    } catch {
      // Fall back to the legacy separate localStorage keys below.
    }
    // Backward-compat: if older code stored separate keys
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    if (username || role)
      return { username: username || null, role: role || null };
    return null;
  });

  // Login: save token and (optionally) user profile (username/role/id/email)
  const login = (token, userInfo) => {
    localStorage.setItem("authToken", token);
    setAuthToken(token);

    if (userInfo && typeof userInfo === "object") {
      localStorage.setItem("user", JSON.stringify(userInfo));
      if (userInfo.username)
        localStorage.setItem("username", userInfo.username);
      if (userInfo.role) localStorage.setItem("role", userInfo.role);
      if (userInfo.id != null)
        localStorage.setItem("userId", String(userInfo.id));
      if (userInfo.email != null)
        localStorage.setItem("email", userInfo.email || "");
      setUser(userInfo);
    }
  };

  // Allow updating user profile after fetching it elsewhere
  const setUserProfile = useCallback((userInfo) => {
    localStorage.setItem("user", JSON.stringify(userInfo || {}));
    if (userInfo?.username) localStorage.setItem("username", userInfo.username);
    if (userInfo?.role) localStorage.setItem("role", userInfo.role);
    if (userInfo?.id != null)
      localStorage.setItem("userId", String(userInfo.id));
    if (userInfo?.email != null)
      localStorage.setItem("email", userInfo.email || "");
    setUser(userInfo || null);
  }, []);

  const logout = () => {
    fetch(`${BASE_URL}/auth/logout/`, { method: "POST" }).catch(() => {
      // Clear local state even if the server cannot be reached during logout.
    });
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("email");
    setAuthToken(null);
    setUser(null);
  };

  // Keep state in sync across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setAuthToken(localStorage.getItem("authToken"));
      try {
        const raw = localStorage.getItem("user");
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Handle token expiry / 401 from api.js — clears React state in the same tab
  // and redirects to login, stopping the re-fetch loop.
  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("email");
      setAuthToken(null);
      setUser(null);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    };
    window.addEventListener("crm:authExpired", handleAuthExpired);
    return () => window.removeEventListener("crm:authExpired", handleAuthExpired);
  }, []);

  return (
    <AuthContext.Provider
      value={{ authToken, user, login, setUserProfile, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
