"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AGE, FEATURED_PHOTO, MESSAGE, NAME } from "@/lib/config";

type Photo = { id: number; url: string; caption: string };

const POLL_MS = 5000;
const PAGE_MS = 9000;
const PAD = 10;
const GAP = 16;
const CAPTION_H = 64;

type Card = { photo: Photo; w: number; h: number };
type Row = { cards: Card[]; height: number };

function layoutPages(photos: Photo[], ratios: Record<number, number>, W: number, H: number): Row[][] {
  if (W < 50 || H < 50) return [];
  const target = Math.max(120, (H - GAP) / 2 - PAD - CAPTION_H);
  const rows: Row[] = [];
  let cur: Photo[] = [];
  const fitH = (list: Photo[]) => {
    const sumA = list.reduce((a, p) => a + ratios[p.id], 0);
    return (W - list.length * 2 * PAD - (list.length - 1) * GAP) / sumA;
  };
  const build = (list: Photo[]): Row => {
    const h = Math.min(fitH(list), target);
    return {
      cards: list.map((p) => ({ photo: p, w: ratios[p.id] * h + 2 * PAD, h })),
      height: h + PAD + CAPTION_H,
    };
  };
  for (const p of photos) {
    if (ratios[p.id] === undefined) continue;
    cur.push(p);
    if (fitH(cur) <= target) { rows.push(build(cur)); cur = []; }
  }
  if (cur.length) rows.push(build(cur));

  const pages: Row[][] = [];
  let page: Row[] = [], used = 0;
  for (const r of rows) {
    const need = r.height + (page.length ? GAP : 0);
    if (page.length && used + need > H) { pages.push(page); page = []; used = 0; }
    page.push(r); used += r.height + (page.length > 1 ? GAP : 0);
  }
  if (page.length) pages.push(page);
  return pages;
}

function ScallopFrame({ src }: { src: string }) {
  const W = 600, H = 800, r = 20;
  const circles = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    const step = r * 1.55;
    const jig = (i: number) => Math.sin(i * 12.9898) * 1.5;
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
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const [area, setArea] = useState({ w: 0, h: 0 });
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/photos", { cache: "no-store" });
        if (!res.ok) return;
        const data: Photo[] = await res.json();
        if (!alive) return;
        setPhotos((prev) => { if (data.length > prev.length) setPage(0); return data; });
      } catch { /* keep showing what we have */ }
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    photos.forEach((p) => {
      if (ratios[p.id] !== undefined) return;
      const img = new Image();
      const done = (r: number) => setRatios((prev) => (prev[p.id] === undefined ? { ...prev, [p.id]: r } : prev));
      img.onload = () => done(img.naturalWidth / img.naturalHeight || 1);
      img.onerror = () => done(1);
      img.src = p.url;
    });
  }, [photos, ratios]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wallPages = useMemo(() => layoutPages(photos, ratios, area.w, area.h - 36), [photos, ratios, area]);
  const pages = Math.max(1, wallPages.length);
  useEffect(() => {
    if (pages < 2) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages), PAGE_MS);
    return () => clearInterval(t);
  }, [pages]);

  const visibleRows = wallPages[page % pages] ?? [];

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-white">
      <div className="absolute left-[3vw] top-[2vh] z-10 text-[11vh] font-bold leading-none">{NAME}</div>

      <div className="absolute left-[3vw] top-[15vh] h-[58vh]"><ScallopFrame src={FEATURED_PHOTO} /></div>
      <div className="absolute bottom-[3vh] left-[3vw] flex items-baseline gap-[2vw]">
        <span className="text-[8vh] font-bold leading-none">{MESSAGE}</span>
        <span className="text-[14vh] font-bold leading-none">{AGE}</span>
      </div>

      <section className="absolute right-0 top-0 h-[68vh] w-[68vw] p-[1.2vw]">
        {photos.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-center text-[6vh] text-neutral-500">
            Scan the code to add the first photo
          </p>
        )}
        <div ref={areaRef} className="flex h-full w-full flex-col" style={{ gap: GAP }}>
          {visibleRows.map((row, ri) => (
            <div key={ri} className="flex" style={{ gap: GAP }}>
              {row.cards.map((c) => (
                <figure key={c.photo.id} className="shrink-0 bg-white shadow-[0_3px_10px_rgba(0,0,0,.25)] ring-1 ring-neutral-300"
                  style={{ width: c.w, padding: `${PAD}px ${PAD}px 0` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.photo.url} alt={c.photo.caption} style={{ width: "100%", height: c.h }} className="block object-cover" />
                  <figcaption className="flex items-center justify-center overflow-hidden text-center text-[2.4vh] font-bold leading-[1.05]"
                    style={{ height: CAPTION_H }}>
                    <span className="line-clamp-2 px-1">{c.photo.caption}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
        {pages > 1 && (
          <div className="absolute bottom-[0.5vh] left-1/2 text-[2.4vh] text-neutral-400">{(page % pages) + 1} / {pages}</div>
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
