import { memo, useEffect, useRef, useState } from "react";

// ── Design constants ───────────────────────────────────────────────────────
const DW = 480;
const DH = 679;
const MONO = "'DM Mono', monospace";
const COND = "'Barlow Condensed', sans-serif";
const CYAN = "#6de4f5";
const FG = "#d6e6f2";
const BG = "#07080d";

// ── Wave helpers ───────────────────────────────────────────────────────────
const WAVE_COUNT = 21;
const CTR_I = 10;

function waveParams(i: number, t: number) {
  const yBase = 52 + i * 19.5;
  const ampBase = 5 + Math.abs(Math.sin(i * 0.88)) * 7;
  const amp = ampBase + Math.sin(t * 0.54 + i * 0.55) * 3.8;
  const freq = 0.027 + Math.sin(i * 0.41) * 0.005;
  const phase =
    i * 0.6 +
    Math.cos(i * 0.28) * 1.1 +
    t * (0.264 + i * 0.012);
  return { yBase, amp, freq, phase };
}

function buildWave(i: number, t: number): string {
  const { yBase, amp, freq, phase } = waveParams(i, t);
  const pts: string[] = [];
  for (let j = 0; j <= 96; j++) {
    const x = j * 5;
    const y = yBase + amp * Math.sin(x * freq + phase);
    pts.push(
      `${j === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`,
    );
  }
  return pts.join(" ");
}

function centerWaveY(t: number): number {
  const { yBase, amp, freq, phase } = waveParams(CTR_I, t);
  return yBase + amp * Math.sin(240 * freq + phase);
}

// ── Static data ────────────────────────────────────────────────────────────
const DOTS: [number, number][] = [
  [44, 78],
  [436, 92],
  [28, 195],
  [454, 308],
  [195, 512],
  [282, 500],
  [138, 558],
  [342, 554],
  [76, 462],
  [404, 446],
  [62, 130],
  [418, 170],
  [22, 350],
  [460, 388],
];

const CORNERS: [number, number, number, number][] = [
  [12, 12, 1, 1],
  [468, 12, -1, 1],
  [12, 667, 1, -1],
  [468, 667, -1, -1],
];

const EVENT_DATE = new Date(2026, 10, 28);

const TIMETABLE = [
  { time: "17:30", name: "DOORS OPEN", role: "" },
  {
    time: "18:00",
    name: "Explanation / 1st Showcases / Breakin' Battle",
    role: "-",
  },
  { time: "18:45", name: "DJ TIME", role: "-" },
  {
    time: "19:00",
    name: "2nd Showcases / All Genre Battle",
    role: "-",
  },
  { time: "19:35", name: "DJ TIME", role: "-" },
  {
    time: "20:00",
    name: "3rd Showcases / Final Battle",
    role: "-",
  },
  { time: "20:50", name: "DJ TIME", role: "-" },
  { time: "21:30", name: "CLOSE", role: "-" },
];

function getActiveSlotIndex(): number {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const cur = now.getHours() * 60 + now.getMinutes();
  const mins = TIMETABLE.map((s) => {
    const [h, m] = s.time.split(":").map(Number);
    return h * 60 + m;
  });

  //イベント日以前の場合、0を返す (初項を光らせる)
  if (today < EVENT_DATE) return 0;

  // イベント日以後の場合、項数-1を返す (末項を光らせる)
  if (today > EVENT_DATE) return TIMETABLE.length - 1;

  // イベント当日の場合は時間によって戻り値を変える
  if (cur < mins[0]) return 0;
  if (cur >= mins[mins.length - 1]) return mins.length - 1;

  let idx = 0;
  for (let i = 0; i < mins.length; i++) {
    if (mins[i] <= cur) idx = i;
  }

  return idx;
}

// ── Battle data — update battler names before the event ───────────────────
type BattleKey = "breakin" | "allgenre" | "final";

const BATTLES: Record<
  BattleKey,
  {
    title: string;
    subtitle: string;
    desc: string;
    battlers: string[];
  }
