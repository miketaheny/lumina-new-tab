import React, { useRef, useEffect, useCallback } from 'react';
import { THEMES } from '@lumina/core';

interface Blob {
  x: number;
  y: number;
  r: number;
  color: [number, number, number];
  ox: number;
  oy: number;
  speed: number;
  amp: number;
}

interface BackgroundCanvasProps {
  themes: string[];
  intensity?: 'subtle' | 'medium' | 'vivid';
  animate?: boolean;
}

function randomBlob(w: number, h: number, colors: [number, number, number][]): Blob {
  const c = colors[Math.floor(Math.random() * colors.length)];
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r: (Math.random() * 0.45 + 0.2) * Math.max(w, h),
    color: c,
    ox: Math.random() * Math.PI * 2,
    oy: Math.random() * Math.PI * 2,
    speed: 0.0003 + Math.random() * 0.0004,
    amp: 80 + Math.random() * 120,
  };
}

export function BackgroundCanvas({
  themes,
  intensity = 'medium',
  animate = true,
}: BackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const bgTimeRef = useRef(Math.random() * 10000);

  const activeTheme = themes.length === 1 ? themes[0] : (themes[0] ?? 'cosmic');
  const themeData = THEMES[activeTheme] ?? THEMES.cosmic;

  const buildBlobs = useCallback((w: number, h: number) => {
    const colors = themeData.colors;
    blobsRef.current = Array.from({ length: 7 }, () => randomBlob(w, h, colors));
  }, [themeData]);

  const renderBg = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const intensityVal = intensity === 'subtle' ? 0.55 : intensity === 'vivid' ? 0.85 : 0.70;

    const baseColors = themeData.colors;
    const bc = baseColors[0];
    ctx.fillStyle = `rgb(${bc[0]},${bc[1]},${bc[2]})`;
    ctx.fillRect(0, 0, W, H);

    if (animate) bgTimeRef.current = ts * 0.001;

    blobsRef.current.forEach((b, i) => {
      const px = b.x + Math.sin(bgTimeRef.current * b.speed * 1000 + b.ox) * b.amp;
      const py = b.y + Math.cos(bgTimeRef.current * b.speed * 800 + b.oy) * b.amp;

      const grad = ctx.createRadialGradient(px, py, 0, px, py, b.r);
      const [r, g, bl] = b.color;
      grad.addColorStop(0, `rgba(${r},${g},${bl},${intensityVal * 0.8})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${bl},${intensityVal * 0.3})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.globalCompositeOperation = i === 0 ? 'source-over' : 'screen';
      ctx.fillRect(0, 0, W, H);
    });

    ctx.globalCompositeOperation = 'source-over';

    const vign = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
    vign.addColorStop(0, 'rgba(0,0,0,0)');
    vign.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    if (animate) {
      animFrameRef.current = requestAnimationFrame(renderBg);
    }
  }, [themeData, intensity, animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildBlobs(canvas.width, canvas.height);
    };

    resize();

    if (animate) {
      animFrameRef.current = requestAnimationFrame(renderBg);
    } else {
      renderBg(bgTimeRef.current * 1000);
    }

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [animate, buildBlobs, renderBg]);

  return (
    <canvas
      ref={canvasRef}
      id="bg-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
        transition: 'opacity 0.8s ease',
      }}
    />
  );
}
