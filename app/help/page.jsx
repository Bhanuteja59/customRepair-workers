"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function LucideIcon({ d, className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const FAQ = [
  { q: "How do I get assigned to a job?", a: "Add availability slots in 'My Schedule', then set your trade specializations in your Profile. The dispatcher matches open bookings to workers with matching skills and time slots." },
  { q: "When can I start a job?", a: "You can tap 'Start Work' only during the job's scheduled time window. The button activates when the booking start time is reached." },
  { q: "How do I finish a job early?", a: "The 'Finish Work' button activates 30 minutes before the end of the scheduled slot. This prevents premature completions." },
  { q: "Why don't I see jobs in the Open Market?", a: "Open Market jobs only show when they match your listed trades AND your available schedule slots. Ensure your Profile and Schedule are up to date." },
  { q: "How are my earnings calculated?", a: "Earnings are estimated based on service type. You receive 75% of the job rate. Exact rates may vary — check the Earnings page for your breakdown." },
  { q: "What happens if I miss a job slot?", a: "Missed slots are marked as 'Expired'. Your profile score may be affected. Contact dispatch if you have an emergency." },
  { q: "How do I update my phone number?", a: "Go to Settings → Profile & Identity and update your phone number there." },
  { q: "Can I reject a directly assigned job?", a: "Yes. When you receive a direct assignment notification, tap 'Reject' to decline. The job returns to the pool." },
];

const GUIDES = [
  { title: "Getting Started Guide", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: "from-emerald-500 to-teal-600" },
  { title: "How Job Matching Works",  icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7", color: "from-blue-500 to-indigo-600" },
  { title: "Managing Your Schedule",  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "from-purple-500 to-pink-600" },
  { title: "Earnings & Payouts",      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "from-amber-500 to-orange-600" },
];

const SIDEBAR = [
  { label: "Dashboard",  icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", href: "/dashboard" },
  { label: "Analytics",  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", href: "/analytics" },
  { label: "Earnings",   icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "/earnings" },
  { label: "Messages",   icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", href: "/messages" },
  { label: "Settings",   icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", href: "/settings" },
  { label: "Help",       icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "/help", active: true },
];

export default function HelpPage() {
  const router = useRouter();
  const [worker, setWorker] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [search, setSearch] = useState("");
  const [ticket, setTicket] = useState({ subject: "", desc: "", priority: "normal" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const w = localStorage.getItem("worker_data");
    const t = localStorage.getItem("worker_token");
    if (!t || !w) { router.replace("/login"); return; }
    setWorker(JSON.parse(w));
  }, [router]);

  if (!worker) return null;

  const filtered = FAQ.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen flex bg-slate-50">
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

      <main className="flex-1 ml-72 min-h-screen">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-4">
          <h2 className="text-xl font-black text-slate-900">Help & Support</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">FAQs, guides, and support tickets</p>
        </div>

        <div className="p-8 max-w-4xl mx-auto space-y-8">
          {/* Hero */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl" />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
              <div>
                <h3 className="text-2xl font-black mb-2">How can we help?</h3>
                <p className="text-slate-400 text-sm">Search our knowledge base or submit a support ticket.</p>
              </div>
              <div className="flex-1 min-w-60 max-w-md">
                <div className="relative">
                  <LucideIcon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search FAQ..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-400 outline-none focus:border-emerald-400 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick guides */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Quick Guides</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {GUIDES.map(g => (
                <button key={g.title} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-left hover:shadow-md transition-all group">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                    <LucideIcon d={g.icon} className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-black text-slate-900 leading-tight">{g.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Frequently Asked Questions ({filtered.length})</p>
            <div className="space-y-2">
              {filtered.map((f, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors gap-4">
                    <p className="text-sm font-black text-slate-900">{f.q}</p>
                    <LucideIcon d={openFaq === i ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 border-t border-slate-50">
                      <p className="text-sm text-slate-600 font-medium leading-relaxed mt-3">{f.a}</p>
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
                  <p className="text-sm font-black text-slate-400">No results for "{search}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Support ticket */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-black text-slate-900 mb-1">Submit a Support Ticket</h3>
            <p className="text-xs text-slate-400 mb-6">Can't find your answer? Our team responds within 2 business hours.</p>
            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <LucideIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-black text-emerald-700">Ticket submitted! We'll respond to {worker.email} shortly.</p>
                <button onClick={() => { setSubmitted(false); setTicket({ subject: "", desc: "", priority: "normal" }); }} className="mt-4 text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Submit another</button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Subject</label>
                  <input type="text" required value={ticket.subject} onChange={e => setTicket(p => ({ ...p, subject: e.target.value }))} placeholder="Brief description of your issue"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-400 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Description</label>
                  <textarea required rows="4" value={ticket.desc} onChange={e => setTicket(p => ({ ...p, desc: e.target.value }))} placeholder="Explain your issue in detail..."
                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-400 focus:bg-white transition-all resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Priority</label>
                  <div className="flex gap-3">
                    {[["low","Low — general question"], ["normal","Normal — needs attention"], ["urgent","Urgent — blocking work"]].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setTicket(p => ({ ...p, priority: v }))}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black border-2 transition-all ${ticket.priority === v
                          ? v === "urgent" ? "border-red-500 bg-red-50 text-red-600" : v === "normal" ? "border-amber-500 bg-amber-50 text-amber-600" : "border-emerald-500 bg-emerald-50 text-emerald-600"
                          : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                        {l.split("—")[0].trim()}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 transition-all text-sm uppercase tracking-widest">
                  Submit Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
