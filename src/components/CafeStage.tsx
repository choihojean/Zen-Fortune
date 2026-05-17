import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Participant } from '@/lib/draw';

// Cup latte-surface center within the source video (1280x720).
// Measured from late frames (~7s) where the cup is held steady in close-up.
const CUP_X_IN_VIDEO = 640;
const CUP_Y_IN_VIDEO = 400;
const VIDEO_W = 1280;
const VIDEO_H = 720;
const VIDEO_AR = VIDEO_W / VIDEO_H;

export type CafePhase =
  | 'idle'
  | 'playing'
  | 'reveal'
  | 'settled';

interface Props {
  phase: CafePhase;
  participants: Participant[];
  winner: Participant | null;
}

export default function CafeStage({ phase, winner }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cupPos, setCupPos] = useState<{ x: number; y: number; scale: number }>(
    { x: 50, y: 50, scale: 1 }
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (phase === 'idle') {
      v.pause();
      try { v.currentTime = 0; } catch {}
    } else if (phase === 'playing') {
      try { v.currentTime = 0; } catch {}
      const playPromise = v.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } else if (phase === 'reveal' || phase === 'settled') {
      try { v.currentTime = Math.max(0, (v.duration || 8) - 0.05); } catch {}
      v.pause();
    }
  }, [phase]);

  // Compute cup overlay position based on the rendered video box.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const compute = () => {
      const rect = v.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const viewportAR = rect.width / rect.height;
      // object-fit: cover behavior
      let renderedW: number;
      let renderedH: number;
      let offsetX: number;
      let offsetY: number;
      if (viewportAR > VIDEO_AR) {
        renderedW = rect.width;
        renderedH = rect.width / VIDEO_AR;
        offsetX = 0;
        offsetY = (rect.height - renderedH) / 2;
      } else {
        renderedH = rect.height;
        renderedW = rect.height * VIDEO_AR;
        offsetX = (rect.width - renderedW) / 2;
        offsetY = 0;
      }
      const cupX = (CUP_X_IN_VIDEO / VIDEO_W) * renderedW + offsetX;
      const cupY = (CUP_Y_IN_VIDEO / VIDEO_H) * renderedH + offsetY;
      const scale = renderedW / VIDEO_W;
      setCupPos({ x: cupX, y: cupY, scale });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(v);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  return (
    <div className="cafe-stage-v2">
      {/* Background video */}
      <video
        ref={videoRef}
        className="cafe-video"
        src="/cafe-scene.mp4"
        muted
        playsInline
        preload="auto"
        poster="/cafe-1-brew.png"
      />

      {/* Mask the bottom-right Veo watermark */}
      <div className="veo-mask" aria-hidden="true" />

      {/* Subtle vignette so foreground text reads better */}
      <div className="cafe-vignette" aria-hidden="true" />

      {/* Latte foam name overlay — appears starting late in playback */}
      {winner && (phase === 'playing' || phase === 'reveal' || phase === 'settled') && (
        <FoamNameOverlay
          name={winner.name}
          active
          held={phase === 'reveal' || phase === 'settled'}
          cupPos={cupPos}
        />
      )}

      {/* Reveal caption (after video) */}
      {(phase === 'reveal' || phase === 'settled') && winner && (
        <RevealCaption winner={winner} />
      )}
    </div>
  );
}

// ---------- Foam name overlay (covers baked-in "Latte" text) ----------

function FoamNameOverlay({
  name,
  active,
  held,
  cupPos,
}: {
  name: string;
  active: boolean;
  held: boolean;
  cupPos: { x: number; y: number; scale: number };
}) {
  // Size mask and font in proportion to the video's render scale,
  // so the overlay matches the cup regardless of viewport size.
  // The baked-in "Latte" text spans ~380x100 px in video coords.
  const maskW = 440 * cupPos.scale;
  const maskH = 140 * cupPos.scale;
  const fontSize = 100 * cupPos.scale;
  const style: CSSProperties = {
    left: `${cupPos.x}px`,
    top: `${cupPos.y}px`,
    width: `${maskW}px`,
    height: `${maskH}px`,
  };
  return (
    <div
      className={`foam-overlay ${active ? 'on' : ''} ${held ? 'held' : ''}`}
      aria-hidden="true"
    >
      <div className="foam-cup-area" style={style}>
        <span className="foam-mask" />
        <span className="foam-name" style={{ fontSize: `${fontSize}px` }}>
          {name}
        </span>
      </div>
    </div>
  );
}

// ---------- Reveal caption ----------

function RevealCaption({ winner }: { winner: Participant }) {
  return (
    <div className="reveal-caption">
      <div className="reveal-eyebrow">Today&apos;s Tumbler</div>
      <div className="reveal-line">
        <b className="reveal-name-inline">
          {winner.name}
          <span className="reveal-honorific">님</span>
        </b>
        {winner.department && (
          <span className="reveal-dept-inline">{winner.department}</span>
        )}
      </div>
      <div className="reveal-note">
        당첨을 축하드립니다 · 응모권 <b>{winner.count}장</b>
      </div>
    </div>
  );
}
