import React, { useContext, useState } from "react";
import {
  NavLink,
  useNavigate,
  Outlet,
  useLocation,
  Link,
} from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  MonitorPlay,
  Archive,
  GraduationCap,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronUp,
  Home,
  Bell,
  Search,
  Settings,
  HelpCircle,
  User,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import { cn } from "../lib/utils.js";

const getRole = () => (localStorage.getItem("role") || "").trim().toLowerCase();
const canManage = (role) => role === "admin" || role === "superadmin";
const getUsername = () => (localStorage.getItem("username") || "").trim();
const getInitials = (name) => {
  const n = (name || "").trim();
  if (!n) return "U";
  const parts = n.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n[0].toUpperCase();
};

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/leads", icon: UserPlus, label: "Leads" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/demo", icon: MonitorPlay, label: "Demo" },
  { to: "/archive", icon: Archive, label: "Archive" },
];

const MainLayout = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = [
    { label: "Home", to: "/dashboard" },
    ...pathSegments.map((seg, idx) => {
      const to = "/" + pathSegments.slice(0, idx + 1).join("/");
      const label = seg
        .split("-")
        .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
        .join(" ");
      return { label, to };
    }),
  ];

  const username = getUsername() || "User";
  const role = getRole();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-[Inter,system-ui,sans-serif] antialiased overflow-hidden">

      {/* ─── Mobile overlay ─── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-300",
          "w-[260px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-14 px-5 border-b border-slate-100 shrink-0">
          <div className="h-7 w-7 rounded-[8px] bg-indigo-600 flex items-center justify-center shadow-sm">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[14px] font-[600] leading-[20px] text-slate-900 tracking-[-0.005em]">
              EDU CRM
            </p>
            <p className="text-[11px] font-[500] text-slate-400 leading-[14px] tracking-[0.02em] uppercase">
              Global Admissions
            </p>
          </div>
          <button
            className="ml-auto md:hidden text-slate-400 hover:text-slate-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          <p className="px-2 pt-1 pb-2 text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em]">
            Main
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-[8px] text-[14px] font-[500] transition-all duration-150 group",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-[600]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  {label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom links */}
        <div className="px-3 pb-4 border-t border-slate-100 shrink-0 pt-3 space-y-0.5">
          <NavLink
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-[8px] text-[14px] font-[500] transition-all duration-150 group",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-[600]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Settings
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                Settings
              </>
            )}
          </NavLink>
          <NavLink
            to="/help"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-[8px] text-[14px] font-[500] transition-all duration-150 group",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-[600]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <HelpCircle
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                Help & Support
              </>
            )}
          </NavLink>
        </div>


      </aside>

      {/* ─── Main content ─── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[260px]">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center gap-3 px-4 md:px-6 shrink-0 z-20">
          <button
            className="h-8 w-8 rounded-[6px] border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px]">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.to}>
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
                {i < breadcrumbs.length - 1 ? (
                  <Link
                    to={b.to}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    {i === 0 && <Home className="h-3.5 w-3.5" />}
                    {i > 0 && b.label}
                  </Link>
                ) : (
                  <span className="font-[600] text-slate-900">
                    {i === 0 ? (
                      <span className="flex items-center gap-1">
                        <Home className="h-3.5 w-3.5" />
                        {b.label}
                      </span>
                    ) : (
                      b.label
                    )}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 h-8 px-3 rounded-[8px] border border-slate-200 bg-slate-50 text-slate-400 text-[13px] cursor-pointer hover:border-slate-300 transition-colors min-w-[200px]">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span>Search leads, students…</span>
              <span className="ml-auto text-[11px] font-[500] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">⌘K</span>
            </div>
            <button className="relative h-8 w-8 rounded-[6px] border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 border border-white" />
            </button>

            {/* Profile avatar + dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-[700] text-white cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
              >
                {getInitials(username)}
              </button>

              {profileOpen && (
                <>
                  {/* Click-outside overlay */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  />
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-[10px] shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-[13px] font-[600] text-slate-800 truncate">{username}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{role || "user"}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setProfileOpen(false); navigate("/profile"); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        View Profile
                      </button>
                      <button
                        onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-400" />
                        Settings
                      </button>
                    </div>
                    <div className="py-1 border-t border-slate-100">
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
