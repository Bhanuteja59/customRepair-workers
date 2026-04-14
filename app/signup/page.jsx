"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SPECIALIZATIONS = [
  { value: "hvac",        label: "HVAC — Heating & Cooling" },
  { value: "plumbing",    label: "Plumbing" },
  { value: "electrical",  label: "Electrical" },
  { value: "general",     label: "General Repair" },
];

export default function WorkerSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirm: "", specializations: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/workers/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          password: form.password,
          specializations: form.specializations,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Signup failed");
      localStorage.setItem("worker_token", data.access_token);
      localStorage.setItem("worker_data", JSON.stringify(data.worker));
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-[420px]">
        {/* Simple Brand Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white mb-6 shadow-md shadow-emerald-200">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Profile</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Register as a Field Technician</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 font-semibold">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full name</label>
              <input type="text" required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John Smith" className="input-pro" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email address</label>
              <input type="email" required value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="tech@customrepair.com" className="input-pro" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Phone</label>
                <input type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(555) 000-0000" className="input-pro" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Trades & Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map(s => {
                    const isSelected = form.specializations.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            specializations: isSelected 
                              ? f.specializations.filter(v => v !== s.value)
                              : [...f.specializations, s.value]
                          }));
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          isSelected 
                            ? "bg-primary text-white border-primary shadow-lg shadow-emerald-900/10" 
                            : "bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary"
                        }`}
                      >
                        {s.label.split(' — ')[0]}
                      </button>
                    );
                  })}
                </div>
                {form.specializations.length === 0 && (
                  <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Please select at least one trade to see relevant jobs.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">New Password</label>
                <input type="password" required value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 chars" className="input-pro" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Verify Password</label>
                <input type="password" required value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat password" className="input-pro" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || form.specializations.length === 0}
              className="w-full btn-pro btn-pro-primary h-12 text-sm mt-4 shadow-md shadow-emerald-100 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Register Account"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-sm text-center text-slate-500 font-medium">
              Already a team member?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline">Log in</Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 font-medium">
          Professional network. Join the Custom Repair fleet.
        </p>
      </div>
    </div>
  );
}
