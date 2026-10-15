import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext.jsx";
import { BASE_URL } from "../config";

async function fetchUserProfile(token, fallbackUsername) {
  try {
    const { data } = await axios.get(`${BASE_URL}/auth/me/`);
    if (data && data.username) return data;
  } catch (_) {}
  try {
    const { data } = await axios.get(`${BASE_URL}/users/`);
    const list = Array.isArray(data) ? data : data.results || [];
    const found =
      list.find((u) => u?.username === fallbackUsername) ?? list[0] ?? null;
    if (found) return found;
  } catch (_) {}
  return { username: fallbackUsername };
}

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Task 1.1: Show password toggle state
  const [showPassword, setShowPassword] = useState(false);

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
        
        { withCredentials:true, headers: { "Content-Type": "application/json" } }
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

            {/* Task 1.1: Password field with show/hide toggle */}
            <div>
              <label htmlFor="password" className="block text-[13px] font-[500] text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full h-10 px-3 pr-10 text-[14px] rounded-[8px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#294998] focus:ring-[3px] focus:ring-[#294998]/15 hover:border-slate-300 transition-colors"
                  required
                />
                {/* Eye icon toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    /* Eye-off icon */
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    /* Eye icon */
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Task 1.1: Only "Remember me" checkbox — Forgot Password removed */}
            <div className="flex items-center">
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
              {/* Forgot Password link removed per Task 1.1 */}
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
        {/* Task 1.1: Register Here link removed */}
      </div>
    </div>
  );
};

export default Login;
