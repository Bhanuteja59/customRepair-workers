"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const WS  = process.env.NEXT_PUBLIC_WS_URL  ?? "ws://localhost:8000";

const STATUS_THEMES = {
  open:        { label: "Wait for Admin", badge: "badge-warning",  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  pending:     { label: "Wait for Admin", badge: "badge-warning",  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  assigned:    { label: "New Job for You!", badge: "badge-info",     icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0z" },
  claimed:     { label: "Ready to Start",   badge: "badge-success",  icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  in_progress: { label: "Working Now",      badge: "badge-success",  icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  completed:   { label: "Done!",            badge: "badge-info",     icon: "M5 13l4 4L19 7" },
  expired:     { label: "Missed Slot",      badge: "badge-warning",  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
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
  const [showProfileModal, setShowProfileModal] = useState(false);
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
  const wsRef = useRef(null);

  // Helper to calculate timing requirements
  const calculateJobTimings = (job) => {
    if (!job?.booking?.preferred_date) return { canStart: true, canComplete: true, start: null, end: null, label: null };
    const timeParts = job.booking.preferred_time?.split(/\s*[-\u2013]\s*/) || [];
    if (timeParts.length !== 2) return { canStart: true, canComplete: true, start: null, end: null, label: null };
    
    const start = new Date(`${job.booking.preferred_date} ${timeParts[0]}`);
    const end = new Date(`${job.booking.preferred_date} ${timeParts[1]}`);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { canStart: true, canComplete: true, start: null, end: null, label: null };
    
    const canStart = currentTime >= start && currentTime < end;
    const canComplete = currentTime >= new Date(end.getTime() - 30 * 60000); // Allow finish 30m before end
    
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

  // Helper to filter jobs by tab
  const getFilteredJobs = () => {
    const isExpired = (a) => {
      const { end } = calculateJobTimings(a);
      if (!end) return false;
      return currentTime > end;
    };

    if (activeTab === "open_market") {
      return availableJobs.filter(a => {
        const required = getSkills(a.booking?.service);
        const workerSkills = worker.specializations || [];
        // Support both old 'specialization' and new 'specializations' list
        const techSkills = Array.isArray(workerSkills) ? workerSkills : [workerSkills];
        return required.every(s => techSkills.includes(s));
      });
    }
    if (activeTab === "start_work") return jobs.filter(j => ['assigned', 'claimed'].includes(j.status) && !isExpired(j));
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
  
  const fetchSlots = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/workers/slots`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMySlots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch slots error:", err);
    }
  }, [token]);

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

  async function addSlot() {
    if (!slotForm.slot_date || !slotForm.start_time || !slotForm.end_time) {
      setSlotError("Please fill in all fields.");
      return;
    }
    setSlotSaving(true);
    setSlotError("");
    try {
      const res = await fetch(`${API}/api/workers/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(slotForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSlotError(err.detail || "Failed to add slot.");
      } else {
        setSlotForm(f => ({ ...f, slot_date: "", start_time: "09:00 AM", end_time: "11:00 AM" }));
        fetchSlots();
      }
    } catch {
      setSlotError("Network error.");
    } finally {
      setSlotSaving(false);
    }
  }

  async function deleteSlot(slotId) {
    try {
      const res = await fetch(`${API}/api/workers/slots/${slotId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchSlots();
      else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Cannot delete slot.");
      }
    } catch {
      alert("Network error.");
    }
  }

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
        } else if (data.type === "job_claimed") {
          if (data.worker_id !== wid) {
            setAvailableJobs(prev => prev.filter(job => job.id !== data.assignment_id));
            setNotification(prev => prev?.id === data.assignment_id ? null : prev);
          }
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
      fetchSlots();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [token, worker, fetchData, fetchSlots]);

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
        if (status === 'claimed') setNotification(null);
      } else {
        const errData = await res.json().catch(() => null);
        if (errData && errData.success === false) {
          alert(errData.message);
        } else if (errData && errData.detail) {
          alert(errData.detail);
        }
      }
    } catch (err) { console.error(err); }
  }

  async function updateProfile(e) {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`${API}/api/workers/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        const updatedWorker = await res.json();
        setWorker(updatedWorker);
        localStorage.setItem("worker_data", JSON.stringify(updatedWorker));
        setNotification({ type: "success", title: "Profile Updated", msg: "Your skills and info have been saved." });
        setActiveTab("start_work");
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
              { id: "my_schedule", label: "My Schedule", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
              { id: "start_work", label: "Start Work", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { id: "work_progress", label: "In Progress", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
              { id: "completed", label: "Completed", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
            ].map(item => {
              const count = item.id === "my_schedule" ? mySlots.filter(s => !s.is_booked).length :
                            item.id === "start_work" ? jobs.filter(j => ['assigned', 'claimed'].includes(j.status) && (() => {
                              const { end } = calculateJobTimings(j);
                              return !end || currentTime <= end;
                            })()).length :
                            item.id === "work_progress" ? jobs.filter(j => j.status === 'in_progress').length :
                            jobs.filter(j => j.status === 'completed').length;
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

        <div className="mt-auto px-2 space-y-2">
           <button
             onClick={() => {
                setProfileForm({ name: worker.name, phone: worker.phone, specializations: worker.specializations || [] });
                setActiveTab("profile");
             }}
             className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
               activeTab === "profile" ? 'bg-primary text-white shadow-xl shadow-emerald-900/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
             }`}
           >
             <div className="flex items-center gap-3">
               <LucideIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               My Profile
             </div>
           </button>
           <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition-all">
             <LucideIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
             Log Out
           </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 ml-64 p-8 max-w-5xl mx-auto w-full">
        {activeTab === 'profile' ? (
           <div className="fade-in">
              <div className="mb-10">
                 <h2 className="text-3xl font-black text-slate-900 tracking-tighter">My Settings</h2>
                 <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-widest italic">Technician Identity & Skills</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div className="card-pro p-8 bg-white border-none shadow-xl">
                       <form onSubmit={updateProfile} className="space-y-6">
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Professional Trades</label>
                             <div className="flex flex-wrap gap-2">
                                {[
                                   { value: "hvac", label: "HVAC" },
                                   { value: "plumbing", label: "Plumbing" },
                                   { value: "electrical", label: "Electrical" },
                                   { value: "general", label: "General" }
                                ].map(s => {
                                   const isSelected = profileForm?.specializations.includes(s.value);
                                   return (
                                      <button
                                         key={s.value}
                                         type="button"
                                         onClick={() => {
                                            const current = profileForm.specializations;
                                            const next = isSelected 
                                               ? current.filter(v => v !== s.value)
                                               : [...current, s.value];
                                            setProfileForm(prev => ({ ...prev, specializations: next }));
                                         }}
                                         className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                            isSelected 
                                            ? "bg-primary text-white border-primary shadow-lg shadow-emerald-900/10" 
                                            : "bg-slate-50 text-slate-500 border-slate-100 hover:border-primary hover:text-primary"
                                         }`}
                                      >
                                         {s.label}
                                      </button>
                                   );
                                })}
                             </div>
                             {profileForm?.specializations.length === 0 && (
                                <p className="text-[10px] text-red-400 mt-3 font-bold uppercase tracking-tight">Select at least one trade to remain active.</p>
                             )}
                          </div>
                          
                          <div className="h-px bg-slate-100 w-full" />
                          
                          <div className="space-y-4">
                            <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Technician Name</label>
                               <input 
                                 type="text" 
                                 value={profileForm?.name || ""} 
                                 onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                 className="input-pro !bg-slate-50 border-transparent focus:!bg-white" 
                               />
                            </div>
                            
                            <div>
                               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">On-Site Phone</label>
                               <input 
                                 type="tel" 
                                 value={profileForm?.phone || ""} 
                                 onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                                 className="input-pro !bg-slate-50 border-transparent focus:!bg-white" 
                               />
                            </div>
                          </div>
                          
                          <button 
                            type="submit" 
                            disabled={profileForm?.specializations.length === 0}
                            className="w-full btn-pro btn-pro-primary !py-4 shadow-xl shadow-emerald-900/20 disabled:grayscale disabled:opacity-50"
                          >
                             Apply Profile Changes
                          </button>
                       </form>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="card-pro p-8 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                          <LucideIcon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" className="w-24 h-24" />
                       </div>
                       <h3 className="text-xl font-black mb-1">Fleet Security</h3>
                       <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Verification Status</p>
                       
                       <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                             <div>
                                <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Live & Authenticated</p>
                                <p className="text-[10px] text-slate-500 font-bold mt-1">Worker ID: {worker.id}</p>
                             </div>
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                          </div>
                          
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 opacity-60">
                             <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-300">Identity Record</p>
                                <p className="text-[10px] text-slate-500 font-bold mt-1">Background Status: Cleared</p>
                             </div>
                             <LucideIcon d="M9 12l2 2 4-4" className="text-emerald-500 w-5 h-5" />
                          </div>
                       </div>
                    </div>

                    <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex items-start gap-4">
                       <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                          <LucideIcon d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-6 h-6 text-amber-600" />
                       </div>
                       <div>
                          <p className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1 leading-none">Dispatcher Note</p>
                          <p className="text-[11px] text-amber-700 font-medium leading-relaxed italic">"Adding more skills will instantly reveal complex multi-trade leads in your area. Keep your profile sharp!"</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        ) : (
           <>
              <div className="flex items-center justify-between mb-10">
           <div>
             <h2 className="text-3xl font-black text-slate-900 leading-tight">
               {activeTab === "open_market" ? "Job Market" :
                activeTab === "my_schedule" ? "My Schedule" :
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

        {/* ── My Schedule Tab ── */}
        {activeTab === "my_schedule" && (
          <div className="space-y-8 fade-in">
            {/* Add New Slot Card */}
            <div className="card-pro p-8 bg-white border-none shadow-xl">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-widest mb-6">Add Available Slot</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={slotForm.slot_date}
                    onChange={e => setSlotForm(f => ({ ...f, slot_date: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Start Time</label>
                  <select
                    value={slotForm.start_time}
                    onChange={e => setSlotForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-primary transition-all"
                  >
                    {["06:00 AM","07:00 AM","08:00 AM","09:00 AM","10:00 AM","11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM","07:00 PM"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">End Time</label>
                  <select
                    value={slotForm.end_time}
                    onChange={e => setSlotForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 font-bold text-slate-900 text-sm outline-none focus:border-primary transition-all"
                  >
                    {["07:00 AM","08:00 AM","09:00 AM","10:00 AM","11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM","07:00 PM","08:00 PM"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              {slotError && (
                <p className="text-red-500 text-xs font-black mb-4 bg-red-50 rounded-xl px-4 py-2 border border-red-100">{slotError}</p>
              )}
              <button
                onClick={addSlot}
                disabled={slotSaving}
                className="btn-pro btn-pro-primary px-8 py-3.5 text-sm shadow-lg shadow-emerald-900/20 disabled:opacity-50"
              >
                {slotSaving ? "Saving..." : "+ Add Slot"}
              </button>
            </div>

            {/* Slots List */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                Your Slots ({mySlots.length} total · {mySlots.filter(s => s.is_booked).length} booked)
              </p>
              {mySlots.length === 0 ? (
                <div className="card-pro p-12 text-center text-slate-400">
                  <LucideIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-black text-sm uppercase tracking-widest">No slots yet</p>
                  <p className="text-xs mt-1">Add your available times above so clients can book you.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mySlots.map(slot => (
                    <div key={slot.id} className={`card-pro p-5 flex items-center justify-between gap-4 transition-all ${slot.is_booked ? 'bg-emerald-50 border border-emerald-100' : 'bg-white hover:shadow-md'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${slot.is_booked ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                          <LucideIcon
                            d={slot.is_booked ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"}
                            className={`w-5 h-5 ${slot.is_booked ? 'text-white' : 'text-slate-500'}`}
                          />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{slot.slot_date}</p>
                          <p className="text-xs text-slate-400 font-bold">{slot.start_time} – {slot.end_time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {slot.is_booked ? (
                          <span className="badge badge-success text-[10px]">Booked by Client</span>
                        ) : (
                          <>
                            <span className="badge badge-warning text-[10px]">Open</span>
                            <button
                              onClick={() => deleteSlot(slot.id)}
                              className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Remove slot"
                            >
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

        <div className="space-y-6">
          {activeTab !== "my_schedule" && filteredJobs.map(a => {
            const isCompleted = a.status === 'completed';
            const isMarket = activeTab === 'open_market';
            const hideSensitive = isCompleted || isMarket;
            
            const { canStart, canComplete, label } = calculateJobTimings(a);

            return (
              <div key={a.id} onClick={() => setSelectedJob(a)} className="card-pro p-6 fade-in group cursor-pointer hover:shadow-xl transition-all hover:bg-white active:scale-[0.99]">
                 <div className="flex flex-col md:flex-row gap-6">
                     <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                           <div>
                              <div className="flex items-center gap-2">
                                <span className={`badge ${STATUS_THEMES[a.status]?.badge || 'badge-info'}`}>
                                  {STATUS_THEMES[a.status]?.label || a.status}
                                </span>
                              </div>
                              <h3 className="text-lg font-black text-slate-900 mt-2.5 capitalize group-hover:text-primary transition-colors">{a.booking?.service}</h3>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                 {getSkills(a.booking?.service).map(skill => (
                                   <span key={skill} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest border border-slate-200/50">{skill}</span>
                                 ))}
                              </div>
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
                          <button onClick={() => updateStatus(a.id, 'claimed')} className="btn-pro btn-pro-primary w-full shadow-emerald-100">Claim Job</button>
                       )}
                       {a.status === 'assigned' && <button onClick={() => updateStatus(a.id, 'claimed')} className="btn-pro btn-pro-primary w-full">Confirm Job</button>}
                       
                       {a.status === 'claimed' && (
                         <div className="w-full">
                           {label && <p className="text-[9px] font-bold text-slate-400 text-center mb-1 uppercase tracking-widest">{label}</p>}
                           <button onClick={(e) => { e.stopPropagation(); updateStatus(a.id, 'in_progress'); }} disabled={!canStart} className="btn-pro btn-pro-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">Start Work</button>
                         </div>
                       )}
                       
                       {a.status === 'in_progress' && (
                         <div className="w-full">
                           {!canComplete && <p className="text-[9px] font-bold text-slate-400 text-center mb-1 uppercase tracking-widest">Early Finish Window Locked</p>}
                           <button onClick={(e) => { e.stopPropagation(); updateStatus(a.id, 'completed'); }} disabled={!canComplete} className="btn-pro btn-pro-primary w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300">Finish Work</button>
                         </div>
                       )}
                       
                       {a.status === 'completed' && <div className="text-center text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-50 py-2 rounded-lg border border-emerald-100 italic">Closed Ticket</div>}
                    </div>
                 </div>
              </div>
            );
          })}

          {filteredJobs.length === 0 && activeTab !== "my_schedule" && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
               <LucideIcon d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" className="w-10 h-10 text-slate-200 mx-auto mb-4" />
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Workspace is clear</p>
            </div>
          )}
        </div>
      </>
    )}
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
                  {['assignment', 'lead'].includes(notification.type) ? (
                    <>
                      <button 
                        onClick={() => updateStatus(notification.id, 'claimed')}
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
                    </>
                  ) : (
                    <button 
                      onClick={() => setNotification(null)}
                      className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all font-bold"
                    >
                      Got it
                    </button>
                  )}
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

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedJob(null)}>
           <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-slide-up border border-white/20" onClick={e => e.stopPropagation()}>
              <div className="bg-slate-900 p-10 text-white flex justify-between items-start relative overflow-hidden">
                 {/* Decorative background element */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -mr-32 -mt-32 rounded-full" />
                 
                 <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                       <span className={`badge ${STATUS_THEMES[selectedJob.status]?.badge || 'badge-info'} !bg-white/10 !text-white border-white/20`}>
                         {STATUS_THEMES[selectedJob.status]?.label || selectedJob.status}
                       </span>
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono">Reference #{selectedJob.booking?.id?.split('-')[0]}</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight capitalize leading-none">{selectedJob.booking?.service}</h2>
                    <div className="flex flex-wrap gap-2 mt-4">
                       {getSkills(selectedJob.booking?.service).map(skill => (
                         <span key={skill} className="px-3 py-1 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/10">{skill}</span>
                       ))}
                    </div>
                    <p className="text-slate-400 font-bold mt-4 flex items-center gap-2">
                       <LucideIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" className="w-4 h-4" />
                       {selectedJob.booking?.preferred_date} · {selectedJob.booking?.preferred_time}
                    </p>
                 </div>
                 <button onClick={() => setSelectedJob(null)} className="relative z-10 p-3 hover:bg-white/10 rounded-2xl transition-all hover:rotate-90">
                    <LucideIcon d="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 {/* Customer Section */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Profile</p>
                       <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center text-slate-900 font-black text-2xl shadow-inner">
                            {selectedJob.booking?.user?.name?.charAt(0)}
                          </div>
                          <div>
                             <p className="text-xl font-black text-slate-900 leading-tight">{selectedJob.booking?.user?.name}</p>
                             <p className="text-sm font-bold text-primary mt-1">{selectedJob.booking?.user?.phone}</p>
                          </div>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service Location</p>
                       <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <LucideIcon d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" className="w-5 h-5 text-slate-400 mt-0.5" />
                          <p className="text-sm font-bold text-slate-700 leading-relaxed">{selectedJob.booking?.user?.address || 'Not specified'}</p>
                       </div>
                    </div>
                 </div>

                 {/* Problem Description */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Job Directives & Notes</p>
                       <span className="w-12 h-1 bg-slate-100 rounded-full" />
                    </div>
                    <div className="p-8 rounded-[32px] bg-primary/5 border border-primary/10 relative group">
                       <LucideIcon d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" className="absolute top-6 right-6 w-10 h-10 text-primary/10 group-hover:scale-110 transition-transform" />
                       <p className="text-base font-medium text-slate-700 leading-relaxed italic relative z-10">
                          "{selectedJob.booking?.notes || 'No specific notes provided by customer.'}"
                       </p>
                    </div>
                 </div>

                 {/* Status Flow Actions */}
                 <div className="pt-6 border-t border-slate-100">
                    <div className="flex flex-col gap-4">
                       {(() => {
                          const { canStart, canComplete, label } = calculateJobTimings(selectedJob);
                          
                          if (selectedJob.status === 'open_market' || selectedJob.status === 'pending' || selectedJob.status === 'assigned') {
                             return <button onClick={(e) => { e.stopPropagation(); updateStatus(selectedJob.id, 'claimed'); setSelectedJob(null); }} className="btn-pro btn-pro-primary !py-5 text-base shadow-xl shadow-primary/20">Accept & Claim This Job</button>;
                          }
                          
                          if (selectedJob.status === 'claimed') {
                             return (
                                <div className="space-y-3">
                                   {label && <p className="text-center text-xs font-black uppercase text-amber-500 tracking-widest animate-pulse">{label}</p>}
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); updateStatus(selectedJob.id, 'in_progress'); setSelectedJob(null); }} 
                                     disabled={!canStart}
                                     className="btn-pro btn-pro-primary !py-5 text-base w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
                                   >
                                     Start On-Site Work
                                   </button>
                                </div>
                             );
                          }
                          
                          if (selectedJob.status === 'in_progress') {
                             return (
                                <div className="space-y-3">
                                   {!canComplete && <p className="text-center text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Please wait until near the end of the slot to finish</p>}
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); updateStatus(selectedJob.id, 'completed'); setSelectedJob(null); }} 
                                     disabled={!canComplete}
                                     className="btn-pro btn-pro-primary !bg-sky-600 hover:!bg-sky-700 !py-5 text-base shadow-xl shadow-sky-900/10 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                   >
                                     Mark as Successfully Completed
                                   </button>
                                </div>
                             );
                          }
                          
                          return <div className="text-center py-4 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-emerald-600 font-black uppercase tracking-widest text-xs italic">Service Ticket Closed</p></div>;
                       })()}
                       
                       <button onClick={() => setSelectedJob(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors py-2">
                          Dismiss Details
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
