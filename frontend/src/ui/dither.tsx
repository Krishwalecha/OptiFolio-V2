import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export const DitherTerrain: React.FC<{
  values: number[];
  className?: string;
  pixel?: number;
  falloff?: number;
  reveal?: boolean;
  lineBoost?: number;
}> = ({ values, className, pixel = 3, falloff = 0.55, reveal = true, lineBoost = 1 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || values.length < 2) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let ro: ResizeObserver | null = null;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !reveal;

    const draw = (progress: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      if (!W || !H) return;
      if (cv.width !== Math.round(W * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = getComputedStyle(cv).color;
      const cols = Math.floor(W / pixel);
      const rows = Math.floor(H / pixel);
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      const limit = Math.floor(cols * progress);
      for (let c = 0; c < limit; c++) {
        const t = (c / (cols - 1)) * (values.length - 1);
        const i = Math.floor(t);
        const f = t - i;
        const v = values[i] + (values[Math.min(i + 1, values.length - 1)] - values[i]) * f;
        const top = rows * 0.12 + (1 - (v - lo) / (hi - lo || 1)) * rows * 0.7;
        for (let r = Math.floor(top); r < rows; r++) {
          const d = (r - top) / (rows - top || 1);
          const density = r - top < 1.5 ? lineBoost : Math.pow(1 - d, 1 / falloff) * 0.85;
          if (density > BAYER[(r % 4) * 4 + (c % 4)]) ctx.fillRect(c * pixel, r * pixel, pixel - 1, pixel - 1);
        }
      }
    };

    if (still) draw(1);
    else {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1600);
        draw(1 - Math.pow(1 - p, 3));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    ro = new ResizeObserver(() => draw(1));
    ro.observe(cv);
    const mo = new MutationObserver(() => requestAnimationFrame(() => draw(1)));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      mo.disconnect();
    };
  }, [values, pixel, falloff, reveal, lineBoost]);

  return <canvas ref={ref} aria-hidden="true" className={cn("block h-full w-full", className)} />;
};

export const DitherText: React.FC<{ text: string; className?: string; pixel?: number; weight?: number; fade?: number }> = ({ text, className, pixel = 4, weight = 600, fade = 0.85 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      const W = cv.parentElement?.clientWidth || cv.clientWidth;
      if (!W) return;
      const cols = Math.floor(W / pixel);
      const probe = document.createElement("canvas").getContext("2d")!;
      probe.font = `${weight} 100px Geist, system-ui, sans-serif`;
      const m0 = probe.measureText(text);
      const size = (100 * cols) / (m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight || m0.width);
      probe.font = `${weight} ${size}px Geist, system-ui, sans-serif`;
      const m = probe.measureText(text);
      const rows = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 2;
      const H = rows * pixel;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.width = `${cols * pixel}px`;
      cv.style.height = `${H}px`;
      cv.width = Math.round(cols * pixel * dpr);
      cv.height = Math.round(H * dpr);
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const o = off.getContext("2d")!;
      o.font = probe.font;
      o.fillStyle = "#000";
      o.fillText(text, m.actualBoundingBoxLeft, 1 + m.actualBoundingBoxAscent);
      const a = o.getImageData(0, 0, cols, rows).data;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cols * pixel, H);
      ctx.fillStyle = getComputedStyle(cv).color;
      for (let r = 0; r < rows; r++) {
        const f = 1 - (r / rows) * fade;
        for (let c = 0; c < cols; c++) {
          const alpha = a[(r * cols + c) * 4 + 3] / 255;
          if (alpha * f > BAYER[(r % 4) * 4 + (c % 4)]) ctx.fillRect(c * pixel, r * pixel, pixel - 1, pixel - 1);
        }
      }
    };
    document.fonts?.ready.then(draw);
    draw();
    const ro = new ResizeObserver(draw);
    if (cv.parentElement) ro.observe(cv.parentElement);
    const mo = new MutationObserver(() => requestAnimationFrame(draw));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [text, pixel, weight, fade]);

  return <canvas ref={ref} role="img" aria-label={text} className={cn("block", className)} />;
};
