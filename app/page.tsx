"use client";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AGE, FEATURED_PHOTO, MESSAGE, NAME } from "@/lib/config";

type Photo = { id: number; url: string; caption: string };

const POLL_MS = 5000;
const PAGE_MS = 9000;
// Positions (% of collage area) and tilt for each polaroid on a page.
const SLOTS = [
  { top: 2, left: 4, rot: -5 }, { top: 4, left: 35, rot: 3 }, { top: 2, left: 66, rot: -3 },
  { top: 30, left: 18, rot: 4 }, { top: 32, left: 50, rot: -4 },
  { top: 58, left: 3, rot: -3 }, { top: 60, left: 35, rot: 5 },
];

function ScallopFrame({ src }: { src: string }) {
  const W = 600, H = 800, r = 20;
  const circles = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    const step = r * 1.55;
    const jig = (i: number) => Math.sin(i * 12.9898) * 1.5; // slight hand-drawn wobble
    for (let x = r, i = 0; x <= W - r + 1; x += step, i++) { out.push({ x, y: r + jig(i) }, { x, y: H - r + jig(i + 7) }); }
    for (let y = r + step, i = 0; y <= H - r - step + 1; y += step, i++) { out.push({ x: r + jig(i + 3), y }, { x: W - r + jig(i + 5), y }); }
    return out;
  }, []);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-auto" aria-hidden>
      <defs><clipPath id="ph"><rect x={r + 14} y={r + 14} width={W - 2 * r - 28} height={H - 2 * r - 28} /></clipPath></defs>
      {circles.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={r} fill="#fff" stroke="#111" strokeWidth="3" />)}
      <rect x={r - 2} y={r - 2} width={W - 2 * r + 4} height={H - 2 * r + 4} fill="#fff" />
      <image href={src} x={r + 14} y={r + 14} width={W - 2 * r - 28} height={H - 2 * r - 28}
        preserveAspectRatio="xMidYMid slice" clipPath="url(#ph)" />
      <rect x={r + 14} y={r + 14} width={W - 2 * r - 28} height={H - 2 * r - 28} fill="none" stroke="#111" strokeWidth="3" />
    </svg>
  );
}

export default function Dashboard() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(0);
  const [origin, setOrigin] = useState("");
  const perPage = SLOTS.length;

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/photos", { cache: "no-store" });
        if (!res.ok) return;
        const data: Photo[] = await res.json();
        if (!alive) return;
        // New photo arrived -> jump back to page 1 so it is seen straight away.
        setPhotos((prev) => { if (data.length > prev.length) setPage(0); return data; });
      } catch { /* keep showing what we have */ }
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const pages = Math.max(1, Math.ceil(photos.length / perPage));
  useEffect(() => {
    if (pages < 2) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages), PAGE_MS);
    return () => clearInterval(t);
  }, [pages]);

  const visible = photos.slice((page % pages) * perPage, (page % pages) * perPage + perPage);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-white">
      <div className="absolute left-[3vw] top-[2vh] z-10 text-[11vh] font-bold leading-none">{NAME}</div>

      <div className="absolute left-[3vw] top-[15vh] h-[58vh]"><ScallopFrame src={FEATURED_PHOTO} /></div>
      <div className="absolute bottom-[3vh] left-[3vw] flex items-baseline gap-[2vw]">
        <span className="text-[8vh] font-bold leading-none">{MESSAGE}</span>
        <span className="text-[14vh] font-bold leading-none">{AGE}</span>
      </div>

      <section className="absolute right-0 top-0 h-full w-[56vw]">
        {photos.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-center text-[6vh] text-neutral-500">
            Scan the code to add the first photo
          </p>
        )}
        {visible.map((p, i) => (
          <figure key={p.id} className="absolute w-[28vh] bg-white p-[1.3vh] pb-0 shadow-[0_4px_14px_rgba(0,0,0,.28)] ring-1 ring-neutral-300"
            style={{ top: `${SLOTS[i].top}%`, left: `${SLOTS[i].left}%`, transform: `rotate(${SLOTS[i].rot}deg)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption} className="aspect-square w-full object-cover" />
            <figcaption className="flex h-[8vh] items-center justify-center overflow-hidden text-center text-[2.8vh] font-bold leading-tight">
              {p.caption}
            </figcaption>
          </figure>
        ))}
        {pages > 1 && (
          <div className="absolute bottom-[2vh] left-[40%] text-[2.4vh] text-neutral-400">{(page % pages) + 1} / {pages}</div>
        )}
      </section>

      {origin && (
        <div className="absolute bottom-[3vh] right-[2.5vw] z-10 flex flex-col items-center gap-[1vh]">
          <div className="bg-white p-[1.2vh]"><QRCodeSVG value={`${origin}/submit`} size={200} level="M" className="!h-[22vh] !w-[22vh]" /></div>
          <span className="text-[3.2vh] font-bold">Scan to add your photo</span>
        </div>
      )}
    </main>
  );
}
