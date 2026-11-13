"use client";

import Link from "next/link";

import { useCallback, useEffect, useReducer, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

type Layer = {
  id: string; kind: "text" | "rectangle" | "ellipse" | "image"; name: string;
  blend: string; src: string; tile: boolean; gap: number;
  text: string; x: number; y: number; width: number; height: number;
  size: number; color: string; opacity: number; visible: boolean;
  font: string; bold: boolean; italic: boolean; align: "left" | "center" | "right";
  rotation: number; strokeColor: string; strokeWidth: number; shadow: number; radius: number;
};
type Settings = {
  brightness: number; contrast: number; saturation: number; exposure: number;
  warmth: number; grayscale: number; sepia: number; vignette: number;
  hue: number; highlights: number; shadows: number; sharpen: number; blur: number; grain: number;
  rotation: number; flipX: boolean; flipY: boolean;
  cropX: number; cropY: number; cropW: number; cropH: number;
  layers: Layer[];
};
type History = { past: Settings[]; present: Settings; future: Settings[]; base: Settings | null };
type Action = { type: "edit" | "live"; patch: Partial<Settings> } | { type: "commit" | "undo" | "redo" } | { type: "replace"; value: Settings };
type Asset = { image: HTMLImageElement; data: string; name: string };
type Project = { settings: Settings; data: string; name: string };

const INITIAL: Settings = {
  brightness: 100, contrast: 100, saturation: 100, exposure: 0, warmth: 0,
  grayscale: 0, sepia: 0, vignette: 0, hue: 0, highlights: 0, shadows: 0, sharpen: 0, blur: 0, grain: 0,
  rotation: 0, flipX: false, flipY: false,
  cropX: 0, cropY: 0, cropW: 100, cropH: 100, layers: [],
};
const FONTS = ["sans-serif", "serif", "monospace", "Noto Sans Bengali", "Arial", "Georgia", "Impact"];
const BLENDS: [string, string][] = [
  ["source-over", "Normal"], ["multiply", "Multiply"], ["screen", "Screen"], ["overlay", "Overlay"],
  ["soft-light", "Soft light"], ["hard-light", "Hard light"], ["darken", "Darken"], ["lighten", "Lighten"],
  ["color-dodge", "Colour dodge"], ["color-burn", "Colour burn"], ["difference", "Difference"], ["exclusion", "Exclusion"],
  ["hue", "Hue"], ["saturation", "Saturation"], ["color", "Colour"], ["luminosity", "Luminosity"],
];
const IMG_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const imgCache = new Map<string, { src: string; img: HTMLImageElement }>();
async function cacheLayerImage(id: string, src: string) { const img = await decode(src); imgCache.set(id, { src, img }); }
function defaultLayer(id: string, kind: Layer["kind"]): Layer {
  return { id, kind, name: kind === "text" ? "Text layer" : kind, text: kind === "text" ? "ALIMXL" : "", x: 50, y: 50, width: 32, height: 20, size: 7,
    color: kind === "text" ? "#FFFFFF" : "#D4AF37", opacity: 100, visible: true, font: "sans-serif", bold: true, italic: false, align: "center",
    rotation: 0, strokeColor: "#000000", strokeWidth: 0, shadow: 0, radius: 0, blend: "source-over", src: "", tile: false, gap: 20 };
}
const MAX_PIXELS = 16_000_000;
const same = (a: Settings, b: Settings) => JSON.stringify(a) === JSON.stringify(b);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : d);

