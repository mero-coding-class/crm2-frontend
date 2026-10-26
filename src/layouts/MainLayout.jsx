import React, { useContext, useState, useEffect, useCallback } from "react";
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
  Home,
  Search,
  Bell,
  ClipboardCheck,
  Settings,
  User,
  FileBarChart,
  Download,
  HelpCircle,
  Command,
  Code2,
  RefreshCw,
} from "lucide-react";
import { AuthContext } from "../context/authContext.js";
import { cn } from "../lib/utils.js";
import { TooltipProvider } from "../components/ui/tooltip.jsx";
import { approvalService, notificationService } from "../services/api.js";
import useRealtimeUpdates from "../hooks/useRealtimeUpdates.js";

const getRole = () => (localStorage.getItem("role") || "").trim().toLowerCase();
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
  { to: "/report", icon: FileBarChart, label: "Reports" },
  // Task 3.1: "Pipeline" renamed to "Activity Log" globally
];

const bottomNavItems = [
  { to: "/settings", icon: Settings, label: "Settings" },
  // Help & Support removed per requirement #7
];

// Command palette data
const ALL_COMMANDS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, category: "Navigate" },
  { label: "Leads", to: "/leads", icon: UserPlus, category: "Navigate" },
  { label: "Clients", to: "/clients", icon: Users, category: "Navigate" },
  { label: "Demo", to: "/demo", icon: MonitorPlay, category: "Navigate" },
  { label: "Archive", to: "/archive", icon: Archive, category: "Navigate" },
  { label: "Reports", to: "/report", icon: FileBarChart, category: "Navigate" },
  { label: "Settings", to: "/settings", icon: Settings, category: "Navigate" },
  // Help & Support removed per requirement #7
  { label: "Downloads", to: "/downloads", icon: Download, category: "Navigate" },
];

