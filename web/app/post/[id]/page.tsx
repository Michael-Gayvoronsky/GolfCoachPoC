"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { api } from "@/lib/api";
import type { PostDetail, Comment, UserProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const skillColors: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-300",
  INTERMEDIATE: "bg-blue-500/20 text-blue-300",
  EXPERIENCED: "bg-amber-500/20 text-amber-300",
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<PostDetail>(`/api/posts/${id}`).then((p) => {
      setPost(p);
      setLiked(p.isLikedByMe);
      setLikeCount(p.likeCount);
      loadComments();
      loadAuthor(p.author.id);
    }).catch(() => setError("Could not load post."));
  }, [id]);

  async function loadComments() {
    try {
      const data = await api<Comment[]>(`/api/posts/${id}/comments?skip=0&limit=50`);
      setComments(data);
    } catch (e) {
      console.error("Failed to load comments");
    }
  }

  async function loadAuthor(authorId: string) {
    try {
      const data = await api<UserProfile>(`/api/users/${authorId}/stats`);
      setAuthor(data);
      setFollowing(data.isFollowedByMe);
    } catch (e) {
      console.error("Failed to load author");
    }
  }

  async function handleLike() {
    if (!post) return;
    try {
      if (liked) {
        await api(`/api/posts/${post.id}/like`, { method: "DELETE" });
        setLiked(false);
        setLikeCount(Math.max(0, likeCount - 1));
      } else {
        await api(`/api/posts/${post.id}/like`, { method: "POST" });
        setLiked(true);
        setLikeCount(likeCount + 1);
      }
    } catch (e) {
      console.error("Failed to toggle like");
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!post || !user || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const data = await api<Comment>(`/api/posts/${post.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment }),
      });
      setComments([data, ...comments]);
      setNewComment("");
    } catch (e) {
      console.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleFollow() {
    if (!author || !user) return;
    try {
      if (following) {
        await api(`/api/users/${author.id}/follow`, { method: "DELETE" });
        setFollowing(false);
      } else {
        await api(`/api/users/${author.id}/follow`, { method: "POST" });
        setFollowing(true);
      }
    } catch (e) {
      console.error("Failed to toggle follow");
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <TopNav />
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-lg mb-4">{error}</div>}
        {!post && !error && (
          <div className="text-white/55 text-center py-16">Loading…</div>
        )}
        {post && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Media Section */}
            <div className="lg:col-span-2">
              <div className="bg-black rounded-2xl overflow-hidden mb-6">
                {post.mediaType === "image" ? (
                  <img src={post.mediaUrl} alt="" className="w-full max-h-[600px] object-contain" />
                ) : (
                  <video src={post.mediaUrl} controls className="w-full max-h-[600px]" />
                )}
              </div>

              {/* Engagement Buttons */}
              <div className="flex gap-4 mb-8">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    liked
                      ? "bg-red-500/20 text-red-300"
                      : "bg-white/5 text-white/55 hover:bg-white/10"
                  }`}
                >
                  <span className="text-lg">{liked ? "♥" : "♡"}</span>
                  <span>{likeCount}</span>
                </button>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/55">
                  <span>💬</span>
                  <span>{comments.length}</span>
                </div>
              </div>

              {/* Caption */}
              {post.caption && (
                <div className="mb-8">
                  <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-white/10 pt-8">
                <h2 className="text-lg font-semibold mb-6">Comments</h2>

                {/* Comment Input */}
                {user && (
                  <form onSubmit={handleComment} className="mb-8">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment…"
                        className="flex-1 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 focus:border-green-500 focus:outline-none transition text-white placeholder:text-white/40"
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim() || submittingComment}
                        className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 font-medium disabled:opacity-50 transition"
                      >
                        {submittingComment ? "…" : "Send"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Comments List */}
                {comments.length === 0 ? (
                  <p className="text-white/55 text-center py-8">No comments yet. Start the conversation!</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 pb-4 border-b border-white/5 last:border-b-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{comment.displayName}</span>
                            <span className="text-[10px] text-white/40">{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-white/70 text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Author Info Sidebar */}
            {author && (
              <div className="lg:col-span-1">
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 sticky top-24">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{author.displayName}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${skillColors[author.skillLevel] || ""}`}>
                        {author.skillLevel}
                      </span>
                    </div>
                    {user && user.userId !== author.id && (
                      <button
                        onClick={handleFollow}
                        className={`ml-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                          following
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-green-500 hover:bg-green-600"
                        }`}
                      >
                        {following ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>

                  {author.bio && (
                    <p className="text-sm text-white/70 mb-6">{author.bio}</p>
                  )}

                  <div className="space-y-3 border-t border-white/10 pt-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/55">Posts</span>
                      <span className="font-semibold">{author.postCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/55">Followers</span>
                      <span className="font-semibold">{author.followerCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/55">Following</span>
                      <span className="font-semibold">{author.followingCount}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-3 border-t border-white/10">
                      <span className="text-white/55">Likes Received</span>
                      <span className="font-semibold">{author.totalLikes}</span>
                    </div>
                  </div>

                  <Link
                    href={`/profile/${author.id}`}
                    className="block mt-6 text-center py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
