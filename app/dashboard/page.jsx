"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const WS  = process.env.NEXT_PUBLIC_WS_URL  ?? "ws://localhost:8000";

const STATUS_THEMES = {
  pending:     { label: "Wait for Admin", badge: "badge-warning",  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  assigned:    { label: "New Job for You!",   badge: "badge-info",     icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0z" },
  accepted:    { label: "Ready to Start",        badge: "badge-success",  icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  in_progress: { label: "Working Now",  badge: "badge-success",  icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  completed:   { label: "Done!",        badge: "badge-info",     icon: "M5 13l4 4L19 7" },
};

function LucideIcon({ d, className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function WorkerDashboard() {
  const router = useRouter();
  const [worker, setWorker] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState("start_work");

  const [jobs, setJobs] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  // ... rest of state same ...
  const [wsStatus, setWsStatus] = useState("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState(null);
  const wsRef = useRef(null);

  // Helper to filter jobs by tab
  const getFilteredJobs = () => {
    if (activeTab === "open_market") return availableJobs;
    if (activeTab === "start_work") return jobs.filter(j => ['assigned', 'accepted'].includes(j.status));
    if (activeTab === "work_progress") return jobs.filter(j => j.status === 'in_progress');
    if (activeTab === "completed") return jobs.filter(j => j.status === 'completed');
    return [];
  };

  const filteredJobs = getFilteredJobs();

  useEffect(() => {
    const t = localStorage.getItem("worker_token");
    const w = localStorage.getItem("worker_data");
    if (!t || !w) { router.replace("/login"); return; }
    setToken(t);
    setWorker(JSON.parse(w));
  }, [router]);
  
  // fetchData handles updating both jobs and availableJobs
  const fetchData = useCallback(async () => {
    if (!token || !worker) return;
    setIsRefreshing(true);
    try {
      const [resMy, resAll] = await Promise.all([
        fetch(`${API}/api/workers/jobs`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/workers/pending-jobs`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const myData = await resMy.json();
      const allData = await resAll.json();
      setJobs(Array.isArray(myData) ? myData : []);
      setAvailableJobs(Array.isArray(allData) ? allData : []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
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
          setNotification({ 
            type: "assignment", id: data.assignment.id, title: "Direct Assignment!", 
            msg: `Admin assigned you: ${data.assignment.booking?.service}`, data: data.assignment
          });
        } else if (data.type === "new_lead" || data.type === "new_booking") {
          const booking = data.booking || data.assignment?.booking;
          setNotification({ 
            type: "lead", id: data.assignment_id || data.assignment?.id, title: "New Local Lead!", 
            msg: `New ${booking?.service} request in ${booking?.user?.address?.split(',')[0]}`, data: data
          });
          setTimeout(() => setNotification(prev => prev?.id === (data.assignment_id || data.assignment?.id) ? null : prev), 15000);
        }
      } catch (err) { console.error(err); }
      fetchData();
    };
    ws.onclose = () => { setWsStatus("offline"); setTimeout(() => connectWs(t, wid), 3000); };
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { 
    if (token && worker) {
      fetchData(); 
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [token, worker, fetchData]);

  useEffect(() => {
    if (token && worker) connectWs(token, worker.id);
    return () => wsRef.current?.close();
  }, [token, worker, connectWs]);

  async function updateStatus(assignmentId, status, notes = null) {
    if (!token) return;
    let finalNotes = notes;
    if (status === 'completed' && !finalNotes) finalNotes = prompt("Notes:") || "";
    try {
      const res = await fetch(`${API}/api/jobs/${assignmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, notes: finalNotes }),
      });
      if (res.ok) {
        fetchData();
        if (status === 'accepted') setNotification(null);
      }
    } catch (err) { console.error(err); }
  }

  const logout = () => { localStorage.clear(); router.replace("/login"); };

  if (!worker) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-slate-900 flex flex-col p-6 fixed h-full z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-white shadow-lg shadow-emerald-900/40">C</div>
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-tight">Custom Repair</h1>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mt-1">Worker Hub</p>
          </div>
        </div>

        <div className="mb-4 px-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Dispatcher</p>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("open_market")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "open_market" ? 'bg-primary text-white shadow-xl shadow-emerald-900/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <LucideIcon d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                Open Market
              </div>
              {availableJobs.length > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">{availableJobs.length}</span>
              )}
            </button>
          </nav>
        </div>

        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">My Workspace</p>
          <nav className="space-y-1">
            {[
              { id: "start_work", label: "Start Work", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { id: "work_progress", label: "In Progress", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
              { id: "completed", label: "Completed", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
            ].map(item => {
              const count = item.id === "start_work" ? jobs.filter(j=>['assigned','accepted'].includes(j.status)).length :
                            item.id === "work_progress" ? jobs.filter(j=>j.status==='in_progress').length :
                            jobs.filter(j=>j.status==='completed').length;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === item.id ? 'bg-primary text-white shadow-xl shadow-emerald-900/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LucideIcon d={item.icon} />
                    {item.label}
                  </div>
                  {count > 0 && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${activeTab === item.id ? 'bg-white text-primary' : 'bg-slate-800 text-slate-300'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
           <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-[10px]">{worker.name.charAt(0)}</div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-white truncate">{worker.name}</p>
                <p className="text-[9px] font-bold text-slate-500 truncate capitalize">{worker.specialization || 'Tech'}</p>
              </div>
           </div>
           <button onClick={logout} className="w-full py-2.5 rounded-xl border border-white/10 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-[10px] font-black uppercase transition-all">
              Log Out
           </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 ml-64 p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
           <div>
             <h2 className="text-3xl font-black text-slate-900 leading-tight">
               {activeTab === "open_market" ? "Job Market" : 
                activeTab === "start_work" ? "Assigned Jobs" :
                activeTab === "work_progress" ? "Active Tasks" : "Job History"}
             </h2>
             <div className="flex items-center gap-2 mt-2">
                <div className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${wsStatus === 'online' ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${wsStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{wsStatus} real-time sync</span>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end">
               <p className="text-sm font-black text-slate-900 tabular-nums">{currentTime.toLocaleTimeString()}</p>
               <p className="text-[10px] font-bold text-slate-400 uppercase">Live Pulse</p>
            </div>
            <button 
              onClick={fetchData} 
              disabled={isRefreshing}
              className={`p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-600 shadow-sm transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <LucideIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {filteredJobs.map(a => {
            const isCompleted = a.status === 'completed';
            const isMarket = activeTab === 'open_market';
            const hideSensitive = isCompleted || isMarket;

            return (
              <div key={a.id} className="card-pro p-6 fade-in group">
                 <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                       <div className="flex items-start justify-between">
                          <div>
                             <span className={`badge ${STATUS_THEMES[a.status]?.badge || 'badge-info'}`}>
                               {STATUS_THEMES[a.status]?.label || a.status}
                             </span>
                             <h3 className="text-lg font-black text-slate-900 mt-2.5 capitalize">{a.booking?.service}</h3>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-bold text-slate-900 leading-none">ID: {a.booking?.id?.split('-')[0] || 'CR'}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Ticket</p>
                          </div>
                       </div>
  
                       <div className="grid grid-cols-2 gap-3 bg-slate-50/50 rounded-2xl p-4">
                          <div className="flex items-center gap-3">
                             <LucideIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" className="w-5 h-5 text-slate-400" />
                             <div className="leading-tight">
                                <p className="text-xs font-bold text-slate-900">{a.booking?.preferred_date || 'ASAP'}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">{a.booking?.preferred_time || 'Flexible'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <LucideIcon d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" className="w-5 h-5 text-slate-400" />
                             <div className="leading-tight overflow-hidden">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {a.booking?.user?.address}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                  {isMarket ? "Region (Approx)" : "Location"}
                                </p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <LucideIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" className="w-5 h-5 text-slate-400" />
                             <div className="leading-tight">
                                <p className="text-xs font-bold text-slate-900">
                                  {a.booking?.user?.name}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Customer</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <LucideIcon d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" className="w-5 h-5 text-slate-400" />
                             <div className="leading-tight">
                                <p className="text-xs font-bold text-slate-900">
                                  {a.booking?.user?.phone}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Contact</p>
                             </div>
                          </div>
                       </div>

                       {a.booking?.notes && (
                         <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                           <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1 font-mono">Directives</p>
                           <p className="text-xs font-medium text-slate-600 italic">"{a.booking.notes}"</p>
                         </div>
                       )}
                    </div>
  
                    <div className="md:w-[200px] flex flex-col justify-end gap-3 pt-6 md:pt-0 md:border-l md:pl-6 border-slate-100">
                       {activeTab === "open_market" && (
                          <button onClick={() => updateStatus(a.id, 'accepted')} className="btn-pro btn-pro-primary w-full shadow-emerald-100">Claim Job</button>
                       )}
                       {a.status === 'assigned' && <button onClick={() => updateStatus(a.id, 'accepted')} className="btn-pro btn-pro-primary w-full">Confirm Job</button>}
                       {a.status === 'accepted' && <button onClick={() => updateStatus(a.id, 'in_progress')} className="btn-pro btn-pro-primary w-full">Start Work</button>}
                       {a.status === 'in_progress' && <button onClick={() => updateStatus(a.id, 'completed')} className="btn-pro btn-pro-primary w-full bg-sky-600 hover:bg-sky-700">Finish Work</button>}
                       {a.status === 'completed' && <div className="text-center text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-50 py-2 rounded-lg border border-emerald-100 italic">Closed Ticket</div>}
                    </div>
                 </div>
              </div>
            );
          })}

          {filteredJobs.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
               <LucideIcon d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" className="w-10 h-10 text-slate-200 mx-auto mb-4" />
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Workspace is clear</p>
            </div>
          )}
        </div>
      </main>

      {/* Real-time Notification Overlay */}
      {notification && (
        <div className="fixed top-24 right-8 z-[100] animate-bounce-in max-w-md w-full px-4">
          <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-[0_32px_80px_-10px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -mr-16 -mt-16 ${notification.type === 'assignment' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
            
            <div className="flex items-start gap-5 relative z-10">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${notification.type === 'assignment' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
                <LucideIcon d={notification.type === 'assignment' ? "M16 7a4 4 0 11-8 0 4 4 0 018 0z" : "M13 10V3L4 14h7v7l9-11h-7z"} className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${notification.type === 'assignment' ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {notification.title}
                </p>
                <p className="text-base font-bold leading-tight mb-4">{notification.msg}</p>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => updateStatus(notification.id, 'accepted')}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 ${
                      notification.type === 'assignment' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {notification.type === 'assignment' ? 'Accept Job' : 'Claim Lead'}
                  </button>
                  <button 
                    onClick={() => {
                      if (notification.type === 'assignment') {
                        updateStatus(notification.id, 'rejected');
                        setNotification(null);
                      } else {
                        setNotification(null);
                      }
                    }}
                    className="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {notification.type === 'assignment' ? 'Reject' : 'Dismiss'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Countdown bar */}
            {notification.type === 'lead' && (
              <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/30 w-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-progress-shrink" />
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3) translateY(100px); opacity: 0; }
          50% { transform: scale(1.05) translateY(-10px); opacity: 1; }
          70% { transform: scale(0.9) translateY(5px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes progress-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .animate-progress-shrink {
          animation: progress-shrink 15s linear forwards;
        }
      `}</style>
    </div>
  );
}