const MainLayout = () => {
  const { logout, authToken, user } = useContext(AuthContext);
  useRealtimeUpdates(authToken);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
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

  const username = user?.username || getUsername() || "User";
  const role = String(user?.role || getRole()).toLowerCase();
  const isAdmin = role === "admin";
  const restrictedPaths = new Set(
    role === "academic"
      ? ["/leads", "/archive", "/report"]
      : role === "b2c"
        ? ["/report"]
        : []
  );
  const visibleNavItems = navItems.filter((item) => !restrictedPaths.has(item.to));
  if (isAdmin) {
    visibleNavItems.push({ to: "/approvals", icon: ClipboardCheck, label: "Approvals" });
  }
  const commandItems = ALL_COMMANDS.filter((item) =>
    !restrictedPaths.has(item.to) && (isAdmin || item.to !== "/settings")
  );

  const refreshApprovalCount = useCallback(async () => {
    if (!authToken || !isAdmin) {
      setPendingApprovalCount(0);
      return;
    }
    try {
      const result = await approvalService.getPendingCount(authToken);
      setPendingApprovalCount(Number(result?.count) || 0);
    } catch {
      // Keep the last backend count visible through a temporary request failure.
    }
  }, [authToken, isAdmin]);

  const refreshNotifications = useCallback(async () => {
    if (!authToken) return;
    const [recent, unread] = await Promise.allSettled([
      notificationService.getNotifications(authToken),
      notificationService.getNotifications(authToken, { unread: true, pageSize: 1 }),
    ]);
    if (recent.status === "fulfilled") setNotifications(recent.value.results);
    if (unread.status === "fulfilled") setUnreadCount(unread.value.count);
  }, [authToken]);

  useEffect(() => {
    refreshApprovalCount();
    const interval = window.setInterval(refreshApprovalCount, 30000);
    const refreshOnLeadChange = () => refreshApprovalCount();
    window.addEventListener("crm:leadCreated", refreshOnLeadChange);
    window.addEventListener("crm:imported", refreshOnLeadChange);
    window.addEventListener("crm:approvalUpdated", refreshOnLeadChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("crm:leadCreated", refreshOnLeadChange);
      window.removeEventListener("crm:imported", refreshOnLeadChange);
      window.removeEventListener("crm:approvalUpdated", refreshOnLeadChange);
    };
  }, [refreshApprovalCount]);

  useEffect(() => {
    refreshNotifications();
    const interval = window.setInterval(refreshNotifications, 30000);
    return () => window.clearInterval(interval);
  }, [refreshNotifications]);

  useEffect(() => {
    const refreshRealtimeIndicators = () => {
      refreshApprovalCount();
      refreshNotifications();
    };
    window.addEventListener("crm:remoteChange", refreshRealtimeIndicators);
    return () => window.removeEventListener("crm:remoteChange", refreshRealtimeIndicators);
  }, [refreshApprovalCount, refreshNotifications]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Command palette keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
        setCommandQuery("");
      }
      if (e.key === "Escape") {
        setCommandOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredCommands = commandQuery.trim()
    ? commandItems.filter((c) =>
      c.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(commandQuery.toLowerCase())
    )
    : commandItems;

  const handleCommandSelect = (cmd) => {
    setCommandOpen(false);
    setCommandQuery("");
    navigate(cmd.to);
  };

  const openNotification = async (notification) => {
    setNotificationOpen(false);
    if (!notification.is_read) {
      try {
        await notificationService.markRead(notification.id, authToken);
        setNotifications((current) => current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        ));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // Opening the related page remains available if marking read fails.
      }
    }
    if (notification.kind === "lead_pending_approval" && isAdmin) {
      navigate("/approvals");
    } else if (notification.kind !== "lead_rejected") {
      const destination = role === "academic" ? "/demo" : "/leads";
      navigate(`${destination}?search=${encodeURIComponent(notification.lead_school_name || "")}`);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
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
            "w-[220px]",
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          {/* Logo / Header */}
          <div className="flex items-center gap-2.5 h-16 px-3.5 border-b border-slate-100 shrink-0">
            <div className="h-9 w-9 rounded-[9px] bg-white border border-slate-200/80 flex items-center justify-center p-1 shadow-2xs shrink-0">
              <img
                src="/merocoding-logo.png"
                alt="MeroCoding"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-[700] leading-[18px] tracking-[-0.01em] truncate">
                <span className="text-[#294998]">MeroCoding</span>
              </p>
              <p className="text-[11px] font-[500] text-slate-400 leading-[14px] truncate mt-0.5">
                School CRM
              </p>
            </div>
            <button
              className="ml-auto md:hidden text-slate-400 hover:text-slate-700 shrink-0"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            <p className="px-2.5 pt-1 pb-2 text-[10px] font-[600] text-slate-400 uppercase tracking-[0.06em]">
              Main
            </p>
            {visibleNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "relative isolate flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13px] font-[500] transition-all duration-300 ease-out group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294998]/30 focus-visible:ring-offset-1 motion-reduce:transition-none",
                    isActive
                      ? "bg-gradient-to-r from-[#edf2fc] via-[#edf2fc]/70 to-white text-[#172b5c] font-[600] border border-[#cddbf6]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(41,73,152,0.07)]"
                      : "text-slate-600 border border-transparent hover:-translate-y-0.5 hover:border-[#d6e2f8] hover:bg-white hover:text-[#203b78] hover:shadow-[0_5px_14px_rgba(41,73,152,0.10)] focus-visible:border-[#d6e2f8]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#294998]/[0.08] via-[#294998]/[0.035] to-transparent transition-opacity duration-300 group-focus-visible:opacity-100 motion-reduce:transition-none",
                        isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                      )}
                    />

                    {/* Amber rail grows in on hover and stays visible for the active page. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 top-2 bottom-2 w-[3px] origin-center rounded-r-full bg-[#E8A026] shadow-[0_0_9px_rgba(232,160,38,0.45)] transition-transform duration-300 ease-out motion-reduce:transition-none",
                        isActive ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100"
                      )}
                    />

                    {/* Icon Tile */}
                    <div
                      className={cn(
                        "relative z-10 h-7 w-7 rounded-[8px] flex items-center justify-center shrink-0 transition-all duration-300 ease-out motion-reduce:transition-none",
                        isActive
                          ? "bg-[#294998] text-white shadow-[0_3px_8px_rgba(41,73,152,0.28)]"
                          : "bg-slate-100/80 text-slate-500 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg] group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-[#294998] group-hover:to-[#4569b6] group-hover:text-white group-hover:shadow-[0_5px_10px_rgba(41,73,152,0.28)] group-focus-visible:bg-[#294998] group-focus-visible:text-white group-focus-visible:shadow-[0_5px_10px_rgba(41,73,152,0.22)]"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-[4deg] group-hover:scale-110 motion-reduce:transition-none" />
                    </div>

                    <span className="relative z-10 truncate transition-transform duration-300 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none">{label}</span>

                    {label === "Approvals" && pendingApprovalCount > 0 && (
                      <span aria-label={`${pendingApprovalCount} pending approvals`} className="relative z-10 ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                        {pendingApprovalCount > 99 ? "99+" : pendingApprovalCount}
                      </span>
                    )}

                    {/* Right Interactive Indicator */}
                    <ChevronRight
                      className={cn(
                        "relative z-10 ml-auto h-3.5 w-3.5 shrink-0 transition-all duration-300 ease-out motion-reduce:transition-none",
                        isActive
                          ? "text-[#294998] opacity-90 translate-x-0 group-hover:translate-x-0.5"
                          : "text-[#294998] opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0 group-focus-visible:opacity-80 group-focus-visible:translate-x-0"
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom links */}
          <div className="px-2 pb-4 border-t border-slate-100 shrink-0 pt-3 space-y-1">
            {(isAdmin ? bottomNavItems : []).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "relative isolate flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-[13px] font-[500] transition-all duration-300 ease-out group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#294998]/30 focus-visible:ring-offset-1 motion-reduce:transition-none",
                    isActive
                      ? "bg-gradient-to-r from-[#edf2fc] via-[#edf2fc]/70 to-white text-[#172b5c] font-[600] border border-[#cddbf6]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(41,73,152,0.07)]"
                      : "text-slate-600 border border-transparent hover:-translate-y-0.5 hover:border-[#d6e2f8] hover:bg-white hover:text-[#203b78] hover:shadow-[0_5px_14px_rgba(41,73,152,0.10)] focus-visible:border-[#d6e2f8]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#294998]/[0.08] via-[#294998]/[0.035] to-transparent transition-opacity duration-300 group-focus-visible:opacity-100 motion-reduce:transition-none",
                        isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                      )}
                    />

                    {/* Amber rail grows in on hover and stays visible for the active page. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 top-2 bottom-2 w-[3px] origin-center rounded-r-full bg-[#E8A026] shadow-[0_0_9px_rgba(232,160,38,0.45)] transition-transform duration-300 ease-out motion-reduce:transition-none",
                        isActive ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100"
                      )}
                    />

                    {/* Icon Tile */}
                    <div
                      className={cn(
                        "relative z-10 h-7 w-7 rounded-[8px] flex items-center justify-center shrink-0 transition-all duration-300 ease-out motion-reduce:transition-none",
                        isActive
                          ? "bg-[#294998] text-white shadow-[0_3px_8px_rgba(41,73,152,0.28)]"
                          : "bg-slate-100/80 text-slate-500 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg] group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-[#294998] group-hover:to-[#4569b6] group-hover:text-white group-hover:shadow-[0_5px_10px_rgba(41,73,152,0.28)] group-focus-visible:bg-[#294998] group-focus-visible:text-white group-focus-visible:shadow-[0_5px_10px_rgba(41,73,152,0.22)]"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-[4deg] group-hover:scale-110 motion-reduce:transition-none" />
                    </div>

                    <span className="relative z-10 truncate transition-transform duration-300 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none">{label}</span>

                    {/* Right Interactive Indicator */}
                    <ChevronRight
                      className={cn(
                        "relative z-10 ml-auto h-3.5 w-3.5 shrink-0 transition-all duration-300 ease-out motion-reduce:transition-none",
                        isActive
                          ? "text-[#294998] opacity-90 translate-x-0 group-hover:translate-x-0.5"
                          : "text-[#294998] opacity-0 -translate-x-1 group-hover:opacity-80 group-hover:translate-x-0 group-focus-visible:opacity-80 group-focus-visible:translate-x-0"
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Bottom Copyright */}
          <div className="px-3 pb-3 shrink-0">
            <div className="flex items-center justify-between px-3 py-2 rounded-[9px] bg-slate-50 border border-slate-200/60 shadow-2xs">
              <span className="text-[11px] font-[500] text-slate-600 truncate">
                © 2026 MeroCoding
              </span>
              <span className="text-[9.5px] font-[600] px-1.5 py-0.5 rounded-[5px] bg-white text-slate-500 border border-slate-200/70 uppercase tracking-wider shadow-2xs shrink-0">
                CRM
              </span>
            </div>
          </div>
        </aside>

        {/* ─── Main content ─── */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-[220px]">
          {/* Top bar */}
          <header className="h-14 border-b border-slate-200 bg-white flex items-center gap-3 px-4 md:px-5 shrink-0 z-20">
            <button
              className="h-8 w-8 rounded-[6px] border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] min-w-0">
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={`${i}-${b.to}`}>
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                  {i < breadcrumbs.length - 1 ? (
                    <Link
                      to={b.to}
                      className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                    >
                      {i === 0 && <Home className="h-3.5 w-3.5" />}
                      {i > 0 && <span className="hidden sm:inline">{b.label}</span>}
                    </Link>
                  ) : (
                    <span className="font-[600] text-slate-900 truncate">
                      {i === 0 ? (
                        <span className="flex items-center gap-1">
                          <Home className="h-3.5 w-3.5 shrink-0" />
                          <span className="hidden sm:inline">{b.label}</span>
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
              {/* Command palette trigger */}
              <button
                onClick={() => { setCommandOpen(true); setCommandQuery(""); }}
                className="hidden md:flex items-center gap-2 h-8 px-3 rounded-[8px] border border-slate-200 bg-slate-50 text-slate-400 text-[13px] cursor-pointer hover:border-slate-300 transition-colors min-w-[180px]"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">Search…</span>
                <span className="ml-auto text-[11px] font-[500] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 shrink-0">⌘K</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                  aria-expanded={notificationOpen}
                  onClick={() => {
                    setProfileOpen(false);
                    setNotificationOpen((open) => !open);
                    refreshNotifications();
                  }}
                  className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-none text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                </button>
                {notificationOpen && <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationOpen(false)} />
                  <section aria-label="Notifications" className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div><h2 className="text-sm font-semibold text-slate-900">Notifications</h2><p className="mt-0.5 text-[10px] text-slate-400">{unreadCount} unread</p></div>
                      <button type="button" aria-label="Refresh notifications" onClick={refreshNotifications} className="rounded p-1.5 text-slate-400 hover:bg-slate-100"><RefreshCw className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="max-h-[min(65vh,26rem)] overflow-y-auto divide-y divide-slate-100">
                      {notifications.length ? notifications.map((notification) => (
                        <button key={notification.id} type="button" onClick={() => openNotification(notification)} className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 ${notification.is_read ? "" : "bg-blue-50/40"}`}>
                          <span className="flex items-start gap-2.5">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? "bg-slate-200" : "bg-[#294998]"}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold leading-5 text-slate-800">{notification.message || notification.kind?.replaceAll("_", " ")}</span>
                              <span className="mt-0.5 block truncate text-[10px] text-slate-400">{notification.lead_system_id} · {new Date(notification.sent_at).toLocaleString("en-NP", { dateStyle: "medium", timeStyle: "short" })}</span>
                            </span>
                          </span>
                        </button>
                      )) : <p className="px-4 py-8 text-center text-xs text-slate-400">You’re all caught up.</p>}
                    </div>
                  </section>
                </>}
              </div>

              {/* Profile avatar + dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setNotificationOpen(false); setProfileOpen((o) => !o); }}
                  className="h-8 w-8 rounded-full bg-[#294998] flex items-center justify-center text-[11px] font-[700] text-white cursor-pointer hover:ring-2 hover:ring-[#294998]/30 transition-all shadow-xs"
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
                          My Profile
                        </button>
                        {isAdmin && <button
                          onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Settings className="h-3.5 w-3.5 text-slate-400" />
                          Settings
                        </button>}
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

        {/* ─── Command Palette ─── */}
        {commandOpen && (
          <>
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] z-50"
              onClick={() => setCommandOpen(false)}
            />
            <div className="fixed left-1/2 top-[20%] -translate-x-1/2 z-50 w-full max-w-lg px-4">
              <div className="bg-white rounded-[12px] border border-slate-200 shadow-[0_20px_40px_rgba(15,23,42,0.15)] overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 border-b border-slate-100 h-12">
                  <Search className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search pages, actions…"
                    value={commandQuery}
                    onChange={(e) => setCommandQuery(e.target.value)}
                    className="flex-1 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setCommandOpen(false);
                      if (e.key === "Enter" && filteredCommands.length > 0) {
                        handleCommandSelect(filteredCommands[0]);
                      }
                    }}
                  />
                  <button
                    onClick={() => setCommandOpen(false)}
                    className="text-[11px] font-[500] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded"
                  >
                    ESC
                  </button>
                </div>

                {/* Results */}
                <div className="py-2 max-h-72 overflow-y-auto">
                  {filteredCommands.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[13px] text-slate-400">
                      No results found
                    </div>
                  ) : (
                    <>
                      <p className="px-4 py-1.5 text-[11px] font-[600] text-slate-400 uppercase tracking-[0.04em]">
                        Navigation
                      </p>
                      {filteredCommands.map((cmd) => (
                        <button
                          key={cmd.to}
                          onClick={() => handleCommandSelect(cmd)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-[#edf2fc] hover:text-[#294998] transition-colors group"
                        >
                          <cmd.icon className="h-4 w-4 text-slate-400 group-hover:text-[#294998] shrink-0" />
                          <span>{cmd.label}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#294998]/70 ml-auto" />
                        </button>
                      ))}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">esc</kbd>
                    Close
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default MainLayout;
