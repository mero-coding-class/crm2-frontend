// C:/Users/aryal/Desktop/EDU_CRM/client/src/pages/Dashboard.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "../components/common/Loader";
import DelayedLoader from "../components/common/DelayedLoader";

import StatCard from "../components/dashboard/StatCard";
import LatestLeadsTable from "../components/dashboard/LatestLeadsTable";
import TopCoursesTable from "../components/dashboard/TopCoursesTable";

import { leadService } from "../services/api";
import { BASE_URL } from "../config";

// Recharts
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

// Icons
import {
  UsersIcon,
  AcademicCapIcon,
  PlusIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import LeadMap from "../components/dashboard/LeadMap";
import CallReminders from "../components/reminders/CallReminders";

const ChartContainer = ({ title, description, children }) => (
  <div className="bg-white rounded-[12px] border border-slate-200 p-5 flex flex-col h-full hover:border-slate-300 transition-colors">
    <div className="mb-3">
      <h3 className="text-[14px] font-[600] text-slate-900 leading-[20px] tracking-[-0.005em]">{title}</h3>
      {description && <p className="text-[12px] text-slate-400 mt-0.5">{description}</p>}
    </div>
    <div className="flex-grow min-h-[250px]">{children}</div>
  </div>
);

const Dashboard = () => {
  const { authToken, user } = useAuth();
  // Determine role (prefer auth context; fallback to localStorage)
  const userRole = (
    user?.role ||
    localStorage.getItem("role") ||
    ""
  ).toLowerCase();
  const isAdminLike = [
    "admin",
    "superadmin",
    "super admin",
    "super-admin",
  ].includes(userRole);
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coursesMap, setCoursesMap] = useState({});
  const [enrollmentsTopCourses, setEnrollmentsTopCourses] = useState([]);
  const [enrollmentsTrendData, setEnrollmentsTrendData] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [trashedLeads, setTrashedLeads] = useState([]);
  const [enrollmentsCount, setEnrollmentsCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);

  // Helper to fetch ALL pages for a paginated endpoint that returns either
  // an array or an object with `results` & optional `next` (Django DRF style).
  const fetchAllPaginated = useCallback(
    async (baseUrl) => {
      let url = baseUrl;
      const out = [];
      const headers = { "Content-Type": "application/json" };
      if (authToken) headers.Authorization = `Token ${authToken}`;
      const seenUrls = new Set();
      while (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        try {
          const res = await fetch(url, {
            headers,
            credentials: authToken ? "include" : "same-origin",
          });
          if (!res.ok) break;
          const json = await res.json().catch(() => null);
          if (!json) break;
          if (Array.isArray(json)) {
            out.push(...json);
            break; // no pagination metadata
          }
          if (Array.isArray(json.results)) out.push(...json.results);
          else if (Array.isArray(json.data)) out.push(...json.data);
          else if (Array.isArray(json.items)) out.push(...json.items);
          else if (Array.isArray(json.leads)) out.push(...json.leads);
          else if (Array.isArray(json.enrollments))
            out.push(...json.enrollments);
          // Follow typical DRF 'next' link if present
          if (json.next) url = json.next;
          else break;
        } catch (e) {
          console.warn("Pagination fetch failed for", url, e);
          break;
        }
      }
      return out;
    },
    [authToken]
  );

  // Pie segment colors - using cohesive brand identity palette
  const PIE_COLORS = [
    "#294998", // Mero Royal Navy Blue
    "#E8A026", // Mero Golden Amber
    "#10B981", // Emerald
    "#3B82F6", // Blue
    "#0EA5E9", // Sky
    "#F97316", // Orange
    "#8B5CF6", // Violet
    "#14B8A6", // Teal
  ];

  // Load real leads from backend
  useEffect(() => {
    const fetchLeadsData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!authToken) throw new Error("Not authenticated.");
        // Fetch all pages for each source so monthly chart & totals are accurate
        const [leadsAll, enrollmentsAll, trashAll] = await Promise.all([
          fetchAllPaginated(`${BASE_URL}/leads/`),
          fetchAllPaginated(`${BASE_URL}/enrollments/`),
          fetchAllPaginated(`${BASE_URL}/trash/`),
        ]);
        setAllLeads(leadsAll);
        setEnrollments(enrollmentsAll);
        setTrashedLeads(trashAll);
        setEnrollmentsCount(enrollmentsAll.length);
        setTrashCount(trashAll.length);
      } catch (err) {
        setError(err.message || "Failed to fetch leads");
      } finally {
        setLoading(false);
      }
    };
    if (authToken) fetchLeadsData();
  }, [authToken, fetchAllPaginated]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const headers = {
          "Content-Type": "application/json",
        };
        let usingAuth = false;
        if (authToken) {
          headers.Authorization = `Token ${authToken}`;
          usingAuth = true;
        }

        // Attempt to fetch courses with or without Authorization depending on availability
        const res = await fetch(`${BASE_URL}/courses/`, {
          method: "GET",
          headers,
          // only include credentials when auth token present to avoid CORS surprises
          credentials: authToken ? "include" : "same-origin",
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch courses: ${res.status}`);
        }

        const data = await res.json();
        // build a lookup map by common id keys and by name fallback (prefer course_name)
        const map = {};
        if (Array.isArray(data)) {
          data.forEach((c) => {
            const id = c.id ?? c.pk ?? c._id ?? c.course_id ?? null;
            const name = c.course_name || c.name || c.title || c.course || "";
            if (id != null) map[String(id)] = name;
            if (name) map[String(name).toLowerCase()] = name;
          });
        }
        setCoursesMap(map);

        // Also try to fetch enrollments to build fallback top-courses if needed
        try {
          const enrRes = await fetch(`${BASE_URL}/enrollments/`, {
            method: "GET",
            headers,
            credentials: authToken ? "include" : "same-origin",
          });
          if (enrRes.ok) {
            let enrData = await enrRes.json();
            // normalize common envelope shapes: {results: [...]}, {data: [...]}
            if (!Array.isArray(enrData)) {
              if (Array.isArray(enrData.results)) enrData = enrData.results;
              else if (Array.isArray(enrData.data)) enrData = enrData.data;
            }
            // keep the raw enrollments for dashboard aggregates (enrolled students, revenue)
            setEnrollments(Array.isArray(enrData) ? enrData : []);
            const map2 = new Map();
            if (Array.isArray(enrData)) {
              enrData.forEach((e) => {
                const cname =
                  e.course_name ||
                  e.course?.course_name ||
                  e.course ||
                  "Unknown";
                const rev = Number(e.value) || 0;
                const prev = map2.get(cname) || {
                  enrollments: 0,
                  revenue: 0,
                };
                map2.set(cname, {
                  enrollments: prev.enrollments + 1,
                  revenue: prev.revenue + rev,
                });
              });
            }
            const fallback = Array.from(map2.entries())
              .map(([name, data]) => ({
                name,
                enrollments: data.enrollments,
                revenue: `Rs ${data.revenue.toLocaleString()}`,
              }))
              .sort((a, b) => b.enrollments - a.enrollments)
              .slice(0, 7);
            setEnrollmentsTopCourses(fallback);

            // Build enrollment trends fallback (monthly counts) from enrollment records
            try {
              const trendMap = new Map();
              const parseDate = (d) => {
                if (!d) return null;
                const dt = new Date(d);
                return isNaN(dt.getTime()) ? null : dt;
              };
              enrData.forEach((e) => {
                const d =
                  e.add_date ||
                  e.addDate ||
                  e.created_at ||
                  e.created_on ||
                  e.createdAt ||
                  e.createdOn ||
                  null;
                const dt = parseDate(d);
                if (!dt) return;
                const key = `${dt.getFullYear()}-${String(
                  dt.getMonth() + 1
                ).padStart(2, "0")}`;
                trendMap.set(key, (trendMap.get(key) || 0) + 1);
              });
              const trendArr = Array.from(trendMap.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([monthYear, cnt]) => ({
                  month: monthYear.substring(5),
                  students: cnt,
                }));
              setEnrollmentsTrendData(trendArr);
            } catch (err) {
              console.warn(
                "Failed to build enrollment trends from enrollments:",
                err
              );
            }
          }
        } catch (err) {
          console.warn(
            "Failed to fetch enrollments for fallback top courses:",
            err
          );
        }
      } catch (err) {
        // non-fatal for dashboard; log for debugging
        console.warn("Failed to fetch courses for dashboard:", err);
      }
    };
    fetchCourses();
  }, [authToken]);

  // Helper: parse date safely
  const toDate = (d) => {
    if (!d && d !== 0) return null;
    // If already a Date
    if (d instanceof Date) return d;

    const s = String(d).trim();

    // Legacy backend format: 'YYYY|DD|MM' -> convert to YYYY-MM-DD
    if (s.includes("|")) {
      const parts = s.split("|");
      if (parts.length === 3) {
        const [yyyy, dd, mm] = parts;
        const norm = `${yyyy}-${String(mm).padStart(2, "0")}-${String(
          dd
        ).padStart(2, "0")}`;
        const parsed = new Date(norm);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
    }

    // Numeric timestamp in seconds or ms
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      // guess: if seconds (10 digits), multiply by 1000
      const parsed = new Date(s.length === 10 ? n * 1000 : n);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Fallback: try ISO / browser parsing
    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Helper: resolve possible add/created date fields from lead objects
  const getLeadAddDate = (lead) => {
    return (
      lead.addDate ||
      lead.add_date ||
      lead.created_at ||
      lead.created_on ||
      lead.createdAt ||
      lead.createdOn ||
      lead.added_on ||
      lead.addedAt ||
      null
    );
  };

  // Helper: resolve next call date from various possible fields
  const getNextCallDate = (lead) => {
    return (
      lead.nextCall ||
      lead.next_call ||
      lead.next_call_date ||
      lead.nextCallAt ||
      null
    );
  };

  // Helper: format to YYYY-MM-DD using toDate()
  const toYMD = (d) => {
    const dt = toDate(d);
    if (!dt) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Build all dashboard aggregates from real leads + enrollments
  const dashboardData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const totalLeads =
      (allLeads ? allLeads.length : 0) +
      (enrollments ? enrollments.length : 0) +
      (trashedLeads ? trashedLeads.length : 0);

    // Define "enrolled" as status === Converted
    // Prefer authoritative enrollments endpoint for enrolled students count
    const enrolledLeads = allLeads.filter(
      (l) => (l.status || "").toLowerCase() === "converted"
    );
    const totalEnrolledStudents =
      enrollments && enrollments.length > 0
        ? enrollments.length
        : enrolledLeads.length;

    // New leads in current month (by addDate)
    const newLeadsThisMonth = allLeads.filter((lead) => {
      const dt = toDate(getLeadAddDate(lead));
      return (
        dt && dt.getMonth() === currentMonth && dt.getFullYear() === currentYear
      );
    }).length;

    // Revenue this month — prefer to compute from enrollments (authoritative payments)
    let revenueThisMonth = 0;
    if (enrollments && enrollments.length > 0) {
      enrollments.forEach((e) => {
        // parse a date to determine which month this enrollment/payment applies to
        const dateStr =
          e.starting_date ||
          e.start_date ||
          e.add_date ||
          e.addDate ||
          e.created_at ||
          e.createdOn ||
          e.createdAt ||
          null;
        const dt = toDate(dateStr);
        if (!dt) return;
        if (dt.getMonth() !== currentMonth || dt.getFullYear() !== currentYear)
          return;

        // Determine payment amount: prefer explicit total_payment, otherwise sum installments or fallback to value
        const totalPayment =
          Number(e.total_payment) ||
          (Number(e.first_installment) || 0) +
          (Number(e.second_installment) || 0) +
          (Number(e.third_installment) || 0) ||
          Number(e.value) ||
          0;
        revenueThisMonth += totalPayment;
      });
    } else {
      // fallback: use converted leads' value
      enrolledLeads.forEach((lead) => {
        const dt = toDate(getLeadAddDate(lead));
        const val = Number(lead.value) || 0;
        if (
          dt &&
          dt.getMonth() === currentMonth &&
          dt.getFullYear() === currentYear
        ) {
          revenueThisMonth += val;
        }
      });
    }

    // Upcoming calls/classes in next 7 days (by nextCall)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingClassesCalls = allLeads.filter((lead) => {
      const dt = toDate(getNextCallDate(lead));
      return dt && dt >= today && dt <= sevenDaysFromNow;
    }).length;

    // Chart: status distribution — include leads, enrollments (count as Converted), and trashed leads
    const statusCounts = new Map();
    const combined = [
      ...(Array.isArray(allLeads) ? allLeads : []),
      ...(Array.isArray(enrollments)
        ? enrollments.map((e) => ({ ...e, status: "Converted" }))
        : []),
      ...(Array.isArray(trashedLeads) ? trashedLeads : []),
    ];
    combined.forEach((lead) => {
      const s = lead.status || lead.state || "Unknown";
      statusCounts.set(s, (statusCounts.get(s) || 0) + 1);
    });
    const leadStatusDistribution = Array.from(statusCounts.entries()).map(
      ([name, value]) => ({ name, value })
    );

    // Chart: enrollment trends by month (for Converted)
    const enrollByMonth = new Map(); // key "YYYY-MM" -> count
    enrolledLeads.forEach((lead) => {
      const dt = toDate(getLeadAddDate(lead));
      if (!dt) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      enrollByMonth.set(key, (enrollByMonth.get(key) || 0) + 1);
    });
    let enrollmentTrends = Array.from(enrollByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthYear, students]) => ({
        month: monthYear.substring(5), // "MM"
        students,
      }));

    // If no converted leads are present to build trends, fall back to enrollment records
    if (
      (!enrollmentTrends || enrollmentTrends.length === 0) &&
      enrollmentsTrendData &&
      enrollmentsTrendData.length > 0
    ) {
      enrollmentTrends = enrollmentsTrendData;
    }

    // Chart: leads by source
    const bySource = new Map();
    allLeads.forEach((lead) => {
      const src = lead.source || "Unknown";
      bySource.set(src, (bySource.get(src) || 0) + 1);
    });
    const leadsBySource = Array.from(bySource.entries()).map(
      ([source, leads]) => ({
        source,
        leads,
      })
    );

    // Tables
    const resolveCourseName = (lead) => {
      // prefer explicit backend-provided course_name on the lead
      if (lead.course_name) return lead.course_name;

      // Try to find a matching enrollment (the enrollments endpoint often stores course_name)
      try {
        if (enrollments && enrollments.length) {
          const leadId = lead.id ?? lead._id ?? lead.pk ?? lead.lead ?? null;
          if (leadId != null) {
            const match = enrollments.find((e) => {
              // enrollment may store the lead as `lead` numeric id or nested object
              if (e.lead == null) return false;
              return (
                String(e.lead) === String(leadId) ||
                String(e.lead?.id) === String(leadId)
              );
            });
            if (match)
              return (
                match.course_name ||
                match.course?.course_name ||
                match.course ||
                ""
              );
          }
        }
      } catch (err) {
        // ignore and continue to other fallbacks
      }

      // lead.course may already be a name
      if (lead.course && typeof lead.course === "string") {
        const lc = lead.course.toLowerCase();
        return coursesMap[lead.course] || coursesMap[lc] || lead.course;
      }

      // lead.course may be an id
      if (
        lead.course != null &&
        (typeof lead.course === "number" || typeof lead.course === "string")
      ) {
        return coursesMap[String(lead.course)] || String(lead.course);
      }

      // nested object
      if (lead.course && typeof lead.course === "object") {
        return (
          lead.course.course_name ||
          lead.course.name ||
          coursesMap[String(lead.course.id)] ||
          ""
        );
      }
      return "";
    };

    const latestLeads = [...allLeads]
      .sort(
        (a, b) =>
          (toDate(getLeadAddDate(b))?.getTime() || 0) -
          (toDate(getLeadAddDate(a))?.getTime() || 0)
      )
      .slice(0, 10)
      .map((lead) => ({
        _id: lead._id,
        studentName: lead.studentName || lead.student_name || "",
        email: lead.email || lead.email_address || "",
        // Resolve course name using fetched courses when possible
        course:
          resolveCourseName(lead) || lead.course_name || lead.course || "",
        status: lead.status,
        registeredOn: getLeadAddDate(lead),
      }));

    const topCoursesMap = new Map(); // course -> { enrollments, revenue }
    enrolledLeads.forEach((lead) => {
      const courseName =
        resolveCourseName(lead) ||
        lead.course_name ||
        lead.course ||
        "Unknown Course";
      const prev = topCoursesMap.get(courseName) || {
        enrollments: 0,
        revenue: 0,
      };
      topCoursesMap.set(courseName, {
        enrollments: prev.enrollments + 1,
        revenue: prev.revenue + (Number(lead.value) || 0),
      });
    });
    const topCourses = Array.from(topCoursesMap.entries())
      .map(([name, data]) => ({
        name,
        enrollments: data.enrollments,
        revenue: `$${data.revenue.toLocaleString()}`,
      }))
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 7);

    // --- Monthly Distribution Calculation ---
    // Helper to get month string and full name
    const getMonth = (date) => {
      if (!date) return "Unknown";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "Unknown";
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      const monthShort = String(monthNum + 1).padStart(2, "0");
      const monthName = d.toLocaleString("default", { month: "long" });
      return {
        key: `${year}-${monthShort}`,
        label: `${monthName} ${year}`,
      };
    };

    // Use objects for month keys and labels
    const monthLabels = {};
    const leadsByMonth = {};
    const enrollmentsByMonth = {};
    const trashByMonth = {};
    allLeads.forEach((lead) => {
      const mObj = getMonth(getLeadAddDate(lead));
      if (!mObj || !mObj.key) return;
      leadsByMonth[mObj.key] = (leadsByMonth[mObj.key] || 0) + 1;
      monthLabels[mObj.key] = mObj.label;
    });
    enrollments.forEach((enr) => {
      // Prefer explicit add_date (user requested) then enrollment_date then created_at
      const mObj = getMonth(
        enr.add_date ||
        enr.enrollment_date ||
        enr.starting_date ||
        enr.created_at
      );
      if (!mObj || !mObj.key) return;
      enrollmentsByMonth[mObj.key] = (enrollmentsByMonth[mObj.key] || 0) + 1;
      monthLabels[mObj.key] = mObj.label;
    });
    trashedLeads.forEach((lead) => {
      const mObj = getMonth(getLeadAddDate(lead));
      if (!mObj || !mObj.key) return;
      trashByMonth[mObj.key] = (trashByMonth[mObj.key] || 0) + 1;
      monthLabels[mObj.key] = mObj.label;
    });

    const allMonths = Array.from(
      new Set([
        ...Object.keys(leadsByMonth),
        ...Object.keys(enrollmentsByMonth),
        ...Object.keys(trashByMonth),
      ])
    ).sort();

    const monthlyDistribution = allMonths.map((monthKey) => {
      const base = leadsByMonth[monthKey] || 0; // active/non-enrolled leads
      const enr = enrollmentsByMonth[monthKey] || 0; // enrolled (from enrollments endpoint)
      const tr = trashByMonth[monthKey] || 0; // trashed
      return {
        month: monthLabels[monthKey] || monthKey,
        totalLeads: base + enr + tr, // total combined (matches stat card logic)
        enrollments: enr,
        trash: tr,
      };
    });

    return {
      stats: {
        totalLeads,
        totalEnrolledStudents,
        newLeadsThisMonth,
        revenueThisMonth: `Rs ${revenueThisMonth.toLocaleString()}`,
        upcomingClassesCalls,
      },
      charts: {
        leadStatusDistribution,
        enrollmentTrends,
        leadsBySource,
        monthlyDistribution,
      },
      latestLeads,
      topCourses,
    };
  }, [allLeads, coursesMap, enrollments, enrollmentsTrendData, trashedLeads]);

  // Normalize leads for CallReminders and today's call stats reuse
  const remindersLeads = useMemo(
    () =>
      Array.isArray(allLeads)
        ? allLeads.map((l, i) => ({
          _id: l._id || l.id || `lead-${i}`,
          id: l.id,
          student_name: l.student_name || l.name || "",
          phone_number: l.phone_number || l.phone || "",
          whatsapp_number: l.whatsapp_number || l.whatsapp || "",
          course_name: l.course_name || l.course || "",
          next_call: l.next_call || l.nextCall || "",
          assigned_to_username: l.assigned_to_username || l.assigned_to || "",
          assigned_to: l.assigned_to || l.assigned_to_username || "",
          status: l.status || "",
          sub_status: l.sub_status || l.substatus || "",
        }))
        : [],
    [allLeads]
  );

  // Compute today's calls: pending/completed counts respecting user role and local storage statuses
  const todaysCalls = useMemo(() => {
    const today = toYMD(new Date());
    if (!today) return { pending: 0, completed: 0, total: 0 };

    const username = (user?.username || user?.name || "").toString();
    const norm = (v) =>
      (v == null ? "" : String(v)).trim().toLowerCase().replace(/\s+/g, " ");
    const usernameNorm = norm(username);
    const emailLocal = usernameNorm.includes("@")
      ? usernameNorm.split("@")[0]
      : usernameNorm;
    const userIdNorm = norm(user?.id);
    const nameNorm = norm(user?.name || user?.full_name);

    const visible = (remindersLeads || []).filter((l) => {
      const isToday = toYMD(l.next_call) === today;
      if (!isToday) return false;
      if (isAdminLike) return true;
      const a = norm(l.assigned_to);
      const u = norm(l.assigned_to_username);
      return (
        a === usernameNorm ||
        u === usernameNorm ||
        a === emailLocal ||
        u === emailLocal ||
        (!!userIdNorm && (a === userIdNorm || u === userIdNorm)) ||
        (!!nameNorm && (a === nameNorm || u === nameNorm))
      );
    });

    // Local completion status map
    let map = {};
    try {
      const raw = localStorage.getItem(`mcc:reminders:${username || "anon"}`);
      map = raw ? JSON.parse(raw) : {};
    } catch { }
    const dateMap = map[today] || {};

    let completed = 0;
    visible.forEach((l, i) => {
      const id = l._id || l.id || `lead-${i}`;
      if (dateMap[id] === "completed") completed += 1;
    });
    const total = visible.length;
    const pending = Math.max(total - completed, 0);
    return { pending, completed, total };
  }, [remindersLeads, user, isAdminLike]);

  if (loading)
    return <DelayedLoader message="Loading dashboard..." minMs={2000} />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-[16px] font-[600] text-slate-900 mb-1">Failed to load dashboard</h3>
          <p className="text-[13px] text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#294998] text-white text-[13px] font-[500] rounded-[8px] hover:bg-[#1E3776] transition-colors"
          >
            Reload Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] min-h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="text-[20px] font-[600] leading-[28px] tracking-[-0.015em] text-slate-900">Dashboard</h1>
        <p className="text-[13px] text-slate-500 leading-[18px] mt-0.5">Global Admission Intelligence — overview and metrics</p>
      </div>
      <div className="p-6">
        {/* Call reminders widget */}
        <div className="mb-6">
          <CallReminders
            leads={remindersLeads}
            currentUser={user || {}}
            isAdminLike={isAdminLike}
          />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Total Leads"
            value={dashboardData.stats.totalLeads}
            icon={UsersIcon}
            description="Overall count"
            colorClass="text-[#294998] bg-[#EDF2FC]"
          />
          <StatCard
            title="Clients"
            value={dashboardData.stats.totalEnrolledStudents}
            icon={AcademicCapIcon}
            description="Converted school clients"
            colorClass="text-emerald-600 bg-emerald-50"
          />
          <StatCard
            title="Trash Students"
            value={trashCount}
            icon={GlobeAltIcon}
            description="Leads in Trash"
            colorClass="text-rose-600 bg-rose-50"
          />
          {/* <StatCard
          title="New Leads This Month"
          value={dashboardData.stats.newLeadsThisMonth}
          icon={PlusIcon}
          description="Leads added in current month"
          colorClass="text-green-600 bg-green-100"
        /> */}
          {isAdminLike && (
            <StatCard
              title="Revenue This Month"
              value={dashboardData.stats.revenueThisMonth}
              icon={CurrencyDollarIcon}
              description="Converted lead value"
              colorClass="text-teal-600 bg-teal-50"
            />
          )}
          <StatCard
            title="Today's Calls"
            value={`${todaysCalls.pending} Pending`}
            icon={CalendarDaysIcon}
            description={`Completed ${todaysCalls.completed}`}
            colorClass="text-[#B8740C] bg-[#FEF7EB]"
          />
          {/* Upcoming Classes/Calls intentionally removed (replaced by Trash Students) */}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ChartContainer
            title="Lead Status Distribution"
            description="Current breakdown of leads by their status."
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData.charts.leadStatusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {dashboardData.charts.leadStatusDistribution.map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer
            title="Student Enrollment Trends"
            description='Monthly trend of "Converted" leads (by Add Date).'
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dashboardData.charts.enrollmentTrends}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="students"
                  stroke="#294998"
                  strokeWidth={2.5}
                  activeDot={{ r: 6, fill: "#294998", stroke: "#EDF2FC", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer
            title="Leads by Source"
            description="Distribution of leads across various marketing channels."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboardData.charts.leadsBySource}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="source"
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#294998" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Monthly totals grouped: total leads, enrollments, trash */}
        <div className="mb-8">
          <ChartContainer title="Monthly Leads Breakdown (Total / Enrollments / Trash)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dashboardData.charts.monthlyDistribution}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                barCategoryGap={30}
                barGap={0}
                stackOffset="none"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalLeads" fill="#294998" name="Total Leads" radius={[4, 4, 0, 0]} />
                <Bar dataKey="enrollments" fill="#10B981" name="Enrollments" radius={[4, 4, 0, 0]} />
                <Bar dataKey="trash" fill="#E8A026" name="Trash" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Latest Leads table below, full width */}
        <div className="mb-8">
          <LatestLeadsTable leads={dashboardData.latestLeads} />
        </div>

        {/* Map: show leads on map (defaults to Nepal/Kathmandu) */}
        <ChartContainer
          title="Geographical Lead Distribution"
          description="Visualizing where your leads are coming from. Search by city or country."
        >
          <LeadMap
            leads={dashboardData.latestLeads}
            defaultCountry="Nepal"
            defaultCity="Kathmandu"
          />
        </ChartContainer>
      </div>{/* end p-6 */}
    </div>
  );
};

export default Dashboard;
