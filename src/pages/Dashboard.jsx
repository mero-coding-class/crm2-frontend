import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  GraduationCap,
  Handshake,
  RefreshCw,
  School,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/useAuth.js";
import { dashboardService } from "../services/api.js";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/ui/chart.jsx";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";

const toIsoDate = (date) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
};

const getRange = (selection) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let end = new Date(today);
  let start = new Date(today);
  if (selection === "this_month") {
    start.setDate(1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (selection === "last_30") start.setDate(start.getDate() - 29);
  else if (selection === "last_90") start.setDate(start.getDate() - 89);
  else if (selection === "year_to_date") start = new Date(today.getFullYear(), 0, 1);
  return { from: toIsoDate(start), to: toIsoDate(end) };
};

const dateTimeBound = (value, endOfDay = false) => {
  if (!value) return "";
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const periodLabel = (selection) => ({
  this_month: "This month",
  last_30: "Last 30 days",
  last_90: "Last 90 days",
  year_to_date: "Year to date",
}[selection] || "This month");

const PIPELINE_STAGES = ["New", "Contacted", "Follow-up", "Visit scheduled", "Demo scheduled", "Proposal sent", "Interested", "On hold", "Not interested"];

const formatDate = (value, options = { dateStyle: "medium" }) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-NP", options);
};

const latestFollowupsBySchool = (tasks) => {
  const latestBySchool = new Map();
  tasks.forEach((task) => {
    const leadId = typeof task.lead === "object" ? task.lead?.id : task.lead;
    const key = String(leadId ?? task.system_id ?? task.school_name?.trim().toLowerCase() ?? task.id);
    const timestamp = new Date(
      task.source_activity_at || task.source_activity_entered_at || task.due_at || 0,
    ).getTime();
    const current = latestBySchool.get(key);
    const currentTimestamp = current
      ? new Date(
        current.source_activity_at || current.source_activity_entered_at || current.due_at || 0,
      ).getTime()
      : Number.NEGATIVE_INFINITY;
    const activityId = Number(task.source_activity) || 0;
    const currentActivityId = Number(current?.source_activity) || 0;
    const taskId = Number(task.id) || 0;
    const currentTaskId = Number(current?.id) || 0;
    if (
      !current
      || timestamp > currentTimestamp
      || (timestamp === currentTimestamp && activityId > currentActivityId)
      || (timestamp === currentTimestamp && activityId === currentActivityId && taskId > currentTaskId)
    ) latestBySchool.set(key, task);
  });
  return [...latestBySchool.values()];
};

const formatNpr = (value) => new Intl.NumberFormat("en-NP", {
  style: "currency", currency: "NPR", maximumFractionDigits: 0,
}).format(Number(value) || 0);

const comparison = (current, previous, suffix = "%") => {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (now === before) return { text: "No change", positive: null };
  if (!before) return { text: now ? "New this period" : "No change", positive: now > 0 };
  const diff = ((now - before) / before) * 100;
  return {
    text: `${diff > 0 ? "+" : ""}${diff.toFixed(0)}${suffix} vs previous period`,
    positive: diff > 0,
  };
};

const Surface = ({ title, description, action, children, className = "", surfaceBackground = "bg-white" }) => (
  <section className={`rounded-2xl border border-slate-200/80 ${surfaceBackground} shadow-[0_2px_10px_rgba(15,23,42,0.035)] ${className}`}>
    {(title || action) && (
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          {title && <h2 className="text-sm font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>}
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

const StatCard = ({ icon, label, value, detail, change, href, tone = "blue", attention = false }) => {
  const toneStyles = {
    blue: "bg-blue-50 text-primary ring-blue-100",
    teal: "bg-teal-50 text-teal-700 ring-teal-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };
  const Content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${toneStyles[tone]}`}>
          {React.createElement(icon, { className: "h-[17px] w-[17px]", strokeWidth: 1.8 })}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold leading-none tracking-[-0.04em] text-slate-950 tabular-nums">{value}</p>
        {href && <ArrowUpRight className="mb-0.5 h-4 w-4 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />}
      </div>
      <div className="mt-3 min-h-[34px]">
        {change && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${change.positive === null ? "text-slate-400" : change.positive ? "text-emerald-700" : "text-rose-600"}`}>
            {change.positive === false ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
            {change.text}
          </span>
        )}
        <p className={`text-xs leading-[17px] ${attention ? "font-medium text-rose-600" : "text-slate-400"}`}>{detail}</p>
      </div>
    </>
  );
  const className = `group min-w-0 rounded-2xl border bg-white p-4 text-left transition duration-150 ${href ? "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" : ""} ${attention ? "border-rose-200/80" : "border-slate-200/80"}`;
  return href ? <Link to={href} className={className}>{Content}</Link> : <div className={className}>{Content}</div>;
};

const FollowupQueue = ({ groups }) => {
  const [activeKey, setActiveKey] = useState(groups[0]?.key || "overdue");
  const activeGroup = groups.find((group) => group.key === activeKey) || groups[0];
  const tones = {
    rose: { icon: "bg-rose-50 text-rose-700", count: "bg-rose-800 text-white", surface: "bg-rose-50/40" },
    blue: { icon: "bg-blue-50 text-primary", count: "bg-primary text-white", surface: "bg-blue-50/40" },
    teal: { icon: "bg-teal-50 text-teal-700", count: "bg-teal-800 text-white", surface: "bg-teal-50/40" },
  };
  const style = tones[activeGroup?.tone] || tones.blue;

  return (
    <Surface
      className="flex min-h-[260px] flex-col"
      surfaceBackground={style.surface}
      title="Follow-ups"
      description="The latest follow-up for each school, grouped by due date."
      action={<Link to="/leads" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">View leads <ArrowRight className="h-3.5 w-3.5" /></Link>}
    >
      <div className="flex flex-wrap gap-1.5 px-5 pt-4" role="tablist" aria-label="Follow-up due date">
        {groups.map((group) => (
          <button key={group.key} type="button" role="tab" aria-selected={activeKey === group.key} onClick={() => setActiveKey(group.key)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeKey === group.key ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/70 hover:text-slate-700"}`}>
            {group.title}<span className="tabular-nums text-slate-400">{group.tasks.length}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="max-h-[360px] flex-1 divide-y divide-slate-100 overflow-y-auto px-5 py-1">
        {activeGroup?.tasks.length ? activeGroup.tasks.map((task) => (
          <Link key={task.id} to={`/leads?search=${encodeURIComponent(task.school_name || "")}`} className="flex items-center gap-3 py-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style.icon}`}><activeGroup.icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-slate-700">{task.school_name || "Follow-up"}</span>
              <span className="mt-1 block truncate text-xs text-slate-400">{task.system_id || "School"} · {task.action || "Follow-up"}</span>
            </span>
            <span className="shrink-0 text-right text-xs font-medium text-slate-500">{formatDate(task.due_at, { dateStyle: "medium", timeStyle: "short" })}</span>
          </Link>
        )) : <p className="py-8 text-center text-xs text-slate-400">{activeGroup?.emptyMessage}</p>}
      </div>
    </Surface>
  );
};

const Dashboard = () => {
  const { authToken, user } = useAuth();
  const role = String(user?.role || localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";
  const isAcademic = role === "academic";
  const isB2B = role === "b2b";
  const [range, setRange] = useState("this_month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const requestIdRef = useRef(0);

  const loadDashboard = useCallback(async (quiet = false) => {
    if (!authToken) return;
    const requestId = ++requestIdRef.current;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const payload = await dashboardService.getDashboard(authToken, getRange(range));
      if (requestId !== requestIdRef.current) return;
      setData(payload);
      setLastUpdatedAt(Date.now());
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(loadError.message || "The dashboard could not be loaded.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [authToken, range]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useRealtimeRefresh(authToken, () => loadDashboard(true));

  useEffect(() => {
    if (!authToken) return undefined;
    let lastRefreshAt = Date.now();
    const refreshVisibleDashboard = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshAt < 3000) return;
      lastRefreshAt = now;
      loadDashboard(true);
    };
    const interval = window.setInterval(refreshVisibleDashboard, 30000);
    window.addEventListener("focus", refreshVisibleDashboard);
    document.addEventListener("visibilitychange", refreshVisibleDashboard);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisibleDashboard);
      document.removeEventListener("visibilitychange", refreshVisibleDashboard);
    };
  }, [authToken, loadDashboard]);

  const summary = useMemo(() => data?.summary || {}, [data]);
  const current = useMemo(() => summary.current || {}, [summary]);
  const previous = useMemo(() => summary.previous || {}, [summary]);
  const renewals = useMemo(() => summary.renewals || {}, [summary]);
  const periodFrom = dateTimeBound(summary.period?.from);
  const periodTo = dateTimeBound(summary.period?.to, true);
  const firstName = user?.first_name || user?.username || localStorage.getItem("username") || "there";
  const dashboardDemos = useMemo(() => [
    ...(data?.overdue_demos || []).map((demo) => ({ ...demo, dashboardBucket: "Overdue" })),
    ...(data?.today_demos || []).map((demo) => ({ ...demo, dashboardBucket: "Today" })),
    ...(data?.upcoming_demos || []).map((demo) => ({ ...demo, dashboardBucket: "Upcoming" })),
  ].sort((first, second) => new Date(first.demo_at) - new Date(second.demo_at)), [data]);
  const upcomingFollowups = useMemo(() => data?.upcoming_followups || [
    ...(data?.tomorrow || []),
    ...(data?.next_7_days || []),
  ], [data]);
  const latestFollowupIds = useMemo(() => new Set(latestFollowupsBySchool([
    ...(data?.overdue || []),
    ...(data?.today || []),
    ...upcomingFollowups,
  ]).map((task) => task.id)), [data, upcomingFollowups]);
  const overdueFollowups = useMemo(
    () => (data?.overdue || []).filter((task) => latestFollowupIds.has(task.id)),
    [data, latestFollowupIds],
  );
  const todayFollowups = useMemo(
    () => (data?.today || []).filter((task) => latestFollowupIds.has(task.id)),
    [data, latestFollowupIds],
  );
  const upcomingDashboardFollowups = useMemo(
    () => upcomingFollowups.filter((task) => latestFollowupIds.has(task.id)),
    [upcomingFollowups, latestFollowupIds],
  );

  const cards = useMemo(() => {
    if (!summary || !data) return [];
    if (isAcademic) return [
      { icon: ClipboardCheck, label: "Pending Approval Leads", value: summary.pending_approval_leads || 0, detail: "Leads awaiting admin review", tone: "amber" },
      { icon: CalendarDays, label: "Upcoming sessions", value: summary.upcoming_demos || 0, detail: "Future scheduled demos", href: "/demo?demo_status=active&upcoming=true", tone: "teal" },
      { icon: FileCheck2, label: "Feedback to submit", value: summary.feedback_needed || 0, detail: "Completed sessions waiting for your notes", href: "/demo?feedback=pending", tone: "amber", attention: !!summary.feedback_needed },
      { icon: CheckCircle2, label: "Demos completed", value: current.demos_completed || 0, detail: `${periodLabel(range).toLowerCase()} · compared with previous period`, change: comparison(current.demos_completed, previous.demos_completed), href: "/demo?demo_status=completed", tone: "emerald" },
      { icon: School, label: "Assigned schools", value: summary.active_client_schools || 0, detail: "Active client schools assigned to you", href: "/clients", tone: "blue" },
    ];
    const common = [
      { icon: Users, label: "New leads", value: current.new_leads || 0, detail: `${periodLabel(range)} · compared with last period`, change: comparison(current.new_leads, previous.new_leads), href: `/leads?approval=approved&created_from=${encodeURIComponent(periodFrom)}&created_to=${encodeURIComponent(periodTo)}`, tone: "blue" },
      { icon: Activity, label: "Active pipeline", value: summary.active_pipeline || 0, detail: "Open schools in your pipeline", href: "/leads", tone: "violet" },
      { icon: GraduationCap, label: "Enrolled schools", value: current.enrolled_schools || 0, detail: `Schools enrolled ${periodLabel(range).toLowerCase()}`, change: comparison(current.enrolled_schools, previous.enrolled_schools), href: `/clients?enrolled_from=${summary.period?.from || ""}&enrolled_to=${summary.period?.to || ""}`, tone: "emerald" },
      { icon: TrendingUpIcon, label: "Lead conversion", value: `${current.conversion_rate || 0}%`, detail: "Leads added in this period that have enrolled so far", change: Number(current.conversion_rate || 0) === Number(previous.conversion_rate || 0) ? { text: "No change", positive: null } : { text: `${(Number(current.conversion_rate || 0) - Number(previous.conversion_rate || 0) > 0 ? "+" : "")}${(Number(current.conversion_rate || 0) - Number(previous.conversion_rate || 0)).toFixed(1)} points vs previous period`, positive: Number(current.conversion_rate || 0) > Number(previous.conversion_rate || 0) }, href: `/clients?converted_from=${summary.period?.from || ""}&converted_to=${summary.period?.to || ""}`, tone: "teal" },
      { icon: CalendarDays, label: "Demos scheduled in period", value: current.demos_scheduled || 0, detail: `${periodLabel(range)} · ${current.demos_completed || 0} completed`, change: comparison(current.demos_scheduled, previous.demos_scheduled), href: `/demo?demo_status=active&from=${encodeURIComponent(periodFrom)}&to=${encodeURIComponent(periodTo)}`, tone: "violet" },
      { icon: Handshake, label: "Renewals due in 60 days", value: renewals.schools_60d || 0, detail: `${renewals.contracts_60d || 0} contracts · ${renewals.mous_60d || 0} MOUs`, href: "/clients?renewals=60", tone: "amber" },
    ];
    if (!isAdmin) common.splice(1, 0, {
      icon: ClipboardCheck,
      label: "Pending Approval Leads",
      value: summary.pending_approval_leads || 0,
      detail: "Leads awaiting admin review",
      href: "/leads?approval=pending",
      tone: "amber",
      attention: !!summary.pending_approval_leads,
    });
    if (isAdmin || isB2B) common.push({
      icon: Handshake,
      label: "Agreed contract value",
      value: formatNpr(current.agreed_contract_value),
      detail: "Signed during this period · payments are tracked separately",
      change: comparison(current.agreed_contract_value, previous.agreed_contract_value),
      href: "/clients",
      tone: "teal",
    });
    return common;
  }, [summary, data, isAcademic, isAdmin, isB2B, range, current, previous, renewals, periodFrom, periodTo]);

  const stageData = summary.funnel || [];
  const pipelineChartConfig = {
    count: { label: "Schools", color: "var(--primary-base)" },
  };
  const transitionMap = useMemo(() => {
    const map = new Map();
    (summary.stage_transitions || []).forEach((transition) => map.set(`${transition.from}→${transition.to}`, transition.count));
    return map;
  }, [summary.stage_transitions]);
  if (loading) return <PageLoadingState />;

  if (error && !data) return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><AlertTriangle className="h-6 w-6" /></span>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">We couldn’t load your dashboard</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
        <button onClick={() => loadDashboard()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"><RefreshCw className="h-4 w-4" />Try again</button>
      </div>
    </div>
  );

  return (
    <main className="min-h-full bg-canvas">
      <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header
          className="relative isolate overflow-hidden rounded-[24px] bg-primary-dark px-5 py-6 text-white shadow-[0_16px_45px_rgba(20,43,89,0.17)] sm:px-8 sm:py-7"
          style={{ background: "radial-gradient(ellipse at 14% 0%, rgba(var(--primary-rgb), 0.48), transparent 43%), radial-gradient(ellipse at 86% 18%, rgba(var(--accent-rgb), 0.2), transparent 30%), linear-gradient(115deg, var(--primary-dark) 0%, var(--primary-base) 56%, var(--primary-hover) 100%)" }}
        >
          <div className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-sky-300/10 blur-[70px]" />
          <svg aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-[150%] w-[62%] text-white/20" viewBox="0 0 640 360" fill="none" preserveAspectRatio="xMidYMid slice">
            <path d="M168 376C215 297 263 246 304 170 352 82 435 39 671 65" stroke="currentColor" />
            <path d="M201 383C247 309 292 262 333 185 381 98 465 55 689 80" stroke="currentColor" />
            <path d="M236 391C280 321 322 278 363 201 411 113 494 71 706 96" stroke="currentColor" />
            <path d="M277 400C316 335 354 294 393 217 442 130 521 88 724 112" stroke="currentColor" />
            <path d="M318 409C352 350 388 311 425 233 472 148 547 104 741 128" stroke="currentColor" />
            <path d="M407-19C439 42 482 86 538 112 581 132 622 138 665 138" stroke="var(--accent-base)" strokeOpacity=".8" />
            <circle cx="538" cy="112" r="3" fill="var(--accent-light)" />
            <circle cx="363" cy="201" r="2" fill="white" fillOpacity=".8" />
          </svg>
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl">Good to see you, {firstName}.</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/80">Here’s a quick look at what’s happening across your team.</p>
              {isAdmin && <div className="mt-4 flex flex-wrap gap-2" aria-label="Action counts">
                <Link to="/leads?followup=overdue" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20"><AlertTriangle className="h-3.5 w-3.5 text-rose-200" />{summary.overdue_followups || 0} overdue follow-ups</Link>
                <Link to="/demo?demo_status=active&upcoming=true" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20"><CalendarDays className="h-3.5 w-3.5 text-teal-200" />{summary.upcoming_demos || 0} future demos</Link>
                <Link to="/approvals" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20"><ClipboardCheck className="h-3.5 w-3.5 text-amber-200" />{data.pending_approvals || 0} approvals</Link>
                <Link to="/demo?feedback=pending" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20"><FileCheck2 className="h-3.5 w-3.5 text-orange-200" />{summary.feedback_needed || 0} feedback items</Link>
              </div>}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="relative">
                <span className="sr-only">Dashboard reporting period</span>
                <select value={range} onChange={(event) => setRange(event.target.value)} className="h-10 appearance-none rounded-xl border border-white/15 bg-white/[0.09] py-2 pl-3.5 pr-9 text-xs font-semibold text-white outline-none transition hover:bg-white/[0.14] focus:ring-2 focus:ring-white/30">
                  <option value="this_month" className="text-slate-900">This month</option>
                  <option value="last_30" className="text-slate-900">Last 30 days</option>
                  <option value="last_90" className="text-slate-900">Last 90 days</option>
                  <option value="year_to_date" className="text-slate-900">Year to date</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-100" />
              </label>
              <button aria-label="Refresh dashboard" onClick={() => loadDashboard(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/[0.09] text-white transition hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <span className="w-full text-xs text-blue-100/60 sm:w-auto sm:text-right">
                {formatDate(summary.period?.from)} – {formatDate(summary.period?.to)}
                <span className="mt-1 block text-blue-100/75" aria-live="polite">
                  {lastUpdatedAt
                    ? `Refreshes automatically · Last updated ${new Date(lastUpdatedAt).toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit" })}`
                    : "Refreshes automatically every 30 seconds"}
                </span>
              </span>
            </div>
          </div>
        </header>

        {error && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">We couldn’t refresh everything, so you’re seeing the latest data we have.</div>}

        <section aria-label="Dashboard key performance indicators" className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${isAcademic ? "2xl:grid-cols-4" : "2xl:grid-cols-4"}`}>
          {cards.map((card) => <StatCard key={card.label} {...card} />)}
        </section>

        <div className="grid gap-5">
          <div className={`grid gap-4 ${isAcademic ? "" : "xl:grid-cols-2"}`}>
            {!isAcademic && <FollowupQueue groups={[
              { key: "overdue", title: "Overdue", tasks: overdueFollowups, icon: AlertTriangle, tone: "rose", emptyMessage: "No overdue follow-ups." },
              { key: "today", title: "Today", tasks: todayFollowups, icon: Clock3, tone: "blue", emptyMessage: "No follow-ups due today." },
              { key: "upcoming", title: "Upcoming", tasks: upcomingDashboardFollowups, icon: CalendarDays, tone: "teal", emptyMessage: "No future follow-ups are scheduled." },
            ]} />}
            <Surface className="flex min-h-[260px] flex-col" title="Demo schedule" description="Overdue, today and future scheduled demos in date order." action={<Link to="/demo" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">View all demos <ArrowRight className="h-3.5 w-3.5" /></Link>}>
                <div className="max-h-[360px] flex-1 divide-y divide-slate-100 overflow-y-auto px-5 py-1">
                  {dashboardDemos.length ? dashboardDemos.map((demo) => <Link key={demo.id} to={`/demo?search=${encodeURIComponent(demo.school_name || "")}`} className="flex items-center gap-3 py-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${demo.dashboardBucket === "Overdue" ? "bg-rose-50 text-rose-700" : demo.dashboardBucket === "Today" ? "bg-blue-50 text-primary" : "bg-teal-50 text-teal-700"}`}><CalendarClock className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700">{demo.school_name || "Demo"}</span><span className="mt-1 block text-xs text-slate-400">{demo.system_id} · {demo.program || "Demo session"} · {formatDate(demo.demo_at, { dateStyle: "medium", timeStyle: "short" })}</span>{demo.assigned_teacher && <span className="mt-1 block truncate text-xs text-slate-500">Instructor: {demo.assigned_teacher}</span>}</span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${demo.dashboardBucket === "Overdue" ? "bg-rose-50 text-rose-700" : demo.dashboardBucket === "Today" ? "bg-blue-50 text-blue-700" : "bg-teal-50 text-teal-700"}`}>{demo.dashboardBucket}</span>
                  </Link>) : <p className="py-8 text-center text-xs text-slate-400">No scheduled demos.</p>}
                </div>
              </Surface>
          </div>
        </div>

        {!isAcademic && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)]">
            <Surface title="Lead pipeline" description="See how many schools are at each stage, how long they’ve been there and where they’re moving next." action={<span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary">{summary.active_pipeline || 0} active</span>}>
              <div className="p-5 sm:p-6">
                {stageData.length ? <>
                  <ChartContainer config={pipelineChartConfig} className="h-[260px]" aria-label="Active leads by pipeline stage">
                    <BarChart data={stageData} layout="vertical" margin={{ top: 4, right: 28, left: 4, bottom: 4 }} barCategoryGap={10} accessibilityLayer>
                      <defs>
                        <linearGradient id="pipelineBar" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="var(--color-count)" />
                          <stop offset="100%" stopColor="var(--primary-hover)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 4" horizontal={false} />
                      <XAxis type="number" domain={[0, (max) => Math.max(1, Math.ceil(max * 1.18))]} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                      <YAxis type="category" dataKey="stage" width={112} axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11, fontWeight: 500 }} />
                      <ChartTooltip cursor={{ fill: "var(--canvas)" }} content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="url(#pipelineBar)" radius={[0, 6, 6, 0]} maxBarSize={19}>
                        <LabelList dataKey="count" position="right" fill="var(--text-secondary)" fontSize={10} fontWeight={600} />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-2 border-t border-slate-100 pt-3">
                    <div className="mb-2 grid grid-cols-[minmax(0,1fr)_72px] gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid-cols-[minmax(90px,1fr)_95px_145px] sm:gap-3">
                      <span>Stage</span><span className="text-right">Avg. time</span><span className="hidden text-right sm:block">Next stage movement</span>
                    </div>
                    {stageData.map((stage) => {
                      const outgoing = (summary.stage_transitions || []).filter((item) => item.from === stage.stage).reduce((sum, item) => sum + item.count, 0);
                      const nextStage = PIPELINE_STAGES[PIPELINE_STAGES.indexOf(stage.stage) + 1];
                      const nextCount = nextStage ? transitionMap.get(`${stage.stage}→${nextStage}`) || 0 : 0;
                      const moveShare = outgoing ? Math.round((nextCount / outgoing) * 100) : 0;
                      return <div key={stage.stage} className="grid grid-cols-[minmax(0,1fr)_72px] gap-x-2 gap-y-1 rounded-lg px-2 py-2 text-xs hover:bg-slate-50 sm:grid-cols-[minmax(90px,1fr)_95px_145px] sm:gap-3">
                        <span className="truncate font-medium text-slate-700">{stage.stage}<span className="ml-1.5 text-xs font-normal text-slate-400">{stage.count}</span></span>
                        <span className="text-right tabular-nums text-slate-500">{stage.avg_wait_days} days</span>
                        <span className="col-span-2 text-left tabular-nums text-xs text-slate-600 sm:col-span-1 sm:text-right">{stage.waiting_30d ? <span className="mr-1 font-semibold text-amber-700">{stage.waiting_30d} waiting 30d+ ·</span> : null}{nextStage ? <>{nextCount} to {nextStage} <span className="text-slate-400">· {moveShare}% of moves</span></> : <span className="text-slate-400">{outgoing} total stage moves</span>}</span>
                      </div>;
                    })}
                  </div>
                </> : <div className="grid min-h-[280px] place-items-center text-center text-sm text-slate-400">There are no active leads right now.</div>}
                <p className="mt-3 text-xs leading-4 text-slate-400">We count time from the last stage change. If a lead hasn’t changed stages, we count from when it was created. Movement totals come from recorded history.</p>
              </div>
            </Surface>

            <Surface title="School and contract health" description="Active schools and upcoming contract and MOU renewals.">
                <div className="grid grid-cols-2 gap-3 p-5 pb-4">
                <div className="rounded-xl bg-emerald-50/80 p-3.5"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Active schools</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{summary.active_client_schools || 0}</p><p className="mt-1 text-xs text-emerald-700/75">of {summary.total_client_schools || 0} client schools</p></div>
                <div className="rounded-xl bg-amber-50/80 p-3.5"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Due in 30 days</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{renewals.schools_30d || 0}</p><p className="mt-1 text-xs text-amber-700/75">unique schools to renew</p></div>
              </div>
              <div className="border-t border-slate-100 px-5 py-3.5">
                <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-slate-700">Renewals in the next 60 days</p><Link to="/clients?renewals=60" className="text-xs font-semibold text-primary hover:underline">All clients</Link></div>
                {(() => {
                  const rows = [...(data.renewals || []).map((row) => ({ ...row, kind: "Contract" })), ...(data.mou_renewals || []).map((row) => ({ ...row, kind: "MOU" }))].sort((a, b) => (a.days_left ?? 999) - (b.days_left ?? 999)).slice(0, 5);
                  return rows.length ? <div className="divide-y divide-slate-100">{rows.map((row) => <Link key={`${row.kind}-${row.id || row.contract}`} to={`/clients?search=${encodeURIComponent(row.school || "")}`} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-0 hover:text-primary">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${row.days_left <= 30 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}><Handshake className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700">{row.school}</span><span className="mt-0.5 block text-xs text-slate-400">{row.system_id} · {row.kind} ends {formatDate(row.end_date)}</span></span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${row.days_left <= 30 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{row.days_left}d</span>
                  </Link>)}</div> : <p className="py-5 text-center text-xs text-slate-400">No contracts or MOUs are due to end in the next 60 days.</p>;
                })()}
              </div>
            </Surface>
          </div>
        )}

        {isAdmin && (
          <Surface title="Team workload" description="See each team member’s open follow-ups and active leads." action={<Link to="/leads" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">View lead pipeline <ArrowRight className="h-3.5 w-3.5" /></Link>}>
            <div className="p-5 sm:p-6">
              {(summary.team_workload || []).length ? <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                {(summary.team_workload || []).slice(0, 8).map((member) => {
                  const max = Math.max(...summary.team_workload.map((row) => row.open_tasks), 1);
                  return <div key={member.owner_id} className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-semibold uppercase text-primary">{member.owner?.slice(0, 2) || "—"}</span><span className="truncate text-xs font-semibold text-slate-700">{member.owner}</span></div><span className="shrink-0 text-xs text-slate-400">{member.active_leads} leads · {member.open_tasks} tasks</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, member.open_tasks / max * 100)}%` }} /></div>
                    {member.overdue > 0 && <p className="mt-1.5 text-xs font-medium text-rose-600">{member.overdue} overdue follow-up{member.overdue === 1 ? "" : "s"}</p>}
                  </div>;
                })}
              </div> : <p className="py-6 text-center text-xs text-slate-400">There are no follow-ups assigned to the team right now.</p>}
            </div>
          </Surface>
        )}
        {isAcademic && (
            <Surface title="Feedback queue" description="Past sessions waiting for your feedback." action={<Link to="/demo?feedback=pending" className="text-xs font-semibold text-primary">View feedback</Link>}>
              <div className="divide-y divide-slate-100 px-5 py-1">
                {(data.feedback_queue || []).length ? data.feedback_queue.slice(0, 6).map((demo) => <Link key={demo.id} to={`/demo?feedback=pending&search=${encodeURIComponent(demo.school_name || "")}`} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700"><FileCheck2 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700">{demo.school_name}</span><span className="mt-1 block text-xs text-slate-400">{demo.system_id} · {demo.program || "Demo session"}</span>{demo.assigned_teacher && <span className="mt-1 block truncate text-xs text-slate-500">Instructor: {demo.assigned_teacher}</span>}</span><span className="shrink-0 text-right text-xs font-medium text-slate-500">{formatDate(demo.demo_at, { dateStyle: "medium", timeStyle: "short" })}</span>
                </Link>) : <p className="py-8 text-center text-xs text-slate-400">No feedback is waiting for you right now.</p>}
              </div>
            </Surface>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-xs text-slate-400">
          <span>Metrics reflect your role and the reporting period you selected.</span>
          <span>Contract values show signed agreements. Payments are tracked separately.</span>
        </footer>
      </div>
    </main>
  );
};

const TrendingUpIcon = Activity;

export default Dashboard;
