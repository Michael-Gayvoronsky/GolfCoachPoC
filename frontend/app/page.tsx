"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function Landing() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => { if (ready && user) router.replace("/feed"); }, [ready, user, router]);

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-12 py-5 bg-[#0a0e1ad9] backdrop-blur-xl border-b border-white/[0.07]">
        <Link href="/" className="text-xl font-extrabold tracking-tight">⛳ GolfCoach</Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-5 py-2 rounded-lg border border-white/15 text-sm text-white/75 hover:bg-white/10 hover:text-white transition">Sign In</Link>
          <Link href="/signup" className="px-5 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-sm font-semibold transition hover:-translate-y-px">Get Started Free</Link>
        </div>
      </nav>

      <section className="min-h-[88vh] flex items-center justify-center px-8 py-20 text-center relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,197,94,0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(59,130,246,0.08), transparent 50%), #0a0e1a" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-block bg-green-500/10 border border-green-500/25 text-green-400 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8">
            ⛳ Free Community Golf Coaching
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            Stop Guessing.<br />
            <span className="bg-gradient-to-r from-green-500 via-green-400 to-green-300 bg-clip-text text-transparent">Start Improving.</span>
          </h1>
          <p className="text-lg text-white/55 max-w-xl mx-auto mb-10 leading-relaxed">
            GolfCoach is where golfers post their swings and get real, ranked feedback from a community that actually plays.
            No coach fees. No fluff. Just honest tips from people who've fixed the same problems you have.
          </p>
          <div className="flex gap-4 justify-center flex-wrap mb-16">
            <Link href="/signup" className="px-10 py-3.5 rounded-xl bg-green-500 hover:bg-green-600 font-bold transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(34,197,94,0.3)]">Start for Free</Link>
            <Link href="/login" className="px-10 py-3.5 rounded-xl bg-white/[0.07] border border-white/15 text-white/80 hover:bg-white/15 hover:text-white transition">Sign In</Link>
          </div>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {[["500+", "Swings Shared"], ["200+", "Golfers"], ["1,000+", "Tips Given"]].map(([n, l], i) => (
              <div key={l} className="flex items-center gap-8">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-extrabold tracking-tight">{n}</span>
                  <span className="text-xs text-white/40 uppercase tracking-widest mt-1">{l}</span>
                </div>
                {i < 2 && <div className="w-px h-10 bg-white/10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-green-400 mb-3">FEATURES</p>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-12">Everything you need to improve</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              ["📹", "Share Your Swing", "Upload photos or videos of your technique for the community to review and critique."],
              ["💬", "Get Coaching Tips", "Receive detailed comments and actionable advice from experienced golfers who've been there."],
              ["🏆", "Best Advice Surfaces", "The top tips get upvoted and pinned with medals so you never miss the most valuable feedback."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-10 hover:bg-white/[0.06] hover:border-green-500/25 hover:-translate-y-1 transition">
                <div className="text-4xl mb-5">{icon}</div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-white/50 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 px-8 bg-white/[0.015] border-y border-white/[0.05]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-green-400 mb-3">HOW IT WORKS</p>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-12">Three steps to a better swing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              ["01", "Create Your Profile", "Sign up free and set your skill level — beginner, intermediate, or experienced."],
              ["02", "Upload Your Swing", "Share a photo or video of any shot — full swing, chip, putt, doesn't matter."],
              ["03", "Get Better", "Read community tips, upvote the best advice, and apply it on the course."],
            ].map(([n, t, d]) => (
              <div key={n} className="p-6">
                <div className="text-5xl font-black text-green-500/25 tracking-tight mb-4">{n}</div>
                <h3 className="text-lg font-bold mb-2">{t}</h3>
                <p className="text-white/50 leading-relaxed text-sm">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-8" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(34,197,94,0.1), transparent 70%)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Ready to lower your handicap?</h2>
          <p className="text-white/55 text-lg mb-10 leading-relaxed">Join golfers sharing their swings and improving together — completely free.</p>
          <Link href="/signup" className="inline-block px-12 py-4 rounded-xl bg-green-500 hover:bg-green-600 font-bold text-base transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(34,197,94,0.3)]">Create Free Account</Link>
        </div>
      </section>

      <footer className="py-8 px-12 text-center text-white/25 text-sm border-t border-white/[0.05]">
        © 2026 GolfCoach — Built for golfers, by golfers.
      </footer>
    </div>
  );
}