> = {
  breakin: {
    title: "BREAKIN' BATTLE",
    subtitle: "B-Boys / B-Girls",
    desc: "Who do you think won the Breakin' Battle?",
    battlers: [
      "BATTLER A",
      "BATTLER B",
      "BATTLER C",
      "BATTLER D",
    ],
  },
  allgenre: {
    title: "ALL GENRE BATTLE",
    subtitle: "All Dancers",
    desc: "Who do you think won the All Genre Battle?",
    battlers: [
      "BATTLER A",
      "BATTLER B",
      "BATTLER C",
      "BATTLER D",
    ],
  },
  final: {
    title: "FINAL BATTLE",
    subtitle: "Championship",
    desc: "Who do you think won the Final Battle?",
    battlers: [
      "BATTLER A",
      "BATTLER B",
      "BATTLER C",
      "BATTLER D",
    ],
  },
};

const NOTES_LIST = [
  {
    label: "ADMISSION",
    body: "Adv. ¥2,000 (事前決済)\nDoor. ¥2,500 (当日支払)\nStudents ¥1,500\n+ One Drink ¥500",
  },
  {
    label: "FOOD & DRINK",
    body: "ワンドリンク用の缶以外、すべて無料！\nビールサーバーも無料！持ち込みOK！\n※においの強いものは持ち込み禁止",
  },
  {
    label: "VELUE RULES",
    body: "(会場注意事項記載予定)",
  },
  {
    label: "AAAA",
    body: "(AAAA)",
  },
  {
    label: "VENUE",
    body: "Hundred 7 — Akihabara, Tokyo\n(住所記載予定)",
  },
  {
    label: "CONTACT",
    body: "Instagram: @sryota14",
  },
];

// ── Shared section base style ──────────────────────────────────────────────
const SEC: React.CSSProperties = {
  height: "100dvh",
  minHeight: "100vh", // fallback for older browsers
  position: "relative",
  overflow: "hidden",
  background: BG,
  flexShrink: 0,
  scrollSnapAlign: "start",
};

