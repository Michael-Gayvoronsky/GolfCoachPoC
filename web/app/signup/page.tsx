"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, AuthUser, SkillLevel } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Signup() {
  const [displayName, setDisplayName] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("BEGINNER");
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
      const res = await api<AuthUser>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName, skillLevel }),
      });
      setUser(res);
      router.push("/feed");
    } catch (e: any) { setError(e.message.includes("already") ? "That email is already registered." : e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center text-xl font-extrabold mb-8">⛳ GolfCoach</Link>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8">
          <h1 className="text-2xl font-extrabold mb-1">Join GolfCoach</h1>
          <p className="text-white/55 text-sm mb-6">Get feedback from the community on your game</p>
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium block mb-1.5">Display Name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} placeholder="Tiger W."
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/15 focus:border-green-500 focus:outline-none transition" />
            </label>
            <label className="block">
              <span className="text-sm font-medium block mb-1.5">Skill Level</span>
              <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/15 focus:border-green-500 focus:outline-none transition">
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="EXPERIENCED">Experienced</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium block mb-1.5">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/15 focus:border-green-500 focus:outline-none transition" />
            </label>
            <label className="block">
              <span className="text-sm font-medium block mb-1.5">Password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min. 6 characters"
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/15 focus:border-green-500 focus:outline-none transition" />
            </label>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-600 font-semibold disabled:opacity-50 transition">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
          <p className="text-center text-sm text-white/55 mt-6">
            Already have an account? <Link href="/login" className="text-green-400 hover:text-green-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