function settled(s: History): History {
  if (!s.base) return s;
  return { ...s, past: same(s.base, s.present) ? s.past : [...s.past, s.base].slice(-40), base: null };
}
function reducer(s: History, a: Action): History {
  if (a.type === "replace") return { past: [], present: a.value, future: [], base: null };
  if (a.type === "commit") return settled(s);
  if (a.type === "live") return { ...s, base: s.base ?? s.present, present: { ...s.present, ...a.patch }, future: [] };
  s = settled(s);
  if (a.type === "edit") {
    const next = { ...s.present, ...a.patch };
    return same(next, s.present) ? s : { past: [...s.past, s.present].slice(-40), present: next, future: [], base: null };
  }
  if (a.type === "undo") {
    const previous = s.past.at(-1);
    return previous ? { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future].slice(0, 40), base: null } : s;
  }
  const next = s.future[0];
  return next ? { past: [...s.past, s.present].slice(-40), present: next, future: s.future.slice(1), base: null } : s;
}
function crop(image: HTMLImageElement, s: Settings) {
  const x = clamp(s.cropX, 0, 99) / 100 * image.naturalWidth;
  const y = clamp(s.cropY, 0, 99) / 100 * image.naturalHeight;
  return { x, y, w: Math.max(1, Math.min(s.cropW / 100 * image.naturalWidth, image.naturalWidth - x)), h: Math.max(1, Math.min(s.cropH / 100 * image.naturalHeight, image.naturalHeight - y)) };
}
function aspect(image: HTMLImageElement, s: Settings) {
  const c = crop(image, s);
  return s.rotation % 180 ? c.h / c.w : c.w / c.h;
}
function canvas2d(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser cannot create a 2D canvas.");
  return ctx;
}
function fontString(l: Layer, fs: number) {
  const fam = ["sans-serif", "serif", "monospace"].includes(l.font) ? l.font : `"${l.font}", sans-serif`;
  return `${l.italic ? "italic " : ""}${l.bold ? 700 : 400} ${fs}px ${fam}`;
}
function paintImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, lw: number, lh: number, radius: number) {
  ctx.save();
  if (radius && typeof ctx.roundRect === "function") { ctx.beginPath(); ctx.roundRect(cx - lw / 2, cy - lh / 2, lw, lh, Math.min(lw, lh) * radius / 100); ctx.clip(); }
  ctx.drawImage(img, cx - lw / 2, cy - lh / 2, lw, lh); ctx.restore();
}
function drawLayer(ctx: CanvasRenderingContext2D, l: Layer, w: number, h: number) {
  ctx.save(); ctx.globalAlpha = l.opacity / 100; ctx.fillStyle = l.color; ctx.strokeStyle = l.strokeColor; ctx.lineJoin = "round";
  ctx.globalCompositeOperation = l.blend as GlobalCompositeOperation;
  ctx.translate(l.x / 100 * w, l.y / 100 * h); ctx.rotate(l.rotation * Math.PI / 180);
  const base = l.kind === "text" ? Math.max(1, l.size / 100 * w) : w * 0.05;
  if (l.shadow) { ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = l.shadow / 100 * base * 0.5; ctx.shadowOffsetX = ctx.shadowOffsetY = l.shadow / 100 * base * 0.12; }
  if (l.kind === "text") {
    const fs = base; ctx.font = fontString(l, fs); ctx.textBaseline = "middle"; ctx.textAlign = l.align;
    const lines = l.text.split("\n"); const maxW = w * 0.98;
    const block = Math.min(maxW, Math.max(...lines.map(t => ctx.measureText(t).width)));
    const ox = l.align === "left" ? -block / 2 : l.align === "right" ? block / 2 : 0;
    ctx.lineWidth = l.strokeWidth / 100 * fs;
    lines.forEach((line, i) => {
      const ty = (i - (lines.length - 1) / 2) * fs * 1.25;
      if (l.strokeWidth) ctx.strokeText(line, ox, ty, maxW);
      ctx.fillText(line, ox, ty, maxW);
    });
  } else if (l.kind === "image") {
    const c = imgCache.get(l.id);
    if (c && c.src === l.src) {
      const img = c.img, lw = l.width / 100 * w, lh = lw * img.naturalHeight / img.naturalWidth;
      if (l.tile) {
        ctx.setTransform(1, 0, 0, 1, w / 2, h / 2); ctx.rotate(l.rotation * Math.PI / 180);
        const gp = l.gap / 100 * lw, sx = Math.max(w * 0.02, lw + gp), sy = Math.max(w * 0.02, lh + gp), ext = Math.hypot(w, h) / 2 + sx;
        if ((2 * ext / sx) * (2 * ext / sy) <= 2500) {
          let row = 0;
          for (let y = -ext; y < ext; y += sy, row++) for (let x = -ext + (row % 2) * sx / 2; x < ext; x += sx) paintImage(ctx, img, x, y, lw, lh, l.radius);
        }
      } else paintImage(ctx, img, 0, 0, lw, lh, l.radius);
    }
  } else {
    const lw = l.width / 100 * w, lh = l.height / 100 * h; ctx.lineWidth = l.strokeWidth / 1000 * w;
    ctx.beginPath();
    if (l.kind === "ellipse") ctx.ellipse(0, 0, lw / 2, lh / 2, 0, 0, Math.PI * 2);
    else if (l.radius && typeof ctx.roundRect === "function") ctx.roundRect(-lw / 2, -lh / 2, lw, lh, Math.min(lw, lh) * l.radius / 100);
    else ctx.rect(-lw / 2, -lh / 2, lw, lh);
    ctx.fill(); if (l.strokeWidth) { ctx.shadowColor = "transparent"; ctx.stroke(); }
  }
  ctx.restore();
}
function draw(canvas: HTMLCanvasElement, image: HTMLImageElement, s: Settings, width: number, background: string | null) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(w / aspect(image, s)));
  if (w > 8192 || h > 8192 || w * h > MAX_PIXELS) throw new Error("Output exceeds the 8192 px / 16 megapixel limit.");
  canvas.width = w; canvas.height = h;
  const ctx = canvas2d(canvas);
  const c = crop(image, s);
  const rotated = s.rotation % 180 !== 0;
  const scale = w / (rotated ? c.h : c.w);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.save(); ctx.translate(w / 2, h / 2);
  ctx.rotate(s.rotation * Math.PI / 180);
  ctx.scale(s.flipX ? -1 : 1, s.flipY ? -1 : 1);
  if (s.blur) ctx.filter = `blur(${s.blur / 100 * w * 0.03}px)`;
  ctx.drawImage(image, c.x, c.y, c.w, c.h, -c.w * scale / 2, -c.h * scale / 2, c.w * scale, c.h * scale);
  ctx.restore();
  const adjusted = s.brightness !== 100 || s.contrast !== 100 || s.saturation !== 100 || s.exposure || s.warmth || s.grayscale || s.sepia || s.vignette || s.hue || s.highlights || s.shadows || s.grain || s.sharpen;
  if (adjusted) {
    const pixels = ctx.getImageData(0, 0, w, h); const d = pixels.data;
    const brightness = s.brightness / 100 * Math.pow(2, s.exposure);
    const contrast = s.contrast / 100; const saturation = s.saturation / 100;
    const gray = s.grayscale / 100; const sepia = s.sepia / 100;
    const ha = s.hue * Math.PI / 180, cs = Math.cos(ha), sn = Math.sin(ha);
    for (let i = 0; i < d.length; i += 4) {
      let r = ((d[i] * brightness - 128) * contrast + 128) + s.warmth * 0.45;
      let g = (d[i + 1] * brightness - 128) * contrast + 128;
      let b = ((d[i + 2] * brightness - 128) * contrast + 128) - s.warmth * 0.45;
      if (s.hue) {
        const nr = r * (0.213 + cs * 0.787 - sn * 0.213) + g * (0.715 - cs * 0.715 - sn * 0.715) + b * (0.072 - cs * 0.072 + sn * 0.928);
        const ng = r * (0.213 - cs * 0.213 + sn * 0.143) + g * (0.715 + cs * 0.285 + sn * 0.14) + b * (0.072 - cs * 0.072 - sn * 0.283);
        const nb = r * (0.213 - cs * 0.213 - sn * 0.787) + g * (0.715 - cs * 0.715 + sn * 0.715) + b * (0.072 + cs * 0.928 + sn * 0.072);
        r = nr; g = ng; b = nb;
      }
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (s.shadows || s.highlights) {
        const t = clamp(lum / 255, 0, 1);
        const lift = s.shadows / 100 * (1 - t) * (1 - t) * 60 + s.highlights / 100 * t * t * 60;
        r += lift; g += lift; b += lift;
      }
      r = lum + (r - lum) * saturation * (1 - gray);
      g = lum + (g - lum) * saturation * (1 - gray);
      b = lum + (b - lum) * saturation * (1 - gray);
      const sr = r * 0.393 + g * 0.769 + b * 0.189;
      const sg = r * 0.349 + g * 0.686 + b * 0.168;
      const sb = r * 0.272 + g * 0.534 + b * 0.131;
      r += (sr - r) * sepia; g += (sg - g) * sepia; b += (sb - b) * sepia;
      if (s.grain) {
        const f = Math.sin(i * 12.9898) * 43758.5453; const n = ((f - Math.floor(f)) - 0.5) * s.grain * 1.2;
        r += n; g += n; b += n;
      }
      let v = 1;
      if (s.vignette) {
        const index = i / 4; const x = (index % w) / w - 0.5; const y = Math.floor(index / w) / h - 0.5;
        v = 1 - clamp((x * x + y * y) * 1.8, 0, 0.9) * s.vignette / 100;
      }
      d[i] = r * v; d[i + 1] = g * v; d[i + 2] = b * v;
    }
    if (s.sharpen) {
      const k = s.sharpen / 100 * 0.8; const src = new Uint8ClampedArray(d);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const p = (y * w + x) * 4;
        for (let ch = 0; ch < 3; ch++) d[p + ch] = src[p + ch] * (1 + 4 * k) - k * (src[p + ch - 4] + src[p + ch + 4] + src[p + ch - w * 4] + src[p + ch + w * 4]);
      }
    }
    ctx.putImageData(pixels, 0, 0);
  }
  for (const layer of s.layers) if (layer.visible) drawLayer(ctx, layer, w, h);
  if (background) { ctx.save(); ctx.globalCompositeOperation = "destination-over"; ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); ctx.restore(); }
}
function drawHistogram(src: HTMLCanvasElement, dst: HTMLCanvasElement) {
  const { data } = canvas2d(src).getImageData(0, 0, src.width, src.height);
  const bins = [0, 1, 2].map(() => new Array<number>(64).fill(0));
  const step = Math.max(1, Math.floor(data.length / 4 / 60000)) * 4;
  for (let i = 0; i < data.length; i += step) for (let c = 0; c < 3; c++) bins[c][data[i + c] >> 2]++;
  const max = Math.max(1, ...bins.flat());
  const ctx = canvas2d(dst); ctx.clearRect(0, 0, dst.width, dst.height); ctx.globalCompositeOperation = "lighter";
  ["rgba(248,113,113,.8)", "rgba(74,222,128,.8)", "rgba(96,165,250,.8)"].forEach((col, c) => {
    ctx.fillStyle = col; bins[c].forEach((n, i) => { const bh = n / max * dst.height; ctx.fillRect(i * 4, dst.height - bh, 4, bh); });
  });
}
function safeName(name: string) { return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").slice(0, 100).trim() || "alimxl-photo"; }
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function decode(data: string) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Unable to decode the image.")); image.src = data; });
  if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error("Use an image up to 40 megapixels.");
  return image;
}
function fileData(file: File) {
  return new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => typeof r.result === "string" ? resolve(r.result) : reject(new Error("Invalid image data.")); r.onerror = () => reject(new Error("Unable to read file.")); r.readAsDataURL(file); });
}
/* ---------- offline autosave (IndexedDB) ---------- */
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => { const r = indexedDB.open("alimxl-photo", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function kvGet(key: string): Promise<unknown> {
  const db = await idb();
  return new Promise((res, rej) => { const q = db.transaction("kv").objectStore("kv").get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
async function kvSet(key: string, value: unknown) {
  const db = await idb();
  return new Promise<void>((res, rej) => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(value, key); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
}
async function kvDel(key: string) {
  const db = await idb();
  return new Promise<void>((res, rej) => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").delete(key); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
}
function validateProject(value: unknown): Project {
  if (!value || typeof value !== "object") throw new Error("Invalid project.");
  const p = value as Record<string, unknown>;
  if (p.app !== "ALIMXL_PHOTO" || (p.version !== 1 && p.version !== 2) || typeof p.image !== "string" || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.image) || p.image.length > 29_000_000) throw new Error("Unsupported project or image.");
  if (!p.settings || typeof p.settings !== "object" || Array.isArray(p.settings)) throw new Error("Missing project settings.");
  const raw = p.settings as Record<string, unknown>;
  const s: Settings = { ...INITIAL, layers: [] };
  const ranges: Record<string, [number, number]> = { brightness:[0,200], contrast:[0,200], saturation:[0,200], exposure:[-2,2], warmth:[-100,100], grayscale:[0,100], sepia:[0,100], vignette:[0,100], hue:[-180,180], highlights:[-100,100], shadows:[-100,100], sharpen:[0,100], blur:[0,100], grain:[0,100], cropX:[0,99], cropY:[0,99], cropW:[1,100], cropH:[1,100] };
  for (const [key, [lo, hi]] of Object.entries(ranges)) Object.assign(s, { [key]: num(raw[key], (INITIAL as Record<string, unknown>)[key] as number, lo, hi) });
  if (![0,90,180,270].includes(raw.rotation as number) || typeof raw.flipX !== "boolean" || typeof raw.flipY !== "boolean") throw new Error("Invalid transform.");
  s.rotation = raw.rotation as number; s.flipX = raw.flipX; s.flipY = raw.flipY;
  if (!Array.isArray(raw.layers) || raw.layers.length > 30) throw new Error("Invalid layers.");
  const ids = new Set<string>(); const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  s.layers = raw.layers.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid layer.");
    const l = item as Record<string, unknown>;
    if (typeof l.id !== "string" || l.id.length > 100 || ids.has(l.id) || !["text","rectangle","ellipse","image"].includes(l.kind as string) || typeof l.text !== "string" || l.text.length > 500 || typeof l.name !== "string" || l.name.length > 100 || typeof l.color !== "string" || !/^#[0-9a-f]{6}$/i.test(l.color) || typeof l.visible !== "boolean") throw new Error("Invalid layer content.");
    ids.add(l.id);
    const src = l.kind === "image" && typeof l.src === "string" && IMG_RE.test(l.src) && l.src.length <= 6_000_000 ? l.src : "";
    if (l.kind === "image" && !src) throw new Error("Invalid image layer.");
    return {
      src, blend: BLENDS.some(b => b[0] === l.blend) ? l.blend : "source-over", tile: l.tile === true, gap: num(l.gap, 20, 0, 100),
      id: l.id, kind: l.kind, text: l.text, name: l.name, color: l.color, visible: l.visible,
      x: num(l.x, 50, 0, 100), y: num(l.y, 50, 0, 100), width: num(l.width, 30, 1, 100), height: num(l.height, 20, 1, 100),
      size: num(l.size, 7, 1, 25), opacity: num(l.opacity, 100, 0, 100),
      font: FONTS.includes(l.font as string) ? l.font : "sans-serif", bold: l.bold !== false, italic: l.italic === true,
      align: ["left","center","right"].includes(l.align as string) ? l.align : "center",
      rotation: num(l.rotation, 0, -180, 180), strokeColor: hex(l.strokeColor, "#000000"), strokeWidth: num(l.strokeWidth, 0, 0, 20),
      shadow: num(l.shadow, 0, 0, 100), radius: num(l.radius, 0, 0, 50),
    } as Layer;
  });
  if (s.layers.filter(l => l.kind === "image").length > 10) throw new Error("Too many image layers (max 10).");
  return { settings: s, data: p.image, name: typeof p.name === "string" ? safeName(p.name) : "alimxl-photo" };
}

type NumKey = "brightness" | "contrast" | "saturation" | "exposure" | "warmth" | "grayscale" | "sepia" | "vignette" | "hue" | "highlights" | "shadows" | "sharpen" | "blur" | "grain";
type Adj = readonly [NumKey, string, number, number, number];
const toneAdj: Adj[] = [["brightness","Brightness",0,200,1], ["contrast","Contrast",0,200,1], ["exposure","Exposure (EV)",-2,2,0.05], ["highlights","Highlights",-100,100,1], ["shadows","Shadows",-100,100,1]];
const colourAdj: Adj[] = [["saturation","Saturation",0,200,1], ["warmth","Warmth",-100,100,1], ["hue","Hue shift",-180,180,1], ["grayscale","Grayscale",0,100,1], ["sepia","Sepia",0,100,1]];
const detailAdj: Adj[] = [["sharpen","Sharpen",0,100,1], ["blur","Blur",0,100,1], ["grain","Film grain",0,100,1], ["vignette","Vignette",0,100,1]];
const neutral = { brightness:100, contrast:100, saturation:100, exposure:0, warmth:0, grayscale:0, sepia:0, vignette:0, hue:0, highlights:0, shadows:0, sharpen:0, blur:0, grain:0 };
const presets = [
  { name:"Natural", patch:neutral },
  { name:"Vivid", patch:{ ...neutral, saturation:130, contrast:112, brightness:103 } },
  { name:"Cinema", patch:{ ...neutral, contrast:118, saturation:78, warmth:-12, vignette:28 } },
  { name:"Warm", patch:{ ...neutral, warmth:30, saturation:108 } },
  { name:"Mono", patch:{ ...neutral, grayscale:100, contrast:120 } },
  { name:"Vintage", patch:{ ...neutral, sepia:40, contrast:90, vignette:22, grain:30 } },
  { name:"Crisp", patch:{ ...neutral, sharpen:45, contrast:108, shadows:15 } },
  { name:"Dreamy", patch:{ ...neutral, blur:8, brightness:106, saturation:112, highlights:-15 } },
];
const exportPresets = [["Instagram 1080", 1080], ["HD 1920", 1920], ["4K 3840", 3840], ["Thumb 1280", 1280]] as const;
const btn = "rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-35";
const field = "mt-2 w-full rounded-xl border border-white/15 bg-[#111c30] px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400";
function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-2xl border border-white/10 bg-[#101b2d] p-4"><h2 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">{title}</h2>{children}</section>; }
function Slider({ label, value, min = 0, max = 100, step = 1, onChange, onCommit }: { label:string; value:number; min?:number; max?:number; step?:number; onChange:(n:number)=>void; onCommit:()=>void }) {
  return <label className="block text-xs text-slate-400"><span className="mb-2 flex justify-between gap-2"><span>{label}</span><output className="font-mono text-amber-200">{Math.round(value * 100) / 100}</output></span><input aria-label={label} className="w-full accent-emerald-400" type="range" value={value} min={min} max={max} step={step} onChange={e=>onChange(Number(e.target.value))} onPointerUp={onCommit} onKeyUp={onCommit} onBlur={onCommit}/></label>;
}

export default function PhotoStudioPage() {
  const [history, dispatch] = useReducer(reducer, { past:[], present:{ ...INITIAL, layers:[] }, future:[], base:null });
  const s = history.present;
  const [asset, setAsset] = useState<Asset | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"adjust" | "crop" | "layers">("adjust");
  const [message, setMessage] = useState("Ready. Open an image to begin.");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [outputWidth, setOutputWidth] = useState(1600);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState(92);
  const [background, setBackground] = useState("#FFFFFF");
  const [transparent, setTransparent] = useState(true);
  const [name, setName] = useState("alimxl-photo");
  const [dirty, setDirty] = useState(false);
  const [previewSize, setPreviewSize] = useState({ w:1, h:1 });
  const [restore, setRestore] = useState<unknown>(null);
  const [savedAt, setSavedAt] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null), projectRef = useRef<HTMLInputElement>(null), logoRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null), histRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id:string; px:number; py:number; x:number; y:number } | null>(null);
  const loadRef = useRef<(file?: File, project?: boolean) => void>(() => {});
  const live = useCallback((patch: Partial<Settings>) => { dispatch({type:"live",patch}); setDirty(true); setCompare(false); }, []);
  const edit = useCallback((patch: Partial<Settings>) => { dispatch({type:"edit",patch}); setDirty(true); setCompare(false); }, []);
  const commit = useCallback(() => dispatch({type:"commit"}), []);
  const layer = s.layers.find(l=>l.id===selected);
  function patchLayer(patch: Partial<Layer>, transient = false) {
    const layers = s.layers.map(l=>l.id===selected ? { ...l, ...patch } : l);
    (transient ? live : edit)({layers});
  }
  const height = asset && Number.isFinite(outputWidth) ? Math.max(1,Math.round(outputWidth/aspect(asset.image,s))) : 0;
  const valid = !!asset && Number.isInteger(outputWidth) && outputWidth > 0 && outputWidth <= 8192 && height <= 8192 && outputWidth * height <= MAX_PIXELS;
  const canUndo = !!history.past.length || !!history.base;
  const changed = useCallback(() => !dirty || window.confirm("Unsaved edits will be replaced. Continue?"), [dirty]);

  useEffect(()=> {
    const leave = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload",leave); return ()=>window.removeEventListener("beforeunload",leave);
  },[dirty]);
  /* find an autosaved session from the last visit */
  useEffect(()=> { kvGet("autosave").then(v => { if (v) setRestore(v); }).catch(()=>{}); },[]);
  /* offline autosave every 1.5 s after an edit */
  useEffect(()=> {
    if (!asset || !dirty) return;
    const t = window.setTimeout(()=> {
      kvSet("autosave",{ app:"ALIMXL_PHOTO", version:2, name:safeName(name), image:asset.data, settings:s })
        .then(()=>setSavedAt(new Date().toLocaleTimeString())).catch(()=>setSavedAt("failed"));
    },1500);
    return ()=>window.clearTimeout(t);
  },[asset,s,name,dirty]);
  /* paste image from clipboard */
  useEffect(()=> {
    const paste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input,textarea")) return;
      const f = Array.from(e.clipboardData?.files ?? []).find(x=>x.type.startsWith("image/"));
      if (f) { e.preventDefault(); loadRef.current(f); }
    };
    window.addEventListener("paste",paste); return ()=>window.removeEventListener("paste",paste);
  },[]);
  useEffect(()=> {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,[contenteditable='true']") || busy) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase()==="z") { e.preventDefault(); dispatch({type:e.shiftKey?"redo":"undo"}); setDirty(true); setCompare(false); }
      if (mod && e.key.toLowerCase()==="y") { e.preventDefault(); dispatch({type:"redo"}); setDirty(true); setCompare(false); }
      if (mod && e.key.toLowerCase()==="d" && selected) { e.preventDefault(); duplicateLayer(); }
      if (e.key==="Escape") { setSelected(null); setCompare(false); }
      if (selected && (e.key==="Delete" || e.key==="Backspace")) { e.preventDefault(); edit({layers:s.layers.filter(l=>l.id!==selected)}); setSelected(null); }
      if (selected && e.key.startsWith("Arrow")) {
        e.preventDefault(); const st = e.shiftKey ? 5 : 0.5;
        const dx = e.key==="ArrowLeft"?-st:e.key==="ArrowRight"?st:0, dy = e.key==="ArrowUp"?-st:e.key==="ArrowDown"?st:0;
        edit({layers:s.layers.map(l=>l.id===selected?{...l,x:clamp(l.x+dx,0,100),y:clamp(l.y+dy,0,100)}:l)});
      }
    };
    window.addEventListener("keydown",key); return ()=>window.removeEventListener("keydown",key);
  });
  useEffect(()=> {
    if (!asset) return;
    let cancelled = false;
    const timer = window.setTimeout(()=> { void (async()=> {
      try {
        await document.fonts.ready;
        if (cancelled || !canvasRef.current) return;
        const visible = compare ? INITIAL : s;
        const ratio = aspect(asset.image,visible);
        const width = Math.max(1,Math.floor(Math.min(1100,1100*ratio,asset.image.naturalWidth)));
        draw(canvasRef.current,asset.image,visible,width,null);
        if (histRef.current) drawHistogram(canvasRef.current,histRef.current);
        setPreviewSize({w:canvasRef.current.width,h:canvasRef.current.height});
      } catch (error) { if (!cancelled) setMessage(error instanceof Error ? error.message : "Preview failed."); }
    })(); },70);
    return ()=> { cancelled=true; window.clearTimeout(timer); };
  },[asset,s,compare]);

  async function open(data:string, settings:Settings, fileName:string, note:string) {
    const image=await decode(data);
    await Promise.all(settings.layers.filter(l=>l.kind==="image"&&l.src).map(l=>cacheLayerImage(l.id,l.src)));
    setAsset({image,data,name:fileName}); dispatch({type:"replace",value:settings});
    setName(fileName); setSelected(null); setCompare(false); setZoom(100); setDirty(false);
    const ratio=aspect(image,settings);
    setOutputWidth(Math.max(1,Math.floor(Math.min(image.naturalWidth,4096,4096*ratio,Math.sqrt(MAX_PIXELS*ratio)))));
    setMessage(note);
  }
  async function load(file?: File, project = false) {
    if (!file || busyRef.current || !changed()) return;
    if (file.size > (project ? 30 : 20)*1024*1024) { setMessage("File too large: image limit 20 MB; project limit 30 MB."); return; }
    busyRef.current=true; setBusy(true); setMessage("Reading and validating file...");
    try {
      if (project) { const p=validateProject(JSON.parse(await file.text())); await open(p.data,p.settings,p.name,"Project loaded. Image and editable settings restored."); }
      else {
        if (!["image/png","image/jpeg","image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image.");
        await open(await fileData(file),{...INITIAL,layers:[]},safeName(file.name.replace(/\.[^.]+$/,"")||"pasted-image"),"Image ready. The original file is unchanged.");
      }
    } catch(error) { setMessage(error instanceof Error ? error.message : "Unable to open file."); }
    finally { busyRef.current=false; setBusy(false); }
  }
  loadRef.current = (f, p) => { void load(f, p); };
  async function restoreSession() {
    if (!restore || busyRef.current || !changed()) return;
    busyRef.current=true; setBusy(true);
    try { const p=validateProject(restore); await open(p.data,p.settings,p.name,"Autosaved session restored."); setDirty(true); setRestore(null); }
    catch(error) { setMessage(error instanceof Error ? error.message : "Unable to restore."); }
    finally { busyRef.current=false; setBusy(false); }
  }
  function discardSession() { setRestore(null); void kvDel("autosave").catch(()=>{}); }
  function inputLoad(e:ChangeEvent<HTMLInputElement>, project=false) { const file=e.target.files?.[0]; e.target.value=""; void load(file,project); }
  function addLayer(kind:Layer["kind"]) {
    if (!asset || s.layers.length>=30) return;
    const id=crypto.randomUUID();
    edit({layers:[...s.layers,defaultLayer(id,kind)]});
    setSelected(id); setTab("layers");
  }
  async function addImageLayer(file?: File) {
    if (!file || !asset || busyRef.current) return;
    if (s.layers.length>=30) { setMessage("Up to 30 layers."); return; }
    if (s.layers.filter(l=>l.kind==="image").length>=10) { setMessage("Up to 10 image layers."); return; }
    if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>10*1024*1024) { setMessage("Choose a PNG, JPEG or WebP logo up to 10 MB."); return; }
    busyRef.current=true; setBusy(true); setMessage("Adding image layer...");
    try {
      let src=await fileData(file); let img=await decode(src);
      const m=Math.max(img.naturalWidth,img.naturalHeight);
      if (m>2048) {
        const k=2048/m, c=document.createElement("canvas");
        c.width=Math.max(1,Math.round(img.naturalWidth*k)); c.height=Math.max(1,Math.round(img.naturalHeight*k));
        canvas2d(c).drawImage(img,0,0,c.width,c.height); src=c.toDataURL("image/webp",0.92); img=await decode(src);
      }
      if (src.length>6_000_000 || !IMG_RE.test(src)) throw new Error("Image layer is too large. Use a smaller file.");
      const id=crypto.randomUUID(); imgCache.set(id,{src,img});
      edit({layers:[...s.layers,{...defaultLayer(id,"image"),name:(file.name.replace(/\.[^.]+$/,"").slice(0,60))||"Image layer",src,width:25}]});
      setSelected(id); setTab("layers"); setMessage("Image layer added. Choose a blend mode, or repeat it as a watermark pattern.");
    } catch(error) { setMessage(error instanceof Error ? error.message : "Unable to add image layer."); }
    finally { busyRef.current=false; setBusy(false); }
  }
  function placeImage(pos:"tl"|"tr"|"bl"|"br"|"c") {
    if (!asset || !layer || layer.kind!=="image") return;
    const c=imgCache.get(layer.id); if (!c) return;
    const hp=layer.width*(c.img.naturalHeight/c.img.naturalWidth)*aspect(asset.image,s), m=3;
    const x=pos==="c"?50:pos.endsWith("l")?m+layer.width/2:100-m-layer.width/2;
    const y=pos==="c"?50:pos.startsWith("t")?m+hp/2:100-m-hp/2;
    edit({layers:s.layers.map(l=>l.id===layer.id?{...l,x:clamp(x,0,100),y:clamp(y,0,100)}:l)});
  }
  function duplicateLayer() {
    const src=s.layers.find(l=>l.id===selected);
    if (!src || s.layers.length>=30) return;
    const id=crypto.randomUUID();
    const cached=imgCache.get(src.id); if (cached) imgCache.set(id,cached);
    edit({layers:[...s.layers,{...src,id,name:src.name.slice(0,90)+" copy",x:clamp(src.x+3,0,100),y:clamp(src.y+3,0,100)}]}); setSelected(id);
  }
  function dragStart(e:ReactPointerEvent<HTMLButtonElement>, l:Layer) {
    if (compare || busy) return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setSelected(l.id);
    dragRef.current={id:l.id,px:e.clientX,py:e.clientY,x:l.x,y:l.y};
  }
  function dragMove(e:ReactPointerEvent<HTMLButtonElement>) {
    const d=dragRef.current; const rect=canvasRef.current?.getBoundingClientRect();
    if (!d || !rect || !rect.width || !rect.height) return;
    live({layers:s.layers.map(l=>l.id===d.id?{...l,x:clamp(d.x+(e.clientX-d.px)/rect.width*100,0,100),y:clamp(d.y+(e.clientY-d.py)/rect.height*100,0,100)}:l)});
  }
  function dragEnd() { dragRef.current=null; commit(); }
  function reorder(direction:number) {
    const index=s.layers.findIndex(l=>l.id===selected), next=index+direction;
    if (index<0 || next<0 || next>=s.layers.length) return;
    const layers=[...s.layers]; [layers[index],layers[next]]=[layers[next],layers[index]]; edit({layers});
  }
  function autoEnhance() {
    if (!asset) return;
    try {
      const tmp=document.createElement("canvas");
      draw(tmp,asset.image,{...s,...neutral,layers:[]},256,null);
      const { data }=canvas2d(tmp).getImageData(0,0,tmp.width,tmp.height);
      const hist=new Array<number>(256).fill(0); let total=0;
      for (let i=0;i<data.length;i+=4) { hist[Math.round(0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2])]++; total++; }
      let acc=0, lo=0, hi=255;
      for (let i=0;i<256;i++) { acc+=hist[i]; if (acc>=total*0.01) { lo=i; break; } }
      acc=0; for (let i=255;i>=0;i--) { acc+=hist[i]; if (acc>=total*0.01) { hi=i; break; } }
      const mid=(lo+hi)/2||128;
      edit({contrast:Math.round(clamp(255/Math.max(1,hi-lo),1,1.6)*100),brightness:Math.round(clamp(128/mid,0.8,1.25)*100),saturation:108});
      setMessage("Auto enhance applied from the image histogram. Fine-tune with the sliders.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Auto enhance failed."); }
  }
  async function renderBlob(fmt:"png"|"jpeg"|"webp") {
    if (!asset) throw new Error("No image.");
    await new Promise<void>(resolve=>window.setTimeout(resolve,40)); await document.fonts.ready;
    const canvas=document.createElement("canvas");
    draw(canvas,asset.image,s,outputWidth,fmt==="jpeg"||!transparent?background:null);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Browser could not encode the image.")),`image/${fmt}`,quality/100));
    canvas.width=1; canvas.height=1; return blob;
  }
  async function runBusy(label:string, job:()=>Promise<void>) {
    if (!asset || !valid || busyRef.current) return;
    busyRef.current=true; setBusy(true); setMessage(label);
    try { await job(); } catch(error) { setMessage(error instanceof Error?error.message:"Action failed."); }
    finally { busyRef.current=false; setBusy(false); }
  }
  const exportImage = () => runBusy("Rendering export. Large images may take a moment...", async()=> {
    const blob=await renderBlob(format);
    const ext=blob.type==="image/jpeg"?"jpg":blob.type==="image/webp"?"webp":"png";
    download(blob,`${safeName(name)}-edited.${ext}`);
    const kb=Math.round(blob.size/1024);
    setMessage(blob.type===`image/${format}`?`Export sent to downloads (${kb>1024?(kb/1024).toFixed(1)+" MB":kb+" KB"}). Save a project to keep editable layers.`:"Requested format unavailable. Exported PNG instead.");
  });
  const copyImage = () => runBusy("Copying to clipboard...", async()=> {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("Clipboard image copy is not supported in this browser.");
    await navigator.clipboard.write([new ClipboardItem({"image/png":renderBlob("png")})]);
    setMessage("Image copied as PNG. Paste it into any app.");
  });
  const shareImage = () => runBusy("Preparing share...", async()=> {
    const blob=await renderBlob(format==="png"?"png":format);
    const file=new File([blob],`${safeName(name)}-edited.${blob.type==="image/jpeg"?"jpg":blob.type==="image/webp"?"webp":"png"}`,{type:blob.type});
    if (!navigator.canShare?.({files:[file]})) throw new Error("Sharing files is not supported here. Use Download instead.");
    await navigator.share({files:[file],title:name}); setMessage("Shared.");
  });
  function saveProject() {
    if (!asset) return;
    const blob=new Blob([JSON.stringify({app:"ALIMXL_PHOTO",version:2,name:safeName(name),image:asset.data,settings:s})],{type:"application/json"});
    if (blob.size>30*1024*1024) { setMessage("Project exceeds the 30 MB reopen limit. Use a smaller source image."); return; }
    download(blob,`${safeName(name)}.alimxl-photo.json`); commit();
    setMessage("Project download requested. Confirm the file was saved before leaving.");
  }
  function cropPreset(ratio:number) {
    if (!asset) return;
    const source=asset.image.naturalWidth/asset.image.naturalHeight;
    const w=source>ratio?ratio/source*100:100, h=source>ratio?100:source/ratio*100;
    edit({cropX:(100-w)/2,cropY:(100-h)/2,cropW:w,cropH:h});
  }
  const adjSliders = (list: Adj[]) => <div className="space-y-4">{list.map(([key,label,min,max,step])=><Slider key={key} label={label} value={s[key]} min={min} max={max} step={step} onChange={v=>live({[key]:v} as Partial<Settings>)} onCommit={commit}/>)}</div>;
  const layerSlider = (k: "x"|"y"|"opacity"|"rotation"|"strokeWidth"|"shadow"|"radius"|"width"|"gap", label:string, min=0, max=100) => <Slider key={k} label={label} min={min} max={max} value={layer![k]} onChange={v=>patchLayer({[k]:v} as Partial<Layer>,true)} onCommit={commit}/>;

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#08111f] font-sans text-slate-100">
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Open image" onChange={e=>inputLoad(e)}/>
      <input ref={projectRef} type="file" accept=".json,application/json" className="hidden" aria-label="Open project" onChange={e=>inputLoad(e,true)}/>
      <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Add image layer" onChange={e=>{const f=e.target.files?.[0]; e.target.value=""; void addImageLayer(f);}}/>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c1828] px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3"><Link href="/" onClick={e=>{if(dirty&&!window.confirm("Leave Photo Studio? Your autosave stays on this device, but save a project file for a backup."))e.preventDefault();}} className={`${btn} text-amber-200`}>ALIMXL / Home</Link><div><h1 className="text-lg font-bold tracking-tight">Photo Studio <span className="text-emerald-400">Pro</span></h1><p className="text-[10px] tracking-wider text-slate-500">LOCAL IMAGE WORKSPACE</p></div></div>
        <div className="flex flex-wrap gap-2"><button disabled={busy} className={btn} onClick={()=>fileRef.current?.click()}>Open image</button><button disabled={busy} className={btn} onClick={()=>projectRef.current?.click()}>Open project</button><button disabled={!asset||busy} className={btn} onClick={saveProject}>Save project</button><button disabled={!canUndo||busy} className={btn} onClick={()=>{dispatch({type:"undo"});setDirty(true);setCompare(false);}}>Undo</button><button disabled={!history.future.length||busy} className={btn} onClick={()=>{dispatch({type:"redo"});setDirty(true);setCompare(false);}}>Redo</button><button disabled={!asset||busy} className={btn} onClick={()=>{if(window.confirm("Reset all adjustments, crop and layers?")){edit({...INITIAL,layers:[]});setSelected(null);}}}>Reset</button></div>
      </header>
      {!!restore&&<div role="alert" className="flex shrink-0 flex-wrap items-center gap-3 border-b border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs text-amber-100">An autosaved session from your last visit was found on this device.<button className={btn} disabled={busy} onClick={()=>void restoreSession()}>Restore session</button><button className={btn} onClick={discardSession}>Discard</button></div>}
      <div className="min-h-0 flex-1 overflow-y-auto xl:overflow-hidden"><div className="grid min-h-full gap-4 p-4 xl:h-full xl:grid-cols-[270px_minmax(0,1fr)_285px]">
        <aside className="min-h-0 space-y-4 xl:overflow-y-auto xl:pr-1">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1" role="group" aria-label="Editing tools">{(["adjust","crop","layers"] as const).map(t=><button key={t} className={`rounded-lg px-2 py-2 text-xs font-bold capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${tab===t?"bg-emerald-500 text-[#052b20]":"text-slate-400 hover:bg-white/5"}`} onClick={()=>setTab(t)}>{t}</button>)}</div>
          <fieldset disabled={!asset||busy} className="min-w-0 space-y-4 disabled:opacity-45"><legend className="sr-only">Image editing controls</legend>
          {tab==="adjust"&&<>
            <Panel title="Histogram"><canvas ref={histRef} width={256} height={64} className="w-full rounded-lg bg-black/30" aria-label="Colour histogram"/><div className="mt-3 grid grid-cols-2 gap-2"><button className={btn} onClick={autoEnhance}>Auto enhance</button><button className={btn} onClick={()=>edit(neutral)}>Reset tone</button></div></Panel>
            <Panel title="Light">{adjSliders(toneAdj)}</Panel>
            <Panel title="Colour">{adjSliders(colourAdj)}</Panel>
            <Panel title="Detail & effects">{adjSliders(detailAdj)}</Panel>
            <Panel title="Looks"><div className="grid grid-cols-2 gap-2">{presets.map(p=><button key={p.name} className={btn} onClick={()=>edit(p.patch)}>{p.name}</button>)}</div><p className="mt-3 text-[11px] leading-5 text-slate-500">Looks change colour settings only. Crop and layers stay intact.</p></Panel></>}
          {tab==="crop"&&<><Panel title="Source crop"><p className="mb-4 text-xs leading-5 text-slate-400">Percentage-based source crop. Right and bottom edges are clamped to the image.</p><div className="space-y-4">{([["cropX","Left",0,99],["cropY","Top",0,99],["cropW","Width",1,100],["cropH","Height",1,100]] as const).map(([key,label,min,max])=><Slider key={key} label={label} value={s[key]} min={min} max={max} onChange={v=>live({[key]:v})} onCommit={commit}/>)}</div><div className="mt-4 grid grid-cols-3 gap-2"><button className={btn} onClick={()=>cropPreset(1)}>1:1</button><button className={btn} onClick={()=>cropPreset(4/5)}>4:5</button><button className={btn} onClick={()=>cropPreset(16/9)}>16:9</button><button className={btn} onClick={()=>cropPreset(9/16)}>9:16</button><button className={btn} onClick={()=>cropPreset(3/2)}>3:2</button><button className={btn} onClick={()=>cropPreset(4/3)}>4:3</button></div><button className={`${btn} mt-3 w-full`} onClick={()=>edit({cropX:0,cropY:0,cropW:100,cropH:100})}>Full image</button></Panel><Panel title="Transform"><div className="grid grid-cols-2 gap-2"><button className={btn} onClick={()=>edit({rotation:(s.rotation+270)%360})}>Rotate -90°</button><button className={btn} onClick={()=>edit({rotation:(s.rotation+90)%360})}>Rotate +90°</button><button className={btn} aria-pressed={s.flipX} onClick={()=>edit({flipX:!s.flipX})}>Flip X {s.flipX?"ON":""}</button><button className={btn} aria-pressed={s.flipY} onClick={()=>edit({flipY:!s.flipY})}>Flip Y {s.flipY?"ON":""}</button></div><p className="mt-3 text-[11px] text-slate-500">Rotation: {s.rotation}°. Layers remain in output coordinates.</p></Panel></>}
          {tab==="layers"&&<Panel title={`Layers · ${s.layers.length}/30`}><div className="grid grid-cols-2 gap-1">{(["text","rectangle","ellipse"] as const).map(k=><button disabled={s.layers.length>=30} className={`${btn} px-1 capitalize`} key={k} onClick={()=>addLayer(k)}>{k}</button>)}<button disabled={s.layers.length>=30} className={`${btn} px-1`} onClick={()=>logoRef.current?.click()}>Image / logo</button></div><div className="mt-4 space-y-2">{[...s.layers].reverse().map(l=><div key={l.id} className={`flex items-center gap-1 rounded-xl border p-2 ${selected===l.id?"border-emerald-400/60 bg-emerald-400/10":"border-white/10"}`}><button className="min-w-0 flex-1 truncate p-1 text-left text-xs focus-visible:outline focus-visible:outline-amber-300" onClick={()=>setSelected(l.id)}>{l.name}</button><button className={btn} aria-label={`${l.visible?"Hide":"Show"} ${l.name}`} onClick={()=>edit({layers:s.layers.map(x=>x.id===l.id?{...x,visible:!x.visible}:x)})}>{l.visible?"On":"Off"}</button></div>)}</div>{!s.layers.length&&<p className="mt-5 text-xs leading-6 text-slate-500">Add text or a shape. Drag its numbered handle on the canvas, or use arrow keys (Shift = bigger steps). Delete removes, Ctrl/⌘ D duplicates.</p>}</Panel>}
          </fieldset>
        </aside>
        <section className="flex min-h-[450px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1423] xl:min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3"><div><h2 className="text-sm font-semibold">{compare?"Original":"Live canvas"}</h2><p className="mt-1 text-[10px] text-slate-500">{asset?`${asset.image.naturalWidth} × ${asset.image.naturalHeight} source pixels`:"PNG · JPEG · WebP · Ctrl/⌘ V to paste"}</p></div><div className="flex items-center gap-2"><button disabled={!asset||busy} className={btn} aria-pressed={compare} onClick={()=>setCompare(!compare)}>{compare?"Show edit":"Compare"}</button><select aria-label="Preview zoom" className={`${btn} bg-[#132138]`} value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[50,75,100,125,150,200].map(v=><option key={v} value={v}>{v===100?"Fit":`${v}%`}</option>)}</select></div></div>
          <div aria-busy={busy} className="relative flex min-h-[380px] flex-1 overflow-auto p-5" onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";}} onDrop={e=>{e.preventDefault();void load(e.dataTransfer.files[0]);}} style={{backgroundImage:"linear-gradient(45deg,#132033 25%,transparent 25%),linear-gradient(-45deg,#132033 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#132033 75%),linear-gradient(-45deg,transparent 75%,#132033 75%)",backgroundSize:"24px 24px",backgroundPosition:"0 0,0 12px,12px -12px,-12px 0"}}>
            {asset?<div className="relative m-auto shrink-0" style={{width:`${zoom}%`,maxWidth:zoom===100?"100%":undefined}}><div className="relative mx-auto" style={{width:"100%",maxWidth:zoom===100?`${previewSize.w}px`:undefined}}><canvas ref={canvasRef} className="block h-auto w-full shadow-2xl" aria-label="Edited photo preview"/>{!compare&&!busy&&s.layers.filter(l=>l.visible).map((l,index)=><button key={l.id} aria-label={`Drag ${l.name}`} title={`Drag ${l.name}; arrow keys nudge the selected layer`} onPointerDown={e=>dragStart(e,l)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd} onLostPointerCapture={dragEnd} onClick={()=>{setSelected(l.id);setTab("layers");}} className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${selected===l.id?"border-white bg-emerald-500 text-black":"border-white/70 bg-slate-900/80 text-white"}`} style={{left:`${l.x}%`,top:`${l.y}%`}}>{index+1}</button>)}</div></div>:<button disabled={busy} onClick={()=>fileRef.current?.click()} className="m-auto w-full max-w-md rounded-3xl border border-dashed border-emerald-400/35 bg-[#0d1b2c]/95 p-10 text-center transition hover:border-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"><span className="text-5xl font-light text-amber-200">+</span><span className="mt-5 block text-2xl font-bold">Your next great image</span><span className="mt-3 block text-sm leading-7 text-slate-400">Click to browse, drop or paste an image.<br/>Up to 20 MB · 40 megapixels</span><span className="mt-6 inline-block rounded-full bg-emerald-400/10 px-4 py-2 text-xs text-emerald-300">Local editing · No image upload by this editor</span></button>}
          </div>
          <div className="border-t border-white/10 px-4 py-3"><p role="status" aria-live="polite" className="text-xs leading-5 text-slate-400">{busy?"Working… ":""}{message}</p><p className="mt-1 text-[10px] text-slate-600">Ctrl/⌘ Z undo · Shift Ctrl/⌘ Z redo · Esc deselect · Handles do not appear in exports.{savedAt&&` Autosaved on this device: ${savedAt}.`}</p></div>
        </section>
        <aside className="min-h-0 space-y-4 xl:overflow-y-auto xl:pr-1">
          <fieldset disabled={!asset||busy} className="min-w-0 space-y-4 disabled:opacity-45"><legend className="sr-only">Layer and export controls</legend>
          {layer&&<Panel title="Selected layer"><div className="space-y-4"><label className="block text-xs text-slate-400">Layer name<input className={field} value={layer.name} maxLength={100} onChange={e=>patchLayer({name:e.target.value},true)} onBlur={commit}/></label>
          {layer.kind==="text"&&<><label className="block text-xs text-slate-400">Text / বাংলা<textarea rows={3} className={field} maxLength={500} value={layer.text} onChange={e=>patchLayer({text:e.target.value},true)} onBlur={commit}/></label>
            <label className="block text-xs text-slate-400">Font<select className={field} value={layer.font} onChange={e=>patchLayer({font:e.target.value})}>{FONTS.map(f=><option key={f} value={f}>{f}</option>)}</select></label>
            <div className="grid grid-cols-5 gap-1"><button className={btn} aria-pressed={layer.bold} onClick={()=>patchLayer({bold:!layer.bold})}>B</button><button className={`${btn} italic`} aria-pressed={layer.italic} onClick={()=>patchLayer({italic:!layer.italic})}>I</button>{(["left","center","right"] as const).map(a=><button key={a} className={`${btn} px-1 capitalize ${layer.align===a?"bg-emerald-500/20":""}`} onClick={()=>patchLayer({align:a})}>{a[0].toUpperCase()}</button>)}</div>
            <Slider label="Text size (% of width)" min={1} max={25} value={layer.size} onChange={v=>patchLayer({size:v},true)} onCommit={commit}/></>}
          <label className="flex items-center justify-between text-xs text-slate-400">Colour<input aria-label="Layer colour" type="color" value={layer.color} onChange={e=>patchLayer({color:e.target.value},true)} onBlur={commit} className="h-9 w-14 rounded border border-white/10 bg-transparent"/></label>
          {layerSlider("x","Horizontal position")}{layerSlider("y","Vertical position")}{layerSlider("opacity","Opacity")}<label className="block text-xs text-slate-400">Blend mode<select className={field} value={layer.blend} onChange={e=>patchLayer({blend:e.target.value})}>{BLENDS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>{layerSlider("rotation","Rotation (°)",-180,180)}
          {layer.kind==="image"?<>{layerSlider("width","Logo width (% of image)",1,100)}<label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={layer.tile} onChange={e=>patchLayer({tile:e.target.checked})} className="accent-emerald-400"/>Repeat as watermark pattern</label>{layer.tile?layerSlider("gap","Spacing",0,100):<div className="grid grid-cols-5 gap-1">{([["tl","↖"],["tr","↗"],["c","•"],["bl","↙"],["br","↘"]] as const).map(([p,g])=><button key={p} className={btn} aria-label={`Place ${p}`} onClick={()=>placeImage(p)}>{g}</button>)}</div>}{layerSlider("radius","Corner radius",0,50)}</>:layer.kind!=="text"&&<>{(["width","height"] as const).map(k=><Slider key={k} label={k} min={1} value={layer[k]} onChange={v=>patchLayer({[k]:v},true)} onCommit={commit}/>)}{layer.kind==="rectangle"&&layerSlider("radius","Corner radius",0,50)}</>}
          <label className="flex items-center justify-between text-xs text-slate-400">Outline colour<input aria-label="Outline colour" type="color" value={layer.strokeColor} onChange={e=>patchLayer({strokeColor:e.target.value},true)} onBlur={commit} className="h-9 w-14 rounded border border-white/10 bg-transparent"/></label>
          {layerSlider("strokeWidth","Outline width",0,20)}{layerSlider("shadow","Drop shadow")}
          <div className="grid grid-cols-2 gap-2"><button className={btn} onClick={()=>reorder(1)}>Move forward</button><button className={btn} onClick={()=>reorder(-1)}>Move back</button><button className={btn} disabled={s.layers.length>=30} onClick={duplicateLayer}>Duplicate</button><button className={`${btn} text-rose-300`} onClick={()=>{edit({layers:s.layers.filter(l=>l.id!==selected)});setSelected(null);}}>Delete</button></div></div></Panel>}
          <Panel title="Export studio"><div className="space-y-4"><label className="block text-xs text-slate-400">File name<input className={field} value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label><label className="block text-xs text-slate-400">Output width (px)<input type="number" min={1} max={8192} step={1} className={field} value={outputWidth||""} onChange={e=>setOutputWidth(Number(e.target.value))}/></label>
          <div className="grid grid-cols-2 gap-2">{exportPresets.map(([label,w])=><button key={label} className={btn} onClick={()=>setOutputWidth(w)}>{label}</button>)}{asset&&<button className={`${btn} col-span-2`} onClick={()=>{const c=crop(asset.image,s);setOutputWidth(Math.round(s.rotation%180?c.h:c.w));}}>Original size</button>}</div>
          <p className="font-mono text-xs text-amber-200">{outputWidth||0} × {height} px</p>{asset&&!valid&&<p role="alert" className="text-xs leading-5 text-rose-300">Use positive whole pixels, up to 8192 per side and 16 megapixels total.</p>}<label className="block text-xs text-slate-400">Format<select className={field} value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select></label>{format!=="png"&&<Slider label="Encoder quality" min={10} value={quality} onChange={setQuality} onCommit={()=>{}}/>}{format!=="jpeg"&&<label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={transparent} onChange={e=>setTransparent(e.target.checked)} className="accent-emerald-400"/>Preserve transparency</label>}{(format==="jpeg"||!transparent)&&<label className="flex items-center justify-between text-xs text-slate-400">Background<input aria-label="Export background colour" type="color" value={background} onChange={e=>setBackground(e.target.value)} className="h-9 w-14 rounded bg-transparent"/></label>}
          <button disabled={!valid||!name.trim()} className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-3 text-sm font-extrabold text-[#052a24] shadow-lg shadow-emerald-900/20 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 disabled:opacity-35" onClick={()=>void exportImage()}>{busy?"Working…":"Download image"}</button>
          <div className="grid grid-cols-2 gap-2"><button disabled={!valid} className={btn} onClick={()=>void copyImage()}>Copy image</button><button disabled={!valid} className={btn} onClick={()=>void shareImage()}>Share…</button></div>
          <p className="text-[11px] leading-5 text-slate-500">Exports contain edited pixels and visible layers, not selection handles. Upscaling cannot restore missing detail. Original comparison does not change export.</p></div></Panel>
          </fieldset><Panel title="Project care"><p className="text-xs leading-6 text-slate-400">Your work is autosaved to this browser (offline, no cloud). Save project downloads a portable file with the source image and editable settings — keep one as a backup.</p><p className="mt-3 text-[10px] uppercase tracking-wider text-amber-200">{dirty?"Session has edits":"Session ready"}</p></Panel>
        </aside>
      </div></div>
    </main>
  );
}