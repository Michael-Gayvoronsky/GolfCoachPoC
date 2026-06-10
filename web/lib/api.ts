export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERIENCED";
export type AuthUser = { token: string; userId: string; email: string; displayName: string; skillLevel: SkillLevel };
export type Author = { id: string; displayName: string; skillLevel: SkillLevel; avatarUrl: string | null };
export type Post = { id: string; caption: string | null; mediaUrl: string; mediaType: string; createdAt: string; author: Author };

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
