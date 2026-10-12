import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import { BASE_URL } from "../config";

async function fetchUserProfile(token, fallbackUsername) {
  const headers = { Authorization: `Token ${token}` };
  // Get user list and try to find the matching user by username
  try {
    const { data } = await axios.get(`${BASE_URL}/users/`, { headers });
    const list = Array.isArray(data) ? data : data.results || [];
    const found =
      list.find((u) => u?.username === fallbackUsername) ?? list[0] ?? null;
    if (!found) return { username: fallbackUsername };

    // If we have an id, fetch the full user resource at /users/{id}/
    if (found?.id != null) {
      try {
        const { data: full } = await axios.get(
          `${BASE_URL}/users/${found.id}/`,
          { headers }
        );
        return full;
      } catch (_) {
        return found; // return partial entry if detailed endpoint not available
      }
    }

    return found;
  } catch (_) {
    return { username: fallbackUsername }; // last resort
  }
}

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  useEffect(() => {
    if (location.state?.registrationSuccess && location.state?.username) {
      setFormData((prev) => ({ ...prev, username: location.state.username }));
      setError("Registration successful! Please log in.");
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1) Login to get token
      const { data } = await axios.post(
        `${BASE_URL}/auth/login/`,
        {
          username: formData.username,
          password: formData.password,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      // Backend returns user profile directly (session auth) or a token object
      const token = data.key || data.token || "session-auth";
      const me = data?.role ? data : await fetchUserProfile(token, formData.username);

      // 3) Persist token + user profile in context so AuthContext has full user info
      login(token, me);

      // 4) Save username/role so MainLayout and other parts can display them
      if (me?.username) localStorage.setItem("username", me.username);
      if (me?.role) localStorage.setItem("role", me.role);
      // optional: id/email
      if (me?.id) localStorage.setItem("userId", String(me.id));
      if (me?.email !== undefined)
        localStorage.setItem("email", me.email || "");

      // 5) Go to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        "Login failed. Please check your credentials."
      );
      console.error("Login error:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC] p-4" style={{
      backgroundImage: "radial-gradient(circle at 60% 20%, rgba(41,73,152,0.06) 0%, transparent 55%), radial-gradient(circle at 20% 80%, rgba(232,160,38,0.05) 0%, transparent 40%)"
    }}>
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-white border border-[#CDDBF6] p-2.5 flex items-center justify-center shadow-sm mb-3">
            <img
              src="/merocoding-logo.png"
              alt="MeroCoding"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-[22px] font-[700] text-slate-900 tracking-[-0.02em] leading-[28px]">
            MeroCoding
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">School CRM &amp; LMS ERP System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[16px] border border-slate-200 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07),_0_2px_4px_-2px_rgba(15,23,42,0.05)] p-8">
          <div className="mb-6">
            <h2 className="text-[20px] font-[600] text-slate-900 tracking-[-0.015em] leading-[28px]">
              Sign in to your account
            </h2>
            <p className="text-[13px] text-slate-500 mt-1">Welcome back — enter your credentials below</p>
          </div>

          {error && (
            <div className={`flex items-start gap-2 p-3 rounded-[8px] mb-5 text-[13px] leading-[18px] border ${error.includes("successful")
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-600"
              }`}>
              <svg className="h-4 w-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-[13px] font-[500] text-slate-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                className="w-full h-10 px-3 text-[14px] rounded-[8px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15 hover:border-slate-300 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-[500] text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full h-10 px-3 text-[14px] rounded-[8px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15 hover:border-slate-300 transition-colors"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-3.5 w-3.5 rounded-[4px] border-slate-300 text-[#294998] focus:ring-[#294998]"
                />
                <label htmlFor="rememberMe" className="text-[13px] text-slate-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="text-[13px] text-[#294998] hover:text-[#1E3776] font-[500] hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#294998] text-white text-[14px] font-[600] rounded-[8px] hover:bg-[#1E3776] active:bg-[#172B5C] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-[13px] text-slate-500">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            disabled={loading}
            className="text-[#294998] font-[500] hover:underline transition-colors"
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
