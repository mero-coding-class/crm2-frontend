import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { Toaster } from 'sonner';
import App from './App.jsx';
import './index.css';

// Configure axios for Django session authentication
axios.defaults.withCredentials = true;
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

// Intercept global fetch so all API calls send session cookies and CSRF tokens
const originalFetch = window.fetch;
window.fetch = function (resource, init = {}) {
  const options = { ...init };
  if (!options.credentials) {
    options.credentials = 'include';
  }

  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const match = document.cookie.match(/(^|;)\s*csrftoken=([^;]+)/);
    const csrfToken = match ? decodeURIComponent(match[2]) : null;
    if (csrfToken) {
      if (options.headers instanceof Headers) {
        options.headers.set('X-CSRFToken', csrfToken);
      } else {
        options.headers = {
          ...(options.headers || {}),
          'X-CSRFToken': csrfToken,
        };
      }
    }
  }

  return originalFetch(resource, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          borderRadius: "10px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.04)",
        },
      }}
      closeButton
      richColors
    />
  </React.StrictMode>,
);