// ── Page 1: Animated flyer ─────────────────────────────────────────────────
const Page1 = memo(function Page1({
  onRef,
}: {
  onRef: (el: HTMLDivElement | null) => void;
}) {
  const [t, setT] = useState(0);
  const frameRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const elRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const setRef = (el: HTMLDivElement | null) => {
    elRef.current = el;
    onRef(el);
  };

  useEffect(() => {
    const animate = (now: number) => {
      frameRef.current = requestAnimationFrame(animate);
      if (now - lastRef.current < 42) return;
      lastRef.current = now;
      setT((p) => p + 0.036);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // Scale HTML overlay to perfectly overlay the SVG "meet" area
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const s = Math.min(width / DW, height / DH);
      setScale(s);
      setOffset({
        x: (width - DW * s) / 2,
        y: (height - DH * s) / 2,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const waves = Array.from({ length: WAVE_COUNT }, (_, i) =>
    buildWave(i, t),
  );
  const focalY = centerWaveY(t);

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

  const nuPulse =
    0.5 +
    0.5 * (0.7 * Math.sin(t * 0.8) + 0.3 * Math.sin(t * 2.1));
  const nuWide = 0.18 + 0.14 * nuPulse;
  const nuMid = 0.1 + 0.11 * nuPulse;
  const pricePulse =
    0.5 +
    0.5 *
      (0.65 * Math.sin(t * 0.65 + 1.2) +
        0.35 * Math.sin(t * 1.8 + 0.4));
  const priceShadowA = 0.38 + 0.28 * pricePulse;

  return (
    <div ref={setRef} style={SEC}>
      {/* SVG: scales via viewBox / preserveAspectRatio="meet" */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
        viewBox="0 0 480 679"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <filter
            id="grain"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="linearRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.68"
              numOctaves="4"
              stitchTiles="stitch"
              result="n"
            />
            <feColorMatrix
              type="saturate"
              values="0"
              in="n"
              result="g"
            />
            <feBlend
              in="SourceGraphic"
              in2="g"
              mode="overlay"
              result="b"
            />
            <feComposite
              in="b"
              in2="SourceGraphic"
              operator="in"
            />
          </filter>
          <filter
            id="glow-sm"
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id="glow-lg"
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur stdDeviation="11" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="480" height="679" fill={BG} />
        <ellipse
          cx="155"
          cy="215"
          rx={blob1.rx}
          ry={blob1.ry}
          fill="rgba(20,50,88,0.18)"
          transform={`rotate(${blob1.rot},155,215)`}
        />
        <ellipse
          cx="350"
          cy="330"
          rx={blob2.rx}
          ry={blob2.ry}
          fill="rgba(10,32,68,0.13)"
          transform={`rotate(${blob2.rot},350,330)`}
        />
        <ellipse
          cx="240"
          cy="440"
          rx={blob3.rx}
          ry={blob3.ry}
          fill="rgba(8,24,52,0.1)"
          transform={`rotate(${blob3.rot},240,440)`}
        />

        {waves.map((d, i) => {
          const dist = Math.abs(i - CTR_I);
          const isCtr = dist === 0;
          const isNear = dist <= 2;
          const op = isCtr
            ? 0.78
            : isNear
              ? 0.28 - (dist - 1) * 0.07
              : Math.max(0.04, 0.13 - dist * 0.022);
          const sw = isCtr ? 0.9 : isNear ? 0.55 : 0.32;
          return (
            <path
              key={i}
              d={d}
              stroke={CYAN}
              strokeWidth={sw}
              opacity={op}
              filter={isCtr ? "url(#glow-sm)" : undefined}
            />
          );
        })}

        <circle
          cx="240"
          cy={focalY}
          r="56"
          stroke="rgba(109,228,245,0.12)"
          strokeWidth="0.5"
          strokeDasharray="3 8"
          fill="none"
        />
        <circle
          cx="240"
          cy={focalY}
          r="30"
          stroke={CYAN}
          strokeWidth="0.7"
          fill="none"
          filter="url(#glow-sm)"
          opacity="0.42"
        />
        <circle
          cx="240"
          cy={focalY}
          r="5"
          fill={CYAN}
          opacity="0.6"
          filter="url(#glow-lg)"
        />
        <circle cx="240" cy={focalY} r="1.8" fill="#dff4ff" />
        <line
          x1="240"
          y1={focalY - 44}
          x2="240"
          y2={focalY - 34}
          stroke="rgba(109,228,245,0.42)"
          strokeWidth="0.6"
        />
        <line
          x1="240"
          y1={focalY + 34}
          x2="240"
          y2={focalY + 44}
          stroke="rgba(109,228,245,0.42)"
          strokeWidth="0.6"
        />
        <line
          x1={240 - 44}
          y1={focalY}
          x2={240 - 34}
          y2={focalY}
          stroke="rgba(109,228,245,0.42)"
          strokeWidth="0.6"
        />
        <line
          x1={240 + 34}
          y1={focalY}
          x2={240 + 44}
          y2={focalY}
          stroke="rgba(109,228,245,0.42)"
          strokeWidth="0.6"
        />

        {Array.from({ length: WAVE_COUNT }, (_, i) => {
          const y = 52 + i * 19.5;
          const len = i % 5 === 0 ? 13 : 7;
          return (
            <line
              key={`l${i}`}
              x1="14"
              y1={y}
              x2={14 + len}
              y2={y}
              stroke="rgba(109,228,245,0.28)"
              strokeWidth="0.5"
            />
          );
        })}
        {Array.from({ length: WAVE_COUNT }, (_, i) => {
          const y = 52 + i * 19.5;
          const len = i % 5 === 0 ? 13 : 7;
          return (
            <line
              key={`r${i}`}
              x1={466 - len}
              y1={y}
              x2="466"
              y2={y}
              stroke="rgba(109,228,245,0.28)"
              strokeWidth="0.5"
            />
          );
        })}

        {DOTS.map(([x, y], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width="1.5"
            height="1.5"
            fill="rgba(109,228,245,0.42)"
          />
        ))}

        <rect
          x="12"
          y="12"
          width="456"
          height="655"
          stroke="rgba(109,228,245,0.07)"
          strokeWidth="0.5"
          fill="none"
        />
        {CORNERS.map(([cx, cy, dx, dy], i) => (
          <g key={i}>
            <line
              x1={cx}
              y1={cy}
              x2={cx + dx * 18}
              y2={cy}
              stroke={CYAN}
              strokeWidth="0.85"
              opacity="0.36"
            />
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy + dy * 18}
              stroke={CYAN}
              strokeWidth="0.85"
              opacity="0.36"
            />
          </g>
        ))}
        <line
          x1="28"
          y1="40"
          x2="452"
          y2="40"
          stroke="rgba(109,228,245,0.07)"
          strokeWidth="0.4"
        />
        <line
          x1="28"
          y1="572"
          x2="452"
          y2="572"
          stroke="rgba(109,228,245,0.13)"
          strokeWidth="0.5"
        />
        <line
          x1="28"
          y1="575"
          x2="452"
          y2="575"
          stroke="rgba(109,228,245,0.04)"
          strokeWidth="0.3"
        />
        <rect
          width="480"
          height="679"
          fill="rgba(7,8,13,0.50)"
          filter="url(#grain)"
        />
      </svg>

      {/* HTML overlay: fixed 480×679 coords, scaled+offset to match SVG meet area */}
      <div
        style={{
          position: "absolute",
          left: offset.x,
          top: offset.y,
          width: DW,
          height: DH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          fontFamily: MONO,
          display: "flex",
          flexDirection: "column",
          zIndex: 2,
        }}
      >
        {/* Top meta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "17px 28px 10px",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.10em",
              color: "rgba(109,228,245,0.62)",
            }}
          >
            Dance Party -Nú-
            <br />
            Vol.1
          </span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "rgba(109,228,245,0.62)",
              textAlign: "right",
            }}
          >
            Contact: @sryota14
            <br />
            (Instagram)
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Nú */}
        <div style={{ padding: "0 28px 5px" }}>
          <div
            style={{
              position: "relative",
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 160,
              letterSpacing: "-0.028em",
              lineHeight: 0.83,
              color: FG,
              userSelect: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                color: CYAN,
                filter: "blur(26px)",
                opacity: nuWide,
                pointerEvents: "none",
              }}
              aria-hidden
            >
              Nú
            </span>
            <span
              style={{
                position: "absolute",
                inset: 0,
                color: CYAN,
                filter: "blur(7px)",
                opacity: nuMid,
                pointerEvents: "none",
              }}
              aria-hidden
            >
              Nú
            </span>
            <span style={{ position: "relative" }}>Nú</span>
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 7.5,
              letterSpacing: "0.42em",
              color: "rgba(109,228,245,0.58)",
              textTransform: "uppercase",
              marginTop: 10,
            }}
          >
            presented by Niyang
          </div>
        </div>

        {/* Details strip */}
        <div style={{ padding: "17px 28px 10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.36em",
                  color: "rgba(109,228,245,0.72)",
                  textTransform: "uppercase",
                }}
              >
                Date
              </span>
              <span
                style={{
                  fontFamily: COND,
                  fontWeight: 700,
                  fontSize: 21,
                  color: FG,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                }}
              >
                11/28
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "rgba(214,230,242,0.72)",
                }}
              >
                Saturday
              </span>
            </div>

            <div
              style={{
                width: 0.4,
                alignSelf: "stretch",
                background: "rgba(109,228,245,0.1)",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.36em",
                  color: "rgba(109,228,245,0.72)",
                  textTransform: "uppercase",
                }}
              >
                Time
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    fontFamily: COND,
                    fontWeight: 700,
                    fontSize: 21,
                    color: FG,
                    lineHeight: 1,
                    letterSpacing: "-0.01em",
                  }}
                >
                  17:30
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "rgba(214,230,242,0.72)",
                  }}
                >
                  Open
                </span>
              </div>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "rgba(214,230,242,0.72)",
                }}
              >
                18:00 Start
                <br />
                21:30 Close
              </span>
            </div>

            <div
              style={{
                width: 0.4,
                alignSelf: "stretch",
                background: "rgba(109,228,245,0.1)",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                flexShrink: 1,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.36em",
                  color: "rgba(109,228,245,0.72)",
                  textTransform: "uppercase",
                }}
              >
                Venue
              </span>
              <span
                style={{
                  fontFamily: COND,
                  fontWeight: 700,
                  fontSize: 21,
                  color: FG,
                  lineHeight: 1,
                }}
              >
                Hundred 7
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  color: "rgba(214,230,242,0.72)",
                }}
              >
                Akihabara,
                <br />
                Tokyo
              </span>
            </div>

            <div
              style={{
                width: 0.4,
                alignSelf: "stretch",
                background: "rgba(109,228,245,0.1)",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                flex: "1 1 0",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.36em",
                  color: "rgba(109,228,245,0.72)",
                  textTransform: "uppercase",
                }}
              >
                Price (Adv.)
              </span>
              <span
                style={{
                  fontFamily: COND,
                  fontWeight: 700,
                  fontSize: 21,
                  color: CYAN,
                  lineHeight: 1,
                  letterSpacing: "-0.01em",
                  textShadow: `0 0 14px rgba(109,228,245,${priceShadowA.toFixed(3)}), 0 0 32px rgba(109,228,245,${(priceShadowA * 0.45).toFixed(3)})`,
                }}
              >
                ¥2,000
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.10em",
                  color: "rgba(214,230,242,0.72)",
                }}
              >
                *Door. ¥2,500
                <br />
                *Students. ¥1,500
                <br />
                &nbsp;+One Drink ¥500
              </span>
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              paddingTop: 3,
              paddingBottom: 3,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 8.5,
                letterSpacing: "0.12em",
                color: "rgba(214,230,242,0.72)",
              }}
            >
              FREE Liquor/Beer Included | ALLOWED to Bring
              Outside Food/Drink
            </span>
          </div>
        </div>
      </div>

      {/* Scroll indicator — bouncing arrow */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <div
          className="scroll-indicator"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            color: CYAN,
            fontFamily: MONO,
          }}
        >
          <span
            style={{
              fontSize: 8,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            scroll
          </span>
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            fill="none"
            style={{ opacity: 0.8 }}
          >
            <line
              x1="6"
              y1="0"
              x2="6"
              y2="10"
              stroke={CYAN}
              strokeWidth="0.8"
            />
            <polyline
              points="2,7 6,12 10,7"
              stroke={CYAN}
              strokeWidth="0.8"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
});

