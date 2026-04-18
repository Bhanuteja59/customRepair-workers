"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const WS  = process.env.NEXT_PUBLIC_WS_URL  ?? "ws://localhost:8000";

const STATUS_THEMES = {
  open:        { label: "OPEN MARKET",      badge: "badge-warning", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  pending:     { label: "OPEN MARKET",      badge: "badge-warning", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  assigned:    { label: "New Job for You!", badge: "badge-info",    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0z" },
  claimed:     { label: "Ready to Start",   badge: "badge-success", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  in_progress: { label: "Working Now",      badge: "badge-success", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  completed:   { label: "Done!",            badge: "badge-info",    icon: "M5 13l4 4L19 7" },
  expired:     { label: "Missed Slot",      badge: "badge-warning", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
};

function LucideIcon({ d, className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

// ── Chart Components ──────────────────────────────────────────────────────────

function LineChart({ data, color = "#10b981", id = "lc" }) {
  const W = 300, H = 110, pl = 32, pr = 12, pt = 8, pb = 28;
  const cW = W - pl - pr, cH = H - pt - pb;
  const max = Math.max(...data.map(d => d.v), 1);
  const px = i => pl + (i / Math.max(data.length - 1, 1)) * cW;
  const py = v => pt + cH - (v / max) * cH;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d.v).toFixed(1)}`).join(" ");
  const area = `M ${px(0).toFixed(1)} ${(pt + cH).toFixed(1)} ${data.map((d, i) => `L ${px(i).toFixed(1)} ${py(d.v).toFixed(1)}`).join(" ")} L ${px(data.length - 1).toFixed(1)} ${(pt + cH).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 110 }}>
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={pl} x2={W - pr} y1={pt + cH * (1 - f)} y2={pt + cH * (1 - f)} stroke="#f1f5f9" strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#grad-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(d.v)} r="4" fill={color} stroke="white" strokeWidth="2" />
          <text x={px(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="sans-serif">{d.l}</text>
          {d.v > 0 && <text x={px(i)} y={py(d.v) - 8} textAnchor="middle" fontSize="8" fill={color} fontWeight="700">{d.v}</text>}
        </g>
      ))}
    </svg>
  );
}

function DonutChart({ value, total, color = "#10b981", trackColor = "#f1f5f9" }) {
  const r = 34, cx = 45, cy = 45, circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth="9" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1)" }} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="16" fontWeight="900" fill="#0f172a">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function MiniBar({ data }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="flex items-end gap-2 h-24 w-full px-1">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <span className="text-[9px] font-black text-slate-500 leading-none">{d.v || ""}</span>
          <div className="w-full rounded-t-lg" style={{
            height: `${Math.max((d.v / max) * 60, d.v > 0 ? 4 : 0)}px`,
            backgroundColor: d.color || "#10b981",
            transition: `height 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 70}ms`,
          }} />
          <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center leading-none">{d.l}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, icon, color = "emerald", sub }) {
  const c = {
    emerald: "from-emerald-500 to-emerald-600",
    blue:    "from-blue-500 to-blue-600",
    amber:   "from-amber-500 to-amber-600",
    purple:  "from-purple-500 to-purple-600",
    sky:     "from-sky-500 to-sky-600",
    rose:    "from-rose-500 to-rose-600",
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
  const [availableJobs, setAvailableJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [mySlots, setMySlots] = useState([]);
  const [slotForm, setSlotForm] = useState({ slot_date: "", start_time: "09:00 AM", end_time: "11:00 AM" });
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [wsStatus, setWsStatus] = useState("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const wsRef = useRef(null);

  const calculateJobTimings = (job) => {
    if (!job?.booking?.preferred_date) return { canStart: true, canComplete: true, start: null, end: null, label: null };
    const timeParts = job.booking.preferred_time?.split(/\s*[-\u2013]\s*/) || [];
    if (timeParts.length !== 2) return { canStart: true, canComplete: true, start: null, end: null, label: null };
    const start = new Date(`${job.booking.preferred_date} ${timeParts[0]}`);
    const end   = new Date(`${job.booking.preferred_date} ${timeParts[1]}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { canStart: true, canComplete: true, start: null, end: null, label: null };
    const canStart    = currentTime >= start && currentTime < end;
    const canComplete = currentTime >= new Date(end.getTime() - 30 * 60000);
    let label = null;
    if (currentTime < start) {
      const diffMs = start - currentTime;
      const diffHrs  = Math.floor(diffMs / 3600000);
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
    const isExpired = (a) => { const { end } = calculateJobTimings(a); return end ? currentTime > end : false; };
    if (activeTab === "open_market")   return availableJobs;
    if (activeTab === "start_work")    return jobs.filter(j => ["assigned","claimed"].includes(j.status) && !isExpired(j));
    if (activeTab === "work_progress") return jobs.filter(j => j.status === "in_progress");
    if (activeTab === "completed")     return jobs.filter(j => j.status === "completed");
    return [];
  };

  const filteredJobs = getFilteredJobs();

  // ── Analytics data ────────────────────────────────────────────────────────
  const completedJobs  = jobs.filter(j => j.status === "completed");
  const inProgressJobs = jobs.filter(j => j.status === "in_progress");
  const pendingJobs    = jobs.filter(j => ["assigned","claimed"].includes(j.status));

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d;
  });
  const dayLabels = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const jobsByDay = last7Days.map(d => ({
    l: dayLabels[d.getDay()],
    v: completedJobs.filter(j => {
      if (!j.booking?.preferred_date) return false;
      return new Date(j.booking.preferred_date).toDateString() === d.toDateString();
    }).length,
  }));

  const serviceColors = { hvac: "#6366f1", plumbing: "#0ea5e9", electrical: "#f59e0b", general: "#10b981" };
  const jobsByService = ["hvac","plumbing","electrical","general"].map(s => ({
    l: s.charAt(0).toUpperCase() + s.slice(1),
    v: completedJobs.filter(j => getSkills(j.booking?.service).includes(s)).length,
    color: serviceColors[s],
  }));

  const slotsByDay = last7Days.map(d => ({
    l: dayLabels[d.getDay()],
    v: mySlots.filter(s => s.slot_date === d.toISOString().split("T")[0]).length,
    color: "#6366f1",
  }));

  // ── Auth & data fetching ──────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem("worker_token");
    const w = localStorage.getItem("worker_data");
    if (!t || !w) { router.replace("/login"); return; }
    setToken(t); setWorker(JSON.parse(w));
  }, [router]);

  const fetchSlots = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/workers/slots`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMySlots(Array.isArray(data) ? data : []);
    } catch {}
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token || !worker) return;
    setIsRefreshing(true);
    try {
      const [resMy, resAll] = await Promise.all([
        fetch(`${API}/api/workers/jobs`,         { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/workers/pending-jobs`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const myData  = await resMy.json();
      const allData = await resAll.json();
      setJobs(Array.isArray(myData)  ? myData  : []);
      setAvailableJobs(Array.isArray(allData) ? allData : []);
    } catch {} finally { setIsRefreshing(false); }
  }, [token, worker]);

  const connectWs = useCallback((t, wid) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");
    const ws = new WebSocket(`${WS}/ws/worker/${wid}?token=${t}`);
    wsRef.current = ws;
    ws.onopen = () => setWsStatus("online");
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "new_assignment") {
          setNotification({ type: "assignment", id: data.assignment.id, title: "Direct Assignment!", msg: `Admin assigned you: ${data.assignment.booking?.service}`, data: data.assignment });
        } else if (data.type === "new_lead" || data.type === "new_booking") {
          const booking = data.booking || data.assignment?.booking;
          setNotification({ type: "lead", id: data.assignment_id || data.assignment?.id, title: "New Local Lead!", msg: `New ${booking?.service} request in ${booking?.user?.address?.split(",")[0]}`, data });
          setTimeout(() => setNotification(prev => prev?.id === (data.assignment_id || data.assignment?.id) ? null : prev), 15000);
        } else if (data.type === "job_status_update") {
          if (data.worker_id !== wid) {
            setAvailableJobs(prev => prev.filter(job => job.id !== data.assignment_id));
            setNotification(prev => prev?.id === data.assignment_id ? null : prev);
          }
        }
      } catch {}
      fetchData();
    };
    ws.onclose = () => { setWsStatus("offline"); setTimeout(() => connectWs(t, wid), 3000); };
  }, [fetchData]);

  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (token && worker) { fetchData(); fetchSlots(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); } }, [token, worker, fetchData, fetchSlots]);
  useEffect(() => { if (token && worker) connectWs(token, worker.id); return () => wsRef.current?.close(); }, [token, worker, connectWs]);

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
        const errData = await res.json().catch(() => null);
        if (errData?.success === false) alert(errData.message);
        else if (errData?.detail) alert(errData.detail);
      }
    } catch {}
  }

  async function updateProfile(e) {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`${API}/api/workers/profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setWorker(updated); localStorage.setItem("worker_data", JSON.stringify(updated));
        setNotification({ type: "success", title: "Profile Updated", msg: "Your skills and info have been saved." });
        setActiveTab("start_work");
      }
    } catch {}
  }

  const logout = () => { localStorage.clear(); router.replace("/login"); };

  if (!worker) return null;

  // ── Nav items ─────────────────────────────────────────────────────────────
  const workspaceItems = [
    { id: "my_schedule",   label: "My Schedule",   icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { id: "start_work",    label: "Start Work",    icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    { id: "work_progress", label: "In Progress",   icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "completed",     label: "Completed",     icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "analytics",     label: "Analytics",     icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  ];

  const getBadge = (id) => {
    if (id === "my_schedule")   return mySlots.filter(s => !s.is_booked).length;
    if (id === "start_work")    return pendingJobs.filter(j => { const { end } = calculateJobTimings(j); return !end || currentTime <= end; }).length;
    if (id === "work_progress") return inProgressJobs.length;
    if (id === "completed")     return completedJobs.length;
    return 0;
  };

  const insightsPages = [
    { label: "Performance",  icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6", href: "/analytics" },
    { label: "My Earnings",  icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "/earnings" },
  ];

  const toolPages = [
    { label: "Messages",  icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", href: "/messages" },
    { label: "Settings",  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", href: "/settings" },
    { label: "Help & Support", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "/help" },
  ];

  const tabTitle = {
    open_market: "Job Market", my_schedule: "My Schedule", start_work: "Assigned Jobs",
    work_progress: "Active Tasks", completed: "Job History", analytics: "Performance Analytics",
    profile: "My Settings",
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
            <div className={`w-2 h-2 rounded-full ${wsStatus === "online" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-slate-600"}`} />
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

          {/* LIVE DISPATCH */}
          <div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] px-2 mb-2">Live Dispatch</p>
            <button
              onClick={() => setActiveTab("open_market")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "open_market" ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <LucideIcon d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                Open Market
              </div>
              {availableJobs.length > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${activeTab === "open_market" ? "bg-white/20 text-white" : "bg-emerald-600/20 text-emerald-400"}`}>
                  {availableJobs.length}
                </span>
              )}
            </button>
          </div>

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
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === item.id ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"
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

          {/* INSIGHTS */}
          <div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] px-2 mb-2">Insights</p>
            <nav className="space-y-1">
              {insightsPages.map(item => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <LucideIcon d={item.icon} className="w-4 h-4 shrink-0" />
                  {item.label}
                  <LucideIcon d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" className="w-3 h-3 ml-auto opacity-40" />
                </button>
              ))}
            </nav>
          </div>

          {/* TOOLS */}
          <div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em] px-2 mb-2">Tools</p>
            <nav className="space-y-1">
              {toolPages.map(item => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
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
            onClick={() => { setProfileForm({ name: worker.name, phone: worker.phone, specializations: worker.specializations || [] }); setActiveTab("profile"); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === "profile" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
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
              <span className={`inline-flex h-1.5 w-1.5 rounded-full ${wsStatus === "online" ? "bg-emerald-400" : "bg-slate-300"}`} />
              <span className={`inline-flex h-1.5 w-1.5 rounded-full animate-ping absolute ${wsStatus === "online" ? "bg-emerald-400" : "bg-transparent"}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{wsStatus} real-time sync</span>
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

          {/* ── KPI bar (always visible except profile) ── */}
          {activeTab !== "profile" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 fade-in">
              <KpiCard label="Open Market"  value={availableJobs.length}  icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" color="amber" />
              <KpiCard label="Assigned"     value={pendingJobs.length}   icon="M13 10V3L4 14h7v7l9-11h-7z"  color="blue" />
              <KpiCard label="In Progress"  value={inProgressJobs.length} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" color="purple" />
              <KpiCard label="Completed"    value={completedJobs.length}  icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="emerald" />
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="fade-in">
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900">My Settings</h3>
                <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-widest">Technician Identity & Skills</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="card-pro p-8 bg-white border-none shadow-xl">
                  <form onSubmit={updateProfile} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Professional Trades</label>
                      <div className="flex flex-wrap gap-2">
                        {[{ value: "hvac", label: "HVAC" }, { value: "plumbing", label: "Plumbing" }, { value: "electrical", label: "Electrical" }, { value: "general", label: "General" }].map(s => {
                          const isSel = profileForm?.specializations.includes(s.value);
                          return (
                            <button key={s.value} type="button"
                              onClick={() => { const cur = profileForm.specializations; setProfileForm(p => ({ ...p, specializations: isSel ? cur.filter(v => v !== s.value) : [...cur, s.value] })); }}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${isSel ? "bg-emerald-600 text-white border-emerald-600 shadow-lg" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-emerald-400 hover:text-emerald-600"}`}
                            >{s.label}</button>
                          );
                        })}
                      </div>
                      {profileForm?.specializations.length === 0 && <p className="text-[10px] text-red-400 mt-2 font-bold">Select at least one trade.</p>}
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Technician Name</label>
                        <input type="text" value={profileForm?.name || ""} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className="input-pro !bg-slate-50 border-transparent focus:!bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">On-Site Phone</label>
                        <input type="tel" value={profileForm?.phone || ""} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} className="input-pro !bg-slate-50 border-transparent focus:!bg-white" />
                      </div>
                    </div>
                    <button type="submit" disabled={profileForm?.specializations.length === 0} className="w-full btn-pro btn-pro-primary !py-4 shadow-xl shadow-emerald-900/20 disabled:grayscale disabled:opacity-50">Apply Profile Changes</button>
                  </form>
                </div>
                <div className="space-y-6">
                  <div className="card-pro p-8 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 blur-3xl" />
                    <h3 className="text-lg font-black mb-1 relative z-10">Fleet Security</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6 relative z-10">Verification Status</p>
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div>
                          <p className="text-xs font-black uppercase text-emerald-400">Live & Authenticated</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">Worker ID: {worker.id}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 opacity-60">
                        <div>
                          <p className="text-xs font-black uppercase text-slate-300">Background Status</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">Cleared</p>
                        </div>
                        <LucideIcon d="M9 12l2 2 4-4" className="text-emerald-400 w-5 h-5" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <LucideIcon d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Dispatcher Note</p>
                      <p className="text-xs text-amber-700 font-medium italic">"Adding more skills reveals complex multi-trade leads in your area. Keep your profile sharp!"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === "analytics" && (
            <div className="space-y-6 fade-in">
              {/* Chart row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Jobs Completed</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Last 7 days</p>
                    </div>
                    <span className="text-2xl font-black text-emerald-600">{completedJobs.length}</span>
                  </div>
                  <LineChart data={jobsByDay} color="#10b981" id="jobs" />
                </div>

                {/* Donut */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-4">
                  <div className="text-center">
                    <h3 className="text-sm font-black text-slate-900">Completion Rate</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">All-time</p>
                  </div>
                  <DonutChart value={completedJobs.length} total={jobs.length} color="#10b981" />
                  <div className="grid grid-cols-2 gap-3 w-full text-center">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-lg font-black text-slate-900">{completedJobs.length}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Done</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-lg font-black text-slate-900">{jobs.length}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar chart row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 mb-1">Jobs by Trade</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Completed breakdown</p>
                  <MiniBar data={jobsByService} />
                  <div className="flex flex-wrap gap-3 mt-4">
                    {jobsByService.map(d => (
                      <div key={d.l} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                        <span className="text-[10px] font-bold text-slate-400">{d.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 mb-1">Availability Slots</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Scheduled per day this week</p>
                  <MiniBar data={slotsByDay} />
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                    <span className="text-[10px] font-bold text-slate-400">Available slots</span>
                    <span className="ml-auto text-[10px] font-black text-slate-600">{mySlots.filter(s => !s.is_booked).length} open · {mySlots.filter(s => s.is_booked).length} booked</span>
                  </div>
                </div>
              </div>

              {/* Skills + recent activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 mb-4">My Trade Skills</h3>
                  <div className="space-y-3">
                    {["hvac","plumbing","electrical","general"].map(skill => {
                      const isActive = worker.specializations?.includes(skill);
                      const count = completedJobs.filter(j => getSkills(j.booking?.service).includes(skill)).length;
                      const pct = completedJobs.length > 0 ? (count / completedJobs.length) * 100 : 0;
                      return (
                        <div key={skill}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: serviceColors[skill] }} />
                              <span className="text-xs font-black text-slate-700 capitalize">{skill}</span>
                              {isActive && <span className="text-[8px] font-black text-emerald-500 uppercase bg-emerald-50 px-1.5 py-0.5 rounded-md">Active</span>}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{count} jobs</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: serviceColors[skill] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 mb-4">Recent Activity</h3>
                  {completedJobs.length === 0 ? (
                    <div className="text-center py-8 text-slate-300">
                      <LucideIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-xs font-black uppercase text-slate-400">No completed jobs yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                      {completedJobs.slice(0, 8).map(j => (
                        <div key={j.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                            <LucideIcon d="M9 12l2 2 4-4" className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 truncate capitalize">{j.booking?.service}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{j.booking?.preferred_date}</p>
                          </div>
                          <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 px-2 py-1 rounded-lg shrink-0">Done</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                      {["06:00 AM","07:00 AM","08:00 AM","09:00 AM","10:00 AM","11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM","07:00 PM"].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">End Time</label>
                    <select value={slotForm.end_time} onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-emerald-500 transition-all">
                      {["07:00 AM","08:00 AM","09:00 AM","10:00 AM","11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM","07:00 PM","08:00 PM"].map(t => <option key={t} value={t}>{t}</option>)}
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
          {!["profile","analytics","my_schedule"].includes(activeTab) && (
            <div className="space-y-4">
              {filteredJobs.map(a => {
                const isMarket    = activeTab === "open_market";
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
                        {a.status === "pending"     && <button onClick={e => { e.stopPropagation(); updateStatus(a.id, "claimed"); }} className="btn-pro btn-pro-primary w-full">Claim Job</button>}
                        {a.status === "assigned"    && <button onClick={e => { e.stopPropagation(); updateStatus(a.id, "claimed"); }} className="btn-pro btn-pro-primary w-full">Confirm Job</button>}
                        {a.status === "claimed"     && (
                          <div>
                            {label && <p className="text-[9px] font-bold text-slate-400 text-center mb-1 uppercase">{label}</p>}
                            <button onClick={e => { e.stopPropagation(); updateStatus(a.id, "in_progress"); }} disabled={!canStart} className="btn-pro btn-pro-primary w-full disabled:opacity-40 disabled:cursor-not-allowed">Start Work</button>
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
                      <p><span className="text-slate-400">Lead Pool:</span> {availableJobs?.length}</p>
                      <p><span className="text-slate-400">Tab:</span> {activeTab}</p>
                      <p className="mt-3 text-[9px] text-slate-400 font-sans italic leading-relaxed">Jobs only appear if they match your Trades and available Slots. Check "My Schedule" to add open slots.</p>
                    </div>
                  )}
                </div>
              )}
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
                  {["assignment","lead"].includes(notification.type) ? (
                    <>
                      <button onClick={() => updateStatus(notification.id, "claimed")} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-widest ${notification.type === "assignment" ? "bg-blue-600 hover:bg-blue-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
                        {notification.type === "assignment" ? "Accept" : "Claim"}
                      </button>
                      <button onClick={() => { if (notification.type === "assignment") updateStatus(notification.id, "rejected"); setNotification(null); }}
                        className="px-3 py-2.5 rounded-xl text-xs font-black text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        {notification.type === "assignment" ? "Reject" : "Dismiss"}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setNotification(null)} className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 transition-all">Got it</button>
                  )}
                </div>
              </div>
            </div>
            {notification.type === "lead" && <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/30 w-full"><div className="h-full bg-emerald-500 animate-progress-shrink" /></div>}
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
                  if (["open_market","pending","assigned"].includes(selectedJob.status))
                    return <button onClick={e => { e.stopPropagation(); updateStatus(selectedJob.id, "claimed"); setSelectedJob(null); }} className="btn-pro btn-pro-primary w-full !py-4 text-base shadow-xl shadow-emerald-900/10">Accept & Claim This Job</button>;
                  if (selectedJob.status === "claimed")
                    return <div className="space-y-2">{label && <p className="text-center text-xs font-black uppercase text-amber-500 animate-pulse">{label}</p>}<button onClick={e => { e.stopPropagation(); updateStatus(selectedJob.id, "in_progress"); setSelectedJob(null); }} disabled={!canStart} className="btn-pro btn-pro-primary w-full !py-4 text-base disabled:opacity-40 disabled:grayscale">Start On-Site Work</button></div>;
                  if (selectedJob.status === "in_progress")
                    return <div className="space-y-2">{!canComplete && <p className="text-center text-xs font-bold text-slate-400 uppercase">Wait until near end of slot</p>}<button onClick={e => { e.stopPropagation(); updateStatus(selectedJob.id, "completed"); setSelectedJob(null); }} disabled={!canComplete} className="btn-pro btn-pro-primary w-full !bg-sky-600 hover:!bg-sky-700 !py-4 text-base disabled:opacity-40">Mark as Successfully Completed</button></div>;
                  return <div className="text-center py-3 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-emerald-600 font-black uppercase tracking-widest text-xs">Service Ticket Closed</p></div>;
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
