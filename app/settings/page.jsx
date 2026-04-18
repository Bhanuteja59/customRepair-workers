"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function LucideIcon({ d, className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function Toggle({ value, onChange, label, sub }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-bold text-slate-900">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all duration-300 relative ${value ? "bg-emerald-500" : "bg-slate-200"}`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-all duration-300 ${value ? "left-6" : "left-0.5"}`} />
      </button>
    </div>
  );
}

const SIDEBAR = [
  { label: "Dashboard",  icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", href: "/dashboard" },
  { label: "Analytics",  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", href: "/analytics" },
  { label: "Earnings",   icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "/earnings" },
  { label: "Messages",   icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", href: "/messages" },
  { label: "Settings",   icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", href: "/settings", active: true },
];

const SETTINGS_SECTIONS = [
  { id: "profile",        label: "Profile & Identity",  icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "notifications",  label: "Notifications",       icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { id: "schedule",       label: "Schedule Preferences", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "privacy",        label: "Privacy & Security",   icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { id: "appearance",     label: "Appearance",           icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
  { id: "danger",         label: "Danger Zone",          icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [worker, setWorker] = useState(null);
  const [token, setToken] = useState(null);
  const [activeSection, setActiveSection] = useState("profile");
  const [profileForm, setProfileForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    newLead: true, jobAssigned: true, scheduleReminder: true,
    paymentAlert: true, systemUpdates: false, marketing: false,
  });
  const [schedPrefs, setSchedPrefs] = useState({
    autoAccept: false, bufferBetweenJobs: true, weekendsAvailable: true, maxJobsPerDay: "3",
  });
  const [privacyPrefs, setPrivacyPrefs] = useState({
    showPhone: false, locationSharing: true, twoFactor: false,
  });

  useEffect(() => {
    const t = localStorage.getItem("worker_token");
    const w = localStorage.getItem("worker_data");
    if (!t || !w) { router.replace("/login"); return; }
    setToken(t);
    const wObj = JSON.parse(w);
    setWorker(wObj);
    setProfileForm({ name: wObj.name || "", phone: wObj.phone || "", email: wObj.email || "", specializations: wObj.specializations || [] });
  }, [router]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/workers/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setWorker(updated);
        localStorage.setItem("worker_data", JSON.stringify(updated));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {} finally { setSaving(false); }
  };

  if (!worker || !profileForm) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 flex flex-col fixed h-full z-50">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-white shadow-lg shrink-0">C</div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-tight">Custom Repair</h1>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em] leading-none mt-0.5">Worker Hub</p>
          </div>
        </div>
        <div className="px-4 py-3 mx-4 mt-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-white font-black text-sm shrink-0">{worker.name?.charAt(0)}</div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">{worker.name}</p>
            <p className="text-[10px] text-slate-500 font-bold truncate">{worker.email}</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-5 space-y-1">
          {SIDEBAR.map(item => (
            <button key={item.href} onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${item.active ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <LucideIcon d={item.icon} className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/5">
          <button onClick={() => { localStorage.clear(); router.replace("/login"); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-400 hover:bg-red-900/10 transition-all">
            <LucideIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-72 min-h-screen flex">
        {/* Settings nav */}
        <div className="w-64 bg-white border-r border-slate-100 pt-8 px-4 flex flex-col gap-1 sticky top-0 h-screen overflow-y-auto">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] px-3 mb-2">Settings</p>
          {SETTINGS_SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${
                activeSection === s.id ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              } ${s.id === "danger" ? "text-red-500 hover:text-red-600 hover:bg-red-50 mt-auto" : ""}`}>
              <LucideIcon d={s.icon} className={`w-4 h-4 shrink-0 ${activeSection === s.id ? "text-emerald-600" : s.id === "danger" ? "text-red-400" : "text-slate-400"}`} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 p-8 max-w-2xl">
          {saved && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <LucideIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-black text-emerald-700">Changes saved successfully!</p>
            </div>
          )}

          {/* PROFILE SECTION */}
          {activeSection === "profile" && (
            <div className="space-y-6 fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-900">Profile & Identity</h2>
                <p className="text-xs text-slate-400 mt-1 font-bold">Manage your technician profile and trade specializations.</p>
              </div>
              <form onSubmit={saveProfile} className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-100">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">{worker.name?.charAt(0)}</div>
                    <div>
                      <p className="text-base font-black text-slate-900">{worker.name}</p>
                      <p className="text-sm text-slate-400 font-bold">{worker.email}</p>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Worker ID: {worker.id}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Full Name</label>
                      <input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-emerald-400 focus:bg-white transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Phone Number</label>
                      <input type="tel" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-emerald-400 focus:bg-white transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Email (read-only)</label>
                      <input type="email" value={profileForm.email} disabled
                        className="w-full bg-slate-100 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-400 text-sm outline-none cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Trade Specializations</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ v: "hvac", l: "HVAC", c: "from-indigo-400 to-indigo-600" }, { v: "plumbing", l: "Plumbing", c: "from-sky-400 to-sky-600" }, { v: "electrical", l: "Electrical", c: "from-amber-400 to-amber-600" }, { v: "general", l: "General", c: "from-emerald-400 to-emerald-600" }].map(s => {
                      const isSel = profileForm.specializations.includes(s.v);
                      return (
                        <button key={s.v} type="button"
                          onClick={() => { const cur = profileForm.specializations; setProfileForm(p => ({ ...p, specializations: isSel ? cur.filter(v => v !== s.v) : [...cur, s.v] })); }}
                          className={`px-4 py-3 rounded-xl text-sm font-black border-2 transition-all flex items-center gap-2 ${isSel ? `bg-gradient-to-br ${s.c} text-white border-transparent shadow-lg` : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                          <div className={`w-2 h-2 rounded-full ${isSel ? "bg-white" : "bg-slate-300"}`} />
                          {s.l}
                        </button>
                      );
                    })}
                  </div>
                  {profileForm.specializations.length === 0 && <p className="text-xs text-red-500 font-bold mt-3">Select at least one trade to remain active.</p>}
                </div>

                <button type="submit" disabled={saving || profileForm.specializations.length === 0}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 transition-all text-sm uppercase tracking-widest">
                  {saving ? "Saving..." : "Save Profile Changes"}
                </button>
              </form>
            </div>
          )}

          {/* NOTIFICATIONS SECTION */}
          {activeSection === "notifications" && (
            <div className="space-y-6 fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-900">Notifications</h2>
                <p className="text-xs text-slate-400 mt-1 font-bold">Control which alerts you receive.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Job Alerts</p>
                <Toggle value={notifPrefs.newLead}       onChange={v => setNotifPrefs(p => ({ ...p, newLead: v }))}       label="New Lead Available"       sub="Get notified when a job in your area opens up" />
                <Toggle value={notifPrefs.jobAssigned}   onChange={v => setNotifPrefs(p => ({ ...p, jobAssigned: v }))}   label="Direct Job Assignment"    sub="Admin directly assigns you a job" />
                <Toggle value={notifPrefs.scheduleReminder} onChange={v => setNotifPrefs(p => ({ ...p, scheduleReminder: v }))} label="Schedule Reminders"   sub="Reminder 1 hour before your next job" />
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Account & System</p>
                <Toggle value={notifPrefs.paymentAlert}  onChange={v => setNotifPrefs(p => ({ ...p, paymentAlert: v }))}  label="Payment Processed"        sub="When your earnings are confirmed" />
                <Toggle value={notifPrefs.systemUpdates} onChange={v => setNotifPrefs(p => ({ ...p, systemUpdates: v }))} label="System Updates"           sub="Platform maintenance and new features" />
                <Toggle value={notifPrefs.marketing}     onChange={v => setNotifPrefs(p => ({ ...p, marketing: v }))}     label="Tips & Best Practices"    sub="Occasional tips to earn more" />
              </div>
            </div>
          )}

          {/* SCHEDULE PREFERENCES */}
          {activeSection === "schedule" && (
            <div className="space-y-6 fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-900">Schedule Preferences</h2>
                <p className="text-xs text-slate-400 mt-1 font-bold">Configure how your availability works.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <Toggle value={schedPrefs.autoAccept}       onChange={v => setSchedPrefs(p => ({ ...p, autoAccept: v }))}       label="Auto-Accept Leads"          sub="Automatically claim matching leads" />
                <Toggle value={schedPrefs.bufferBetweenJobs} onChange={v => setSchedPrefs(p => ({ ...p, bufferBetweenJobs: v }))} label="30-min Buffer Between Jobs" sub="Reserve buffer time after each job" />
                <Toggle value={schedPrefs.weekendsAvailable} onChange={v => setSchedPrefs(p => ({ ...p, weekendsAvailable: v }))} label="Weekend Availability"       sub="Show weekend slots in your schedule" />
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Max Jobs per Day</label>
                <div className="flex gap-3">
                  {["1","2","3","4","5"].map(n => (
                    <button key={n} onClick={() => setSchedPrefs(p => ({ ...p, maxJobsPerDay: n }))}
                      className={`w-12 h-12 rounded-xl font-black text-sm transition-all ${schedPrefs.maxJobsPerDay === n ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Dispatcher will cap job assignments at your limit.</p>
              </div>
            </div>
          )}

          {/* PRIVACY SECTION */}
          {activeSection === "privacy" && (
            <div className="space-y-6 fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-900">Privacy & Security</h2>
                <p className="text-xs text-slate-400 mt-1 font-bold">Control your data and account security.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <Toggle value={privacyPrefs.showPhone}       onChange={v => setPrivacyPrefs(p => ({ ...p, showPhone: v }))}       label="Show Phone to Customers"  sub="Customers see your phone on confirmed jobs" />
                <Toggle value={privacyPrefs.locationSharing} onChange={v => setPrivacyPrefs(p => ({ ...p, locationSharing: v }))} label="Location Sharing"         sub="Share approximate location during jobs" />
                <Toggle value={privacyPrefs.twoFactor}       onChange={v => setPrivacyPrefs(p => ({ ...p, twoFactor: v }))}       label="Two-Factor Authentication" sub="Extra login security via SMS" />
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</p>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Current Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-emerald-400 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-emerald-400 focus:bg-white transition-all" />
                </div>
                <button className="px-6 py-3 bg-slate-900 text-white text-sm font-black rounded-xl hover:bg-slate-800 transition-all">Update Password</button>
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeSection === "appearance" && (
            <div className="space-y-6 fade-in">
              <div>
                <h2 className="text-xl font-black text-slate-900">Appearance</h2>
                <p className="text-xs text-slate-400 mt-1 font-bold">Customize how the app looks.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Accent Color</p>
                <div className="flex gap-3 flex-wrap">
                  {[["Emerald", "#10b981"], ["Indigo", "#6366f1"], ["Sky", "#0ea5e9"], ["Amber", "#f59e0b"], ["Rose", "#f43f5e"]].map(([name, color]) => (
                    <button key={name} className="flex flex-col items-center gap-2 group">
                      <div className="w-10 h-10 rounded-full border-4 border-white shadow-md group-hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                      <span className="text-[9px] font-black text-slate-400 uppercase">{name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sidebar Width</p>
                <div className="flex gap-3">
                  {["Compact","Default","Wide"].map(s => (
                    <button key={s} className={`px-4 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${s === "Default" ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          {activeSection === "danger" && (
            <div className="space-y-6 fade-in">
              <div>
                <h2 className="text-xl font-black text-red-600">Danger Zone</h2>
                <p className="text-xs text-slate-400 mt-1 font-bold">Irreversible account actions. Proceed with caution.</p>
              </div>
              <div className="bg-white rounded-2xl border-2 border-red-100 shadow-sm overflow-hidden">
                {[
                  { title: "Deactivate Account", desc: "Temporarily pause your account. You won't receive new jobs.", action: "Deactivate", style: "bg-amber-600 hover:bg-amber-700" },
                  { title: "Delete All Availability Slots", desc: "Remove all your scheduled slots. This cannot be undone.", action: "Clear Slots", style: "bg-orange-600 hover:bg-orange-700" },
                  { title: "Delete Account", desc: "Permanently delete your account and all associated data.", action: "Delete Account", style: "bg-red-600 hover:bg-red-700" },
                ].map((item, i) => (
                  <div key={i} className={`p-6 flex items-center justify-between gap-4 ${i < 2 ? "border-b border-red-50" : ""}`}>
                    <div>
                      <p className="text-sm font-black text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <button className={`px-4 py-2.5 ${item.style} text-white text-xs font-black rounded-xl transition-all shadow-sm shrink-0`}>{item.action}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .fade-in { animation: fade-in 0.3s ease-out }
      `}</style>
    </div>
  );
}
