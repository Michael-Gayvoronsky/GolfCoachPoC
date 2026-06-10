import Link from "next/link";
import type { Post } from "@/lib/api";

const skillColors: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-300",
  INTERMEDIATE: "bg-blue-500/20 text-blue-300",
  EXPERIENCED: "bg-amber-500/20 text-amber-300",
};

export default function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/post/${post.id}`} className="block bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden hover:bg-white/[0.06] hover:border-green-500/25 hover:-translate-y-1 transition group">
      <div className="aspect-[4/3] bg-black/40 overflow-hidden">
        {post.mediaType === "image" ? (
          <img src={post.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
            <span className="text-5xl text-white/40">▶</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold">{post.author.displayName}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${skillColors[post.author.skillLevel] || ""}`}>
            {post.author.skillLevel}
          </span>
        </div>
        {post.caption && <p className="text-sm text-white/60 line-clamp-2">{post.caption}</p>}
      </div>
    </Link>
  );
}
