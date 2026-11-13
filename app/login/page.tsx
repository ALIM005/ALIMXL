"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, FileSpreadsheet, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";

type Mode = "login" | "register" | "forgot" | "reset";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Supabase sends the recovery link back to /login#access_token=...&type=recovery
    // (older links used ?reset=TOKEN, still supported).
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const hashError = hash.get("error_description");
    const accessToken = hash.get("access_token");
    const legacyToken = query.get("reset");

    if (accessToken && hash.get("type") === "recovery") {
      setToken(accessToken);
      setMode("reset");
      window.history.replaceState({}, "", "/login"); // keep the token out of the address bar/history
    } else if (legacyToken) {
      setToken(legacyToken);
      setMode("reset");
      window.history.replaceState({}, "", "/login");
    } else if (hashError) {
      setError(hashError.replace(/\+/g, " ") || "রিসেট লিংকটি মেয়াদোত্তীর্ণ বা অবৈধ। নতুন লিংক নিন।");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : mode === "login" ? "/api/auth/login" : mode === "forgot" ? "/api/auth/forgot-password" : "/api/auth/reset-password";
      const payload = mode === "register" ? { name, email, password } : mode === "login" ? { email, password } : mode === "forgot" ? { email } : { token, password };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      // The server may answer with a non-JSON error page; never let that crash the form.
      const data: { error?: string; message?: string } = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `সার্ভার ত্রুটি (${response.status})। টার্মিনালের লগ দেখুন।`);
      if (mode === "login" || mode === "register") {
        // Show a visible success message first, then open the workspace
        // (the profile menu in the top bar now shows the signed-in account).
        setMessage(mode === "register" ? "অ্যাকাউন্ট তৈরি হয়েছে। সফলভাবে লগইন হয়েছে! হোমে নেওয়া হচ্ছে…" : "সফলভাবে লগইন হয়েছে! হোমে নেওয়া হচ্ছে…");
        window.setTimeout(() => window.location.assign("/"), 1200);
        return; // keep the button busy until the redirect
      }
      setMessage(data.message || "সফল হয়েছে।");
      if (mode === "reset") { setMode("login"); setPassword(""); window.history.replaceState({}, "", "/login"); }
    } catch (err) { setError(err instanceof TypeError ? "সার্ভারের সাথে যোগাযোগ করা যায়নি। ইন্টারনেট/সার্ভার চালু আছে কিনা দেখুন।" : err instanceof Error ? err.message : "একটি সমস্যা হয়েছে।"); }
    finally { setBusy(false); }
  }

  const title = mode === "register" ? "Create your account" : mode === "forgot" ? "Recover your account" : mode === "reset" ? "Set a new password" : "Welcome back";
  const subtitle = mode === "register" ? "Create an ALIMXL account to get started." : mode === "forgot" ? "We’ll send a secure password reset link to your email." : mode === "reset" ? "Choose a strong password for your account." : "Sign in to your ALIMXL workspace.";

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,#e6f3ff,#f8fbff_48%,#f3f5f9)] px-4 py-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_90px_rgba(20,55,90,.13)] md:grid-cols-[1fr_1.05fr]">
          <div className="relative hidden min-h-162.5 flex-col justify-between overflow-hidden bg-linear-to-br from-[#063d2a] via-[#087347] to-[#0d9a63] p-12 text-white md:flex">
            <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full border-42 border-white/10" />
            <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-36 border-amber-300/15" />
            <div className="relative flex items-center gap-3"><div className="rounded-2xl bg-white/15 p-3"><FileSpreadsheet size={30}/></div><div><div className="text-2xl font-black tracking-wide">ALIMXL</div><div className="text-xs tracking-[.28em] text-emerald-100">AWM EXCEL STUDIO</div></div></div>
            <div className="relative max-w-md"><p className="mb-4 text-xs font-bold uppercase tracking-[.3em] text-emerald-100">Your work. Your space.</p><h1 className="text-5xl font-black leading-[1.12]">Work smarter.<br/><span className="text-amber-300">Create more.</span></h1><p className="mt-6 max-w-sm text-base leading-7 text-emerald-50/90">A focused workspace for your spreadsheets, templates and everyday productivity.</p></div>
            <p className="relative text-xs text-emerald-100/80">Secure account access · Guest mode remains available</p>
          </div>
          <div className="flex min-h-162.5 flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
            <Link href="/" className="mb-9 inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"><ArrowLeft size={16}/> Back to ALIMXL</Link>
            <div className="mb-8"><div className="mb-4 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700 md:hidden"><FileSpreadsheet size={28}/></div><h2 className="text-3xl font-extrabold tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p></div>
            <form onSubmit={submit} className="space-y-5">
              {mode === "register" && <label className="block"><span className="mb-2 block text-sm font-semibold">Full name</span><span className="flex items-center rounded-xl border border-slate-200 px-4 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/10"><UserRound size={18} className="text-slate-400"/><input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="h-12 w-full bg-transparent px-3 text-sm outline-none"/></span></label>}
              {(mode === "login" || mode === "register" || mode === "forgot") && <label className="block"><span className="mb-2 block text-sm font-semibold">Email address</span><span className="flex items-center rounded-xl border border-slate-200 px-4 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/10"><Mail size={18} className="text-slate-400"/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="h-12 w-full bg-transparent px-3 text-sm outline-none"/></span></label>}
              {(mode === "login" || mode === "register" || mode === "reset") && <label className="block"><span className="mb-2 block text-sm font-semibold">{mode === "reset" ? "New password" : "Password"}</span><span className="flex items-center rounded-xl border border-slate-200 px-4 focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/10"><LockKeyhole size={18} className="text-slate-400"/><input required minLength={8} maxLength={128} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" className="h-12 w-full bg-transparent px-3 text-sm outline-none"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Hide password" : "Show password"} className="text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>}
              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
              <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#087347] to-[#07965d] px-5 text-sm font-bold text-white shadow-lg shadow-emerald-800/15 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{busy && <LoaderCircle size={17} className="animate-spin"/>}{mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Sign in"}</button>
            </form>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
              {mode === "login" && <><button onClick={()=>{setMode("forgot");setError("");setMessage("");}} className="font-semibold text-emerald-700 hover:underline">Forgot password?</button><span className="text-slate-500">New here? <button onClick={()=>{setMode("register");setError("");setMessage("");}} className="font-bold text-emerald-700 hover:underline">Create account</button></span></>}
              {mode === "register" && <span className="text-slate-500">Already registered? <button onClick={()=>{setMode("login");setError("");setMessage("");}} className="font-bold text-emerald-700 hover:underline">Sign in</button></span>}
              {(mode === "forgot" || mode === "reset") && <button onClick={()=>{setMode("login");setError("");setMessage("");}} className="font-semibold text-emerald-700 hover:underline">Back to sign in</button>}
            </div>
            <div className="mt-10 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-400">Email verification codes are currently not required. You can also continue using ALIMXL as a guest.</div>
          </div>
        </section>
      </div>
    </main>
  );
}