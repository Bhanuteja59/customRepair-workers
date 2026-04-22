"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUS_THEMES = {
  open: { label: "Pending Review", badge: "badge-warning", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  pending: { label: "Evaluating", badge: "badge-warning", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  assigned: { label: "New Assignment", badge: "badge-info", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0z" },
  claimed: { label: "Job Confirmed", badge: "badge-success", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  in_progress: { label: "Working Now", badge: "badge-success", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  completed: { label: "Done!", badge: "badge-info", icon: "M5 13l4 4L19 7" },
  not_completed: { label: "Unfinished", badge: "badge-danger", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" },
  expired: { label: "Missed Slot", badge: "badge-warning", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
};

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

const SETTINGS_SECTIONS = [
  { id: "notifications", label: "Notifications", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { id: "schedule_prefs", label: "Schedule Preferences", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "privacy", label: "Privacy & Security", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { id: "appearance", label: "Appearance", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
  { id: "danger", label: "Danger Zone", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" },
];

const FAQ = [
  { q: "How do I get assigned to a job?", a: "Add availability slots in 'My Schedule', then set your trade specializations in your Profile. The dispatcher matches open bookings to workers with matching skills and time slots." },
  { q: "When can I start a job?", a: "You can tap 'Start Work' only during the job's scheduled time window. The button activates when the booking start time is reached." },
  { q: "How do I finish a job early?", a: "The 'Finish Work' button activates 30 minutes before the end of the scheduled slot. This prevents premature completions." },
  { q: "How are jobs assigned to me?", a: "Our system automatically matches technicians based on workload and skill. The technician with the least total jobs and an available slot for the requested time is chosen automatically." },
  { q: "What happens if I miss a job slot?", a: "Missed slots are marked as 'Expired'. Your profile score may be affected. Contact dispatch if you have an emergency." },
  { q: "How do I update my phone number?", a: "Go to Settings → Profile & Identity and update your phone number there." },
  { q: "Can I reject a directly assigned job?", a: "Yes. When you receive a direct assignment notification, tap 'Reject' to decline. The job returns to the pool." },
];

const GUIDES = [
  { title: "Getting Started Guide", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: "from-emerald-500 to-teal-600" },
  { title: "How Job Matching Works", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", color: "from-blue-500 to-indigo-600" },
  { title: "Managing Your Schedule", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "from-purple-500 to-pink-600" },
];

function LucideIcon({ d, className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}


function KpiCard({ label, value, icon, color = "emerald", sub }) {
  const c = {
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    purple: "from-purple-500 to-purple-600",
    sky: "from-sky-500 to-sky-600",
    rose: "from-rose-500 to-rose-600",
  }[color] || "from-emerald-500 to-emerald-600";
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c} flex items-center justify-center shadow-lg shrink-0`}>
        <LucideIcon d={icon} className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mt-0.5 leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function WorkerDashboard() {
  const router = useRouter();
  const [worker, setWorker] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState("start_work");
  const [profileForm, setProfileForm] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [mySlots, setMySlots] = useState([]);
  const [slotForm, setSlotForm] = useState({ slot_date: "", start_time: "09:00 AM", end_time: "11:00 AM" });
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotError, setSlotError] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // Settings & Help state
  const [activeSection, setActiveSection] = useState("profile");
  const [notifPrefs, setNotifPrefs] = useState({ newLead: true, jobAssigned: true, scheduleReminder: true, systemUpdates: false, marketing: false });
  const [schedPrefs, setSchedPrefs] = useState({ autoAccept: false, bufferBetweenJobs: true, weekendsAvailable: true, maxJobsPerDay: "3" });
  const [privacyPrefs, setPrivacyPrefs] = useState({ showPhone: false, locationSharing: true, twoFactor: false });
  const [helpSearch, setHelpSearch] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [helpTicket, setHelpTicket] = useState({ subject: "", desc: "", priority: "normal" });
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const calculateJobTimings = (job) => {
    if (!job?.booking?.preferred_date) return { canStart: true, canComplete: true, start: null, end: null, label: null };
    const timeParts = job.booking.preferred_time?.split(/\s*[–-]\s*/) || [];
    if (timeParts.length !== 2) return { canStart: true, canComplete: true, start: null, end: null, label: null };
    const start = new Date(`${job.booking.preferred_date} ${timeParts[0]}`);
    const end = new Date(`${job.booking.preferred_date} ${timeParts[1]}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { canStart: true, canComplete: true, start: null, end: null, label: null };
    const canStart = currentTime >= new Date(start.getTime() - 30 * 60000) && currentTime < end;
    const canComplete = currentTime >= new Date(end.getTime() - 30 * 60000);
    let label = null;
    if (currentTime < start) {
      const diffMs = start - currentTime;
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.round((diffMs % 3600000) / 60000);
      label = diffHrs > 0 ? `Starts in ${diffHrs}h ${diffMins}m` : `Starts in ${diffMins}m`;
    } else if (currentTime > end) {
      label = "Slot Window Passed";
    }
    return { canStart, canComplete, start, end, label };
  };

  const getSkills = (service) => {
    const s = (service || "").toLowerCase();
    const skills = [];
    if (s.includes("plumb")) skills.push("plumbing");
    if (s.includes("hvac") || s.includes("ac ") || s.includes("furnace") || s.includes("heat") || s.includes("thermostat")) skills.push("hvac");
    if (s.includes("electr")) skills.push("electrical");
    if (skills.length === 0) skills.push("general");
    return skills;
  };

  const getFilteredJobs = () => {
    const jList = jobs || [];

    if (activeTab === "start_work") return jList.filter(j => ["assigned", "claimed"].includes(j.status));
    if (activeTab === "work_progress") return jList.filter(j => j.status === "in_progress");
    if (activeTab === "completed") return jList.filter(j => j.status === "completed" || j.status === "not_completed");
    return [];
  };

  const filteredJobs = getFilteredJobs();

  // ── Analytics data ────────────────────────────────────────────────────────
  const completedJobs = (jobs || []).filter(j => j.status === "completed");
  const inProgressJobs = (jobs || []).filter(j => j.status === "in_progress");
  const pendingJobs = (jobs || []).filter(j => ["assigned", "claimed"].includes(j.status));

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d;
  });
  const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const jobsByDay = last7Days.map(d => ({
    l: dayLabels[d.getDay()],
    v: completedJobs.filter(j => {
      if (!j.booking?.preferred_date) return false;
      try { return new Date(j.booking.preferred_date).toDateString() === d.toDateString(); } catch { return false; }
    }).length,
  }));

  const serviceColors = { hvac: "#6366f1", plumbing: "#0ea5e9", electrical: "#f59e0b", general: "#10b981" };
  const jobsByService = ["hvac", "plumbing", "electrical", "general"].map(s => ({
    l: s.charAt(0).toUpperCase() + s.slice(1),
    v: completedJobs.filter(j => getSkills(j.booking?.service).includes(s)).length,
    color: serviceColors[s],
  }));

  const slotsByDay = last7Days.map(d => ({
    l: dayLabels[d.getDay()],
    v: (mySlots || []).filter(s => s.slot_date === d.toISOString().split("T")[0]).length,
    color: "#6366f1",
  }));

  // ── Auth & data fetching ──────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem("worker_token");
    const w = localStorage.getItem("worker_data");
    if (!t || !w) { router.replace("/login"); return; }
    setToken(t);
    const wObj = JSON.parse(w);
    setWorker(wObj);
    setProfileForm({
      name: wObj.name || "",
      phone: wObj.phone || "",
      email: wObj.email || "",
      specializations: wObj.specializations || []
    });
    // Load preferences from DB
    if (wObj.notif_prefs) setNotifPrefs(wObj.notif_prefs);
    if (wObj.sched_prefs) setSchedPrefs(wObj.sched_prefs);
    if (wObj.privacy_prefs) setPrivacyPrefs(wObj.privacy_prefs);
  }, [router]);

  const fetchSlots = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/workers/slots`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMySlots(Array.isArray(data) ? data : []);
    } catch { }
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token || !worker) return;
    setIsRefreshing(true);
    try {
      const resMy = await fetch(`${API}/api/workers/jobs`, { headers: { Authorization: `Bearer ${token}` } });
      const myData = await resMy.json();
      setJobs(Array.isArray(myData) ? myData : []);
    } catch { } finally { setIsRefreshing(false); }
  }, [token, worker]);

  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (token && worker) {
      fetchData();
      fetchSlots();
      const i = setInterval(fetchData, 10000);
      return () => clearInterval(i);
    }
  }, [token, worker, fetchData, fetchSlots]);

  async function addSlot() {
    if (!slotForm.slot_date || !slotForm.start_time || !slotForm.end_time) { setSlotError("Please fill in all fields."); return; }
    setSlotSaving(true); setSlotError("");
    try {
      const res = await fetch(`${API}/api/workers/slots`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(slotForm),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setSlotError(err.detail || "Failed to add slot."); }
      else { setSlotForm(f => ({ ...f, slot_date: "", start_time: "09:00 AM", end_time: "11:00 AM" })); fetchSlots(); }
    } catch { setSlotError("Network error."); } finally { setSlotSaving(false); }
  }

  async function deleteSlot(slotId) {
    try {
      const res = await fetch(`${API}/api/workers/slots/${slotId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) fetchSlots();
      else { const err = await res.json().catch(() => ({})); alert(err.detail || "Cannot delete slot."); }
    } catch { alert("Network error."); }
  }

  async function updateStatus(assignmentId, status, notes = null) {
    if (!token) return;
    let finalNotes = notes;
    if (status === "completed" && !finalNotes) finalNotes = prompt("Completion notes:") || "";
    try {
      const res = await fetch(`${API}/api/jobs/${assignmentId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, notes: finalNotes }),
      });
      if (res.ok) { fetchData(); if (status === "claimed") setNotification(null); }
      else {
        const errData = await res.json().catch(() => ({}));
        if (errData?.success === false) alert(errData.message || "Operation failed.");
        else if (errData?.detail) alert(typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail));
        else alert("Server error: Status " + res.status);
      }
    } catch { }
  }

  const logout = () => { localStorage.clear(); router.replace("/login"); };

  const saveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...profileForm,
        notif_prefs: notifPrefs,
        sched_prefs: schedPrefs,
        privacy_prefs: privacyPrefs,
      };
      const res = await fetch(`${API}/api/workers/profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setWorker(updated); localStorage.setItem("worker_data", JSON.stringify(updated));
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      }
    } catch { } finally { setSaving(false); }
  };

  const submitTicket = (e) => {
    e.preventDefault();
    setTicketSubmitted(true);
  };

  if (!worker) return null;

  // ── Nav items ─────────────────────────────────────────────────────────────
  const workspaceItems = [
    { id: "my_schedule", label: "My Schedule", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { id: "start_work", label: "Assigned Jobs", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    { id: "work_progress", label: "In Progress", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "completed", label: "Completed", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const getBadge = (id) => {
    if (id === "my_schedule") return (mySlots || []).filter(s => !s.is_booked).length;
    if (id === "start_work") return (jobs || []).filter(j => ["assigned", "claimed"].includes(j.status)).length;
    if (id === "work_progress") return (jobs || []).filter(j => j.status === "in_progress").length;
    if (id === "completed") return (jobs || []).filter(j => j.status === "completed" || j.status === "not_completed").length;
    return 0;
  };


  const toolPages = [
    { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: "help", label: "Help & Support", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const tabTitle = {
    my_schedule: "My Schedule",
    start_work: "Assigned Jobs",
    work_progress: "Active Tasks",
    completed: "Job History",
    settings: "System Settings",
    help: "Help & Support",
    profile: "My Profile",
  };

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="w-72 bg-slate-900 flex flex-col fixed h-full z-50 overflow-y-auto">

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-white shadow-lg shadow-emerald-900/50 shrink-0">C</div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-tight">Custom Repair</h1>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em] leading-none mt-0.5">Worker Hub</p>
          </div>
          <div className="ml-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
        </div>

        {/* Worker badge */}
        <div className="px-4 py-3 mx-4 mt-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-black text-sm shrink-0">
            {worker.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">{worker.name}</p>
            <p className="text-[10px] text-slate-500 font-bold truncate">{worker.email}</p>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5">


          {/* MY WORKSPACE */}
          <div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] px-2 mb-2">My Workspace</p>
            <nav className="space-y-1">
              {workspaceItems.map(item => {
                const count = getBadge(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === item.id ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <LucideIcon d={item.icon} className="w-4 h-4 shrink-0" />
                      {item.label}
                    </div>
                    {count > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${activeTab === item.id ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>


          {/* TOOLS */}
          <div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] px-2 mb-2">Tools</p>
            <nav className="space-y-1">
              {toolPages.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === item.id ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                >
                  <LucideIcon d={item.icon} className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom account bar */}
        <div className="px-4 py-4 border-t border-white/5 space-y-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "profile" ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <LucideIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" className="w-4 h-4 shrink-0" />
            My Profile
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-400 hover:bg-red-900/10 transition-all">
            <LucideIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="w-4 h-4 shrink-0" />
            Log Out
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 ml-72 min-h-screen">

        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">{tabTitle[activeTab] || "Dashboard"}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Auto-refresh</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end">
              <p className="text-sm font-black text-slate-900 tabular-nums">{currentTime.toLocaleTimeString()}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
            <button
              onClick={fetchData} disabled={isRefreshing}
              className={`p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition-all ${isRefreshing ? "animate-spin" : ""}`}
            >
              <LucideIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </button>
          </div>
        </div>

        <div className="p-8 max-w-6xl mx-auto">

          {/* ── KPI bar ── */}
          {(activeTab !== "settings" && activeTab !== "help" && activeTab !== "profile") && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 fade-in">
              <KpiCard label="Assigned" value={pendingJobs.length} icon="M13 10V3L4 14h7v7l9-11h-7z" color="blue" />
              <KpiCard label="In Progress" value={inProgressJobs.length} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="purple" />
              <KpiCard label="Completed" value={completedJobs.length} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="emerald" />
            </div>
          )}


          {/* ── SCHEDULE TAB ── */}
          {activeTab === "my_schedule" && (
            <div className="space-y-8 fade-in">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-widest mb-6">Add Available Slot</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</label>
                    <input type="date" min={new Date().toISOString().split("T")[0]} value={slotForm.slot_date}
                      onChange={e => setSlotForm(f => ({ ...f, slot_date: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Start Time</label>
                    <select value={slotForm.start_time} onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-emerald-500 transition-all">
                      {["06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">End Time</label>
                    <select value={slotForm.end_time} onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-emerald-500 transition-all">
                      {["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {slotError && <p className="text-red-500 text-xs font-black mb-4 bg-red-50 rounded-xl px-4 py-2 border border-red-100">{slotError}</p>}
                <button onClick={addSlot} disabled={slotSaving} className="btn-pro btn-pro-primary px-8 py-3.5 text-sm shadow-lg shadow-emerald-900/20 disabled:opacity-50">
                  {slotSaving ? "Saving..." : "+ Add Slot"}
                </button>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                  Your Slots ({mySlots.length} total · {mySlots.filter(s => s.is_booked).length} booked)
                </p>
                {mySlots.length === 0 ? (
                  <div className="bg-white rounded-2xl p-16 text-center border border-slate-100">
                    <LucideIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                    <p className="font-black text-sm uppercase tracking-widest text-slate-400">No slots yet</p>
                    <p className="text-xs mt-1 text-slate-400">Add your available times above so clients can book you.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mySlots.map(slot => (
                      <div key={slot.id} className={`bg-white rounded-2xl p-5 flex items-center justify-between gap-4 border transition-all hover:shadow-md ${slot.is_booked ? "border-emerald-100 bg-emerald-50/30" : "border-slate-100"}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${slot.is_booked ? "bg-emerald-500" : "bg-slate-100"}`}>
                            <LucideIcon d={slot.is_booked ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"}
                              className={`w-5 h-5 ${slot.is_booked ? "text-white" : "text-slate-500"}`} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm">{slot.slot_date}</p>
                            <p className="text-xs text-slate-400 font-bold">{slot.start_time} – {slot.end_time}</p>
                            {slot.is_booked && slot.booking_service && (
                              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter mt-0.5 truncate max-w-[180px]">{slot.booking_service} ({slot.client_name})</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {slot.is_booked && slot.booking_status && slot.booking_status !== "pending" ? (
                            <span className="badge badge-success text-[10px]">Booked by Client</span>
                          ) : (
                            <>
                              <span className={`badge ${slot.is_booked && slot.booking_status === "pending" ? "badge-info" : "badge-warning"} text-[10px]`}>
                                {slot.is_booked && slot.booking_status === "pending" ? "Reserved" : "Open"}
                              </span>
                              <button onClick={() => deleteSlot(slot.id)} className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                <LucideIcon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── JOB LIST TABS ── */}
          {!["my_schedule", "settings", "help", "profile"].includes(activeTab) && (
            <div className="space-y-4">
              {filteredJobs.map(a => {
                const isMarket = activeTab === "open_market";
                const { canStart, canComplete, label } = calculateJobTimings(a);
                return (
                  <div key={a.id} onClick={() => setSelectedJob(a)}
                    className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg cursor-pointer transition-all group fade-in hover:border-emerald-200">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className={`badge ${STATUS_THEMES[a.status]?.badge || "badge-info"}`}>
                              {STATUS_THEMES[a.status]?.label || a.status}
                            </span>
                            <h3 className="text-lg font-black text-slate-900 mt-2 capitalize group-hover:text-emerald-600 transition-colors">{a.booking?.service}</h3>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {getSkills(a.booking?.service).map(skill => (
                                <span key={skill} className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border"
                                  style={{ backgroundColor: serviceColors[skill] + "15", color: serviceColors[skill], borderColor: serviceColors[skill] + "30" }}>
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-xs font-black text-slate-600 font-mono">#{a.booking?.id?.split("-")[0] || "CR"}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Ticket</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4">
                          {[
                            { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", val: a.booking?.preferred_date || "ASAP", sub: a.booking?.preferred_time || "Flexible" },
                            { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", val: a.booking?.user?.address, sub: isMarket ? "Region (Approx)" : "Location" },
                            { icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", val: a.booking?.user?.name, sub: "Customer" },
                            { icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", val: a.booking?.user?.phone, sub: "Contact" },
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                              <LucideIcon d={item.icon} className="w-4 h-4 text-slate-400 shrink-0" />
                              <div className="leading-tight min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{item.val}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{item.sub}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {a.booking?.notes && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Directives</p>
                            <p className="text-xs font-medium text-slate-600 italic">"{a.booking.notes}"</p>
                          </div>
                        )}
                      </div>

                      <div className="md:w-[190px] flex flex-col justify-end gap-2.5 pt-4 md:pt-0 md:border-l md:pl-6 border-slate-100 shrink-0">
                        {(a.status === "claimed" || a.status === "assigned") && (
                          <div className="space-y-2">
                            {(() => {
                              const { canStart, label: timeLabel } = calculateJobTimings(a);
                              return (
                                <>
                                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl py-3 px-2 text-center mb-1">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Auto Allotted</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{timeLabel || "Direct Assignment"}</p>
                                  </div>

                                  <button
                                    onClick={e => { e.stopPropagation(); updateStatus(a.id, "in_progress"); }}
                                    disabled={!canStart}
                                    className="btn-pro btn-pro-primary w-full shadow-lg shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:!bg-slate-300 disabled:!shadow-none disabled:!border-slate-200">
                                    {canStart ? "Start Work Now" : "Waiting for Slot"}
                                  </button>

                                  {(() => {
                                    try {
                                      if (!a.booking?.preferred_time) return null;
                                      const startTimePart = a.booking.preferred_time.split(/\s*[–-]\s*/)[0].trim();
                                      const startDt = new Date(`${a.booking.preferred_date} ${startTimePart}`);
                                      if (!canStart && new Date() < new Date(startDt.getTime() - 24 * 60 * 60 * 1000)) {
                                        return (
                                          <button onClick={e => { e.stopPropagation(); updateStatus(a.id, "rejected"); }}
                                            className="w-full py-2.5 rounded-xl border-2 border-red-50 text-red-400 font-bold hover:bg-red-50 transition-all text-[10px] uppercase tracking-widest">
                                            Cancel Allotment
                                          </button>
                                        );
                                      }
                                    } catch (e) { }
                                    return null;
                                  })()}
                                </>
                              );
                            })()}
                          </div>
                        )}
                        {a.status === "in_progress" && (
                          <div>
                            {!canComplete && <p className="text-[9px] font-bold text-slate-400 text-center mb-1 uppercase">Early Finish Locked</p>}
                            <button onClick={e => { e.stopPropagation(); updateStatus(a.id, "completed"); }} disabled={!canComplete} className="btn-pro btn-pro-primary w-full !bg-sky-600 hover:!bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:!bg-slate-300">Finish Work</button>
                          </div>
                        )}
                        {a.status === "completed" && <div className="text-center text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-50 py-2 rounded-xl border border-emerald-100">Closed Ticket</div>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredJobs.length === 0 && !isRefreshing && (
                <div className="bg-white rounded-2xl p-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200">
                  <LucideIcon d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" className="w-14 h-14 text-slate-200 mb-5" />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Workspace is Clear</p>
                  <button onClick={() => setShowDebug(!showDebug)} className="mt-4 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                    <LucideIcon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" className="w-3 h-3" />
                    Troubleshoot Visibility
                  </button>
                  {showDebug && (
                    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 text-left rounded-2xl w-full max-w-md font-mono text-[10px] text-slate-600">
                      <p className="font-bold border-b border-slate-200 pb-2 mb-2 uppercase tracking-widest">Diagnostic</p>
                      <p><span className="text-slate-400">Account:</span> {worker?.email}</p>
                      <p><span className="text-slate-400">Worker ID:</span> {worker?.id}</p>
                      <p><span className="text-slate-400">Trades:</span> {JSON.stringify(worker?.specializations)}</p>

                      <p><span className="text-slate-400">Tab:</span> {activeTab}</p>
                      <p className="mt-3 text-[9px] text-slate-400 font-sans italic leading-relaxed">Jobs only appear if they match your Trades and available Slots. Check "My Schedule" to add open slots.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && profileForm && (
            <div className="space-y-8 fade-in max-w-4xl">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 mb-4">Identity & Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                          <input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-500 transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                          <input type="tel" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-500 transition-all" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 mb-4">Trade Specializations</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[{ v: "hvac", l: "HVAC" }, { v: "plumbing", l: "Plumbing" }, { v: "electrical", l: "Electrical" }, { v: "general", l: "General" }].map(s => {
                          const isSel = profileForm.specializations.includes(s.v);
                          return (
                            <button key={s.v} type="button" onClick={() => { const cur = profileForm.specializations; setProfileForm(p => ({ ...p, specializations: isSel ? cur.filter(v => v !== s.v) : [...cur, s.v] })); }} className={`px-4 py-4 rounded-2xl text-xs font-black border-2 transition-all flex flex-col items-center gap-2 ${isSel ? `bg-emerald-50 text-emerald-600 border-emerald-500` : "bg-white text-slate-400 border-slate-50 hover:border-slate-200"}`}>
                              <div className={`w-2 h-2 rounded-full ${isSel ? "bg-emerald-500" : "bg-slate-200"}`} />{s.l}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-50">
                      <button onClick={saveSettings} disabled={saving || profileForm.specializations.length === 0} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 transition-all text-sm uppercase tracking-widest">
                        {saving ? "Updating Profile..." : "Update Profile"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl" />
                    <div className="relative z-10 text-center">
                      <div className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-3xl mx-auto mb-4 shadow-xl border-4 border-white/10">
                        {worker.name?.charAt(0)}
                      </div>
                      <h4 className="text-xl font-black">{worker.name}</h4>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-1">Verified Technician</p>
                      <div className="mt-6 pt-6 border-t border-white/5 space-y-4 text-left">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-slate-500 uppercase">Worker ID</p>
                          <p className="text-xs font-mono font-bold text-slate-300">#{worker.id?.split("-")[0]}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-slate-500 uppercase">Join Date</p>
                          <p className="text-xs font-bold text-slate-300">April 2024</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                    <div className="flex items-center gap-3 mb-3">
                      <LucideIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="text-emerald-500 w-5 h-5" />
                      <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Active Status</p>
                    </div>
                    <p className="text-xs text-emerald-700 font-medium leading-relaxed">Your profile is visible to dispatch and you are eligible for multi-trade leads.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === "settings" && (
            <div className="flex bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden fade-in min-h-[600px]">
              {/* Settings nav */}
              <div className="w-64 bg-slate-50 border-r border-slate-100 pt-8 px-4 flex flex-col gap-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] px-3 mb-2">Categories</p>
                {SETTINGS_SECTIONS.map(s => (
                  <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left ${activeSection === s.id ? "bg-white text-emerald-700 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                      } ${s.id === "danger" ? "text-red-500 hover:text-red-600 mt-auto mb-4" : ""}`}>
                    <LucideIcon d={s.icon} className={`w-4 h-4 shrink-0 ${activeSection === s.id ? "text-emerald-600" : s.id === "danger" ? "text-red-400" : "text-slate-400"}`} />
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Settings content */}
              <div className="flex-1 p-10 overflow-y-auto">
                {settingsSaved && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                    <LucideIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 text-emerald-500" />
                    <p className="text-sm font-black text-emerald-700">Changes saved successfully!</p>
                  </div>
                )}


                {activeSection === "notifications" && (
                  <div className="space-y-6">
                    <div><h2 className="text-xl font-black text-slate-900">Notifications</h2><p className="text-xs text-slate-400 mt-1 font-bold">Control which alerts you receive.</p></div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Job Alerts</p>
                      <Toggle value={notifPrefs.newLead} onChange={v => setNotifPrefs(p => ({ ...p, newLead: v }))} label="New Lead Available" sub="Get notified when a job in your area opens up" />
                      <Toggle value={notifPrefs.jobAssigned} onChange={v => setNotifPrefs(p => ({ ...p, jobAssigned: v }))} label="Direct Job Assignment" sub="Admin directly assigns you a job" />
                      <Toggle value={notifPrefs.scheduleReminder} onChange={v => setNotifPrefs(p => ({ ...p, scheduleReminder: v }))} label="Schedule Reminders" sub="Alerts for upcoming work slots" />
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">System</p>
                      <Toggle value={notifPrefs.systemUpdates} onChange={v => setNotifPrefs(p => ({ ...p, systemUpdates: v }))} label="System Updates" sub="Important changes to the worker platform" />
                    </div>
                  </div>
                )}

                {activeSection === "schedule_prefs" && (
                  <div className="space-y-6">
                    <div><h2 className="text-xl font-black text-slate-900">Schedule Preferences</h2><p className="text-xs text-slate-400 mt-1 font-bold">Customize how your availability is managed.</p></div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Workflow</p>
                      <Toggle value={schedPrefs.autoAccept} onChange={v => setSchedPrefs(p => ({ ...p, autoAccept: v }))} label="Auto-Accept Leads" sub="Automatically claim leads that match your trades" />
                      <Toggle value={schedPrefs.bufferBetweenJobs} onChange={v => setSchedPrefs(p => ({ ...p, bufferBetweenJobs: v }))} label="Travel Buffer" sub="Add 30 mins between back-to-back jobs" />
                      <Toggle value={schedPrefs.weekendsAvailable} onChange={v => setSchedPrefs(p => ({ ...p, weekendsAvailable: v }))} label="Weekend Availability" sub="Allow dispatch to see you on weekends" />
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Workload</p>
                      <div className="flex items-center justify-between py-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">Max Jobs Per Day</p>
                          <p className="text-xs text-slate-400 mt-0.5">Limit your daily assignment volume</p>
                        </div>
                        <select value={schedPrefs.maxJobsPerDay} onChange={e => setSchedPrefs(p => ({ ...p, maxJobsPerDay: e.target.value }))} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-emerald-400">
                          {["1", "2", "3", "4", "5", "Unlimited"].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "privacy" && (
                  <div className="space-y-6">
                    <div><h2 className="text-xl font-black text-slate-900">Privacy & Security</h2><p className="text-xs text-slate-400 mt-1 font-bold">Manage your data visibility and account security.</p></div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Visibility</p>
                      <Toggle value={privacyPrefs.showPhone} onChange={v => setPrivacyPrefs(p => ({ ...p, showPhone: v }))} label="Show Phone to Customers" sub="Clients can see your number before job starts" />
                      <Toggle value={privacyPrefs.locationSharing} onChange={v => setPrivacyPrefs(p => ({ ...p, locationSharing: v }))} label="Real-time Tracking" sub="Share location with dispatch while on duty" />
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Security</p>
                      <Toggle value={privacyPrefs.twoFactor} onChange={v => setPrivacyPrefs(p => ({ ...p, twoFactor: v }))} label="Two-Factor Authentication" sub="Require code on login for extra security" />
                      <div className="pt-4 border-t border-slate-200/50">
                        <button className="text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Change Password</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "appearance" && (
                  <div className="space-y-6">
                    <div><h2 className="text-xl font-black text-slate-900">Appearance</h2><p className="text-xs text-slate-400 mt-1 font-bold">Customize how the worker portal looks.</p></div>
                    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-slate-200 flex items-center justify-center mx-auto mb-4">
                        <LucideIcon d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-sm font-black text-slate-900">Dark Mode is coming soon!</p>
                      <p className="text-xs text-slate-400 mt-1 font-bold">We're working on a beautiful dark theme for late-night shifts.</p>
                    </div>
                  </div>
                )}

                {activeSection === "danger" && (
                  <div className="space-y-6">
                    <div><h2 className="text-xl font-black text-red-600">Danger Zone</h2><p className="text-xs text-slate-400 mt-1 font-bold">Irreversible actions for your worker account.</p></div>
                    <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                      <div className="flex items-center justify-between py-4 border-b border-red-100">
                        <div>
                          <p className="text-sm font-bold text-red-900">Reset Local Cache</p>
                          <p className="text-xs text-red-400 mt-0.5">Clears saved preferences and logout</p>
                        </div>
                        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Reset</button>
                      </div>
                      <div className="flex items-center justify-between py-4">
                        <div>
                          <p className="text-sm font-bold text-red-900">Deactivate Account</p>
                          <p className="text-xs text-red-400 mt-0.5">Mark your profile as inactive to dispatch</p>
                        </div>
                        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/20">Deactivate</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unified Save Button */}
                {activeSection !== "appearance" && activeSection !== "danger" && (
                  <div className="mt-10 pt-10 border-t border-slate-100">
                    <button
                      onClick={saveSettings}
                      disabled={saving || (profileForm && profileForm.specializations.length === 0)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 transition-all text-sm uppercase tracking-widest disabled:opacity-50">
                      {saving ? "Saving Changes..." : "Save All Settings"}
                    </button>
                    <p className="text-[10px] text-center text-slate-400 font-bold mt-4 uppercase tracking-widest">Settings are synced to your secure cloud profile</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── HELP TAB ── */}
          {activeTab === "help" && (
            <div className="space-y-8 fade-in pb-20">
              {/* Hero */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px]" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="text-center md:text-left">
                    <h3 className="text-3xl font-black mb-3">How can we help?</h3>
                    <p className="text-slate-400 text-sm max-w-sm">Search our knowledge base or submit a ticket to our 24/7 support team.</p>
                  </div>
                  <div className="w-full max-w-md relative">
                    <LucideIcon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="w-5 h-5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search FAQ..." value={helpSearch} onChange={e => setHelpSearch(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-6 py-4 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Frequently Asked Questions</p>
                  <div className="space-y-3">
                    {FAQ.filter(f => f.q.toLowerCase().includes(helpSearch.toLowerCase()) || f.a.toLowerCase().includes(helpSearch.toLowerCase())).map((f, i) => (
                      <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-8 py-5 text-left gap-4">
                          <p className="text-sm font-black text-slate-900">{f.q}</p>
                          <LucideIcon d={openFaq === i ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} className="w-4 h-4 text-slate-400" />
                        </button>
                        {openFaq === i && <div className="px-8 pb-6 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-50 pt-4">{f.a}</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl">
                    <h4 className="text-lg font-black text-slate-900 mb-1">Submit Ticket</h4>
                    <p className="text-xs text-slate-400 mb-6 font-bold tracking-tight">Direct line to operations team.</p>
                    {ticketSubmitted ? (
                      <div className="text-center py-10 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <LucideIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <p className="text-sm font-black text-emerald-700">Ticket Sent!</p>
                        <button onClick={() => setTicketSubmitted(false)} className="mt-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Send another</button>
                      </div>
                    ) : (
                      <form onSubmit={submitTicket} className="space-y-4">
                        <input required placeholder="Subject" value={helpTicket.subject} onChange={e => setHelpTicket(p => ({ ...p, subject: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-emerald-500 transition-all" />
                        <textarea required rows="4" placeholder="How can we help?" value={helpTicket.desc} onChange={e => setHelpTicket(p => ({ ...p, desc: e.target.value }))} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-emerald-500 transition-all resize-none" />
                        <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/10 transition-all text-[10px] uppercase tracking-widest">Send Ticket</button>
                      </form>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Guides</p>
                    {GUIDES.map(g => (
                      <button key={g.title} className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 hover:shadow-lg transition-all group">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-110 transition-transform`}><LucideIcon d={g.icon} className="w-5 h-5" /></div>
                        <p className="text-xs font-black text-slate-900 text-left">{g.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Notification overlay ─────────────────────────────────────────── */}
      {notification && (
        <div className="fixed top-20 right-6 z-[100] animate-bounce-in max-w-sm w-full">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -mr-16 -mt-16 ${notification.type === "assignment" ? "bg-blue-500" : "bg-emerald-500"}`} />
            <div className="flex items-start gap-4 relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notification.type === "assignment" ? "bg-blue-600" : "bg-emerald-600"}`}>
                <LucideIcon d={notification.type === "assignment" ? "M16 7a4 4 0 11-8 0 4 4 0 018 0z" : "M13 10V3L4 14h7v7l9-11h-7z"} className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${notification.type === "assignment" ? "text-blue-400" : "text-emerald-400"}`}>{notification.title}</p>
                <p className="text-sm font-bold leading-tight mb-4">{notification.msg}</p>
                <div className="flex items-center gap-2">
                  {["assignment", "lead"].includes(notification.type) ? (
                    <>
                      <button onClick={() => { setSelectedJob(notification.fullData); setNotification(null); }} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-widest ${notification.type === "assignment" ? "bg-blue-600 hover:bg-blue-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
                        View Details
                      </button>
                      <button onClick={() => { updateStatus(notification.id, "rejected"); setNotification(null); }}
                        className="px-3 py-2.5 rounded-xl text-xs font-black text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setNotification(null)} className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 transition-all">Got it</button>
                  )}
                </div>
              </div>
              {notification.type === "lead" && <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/30 w-full"><div className="h-full bg-emerald-500 animate-progress-shrink" /></div>}
            </div>
          </div>
        </div>
      )}

          {/* ── Job Detail Modal ─────────────────────────────────────────────── */}
          {selectedJob && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedJob(null)}>
              <div className="bg-white w-full max-w-2xl rounded-[36px] shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900 p-8 text-white flex justify-between items-start relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px]" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`badge ${STATUS_THEMES[selectedJob.status]?.badge || "badge-info"} !bg-white/10 !text-white border-white/20`}>{STATUS_THEMES[selectedJob.status]?.label || selectedJob.status}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">#{selectedJob.booking?.id?.split("-")[0]}</span>
                    </div>
                    <h2 className="text-3xl font-black capitalize leading-none">{selectedJob.booking?.service}</h2>
                    <p className="text-slate-400 font-bold mt-3 text-sm flex items-center gap-2">
                      <LucideIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" className="w-4 h-4" />
                      {selectedJob.booking?.preferred_date} · {selectedJob.booking?.preferred_time}
                    </p>
                  </div>
                  <button onClick={() => setSelectedJob(null)} className="relative z-10 p-2.5 hover:bg-white/10 rounded-2xl transition-all">
                    <LucideIcon d="M6 18L18 6M6 6l12 12" className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer</p>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-xl">{selectedJob.booking?.user?.name?.charAt(0)}</div>
                        <div>
                          <p className="text-lg font-black text-slate-900">{selectedJob.booking?.user?.name}</p>
                          <p className="text-sm font-bold text-emerald-600 mt-0.5">{selectedJob.booking?.user?.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Service Location</p>
                      <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                        <LucideIcon d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{selectedJob.booking?.user?.address || "Not specified"}</p>
                      </div>
                    </div>
                  </div>

                  {selectedJob.booking?.notes && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Job Directives</p>
                      <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <p className="text-sm font-medium text-slate-700 italic">"{selectedJob.booking.notes}"</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    {(() => {
                      const { canStart, canComplete, label } = calculateJobTimings(selectedJob);

                      // Calculate if cancellation is allowed (Strict 24h Deadline)
                      let canCancel = true;
                      if (selectedJob.booking?.preferred_time) {
                        try {
                          const startTimePart = selectedJob.booking.preferred_time.split(/\s*[–-]\s*/)[0].trim();
                          const startDt = new Date(`${selectedJob.booking.preferred_date} ${startTimePart}`);
                          const deadlineDt = new Date(startDt.getTime() - 24 * 60 * 60 * 1000);
                          if (new Date() >= deadlineDt) canCancel = false;
                        } catch (e) { }
                      }

                      if (selectedJob.status === "pending")
                        return <button onClick={e => { e.stopPropagation(); updateStatus(selectedJob.id, "claimed"); setSelectedJob(null); }} className="btn-pro btn-pro-primary w-full !py-4 text-base shadow-xl shadow-emerald-900/10">Claim This Job</button>;

                      if (selectedJob.status === "claimed")
                        return (
                          <div className="space-y-4">
                            <button onClick={e => { e.stopPropagation(); updateStatus(selectedJob.id, "in_progress"); setSelectedJob(null); }} disabled={!canStart} className="btn-pro btn-pro-primary w-full !py-4 text-base shadow-xl shadow-emerald-900/10 disabled:opacity-50">Confirm Arrival & Start Work</button>
                            {canCancel && (
                              <button onClick={e => { e.stopPropagation(); updateStatus(selectedJob.id, "rejected"); setSelectedJob(null); }} className="w-full py-4 rounded-2xl border-2 border-red-50 text-red-500 font-black hover:bg-red-50 transition-all text-sm">Cancel Allotment</button>
                            )}
                            {!canCancel && <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 py-3 rounded-2xl border border-slate-100">🚫 Cancellation Locked (Under 24h left)</p>}
                            <button onClick={e => { e.stopPropagation(); updateStatus(selectedJob.id, "not_completed"); setSelectedJob(null); }} className="w-full py-2 text-[10px] font-black text-slate-400 hover:text-red-400 transition-colors uppercase tracking-widest">Mark as Could Not Complete</button>
                          </div>
                        );
                      if (selectedJob.status === "in_progress")
                        return (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              {!canComplete && <p className="text-center text-xs font-bold text-slate-400 uppercase">Wait until near end of slot</p>}
                              <button onClick={e => { e.stopPropagation(); updateStatus(selectedJob.id, "completed"); setSelectedJob(null); }} disabled={!canComplete} className="btn-pro btn-pro-primary w-full !bg-sky-600 hover:!bg-sky-700 !py-4 text-base disabled:opacity-40">Mark as Successfully Completed</button>
                            </div>
                            <button onClick={e => { e.stopPropagation(); updateStatus(selectedJob.id, "not_completed"); setSelectedJob(null); }} className="w-full py-2 text-[10px] font-black text-slate-400 hover:text-red-400 transition-colors uppercase tracking-widest">Job Not Completed</button>
                          </div>
                        );
                      return <div className="text-center py-3 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-emerald-600 font-black uppercase tracking-widest text-xs">Service Ticket Finalized</p></div>;
                    })()}
                    <button onClick={() => setSelectedJob(null)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors py-2">Dismiss Details</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <style jsx global>{`
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slide-up { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes bounce-in { 0% { transform: scale(0.8) translateY(-10px); opacity: 0 } 70% { transform: scale(1.03) } 100% { transform: scale(1) translateY(0); opacity: 1 } }
        @keyframes progress-shrink { from { width: 100% } to { width: 0% } }
        .fade-in { animation: fade-in 0.3s ease-out }
        .animate-fade-in { animation: fade-in 0.25s ease-out }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16,1,0.3,1) }
        .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.16,1,0.3,1) }
        .animate-progress-shrink { animation: progress-shrink 15s linear forwards }
        .custom-scrollbar::-webkit-scrollbar { width: 5px }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1 }
      `}</style>
        </div>
      );
}
