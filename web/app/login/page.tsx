"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, AuthUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await api<AuthUser>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setUser(res);
      router.push("/feed");
    } catch (e: any) { setError(e.message.includes("Invalid") ? "Invalid email or password." : "Sign in failed."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center text-xl font-extrabold mb-8">⛳ GolfCoach</Link>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8">
          <h1 className="text-2xl font-extrabold mb-1">Welcome back</h1>
          <p className="text-white/55 text-sm mb-6">Sign in to your GolfCoach account</p>
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-600 font-semibold disabled:opacity-50 transition">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <p className="text-center text-sm text-white/55 mt-6">
            Don&apos;t have an account? <Link href="/signup" className="text-green-400 hover:text-green-300">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1.5">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/15 focus:border-green-500 focus:outline-none transition" />
    </label>
  );
}
