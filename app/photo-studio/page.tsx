"use client";

/* eslint-disable @next/next/no-img-element -- Local raster photo sheet uses explicit object-fit; not a remote web content image. */

import Link from "next/link";

import { useCallback, useEffect, useReducer, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

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
  canvasBackground: string | null;
  layers: Layer[];
  raster: string; rasterWidth: number; rasterHeight: number;
};
type History = { past: Settings[]; present: Settings; future: Settings[]; base: Settings | null };
type Action = { type: "edit" | "live"; patch: Partial<Settings> } | { type: "commit" | "undo" | "redo" } | { type: "replace"; value: Settings };
type Asset = { image: HTMLImageElement; data: string; name: string };
type Project = { settings: Settings; data: string; name: string };

const INITIAL: Settings = {
  brightness: 100, contrast: 100, saturation: 100, exposure: 0, warmth: 0,
  grayscale: 0, sepia: 0, vignette: 0, hue: 0, highlights: 0, shadows: 0, sharpen: 0, blur: 0, grain: 0,
  rotation: 0, flipX: false, flipY: false,
  cropX: 0, cropY: 0, cropW: 100, cropH: 100, canvasBackground:null, layers: [], raster:"", rasterWidth:0, rasterHeight:0,
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
  const imageWidth=s.raster?s.rasterWidth:image.naturalWidth,imageHeight=s.raster?s.rasterHeight:image.naturalHeight;
  const x = clamp(s.cropX, 0, 99) / 100 * imageWidth;
  const y = clamp(s.cropY, 0, 99) / 100 * imageHeight;
  return { x, y, w: Math.max(1, Math.min(s.cropW / 100 * imageWidth, imageWidth - x)), h: Math.max(1, Math.min(s.cropH / 100 * imageHeight, imageHeight - y)) };
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
  if(s.raster){const cached=studioRasterCache.get(s.raster);if(!cached)throw new Error("Edited image is loading. Please retry.");image=cached;}
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
  background = s.canvasBackground ?? background;
  if (background) { ctx.save(); ctx.globalCompositeOperation = "destination-over"; ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); ctx.restore(); }
}
function drawHistogram(src: HTMLCanvasElement, dst: HTMLCanvasElement) {
  const { data } = canvas2d(src).getImageData(0, 0, src.width, src.height);
  const bins = [0, 1, 2].map(() => new Array<number>(64).fill(0));
  const step = Math.max(1, Math.floor(data.length / 4 / 60000)) * 4;
  for (let i = 0; i < data.length; i += step) if(data[i+3]) for (let c = 0; c < 3; c++) bins[c][data[i + c] >> 2]++;
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
  if (p.app !== "ALIMXL_PHOTO" || (p.version !== 1 && p.version !== 2 && p.version !== 3) || typeof p.image !== "string" || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.image) || p.image.length > 29_000_000) throw new Error("Unsupported project or image.");
  if (!p.settings || typeof p.settings !== "object" || Array.isArray(p.settings)) throw new Error("Missing project settings.");
  const raw = p.settings as Record<string, unknown>;
  const s: Settings = { ...INITIAL, layers: [] };
  s.canvasBackground = typeof raw.canvasBackground === "string" && /^#[0-9a-f]{6}$/i.test(raw.canvasBackground) ? raw.canvasBackground : null;
  if(raw.raster!==undefined&&raw.raster!==""){
    if(typeof raw.raster!=="string"||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(raw.raster)||raw.raster.length>24_000_000||typeof raw.rasterWidth!=="number"||typeof raw.rasterHeight!=="number"||!Number.isInteger(raw.rasterWidth)||!Number.isInteger(raw.rasterHeight)||raw.rasterWidth<1||raw.rasterHeight<1||raw.rasterWidth>3072||raw.rasterHeight>3072||raw.rasterWidth*raw.rasterHeight>4_000_000)throw new Error("Invalid raster edit in project.");
    s.raster=raw.raster;s.rasterWidth=raw.rasterWidth;s.rasterHeight=raw.rasterHeight;
  }
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


