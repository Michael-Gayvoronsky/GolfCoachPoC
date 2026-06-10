"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import PostCard from "@/components/PostCard";
import { api, Post } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const LIMIT = 12;

export default function Feed() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);
  useEffect(() => { if (user) loadMore(0); }, [user]);

  async function loadMore(skip: number) {
    setLoading(true);
    try {
      const batch = await api<Post[]>(`/api/posts?skip=${skip}&limit=${LIMIT}`);
      setPosts((p) => skip === 0 ? batch : [...p, ...batch]);
      setHasMore(batch.length === LIMIT);
    } catch { setError("Could not load feed."); }
    finally { setLoading(false); }
  }

  if (!ready || !user) return null;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Community Feed</h1>
          <p className="text-white/55 mt-1">See what the community is working on</p>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-lg text-sm mb-4">{error}</div>}
        {loading && posts.length === 0 ? (
          <div className="text-center text-white/55 py-16">Loading feed…</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/55 mb-4">No posts yet. Be the first to share your swing!</p>
            <Link href="/upload" className="inline-block px-6 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 font-semibold transition">Post a Swing</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button onClick={() => loadMore(posts.length)} disabled={loading}
                  className="px-6 py-2.5 rounded-lg border border-white/15 hover:bg-white/10 transition disabled:opacity-50">
                  {loading ? "Loading…" : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