// ── Page 2: Timetable ──────────────────────────────────────────────────────
const Page2 = memo(function Page2({
  onRef,
}: {
  onRef: (el: HTMLDivElement | null) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(() =>
    getActiveSlotIndex(),
  );
  useEffect(() => {
    const id = setInterval(
      () => setActiveIdx(getActiveSlotIndex()),
      60000,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <div ref={onRef} style={SEC}>
      {/* Subtle static wave bg */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.08,
        }}
        viewBox="0 0 480 300"
        preserveAspectRatio="xMidYMin slice"
        fill="none"
        aria-hidden
      >
        {Array.from({ length: 10 }, (_, i) => {
          const y = 20 + i * 26;
          const d = Array.from({ length: 97 }, (_, j) => {
            const x = j * 5;
            const yv = y + 6 * Math.sin(x * 0.028 + i * 0.9);
            return `${j === 0 ? "M" : "L"}${x},${yv.toFixed(1)}`;
          }).join(" ");
          return (
            <path
              key={i}
              d={d}
              stroke={CYAN}
              strokeWidth="0.5"
            />
          );
        })}
      </svg>

      <div
        className="page-inner"
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          padding: "0 28px",
          fontFamily: MONO,
          maxWidth: 480,
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            paddingTop: 44,
            paddingBottom: 28,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.4em",
              color: "rgba(109,228,245,0.45)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Nú Vol.1 — 11.28 SAT
          </div>
          <div
            style={{
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 42,
              color: FG,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            TIMETABLE
          </div>
          <div
            style={{
              marginTop: 10,
              width: 36,
              height: 0.5,
              background: CYAN,
              opacity: 0.5,
            }}
          />
        </div>

        {/* Timeline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {TIMETABLE.map((slot, i) => {
            const active = i === activeIdx;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  paddingBottom:
                    i < TIMETABLE.length - 1 ? 22 : 0,
                }}
              >
                {/* Time — height 20px matches dot zone for horizontal alignment */}
                <div
                  style={{
                    width: 46,
                    flexShrink: 0,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      color: active
                        ? "rgba(109,228,245,0.9)"
                        : "rgba(109,228,245,0.5)",
                    }}
                  >
                    {slot.time}
                  </span>
                </div>
                {/* Dot + connector */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 10,
                    flexShrink: 0,
                  }}
                >
                  {/* 20px zone so dot center aligns with time text */}
                  <div
                    style={{
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: active ? 8 : 5,
                        height: active ? 8 : 5,
                        borderRadius: "50%",
                        background: active
                          ? CYAN
                          : "rgba(109,228,245,0.3)",
                        boxShadow: active
                          ? `0 0 10px ${CYAN}`
                          : "none",
                      }}
                    />
                  </div>
                  {i < TIMETABLE.length - 1 && (
                    <div
                      style={{
                        width: 0.5,
                        flex: 1,
                        background: "rgba(109,228,245,0.12)",
                      }}
                    />
                  )}
                </div>
                {/* Label */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      fontFamily: COND,
                      fontWeight: active ? 700 : 500,
                      fontSize: active ? 16 : 15,
                      color: active
                        ? FG
                        : "rgba(214,230,242,0.55)",
                      letterSpacing: "-0.01em",
                      lineHeight: 1,
                    }}
                  >
                    {slot.name}
                  </div>
                  {slot.role && slot.role !== "-" && (
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 9,
                        letterSpacing: "0.22em",
                        color: "rgba(109,228,245,0.4)",
                        textTransform: "uppercase",
                      }}
                    >
                      {slot.role}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <PageFooter />
      </div>
    </div>
  );
});

// ── Shared page footer ─────────────────────────────────────────────────────
function PageFooter() {
  return (
    <div
      style={{
        paddingTop: 12,
        paddingBottom: 28,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: 0.4,
          background: "rgba(109,228,245,0.1)",
          marginBottom: 14,
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div
          style={{
            fontFamily: COND,
            fontWeight: 800,
            fontSize: 26,
            color: "rgba(214,230,242,0.25)",
            letterSpacing: "-0.01em",
          }}
        >
          Nú
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: "0.2em",
            color: "rgba(109,228,245,0.3)",
          }}
        >
          presented by Niyang
        </div>
      </div>
    </div>
  );
}

// ── Battle vote overlay page ───────────────────────────────────────────────
function BattleVotePage({
  battleKey,
  voteState,
  onSelect,
  onConfirm,
  onChangeVote,
  onBack,
}: {
  battleKey: BattleKey;
  voteState: { selected: number | null; confirmed: boolean };
  onSelect: (i: number) => void;
  onConfirm: () => void;
  onChangeVote: () => void;
  onBack: () => void;
}) {
  const battle = BATTLES[battleKey];
  const { selected, confirmed } = voteState;

  return (
    <div
      style={{
        height: "100dvh",
        minHeight: "100vh",
        background: BG,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="page-inner"
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          padding: "0 28px",
          fontFamily: MONO,
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Fixed top bar with back button */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: BG,
            borderBottom: "0.5px solid rgba(109,228,245,0.1)",
            marginLeft: -28,
            marginRight: -28,
            paddingLeft: 28,
            paddingRight: 28,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "14px 0",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              <polyline
                points="11,4 6,9 11,14"
                stroke={CYAN}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: "0.25em",
                color: CYAN,
                textTransform: "uppercase",
              }}
            >
              Back
            </span>
          </button>
        </div>

        {/* Header */}
        <div
          style={{
            paddingTop: 28,
            paddingBottom: 28,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.4em",
              color: "rgba(109,228,245,0.45)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {battle.subtitle}
          </div>
          <div
            style={{
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 36,
              color: FG,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            {battle.title}
          </div>
          <div
            style={{
              marginTop: 10,
              width: 36,
              height: 0.5,
              background: CYAN,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              marginTop: 16,
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "rgba(214,230,242,0.5)",
              lineHeight: 1.65,
            }}
          >
            {confirmed
              ? `Your vote: ${battle.battlers[selected!]}`
              : selected !== null
                ? "Tap CONFIRM to lock in, or tap another to change."
                : battle.desc}
          </div>
        </div>

        {/* Battler options */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flex: 1,
          }}
        >
          {battle.battlers.map((name, i) => {
            const isSel = selected === i;
            return (
              <button
                key={i}
                onClick={() => !confirmed && onSelect(i)}
                disabled={confirmed}
                style={{
                  background: isSel
                    ? "rgba(109,228,245,0.07)"
                    : "transparent",
                  border: `0.5px solid ${isSel ? CYAN : "rgba(109,228,245,0.15)"}`,
                  borderRadius: 2,
                  padding: "15px 16px",
                  cursor: confirmed ? "default" : "pointer",
                  textAlign: "left",
                  transition:
                    "border-color 0.25s, background 0.25s",
                  WebkitTapHighlightColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    color: isSel
                      ? CYAN
                      : "rgba(214,230,242,0.65)",
                    textTransform: "uppercase",
                  }}
                >
                  {name}
                </span>
                {isSel && (
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      color: CYAN,
                      opacity: 0.8,
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirm / Change */}
        <div
          style={{
            paddingTop: 16,
            paddingBottom: 4,
            flexShrink: 0,
          }}
        >
          {!confirmed && selected !== null && (
            <button
              onClick={onConfirm}
              style={{
                width: "100%",
                background: CYAN,
                border: "none",
                borderRadius: 2,
                padding: "13px 16px",
                cursor: "pointer",
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: "0.3em",
                color: BG,
                textTransform: "uppercase",
                fontWeight: 600,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Confirm Vote
            </button>
          )}
          {confirmed && (
            <button
              onClick={onChangeVote}
              style={{
                width: "100%",
                background: "transparent",
                border: "0.5px solid rgba(109,228,245,0.2)",
                borderRadius: 2,
                padding: "12px 16px",
                cursor: "pointer",
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: "0.25em",
                color: "rgba(109,228,245,0.45)",
                textTransform: "uppercase",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Change Vote
            </button>
          )}
        </div>

        <PageFooter />
      </div>
    </div>
  );
}

// ── Page 3: Battle menu ────────────────────────────────────────────────────
const BATTLE_MENU: {
  key: BattleKey;
  label: string;
  desc: string;
}[] = [
  {
    key: "breakin",
    label: "BREAKIN' BATTLE",
    desc: "B-Boys / B-Girls",
  },
  {
    key: "allgenre",
    label: "ALL GENRE BATTLE",
    desc: "All Dancers",
  },
  { key: "final", label: "FINAL BATTLE", desc: "Championship" },
];

const Page3 = memo(function Page3({
  onRef,
  onEnterBattle,
}: {
  onRef: (el: HTMLDivElement | null) => void;
  onEnterBattle: (key: BattleKey) => void;
}) {
  return (
    <div ref={onRef} style={SEC}>
      <div
        className="page-inner"
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          padding: "0 28px",
          fontFamily: MONO,
          maxWidth: 480,
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            paddingTop: 44,
            paddingBottom: 28,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.4em",
              color: "rgba(109,228,245,0.45)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Nú Vol.1 — Battle Vote
          </div>
          <div
            style={{
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 42,
              color: FG,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            WHO WON?
          </div>
          <div
            style={{
              marginTop: 10,
              width: 36,
              height: 0.5,
              background: CYAN,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              marginTop: 16,
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "rgba(214,230,242,0.5)",
              lineHeight: 1.65,
            }}
          >
            Select a battle to cast your vote.
          </div>
        </div>

        {/* Battle buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: 1,
          }}
        >
          {BATTLE_MENU.map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => onEnterBattle(key)}
              style={{
                background: "transparent",
                border: "0.5px solid rgba(109,228,245,0.18)",
                borderRadius: 2,
                padding: "18px 20px",
                cursor: "pointer",
                textAlign: "left",
                transition:
                  "border-color 0.2s, background 0.2s",
                WebkitTapHighlightColor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              onPointerEnter={(e) => {
                (
                  e.currentTarget as HTMLButtonElement
                ).style.borderColor = "rgba(109,228,245,0.45)";
                (
                  e.currentTarget as HTMLButtonElement
                ).style.background = "rgba(109,228,245,0.04)";
              }}
              onPointerLeave={(e) => {
                (
                  e.currentTarget as HTMLButtonElement
                ).style.borderColor = "rgba(109,228,245,0.18)";
                (
                  e.currentTarget as HTMLButtonElement
                ).style.background = "transparent";
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: COND,
                    fontWeight: 700,
                    fontSize: 20,
                    color: FG,
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.22em",
                    color: "rgba(109,228,245,0.4)",
                    textTransform: "uppercase",
                    marginTop: 5,
                  }}
                >
                  {desc}
                </div>
              </div>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: "rgba(109,228,245,0.35)",
                }}
              >
                ›
              </span>
            </button>
          ))}
        </div>

        <PageFooter />
      </div>
    </div>
  );
});

// ── Page 4: Notes ──────────────────────────────────────────────────────────
const Page4 = memo(function Page4({
  onRef,
}: {
  onRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={onRef} style={SEC}>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "0 28px",
          fontFamily: MONO,
          maxWidth: 480,
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* Header — tighter spacing */}
        <div
          style={{
            paddingTop: 36,
            paddingBottom: 14,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.4em",
              color: "rgba(109,228,245,0.45)",
              textTransform: "uppercase",
              marginBottom: 5,
            }}
          >
            Nú Vol.1 — Info
          </div>
          <div
            style={{
              fontFamily: COND,
              fontWeight: 800,
              fontSize: 38,
              color: FG,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            NOTES
          </div>
          <div
            style={{
              marginTop: 8,
              width: 36,
              height: 0.5,
              background: CYAN,
              opacity: 0.5,
            }}
          />
        </div>

        {/* Notes — ② compressed spacing */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {NOTES_LIST.map((note, i) => (
            <div key={i}>
              <div style={{ paddingBottom: 9 }}>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.35em",
                    color: CYAN,
                    opacity: 0.65,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {note.label}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 9.5,
                    letterSpacing: "0.06em",
                    color: "rgba(214,230,242,0.68)",
                    lineHeight: 1.6,
                  }}
                >
                  {note.body.split("\n").map((line, j, arr) => (
                    <span key={j}>
                      {line}
                      {j < arr.length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
              {i < NOTES_LIST.length - 1 && (
                <div
                  style={{
                    height: 0.4,
                    background: "rgba(109,228,245,0.07)",
                    marginBottom: 9,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <PageFooter />
      </div>
    </div>
  );
});

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    document.documentElement.lang = "ja";
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [activePage, setActivePage] = useState(0);

  // Battle overlay state — synced with ?battle= query param for deep linking
  const [activeBattle, setActiveBattle] = useState<BattleKey | null>(() => {
    const p = new URLSearchParams(window.location.search).get("battle");
    return (p === "breakin" || p === "allgenre" || p === "final") ? p : null;
  });

  const openBattle = (key: BattleKey | null) => {
    setActiveBattle(key);
    const url = new URL(window.location.href);
    if (key) url.searchParams.set("battle", key);
    else url.searchParams.delete("battle");
    window.history.replaceState(null, "", url.toString());
  };
  const [voteStates, setVoteStates] = useState<
    Record<
      BattleKey,
      { selected: number | null; confirmed: boolean }
    >
  >({
    breakin: { selected: null, confirmed: false },
    allgenre: { selected: null, confirmed: false },
    final: { selected: null, confirmed: false },
  });

  const handleSelect = (key: BattleKey, i: number) =>
    setVoteStates((s) => ({
      ...s,
      [key]: { ...s[key], selected: i },
    }));
  const handleConfirm = (key: BattleKey) =>
    setVoteStates((s) => ({
      ...s,
      [key]: { ...s[key], confirmed: true },
    }));
  const handleChangeVote = (key: BattleKey) =>
    setVoteStates((s) => ({
      ...s,
      [key]: { ...s[key], confirmed: false },
    }));

  useEffect(() => {
    const observers = sectionRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActivePage(i);
        },
        { threshold: 0.5 },
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  const scrollToPage = (i: number) =>
    sectionRefs.current[i]?.scrollIntoView({
      behavior: "smooth",
    });

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        minHeight: "100vh",
        overflow: "hidden",
        background: BG,
      }}
    >
      {/* Page indicator dots — hidden when battle overlay is open */}
      {!activeBattle && (
        <nav
          style={{
            position: "fixed",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              onClick={() => scrollToPage(i)}
              aria-label={`Page ${i + 1}`}
              style={{
                width: activePage === i ? 6 : 4,
                height: activePage === i ? 6 : 4,
                borderRadius: "50%",
                background:
                  activePage === i
                    ? CYAN
                    : "rgba(109,228,245,0.25)",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s ease",
                boxShadow:
                  activePage === i ? `0 0 6px ${CYAN}` : "none",
                WebkitTapHighlightColor: "transparent",
              }}
            />
          ))}
        </nav>
      )}

      {/* Scroll-snap container */}
      <div
        ref={scrollRef}
        style={
          {
            height: "100dvh",
            minHeight: "100vh",
            overflowY: "scroll",
            scrollSnapType: "y mandatory",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties
        }
      >
        <Page1
          onRef={(el) => {
            sectionRefs.current[0] = el;
          }}
        />
        <Page2
          onRef={(el) => {
            sectionRefs.current[1] = el;
          }}
        />
        <Page3
          onRef={(el) => {
            sectionRefs.current[2] = el;
          }}
          onEnterBattle={openBattle}
        />
        <Page4
          onRef={(el) => {
            sectionRefs.current[3] = el;
          }}
        />
      </div>

      {/* Battle vote overlay — slides in from right */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: BG,
          transform: activeBattle
            ? "translateX(0)"
            : "translateX(100%)",
          transition:
            "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
          overflowY: "auto",
        }}
      >
        {activeBattle && (
          <BattleVotePage
            battleKey={activeBattle}
            voteState={voteStates[activeBattle]}
            onSelect={(i) => handleSelect(activeBattle, i)}
            onConfirm={() => handleConfirm(activeBattle)}
            onChangeVote={() => handleChangeVote(activeBattle)}
            onBack={() => openBattle(null)}
          />
        )}
      </div>
    </div>
  );
}