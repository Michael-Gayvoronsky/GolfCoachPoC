"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TopNav from "@/components/TopNav";
import { api, Post } from "@/lib/api";

const skillColors: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-300",
  INTERMEDIATE: "bg-blue-500/20 text-blue-300",
  EXPERIENCED: "bg-amber-500/20 text-amber-300",
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Post>(`/api/posts/${id}`).then(setPost).catch(() => setError("Could not load post."));
  }, [id]);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && <div className="text-red-300">{error}</div>}
        {!post && !error && <div className="text-white/55 text-center py-16">Loading…</div>}
        {post && (
          <>
            <div className="bg-black rounded-2xl overflow-hidden mb-6">
              {post.mediaType === "image" ? (
                <img src={post.mediaUrl} alt="" className="w-full max-h-[600px] object-contain" />
              ) : (
                <video src={post.mediaUrl} controls className="w-full max-h-[600px]" />
              )}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold">{post.author.displayName}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${skillColors[post.author.skillLevel] || ""}`}>
                {post.author.skillLevel}
              </span>
            </div>
            {post.caption && <p className="text-white/80 leading-relaxed">{post.caption}</p>}
          </>
        )}
      </main>
    </div>
  );
}