/* Submission presets reflect the supplied list; destination requirements may differ. */
type StudioFormat = "jpeg"|"png"|"pdf";
type StudioProfile = {id:string;label:string;w:number;h:number;dpi:number;formats:StudioFormat[];min:number;max:number};
const STUDIO_PROFILES:StudioProfile[] = [
 {id:"passport",label:"পাসপোর্ট / ভিসা ছবি",w:600,h:600,dpi:300,formats:["jpeg"],min:245760,max:2097152},
 {id:"nid",label:"NID / জন্মনিবন্ধন",w:300,h:300,dpi:0,formats:["jpeg"],min:0,max:102399},
 {id:"job",label:"সরকারি চাকরির আবেদন",w:300,h:300,dpi:0,formats:["jpeg"],min:51200,max:102400},
 {id:"signature",label:"স্বাক্ষর",w:300,h:80,dpi:0,formats:["jpeg"],min:20480,max:51200},
 {id:"stamp",label:"সিল / স্ট্যাম্প",w:600,h:600,dpi:0,formats:["png","jpeg"],min:0,max:512000},
 {id:"challan",label:"চালান / কাগজ",w:1654,h:2339,dpi:200,formats:["jpeg"],min:1048576,max:2097152},
 {id:"notice",label:"সরকারি নোটিশ",w:2480,h:3508,dpi:300,formats:["pdf","jpeg"],min:2097152,max:5242880},
 {id:"egp",label:"e-GP টেন্ডার দলিল",w:1240,h:1754,dpi:150,formats:["pdf"],min:0,max:10485760},
 {id:"exam",label:"পরীক্ষার ফটো",w:200,h:230,dpi:0,formats:["jpeg"],min:20480,max:51200},
];
function studioFit(sw:number,sh:number,tw:number,th:number,fit:"contain"|"cover") {
 if(![sw,sh,tw,th].every(n=>Number.isFinite(n)&&n>0)) throw new Error("Invalid image dimensions.");
 const scale=fit==="cover"?Math.max(tw/sw,th/sh):Math.min(tw/sw,th/sh);
 return {x:(tw-sw*scale)/2,y:(th-sh*scale)/2,w:sw*scale,h:sh*scale};
}
function studioCanvasBlob(canvas:HTMLCanvasElement,format:"png"|"jpeg",quality=1):Promise<Blob> {
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b&&b.type===`image/${format}`?resolve(b):reject(new Error("Browser could not encode the selected image format.")),`image/${format}`,quality));
}
function studioDensity(input:Uint8Array,dpi:number) {
 const bytes=new Uint8Array(input);if(!dpi)return bytes;
 if(bytes[0]!==255||bytes[1]!==216)throw new Error("Invalid JPEG data.");
 let p=2;
 while(p+4<bytes.length&&bytes[p]===255){const marker=bytes[p+1];if(marker===218||marker===217)break;const len=bytes[p+2]*256+bytes[p+3];if(len<2||p+len+2>bytes.length)break;
  if(marker===224&&len>=16&&bytes[p+4]===74&&bytes[p+5]===70&&bytes[p+6]===73&&bytes[p+7]===70&&bytes[p+8]===0){bytes[p+11]=1;bytes[p+12]=dpi>>8;bytes[p+13]=dpi&255;bytes[p+14]=dpi>>8;bytes[p+15]=dpi&255;return bytes;}p+=len+2;
 }
 const app=new Uint8Array([255,224,0,16,74,70,73,70,0,1,1,1,dpi>>8,dpi&255,dpi>>8,dpi&255,0,0]),out=new Uint8Array(bytes.length+18);out.set(bytes.subarray(0,2));out.set(app,2);out.set(bytes.subarray(2),20);return out;
}
function studioPdf(jpeg:Uint8Array,w:number,h:number){
 const encoder=new TextEncoder(),parts:BlobPart[]=[],offsets:number[]=[0];let size=0;
 const add=(value:string|Uint8Array)=>{const b=typeof value==="string"?encoder.encode(value):new Uint8Array(value);parts.push(b);size+=b.length;};
 const obj=(n:number,value:string)=>{offsets[n]=size;add(`${n} 0 obj\n${value}\nendobj\n`);};
 add("%PDF-1.4\n");obj(1,"<< /Type /Catalog /Pages 2 0 R >>");obj(2,"<< /Type /Pages /Count 1 /Kids [3 0 R] >>");obj(3,"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.275591 841.889764] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
 offsets[4]=size;add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);add(jpeg);add("\nendstream\nendobj\n");
 const content="q\n595.275591 0 0 841.889764 0 0 cm\n/Im0 Do\nQ\n";obj(5,`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);
 const xref=size;add("xref\n0 6\n0000000000 65535 f \n");for(let n=1;n<=5;n++)add(`${String(offsets[n]).padStart(10,"0")} 00000 n \n`);add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);return new Blob(parts,{type:"application/pdf"});
}
function studioValidate(blob:Blob,profile:StudioProfile,format:StudioFormat){
 if(!profile.formats.includes(format)||blob.type!==(format==="pdf"?"application/pdf":`image/${format}`))throw new Error("Invalid output format.");
 if(blob.size<Math.max(1,profile.min)||blob.size>profile.max)throw new Error(`File is ${(blob.size/1024).toFixed(1)} KB; required ${(profile.min/1024).toFixed(1)}–${(profile.max/1024).toFixed(2)} KB. No download. Try another source/format. No artificial padding is added.`);
}
async function studioEncode(canvas:HTMLCanvasElement,profile:StudioProfile,format:StudioFormat){
 if(canvas.width!==profile.w||canvas.height!==profile.h||!profile.formats.includes(format))throw new Error("Output profile mismatch.");
 if(format==="png"){const b=await studioCanvasBlob(canvas,"png");studioValidate(b,profile,format);return b;}
 let last:Blob|null=null;
 for(let step=0;step<=20;step++){const jpeg=await studioCanvasBlob(canvas,"jpeg",1-step*0.0475),bytes=studioDensity(new Uint8Array(await jpeg.arrayBuffer()),profile.dpi);last=format==="pdf"?studioPdf(bytes,canvas.width,canvas.height):new Blob([bytes],{type:"image/jpeg"});if(last.size>=profile.min&&last.size<=profile.max){studioValidate(last,profile,format);return last;}await new Promise<void>(r=>window.setTimeout(r,0));}
 if(last)studioValidate(last,profile,format);throw new Error("Could not meet the required file-size range.");
}


type StudioSnapshot={src:string;w:number;h:number};
type StudioPrintItem=StudioSnapshot&{id:string;x:number;y:number;mmW:number;mmH:number;fit:"contain"|"cover"};
const STUDIO_PAPERS=[{id:"a4",label:"A4",w:210,h:297},{id:"a5",label:"A5",w:148,h:210},{id:"letter",label:"Letter",w:215.9,h:279.4},{id:"4x6",label:"4 × 6 inch",w:101.6,h:152.4}];
function studioPlace(item:StudioPrintItem,pw:number,ph:number,margin:number){
 if(![item.x,item.y,item.mmW,item.mmH,pw,ph,margin].every(Number.isFinite)||margin<0||item.mmW<1||item.mmH<1||item.mmW>pw-2*margin||item.mmH>ph-2*margin)throw new Error("Photo size exceeds the printable layout area.");
 return {...item,x:clamp(item.x,margin,pw-margin-item.mmW),y:clamp(item.y,margin,ph-margin-item.mmH)};
}
function studioPack(items:StudioPrintItem[],pw:number,ph:number,margin:number,gap:number):StudioPrintItem[]|null{
 let x=margin,y=margin,row=0;const placed:StudioPrintItem[]=[];
 for(const item of items){if(item.mmW>pw-2*margin||item.mmH>ph-2*margin)return null;if(x+item.mmW>pw-margin+0.00001){x=margin;y+=row+gap;row=0;}if(y+item.mmH>ph-margin+0.00001)return null;placed.push({...item,x,y});x+=item.mmW+gap;row=Math.max(row,item.mmH);}return placed;
}
function studioOverlap(a:StudioPrintItem,b:StudioPrintItem){return a.x<b.x+b.mmW&&a.x+a.mmW>b.x&&a.y<b.y+b.mmH&&a.y+a.mmH>b.y;}

/* Print-layout clipboard copies retain dimensions, source and fit; no OS clipboard access. */
function studioClonePrintItem(items:StudioPrintItem[],source:StudioPrintItem,pw:number,ph:number,margin:number,gap:number,id:string,point?:{x:number;y:number}){
 if(items.length>=60)throw new Error("Maximum 60 photos per sheet.");
 if(!items.some(i=>i.src===source.src)&&new Set(items.map(i=>i.src)).size>=10)throw new Error("Maximum 10 unique source photos in this layout.");
 if(items.some(i=>i.id===id)||!id)throw new Error("A unique photo ID is required.");
 const base=studioPlace({...source,id,x:point?.x??margin,y:point?.y??margin},pw,ph,margin);
 if(point)return base;
 const xs=[margin,...items.map(i=>i.x+i.mmW+gap)].sort((a,b)=>a-b),ys=[margin,...items.map(i=>i.y+i.mmH+gap)].sort((a,b)=>a-b);
 for(const y of ys)for(const x of xs){const candidate={...base,x,y};if(x+base.mmW<=pw-margin+1e-8&&y+base.mmH<=ph-margin+1e-8&&!items.some(i=>studioOverlap(i,candidate)))return candidate;}
 return studioPlace({...base,x:source.x+Math.max(3,gap),y:source.y+Math.max(3,gap)},pw,ph,margin);
}


/* Local raster editing: bounded working bitmap, connected colour removal, PNG alpha. */
type StudioPoint={x:number;y:number};
type StudioRect={x:number;y:number;w:number;h:number};
function studioSelectionBounds(points:StudioPoint[],width:number,height:number):StudioRect|null{
 if(points.length<2||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
 const x=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x)))),y=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y))));
 const right=Math.min(width,Math.ceil(Math.max(...points.map(p=>p.x)))),bottom=Math.min(height,Math.ceil(Math.max(...points.map(p=>p.y))));
 return right>x&&bottom>y?{x,y,w:right-x,h:bottom-y}:null;
}
function studioRasterSize(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw new Error("Invalid image dimensions.");
 const scale=Math.min(1,3072/width,3072/height,Math.sqrt(4_000_000/(width*height)));
 return {w:Math.max(1,Math.floor(width*scale)),h:Math.max(1,Math.floor(height*scale))};
}
function studioFloodAlpha(data:Uint8ClampedArray,width:number,height:number,seeds:StudioPoint[],tolerance:number,softness:number){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>4_000_000||data.length!==width*height*4||!Number.isFinite(tolerance)||!Number.isFinite(softness))throw new Error("Invalid background-removal bitmap.");
 const count=width*height,tol=clamp(tolerance,0,255),soft=clamp(softness,0,100),limit=tol+soft;
 const colors=seeds.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>{const x=clamp(Math.floor(p.x),0,width-1),y=clamp(Math.floor(p.y),0,height-1),index=y*width+x,j=index*4;return {index,r:data[j],g:data[j+1],b:data[j+2],a:data[j+3]};});
 const visited=new Uint8Array(count),queue=new Uint32Array(count);let changed=0;
 for(const seed of colors){if(!seed.a||data[seed.index*4+3]===0)continue;visited.fill(0);let head=0,tail=0;queue[tail++]=seed.index;visited[seed.index]=1;const visit=(next:number)=>{if(!visited[next]){visited[next]=1;queue[tail++]=next;}};
  while(head<tail){const index=queue[head++],p=index*4,dist=Math.max(Math.abs(data[p]-seed.r),Math.abs(data[p+1]-seed.g),Math.abs(data[p+2]-seed.b));if(dist>limit)continue;
   const alpha=dist<=tol?0:Math.round(data[p+3]*(dist-tol)/Math.max(1,soft));if(alpha<data[p+3]){data[p+3]=alpha;changed++;}
   const x=index%width,y=Math.floor(index/width);
   if(x>0)visit(index-1);if(x<width-1)visit(index+1);if(y>0)visit(index-width);if(y<height-1)visit(index+width);
  }
 }
 return changed;
}
const studioRasterCache=new Map<string,HTMLImageElement>();
async function studioEnsureRaster(settings:Settings){
 if(!settings.raster)return;
 if(studioRasterCache.has(settings.raster)){const image=studioRasterCache.get(settings.raster)!;studioRasterCache.delete(settings.raster);studioRasterCache.set(settings.raster,image);return;}
 const image=await decode(settings.raster);
 if(image.naturalWidth!==settings.rasterWidth||image.naturalHeight!==settings.rasterHeight||image.naturalWidth*image.naturalHeight>4_000_000)throw new Error("Raster edit dimensions do not match the project.");
 studioRasterCache.set(settings.raster,image);while(studioRasterCache.size>6)studioRasterCache.delete(studioRasterCache.keys().next().value!);
}


type StudioRasterResult={src:string;w:number;h:number};
type StudioRasterCheckpoint={src:string;base:string;w:number;h:number};
type StudioRasterTool="rect"|"lasso"|"mark"|"erase"|"restore"|"background"|"pan";
function StudioRasterEditor({source,onClose,onApply}:{source:StudioSnapshot;onClose:()=>void;onApply:(result:StudioRasterResult)=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null),canvas=useRef<HTMLCanvasElement>(null),reference=useRef<HTMLCanvasElement|null>(null),view=useRef<HTMLDivElement>(null),workingRef=useRef(true),alive=useRef(true),referenceEncoded=useRef("");
 const past=useRef<StudioRasterCheckpoint[]>([]),future=useRef<StudioRasterCheckpoint[]>([]),drag=useRef<{tool:StudioRasterTool;start:StudioPoint;last:StudioPoint;before:StudioRasterCheckpoint|null;changed:boolean;clientX:number;clientY:number;left:number;top:number}|null>(null);
 const [tool,setTool]=useState<StudioRasterTool>("rect"),[selection,setSelection]=useState<StudioPoint[]>([]),[selectionKind,setSelectionKind]=useState<"rect"|"lasso">("rect");
 const [size,setSize]=useState({w:1,h:1}),[viewport,setViewport]=useState({w:800,h:600}),[zoom,setZoom]=useState(0),[brush,setBrush]=useState(20),[color,setColor]=useState("#ff3333"),[tolerance,setTolerance]=useState(30),[softness,setSoftness]=useState(10);
 const [ready,setReady]=useState(false),[counts,setCounts]=useState({past:0,future:0});
 const [busy,setBusy]=useState(true),[message,setMessage]=useState("Loading local image…"),[revision,setRevision]=useState(0);
 const fitted=Math.max(1,Math.min(size.w,viewport.w-32,(viewport.h-32)*size.w/size.h)),displayW=zoom===0?fitted:size.w*zoom/100;
 useEffect(()=>{alive.current=true;const el=dialog.current;if(el&&!el.open)el.showModal();let cancelled=false;void(async()=>{try{const image=await decode(source.src);if(cancelled||!canvas.current)return;const dims=studioRasterSize(Math.min(image.naturalWidth,source.w),Math.min(image.naturalHeight,source.h)),base=document.createElement("canvas");base.width=dims.w;base.height=dims.h;const b=canvas2d(base);b.imageSmoothingEnabled=true;b.imageSmoothingQuality="high";b.drawImage(image,0,0,dims.w,dims.h);reference.current=base;referenceEncoded.current=base.toDataURL("image/png");canvas.current.width=dims.w;canvas.current.height=dims.h;canvas2d(canvas.current).drawImage(base,0,0);setSize(dims);setReady(true);setMessage(`Working image ${dims.w} × ${dims.h} px${dims.w<image.naturalWidth||dims.h<image.naturalHeight?" (scaled to safe working/source resolution)":""}. Rectangle/lasso selects; brush tools mark, erase or restore. Apply flattens this edited image; Cancel leaves it unchanged.`);}catch(e){if(!cancelled)setMessage(e instanceof Error?e.message:"Cannot load image.");}finally{if(!cancelled){workingRef.current=false;setBusy(false);}}})();return()=>{cancelled=true;alive.current=false;if(el?.open)el.close();if(reference.current){reference.current.width=reference.current.height=1;reference.current=null;referenceEncoded.current="";}};},[source.src,source.w,source.h]);
 useEffect(()=>{const el=view.current;if(!el)return;const update=()=>setViewport({w:el.clientWidth,h:el.clientHeight});const observer=new ResizeObserver(update);observer.observe(el);const frame=window.requestAnimationFrame(update);return()=>{observer.disconnect();window.cancelAnimationFrame(frame);};},[]);
 useEffect(()=>{const el=view.current;if(!el)return;const wheel=(e:WheelEvent)=>{if(!(e.ctrlKey||e.metaKey))return;if(e.cancelable)e.preventDefault();if(workingRef.current)return;setZoom(clamp((zoom===0?fitted/size.w*100:zoom)*Math.exp(-clamp(e.deltaY,-120,120)*0.0025),10,800));};el.addEventListener("wheel",wheel,{passive:false});return()=>el.removeEventListener("wheel",wheel);});
 function take():StudioRasterCheckpoint{const c=canvas.current,b=reference.current;if(!c||!b)throw new Error("Image is not ready.");return {src:c.toDataURL("image/png"),base:referenceEncoded.current||b.toDataURL("image/png"),w:c.width,h:c.height};}
 function record(before:StudioRasterCheckpoint){past.current.push(before);let bytes=past.current.reduce((n,s)=>n+s.src.length+s.base.length,0);while(past.current.length>1&&(past.current.length>12||bytes>48_000_000)){const removed=past.current.shift()!;bytes-=removed.src.length+removed.base.length;}future.current=[];setCounts({past:past.current.length,future:0});setRevision(n=>n+1);}
 async function loadCheckpoint(snap:StudioRasterCheckpoint){const [image,base]=await Promise.all([decode(snap.src),decode(snap.base)]);const c=canvas.current,b=reference.current;if(!c||!b)return;c.width=b.width=snap.w;c.height=b.height=snap.h;canvas2d(c).drawImage(image,0,0);canvas2d(b).drawImage(base,0,0);referenceEncoded.current=snap.base;setSize({w:snap.w,h:snap.h});setSelection([]);}
 async function historyStep(redo=false){if(workingRef.current)return;const from=redo?future.current:past.current,to=redo?past.current:future.current,next=from.at(-1);if(!next)return;workingRef.current=true;setBusy(true);try{const now=take();await loadCheckpoint(next);from.pop();to.push(now);setCounts({past:past.current.length,future:future.current.length});setRevision(n=>n+1);setMessage(redo?"Edit redone.":"Edit undone.");}catch(e){setMessage(e instanceof Error?e.message:"History failed.");}finally{workingRef.current=false;if(alive.current)setBusy(false);}}
 function coords(e:ReactPointerEvent<HTMLCanvasElement>){const rect=e.currentTarget.getBoundingClientRect();return {x:clamp((e.clientX-rect.left)/rect.width*e.currentTarget.width,0,e.currentTarget.width),y:clamp((e.clientY-rect.top)/rect.height*e.currentTarget.height,0,e.currentTarget.height)};}
 function path(ctx:CanvasRenderingContext2D,points:StudioPoint[],kind:"rect"|"lasso"){ctx.beginPath();if(kind==="rect"){const box=studioSelectionBounds(points,canvas.current!.width,canvas.current!.height);if(box)ctx.rect(box.x,box.y,box.w,box.h);}else{points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}}
 function brushStroke(a:StudioPoint,b:StudioPoint,mode:StudioRasterTool){const c=canvas.current,base=reference.current;if(!c||!base)return;const ctx=canvas2d(c);ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=brush;
  if(mode==="restore"){ctx.beginPath();ctx.arc(b.x,b.y,brush/2,0,Math.PI*2);ctx.clip();ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(base,0,0);}else{ctx.globalCompositeOperation=mode==="erase"?"destination-out":"source-over";ctx.strokeStyle=color;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.beginPath();ctx.arc(b.x,b.y,brush/2,0,Math.PI*2);ctx.fill();}ctx.restore();}
 async function removeBackground(seeds:StudioPoint[]){if(workingRef.current||!canvas.current)return;workingRef.current=true;setBusy(true);try{await new Promise<void>(r=>window.setTimeout(r,30));const before=take();const c=canvas.current;if(!c)return;const ctx=canvas2d(c),pixels=ctx.getImageData(0,0,c.width,c.height);const changed=studioFloodAlpha(pixels.data,c.width,c.height,seeds,tolerance,softness);if(changed){ctx.putImageData(pixels,0,0);record(before);setMessage(`Removed connected background pixels. Undo if the subject was affected; adjust tolerance or refine with Erase/Restore. This is colour-based, not AI.`);}else setMessage("No matching opaque background found at the seed. Click a different background area or use Erase/Lasso.");}catch(e){setMessage(e instanceof Error?e.message:"Removal failed.");}finally{workingRef.current=false;if(alive.current)setBusy(false);}}
 function down(e:ReactPointerEvent<HTMLCanvasElement>){if(e.button!==0||workingRef.current||!canvas.current||!reference.current)return;e.preventDefault();e.currentTarget.focus();const point=coords(e);if(tool==="background"){void removeBackground([point]);return;}e.currentTarget.setPointerCapture(e.pointerId);const before=["mark","erase","restore"].includes(tool)?take():null;drag.current={tool,start:point,last:point,before,changed:!!before,clientX:e.clientX,clientY:e.clientY,left:view.current?.scrollLeft??0,top:view.current?.scrollTop??0};if(tool==="rect"||tool==="lasso"){setSelectionKind(tool);setSelection([point,point]);}else if(before){setSelection([]);brushStroke(point,point,tool);}}
 function move(e:ReactPointerEvent<HTMLCanvasElement>){const d=drag.current;if(!d||workingRef.current)return;if(d.tool==="pan"){if(view.current){view.current.scrollLeft=d.left-(e.clientX-d.clientX);view.current.scrollTop=d.top-(e.clientY-d.clientY);}return;}const point=coords(e);if(d.tool==="rect")setSelection([d.start,point]);else if(d.tool==="lasso")setSelection(points=>points.length<2048?[...points,point]:[...points.filter((_,i)=>i%2===0),point]);else{const distance=Math.hypot(point.x-d.last.x,point.y-d.last.y),steps=Math.max(1,Math.ceil(distance/Math.max(1,brush/4)));for(let n=1;n<=steps;n++){const end={x:d.last.x+(point.x-d.last.x)*n/steps,y:d.last.y+(point.y-d.last.y)*n/steps};brushStroke(d.last,end,d.tool);}d.changed=true;}d.last=point;}
 function end(){const d=drag.current;drag.current=null;if(d?.changed&&d.before){record(d.before);setMessage(d.tool==="mark"?"Mark added. Undo is available.":"Brush edit added. Use Restore to bring back original pixels.");}}
 function selectionAction(action:"crop"|"keep"|"delete"|"border"){if(workingRef.current||!canvas.current||!reference.current)return;const c=canvas.current,b=reference.current,box=studioSelectionBounds(selection,c.width,c.height);if(!box||(selectionKind==="lasso"&&selection.length<3)){setMessage("Draw a rectangle or closed freehand selection first.");return;}const before=take(),ctx=canvas2d(c);
  if(action==="border"){ctx.save();path(ctx,selection,selectionKind);ctx.lineWidth=brush;ctx.strokeStyle=color;ctx.stroke();ctx.restore();}
  else if(action==="delete"){ctx.save();ctx.globalCompositeOperation="destination-out";path(ctx,selection,selectionKind);ctx.fill();ctx.restore();}
  else{if(action==="keep"||selectionKind==="lasso"){const mask=document.createElement("canvas");mask.width=c.width;mask.height=c.height;const m=canvas2d(mask);path(m,selection,selectionKind);m.fillStyle="#ffffff";m.fill();ctx.save();ctx.globalCompositeOperation="destination-in";ctx.drawImage(mask,0,0);ctx.restore();mask.width=mask.height=1;}
   if(action==="crop"){const temp=document.createElement("canvas"),base=document.createElement("canvas");temp.width=base.width=box.w;temp.height=base.height=box.h;canvas2d(temp).drawImage(c,box.x,box.y,box.w,box.h,0,0,box.w,box.h);canvas2d(base).drawImage(b,box.x,box.y,box.w,box.h,0,0,box.w,box.h);c.width=b.width=box.w;c.height=b.height=box.h;canvas2d(c).drawImage(temp,0,0);canvas2d(b).drawImage(base,0,0);referenceEncoded.current=b.toDataURL("image/png");temp.width=temp.height=base.width=base.height=1;setSize({w:box.w,h:box.h});setZoom(0);}
  }record(before);setSelection([]);setMessage(action==="crop"?"Cropped to selection. Freehand edges remain transparent; Restore can refine the cutout.":"Selection edit applied. Undo is available.");}
 async function apply(){if(workingRef.current||!canvas.current||!reference.current)return;workingRef.current=true;setBusy(true);try{const c=canvas.current,src=c.toDataURL("image/png");if(src.length>24_000_000)throw new Error("Edited PNG is too large. Crop or reduce the image before applying.");await onApply({src,w:c.width,h:c.height});}catch(e){if(alive.current)setMessage(e instanceof Error?e.message:"Cannot apply edit.");}finally{workingRef.current=false;if(alive.current)setBusy(false);}}
 const selectionPath=selectionKind==="rect"?(()=>{const r=studioSelectionBounds(selection,size.w,size.h);return r?`M ${r.x} ${r.y} h ${r.w} v ${r.h} h ${-r.w} Z`:"";})():selection.map((p,i)=>`${i?"L":"M"} ${p.x} ${p.y}`).join(" ")+" Z";
 return <dialog ref={dialog} aria-labelledby="studio-raster-title" onCancel={e=>{e.preventDefault();e.stopPropagation();if(!workingRef.current)onClose();}} onKeyDown={e=>{e.stopPropagation();if((e.target as HTMLElement).closest("input,textarea,select"))return;const key=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;if(mod&&key==="p"){e.preventDefault();setMessage("Apply or Cancel this editor first, then use Print layout.");return;}if(mod&&["z","y","a"].includes(key)){e.preventDefault();if(key==="a"){setSelectionKind("rect");setSelection([{x:0,y:0},{x:size.w,y:size.h}]);}else void historyStep(key==="y"||e.shiftKey);}if(e.key==="Delete"&&!mod){e.preventDefault();selectionAction("delete");}}} className="fixed inset-0 m-auto h-[94dvh] w-[96vw] max-w-375 overflow-hidden rounded-2xl border border-white/20 bg-[#0c1828] p-0 text-slate-100 shadow-2xl backdrop:bg-black/80">
 <div className="flex h-full flex-col"><header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3"><div><h2 id="studio-raster-title" className="font-bold text-emerald-300">Selection · Crop · Mark · Background</h2><p className="text-xs text-slate-400">Local editing · {size.w} × {size.h} px · Apply flattens this image, Cancel discards changes</p></div><div className="flex gap-2"><button disabled={busy||!ready} className={btn} onClick={()=>void apply()}>Apply changes</button><button disabled={busy} className={btn} onClick={onClose}>Cancel</button></div></header>
 <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto md:grid-cols-[270px_minmax(0,1fr)]"><aside className="space-y-3 overflow-auto border-r border-white/10 p-3"><fieldset disabled={busy||!ready} className="space-y-3"><legend className="sr-only">Raster editing controls</legend>
 <div className="grid grid-cols-2 gap-2">{([["rect","Rectangle select"],["lasso","Freehand select"],["mark","Marker brush"],["erase","Erase brush"],["restore","Restore brush"],["background","Click background"],["pan","Pan view"]] as const).map(([id,label])=><button key={id} className={`${btn} ${tool===id?"border-emerald-300 bg-emerald-500/20":""}`} aria-pressed={tool===id} onClick={()=>setTool(id)}>{label}</button>)}</div>
 <div className="grid grid-cols-2 gap-2"><button className={btn} onClick={()=>{setSelectionKind("rect");setSelection([{x:0,y:0},{x:size.w,y:size.h}]);}}>Select all</button><button className={btn} onClick={()=>setSelection([])}>Clear selection</button><button className={btn} onClick={()=>selectionAction("crop")}>Crop selection</button><button className={btn} onClick={()=>selectionAction("keep")}>Keep selection</button><button className={btn} onClick={()=>selectionAction("delete")}>Delete selection</button><button className={btn} onClick={()=>selectionAction("border")}>Mark outline</button></div>
 <label className="block text-xs">Brush / outline width: {brush} px<input className="mt-2 w-full accent-emerald-400" type="range" min={1} max={120} value={brush} onChange={e=>setBrush(Number(e.target.value))}/></label><label className="flex items-center justify-between text-xs">Mark colour<input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
 <label className="block text-xs">Background tolerance: {tolerance}<input className="mt-2 w-full accent-emerald-400" type="range" min={0} max={160} value={tolerance} onChange={e=>setTolerance(Number(e.target.value))}/></label><label className="block text-xs">Edge softness: {softness}<input className="mt-2 w-full accent-emerald-400" type="range" min={0} max={60} value={softness} onChange={e=>setSoftness(Number(e.target.value))}/></label>
 <button className={`${btn} w-full`} onClick={()=>void removeBackground([{x:0,y:0},{x:size.w-1,y:0},{x:0,y:size.h-1},{x:size.w-1,y:size.h-1}])}>Remove corner-connected background</button>
 <div className="grid grid-cols-2 gap-2"><button className={btn} disabled={!counts.past} onClick={()=>void historyStep()}>Undo edit</button><button className={btn} disabled={!counts.future} onClick={()=>void historyStep(true)}>Redo edit</button></div>
 <p className="text-xs leading-5 text-amber-200">Colour-based removal is not AI subject detection. Use Lasso → Keep selection for complex backgrounds, then Erase/Restore for edges. Check the result before Apply. Working image is capped at 4 MP; applying commits that resolution.</p><p className="text-xs leading-5 text-slate-400">Brush tools act on the whole working image, not only the selection. Crop/marks/removal are flattened when applied. Export PNG with transparency to keep cutout edges. JPEG and printing use a solid background. Ctrl/⌘+Z undo; Ctrl/⌘+A select all; Ctrl/⌘+wheel zoom.</p>
 </fieldset></aside><div className="flex min-h-0 min-w-0 flex-col"><div className="flex flex-wrap gap-2 border-b border-white/10 p-2"><button className={btn} onClick={()=>setZoom(0)}>Fit</button><button className={btn} onClick={()=>setZoom(100)}>100%</button><button className={btn} onClick={()=>setZoom(clamp((zoom===0?fitted/size.w*100:zoom)/1.25,10,800))}>−</button><button className={btn} onClick={()=>setZoom(clamp((zoom===0?fitted/size.w*100:zoom)*1.25,10,800))}>+</button><output className="self-center text-xs">{zoom===0?"Fit":`${Math.round(zoom)}%`}</output></div>
 <div ref={view} className="flex min-h-80 min-w-0 flex-1 overflow-auto bg-slate-700/40 p-4" style={{overscrollBehavior:"contain"}}><div className="relative m-auto shrink-0" style={{width:displayW,backgroundImage:"conic-gradient(#233044 25%,#121e30 0 50%,#233044 0 75%,#121e30 0)",backgroundSize:"20px 20px"}}><canvas ref={canvas} tabIndex={0} aria-label="Editable photo: drag to select, mark, erase or restore" onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} className="block h-auto w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" style={{cursor:tool==="pan"?"grab":"crosshair"}}/><svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`}><path d={selection.length>=2?selectionPath:""} fill="rgba(16,185,129,0.12)" stroke="#ffffff" strokeWidth={Math.max(1,size.w/displayW)} strokeDasharray={`${6*size.w/displayW} ${4*size.w/displayW}`}/></svg></div></div></div></div>
 <footer role="status" aria-live="polite" data-revision={revision} className="border-t border-white/10 p-3 text-xs leading-5 text-amber-200">{busy?"Working… ":""}{message}</footer></div>
 </dialog>;
}

