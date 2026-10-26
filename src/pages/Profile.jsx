import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, LoaderCircle, Save, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../context/useAuth.js";
import { profileService } from "../services/api.js";
import PageLoadingState from "../components/common/PageLoadingState.jsx";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh.js";

const Profile = () => {
  const { authToken, user, setUserProfile } = useAuth();
  const [profile, setProfile] = useState({ username: "", email: "", first_name: "", last_name: "", role: "" });
  const [passwords, setPasswords] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    profileService.getMyProfile(authToken).then((data) => {
      if (cancelled) return;
      setProfile({
        username: data.username || "",
        email: data.email || "",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        role: data.role || "",
      });
      setUserProfile(data);
    }).catch((error) => {
      if (!cancelled) setMessage({ type: "error", text: error.message || "Could not load your profile." });
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [authToken, setUserProfile]);

  useRealtimeRefresh(authToken, async () => {
    try {
      const data = await profileService.getMyProfile(authToken);
      setProfile({
        username: data.username || "",
        email: data.email || "",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        role: data.role || "",
      });
      setUserProfile(data);
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Could not refresh your profile." });
    }
  });

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    try {
      const updated = await profileService.updateMyProfile({
        email: profile.email.trim(),
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
      }, authToken);
      setProfile((current) => ({ ...current, ...updated }));
      setUserProfile(updated);
      setMessage({ type: "success", text: "Your profile was updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Could not update your profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.new_password.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      setMessage({ type: "error", text: "The new passwords do not match." });
      return;
    }
    setSavingPassword(true);
    setMessage(null);
    try {
      const result = await profileService.changePassword(passwords.old_password, passwords.new_password, authToken);
      setPasswords({ old_password: "", new_password: "", confirm_password: "" });
      setMessage({ type: "success", text: result.detail || "Your password was changed." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Could not change your password." });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <PageLoadingState />;

  return (
    <main className="min-h-full bg-[#F5F7FB]">
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#294998]"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.035)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#294998]">Account</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-900">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">View and update your own profile and sign-in credentials.</p>
        </header>

        {message && <div role={message.type === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${message.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {message.type === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}{message.text}
        </div>}

        <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={saveProfile} className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.035)] sm:p-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#294998]"><UserRound className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold text-slate-900">Profile details</h2><p className="mt-0.5 text-xs text-slate-500">Your username and role are managed by an administrator.</p></div></div>
            <label className="block text-xs font-semibold text-slate-700">Username<input value={profile.username} readOnly className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-500" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-700">First name<input value={profile.first_name} onChange={(event) => setProfile((current) => ({ ...current, first_name: event.target.value }))} maxLength={150} className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-[#294998] focus:ring-4 focus:ring-blue-50" /></label>
              <label className="block text-xs font-semibold text-slate-700">Last name<input value={profile.last_name} onChange={(event) => setProfile((current) => ({ ...current, last_name: event.target.value }))} maxLength={150} className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-[#294998] focus:ring-4 focus:ring-blue-50" /></label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">Email<input type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} required maxLength={254} className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-[#294998] focus:ring-4 focus:ring-blue-50" /></label>
            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs capitalize text-slate-400"><ShieldCheck className="h-3.5 w-3.5" />{profile.role || user?.role}</span><button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-lg bg-[#294998] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1E3776] disabled:opacity-50"><Save className="h-3.5 w-3.5" />{savingProfile ? "Saving…" : "Save profile"}</button></div>
          </form>

          <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.035)] sm:p-6">
            <div className="border-b border-slate-100 pb-4"><h2 className="text-sm font-semibold text-slate-900">Change password</h2><p className="mt-1 text-xs leading-5 text-slate-500">Enter your current password to choose a new one.</p></div>
            <label className="block text-xs font-semibold text-slate-700">Current password<input type="password" autoComplete="current-password" value={passwords.old_password} onChange={(event) => setPasswords((current) => ({ ...current, old_password: event.target.value }))} required className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-[#294998] focus:ring-4 focus:ring-blue-50" /></label>
            <label className="block text-xs font-semibold text-slate-700">New password<input type="password" autoComplete="new-password" value={passwords.new_password} onChange={(event) => setPasswords((current) => ({ ...current, new_password: event.target.value }))} required minLength={8} className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-[#294998] focus:ring-4 focus:ring-blue-50" /><span className="mt-1 block text-[10px] font-normal text-slate-400">At least 8 characters.</span></label>
            <label className="block text-xs font-semibold text-slate-700">Confirm new password<input type="password" autoComplete="new-password" value={passwords.confirm_password} onChange={(event) => setPasswords((current) => ({ ...current, confirm_password: event.target.value }))} required minLength={8} className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-[#294998] focus:ring-4 focus:ring-blue-50" /></label>
            <div className="flex justify-end pt-1"><button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{savingPassword && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}{savingPassword ? "Updating…" : "Update password"}</button></div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default Profile;
