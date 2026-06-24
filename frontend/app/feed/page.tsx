"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import PostCard from "@/components/PostCard";
import { api, PostDetail, SkillLevel } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const LIMIT = 12;
const SKILL_LEVELS: (SkillLevel | "ALL")[] = ["ALL", "BEGINNER", "INTERMEDIATE", "EXPERIENCED"];

export default function Feed() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<PostDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"feed" | "trending">("feed");
  const [skillLevel, setSkillLevel] = useState<SkillLevel | "ALL">("ALL");

  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);
  useEffect(() => { if (user) loadMore(0); }, [user, tab, skillLevel]);

  async function loadMore(skip: number) {
    setLoading(true);
    try {
      let batch: PostDetail[];
      if (tab === "trending") {
        batch = await api<PostDetail[]>(`/api/posts/trending?limit=${LIMIT}`);
        setPosts(batch);
      } else {
        const query = skillLevel === "ALL" ? "" : `&skillLevel=${skillLevel}`;
        batch = await api<PostDetail[]>(`/api/posts/feed?skip=${skip}&limit=${LIMIT}${query}`);
        setPosts((p) => skip === 0 ? batch : [...p, ...batch]);
      }
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

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/10">
          {(["feed", "trending"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSkillLevel("ALL"); }}
              className={`px-4 py-3 font-medium transition border-b-2 ${
                tab === t
                  ? "border-green-500 text-white"
                  : "border-transparent text-white/55 hover:text-white"
              }`}
            >
              {t === "feed" ? "For You" : "Trending"}
            </button>
          ))}
        </div>

        {/* Skill Filter (only on feed tab) */}
        {tab === "feed" && (
          <div className="mb-6 flex gap-2">
            {SKILL_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setSkillLevel(level)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  skillLevel === level
                    ? "bg-green-500 text-white"
                    : "bg-white/5 text-white/55 hover:bg-white/10"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        )}

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
            {hasMore && tab === "feed" && (
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
