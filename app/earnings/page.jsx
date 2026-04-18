"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SERVICE_RATES = { hvac: 180, plumbing: 150, electrical: 160, general: 120 };
const WORKER_CUT = 0.75; // 75% to worker

function LucideIcon({ d, className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function BarChart({ data, color = "#10b981" }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="flex items-end gap-1.5 h-28 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1 group relative">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap">
            ${d.v}
          </div>
          <div className="w-full rounded-t-md" style={{
            height: `${Math.max((d.v / max) * 84, d.v > 0 ? 4 : 0)}px`,
            background: d.highlight ? color : color + "50",
            transition: `height 1s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms`,
          }} />
          <span className="text-[8px] font-bold text-slate-400 truncate w-full text-center">{d.l}</span>
        </div>
      ))}
    </div>
  );
}

const SIDEBAR = [
  { label: "Dashboard",  icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", href: "/dashboard" },
  { label: "Analytics",  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", href: "/analytics" },
  { label: "Earnings",   icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "/earnings", active: true },
  { label: "Messages",   icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", href: "/messages" },
  { label: "Settings",   icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", href: "/settings" },
];

export default function EarningsPage() {
  const router = useRouter();
  const [worker, setWorker] = useState(null);
  const [token, setToken] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [period, setPeriod] = useState("month"); // week | month | all

  useEffect(() => {
    const t = localStorage.getItem("worker_token");
    const w = localStorage.getItem("worker_data");
    if (!t || !w) { router.replace("/login"); return; }
    setToken(t); setWorker(JSON.parse(w));
  }, [router]);

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API}/api/workers/jobs`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setJobs(Array.isArray(d) ? d : []);
    } catch {}
  }, [token]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  if (!worker) return null;

  const getSkills = (service) => {
    const s = (service || "").toLowerCase();
    if (s.includes("hvac") || s.includes("ac ") || s.includes("furnace") || s.includes("heat")) return "hvac";
    if (s.includes("plumb")) return "plumbing";
    if (s.includes("electr")) return "electrical";
    return "general";
  };

  const jobRate = (j) => SERVICE_RATES[getSkills(j.booking?.service)] || 120;
  const jobEarning = (j) => Math.round(jobRate(j) * WORKER_CUT);

  const completedJobs = jobs.filter(j => j.status === "completed");

  const now = new Date();
  const periodJobs = completedJobs.filter(j => {
    if (!j.booking?.preferred_date || period === "all") return true;
    const d = new Date(j.booking.preferred_date);
    if (period === "week") { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w; }
    if (period === "month") { const m = new Date(now); m.setDate(now.getDate() - 30); return d >= m; }
    return true;
  });

  const totalEarned    = periodJobs.reduce((s, j) => s + jobEarning(j), 0);
  const avgPerJob      = periodJobs.length > 0 ? Math.round(totalEarned / periodJobs.length) : 0;
  const thisMonthJobs  = completedJobs.filter(j => { if (!j.booking?.preferred_date) return false; const d = new Date(j.booking.preferred_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const thisMonthTotal = thisMonthJobs.reduce((s, j) => s + jobEarning(j), 0);

  // weekly chart (last 8 weeks)
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(now); end.setDate(now.getDate() - i * 7);
    const start = new Date(end); start.setDate(end.getDate() - 6);
    const weekJobs = completedJobs.filter(j => {
      if (!j.booking?.preferred_date) return false;
      const d = new Date(j.booking.preferred_date);
      return d >= start && d <= end;
    });
    return { l: `W${8 - i}`, v: weekJobs.reduce((s, j) => s + jobEarning(j), 0), highlight: i === 0 };
  }).reverse();

  // by service type
  const byService = Object.entries(SERVICE_RATES).map(([skill, rate]) => {
    const sJobs = periodJobs.filter(j => getSkills(j.booking?.service) === skill);
    return { skill, jobs: sJobs.length, gross: sJobs.length * rate, net: Math.round(sJobs.length * rate * WORKER_CUT) };
  });

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
      <main className="flex-1 ml-72 min-h-screen">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">My Earnings</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Estimated payout · {WORKER_CUT * 100}% worker cut</p>
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {["week","month","all"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 max-w-6xl mx-auto space-y-6">
          {/* Hero card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 blur-3xl" />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">
                  {period === "week" ? "This Week" : period === "month" ? "Last 30 Days" : "All Time"} Earnings
                </p>
                <p className="text-5xl font-black text-white leading-none">${totalEarned.toLocaleString()}</p>
                <p className="text-slate-400 text-sm font-bold mt-3">{periodJobs.length} jobs · avg ${avgPerJob}/job</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-2xl font-black text-emerald-400">${thisMonthTotal.toLocaleString()}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">This Month</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-2xl font-black text-blue-400">{completedJobs.length}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Jobs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-1">Weekly Earnings</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Last 8 weeks (estimated)</p>
              <BarChart data={weeks} color="#10b981" />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-5">Earnings by Trade</h3>
              <div className="space-y-3">
                {byService.map(({ skill, jobs: jc, net }) => {
                  const colors = { hvac: "#6366f1", plumbing: "#0ea5e9", electrical: "#f59e0b", general: "#10b981" };
                  const col = colors[skill];
                  const max = Math.max(...byService.map(b => b.net), 1);
                  return (
                    <div key={skill}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col }} />
                          <span className="text-xs font-black text-slate-800 capitalize">{skill}</span>
                          <span className="text-[9px] font-bold text-slate-400">({jc} jobs)</span>
                        </div>
                        <span className="text-xs font-black" style={{ color: col }}>${net.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(net / max) * 100}%`, backgroundColor: col }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Payout breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Payout Breakdown</h3>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                <div className="w-2 h-2 rounded-full bg-emerald-400" /> Worker {WORKER_CUT * 100}%
                <div className="w-2 h-2 rounded-full bg-slate-200 ml-2" /> Platform {Math.round((1 - WORKER_CUT) * 100)}%
              </div>
            </div>
            {periodJobs.length === 0 ? (
              <div className="p-12 text-center">
                <LucideIcon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No completed jobs in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Service","Date","Rate","Platform Cut","Your Earnings","Status"].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {periodJobs.map(j => {
                      const rate    = jobRate(j);
                      const cut     = Math.round(rate * (1 - WORKER_CUT));
                      const earning = jobEarning(j);
                      return (
                        <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900 capitalize">{j.booking?.service}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-500">{j.booking?.preferred_date}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-700">${rate}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-400">-${cut}</td>
                          <td className="px-5 py-3.5 font-black text-emerald-600">${earning}</td>
                          <td className="px-5 py-3.5"><span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg uppercase">Paid</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan="4" className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-widest">Total ({periodJobs.length} jobs)</td>
                      <td className="px-5 py-3.5 text-base font-black text-emerald-600">${totalEarned.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
