import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth.js";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";
import DataTableShell from "../components/common/DataTableShell.jsx";
import { PageShell, PageHeader } from "../components/common/PageShell.jsx";
import { BASE_URL } from "../config";
import { catalogService, classService, settingsService } from "../services/api";
import { isValidEmail } from "../utils/validation";
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

const Settings = () => {
  const { user, authToken } = useAuth();
  const role = useMemo(
    () => (user?.role || localStorage.getItem("role") || "").toLowerCase(),
    [user]
  );
  const isAdminLike = ["admin", "superadmin"].includes(role);

  // Tab State: "users" (Users & Packages) | "classes" (Classes)
  const [tab, setTab] = useState("users");

  // Delete confirmation state
  const [deleteUserConfirmId, setDeleteUserConfirmId] = useState(null);
  const [deletePackageConfirmId, setDeletePackageConfirmId] = useState(null);
  const [deactivateClassConfirmId, setDeactivateClassConfirmId] = useState(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // --- Users State ---
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userLoadError, setUserLoadError] = useState("");
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    role: "b2b",
    password: "",
  });
  const [userLoading, setUserLoading] = useState(false);
  const [userMsg, setUserMsg] = useState({ type: "", text: "" });

  // User Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    username: "",
    email: "",
    role: "b2b",
    password: "",
  });
  const [editUserLoading, setEditUserLoading] = useState(false);

  // Packages are shared catalog entries so they match the enrollment form.
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  const [packageForm, setPackageForm] = useState({
    name: "",
  });
  const [packageMsg, setPackageMsg] = useState({ type: "", text: "" });

  // Package Edit Modal State
  const [editingPackage, setEditingPackage] = useState(null);
  const [editPackageForm, setEditPackageForm] = useState({ name: "" });

  // --- Classes State ---
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [classMsg, setClassMsg] = useState({ type: "", text: "" });
  const [editingClass, setEditingClass] = useState(null);
  const [editClassName, setEditClassName] = useState("");
  const [syllabi, setSyllabi] = useState([]);
  const [loadingSyllabi, setLoadingSyllabi] = useState(true);
  const [newSyllabusName, setNewSyllabusName] = useState("");
  const [syllabusSubmitting, setSyllabusSubmitting] = useState(false);
  const [syllabusMsg, setSyllabusMsg] = useState({ type: "", text: "" });
  const [editingSyllabus, setEditingSyllabus] = useState(null);
  const [editSyllabusName, setEditSyllabusName] = useState("");
  const [deactivateSyllabusConfirmId, setDeactivateSyllabusConfirmId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUserLoadError("");
    try {
      setUsers(await settingsService.getUsers(authToken));
    } catch (err) {
      setUsers([]);
      setUserLoadError(err.message || "Could not load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, [authToken]);

  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      let data = await classService.getClasses(authToken);
      if (data && !Array.isArray(data) && Array.isArray(data.results)) {
        data = data.results;
      }
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setClassMsg({ type: "error", text: err.message || "Could not load the Class Catalog." });
    } finally {
      setLoadingClasses(false);
    }
  }, [authToken]);

  const fetchPackages = useCallback(async () => {
    setLoadingPackages(true);
    try {
      const data = await catalogService.getPackages(authToken);
      setPackages(data.filter((item) => item.active));
      setPackageMsg({ type: "", text: "" });
    } catch (err) {
      setPackages([]);
      setPackageMsg({ type: "error", text: err.message || "Could not load packages." });
    } finally {
      setLoadingPackages(false);
    }
  }, [authToken]);

  const fetchSyllabi = useCallback(async () => {
    setLoadingSyllabi(true);
    try {
      const data = await catalogService.getSyllabi(authToken);
      setSyllabi(data.filter((item) => item.active));
      setSyllabusMsg({ type: "", text: "" });
    } catch (err) {
      setSyllabi([]);
      setSyllabusMsg({ type: "error", text: err.message || "Could not load syllabus types." });
    } finally {
      setLoadingSyllabi(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isAdminLike && authToken) {
      fetchUsers();
      fetchClasses();
      fetchPackages();
      fetchSyllabi();
    }
  }, [isAdminLike, authToken, fetchUsers, fetchClasses, fetchPackages, fetchSyllabi]);

  useRealtimeRefresh(authToken, () => {
    if (!isAdminLike) return;
    fetchUsers();
    fetchClasses();
    fetchPackages();
    fetchSyllabi();
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserMsg({ type: "", text: "" });

    if (!userForm.username.trim() || !userForm.email.trim() || !userForm.password) {
      setUserMsg({ type: "error", text: "Username, email, and password are required." });
      return;
    }
    if (userForm.username.trim().length < 3 || userForm.username.trim().length > 150) {
      setUserMsg({ type: "error", text: "Username must be between 3 and 150 characters." });
      return;
    }
    if (userForm.password.length < 8) {
      setUserMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (!isValidEmail(userForm.email)) {
      setUserMsg({ type: "error", text: "Enter a valid email address." });
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
          email: userForm.email.trim(),
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
      setUserForm({ username: "", email: "", role: "b2b", password: "" });
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
      email: u.email || "",
      role: u.role || "b2b",
      password: "",
    });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editUserForm.username.trim().length < 3 || editUserForm.username.trim().length > 150) {
      alert("Username must be between 3 and 150 characters.");
      return;
    }
    if (editUserForm.password && editUserForm.password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    if (!isValidEmail(editUserForm.email)) {
      alert("Enter a valid email address.");
      return;
    }
    setEditUserLoading(true);
    try {
      const payload = {
        username: editUserForm.username.trim(),
        email: editUserForm.email.trim(),
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
            ? { ...u, username: payload.username, email: payload.email, role: payload.role }
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

  const handleAddPackage = async (e) => {
    e.preventDefault();
    setPackageMsg({ type: "", text: "" });

    if (!packageForm.name.trim()) {
      setPackageMsg({ type: "error", text: "Package name is required." });
      return;
    }
    if (packageForm.name.trim().length > 255) {
      setPackageMsg({ type: "error", text: "Package name must be 255 characters or fewer." });
      return;
    }
    try {
      const newPackage = await catalogService.createPackage(packageForm.name.trim(), authToken);
      setPackages((prev) => [...prev, newPackage]);
      setPackageForm({ name: "" });
      setPackageMsg({ type: "success", text: "Package added successfully." });
    } catch (err) {
      setPackageMsg({ type: "error", text: err.message || "Failed to add package." });
    }
  };

  const handleDeletePackage = async (id) => {
    setDeleteProcessing(true);
    setDeleteError("");
    try {
      await catalogService.deactivatePackage(id, authToken);
      setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
      setPackageMsg({ type: "success", text: "Package deactivated." });
    } catch (err) {
      setDeleteError(err.message || "Could not deactivate package.");
    } finally {
      setDeleteProcessing(false);
      setDeletePackageConfirmId(null);
    }
  };

  const handleOpenEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setEditPackageForm({ name: pkg.name || "" });
  };

  const handleSaveEditPackage = async (e) => {
    e.preventDefault();
    if (!editingPackage) return;
    if (!editPackageForm.name.trim() || editPackageForm.name.trim().length > 255) {
      alert("Package name is required and must be 255 characters or fewer.");
      return;
    }
    try {
      const updated = await catalogService.updatePackage(
        editingPackage.id, editPackageForm.name.trim(), authToken
      );
      setPackages((prev) => prev.map((pkg) => pkg.id === updated.id ? updated : pkg));
      setEditingPackage(null);
    } catch (err) {
      alert(err.message || "Failed to update package.");
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setClassMsg({ type: "", text: "" });
    if (!newClassName.trim() || newClassName.trim().length > 255) {
      setClassMsg({ type: "error", text: "Class name is required and must be 255 characters or fewer." });
      return;
    }

    setClassSubmitting(true);
    try {
      const res = await classService.createClass(newClassName.trim(), authToken);
      setClasses((prev) => [...prev, res]);
      setNewClassName("");
      setClassMsg({ type: "success", text: "Class added successfully!" });
    } catch (err) {
      setClassMsg({
        type: "error",
        text: err.message || "Failed to add class.",
      });
    } finally {
      setClassSubmitting(false);
    }
  };

  const handleDeactivateClass = async (id) => {
    setDeleteProcessing(true);
    try {
      await classService.deactivateClass(id, authToken);
      setClasses((prev) => prev.filter((c) => c.id !== id));
      setClassMsg({ type: "success", text: "Class deactivated." });
      setTimeout(() => setClassMsg({ type: "", text: "" }), 3000);
    } catch (err) {
      setClassMsg({ type: "error", text: "Failed to deactivate class: " + (err.message || "") });
    } finally {
      setDeleteProcessing(false);
      setDeactivateClassConfirmId(null);
    }
  };

  const handleOpenEditClass = (classItem) => {
    setEditingClass(classItem);
    setEditClassName(classItem.class_name);
  };

  const handleSaveEditClass = async (e) => {
    e.preventDefault();
    if (!editingClass) return;
    if (!editClassName.trim() || editClassName.trim().length > 255) {
      alert("Class name is required and must be 255 characters or fewer.");
      return;
    }
    try {
      const updated = await classService.updateClass(
        editingClass.id,
        editClassName.trim(),
        authToken
      );
      setClasses((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setEditingClass(null);
    } catch (err) {
      alert("Failed to update class: " + err.message);
    }
  };

  const handleCreateSyllabus = async (e) => {
    e.preventDefault();
    const name = newSyllabusName.trim();
    setSyllabusMsg({ type: "", text: "" });
    if (!name || name.length > 255) {
      setSyllabusMsg({ type: "error", text: "Syllabus type is required and must be 255 characters or fewer." });
      return;
    }
    setSyllabusSubmitting(true);
    try {
      const created = await catalogService.createSyllabus(name, authToken);
      setSyllabi((previous) => [...previous, created]);
      setNewSyllabusName("");
      setSyllabusMsg({ type: "success", text: "Syllabus type added." });
    } catch (err) {
      setSyllabusMsg({ type: "error", text: err.message || "Could not add syllabus type." });
    } finally {
      setSyllabusSubmitting(false);
    }
  };

  const handleDeactivateSyllabus = async (id) => {
    setDeleteProcessing(true);
    setDeleteError("");
    try {
      await catalogService.deactivateSyllabus(id, authToken);
      setSyllabi((previous) => previous.filter((item) => item.id !== id));
      setSyllabusMsg({ type: "success", text: "Syllabus type deactivated." });
    } catch (err) {
      setDeleteError(err.message || "Could not deactivate syllabus type.");
    } finally {
      setDeleteProcessing(false);
      setDeactivateSyllabusConfirmId(null);
    }
  };

  const handleEditSyllabus = (syllabus) => {
    setEditingSyllabus(syllabus);
    setEditSyllabusName(syllabus.name);
  };

  const handleSaveSyllabus = async (e) => {
    e.preventDefault();
    if (!editingSyllabus) return;
    const name = editSyllabusName.trim();
    if (!name || name.length > 255) {
      setSyllabusMsg({ type: "error", text: "Syllabus type is required and must be 255 characters or fewer." });
      return;
    }
    try {
      const updated = await catalogService.updateSyllabus(editingSyllabus.id, name, authToken);
      setSyllabi((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      setEditingSyllabus(null);
    } catch (err) {
      setSyllabusMsg({ type: "error", text: err.message || "Could not update syllabus type." });
    }
  };

  if (!isAdminLike) {
    return (
      <PageShell className="mx-auto my-8 max-w-4xl rounded-[12px] border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="crm-page-title mb-2">Settings</h1>
        <p className="text-rose-600 font-medium text-sm">
          Only Admins and Superadmins have permission to access Settings.
        </p>
      </PageShell>
    );
  }

  if ((tab === "users" && (loadingUsers || loadingPackages)) || (tab === "classes" && (loadingClasses || loadingSyllabi))) {
    return <PageLoadingState />;
  }

  return (
    <PageShell width="standard" className="flex h-full flex-col">
      <PageHeader
        title="Settings"
        description="Manage system users, counseling packages, and classes."
        actions={(
          <>
            <button
              onClick={() => setTab("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                tab === "users"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface-muted hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Users className="w-4 h-4" />
              Users & Packages
            </button>
            <button
              onClick={() => setTab("classes")}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium transition-colors ${
                tab === "classes"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface-muted hover:bg-slate-200 text-slate-700"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Classes
            </button>
          </>
        )}
      />

      {/* ─── Content Area ─── */}
      <div className="w-full space-y-6 p-6 md:p-8">
        {/* ─── TAB: USERS & PACKAGES ─── */}
        {tab === "users" && (
          <div className="space-y-6">
            {/* Top Row: Create New User & All Users */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ─── Card 1: Create New User ─── */}
              <div className="lg:col-span-5 bg-white rounded-[12px] p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-[8px] bg-primary-light text-primary flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-[-0.01em]">
                      Create New User
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Add staff and counselors
                    </p>
                  </div>
                </div>

                {userMsg.text && (
                  <div
                    className={`mb-4 p-3 rounded-[8px] text-xs font-medium flex items-center gap-2 ${
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
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        USERNAME <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={150}
                        value={userForm.username}
                        onChange={(e) =>
                          setUserForm((prev) => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                        placeholder="Enter username"
                        className="w-full h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        EMAIL <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        maxLength={254}
                        value={userForm.email}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="name@company.com"
                        className="w-full h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        ROLE <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={userForm.role}
                          required
                          onChange={(e) =>
                            setUserForm((prev) => ({
                              ...prev,
                              role: e.target.value,
                            }))
                          }
                          className="w-full h-10 pl-3.5 pr-8 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                        >
                          <option value="b2b">Sales Rep / B2B</option>
                          <option value="admin">Admin</option>
                          <option value="b2c">B2C</option>
                          <option value="academic">Academic Counsellor</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        PASSWORD <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={userLoading}
                    className="w-full mt-5 h-10 bg-primary hover:bg-primary-hover text-white font-medium rounded-[8px] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-sm disabled:opacity-50"
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
                    <div className="w-8 h-8 rounded-[8px] bg-primary-light text-primary flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-[-0.01em]">
                        All Users
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Active system accounts
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-slate-600">
                    {users.length} {users.length === 1 ? "User" : "Users"}
                  </span>
                </div>

                {/* Users Table */}
                <DataTableShell className="crm-data-table--embedded">
                  <div className="crm-data-table__scroll">
                  <table className="text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 h-9 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap w-12">
                          ID
                        </th>
                        <th className="px-4 h-9 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                          USERNAME
                        </th>
                        <th className="px-4 h-9 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                          ROLE
                        </th>
                        <th className="px-4 h-9 text-right text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap pr-4">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {loadingUsers ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-8 text-center text-sm text-slate-400 whitespace-nowrap"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              Loading users...
                            </div>
                          </td>
                        </tr>
                      ) : userLoadError ? (
                        <tr>
                          <td colSpan={4} role="alert" className="py-8 text-center text-sm text-rose-600">
                            Could not load users: {userLoadError}
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-8 text-center text-sm text-slate-400 whitespace-nowrap"
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
                              <td className="px-4 py-3 text-sm text-slate-500 font-medium whitespace-nowrap">
                                {u.id}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-primary-light text-primary font-semibold flex items-center justify-center text-xs shrink-0">
                                    {initial}
                                  </div>
                                  <span className="text-sm font-semibold text-slate-900">
                                    {u.username}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-slate-700">
                                  {u.role || "b2b"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right pr-4 whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    className="p-1 text-slate-400 hover:text-primary transition-colors"
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
                </DataTableShell>
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
                    <h3 className="text-base font-bold text-slate-900 tracking-[-0.01em]">
                      Manage Packages
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Manage package options used by client records
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-slate-600">
                  {packages.length} Active Packages
                </span>
              </div>

              {packageMsg.text && (
                <div
                  className={`mb-4 p-3 rounded-[8px] text-xs font-medium flex items-center gap-2 ${
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
                  <div className="md:col-span-10">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      PACKAGE NAME <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={255}
                      value={packageForm.name}
                      onChange={(e) =>
                        setPackageForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g. Premium Admission + Visa Guidance"
                      className="w-full h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                    />
                  </div>

                  {/* BUTTON */}
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full h-10 bg-primary hover:bg-primary-hover text-white font-medium rounded-[8px] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> Add Package
                    </button>
                  </div>
                </div>
              </form>

              {/* Packages Table */}
              <DataTableShell className="crm-data-table--embedded">
                <div className="crm-data-table__scroll">
                <table className="text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 h-9 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap w-12">
                        ID
                      </th>
                      <th className="px-4 h-9 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                        PACKAGE NAME
                      </th>
                      <th className="px-4 h-9 text-right text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap pr-4">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {packages.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-sm text-slate-400 whitespace-nowrap"
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
                          <td className="px-4 py-3 text-sm text-slate-500 font-medium whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-[6px] bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-900 block whitespace-nowrap">
                                  {pkg.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right pr-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditPackage(pkg)}
                                className="p-1 text-slate-400 hover:text-primary transition-colors"
                                title="Edit package"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletePackageConfirmId(pkg.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Deactivate package"
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
              </DataTableShell>
            </div>

          </div>
        )}

        {/* ─── TAB: CLASSES ─── */}
        {tab === "classes" && (
          <div className="space-y-6">
            <div className="bg-white rounded-[12px] p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-primary-light text-primary flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-[-0.01em]">
                      Manage Classes
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Curriculum and training class management
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted text-slate-600">
                  {classes.length} Active Classes
                </span>
              </div>

              {classMsg.text && (
                <div
                  className={`mb-4 p-3 rounded-[8px] text-xs font-medium flex items-center gap-2 ${
                    classMsg.type === "error"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {classMsg.type === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  {classMsg.text}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleCreateClass} className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    maxLength={255}
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Enter class name (e.g. IELTS / PTE Preparation)"
                    className="flex-1 h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={classSubmitting}
                    className="h-10 bg-primary hover:bg-primary-hover text-white font-medium px-5 rounded-[8px] transition-colors flex items-center justify-center gap-1.5 shadow-sm text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {classSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add Class
                  </button>
                </div>
              </form>

              {/* Classes Table */}
              <DataTableShell className="crm-data-table--embedded">
                <div className="crm-data-table__scroll">
                <table className="text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 h-9 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap w-16">
                        ID
                      </th>
                      <th className="px-4 h-9 text-left text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap">
                        CLASS NAME
                      </th>
                      <th className="px-4 h-9 text-right text-xs font-semibold text-slate-500 uppercase tracking-[0.04em] whitespace-nowrap pr-4">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loadingClasses ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-sm text-slate-400"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            Loading classes...
                          </div>
                        </td>
                      </tr>
                    ) : classes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-sm text-slate-400"
                        >
                          No classes available. Add one above.
                        </td>
                      </tr>
                    ) : (
                      classes.map((classItem) => (
                        <tr
                          key={classItem.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-slate-500 font-medium whitespace-nowrap">
                            {classItem.id}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 whitespace-nowrap">
                            {classItem.class_name}
                          </td>
                          <td className="px-4 py-3 text-right pr-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditClass(classItem)}
                                className="p-1 text-slate-400 hover:text-primary transition-colors"
                                title="Edit class"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeactivateClassConfirmId(classItem.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Deactivate class"
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
              </DataTableShell>
            </div>
            <div className="bg-white rounded-[12px] p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage Syllabus Types</h3>
                  <p className="mt-0.5 text-xs text-slate-500">These options appear in client enrollment.</p>
                </div>
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-slate-600">{syllabi.length} Active Types</span>
              </div>
              {syllabusMsg.text && <p role="status" className={`mb-4 rounded-lg border p-3 text-xs ${syllabusMsg.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{syllabusMsg.text}</p>}
              <form onSubmit={handleCreateSyllabus} className="mb-5 flex flex-col gap-3 sm:flex-row">
                <input type="text" required maxLength={255} value={newSyllabusName} onChange={(event) => setNewSyllabusName(event.target.value)} placeholder="Add a syllabus type" className="h-10 flex-1 rounded-[10px] border border-slate-200 px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
                <button type="submit" disabled={syllabusSubmitting} className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50">{syllabusSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add Syllabus Type</button>
              </form>
              <DataTableShell className="crm-data-table--embedded">
                <div className="crm-data-table__scroll"><table className="text-left">
                  <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-4 h-9 text-left text-xs font-semibold text-slate-500">ID</th><th className="px-4 h-9 text-left text-xs font-semibold text-slate-500">SYLLABUS TYPE</th><th className="px-4 h-9 text-right text-xs font-semibold text-slate-500 pr-4">ACTIONS</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {syllabi.length ? syllabi.map((syllabus) => <tr key={syllabus.id}><td className="px-4 py-3 text-sm text-slate-500">{syllabus.id}</td><td className="px-4 py-3 text-sm font-semibold text-slate-900">{syllabus.name}</td><td className="px-4 py-3 text-right pr-4"><button onClick={() => handleEditSyllabus(syllabus)} className="mr-2 p-1 text-slate-400 hover:text-primary" title="Edit syllabus type"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => setDeactivateSyllabusConfirmId(syllabus.id)} className="p-1 text-slate-400 hover:text-rose-600" title="Deactivate syllabus type"><Trash2 className="h-3.5 w-3.5" /></button></td></tr>) : <tr><td colSpan={3} className="py-8 text-center text-sm text-slate-400">No syllabus types configured yet.</td></tr>}
                  </tbody>
                </table></div>
              </DataTableShell>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: EDIT USER ─── */}
      {editingUser && (
        <div data-modal-open="true" className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-2xl border border-slate-200/80 crm-animate-in crm-fade-in-0 crm-zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 tracking-[-0.01em]">
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  USERNAME
                </label>
                <input
                  type="text"
                  value={editUserForm.username}
                  minLength={3}
                  maxLength={150}
                  onChange={(e) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  required
                  className="w-full h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  maxLength={254}
                  className="w-full h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                    className="w-full h-10 pl-3.5 pr-8 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none appearance-none cursor-pointer transition-all text-slate-800"
                  >
                    <option value="b2b">Sales Rep / B2B</option>
                    <option value="admin">Admin</option>
                    <option value="b2c">B2C</option>
                    <option value="academic">Academic Counsellor</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  NEW PASSWORD (OPTIONAL)
                </label>
                <input
                  type="password"
                  value={editUserForm.password}
                  minLength={8}
                  onChange={(e) =>
                    setEditUserForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Leave blank to keep unchanged"
                  className="w-full h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-[8px] text-sm font-medium bg-surface-muted hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editUserLoading}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-[8px] text-sm transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
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
        <div data-modal-open="true" className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-2xl border border-slate-200/80 crm-animate-in crm-fade-in-0 crm-zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 tracking-[-0.01em]">
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  PACKAGE NAME
                </label>
                <input
                  type="text"
                  value={editPackageForm.name}
                  maxLength={255}
                  onChange={(e) =>
                    setEditPackageForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                  className="w-full h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPackage(null)}
                  className="px-4 py-2 rounded-[8px] text-sm font-medium bg-surface-muted hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-[8px] text-sm transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSyllabus && (
        <div data-modal-open="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[16px] border border-slate-200/80 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Edit Syllabus Type</h3>
              <button onClick={() => setEditingSyllabus(null)} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveSyllabus} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Syllabus type
                <input type="text" required maxLength={255} value={editSyllabusName} onChange={(event) => setEditSyllabusName(event.target.value)} className="mt-1.5 h-10 w-full rounded-[10px] border border-slate-200 px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingSyllabus(null)} className="rounded-lg bg-surface-muted px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT CLASS ─── */}
      {editingClass && (
        <div data-modal-open="true" className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-2xl border border-slate-200/80 crm-animate-in crm-fade-in-0 crm-zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 tracking-[-0.01em]">
                Edit Class #{editingClass.id}
              </h3>
              <button
                onClick={() => setEditingClass(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  CLASS NAME
                </label>
                <input
                  type="text"
                  value={editClassName}
                  maxLength={255}
                  onChange={(e) => setEditClassName(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 text-sm rounded-[10px] bg-canvas-subtle/70 hover:bg-canvas-subtle border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all text-slate-800"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 rounded-[8px] text-sm font-medium bg-surface-muted hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-[8px] text-sm transition-colors shadow-sm"
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
            <p className="text-sm text-rose-600 bg-rose-50 rounded-[8px] px-3 py-2 border border-rose-200">{deleteError}</p>
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

      {/* ─── Deactivate Package Confirmation ─── */}
      <AlertDialog open={!!deletePackageConfirmId} onOpenChange={(open) => { if (!open) setDeletePackageConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Deactivate Package?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The package will no longer be available for new client enrollments. Existing client records will retain it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeletePackage(deletePackageConfirmId)}
              disabled={deleteProcessing}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              {deleteProcessing ? "Deactivating…" : "Deactivate Package"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deactivateSyllabusConfirmId} onOpenChange={(open) => { if (!open) setDeactivateSyllabusConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Syllabus Type?</AlertDialogTitle>
            <AlertDialogDescription>This option will be hidden from new enrollments. Existing client records will keep their syllabus.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeactivateSyllabus(deactivateSyllabusConfirmId)} disabled={deleteProcessing} className="bg-rose-600 hover:bg-rose-700 text-white border-0">{deleteProcessing ? "Deactivating…" : "Deactivate Syllabus Type"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Class Confirmation ─── */}
      <AlertDialog open={!!deactivateClassConfirmId} onOpenChange={(open) => { if (!open) setDeactivateClassConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Deactivate Class?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The class will become unavailable for new lead interests and enrollments. Existing client records will retain it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeactivateClass(deactivateClassConfirmId)}
              disabled={deleteProcessing}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0"
            >
              {deleteProcessing ? "Deactivating…" : "Deactivate Class"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default Settings;
