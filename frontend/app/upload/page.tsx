"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD!;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET!;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"];

export default function Upload() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (ready && !user) router.replace("/login"); }, [ready, user, router]);

  function onFile(f: File | null) {
    if (!f) return;
    if (!ALLOWED.includes(f.type)) { setError("Unsupported file type."); return; }
    setError(null);
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!file) return;
    setUploading(true); setError(null); setProgress(0);
    try {
      const mediaUrl = await uploadCloudinary(file, setProgress);
      const mediaType = file.type.startsWith("video") ? "video" : "image";
      await api("/api/posts", {
        method: "POST",
        body: JSON.stringify({ caption: caption.trim() || null, mediaUrl, mediaType, fileSize: file.size, contentType: file.type }),
      });
      router.push("/feed");
    } catch (e: any) { setError("Upload failed. Please try again."); console.error(e); }
    finally { setUploading(false); }
  }

  if (!ready || !user) return null;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Share Your Swing</h1>
        <p className="text-white/55 mt-1 mb-8">Upload a photo or video and get feedback from the community</p>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-lg text-sm mb-4">{error}</div>}

        <input ref={fileRef} type="file" accept={ALLOWED.join(",")} hidden onChange={(e) => onFile(e.target.files?.[0] || null)} />

        {!preview ? (
          <div onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0] || null); }}
            className="border-2 border-dashed border-white/15 rounded-2xl py-16 px-4 text-center cursor-pointer hover:border-green-500 transition">
            <div className="text-5xl mb-3">📷</div>
            <p>Drag & drop or <strong>click to select</strong></p>
            <p className="text-xs text-white/40 mt-2">Images up to 10 MB · Videos up to 100 MB</p>
          </div>
        ) : (
          <div className="text-center">
            {file?.type.startsWith("video") ? (
              <video src={preview} controls className="max-w-full max-h-80 mx-auto rounded-xl" />
            ) : (
              <img src={preview} alt="" className="max-w-full max-h-80 mx-auto rounded-xl" />
            )}
            <button onClick={() => { setFile(null); setPreview(null); }} className="text-sm text-white/60 hover:text-white mt-3">Change file</button>
          </div>
        )}

        <label className="block mt-6">
          <span className="text-sm font-medium block mb-1.5">Caption <span className="text-white/40">(optional)</span></span>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} rows={3} placeholder="Describe your swing or ask a question…"
            className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/15 focus:border-green-500 focus:outline-none transition resize-none" />
          <div className="text-xs text-white/40 text-right mt-1">{caption.length} / 500</div>
        </label>

        {uploading && (
          <div className="mt-4 bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="bg-green-500 h-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <button onClick={submit} disabled={!file || uploading} className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-600 font-semibold mt-4 disabled:opacity-50 transition">
          {uploading ? `Uploading… ${progress}%` : "Post"}
        </button>
      </main>
    </div>
  );
}

function uploadCloudinary(file: File, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText).secure_url) : reject(xhr.responseText);
    xhr.onerror = () => reject("Upload failed");
    xhr.send(fd);
  });
}
