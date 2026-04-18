"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

function LucideIcon({ d, className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const THREADS = [
  { id: 1, name: "Dispatch Team",      avatar: "D", color: "from-emerald-500 to-teal-600",   role: "Operations",  unread: 2, last: "New lead available in your area!", time: "2m ago", online: true },
  { id: 2, name: "Support Team",       avatar: "S", color: "from-blue-500 to-indigo-600",     role: "Help Desk",   unread: 0, last: "Your ticket has been resolved.",      time: "1h ago", online: true },
  { id: 3, name: "Billing",            avatar: "B", color: "from-purple-500 to-pink-600",     role: "Finance",     unread: 0, last: "Payment processed for last week.",    time: "3h ago", online: false },
  { id: 4, name: "Field Coordinator",  avatar: "F", color: "from-amber-500 to-orange-600",    role: "Scheduling",  unread: 1, last: "Can you take the 3PM HVAC slot?",     time: "5h ago", online: true },
  { id: 5, name: "Quality Assurance",  avatar: "Q", color: "from-rose-500 to-red-600",        role: "QA",          unread: 0, last: "Great feedback on your last job!",    time: "1d ago", online: false },
];

const MOCK_MSGS = {
  1: [
    { id: 1, from: "dispatch", text: "Good morning! We have a new HVAC lead in your area.", time: "09:00 AM" },
    { id: 2, from: "me",       text: "Thanks! I can take it. What's the address?",         time: "09:02 AM" },
    { id: 3, from: "dispatch", text: "123 Maple Street. Customer needs AC inspection. Slot is 2–4 PM today.", time: "09:03 AM" },
    { id: 4, from: "me",       text: "Perfect, I'll confirm in the app.",                  time: "09:04 AM" },
    { id: 5, from: "dispatch", text: "New lead available in your area!",                   time: "09:45 AM", unread: true },
  ],
  2: [
    { id: 1, from: "dispatch", text: "Hi! Support team here. How can we help?",    time: "Yesterday" },
    { id: 2, from: "me",       text: "I had an issue with my slot not showing.",   time: "Yesterday" },
    { id: 3, from: "dispatch", text: "We investigated and fixed the slot sync bug. Should work now!", time: "Yesterday" },
    { id: 4, from: "dispatch", text: "Your ticket has been resolved.",             time: "1h ago" },
  ],
  3: [
    { id: 1, from: "dispatch", text: "Your payment for 3 completed jobs last week has been processed.", time: "3h ago" },
    { id: 2, from: "dispatch", text: "Payment processed for last week.", time: "3h ago" },
  ],
  4: [
    { id: 1, from: "dispatch", text: "Hey! We have a 3PM HVAC slot that needs a tech. Are you available?", time: "5h ago", unread: true },
  ],
  5: [
    { id: 1, from: "dispatch", text: "The customer for your last job left a 5-star review! Great work!", time: "1d ago" },
    { id: 2, from: "dispatch", text: "Great feedback on your last job!", time: "1d ago" },
  ],
};

const SIDEBAR = [
  { label: "Dashboard",  icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", href: "/dashboard" },
  { label: "Analytics",  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", href: "/analytics" },
  { label: "Earnings",   icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", href: "/earnings" },
  { label: "Messages",   icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", href: "/messages", active: true },
  { label: "Settings",   icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", href: "/settings" },
];

export default function MessagesPage() {
  const router = useRouter();
  const [worker, setWorker] = useState(null);
  const [activeThread, setActiveThread] = useState(THREADS[0]);
  const [threads, setThreads] = useState(THREADS);
  const [messages, setMessages] = useState(MOCK_MSGS);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    const w = localStorage.getItem("worker_data");
    const t = localStorage.getItem("worker_token");
    if (!t || !w) { router.replace("/login"); return; }
    setWorker(JSON.parse(w));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread, messages]);

  const openThread = (thread) => {
    setActiveThread(thread);
    setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread: 0 } : t));
    setMessages(prev => ({
      ...prev,
      [thread.id]: (prev[thread.id] || []).map(m => ({ ...m, unread: false })),
    }));
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg = { id: Date.now(), from: "me", text: input.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => ({ ...prev, [activeThread.id]: [...(prev[activeThread.id] || []), msg] }));
    setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, last: input.trim() } : t));
    setInput("");
  };

  const filtered = threads.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);
  const currentMsgs = messages[activeThread?.id] || [];

  if (!worker) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Nav Sidebar */}
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
              {item.active && totalUnread > 0 && (
                <span className="ml-auto text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-lg">{totalUnread}</span>
              )}
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

      {/* Chat layout */}
      <div className="flex-1 ml-72 flex h-screen">
        {/* Thread list */}
        <div className="w-80 bg-white border-r border-slate-100 flex flex-col">
          <div className="px-5 py-5 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 mb-3">Messages</h2>
            <div className="relative">
              <LucideIcon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text" placeholder="Search..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all border border-transparent focus:border-emerald-200"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(thread => (
              <button key={thread.id} onClick={() => openThread(thread)}
                className={`w-full px-5 py-4 flex items-center gap-4 text-left transition-all border-b border-slate-50 ${activeThread?.id === thread.id ? "bg-emerald-50 border-l-2 border-l-emerald-500" : "hover:bg-slate-50"}`}>
                <div className="relative shrink-0">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${thread.color} flex items-center justify-center font-black text-white text-sm shadow-md`}>
                    {thread.avatar}
                  </div>
                  {thread.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-slate-900 truncate">{thread.name}</p>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0 ml-2">{thread.time}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{thread.role}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{thread.last}</p>
                </div>
                {thread.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">{thread.unread}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-slate-50">
          {activeThread ? (
            <>
              {/* Chat header */}
              <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeThread.color} flex items-center justify-center font-black text-white shadow-md`}>
                    {activeThread.avatar}
                  </div>
                  {activeThread.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{activeThread.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {activeThread.online ? <span className="text-emerald-500">● Online</span> : "● Offline"} · {activeThread.role}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {currentMsgs.map(msg => (
                  <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                    {msg.from !== "me" && (
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activeThread.color} flex items-center justify-center font-black text-white text-xs mr-3 mt-1 shrink-0 shadow-sm`}>
                        {activeThread.avatar}
                      </div>
                    )}
                    <div className={`max-w-sm ${msg.from === "me" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm font-medium shadow-sm ${
                        msg.from === "me"
                          ? "bg-emerald-600 text-white rounded-tr-sm"
                          : msg.unread ? "bg-blue-50 border border-blue-100 text-slate-800 rounded-tl-sm" : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
                      }`}>
                        {msg.text}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 px-1">{msg.time}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-slate-100 p-4">
                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2 border border-slate-200 focus-within:border-emerald-300 focus-within:bg-white transition-all">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none font-medium"
                  />
                  <button onClick={sendMessage} disabled={!input.trim()}
                    className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm">
                    <LucideIcon d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" className="w-4 h-4 text-white" />
                  </button>
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-2 text-center uppercase tracking-widest">Press Enter to send</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <LucideIcon d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px }
      `}</style>
    </div>
  );
}
