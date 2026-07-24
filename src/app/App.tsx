import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// ── Wave constants ────────────────────────────────────────────────────────
const WAVE_COUNT = 21;
const CTR_I = 10;

// Shared wave parameter helpers — single source of truth
function waveParams(i: number, t: number) {
  const yBase = 52 + i * 19.5;
  const ampBase = 5 + Math.abs(Math.sin(i * 0.88)) * 7;
  // Amplitude breathes independently per wave
  const amp = ampBase + Math.sin(t * 0.54 + i * 0.55) * 3.8;
  const freq = 0.027 + Math.sin(i * 0.41) * 0.005;
  const phase = i * 0.6 + Math.cos(i * 0.28) * 1.1 + t * (0.264 + i * 0.012);
  return { yBase, amp, freq, phase };
}

function buildWave(i: number, t: number): string {
  const { yBase, amp, freq, phase } = waveParams(i, t);
  const pts: string[] = [];
  for (let j = 0; j <= 96; j++) {
    const x = j * 5;
    const y = yBase + amp * Math.sin(x * freq + phase);
    pts.push(`${j === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

// Y position of center wave at x=240 — used to anchor focal decorations
function centerWaveY(t: number): number {
  const { yBase, amp, freq, phase } = waveParams(CTR_I, t);
  return yBase + amp * Math.sin(240 * freq + phase);
}

const DOTS: [number, number][] = [
  [44, 78], [436, 92], [28, 195], [454, 308],
  [195, 512], [282, 500], [138, 558], [342, 554],
  [76, 462], [404, 446], [62, 130], [418, 170],
  [22, 350], [460, 388],
];

const CORNERS: [number, number, number, number][] = [
  [12, 12, 1, 1],
  [468, 12, -1, 1],
  [12, 667, 1, -1],
  [468, 667, -1, -1],
];

export default function App() {
  const [t, setT] = useState(0);
  const frameRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  // Scale HTML overlay to match actual card width (SVG scales via viewBox; HTML needs explicit scale)
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / 480);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const animate = (now: number) => {
      frameRef.current = requestAnimationFrame(animate);
      if (now - lastRef.current < 42) return; // ~24fps
      lastRef.current = now;
      setT((prev) => prev + 0.036);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const waves = Array.from({ length: WAVE_COUNT }, (_, i) => buildWave(i, t));
  const focalY = centerWaveY(t); // live Y of center wave at x=240

  // Animated ellipse parameters
  const blob1 = {
    rx: 235 + Math.sin(t * 0.336) * 22,
    ry: 175 + Math.cos(t * 0.228) * 18,
    rot: Math.sin(t * 0.168) * 14,
  };
  const blob2 = {
    rx: 175 + Math.cos(t * 0.276) * 17,
    ry: 135 + Math.sin(t * 0.372) * 13,
    rot: Math.cos(t * 0.204) * 20,
  };
  const blob3 = {
    rx: 200 + Math.sin(t * 0.252) * 19,
    ry: 100 + Math.cos(t * 0.312) * 11,
    rot: Math.sin(t * 0.132) * 16,
  };

  // ── Neon pulse for Nú and price ──────────────────────────────────────────
  // Two overlapping sine waves at different frequencies for irregular flicker feel
  const nuPulse  = 0.5 + 0.5 * (0.7 * Math.sin(t * 0.8) + 0.3 * Math.sin(t * 2.1));
  const nuWide   = 0.18 + 0.14 * nuPulse;   // wide blur opacity: 0.18–0.32
  const nuMid    = 0.10 + 0.11 * nuPulse;   // mid blur opacity:  0.10–0.21
  const pricePulse = 0.5 + 0.5 * (0.65 * Math.sin(t * 0.65 + 1.2) + 0.35 * Math.sin(t * 1.8 + 0.4));
  const priceShadowA = 0.38 + 0.28 * pricePulse; // shadow alpha: 0.38–0.66

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[480px] overflow-hidden"
        style={{ aspectRatio: "1 / 1.414", background: "#07080d" }}
      >
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <filter id="grain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="linearRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" stitchTiles="stitch" result="n" />
              <feColorMatrix type="saturate" values="0" in="n" result="g" />
              <feBlend in="SourceGraphic" in2="g" mode="overlay" result="b" />
              <feComposite in="b" in2="SourceGraphic" operator="in" />
            </filter>
            <filter id="glow-sm" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-lg" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="11" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        </svg>

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 480 679"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <rect width="480" height="679" fill="#07080d" />

          {/* Cold atmosphere blobs — animated rx/ry/rotation */}
          <ellipse cx="155" cy="215" rx={blob1.rx} ry={blob1.ry} fill="rgba(20,50,88,0.18)" transform={`rotate(${blob1.rot}, 155, 215)`} />
          <ellipse cx="350" cy="330" rx={blob2.rx} ry={blob2.ry} fill="rgba(10,32,68,0.13)" transform={`rotate(${blob2.rot}, 350, 330)`} />
          <ellipse cx="240" cy="440" rx={blob3.rx} ry={blob3.ry} fill="rgba(8,24,52,0.1)"  transform={`rotate(${blob3.rot}, 240, 440)`} />

          {/* Topographic wave lines */}
          {waves.map((d, i) => {
            const dist = Math.abs(i - CTR_I);
            const isCtr = dist === 0;
            const isNear = dist <= 2;
            const baseOp = isCtr ? 0.78 : isNear ? 0.28 - (dist - 1) * 0.07 : Math.max(0.04, 0.13 - dist * 0.022);
            const sw = isCtr ? 0.9 : isNear ? 0.55 : 0.32;
            return (
              <path key={i} d={d} stroke="#6de4f5" strokeWidth={sw} opacity={baseOp} filter={isCtr ? "url(#glow-sm)" : undefined} />
            );
          })}

          {/* ── Focal decorations — anchored to live center wave Y ────────── */}
          <circle cx="240" cy={focalY} r="56" stroke="rgba(109,228,245,0.12)" strokeWidth="0.5" strokeDasharray="3 8" fill="none" />
          <circle cx="240" cy={focalY} r="30" stroke="#6de4f5" strokeWidth="0.7" fill="none" filter="url(#glow-sm)" opacity="0.42" />
          <circle cx="240" cy={focalY} r="5" fill="#6de4f5" opacity="0.6" filter="url(#glow-lg)" />
          <circle cx="240" cy={focalY} r="1.8" fill="#dff4ff" />

          {/* Crosshair */}
          <line x1="240" y1={focalY - 44} x2="240" y2={focalY - 34} stroke="rgba(109,228,245,0.42)" strokeWidth="0.6" />
          <line x1="240" y1={focalY + 34} x2="240" y2={focalY + 44} stroke="rgba(109,228,245,0.42)" strokeWidth="0.6" />
          <line x1={240 - 44} y1={focalY} x2={240 - 34} y2={focalY} stroke="rgba(109,228,245,0.42)" strokeWidth="0.6" />
          <line x1={240 + 34} y1={focalY} x2={240 + 44} y2={focalY} stroke="rgba(109,228,245,0.42)" strokeWidth="0.6" />

          {/* Ruler ticks — left */}
          {Array.from({ length: WAVE_COUNT }, (_, i) => {
            const y = 52 + i * 19.5;
            const len = i % 5 === 0 ? 13 : 7;
            return <line key={`rl-${i}`} x1="14" y1={y} x2={14 + len} y2={y} stroke="rgba(109,228,245,0.28)" strokeWidth="0.5" />;
          })}

          {/* Ruler ticks — right */}
          {Array.from({ length: WAVE_COUNT }, (_, i) => {
            const y = 52 + i * 19.5;
            const len = i % 5 === 0 ? 13 : 7;
            return <line key={`rr-${i}`} x1={466 - len} y1={y} x2="466" y2={y} stroke="rgba(109,228,245,0.28)" strokeWidth="0.5" />;
          })}

          {/* Scatter accent pixels */}
          {DOTS.map(([x, y], i) => (
            <rect key={`dot-${i}`} x={x} y={y} width="1.5" height="1.5" fill="rgba(109,228,245,0.42)" />
          ))}

          {/* Outer frame */}
          <rect x="12" y="12" width="456" height="655" stroke="rgba(109,228,245,0.07)" strokeWidth="0.5" fill="none" />

          {/* Corner L-brackets */}
          {CORNERS.map(([cx, cy, dx, dy], i) => (
            <g key={`corner-${i}`}>
              <line x1={cx} y1={cy} x2={cx + dx * 18} y2={cy} stroke="#6de4f5" strokeWidth="0.85" opacity="0.36" />
              <line x1={cx} y1={cy} x2={cx} y2={cy + dy * 18} stroke="#6de4f5" strokeWidth="0.85" opacity="0.36" />
            </g>
          ))}

          <line x1="28" y1="40" x2="452" y2="40" stroke="rgba(109,228,245,0.07)" strokeWidth="0.4" />
          <line x1="28" y1="572" x2="452" y2="572" stroke="rgba(109,228,245,0.13)" strokeWidth="0.5" />
          <line x1="28" y1="575" x2="452" y2="575" stroke="rgba(109,228,245,0.04)" strokeWidth="0.3" />

          <rect width="480" height="679" fill="rgba(7,8,13,0.50)" filter="url(#grain)" />
        </svg>

        {/* HTML layer: fixed at 480×679, scaled to match actual card width */}
        <div
          className="absolute top-0 left-0 z-10 flex flex-col"
          style={{
            width: 480,
            height: 679,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <div className="flex items-center justify-between px-7" style={{ paddingTop: "17px", paddingBottom: "10px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.10em", color: "rgba(109,228,245,0.62)" }}>
              Dance Party -Nú-<br />Vol.1
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.16em", color: "rgba(109,228,245,0.62)" }}>
              Contact: @sryota14<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(Instagram)
            </span>
          </div>

          <div className="flex-1" />

          <div className="px-7" style={{ paddingBottom: "5px" }}>
            <div
              className="relative select-none"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(108px, 25vw, 166px)", letterSpacing: "-0.028em", lineHeight: 0.83, color: "#d6e6f2" }}
            >
              <span className="absolute inset-0 pointer-events-none" style={{ color: "#6de4f5", filter: "blur(26px)", opacity: nuWide }} aria-hidden>Nú</span>
              <span className="absolute inset-0 pointer-events-none" style={{ color: "#6de4f5", filter: "blur(7px)", opacity: nuMid }} aria-hidden>Nú</span>
              <span className="relative">Nú</span>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "7.5px", letterSpacing: "0.42em", color: "rgba(109,228,245,0.58)", textTransform: "uppercase", marginTop: "10px" }}>
              presented by Niyang
            </div>
          </div>

          <div className="px-7" style={{ paddingTop: "17px", paddingBottom: "10px" }}>
            <div className="flex items-start justify-between gap-3">

              <div className="flex flex-col gap-1">
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.36em", color: "rgba(109,228,245,0.72)", textTransform: "uppercase" }}>
                  Date</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "21px", color: "#d6e6f2", lineHeight: 1, letterSpacing: "-0.01em" }}>
                  11/28</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(214,230,242,0.72)" }}>Saturday</span>
              </div>

              <div style={{ width: "0.4px", alignSelf: "stretch", background: "rgba(109,228,245,0.1)" }} />

              <div className="flex flex-col gap-1">
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.36em", color: "rgba(109,228,245,0.72)", textTransform: "uppercase" }}>
                  Time
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "21px", color: "#d6e6f2", lineHeight: 1, letterSpacing: "-0.01em" }}>
                    17:30
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(214,230,242,0.72)" }}>
                    Open
                  </span>
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(214,230,242,0.72)" }}>
                  18:00 Start<br />21:30 Close
                </span>
              </div>

              <div style={{ width: "0.4px", alignSelf: "stretch", background: "rgba(109,228,245,0.1)" }} />

              <div className="flex flex-col gap-1" style={{ flexShrink: 1 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.36em", color: "rgba(109,228,245,0.72)", textTransform: "uppercase" }}>
                  Venue
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "21px", color: "#d6e6f2", lineHeight: 1 }}>
                  Hundred 7
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", color: "rgba(214,230,242,0.72)" }}>
                  Akihabara,<br />
                  Tokyo
                </span>
              </div>

              <div style={{ width: "0.4px", alignSelf: "stretch", background: "rgba(109,228,245,0.1)" }} />

              <div className="flex flex-col gap-1" style={{ flex: "1 1 0", minWidth: 0 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.36em", color: "rgba(109,228,245,0.72)", textTransform: "uppercase" }}>
                  Price (Adv.)
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "21px", color: "#6de4f5", lineHeight: 1, letterSpacing: "-0.01em", textShadow: `0 0 14px rgba(109,228,245,${priceShadowA.toFixed(3)}), 0 0 32px rgba(109,228,245,${(priceShadowA * 0.45).toFixed(3)})` }}>
                  ¥2,000
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.10em", color: "rgba(214,230,242,0.72)" }}>
                  *Door. ¥2,500<br />
                  *Students. ¥1,500<br />
                  &nbsp;+One Drink ¥500
                </span>
              </div>

            </div>
            <div style={{ textAlign: "center", paddingTop: "3px", paddingBottom: "3px" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "8.5px", letterSpacing: "0.12em", color: "rgba(214,230,242,0.72)" }}>
                FREE Liquor/Beer Included | ALLOWED to Bring Outside Food/Drink
              </span>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
