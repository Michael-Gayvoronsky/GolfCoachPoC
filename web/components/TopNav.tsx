"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function TopNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-[#0a0e1ad9] backdrop-blur-xl border-b border-white/[0.07]">
      <div className="flex items-center gap-8">
        <Link href="/feed" className="text-xl font-extrabold tracking-tight">⛳ GolfCoach</Link>
        <div className="flex gap-6 text-sm">
          <Link href="/feed" className="text-white/70 hover:text-white transition">Feed</Link>
          <Link href="/upload" className="text-white/70 hover:text-white transition">Post</Link>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user && <span className="text-sm text-white/55">{user.displayName}</span>}
        <button onClick={() => { signOut(); router.push("/"); }}
          className="px-4 py-2 rounded-lg border border-white/15 text-sm text-white/75 hover:bg-white/10 hover:text-white transition">
          Sign Out
        </button>
      </div>
    </nav>
  );
}
