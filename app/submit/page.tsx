"use client";
import { useEffect, useRef, useState } from "react";
import { ALLOWED_TYPES, MAX_CAPTION, NAME } from "@/lib/config";

// Shrinks the photo in the browser so uploads are fast and always under the size limit.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("fail"))), "image/jpeg", 0.85));
}

export default function Submit() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview("");
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  function pick(f?: File) {
    setMsg(null);
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) return setMsg({ ok: false, text: "Please choose a JPG, PNG or WebP photo." });
    setFile(f);
  }

  async function post() {
    if (!file) return setMsg({ ok: false, text: "Choose or take a photo first." });
    if (!caption.trim()) return setMsg({ ok: false, text: "Write a caption first." });
    setBusy(true); setMsg(null);
    try {
      const blob = await shrink(file);
      const fd = new FormData();
      fd.append("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
      fd.append("caption", caption.trim());
      const res = await fetch("/api/photos", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed. Please try again.");
      setMsg({ ok: true, text: "Posted! Look up at the screen." });
      setFile(null); setCaption("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed. Please try again." });
    } finally { setBusy(false); }
  }

  const btn = "w-full rounded-xl border-2 border-black py-3 text-2xl font-bold active:bg-neutral-100";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-5">
      <h1 className="text-5xl font-bold">Add a photo for {NAME}</h1>

      {preview ? (
        <div className="bg-white p-3 pb-0 shadow-md ring-1 ring-neutral-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="block max-h-[60vh] w-full object-contain" />
          <div className="h-10" />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-neutral-400 text-2xl text-neutral-500">
          Your photo will show here
        </div>
      )}

      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <div className="grid grid-cols-2 gap-3">
        <button className={btn} onClick={() => cam.current?.click()}>Take photo</button>
        <button className={btn} onClick={() => gal.current?.click()}>Choose photo</button>
      </div>

      <label className="text-2xl font-bold" htmlFor="cap">Caption</label>
      <input id="cap" value={caption} maxLength={MAX_CAPTION} onChange={(e) => setCaption(e.target.value)}
        placeholder="Write something sweet"
        className="rounded-xl border-2 border-black px-4 py-3 text-2xl outline-none focus:ring-2 focus:ring-black" />
      <div className="-mt-3 text-right text-lg text-neutral-500">{caption.length}/{MAX_CAPTION}</div>

      <button disabled={busy || !file || !caption.trim()} onClick={post}
        className="w-full rounded-xl bg-black py-4 text-3xl font-bold text-white disabled:opacity-40">
        {busy ? "Posting…" : "Post"}
      </button>

      {msg && <p role="status" className={`rounded-xl border-2 p-3 text-center text-2xl font-bold ${msg.ok ? "border-black" : "border-red-600 text-red-700"}`}>{msg.text}</p>}
    </main>
  );
}
