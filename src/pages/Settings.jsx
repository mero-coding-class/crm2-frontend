import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { BASE_URL } from "../config";
import { courseService } from "../services/api";
import {
  Users,
  UserPlus,
  BookOpen,
  Package,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const INITIAL_PACKAGES = [
  {
    id: 1,
    name: "Standard Counseling Package",
    description: "Documentation review & course guidance",
    price: "$450",
    duration: "6 Months",
    status: "Active",
    features: "Documentation review & course guidance",
  },
  {
    id: 2,
    name: "Premium Admission + Visa Guidance",
    description: "Sop + 5 Univs + Visa Mock Interviews",
    price: "$1,200",
    duration: "1 Year",
    status: "Active",
    features: "Sop + 5 Univs + Visa Mock Interviews",
  },
];

const Settings = () => {
  const { user, authToken } = useAuth();
  const role = useMemo(
    () => (user?.role || localStorage.getItem("role") || "").toLowerCase(),
    [user]
  );
  const isAdminLike = ["admin", "superadmin"].includes(role);

  // Tab State: "users" (Users & Packages) | "courses" (Courses)
  const [tab, setTab] = useState("users");

  // Delete confirmation state
  const [deleteUserConfirmId, setDeleteUserConfirmId] = useState(null);
  const [deletePackageConfirmId, setDeletePackageConfirmId] = useState(null);
  const [deleteCourseConfirmId, setDeleteCourseConfirmId] = useState(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // --- Users State ---
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userForm, setUserForm] = useState({
    username: "",
    role: "sales_rep",
    password: "",
  });
  const [userLoading, setUserLoading] = useState(false);
  const [userMsg, setUserMsg] = useState({ type: "", text: "" });

  // User Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    username: "",
    role: "sales_rep",
    password: "",
  });
  const [editUserLoading, setEditUserLoading] = useState(false);

  // --- Packages State (Persistent in localStorage) ---
  const [packages, setPackages] = useState(() => {
    try {
      const saved = localStorage.getItem("crm_packages");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PACKAGES;
  });

  const [packageForm, setPackageForm] = useState({
    name: "",
    price: "",           // NPR by default (Module 6)
    validity: "6 Months",
    features: "",
    client_date: "",     // Module 6: new Client Date field
  });
  const [packageMsg, setPackageMsg] = useState({ type: "", text: "" });

  // Package Edit Modal State
  const [editingPackage, setEditingPackage] = useState(null);
  // Module 6: Status and Phase removed from package form
  const [editPackageForm, setEditPackageForm] = useState({
    name: "",
    price: "",
    duration: "6 Months",
    features: "",
    client_date: "",
  });

  useEffect(() => {
    try {
      localStorage.setItem("crm_packages", JSON.stringify(packages));
    } catch (e) {
      console.error(e);
    }
  }, [packages]);

  // --- Courses State ---
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [courseSubmitting, setCourseSubmitting] = useState(false);
  const [courseMsg, setCourseMsg] = useState({ type: "", text: "" });
  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseName, setEditCourseName] = useState("");

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${BASE_URL}/users/`, {
        headers: { Authorization: `Token ${authToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      let usersData = [];
      if (Array.isArray(data)) usersData = data;
      else if (data && Array.isArray(data.results)) usersData = data.results;
      else if (data && Array.isArray(data.users)) usersData = data.users;
      else if (data && Array.isArray(data.data)) usersData = data.data;
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      let data = await courseService.getCourses(authToken);
      if (data && !Array.isArray(data) && Array.isArray(data.results)) {
        data = data.results;
      }
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    if (isAdminLike && authToken) {
      fetchUsers();
      fetchCourses();
    }
  }, [isAdminLike, authToken]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserMsg({ type: "", text: "" });

    if (!userForm.username.trim() || !userForm.password) {
      setUserMsg({ type: "error", text: "Username and password are required." });
      return;
    }

    setUserLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userForm.username.trim(),
          role: userForm.role,
          password: userForm.password,
        }),
      });

      if (!res.ok) {
        let errText = "Failed to create user.";
        try {
          const d = await res.json();
          errText = d.error || d.detail || JSON.stringify(d);
        } catch {
          errText = await res.text();
        }
        throw new Error(errText);
      }

      setUserMsg({ type: "success", text: "User created successfully!" });
      setUserForm({ username: "", role: "sales_rep", password: "" });
      fetchUsers();
    } catch (err) {
      setUserMsg({ type: "error", text: err.message || "Failed to create user." });
    } finally {
      setUserLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    setDeleteProcessing(true);
    setDeleteError("");
    try {
      const res = await fetch(`${BASE_URL}/users/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${authToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete user.");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setDeleteError(err.message || "Could not delete user.");
    } finally {
      setDeleteProcessing(false);
      setDeleteUserConfirmId(null);
    }
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setEditUserForm({
      username: u.username || "",
      role: u.role || "sales_rep",
      password: "",
    });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserLoading(true);
    try {
      const payload = {
        username: editUserForm.username.trim(),
        role: editUserForm.role,
      };
      if (editUserForm.password && editUserForm.password.trim().length > 0) {
        payload.password = editUserForm.password;
      }

      const res = await fetch(`${BASE_URL}/users/${editingUser.id}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Token ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update user.");

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, username: payload.username, role: payload.role }
            : u
        )
      );
      setEditingUser(null);
    } catch (err) {
      alert(err.message || "Failed to save user.");
    } finally {
      setEditUserLoading(false);
    }
  };

  const handleAddPackage = (e) => {
    e.preventDefault();
    setPackageMsg({ type: "", text: "" });

    if (!packageForm.name.trim()) {
      setPackageMsg({ type: "error", text: "Package name is required." });
      return;
    }

    // Module 6: No status/phase — default currency is NPR
    const newPkg = {
      id: Date.now(),
      name: packageForm.name.trim(),
      description: packageForm.features.trim() || "Course & guidance support",
      price: packageForm.price.trim() || "NPR 0",  // Module 6: default NPR
      duration: packageForm.validity || "6 Months",
      client_date: packageForm.client_date || "",
      features: packageForm.features.trim(),
    };

    setPackages((prev) => [...prev, newPkg]);
    setPackageForm({
      name: "",
      price: "",
      validity: "6 Months",
      features: "",
      client_date: "",
    });
    setPackageMsg({ type: "success", text: "Package added successfully!" });
  };

  const handleDeletePackage = (id) => {
    setPackages((prev) => prev.filter((p) => p.id !== id));
    setDeletePackageConfirmId(null);
  };

  const handleOpenEditPackage = (pkg) => {
    setEditingPackage(pkg);
    // Module 6: Status and Phase removed
    setEditPackageForm({
      name: pkg.name || "",
      price: pkg.price || "",
      duration: pkg.duration || "6 Months",
      features: pkg.description || pkg.features || "",
      client_date: pkg.client_date || "",
    });
  };

  const handleSaveEditPackage = (e) => {
    e.preventDefault();
    if (!editingPackage) return;

    setPackages((prev) =>
      prev.map((p) =>
        p.id === editingPackage.id
          ? {
              ...p,
              name: editPackageForm.name.trim(),
              price: editPackageForm.price.trim(),
              duration: editPackageForm.duration,
              description: editPackageForm.features.trim(),
              client_date: editPackageForm.client_date || "",
              // Module 6: status and phase removed
            }
          : p
      )
    );
    setEditingPackage(null);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCourseMsg({ type: "", text: "" });
    if (!newCourseName.trim()) return;

    setCourseSubmitting(true);
    try {
      const res = await courseService.createCourse(newCourseName.trim(), authToken);
      setCourses((prev) => [...prev, res]);
      setNewCourseName("");
      setCourseMsg({ type: "success", text: "Course added successfully!" });
    } catch (err) {
      setCourseMsg({
        type: "error",
        text: err.message || "Failed to add course.",
      });
    } finally {
      setCourseSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    setDeleteProcessing(true);
    try {
      await courseService.deleteCourse(id, authToken);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setCourseMsg({ type: "success", text: "Course deleted." });
      setTimeout(() => setCourseMsg({ type: "", text: "" }), 3000);
    } catch (err) {
      setCourseMsg({ type: "error", text: "Failed to delete course: " + (err.message || "") });
    } finally {
      setDeleteProcessing(false);
      setDeleteCourseConfirmId(null);
    }
  };

  const handleOpenEditCourse = (course) => {
    setEditingCourse(course);
    setEditCourseName(course.course_name);
  };

  const handleSaveEditCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse || !editCourseName.trim()) return;
    try {
      const updated = await courseService.updateCourse(
        editingCourse.id,
        editCourseName.trim(),
        authToken
      );
      setCourses((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setEditingCourse(null);
    } catch (err) {
      alert("Failed to update course: " + err.message);
    }
  };

  if (!isAdminLike) {
    return (
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-[12px] shadow-sm border border-slate-200 my-8">
        <h1 className="text-[22px] font-[700] text-slate-900 tracking-[-0.015em] mb-2">Settings</h1>
        <p className="text-rose-600 font-[500] text-[13px]">
          Only Admins and Superadmins have permission to access Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-[Inter,system-ui,sans-serif] antialiased">
      {/* ─── Header: Identical to LeadsHeader ─── */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-[700] text-slate-900 tracking-[-0.015em]">
              Settings
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              Manage system users, counseling packages, and courses.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setTab("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-[500] transition-colors ${
                tab === "users"
                  ? "bg-[#294998] text-white shadow-sm"
                  : "bg-[#EEF2F6] hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Users className="w-4 h-4" />
              Users & Packages
            </button>
            <button
              onClick={() => setTab("courses")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-[500] transition-colors ${
                tab === "courses"
                  ? "bg-[#294998] text-white shadow-sm"
                  : "bg-[#EEF2F6] hover:bg-slate-200 text-slate-700"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Courses
            </button>
          </div>
        </div>
      </div>

      {/* ─── Content Area ─── */}
      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* ─── TAB: USERS & PACKAGES ─── */}
        {tab === "users" && (
          <div className="space-y-6">
            {/* Top Row: Create New User & All Users */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ─── Card 1: Create New User ─── */}
              <div className="lg:col-span-5 bg-white rounded-[12px] p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-[8px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-[700] text-slate-900 tracking-[-0.01em]">
                      Create New User
                    </h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Add staff and counselors
                    </p>
                  </div>
                </div>

                {userMsg.text && (
                  <div
                    className={`mb-4 p-3 rounded-[8px] text-[12px] font-[500] flex items-center gap-2 ${
                      userMsg.type === "error"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {userMsg.type === "error" ? (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                    {userMsg.text}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleCreateUser} autoComplete="off">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                        USERNAME <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={userForm.username}
                        onChange={(e) =>
                          setUserForm((prev) => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                        placeholder="Enter username"
                        className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                        ROLE <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={userForm.role}
                          onChange={(e) =>
                            setUserForm((prev) => ({
                              ...prev,
                              role: e.target.value,
                            }))
                          }
                          className="w-full h-10 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                        >
                          <option value="sales_rep">Sales Rep</option>
                          <option value="admin">Admin</option>
                          {role === "superadmin" && (
                            <option value="superadmin">Super Admin</option>
                          )}
                          <option value="counselor">Counselor</option>
                          <option value="academic_counsellor">Academic Counsellor</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                        PASSWORD <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={userLoading}
                    className="w-full mt-5 h-10 bg-[#294998] hover:bg-[#1E3776] text-white font-[500] rounded-[8px] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-[13px] disabled:opacity-50"
                  >
                    {userLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Create User
                  </button>
                </form>
              </div>

              {/* ─── Card 2: All Users ─── */}
              <div className="lg:col-span-7 bg-white rounded-[12px] p-6 border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-[8px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-[700] text-slate-900 tracking-[-0.01em]">
                        All Users
                      </h3>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        Active system accounts
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-[#EEF2F6] text-slate-600">
                    {users.length} {users.length === 1 ? "User" : "Users"}
                  </span>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto border-t border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap w-12">
                          ID
                        </th>
                        <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                          USERNAME
                        </th>
                        <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                          ROLE
                        </th>
                        <th className="px-4 h-9 text-right text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap pr-4">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {loadingUsers ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-8 text-center text-[13px] text-slate-400 whitespace-nowrap"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-[#294998]" />
                              Loading users...
                            </div>
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-8 text-center text-[13px] text-slate-400 whitespace-nowrap"
                          >
                            No active users found.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => {
                          const initial = (u.username || "U")[0].toUpperCase();
                          return (
                            <tr
                              key={u.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="px-4 py-3 text-[13px] text-slate-500 font-[500] whitespace-nowrap">
                                {u.id}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-[#EDF2FC] text-[#294998] font-[600] flex items-center justify-center text-[12px] shrink-0">
                                    {initial}
                                  </div>
                                  <span className="text-[13px] font-[600] text-slate-900">
                                    {u.username}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-[#EEF2F6] text-slate-700">
                                  {u.role || "sales_rep"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right pr-4 whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1 text-slate-400 hover:text-[#294998] transition-colors"
                                    title="Edit user"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteUserConfirmId(u.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                    title="Delete user"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ─── Bottom Row: Manage Packages ─── */}
            <div className="bg-white rounded-[12px] p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-[700] text-slate-900 tracking-[-0.01em]">
                      Manage Packages
                    </h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Configure pricing tiers, services, and student subscription packages
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-[#EEF2F6] text-slate-600">
                  {packages.length} Active Packages
                </span>
              </div>

              {packageMsg.text && (
                <div
                  className={`mb-4 p-3 rounded-[8px] text-[12px] font-[500] flex items-center gap-2 ${
                    packageMsg.type === "error"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {packageMsg.type === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  {packageMsg.text}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAddPackage} className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  {/* PACKAGE NAME */}
                  <div className="md:col-span-4">
                    <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                      PACKAGE NAME <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={packageForm.name}
                      onChange={(e) =>
                        setPackageForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g. Premium Admission + Visa Guidance"
                      className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    />
                  </div>

                  {/* Module 6: PRICE — default NPR currency */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                      PRICE (NPR) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-[600] text-slate-500 pointer-events-none">NPR</span>
                      <input
                        type="text"
                        value={packageForm.price}
                        onChange={(e) =>
                          setPackageForm((prev) => ({
                            ...prev,
                            price: e.target.value,
                          }))
                        }
                        placeholder="e.g. 45,000"
                        className="w-full h-10 pl-12 pr-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* VALIDITY */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                      VALIDITY
                    </label>
                    <div className="relative">
                      <select
                        value={packageForm.validity}
                        onChange={(e) =>
                          setPackageForm((prev) => ({
                            ...prev,
                            validity: e.target.value,
                          }))
                        }
                        className="w-full h-10 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                      >
                        <option value="1 Month">1 Month</option>
                        <option value="3 Months">3 Months</option>
                        <option value="6 Months">6 Months</option>
                        <option value="1 Year">1 Year</option>
                        <option value="Lifetime">Lifetime</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Module 6: CLIENT DATE */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                      CLIENT DATE
                    </label>
                    <input
                      type="date"
                      value={packageForm.client_date}
                      onChange={(e) =>
                        setPackageForm((prev) => ({
                          ...prev,
                          client_date: e.target.value,
                        }))
                      }
                      className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all text-slate-800"
                    />
                  </div>

                  {/* FEATURES / SCOPE */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                      FEATURES / SCOPE
                    </label>
                    <input
                      type="text"
                      value={packageForm.features}
                      onChange={(e) =>
                        setPackageForm((prev) => ({
                          ...prev,
                          features: e.target.value,
                        }))
                      }
                      placeholder="e.g. Documentation review & guidance"
                      className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    />
                  </div>

                  {/* BUTTON */}
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full h-10 bg-[#294998] hover:bg-[#1E3776] text-white font-[500] rounded-[8px] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-[13px] whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> Add Package
                    </button>
                  </div>
                </div>
              </form>

              {/* Packages Table */}
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    {/* Module 6: STATUS column removed */}
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap w-12">
                        ID
                      </th>
                      <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                        PACKAGE NAME
                      </th>
                      <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                        PRICE (NPR)
                      </th>
                      <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                        DURATION
                      </th>
                      <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                        CLIENT DATE
                      </th>
                      <th className="px-4 h-9 text-right text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap pr-4">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {packages.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-[13px] text-slate-400 whitespace-nowrap"
                        >
                          No packages configured yet.
                        </td>
                      </tr>
                    ) : (
                      packages.map((pkg, idx) => (
                        <tr
                          key={pkg.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 text-[13px] text-slate-500 font-[500] whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-[6px] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="text-[13px] font-[600] text-slate-900 block whitespace-nowrap">
                                  {pkg.name}
                                </span>
                                {pkg.description && (
                                  <span className="text-[12px] text-slate-500 block mt-0.5 whitespace-nowrap">
                                    {pkg.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Module 6: NPR currency shown */}
                          <td className="px-4 py-3 text-[13px] font-[600] text-slate-900 whitespace-nowrap">
                            {pkg.price ? (
                              String(pkg.price).startsWith("NPR") || String(pkg.price).startsWith("$")
                                ? pkg.price
                                : `NPR ${pkg.price}`
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-slate-600 whitespace-nowrap">
                            {pkg.duration}
                          </td>
                          {/* Module 6: Status removed — Client Date shown */}
                          <td className="px-4 py-3 text-[13px] text-slate-600 whitespace-nowrap">
                            {pkg.client_date || "—"}
                          </td>
                          <td className="px-4 py-3 text-right pr-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditPackage(pkg)}
                                className="p-1 text-slate-400 hover:text-[#294998] transition-colors"
                                title="Edit package"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletePackageConfirmId(pkg.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete package"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: COURSES ─── */}
        {tab === "courses" && (
          <div className="space-y-6">
            <div className="bg-white rounded-[12px] p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[#EDF2FC] text-[#294998] flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-[700] text-slate-900 tracking-[-0.01em]">
                      Manage Courses
                    </h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">
                      Curriculum and training course management
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[12px] font-[500] bg-[#EEF2F6] text-slate-600">
                  {courses.length} Active Courses
                </span>
              </div>

              {courseMsg.text && (
                <div
                  className={`mb-4 p-3 rounded-[8px] text-[12px] font-[500] flex items-center gap-2 ${
                    courseMsg.type === "error"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {courseMsg.type === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  {courseMsg.text}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleCreateCourse} className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="Enter course name (e.g. IELTS / PTE Preparation)"
                    className="flex-1 h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={courseSubmitting}
                    className="h-10 bg-[#294998] hover:bg-[#1E3776] text-white font-[500] px-5 rounded-[8px] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-[13px] whitespace-nowrap disabled:opacity-50"
                  >
                    {courseSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add Course
                  </button>
                </div>
              </form>

              {/* Courses Table */}
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap w-16">
                        ID
                      </th>
                      <th className="px-4 h-9 text-left text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                        COURSE NAME
                      </th>
                      <th className="px-4 h-9 text-right text-[11px] font-[600] text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap pr-4">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loadingCourses ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-[13px] text-slate-400"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#294998]" />
                            Loading courses...
                          </div>
                        </td>
                      </tr>
                    ) : courses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-[13px] text-slate-400"
                        >
                          No courses available. Add one above.
                        </td>
                      </tr>
                    ) : (
                      courses.map((course) => (
                        <tr
                          key={course.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 text-[13px] text-slate-500 font-[500] whitespace-nowrap">
                            {course.id}
                          </td>
                          <td className="px-4 py-3 text-[13px] font-[600] text-slate-900 whitespace-nowrap">
                            {course.course_name}
                          </td>
                          <td className="px-4 py-3 text-right pr-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditCourse(course)}
                                className="p-1 text-slate-400 hover:text-[#294998] transition-colors"
                                title="Edit course"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteCourseConfirmId(course.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete course"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: EDIT USER ─── */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-[17px] font-[700] text-slate-900 tracking-[-0.01em]">
                Edit User #{editingUser.id}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div>
                <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                  USERNAME
                </label>
                <input
                  type="text"
                  value={editUserForm.username}
                  onChange={(e) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  required
                  className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                  ROLE
                </label>
                <div className="relative">
                  <select
                    value={editUserForm.role}
                    onChange={(e) =>
                      setEditUserForm((prev) => ({
                        ...prev,
                        role: e.target.value,
                      }))
                    }
                    className="w-full h-10 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                  >
                    <option value="sales_rep">Sales Rep</option>
                    <option value="admin">Admin</option>
                    {role === "superadmin" && (
                      <option value="superadmin">Super Admin</option>
                    )}
                    <option value="counselor">Counselor</option>
                    <option value="academic_counsellor">Academic Counsellor</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                  NEW PASSWORD (OPTIONAL)
                </label>
                <input
                  type="password"
                  value={editUserForm.password}
                  onChange={(e) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Leave blank to keep unchanged"
                  className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editUserLoading}
                  className="px-4 py-2 bg-[#294998] hover:bg-[#1E3776] text-white font-[500] rounded-[8px] text-[13px] transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {editUserLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT PACKAGE ─── */}
      {editingPackage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-[17px] font-[700] text-slate-900 tracking-[-0.01em]">
                Edit Package
              </h3>
              <button
                onClick={() => setEditingPackage(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditPackage} className="space-y-4">
              <div>
                <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                  PACKAGE NAME
                </label>
                <input
                  type="text"
                  value={editPackageForm.name}
                  onChange={(e) =>
                    setEditPackageForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                  className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                  PRICE / FEE
                </label>
                <input
                  type="text"
                  value={editPackageForm.price}
                  onChange={(e) =>
                    setEditPackageForm((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                    DURATION
                  </label>
                  <div className="relative">
                    <select
                      value={editPackageForm.duration}
                      onChange={(e) =>
                        setEditPackageForm((prev) => ({
                          ...prev,
                          duration: e.target.value,
                        }))
                      }
                      className="w-full h-10 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      <option value="1 Month">1 Month</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="1 Year">1 Year</option>
                      <option value="Lifetime">Lifetime</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                    STATUS
                  </label>
                  <div className="relative">
                    <select
                      value={editPackageForm.status}
                      onChange={(e) =>
                        setEditPackageForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full h-10 pl-3.5 pr-8 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                  FEATURES / SCOPE
                </label>
                <textarea
                  rows={2}
                  value={editPackageForm.features}
                  onChange={(e) =>
                    setEditPackageForm((prev) => ({
                      ...prev,
                      features: e.target.value,
                    }))
                  }
                  className="w-full p-3 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPackage(null)}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#294998] hover:bg-[#1E3776] text-white font-[500] rounded-[8px] text-[13px] transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT COURSE ─── */}
      {editingCourse && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-[17px] font-[700] text-slate-900 tracking-[-0.01em]">
                Edit Course #{editingCourse.id}
              </h3>
              <button
                onClick={() => setEditingCourse(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditCourse} className="space-y-4">
              <div>
                <label className="block text-[11px] font-[700] text-slate-700 uppercase tracking-wider mb-1.5">
                  COURSE NAME
                </label>
                <input
                  type="text"
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 text-[13px] rounded-[10px] bg-[#F1F5F9]/70 hover:bg-[#F1F5F9] border border-transparent focus:border-[#294998] focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-[500] bg-[#EEF2F6] hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#294998] hover:bg-[#1E3776] text-white font-[500] rounded-[8px] text-[13px] transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete User Confirmation ─── */}
      <AlertDialog open={!!deleteUserConfirmId} onOpenChange={(open) => { if (!open) setDeleteUserConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Delete User?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the user account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-[13px] text-rose-600 bg-rose-50 rounded-[8px] px-3 py-2 border border-rose-200">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteUser(deleteUserConfirmId)}
              disabled={deleteProcessing}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              {deleteProcessing ? "Deleting…" : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Package Confirmation ─── */}
      <AlertDialog open={!!deletePackageConfirmId} onOpenChange={(open) => { if (!open) setDeletePackageConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Delete Package?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the package from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeletePackage(deletePackageConfirmId)}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              Delete Package
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Course Confirmation ─── */}
      <AlertDialog open={!!deleteCourseConfirmId} onOpenChange={(open) => { if (!open) setDeleteCourseConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Delete Course?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the course. Students enrolled in this course may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteCourse(deleteCourseConfirmId)}
              disabled={deleteProcessing}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              {deleteProcessing ? "Deleting…" : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