function StudioPrintLayout({snapshot,onClose}:{snapshot:StudioSnapshot;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),sheet=useRef<HTMLDivElement>(null),upload=useRef<HTMLInputElement>(null),printing=useRef(false),importing=useRef(false);
 const [rasterTarget,setRasterTarget]=useState<StudioPrintItem|null>(null);
 const [paperId,setPaperId]=useState("a4"),[landscape,setLandscape]=useState(false),[margin,setMargin]=useState(5),[gap,setGap]=useState(3),[snap,setSnap]=useState(true);
 const paper=STUDIO_PAPERS.find(p=>p.id===paperId)!;const pw=landscape?paper.h:paper.w,ph=landscape?paper.w:paper.h;
 const [items,setItems]=useState<StudioPrintItem[]>([{...snapshot,id:"initial",x:5,y:5,mmW:35,mmH:45,fit:"cover"}]);
 const itemsRef=useRef(items);
 const copiedRef=useRef<StudioPrintItem|null>(null);
 const [hasCopy,setHasCopy]=useState(false);
 const [contextMenu,setContextMenu]=useState<{left:number;top:number;x:number;y:number;targetId:string|null}|null>(null);
 const menuRef=useRef<HTMLDivElement>(null),contextOrigin=useRef<HTMLElement|null>(null);
 function writeItems(value:StudioPrintItem[]|((list:StudioPrintItem[])=>StudioPrintItem[])){const next=typeof value==="function"?value(itemsRef.current):value;itemsRef.current=next;setItems(next);}
 const [selected,setSelected]=useState("initial"),[past,setPast]=useState<StudioPrintItem[][]>([]),[future,setFuture]=useState<StudioPrintItem[][]>([]);
 const [note,setNote]=useState("Drag photos on the sheet. All positions and sizes are in millimetres."),[working,setWorking]=useState(false);
 const drag=useRef<{id:string;px:number;py:number;x:number;y:number;scale:number}|null>(null);
 const current=items.find(i=>i.id===selected);const overlap=items.some((a,i)=>items.slice(i+1).some(b=>studioOverlap(a,b)));
 useEffect(()=>{const el=dialog.current;if(el&&!el.open)el.showModal();return()=>{if(el?.open)el.close();};},[]);
 function change(next:StudioPrintItem[]){const before=itemsRef.current;setPast(p=>[...p,before].slice(-30));setFuture([]);writeItems(next);}
 function undo(){const last=past.at(-1);if(last){setFuture(f=>[items,...f].slice(0,30));setPast(p=>p.slice(0,-1));writeItems(last);}}
 function redo(){const next=future[0];if(next){setPast(p=>[...p,items].slice(-30));setFuture(f=>f.slice(1));writeItems(next);}}
 async function applyPrintRaster(result:StudioRasterResult){if(!rasterTarget)return;const before=itemsRef.current;if(!before.some(i=>i.id===rasterTarget.id))throw new Error("Selected photo no longer exists.");change(before.map(i=>i.id===rasterTarget.id?{...i,...result,fit:"contain" as const}:i));setSelected(rasterTarget.id);setRasterTarget(null);setNote("Selected photo updated; physical print dimensions are unchanged. Layout Undo restores the previous image. Contain keeps the whole edited cutout visible.");focusPhoto(rasterTarget.id);}
 function focusPhoto(id?:string){window.requestAnimationFrame(()=>{const photo=id?Array.from(sheet.current?.querySelectorAll<HTMLButtonElement>("[data-print-item]")??[]).find(el=>el.dataset.printItem===id):null;(photo??sheet.current)?.focus({preventScroll:true});});}
 function closeContext(restore=false){setContextMenu(null);if(restore)window.requestAnimationFrame(()=>{if(contextOrigin.current?.isConnected)contextOrigin.current.focus({preventScroll:true});else sheet.current?.focus({preventScroll:true});});}
 function copyPhoto(id=selected){if(working||importing.current||printing.current)return;const source=itemsRef.current.find(i=>i.id===id);if(!source){setNote("Select a photo to copy.");return;}copiedRef.current={...source};setHasCopy(true);setNote(`Photo copied inside this print layout (${source.mmW} × ${source.mmH} mm). Use Ctrl/⌘+V or Paste; the system clipboard is unchanged.`);}
 function insertPhoto(source:StudioPrintItem,point?:{x:number;y:number}){if(working||importing.current||printing.current)return;try{const before=itemsRef.current;const added=studioClonePrintItem(before,source,pw,ph,margin,gap,crypto.randomUUID(),point);change([...before,added]);setSelected(added.id);focusPhoto(added.id);setNote(`New copy: ${added.mmW} × ${added.mmH} mm. ${before.some(i=>studioOverlap(i,added))?"Warning: overlaps another photo; move it or use Auto arrange.":"Placed without overlap."}`);}catch(e){setNote(e instanceof Error?e.message:"Unable to paste photo.");}}
 function pastePhoto(point?:{x:number;y:number}){if(!copiedRef.current){setNote("Copy a photo in this print layout first.");return;}insertPhoto(copiedRef.current,point);}
 function duplicatePhoto(id=selected){const source=itemsRef.current.find(i=>i.id===id);if(source)insertPhoto({...source});else setNote("Select a photo to duplicate.");}
 function removePhoto(id=selected){if(working||importing.current||printing.current)return;const before=itemsRef.current;if(!before.some(i=>i.id===id))return;change(before.filter(i=>i.id!==id));setSelected("");focusPhoto();setNote("Photo removed. Undo layout restores it.");}
 function openContext(e:ReactMouseEvent<HTMLDivElement>){e.preventDefault();e.stopPropagation();if(working||importing.current||printing.current)return;const target=(e.target as HTMLElement).closest<HTMLButtonElement>("[data-print-item]"),rect=sheet.current?.getBoundingClientRect(),bounds=dialog.current?.getBoundingClientRect();if(!rect||!bounds)return;drag.current=null;contextOrigin.current=target??sheet.current;const r=target?.getBoundingClientRect();const cx=e.clientX||((r?.left??rect.left)+(r?.width??rect.width)/2),cy=e.clientY||((r?.top??rect.top)+(r?.height??rect.height)/2);const targetId=target?.dataset.printItem??null;if(targetId)setSelected(targetId);setContextMenu({left:clamp(cx-bounds.left,8,Math.max(8,bounds.width-216)),top:clamp(cy-bounds.top,8,Math.max(8,bounds.height-242)),x:(cx-rect.left)/rect.width*pw,y:(cy-rect.top)/rect.height*ph,targetId});}
 useEffect(()=>{if(!contextMenu)return;const frame=window.requestAnimationFrame(()=>menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());return()=>window.cancelAnimationFrame(frame);},[contextMenu]);
 function patch(patch:Partial<StudioPrintItem>){if(!current)return;try{const next=studioPlace({...current,...patch},pw,ph,margin);change(items.map(i=>i.id===selected?next:i));}catch(e){setNote(e instanceof Error?e.message:"Invalid layout.");}}
 function reconfigure(id:string,rotation:boolean,m:number){const base=STUDIO_PAPERS.find(p=>p.id===id)!;const w=rotation?base.h:base.w,h=rotation?base.w:base.h;try{const next=items.map(i=>studioPlace(i,w,h,m));setPaperId(id);setLandscape(rotation);setMargin(m);writeItems(next);setPast([]);setFuture([]);setNote("Paper updated; photo sizes are unchanged.");}catch(e){setNote(e instanceof Error?e.message:"Paper is too small.");}}
 function add(source:StudioSnapshot=snapshot){if(items.length>=60){setNote("Maximum 60 photos per sheet.");return;}try{const base=studioPlace({...source,id:crypto.randomUUID(),x:margin,y:margin,mmW:current?.mmW??35,mmH:current?.mmH??45,fit:current?.fit??"cover"},pw,ph,margin);let free:StudioPrintItem|null=null;const xs=[margin,...items.map(i=>i.x+i.mmW+gap)].sort((a,b)=>a-b),ys=[margin,...items.map(i=>i.y+i.mmH+gap)].sort((a,b)=>a-b);for(const y of ys){for(const x of xs){const candidate={...base,x,y};if(x+base.mmW<=pw-margin&&y+base.mmH<=ph-margin&&!items.some(i=>studioOverlap(i,candidate))){free=candidate;break;}}if(free)break;}const added=free??base;change([...items,added]);setSelected(added.id);if(!free)setNote("New photo added at the margin; arrange manually to avoid overlap.");}catch(e){setNote(e instanceof Error?e.message:"Cannot add photo.");}}
 async function importPhoto(file?:File){if(!file||working||importing.current||printing.current)return;importing.current=true;setWorking(true);try{if(new Set(items.map(i=>i.src)).size>=10)throw new Error("Maximum 10 unique source photos in this layout.");if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>20*1024*1024)throw new Error("Use PNG/JPEG/WebP up to 20 MB.");const image=await decode(await fileData(file)),ratio=image.naturalWidth/image.naturalHeight,canvas=document.createElement("canvas");try{draw(canvas,image,{...INITIAL,layers:[]},Math.max(1,Math.floor(Math.min(image.naturalWidth,3000,3000*ratio,Math.sqrt(8_000_000*ratio)))),"#FFFFFF");add({src:canvas.toDataURL("image/jpeg",0.95),w:canvas.width,h:canvas.height});}finally{canvas.width=canvas.height=1;}}catch(e){setNote(e instanceof Error?e.message:"Unable to import.");}finally{importing.current=false;setWorking(false);}}
 function begin(e:ReactPointerEvent<HTMLButtonElement>,item:StudioPrintItem){if(e.button!==0||working||importing.current||printing.current)return;const rect=sheet.current?.getBoundingClientRect();if(!rect)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);setSelected(item.id);setPast(p=>[...p,items].slice(-30));setFuture([]);drag.current={id:item.id,px:e.clientX,py:e.clientY,x:item.x,y:item.y,scale:rect.width/pw};}
 function move(e:ReactPointerEvent<HTMLButtonElement>){const d=drag.current;if(!d||working||importing.current||printing.current)return;const round=(v:number)=>snap?Math.round(v):Math.round(v*10)/10;writeItems(list=>list.map(i=>i.id===d.id?studioPlace({...i,x:round(d.x+(e.clientX-d.px)/d.scale),y:round(d.y+(e.clientY-d.py)/d.scale)},pw,ph,margin):i));}
 function align(where:"left"|"center"|"right"|"top"|"middle"|"bottom"){if(!current)return;patch(where==="left"?{x:margin}:where==="center"?{x:(pw-current.mmW)/2}:where==="right"?{x:pw-margin-current.mmW}:where==="top"?{y:margin}:where==="middle"?{y:(ph-current.mmH)/2}:{y:ph-margin-current.mmH});}
 async function printSheet(){if(printing.current||importing.current||!items.length)return;printing.current=true;setWorking(true);setNote("Preparing print images…");let frame:HTMLIFrameElement|null=null;
  try{items.forEach(i=>studioPlace(i,pw,ph,margin));frame=document.createElement("iframe");frame.title="Photo sheet print document";frame.style.cssText="position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0";document.body.appendChild(frame);
   const doc=frame.contentDocument,win=frame.contentWindow;if(!doc||!win)throw new Error("Browser could not open a print document.");
   doc.open();doc.write("<!doctype html><html><head><title>Photo Studio print sheet</title></head><body></body></html>");doc.close();
   const style=doc.createElement("style");style.textContent=`@page{size:${pw}mm ${ph}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:${pw}mm;height:${ph}mm;background:white}#sheet{position:relative;width:${pw}mm;height:${ph}mm;overflow:hidden;break-inside:avoid}img{position:absolute;display:block;background:white;print-color-adjust:exact;-webkit-print-color-adjust:exact}`;doc.head.appendChild(style);
   const root=doc.createElement("div");root.id="sheet";doc.body.appendChild(root);
   const loads=items.map(item=>new Promise<void>((resolve,reject)=>{const img=doc.createElement("img");img.alt="";img.style.cssText=`left:${item.x}mm;top:${item.y}mm;width:${item.mmW}mm;height:${item.mmH}mm;object-fit:${item.fit};object-position:center`;img.onload=()=>resolve();img.onerror=()=>reject(new Error("A print image could not load."));img.src=item.src;root.appendChild(img);}));
   let timeout:number|undefined;try{await Promise.race([Promise.all(loads),new Promise<never>((_,reject)=>{timeout=window.setTimeout(()=>reject(new Error("Print images timed out. Please retry.")),30000);})]);}finally{window.clearTimeout(timeout);}
   await new Promise<void>(resolve=>window.setTimeout(resolve,150));const target=frame;const clean=()=>target.remove();win.addEventListener("afterprint",()=>window.setTimeout(clean,1000),{once:true});window.setTimeout(clean,300000);win.focus();win.print();setNote("Print dialog requested. Choose matching paper, 100% / Actual size, margins None and headers/footers Off. Printer hardware may clip edge content.");
  }catch(e){frame?.remove();setNote(e instanceof Error?e.message:"Printing failed.");}finally{printing.current=false;setWorking(false);}}
 const numberInput=(label:string,value:number,onChange:(n:number)=>void,min:number,max:number)=><label className="block text-xs text-slate-300">{label}<input className={field} type="number" value={Math.round(value*10)/10} step="0.1" min={min} max={max} onChange={e=>{if(e.target.value!==""){const v=Number(e.target.value);if(Number.isFinite(v)&&v>=min&&v<=max)onChange(v);}}}/></label>;
 return <dialog ref={dialog} aria-labelledby="studio-print-title" onCancel={e=>{e.preventDefault();if(contextMenu){closeContext(true);return;}if(!working)onClose();}} onPointerDown={e=>{if(contextMenu&&!menuRef.current?.contains(e.target as Node))closeContext();}} onKeyDown={e=>{e.stopPropagation();if(e.defaultPrevented)return;const mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();if(mod&&key==="p"){e.preventDefault();closeContext();void printSheet();return;}if((e.target as HTMLElement).closest("input,textarea,select,[contenteditable='true']"))return;if(mod&&["c","v","d","z","y"].includes(key)){e.preventDefault();if(working||importing.current||printing.current)return;closeContext();if(key==="c")copyPhoto();else if(key==="v")pastePhoto();else if(key==="d")duplicatePhoto();else if(key==="y"||(key==="z"&&e.shiftKey))redo();else undo();return;}if((e.key==="Delete"||e.key==="Backspace")&&current){e.preventDefault();closeContext();removePhoto();}}} className="fixed inset-0 m-auto h-[94dvh] w-[96vw] max-w-375 overflow-hidden rounded-2xl border border-white/20 bg-[#0c1828] p-0 text-slate-100 shadow-2xl backdrop:bg-black/80">
  {rasterTarget&&<StudioRasterEditor source={rasterTarget} onClose={()=>setRasterTarget(null)} onApply={applyPrintRaster}/>}
  <div className="flex h-full flex-col"><header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-4"><div><h2 id="studio-print-title" className="text-lg font-bold text-emerald-300">Print Layout Studio</h2><p className="text-xs text-slate-400">One sheet · mm-based positioning · drag photos without changing their size</p></div><div className="flex gap-2"><button className={btn} disabled={working||!items.length} onClick={()=>void printSheet()}>Print sheet</button><button className={btn} disabled={working} onClick={onClose}>Close</button></div></header>
  <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto md:grid-cols-[290px_minmax(0,1fr)]"><aside className="space-y-4 border-r border-white/10 p-4 md:overflow-y-auto">
   <fieldset disabled={working} className="space-y-3"><legend className="sr-only">Print layout controls</legend>
   <label className="block text-xs">Paper<select className={field} value={paperId} onChange={e=>reconfigure(e.target.value,landscape,margin)}>{STUDIO_PAPERS.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
   <label className="flex gap-2 text-xs"><input type="checkbox" checked={landscape} onChange={e=>reconfigure(paperId,e.target.checked,margin)}/>Landscape</label>
   <div className="grid grid-cols-2 gap-2">{numberInput("Safe margin (mm)",margin,n=>reconfigure(paperId,landscape,n),0,20)}{numberInput("Arrange gap (mm)",gap,setGap,0,20)}</div>
   <label className="flex gap-2 text-xs"><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>Snap drag to 1 mm</label>
   <div className="grid grid-cols-2 gap-2"><button className={btn} onClick={()=>add()}>Add edited photo</button><button className={btn} onClick={()=>upload.current?.click()}>Import photo</button><button className={btn} disabled={!current} onClick={()=>duplicatePhoto()}>Duplicate</button><button className={btn} disabled={!current} onClick={()=>removePhoto()}>Remove</button><button className={btn} disabled={!past.length} onClick={undo}>Undo layout</button><button className={btn} disabled={!future.length} onClick={redo}>Redo layout</button></div>
   <div className="grid grid-cols-2 gap-2"><button className={btn} disabled={!current} title="Copy selected photo (Ctrl/⌘+C)" onClick={()=>copyPhoto()}>Copy photo</button><button className={btn} disabled={!hasCopy||items.length>=60} title="Paste a new copy (Ctrl/⌘+V)" onClick={()=>pastePhoto()}>Paste photo</button></div>
   <p className="text-xs leading-5 text-slate-400">Select a photo: Ctrl/⌘+C → Ctrl/⌘+V · Ctrl/⌘+D duplicate · Right-click for Copy / Paste here. Copies keep their size and fit. Clipboard is local to this print-layout window.</p>
   <button className={`${btn} w-full text-emerald-300`} disabled={!current} onClick={()=>{if(current){closeContext();setRasterTarget({...current});}}}>Crop / Mark / Remove background</button>
   <input ref={upload} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0];e.target.value="";void importPhoto(f);}}/>
   <button className={`${btn} w-full`} onClick={()=>{const next=studioPack(items,pw,ph,margin,gap);if(next)change(next);else setNote("Photos do not all fit. Remove copies, reduce their size or choose larger paper. No automatic shrinking.");}}>Auto arrange (keep sizes)</button>
   {current&&<div className="space-y-3 rounded-xl border border-white/15 p-3"><p className="text-xs text-emerald-300">Selected photo · {Math.round((current.fit==="cover"?Math.min(current.w/current.mmW,current.h/current.mmH):Math.max(current.w/current.mmW,current.h/current.mmH))*25.4)} effective source DPI</p><label className="block text-xs">Size preset<select className={field} value="" onChange={e=>{const [w,h]=e.target.value.split(",").map(Number);if(w&&h)patch({mmW:w,mmH:h});}}><option value="" disabled>Choose size…</option><option value="35,45">35 × 45 mm</option><option value="50.8,50.8">2 × 2 inch</option><option value="25,30">25 × 30 mm</option><option value="101.6,152.4">4 × 6 inch</option></select></label>
   <div className="grid grid-cols-2 gap-2">{numberInput("Width (mm)",current.mmW,n=>patch({mmW:n}),1,pw-2*margin)}{numberInput("Height (mm)",current.mmH,n=>patch({mmH:n}),1,ph-2*margin)}{numberInput("X (mm)",current.x,n=>patch({x:n}),margin,pw-margin-current.mmW)}{numberInput("Y (mm)",current.y,n=>patch({y:n}),margin,ph-margin-current.mmH)}</div>
   <label className="block text-xs">Fit<select className={field} value={current.fit} onChange={e=>patch({fit:e.target.value as "contain"|"cover"})}><option value="contain">Contain · full image</option><option value="cover">Cover · centre crop</option></select></label>
   <div className="grid grid-cols-3 gap-1">{(["left","center","right","top","middle","bottom"] as const).map(a=><button key={a} className={`${btn} px-1 capitalize`} onClick={()=>align(a)}>{a}</button>)}</div></div>}
   <p className="text-xs leading-5 text-amber-200">Preview is scaled to your screen, not a physical ruler. Print at Actual size / 100%. Match paper size; disable headers/footers and automatic fit. Safe margin is only a guide; check printer limits.</p>
   <p className="text-xs text-slate-400">Layout is temporary and is not included in Save project. Closing this window discards this layout, not your photo edits.</p>
   </fieldset>
  </aside><div className="min-w-0 overflow-auto bg-slate-700/40 p-5"><div className="mx-auto w-full max-w-190"><div ref={sheet} tabIndex={0} onContextMenu={openContext} aria-label="Print sheet preview; right-click to paste a copied photo" className="relative w-full overflow-hidden bg-white shadow-2xl" style={{aspectRatio:`${pw}/${ph}`,touchAction:"none"}}>
   <div className="pointer-events-none absolute border border-dashed border-slate-300" style={{left:`${margin/pw*100}%`,top:`${margin/ph*100}%`,right:`${margin/pw*100}%`,bottom:`${margin/ph*100}%`}}/>
   {items.map((item,index)=><button key={item.id} data-print-item={item.id} disabled={working} aria-label={`Photo ${index+1}; drag or use arrow keys`} aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)} onPointerDown={e=>begin(e,item)} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={e=>{if(!working&&!importing.current&&!printing.current&&e.key.startsWith("Arrow")){e.preventDefault();const d=e.shiftKey?5:1;setSelected(item.id);try{const next=studioPlace({...item,x:item.x+(e.key==="ArrowLeft"?-d:e.key==="ArrowRight"?d:0),y:item.y+(e.key==="ArrowUp"?-d:e.key==="ArrowDown"?d:0)},pw,ph,margin);change(items.map(i=>i.id===item.id?next:i));}catch{}}}} className={`absolute touch-none overflow-hidden bg-white p-0 focus-visible:outline-2 focus-visible:outline-amber-500 ${selected===item.id?"z-10 outline-2 outline-emerald-500":""}`} style={{left:`${item.x/pw*100}%`,top:`${item.y/ph*100}%`,width:`${item.mmW/pw*100}%`,height:`${item.mmH/ph*100}%`,cursor:"move"}}><img src={item.src} alt={`Print photo ${index+1}`} draggable={false} className="pointer-events-none h-full w-full select-none" style={{objectFit:item.fit}}/></button>)}
  </div><p className="mt-3 text-xs text-slate-300">{pw} × {ph} mm · {items.length} photo(s) · {overlap?"Warning: some photos overlap":"No overlaps detected"}</p></div></div></div>
  <footer role="status" aria-live="polite" className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-amber-200">{working?"Working… ":""}{note}</footer></div>
  {contextMenu&&<div ref={menuRef} role="menu" aria-label="Photo clipboard actions" onContextMenu={e=>e.preventDefault()} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))closeContext();}} onKeyDown={e=>{const keys=["ArrowDown","ArrowUp","Home","End","Escape","Tab"];if(!keys.includes(e.key))return;e.stopPropagation();if(e.key==="Escape"){e.preventDefault();closeContext(true);return;}if(e.key==="Tab"){closeContext();return;}e.preventDefault();const options=Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);if(!options.length)return;const at=options.indexOf(document.activeElement as HTMLButtonElement);const next=e.key==="Home"?0:e.key==="End"?options.length-1:e.key==="ArrowDown"?(at+1)%options.length:(at-1+options.length)%options.length;options[next]?.focus();}} className="absolute z-50 w-50 space-y-1 rounded-xl border border-white/20 bg-[#152339] p-2 text-xs shadow-2xl" style={{left:contextMenu.left,top:contextMenu.top}}>
   <button role="menuitem" className={`${btn} w-full text-left`} disabled={!contextMenu.targetId||working} onClick={()=>{const id=contextMenu.targetId;closeContext(true);if(id)copyPhoto(id);}}>Copy photo</button>
   <button role="menuitem" className={`${btn} w-full text-left`} disabled={!contextMenu.targetId||working||items.length>=60} onClick={()=>{const id=contextMenu.targetId;closeContext();if(id)duplicatePhoto(id);}}>Duplicate</button>
   <button role="menuitem" className={`${btn} w-full text-left`} disabled={!hasCopy||working||items.length>=60} onClick={()=>{const point={x:contextMenu.x,y:contextMenu.y};closeContext();pastePhoto(point);}}>Paste here</button>
   <button role="menuitem" className={`${btn} w-full text-left text-rose-300`} disabled={!contextMenu.targetId||working} onClick={()=>{const id=contextMenu.targetId;closeContext();if(id)removePhoto(id);}}>Delete photo</button>
   <button role="menuitem" className={`${btn} w-full text-left`} onClick={()=>closeContext(true)}>Close menu</button>
  </div>}

 </dialog>;
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
  const [zoom, setZoom] = useState(0);
  const [outputWidth, setOutputWidth] = useState(1600);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState(92);
  const [background, setBackground] = useState("#FFFFFF");
  const [transparent, setTransparent] = useState(true);
  const [name, setName] = useState("alimxl-photo");
  const [dirty, setDirty] = useState(false);
  const [previewSize, setPreviewSize] = useState({ w:1, h:1 });
  const [pageMenu,setPageMenu]=useState<{x:number;y:number}|null>(null);
  const pageMenuRef=useRef<HTMLDivElement>(null);

  const [submissionId,setSubmissionId]=useState("passport"),[submissionFormat,setSubmissionFormat]=useState<StudioFormat>("jpeg"),[submissionFit,setSubmissionFit]=useState<"contain"|"cover">("contain");
  const submission=STUDIO_PROFILES.find(p=>p.id===submissionId)!;
  const [printSnapshot,setPrintSnapshot]=useState<StudioSnapshot|null>(null);
  const [rasterSource,setRasterSource]=useState<StudioSnapshot|null>(null);
  const viewportRef=useRef<HTMLDivElement>(null);
  const panRef=useRef<{id:number;x:number;y:number;left:number;top:number}|null>(null);
  const [viewportSize,setViewportSize]=useState({w:800,h:600});
  const viewCrop=asset?crop(asset.image,compare?INITIAL:s):null;
  const viewBaseW=viewCrop?Math.max(1,Math.round((compare?INITIAL:s).rotation%180?viewCrop.h:viewCrop.w)):previewSize.w;
  const viewAspect=asset?aspect(asset.image,compare?INITIAL:s):1;
  const fitWidth=Math.max(1,Math.min(viewBaseW,viewportSize.w-40,(viewportSize.h-40)*viewAspect));
  const displayedWidth=zoom===0?fitWidth:viewBaseW*zoom/100;
  useEffect(()=>{const view=viewportRef.current;if(!view)return;const update=()=>setViewportSize({w:view.clientWidth,h:view.clientHeight});const frame=window.requestAnimationFrame(update);const observer=new ResizeObserver(update);observer.observe(view);return()=>{window.cancelAnimationFrame(frame);observer.disconnect();};},[]);
  useEffect(()=>{const view=viewportRef.current;if(!view)return;
    const wheel=(event:WheelEvent)=>{if(!asset||busy||printSnapshot||rasterSource)return;if(event.cancelable)event.preventDefault();if(!event.deltaY)return;
      const rect=canvasRef.current?.getBoundingClientRect();if(!rect)return;
      const x=clamp((event.clientX-rect.left)/rect.width,0,1),y=clamp((event.clientY-rect.top)/rect.height,0,1);
      const current=zoom===0?fitWidth/viewBaseW*100:zoom;
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?view.clientHeight:1);
      setZoom(clamp(current*Math.exp(-clamp(delta,-120,120)*0.0025),10,800));
      window.requestAnimationFrame(()=>{const next=canvasRef.current?.getBoundingClientRect();if(next){view.scrollLeft+=next.left+x*next.width-event.clientX;view.scrollTop+=next.top+y*next.height-event.clientY;}});
    };view.addEventListener("wheel",wheel,{passive:false});return()=>view.removeEventListener("wheel",wheel);
  });
  function panStart(e:ReactPointerEvent<HTMLDivElement>){if(!asset||busy||e.button!==0||(e.target as HTMLElement).closest("button,input,select"))return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);panRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};}
  function panMove(e:ReactPointerEvent<HTMLDivElement>){const d=panRef.current;if(!d||d.id!==e.pointerId)return;e.currentTarget.scrollLeft=d.left-(e.clientX-d.x);e.currentTarget.scrollTop=d.top-(e.clientY-d.y);}
  function stepZoom(multiplier:number){setZoom(clamp((zoom===0?fitWidth/viewBaseW*100:zoom)*multiplier,10,800));}

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
      kvSet("autosave",{ app:"ALIMXL_PHOTO", version:s.raster?3:2, name:safeName(name), image:asset.data, settings:s })
        .then(()=>setSavedAt(new Date().toLocaleTimeString())).catch(()=>setSavedAt("failed"));
    },1500);
    return ()=>window.clearTimeout(t);
  },[asset,s,name,dirty]);

  useEffect(()=>{
    if(!pageMenu)return;
    const frame=window.requestAnimationFrame(()=>pageMenuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());
    const down=(event:PointerEvent)=>{
      if(!pageMenuRef.current?.contains(event.target as Node)) closePageMenu();
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.stopPropagation();closePageMenu(true);}
    };
    window.addEventListener("pointerdown",down,true);
    window.addEventListener("keydown",key,true);
    return()=>{window.cancelAnimationFrame(frame);window.removeEventListener("pointerdown",down,true);window.removeEventListener("keydown",key,true);};
  },[pageMenu]);

  /* paste image from clipboard */
  useEffect(()=> {
    const paste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("dialog,input,textarea")) return;
      const f = Array.from(e.clipboardData?.files ?? []).find(x=>x.type.startsWith("image/"));
      if (f) { e.preventDefault(); loadRef.current(f); }
    };
    window.addEventListener("paste",paste); return ()=>window.removeEventListener("paste",paste);
  },[]);
  useEffect(()=> {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if(target?.closest("dialog,[role=menu]"))return;
      const mod = e.ctrlKey || e.metaKey;
      if(mod&&e.key.toLowerCase()==="p"){e.preventDefault();if(!busy)void openPrintLayout();return;}
      if (target?.closest("input,textarea,select,[contenteditable='true']") || busy) return;
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
        await studioEnsureRaster(visible);
        if(cancelled||!canvasRef.current)return;
        const ratio = aspect(asset.image,visible);
        const width = Math.max(1,Math.floor(Math.min(Math.max(1100,displayedWidth),viewBaseW,4096,4096*ratio,Math.sqrt(8_000_000*ratio))));
        draw(canvasRef.current,asset.image,visible,width,null);
        if (histRef.current) drawHistogram(canvasRef.current,histRef.current);
        setPreviewSize({w:canvasRef.current.width,h:canvasRef.current.height});
      } catch (error) { if (!cancelled) setMessage(error instanceof Error ? error.message : "Preview failed."); }
    })(); },70);
    return ()=> { cancelled=true; window.clearTimeout(timer); };
  },[asset,s,compare,displayedWidth,viewBaseW]);

  async function open(data:string, settings:Settings, fileName:string, note:string) {
    const image=await decode(data);
    await studioEnsureRaster(settings);
    await Promise.all(settings.layers.filter(l=>l.kind==="image"&&l.src).map(l=>cacheLayerImage(l.id,l.src)));
    setAsset({image,data,name:fileName}); dispatch({type:"replace",value:settings});
    setName(fileName); setSelected(null); setCompare(false); setZoom(0); setDirty(false);
    const ratio=aspect(image,settings);
    setOutputWidth(Math.max(1,Math.floor(Math.min(settings.raster?settings.rasterWidth:image.naturalWidth,4096,4096*ratio,Math.sqrt(MAX_PIXELS*ratio)))));
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
    if (!asset || busyRef.current || s.layers.length>=30) return;
    const id=crypto.randomUUID();
    edit({layers:[...s.layers,defaultLayer(id,kind)]});
    setSelected(id); setTab("layers");
  }

  function applyCanvasBackground() {
    if (!asset || busyRef.current) return;
    edit({canvasBackground:background});
    setMessage("Background colour applied. Preview, downloads and print use this colour. Undo restores the previous background.");
  }
  function clearCanvasBackground() {
    if (!asset || busyRef.current) return;
    edit({canvasBackground:null}); setTransparent(true); setFormat("png");
    setMessage("Applied background removed. Transparent PNG export enabled; JPEG and printing still require a solid fallback.");
  }
  async function aiRemoveBackground(openEditor=false) {
    if (!asset || busyRef.current) return;
    if(openEditor&&s.layers.length){setMessage("Use one-click AI removal to preserve editable layers; refinement flattens the image.");return;}
    busyRef.current=true; setBusy(true);
    setMessage("AI background removal: sending image to remove.bg…");
    try {
      await document.fonts.ready;
      await studioEnsureRaster(s);
      const source=document.createElement("canvas");
      const ratio=aspect(asset.image,s),c=crop(asset.image,s);
      const naturalW=s.rotation%180?c.h:c.w;
      const width=Math.max(1,Math.floor(Math.min(naturalW,3072,3072*ratio,Math.sqrt(4_000_000*ratio))));
      let blob:Blob;
      try {
        draw(source,asset.image,{...s,layers:[],canvasBackground:null},width,null);
        blob=await studioCanvasBlob(source,"png");
      } finally {source.width=source.height=1;}
      const form=new FormData();
      form.append("image",blob,`${safeName(name||"photo")}.png`);
      const response=await fetch("/api/ai/remove-background",{method:"POST",body:form,signal:AbortSignal.timeout(85000)});
      const payload=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(payload?.error||`AI service failed (${response.status}).`);
      if(typeof payload?.image!=="string"||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(payload.image))throw new Error("AI service returned an unsupported image.");
      const cutout=await decode(payload.image),dims=studioRasterSize(cutout.naturalWidth,cutout.naturalHeight);
      const canvas=document.createElement("canvas");canvas.width=dims.w;canvas.height=dims.h;
      const ctx=canvas2d(canvas);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
      ctx.drawImage(cutout,0,0,dims.w,dims.h);
      const raster=canvas.toDataURL("image/png");canvas.width=canvas.height=1;
      if(raster.length>24_000_000)throw new Error("AI PNG is too large. Use a smaller image.");
      const next:Settings={...INITIAL,layers:s.layers,canvasBackground:null,raster,rasterWidth:dims.w,rasterHeight:dims.h};
      await studioEnsureRaster(next);
      if(openEditor){
        if(s.layers.length)throw new Error("Use one-click AI removal to preserve editable layers. Then open Crop / Mark / Background if flattening is acceptable.");
        setRasterSource({src:raster,w:dims.w,h:dims.h});
        setMessage("AI cutout ready in refinement editor. Cancel leaves your document unchanged; Apply commits the result.");
      }else{
        edit(next);setOutputWidth(dims.w);setSelected(null);setCompare(false);setZoom(0);setFormat("png");setTransparent(true);
        setMessage("AI background removed. Editable layers preserved. Choose a colour and press Apply background, or export transparent PNG.");
      }
    }catch(error){setMessage(error instanceof Error?error.message:"AI background removal failed.");}
    finally{busyRef.current=false;setBusy(false);}
  }
  function openPageMenu(event:ReactMouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button,input,select,textarea,a,dialog")) return;
    event.preventDefault();
    setPageMenu({x:clamp(event.clientX,8,Math.max(8,window.innerWidth-250)),y:clamp(event.clientY,8,Math.max(8,window.innerHeight-Math.min(560,window.innerHeight*0.7)-8))});
  }
  function closePageMenu(focusCanvas=false) {
    setPageMenu(null);
    if (focusCanvas) window.requestAnimationFrame(()=>canvasRef.current?.focus({preventScroll:true}));
  }
  function runPageAction(action:()=>void) {
    closePageMenu();
    action();
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
    if (!src || busyRef.current || s.layers.length>=30) return;
    if(src.kind==="image"&&s.layers.filter(l=>l.kind==="image").length>=10){setMessage("Up to 10 image layers.");return;}
    const id=crypto.randomUUID();
    const cached=imgCache.get(src.id); if (cached) imgCache.set(id,cached);
    edit({layers:[...s.layers,{...src,id,name:src.name.slice(0,90)+" copy",x:clamp(src.x+3,0,100),y:clamp(src.y+3,0,100)}]}); setSelected(id);
  }
  function dragStart(e:ReactPointerEvent<HTMLButtonElement>, l:Layer) {
    if (e.button!==0 || compare || busy) return;
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
  async function autoEnhance() {
    if (!asset) return;
    try {
      await studioEnsureRaster(s);
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
    await studioEnsureRaster(s);
    const canvas=document.createElement("canvas");
    draw(canvas,asset.image,s,outputWidth,fmt==="jpeg"||!transparent?background:null);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Browser could not encode the image.")),`image/${fmt}`,quality/100));
    canvas.width=1; canvas.height=1; return blob;
  }
  async function runBusy(label:string, job:()=>Promise<void>, requireValid=true) {
    if (!asset || (requireValid&&!valid) || busyRef.current) return;
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

  const exportSubmission=()=>runBusy("Preparing validated submission…",async()=>{
    if(!asset)return;await new Promise<void>(resolve=>window.setTimeout(resolve,40));await document.fonts.ready;await studioEnsureRaster(s);const source=document.createElement("canvas"),target=document.createElement("canvas");
    try{const ratio=aspect(asset.image,s),width=Math.max(1,Math.floor(Math.min(8192,8192*ratio,Math.sqrt(MAX_PIXELS*ratio),Math.max(submission.w,submission.h*ratio))));draw(source,asset.image,s,width,null);target.width=submission.w;target.height=submission.h;const ctx=canvas2d(target);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";if(submissionFormat!=="png"||!transparent){ctx.fillStyle=s.canvasBackground??background;ctx.fillRect(0,0,target.width,target.height);}const r=studioFit(source.width,source.height,target.width,target.height,submissionFit);ctx.drawImage(source,r.x,r.y,r.w,r.h);const blob=await studioEncode(target,submission,submissionFormat);download(blob,`${safeName(name)}-${submission.id}.${submissionFormat==="jpeg"?"jpg":submissionFormat}`);setMessage(`Submission validated: ${submission.w} × ${submission.h} px; ${(blob.size/1024).toFixed(1)} KB. Check destination portal requirements.`);}finally{source.width=source.height=target.width=target.height=1;}
  },false);
  const openPrintLayout=()=>runBusy("Preparing print-quality edited image…",async()=>{
    if(!asset)return;await new Promise<void>(resolve=>window.setTimeout(resolve,40));await document.fonts.ready;await studioEnsureRaster(s);const canvas=document.createElement("canvas");
    try{const ratio=aspect(asset.image,s);const width=Math.max(1,Math.floor(Math.min(4096,4096*ratio,Math.sqrt(MAX_PIXELS*ratio))));draw(canvas,asset.image,s,width,"#FFFFFF");const c=crop(asset.image,s);setPrintSnapshot({src:canvas.toDataURL("image/jpeg",0.96),w:Math.min(canvas.width,s.rotation%180?c.h:c.w),h:Math.min(canvas.height,s.rotation%180?c.w:c.h)});setMessage("Print layout opened. Photo edits are unchanged.");}finally{canvas.width=canvas.height=1;}
  },false);

  const openRasterEditor=()=>runBusy("Preparing selection and background tools…",async()=>{
    if(!asset)return;await new Promise<void>(r=>window.setTimeout(r,40));await document.fonts.ready;await studioEnsureRaster(s);const canvas=document.createElement("canvas");
    try{const ratio=aspect(asset.image,s),c=crop(asset.image,s),naturalW=s.rotation%180?c.h:c.w;const width=Math.max(1,Math.floor(Math.min(naturalW,3072,3072*ratio,Math.sqrt(4_000_000*ratio))));draw(canvas,asset.image,{...s,canvasBackground:null},width,null);setRasterSource({src:canvas.toDataURL("image/png"),w:canvas.width,h:canvas.height});}finally{canvas.width=canvas.height=1;}
  },false);
  async function applyRasterEditor(result:StudioRasterResult){
    const next:Settings={...INITIAL,canvasBackground:s.canvasBackground,layers:[],raster:result.src,rasterWidth:result.w,rasterHeight:result.h};await studioEnsureRaster(next);edit(next);setOutputWidth(result.w);setSelected(null);setCompare(false);setZoom(0);setRasterSource(null);setFormat("png");setTransparent(true);setMessage("Crop / marking / cutout applied as a flattened PNG edit. Global Undo restores the earlier settings and editable layers; Reset returns to the original source. Use PNG transparency for cutouts.");
  }

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
    const blob=new Blob([JSON.stringify({app:"ALIMXL_PHOTO",version:s.raster?3:2,name:safeName(name),image:asset.data,settings:s})],{type:"application/json"});
    if (blob.size>30*1024*1024) { setMessage("Project exceeds the 30 MB reopen limit. Use a smaller source image."); return; }
    download(blob,`${safeName(name)}.alimxl-photo.json`); commit();
    setMessage("Project download requested. Confirm the file was saved before leaving.");
  }
  function cropPreset(ratio:number) {
    if (!asset) return;
    const source=(s.raster?s.rasterWidth:asset.image.naturalWidth)/(s.raster?s.rasterHeight:asset.image.naturalHeight);
    const w=source>ratio?ratio/source*100:100, h=source>ratio?100:source/ratio*100;
    edit({cropX:(100-w)/2,cropY:(100-h)/2,cropW:w,cropH:h});
  }
  const adjSliders = (list: Adj[]) => <div className="space-y-4">{list.map(([key,label,min,max,step])=><Slider key={key} label={label} value={s[key]} min={min} max={max} step={step} onChange={v=>live({[key]:v} as Partial<Settings>)} onCommit={commit}/>)}</div>;
  const layerSlider = (k: "x"|"y"|"opacity"|"rotation"|"strokeWidth"|"shadow"|"radius"|"width"|"gap", label:string, min=0, max=100) => <Slider key={k} label={label} min={min} max={max} value={layer![k]} onChange={v=>patchLayer({[k]:v} as Partial<Layer>,true)} onCommit={commit}/>;

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#08111f] font-sans text-slate-100">
      {rasterSource&&<StudioRasterEditor source={rasterSource} onClose={()=>setRasterSource(null)} onApply={applyRasterEditor}/>}
      {printSnapshot&&<StudioPrintLayout snapshot={printSnapshot} onClose={()=>setPrintSnapshot(null)}/>}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Open image" onChange={e=>inputLoad(e)}/>
      <input ref={projectRef} type="file" accept=".json,application/json" className="hidden" aria-label="Open project" onChange={e=>inputLoad(e,true)}/>
      <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Add image layer" onChange={e=>{const f=e.target.files?.[0]; e.target.value=""; void addImageLayer(f);}}/>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c1828] px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3"><Link href="/" onClick={e=>{if(dirty&&!window.confirm("Leave Photo Studio? Your autosave stays on this device, but save a project file for a backup."))e.preventDefault();}} className={`${btn} text-amber-200`}>ALIMXL / Home</Link><div><h1 className="text-lg font-bold tracking-tight">Photo Studio <span className="text-emerald-400">Pro</span></h1><p className="text-[10px] tracking-wider text-slate-500">LOCAL IMAGE WORKSPACE</p></div></div>
        <div className="flex flex-wrap gap-2"><button disabled={busy} className={btn} onClick={()=>fileRef.current?.click()}>Open image</button><button disabled={busy} className={btn} onClick={()=>projectRef.current?.click()}>Open project</button><button disabled={!asset||busy} className={btn} onClick={saveProject}>Save project</button><button disabled={!asset||busy} className={`${btn} text-emerald-300`} onClick={()=>void openPrintLayout()}>Print layout</button><button disabled={!asset||busy} className={`${btn} text-amber-200`} onClick={()=>void openRasterEditor()}>Crop / Cutout / Mark</button><button disabled={!canUndo||busy} className={btn} onClick={()=>{dispatch({type:"undo"});setDirty(true);setCompare(false);}}>Undo</button><button disabled={!history.future.length||busy} className={btn} onClick={()=>{dispatch({type:"redo"});setDirty(true);setCompare(false);}}>Redo</button><button disabled={!asset||busy} className={btn} onClick={()=>{if(window.confirm("Reset all adjustments, crop and layers?")){edit({...INITIAL,layers:[]});setSelected(null);}}}>Reset</button></div>
      </header>
      {!!restore&&<div role="alert" className="flex shrink-0 flex-wrap items-center gap-3 border-b border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs text-amber-100">An autosaved session from your last visit was found on this device.<button className={btn} disabled={busy} onClick={()=>void restoreSession()}>Restore session</button><button className={btn} onClick={discardSession}>Discard</button></div>}
      <div className="min-h-0 flex-1 overflow-y-auto xl:overflow-hidden"><div className="grid min-h-full gap-4 p-4 xl:h-full xl:grid-cols-[270px_minmax(0,1fr)_285px]">
        <aside className="min-h-0 space-y-4 xl:overflow-y-auto xl:pr-1">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1" role="group" aria-label="Editing tools">{(["adjust","crop","layers"] as const).map(t=><button key={t} className={`rounded-lg px-2 py-2 text-xs font-bold capitalize focus-visible:outline-2 focus-visible:outline-amber-300 ${tab===t?"bg-emerald-500 text-[#052b20]":"text-slate-400 hover:bg-white/5"}`} onClick={()=>setTab(t)}>{t}</button>)}</div>
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
        <section className="flex min-h-112.5 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1423] xl:min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3"><div><div className="flex items-center gap-2"><span className="rounded-full bg-linear-to-r from-fuchsia-500/20 to-emerald-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fuchsia-200">Pro Studio 2026</span><h2 className="text-sm font-semibold">{compare?"Original":"Live canvas"}</h2></div><p className="mt-1 text-[10px] text-slate-500">{asset?`${asset.image.naturalWidth} × ${asset.image.naturalHeight} source pixels`:"PNG · JPEG · WebP · Ctrl/⌘ V to paste"}</p></div><div className="flex items-center gap-2"><button disabled={!asset||busy} className={btn} aria-pressed={compare} onClick={()=>setCompare(!compare)}>{compare?"Show edit":"Compare"}</button><button className={btn} disabled={!asset} aria-label="Zoom out image" onClick={()=>stepZoom(1/1.2)}>−</button><button className={btn} disabled={!asset} onClick={()=>setZoom(0)}>Fit</button><button className={btn} disabled={!asset} onClick={()=>setZoom(100)}>100%</button><button className={btn} disabled={!asset} aria-label="Zoom in image" onClick={()=>stepZoom(1.2)}>+</button><output className="min-w-14 text-xs text-amber-200" aria-label="Image zoom">{zoom===0?`Fit ${Math.round(fitWidth/viewBaseW*100)}%`:`${Math.round(zoom)}%`}</output></div></div>
          <div ref={viewportRef} onContextMenu={openPageMenu} tabIndex={0} aria-label="Image viewport: wheel to zoom, drag to pan, plus/minus to zoom, zero to fit" aria-busy={busy} onPointerDown={panStart} onPointerMove={panMove} onPointerUp={()=>{panRef.current=null;}} onPointerCancel={()=>{panRef.current=null;}} onLostPointerCapture={()=>{panRef.current=null;}} onKeyDown={e=>{if((e.target as HTMLElement).closest("button,input,select"))return;if(["+","=","-","0"].includes(e.key)&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopPropagation();if(e.key==="0")setZoom(0);else stepZoom(e.key==="-"?1/1.2:1.2);}}} className="relative flex min-h-95 min-w-0 flex-1 overflow-auto p-5 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="copy";}} onDrop={e=>{e.preventDefault();void load(e.dataTransfer.files[0]);}} style={{touchAction:"none",overscrollBehavior:"contain",cursor:asset?"grab":"default",backgroundImage:"linear-gradient(45deg,#132033 25%,transparent 25%),linear-gradient(-45deg,#132033 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#132033 75%),linear-gradient(-45deg,transparent 75%,#132033 75%)",backgroundSize:"24px 24px",backgroundPosition:"0 0,0 12px,12px -12px,-12px 0"}}>
            {asset?<div className="relative m-auto shrink-0" style={{width:`${displayedWidth}px`}}><div className="relative mx-auto" style={{width:"100%"}}><canvas ref={canvasRef} tabIndex={0} className="block h-auto w-full select-none shadow-2xl" aria-label="Edited photo preview"/>{!compare&&!busy&&s.layers.filter(l=>l.visible).map((l,index)=><button key={l.id} aria-label={`Drag ${l.name}`} title={`Drag ${l.name}; arrow keys nudge the selected layer`} onPointerDown={e=>dragStart(e,l)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd} onLostPointerCapture={dragEnd} onClick={()=>{setSelected(l.id);setTab("layers");}} className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg focus-visible:outline-2 focus-visible:outline-amber-300 ${selected===l.id?"border-white bg-emerald-500 text-black":"border-white/70 bg-slate-900/80 text-white"}`} style={{left:`${l.x}%`,top:`${l.y}%`}}>{index+1}</button>)}</div></div>:<button disabled={busy} onClick={()=>fileRef.current?.click()} className="m-auto w-full max-w-md rounded-3xl border border-dashed border-emerald-400/35 bg-[#0d1b2c]/95 p-10 text-center transition hover:border-emerald-300 focus-visible:outline-2 focus-visible:outline-amber-300"><span className="text-5xl font-light text-amber-200">+</span><span className="mt-5 block text-2xl font-bold">Your next great image</span><span className="mt-3 block text-sm leading-7 text-slate-400">Click to browse, drop or paste an image.<br/>Up to 20 MB · 40 megapixels</span><span className="mt-6 inline-block rounded-full bg-emerald-400/10 px-4 py-2 text-xs text-emerald-300">Local editing · No image upload by this editor</span></button>}
          </div>
          <div className="border-t border-white/10 px-4 py-3"><p role="status" aria-live="polite" className="text-xs leading-5 text-slate-400">{busy?"Working… ":""}{message}</p><p className="mt-1 text-[10px] text-slate-600">Wheel over image: zoom · Drag image: pan · Fit / 100%: view only · Ctrl/⌘ Z undo · Esc deselect · Handles do not appear in exports.{savedAt&&` Autosaved on this device: ${savedAt}.`}</p></div>
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
          <Panel title="Background studio"><div className="space-y-3">
          <label className="flex items-center justify-between text-xs text-slate-300">Choose background<input aria-label="Choose canvas background" type="color" value={background} onChange={e=>setBackground(e.target.value)} className="h-9 w-16 rounded border border-white/20"/></label>
          <div className="grid grid-cols-4 gap-2">{[["White","#FFFFFF"],["Blue","#0070C0"],["Light blue","#DCEEFF"],["Grey","#F2F2F2"]].map(([label,color])=><button key={color} type="button" className={btn} aria-label={`Choose ${label} background`} onClick={()=>setBackground(color)}><span className="mb-1 block h-5 rounded border border-white/20" style={{backgroundColor:color}}/>{label}</button>)}</div>
          <button type="button" className={`${btn} w-full text-emerald-300`} disabled={!asset||busy} onClick={applyCanvasBackground}>Apply background · রং প্রয়োগ করুন</button>
          <button type="button" className={`${btn} w-full`} disabled={!asset||busy||!s.canvasBackground} onClick={clearCanvasBackground}>Remove colour · Transparent PNG</button>
          <p role="status" className="text-xs leading-5 text-slate-400">Applied: {s.canvasBackground??"Transparent"}. Choosing a colour does not apply it until you press Apply. Undo/Redo and Save project retain the applied colour. An opaque source image must be cut out first.</p>
          </div></Panel>
          <Panel title="বাংলাদেশ submission export"><div className="space-y-4">
            <p className="text-xs leading-5 text-amber-200">আপনার দেওয়া তালিকার প্রিসেট; সব পোর্টালের অভিন্ন নিয়ম নয়। বিজ্ঞপ্তি যাচাই করুন। PDF এক পৃষ্ঠার image-based export; PDF import নয়।</p>
            <label className="block text-xs text-slate-400">কাজের ধরন<select className={field} value={submissionId} onChange={e=>{const profile=STUDIO_PROFILES.find(p=>p.id===e.target.value)!;setSubmissionId(profile.id);setSubmissionFormat(profile.formats[0]);}}>{STUDIO_PROFILES.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
            <p className="text-xs text-slate-300">{submission.w} × {submission.h} px{submission.dpi?` · ${submission.dpi} DPI`:""} · {(submission.min/1024).toFixed(0)}–{(submission.max/1024).toFixed(2)} KB (1024 bytes/KB)</p>
            <label className="block text-xs text-slate-400">ফরম্যাট<select className={field} value={submissionFormat} onChange={e=>setSubmissionFormat(e.target.value as StudioFormat)}>{submission.formats.map(f=><option key={f} value={f}>{f.toUpperCase()}</option>)}</select></label>
            <label className="block text-xs text-slate-400">ছবি বসানোর পদ্ধতি<select className={field} value={submissionFit} onChange={e=>setSubmissionFit(e.target.value as "contain"|"cover")}><option value="contain">সম্পূর্ণ ছবি (contain)</option><option value="cover">ফ্রেম পূরণ / centre crop (cover)</option></select></label>
            <label className="flex items-center justify-between text-xs text-slate-400">Background<input aria-label="Submission background" type="color" value={background} onChange={e=>setBackground(e.target.value)}/></label>
            {submissionFormat==="png"&&<label className="flex gap-2 text-xs"><input type="checkbox" checked={transparent} onChange={e=>setTransparent(e.target.checked)}/>স্বচ্ছতা রাখুন</label>}
            <p className="text-xs leading-5 text-slate-400">মাপ/ফরম্যাট/সাইজ না মিললে download হবে না। minimum size মেলাতে padding হয় না; সহজ ছবি minimum-এর নিচে থাকতে পারে। মুখ/background যাচাই হয় না।</p>
            <button className={`${btn} w-full`} disabled={!asset||busy||!name.trim()} onClick={()=>void exportSubmission()}>যাচাই করে submission download</button>
          </div></Panel>
          <Panel title="Selection & cutout"><p className="mb-3 text-xs leading-5 text-slate-400">Select the required area by rectangle or freehand, crop it, add marks, erase or restore pixels, or remove a connected background. PNG keeps transparency. Apply flattens at up to 4 MP; global Undo is available.</p><button disabled={!asset||busy} className={`${btn} w-full text-amber-200`} onClick={()=>void openRasterEditor()}>Open Crop / Mark / Background tools</button><button disabled={!asset||busy} className={`${btn} w-full text-fuchsia-200`} onClick={()=>void aiRemoveBackground(false)}>AI remove background · 1 click</button><button disabled={!asset||busy} className={`${btn} w-full text-fuchsia-200`} onClick={()=>void aiRemoveBackground(true)}>AI cutout + refine edges</button><p className="mt-2 text-[11px] leading-5 text-slate-500">Uses the server-side AI provider configured in environment variables. The API key stays on the server and is never exposed to the browser.</p></Panel>
          <Panel title="Print workflow"><p className="mb-3 text-xs leading-5 text-slate-400">Place edited or imported photos on a physical-size sheet. View zoom never changes output pixels or print millimetres.</p><button disabled={!asset||busy} className={`${btn} w-full text-emerald-300`} onClick={()=>void openPrintLayout()}>Open print layout</button></Panel>
          <Panel title="Export studio"><div className="space-y-4"><label className="block text-xs text-slate-400">File name<input className={field} value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label><label className="block text-xs text-slate-400">Output width (px)<input type="number" min={1} max={8192} step={1} className={field} value={outputWidth||""} onChange={e=>setOutputWidth(Number(e.target.value))}/></label>
          <div className="grid grid-cols-2 gap-2">{exportPresets.map(([label,w])=><button key={label} className={btn} onClick={()=>setOutputWidth(w)}>{label}</button>)}{asset&&<button className={`${btn} col-span-2`} onClick={()=>{const c=crop(asset.image,s);setOutputWidth(Math.round(s.rotation%180?c.h:c.w));}}>Original size</button>}</div>
          <p className="font-mono text-xs text-amber-200">{outputWidth||0} × {height} px</p>{asset&&!valid&&<p role="alert" className="text-xs leading-5 text-rose-300">Use positive whole pixels, up to 8192 per side and 16 megapixels total.</p>}<label className="block text-xs text-slate-400">Format<select className={field} value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option value="png">PNG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></select></label>{format!=="png"&&<Slider label="Encoder quality" min={10} value={quality} onChange={setQuality} onCommit={()=>{}}/>}{format!=="jpeg"&&<label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={transparent} onChange={e=>setTransparent(e.target.checked)} className="accent-emerald-400"/>Preserve transparency</label>}{(format==="jpeg"||!transparent)&&<label className="flex items-center justify-between text-xs text-slate-400">Background<input aria-label="Export background colour" type="color" value={background} onChange={e=>setBackground(e.target.value)} className="h-9 w-14 rounded bg-transparent"/></label>}
          <button disabled={!valid||!name.trim()} className="w-full rounded-xl bg-linear-to-r from-emerald-400 to-teal-300 px-4 py-3 text-sm font-extrabold text-[#052a24] shadow-lg shadow-emerald-900/20 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-amber-300 disabled:opacity-35" onClick={()=>void exportImage()}>{busy?"Working…":"Download image"}</button>
          <div className="grid grid-cols-2 gap-2"><button disabled={!valid} className={btn} onClick={()=>void copyImage()}>Copy image</button><button disabled={!valid} className={btn} onClick={()=>void shareImage()}>Share…</button></div>
          <p className="text-[11px] leading-5 text-slate-500">Exports contain edited pixels and visible layers, not selection handles. Upscaling cannot restore missing detail. Original comparison does not change export.</p></div></Panel>
          </fieldset><Panel title="Project care"><p className="text-xs leading-6 text-slate-400">Your work is autosaved to this browser (offline, no cloud). Save project downloads a portable file with the source image and editable settings — keep one as a backup.</p><p className="mt-3 text-[10px] uppercase tracking-wider text-amber-200">{dirty?"Session has edits":"Session ready"}</p></Panel>
        </aside>
      </div></div>
      {pageMenu&&(
        <div ref={pageMenuRef} role="menu" aria-label="Photo studio quick actions"
          onContextMenu={e=>e.preventDefault()}
          onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))closePageMenu();}}
          onKeyDown={e=>{
            const keys=["ArrowDown","ArrowUp","Home","End","Escape","Tab"];
            if(!keys.includes(e.key))return;
            e.stopPropagation();
            if(e.key==="Escape"){e.preventDefault();closePageMenu(true);return;}
            if(e.key==="Tab"){closePageMenu();return;}
            e.preventDefault();
            const options=Array.from(pageMenuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")??[]);
            if(!options.length)return;
            const at=options.indexOf(document.activeElement as HTMLButtonElement);
            const next=e.key==="Home"?0:e.key==="End"?options.length-1:e.key==="ArrowDown"?(at+1)%options.length:(at-1+options.length)%options.length;
            options[next]?.focus();
          }}
          className="fixed z-50 max-h-[70vh] w-60 overflow-y-auto rounded-xl border border-white/20 bg-[#152339] p-2 text-xs shadow-2xl"
          style={{left:pageMenu.x,top:pageMenu.y}}>
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Photo studio</p>
          <button role="menuitem" className={`${btn} w-full text-left`} onClick={()=>runPageAction(()=>fileRef.current?.click())}>Open image</button>
          <button role="menuitem" className={`${btn} w-full text-left`} onClick={()=>runPageAction(()=>projectRef.current?.click())}>Open project</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>saveProject())}>Save project</button>
          <div className="my-1 border-t border-white/10"/>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!canUndo||busy} onClick={()=>runPageAction(()=>{dispatch({type:"undo"});setDirty(true);setCompare(false);})}>Undo</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!history.future.length||busy} onClick={()=>runPageAction(()=>{dispatch({type:"redo"});setDirty(true);setCompare(false);})}>Redo</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>{if(window.confirm("Reset all adjustments, crop and layers?")){edit({...INITIAL,layers:[]});setSelected(null);}})}>Reset all</button>
          <div className="my-1 border-t border-white/10"/>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset} onClick={()=>runPageAction(()=>setCompare(value=>!value))}>Compare original</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset} onClick={()=>runPageAction(()=>setZoom(0))}>Fit view</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset} onClick={()=>runPageAction(()=>setZoom(100))}>Zoom 100%</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset} onClick={()=>runPageAction(()=>stepZoom(1.2))}>Zoom in</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset} onClick={()=>runPageAction(()=>stepZoom(1/1.2))}>Zoom out</button>
          <div className="my-1 border-t border-white/10"/>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>edit({rotation:(s.rotation+270)%360}))}>Rotate -90°</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>edit({rotation:(s.rotation+90)%360}))}>Rotate 90°</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>edit({flipX:!s.flipX}))}>Flip horizontally</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>edit({flipY:!s.flipY}))}>Flip vertically</button>
          <div className="my-1 border-t border-white/10"/>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>autoEnhance())}>Auto enhance</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>edit(neutral))}>Reset tone</button>
          {presets.map(p=>(
            <button key={p.name} role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>edit(p.patch))}>Look: {p.name}</button>
          ))}
          <div className="my-1 border-t border-white/10"/>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>cropPreset(1))}>Crop 1:1</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>cropPreset(4/5))}>Crop 4:5</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>cropPreset(16/9))}>Crop 16:9</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>cropPreset(9/16))}>Crop 9:16</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>cropPreset(3/2))}>Crop 3:2</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>cropPreset(4/3))}>Crop 4:3</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>edit({cropX:0,cropY:0,cropW:100,cropH:100}))}>Full image</button>
          <div className="my-1 border-t border-white/10"/>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy||s.layers.length>=30} onClick={()=>runPageAction(()=>addLayer("text"))}>Add text layer</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy||s.layers.length>=30} onClick={()=>runPageAction(()=>addLayer("rectangle"))}>Add rectangle</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy||s.layers.length>=30} onClick={()=>runPageAction(()=>addLayer("ellipse"))}>Add ellipse</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(()=>logoRef.current?.click())}>Add image / logo layer</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!selected||busy} onClick={()=>runPageAction(()=>duplicateLayer())}>Duplicate selected layer</button>
          <button role="menuitem" className={`${btn} w-full text-left text-rose-300`} disabled={!selected||busy} onClick={()=>runPageAction(()=>{edit({layers:s.layers.filter(l=>l.id!==selected)});setSelected(null);})}>Delete selected layer</button>
          <div className="my-1 border-t border-white/10"/>
          <button role="menuitem" className={`${btn} w-full text-left text-emerald-300`} disabled={!asset||busy} onClick={()=>runPageAction(()=>void openPrintLayout())}>Open print layout</button>
          <button role="menuitem" className={`${btn} w-full text-left text-amber-200`} disabled={!asset||busy} onClick={()=>runPageAction(()=>void openRasterEditor())}>Crop / Mark / Background</button>
          <button role="menuitem" className={`${btn} w-full text-left text-fuchsia-200`} disabled={!asset||busy} onClick={()=>runPageAction(()=>void aiRemoveBackground(false))}>AI remove background · 1 click</button>
          <button role="menuitem" className={`${btn} w-full text-left text-fuchsia-200`} disabled={!asset||busy} onClick={()=>runPageAction(()=>void aiRemoveBackground(true))}>AI cutout + refine edges</button>
          <div className="my-1 border-t border-white/10"/>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!valid||busy||!name.trim()} onClick={()=>runPageAction(()=>void exportImage())}>Download edited image</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy||!name.trim()} onClick={()=>runPageAction(()=>void exportSubmission())}>Export submission file</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy} onClick={()=>runPageAction(applyCanvasBackground)}>Apply chosen background</button>
          <button role="menuitem" className={`${btn} w-full text-left`} disabled={!asset||busy||!s.canvasBackground} onClick={()=>runPageAction(clearCanvasBackground)}>Remove background colour</button>
          <button role="menuitem" className={`${btn} w-full text-left`} onClick={()=>closePageMenu(true)}>Close menu</button>
        </div>
      )}
    </main>
  );
}