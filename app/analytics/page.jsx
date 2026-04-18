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

function LineChart({ data, color = "#10b981", id = "lc", showValues = true }) {
  const W = 400, H = 120, pl = 36, pr = 16, pt = 12, pb = 28;
  const cW = W - pl - pr, cH = H - pt - pb;
  const max = Math.max(...data.map(d => d.v), 1);
  const px = i => pl + (i / Math.max(data.length - 1, 1)) * cW;
  const py = v  => pt + cH - (v / max) * cH;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d.v).toFixed(1)}`).join(" ");
  const area = `M ${px(0).toFixed(1)} ${(pt + cH).toFixed(1)} ${data.map((d, i) => `L ${px(i).toFixed(1)} ${py(d.v).toFixed(1)}`).join(" ")} L ${px(data.length - 1).toFixed(1)} ${(pt + cH).toFixed(1)} Z`;

  // y-axis labels
  const ySteps = [0, 0.5, 1].map(f => ({ label: Math.round(max * f), y: pt + cH * (1 - f) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={pl} x2={W - pr} y1={pt + cH * (1 - f)} y2={pt + cH * (1 - f)} stroke="#f1f5f9" strokeWidth="1" />
      ))}
      {ySteps.map(s => (
        <text key={s.label} x={pl - 4} y={s.y + 3} textAnchor="end" fontSize="7" fill="#94a3b8">{s.label}</text>
      ))}
      <path d={area} fill={`url(#g-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(d.v)} r="3.5" fill={color} stroke="white" strokeWidth="2" />
          <text x={px(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">{d.l}</text>
          {showValues && d.v > 0 && (
            <text x={px(i)} y={py(d.v) - 9} textAnchor="middle" fontSize="8" fill={color} fontWeight="700">{d.v}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

function DonutChart({ value, total, color = "#10b981", size = 100, label = "" }) {
  const r = 38, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1)" }} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="17" fontWeight="900" fill="#0f172a">{Math.round(pct * 100)}%</text>
      {label && <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">{label}</text>}
    </svg>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="flex items-end gap-2.5 h-32 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1 group">
          <span className="text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: d.color || "#10b981" }}>{d.v}</span>
          <div className="w-full rounded-t-lg relative overflow-hidden" style={{
            height: `${Math.max((d.v / max) * 80, d.v > 0 ? 5 : 0)}px`,
            backgroundColor: (d.color || "#10b981") + "25",
            transition: `height 1s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
          }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: d.color || "#10b981", opacity: 0.15 }} />
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-t" style={{ backgroundColor: d.color || "#10b981" }} />
          </div>
          <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center">{d.l}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon, color, change }) {
  const gradients = {
    emerald: "from-emerald-500 to-teal-600",
    blue:    "from-blue-500 to-indigo-600",
    amber:   "from-amber-500 to-orange-600",
    purple:  "from-purple-500 to-pink-600",
    sky:     "from-sky-400 to-cyan-600",
  };
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients[color] || gradients.emerald} flex items-center justify-center shadow-md`}>
          <LucideIcon d={icon} className="w-5 h-5 text-white" />
        </div>
        {change !== undefined && (
          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${change >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"}`}>
            {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">{label}</p>
    </div>
  );
}

const SIDEBAR = [
  { label: "Dashboard",    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", href: "/dashboard" },
  { label: "Analytics",    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", href: "/analytics", active: true },
  { label: "Earnings",     icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "/earnings" },
  { label: "Messages",     icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", href: "/messages" },
  { label: "Settings",     icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", href: "/settings" },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [worker, setWorker] = useState(null);
  const [token, setToken] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("week"); // week | month

  useEffect(() => {
    const t = localStorage.getItem("worker_token");
    const w = localStorage.getItem("worker_data");
    if (!t || !w) { router.replace("/login"); return; }
    setToken(t); setWorker(JSON.parse(w));
  }, [router]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [rJobs, rSlots] = await Promise.all([
        fetch(`${API}/api/workers/jobs`,  { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/workers/slots`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const j = await rJobs.json();
      const s = await rSlots.json();
      setJobs(Array.isArray(j) ? j : []);
      setSlots(Array.isArray(s) ? s : []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!worker) return null;

  const completedJobs  = jobs.filter(j => j.status === "completed");
  const inProgressJobs = jobs.filter(j => j.status === "in_progress");
  const pendingJobs    = jobs.filter(j => ["assigned","claimed"].includes(j.status));

  const getSkills = (service) => {
    const s = (service || "").toLowerCase();
    const sk = [];
    if (s.includes("plumb")) sk.push("plumbing");
    if (s.includes("hvac") || s.includes("ac ") || s.includes("furnace") || s.includes("heat") || s.includes("thermostat")) sk.push("hvac");
    if (s.includes("electr")) sk.push("electrical");
    if (sk.length === 0) sk.push("general");
    return sk;
  };

  const days = range === "week" ? 7 : 30;
  const dayLabels = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const lastNDays = Array.from({ length: days }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); return d; });

  const completionData = lastNDays.map(d => ({
    l: range === "week" ? dayLabels[d.getDay()] : d.getDate().toString(),
    v: completedJobs.filter(j => {
      if (!j.booking?.preferred_date) return false;
      return new Date(j.booking.preferred_date).toDateString() === d.toDateString();
    }).length,
  }));

  const slotData = lastNDays.map(d => ({
    l: range === "week" ? dayLabels[d.getDay()] : d.getDate().toString(),
    v: slots.filter(s => s.slot_date === d.toISOString().split("T")[0]).length,
    color: "#6366f1",
  }));

  const serviceColors = { hvac: "#6366f1", plumbing: "#0ea5e9", electrical: "#f59e0b", general: "#10b981" };
  const jobsByService = ["hvac","plumbing","electrical","general"].map(s => ({
    l: s.charAt(0).toUpperCase() + s.slice(1),
    v: completedJobs.filter(j => getSkills(j.booking?.service).includes(s)).length,
    color: serviceColors[s],
  }));

  const activeSlots    = slots.filter(s => !s.is_booked).length;
  const bookedSlots    = slots.filter(s => s.is_booked).length;
  const bookingRate    = slots.length > 0 ? Math.round((bookedSlots / slots.length) * 100) : 0;

  // Per-day average
  const activeDays = completionData.filter(d => d.v > 0).length;
  const avgPerDay  = activeDays > 0 ? (completedJobs.length / activeDays).toFixed(1) : "0";

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
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                item.active ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/30" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}>
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
      <main className="flex-1 ml-72 min-h-screen">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Performance Analytics</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">All-time performance overview</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {["week","month"].map(r => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={fetchAll} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-all">
              <LucideIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </button>
          </div>
        </div>

        <div className="p-8 max-w-6xl mx-auto space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Completed Jobs"  value={completedJobs.length}  icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="emerald" />
            <StatCard label="In Progress"     value={inProgressJobs.length} icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"      color="blue" />
            <StatCard label="Pending"         value={pendingJobs.length}    icon="M13 10V3L4 14h7v7l9-11h-7z"                         color="amber" />
            <StatCard label="Slot Booking %"  value={`${bookingRate}%`}     icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" color="purple" />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Jobs Completed Over Time</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Last {days} days</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600">{completedJobs.length}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Avg {avgPerDay}/day</p>
                </div>
              </div>
              <LineChart data={completionData} color="#10b981" id="comp" />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-1">Completion Rate</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Jobs done vs total</p>
              <div className="flex flex-col items-center gap-4">
                <DonutChart value={completedJobs.length} total={jobs.length} color="#10b981" size={110} label="completion" />
                <div className="w-full grid grid-cols-3 gap-2 text-center">
                  {[["Done", completedJobs.length, "#10b981"], ["Active", inProgressJobs.length, "#6366f1"], ["Queue", pendingJobs.length, "#f59e0b"]].map(([l, v, c]) => (
                    <div key={l} className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-base font-black" style={{ color: c }}>{v}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-1">Jobs by Trade Type</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Completed breakdown</p>
              <BarChart data={jobsByService} />
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-50">
                {jobsByService.map(d => (
                  <div key={d.l} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] font-bold text-slate-500">{d.l} <span className="text-slate-400">({d.v})</span></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-1">Availability Slots</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Scheduled per day</p>
              <LineChart data={slotData} color="#6366f1" id="slots" />
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50">
                {[["Total", slots.length, "#6366f1"], ["Open", activeSlots, "#10b981"], ["Booked", bookedSlots, "#f59e0b"]].map(([l, v, c]) => (
                  <div key={l} className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-lg font-black" style={{ color: c }}>{v}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skills matrix */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-5">Trade Skills Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {["hvac","plumbing","electrical","general"].map(skill => {
                const isActive = worker.specializations?.includes(skill);
                const count    = completedJobs.filter(j => getSkills(j.booking?.service).includes(skill)).length;
                const pct      = completedJobs.length > 0 ? Math.round((count / completedJobs.length) * 100) : 0;
                const col      = serviceColors[skill];
                return (
                  <div key={skill} className="p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5" style={{ backgroundColor: col }} />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-slate-900 capitalize">{skill}</span>
                        {isActive && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: col }}>Active</span>}
                      </div>
                      <p className="text-2xl font-black mb-2" style={{ color: col }}>{count}</p>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: col, transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 mt-1.5">{pct}% of completed</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent jobs table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Recent Completed Jobs</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{completedJobs.length} total</span>
            </div>
            {completedJobs.length === 0 ? (
              <div className="p-12 text-center">
                <LucideIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No completed jobs yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Service","Date","Customer","Location","Trade","Status"].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {completedJobs.slice(0, 10).map(j => (
                      <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900 capitalize">{j.booking?.service}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-500">{j.booking?.preferred_date}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-700">{j.booking?.user?.name}</td>
                        <td className="px-5 py-3.5 text-slate-500 truncate max-w-[140px]">{j.booking?.user?.address}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {getSkills(j.booking?.service).map(s => (
                              <span key={s} className="text-[8px] font-black px-1.5 py-0.5 rounded-md capitalize text-white" style={{ backgroundColor: serviceColors[s] }}>{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase">Done</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        .fade-in { animation: fade-in 0.3s ease-out }
      `}</style>
    </div>
  );
}
