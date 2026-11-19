// 投票結果の発表画面（/VoteResults?battle=<key>）
// イベント会場でプロジェクター（横長 16:9）に映してみんなで見る前提。
// 開くと自動で「タイトル → 3位 → 2位 → 1位 → 表彰台」と進む。票数は出さず順位だけを見せる。
// キー操作（会場の PC 用・画面には出さない）：F = 全画面の切り替え、R = 最初からやり直す（結果も取り直す）
// リハーサル用：URL に &demo を付けると、データベースを使わずに見本のデータで流れる（例 /VoteResults?battle=final&demo）
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

type VoteResult = {
  battler: string;
  count: number;
};

type RankedResult = VoteResult & {
  rank: number; // 同票は同じ順位。次の順位はその分とばす（1位が2人なら次は3位）
};

// ── 演出のタイミング（単位は ms。ここだけで調整できる） ───────────────────
const INTRO_MS = 5000; // タイトルを見せる時間
const SUSPENSE_MS = 5000; // 3位・2位：名前がシャッフルする「タメ」
const SUSPENSE_FIRST_MS = 8000; // 1位：タメを長めに
const HOLD_MS = 4500; // 3位・2位：発表した名前を大きく見せておく時間
const HOLD_FIRST_MS = 7000; // 1位：発表した名前を見せておく時間（紙吹雪）
// ────────────────────────────────────────────────────────────

// バトルの表示名（App.tsx の BATTLES と合わせる）
const BATTLE_TITLES: Record<string, string> = {
  breakin: "BREAKIN' BATTLE",
  allgenre: "ALL GENRE BATTLE",
  final: "FINAL BATTLE",
};

// リハーサル用の見本データ（&demo のときだけ使う）
const DEMO_VOTES: VoteResult[] = [
  { battler: "BATTLER A", count: 12 },
  { battler: "BATTLER B", count: 9 },
  { battler: "BATTLER C", count: 7 },
  { battler: "BATTLER D", count: 3 },
];

const COND = "'Barlow Condensed', sans-serif";
const MONO = "'DM Mono', monospace";
const BG = "#07080d";
const FG = "#d6e6f2";
const CYAN = "#6de4f5";

const RANK_META: Record<number, { label: string; short: string; color: string; glow: string }> = {
  1: { label: "1ST PLACE", short: "1ST", color: "#FFD166", glow: "rgba(255,209,102,0.75)" },
  2: { label: "2ND PLACE", short: "2ND", color: "#E6EEF5", glow: "rgba(214,230,242,0.55)" },
  3: { label: "3RD PLACE", short: "3RD", color: "#F0A868", glow: "rgba(240,168,104,0.55)" },
};

type Stage =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "intro" }
  | { kind: "suspense"; rank: number }
  | { kind: "reveal"; rank: number }
  | { kind: "podium" };

function computeRanking(votes: VoteResult[]): RankedResult[] {
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  let lastCount: number | null = null;
  let lastRank = 0;
  return sorted.map((v, i) => {
    const rank = v.count === lastCount ? lastRank : i + 1;
    lastCount = v.count;
    lastRank = rank;
    return { ...v, rank };
  });
}

// 長い名前でも画面の幅に収まる文字の大きさ（Barlow Condensed は1文字およそ 0.5em）
function fitSize(name: string, maxVh: number, widthVw = 88) {
  const len = Math.max(name.length, 1);
  return `min(${maxVh}vh, ${(widthVw / (len * 0.52)).toFixed(2)}vw)`;
}

function wait(ms: number, signal: { cancelled: boolean }) {
  return new Promise<boolean>((resolve) => setTimeout(() => resolve(!signal.cancelled), ms));
}

function fireWinnerConfetti() {
  const colors = ["#FFD166", "#6de4f5", "#ffffff", "#F0A868"];
  confetti({ particleCount: 180, spread: 110, startVelocity: 55, origin: { y: 0.55 }, colors });
  const end = Date.now() + 4500;
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

function firePodiumConfetti() {
  const colors = ["#FFD166", "#6de4f5", "#ffffff"];
  confetti({ particleCount: 90, spread: 160, startVelocity: 35, origin: { y: 0.15 }, colors, gravity: 0.6 });
}

export default function VoteResults() {
  const params = new URLSearchParams(window.location.search);
  const battleKey = params.get("battle") ?? "";
  const demo = params.has("demo");
  const title = BATTLE_TITLES[battleKey] ?? `${battleKey.toUpperCase()} BATTLE`;

  const [votes, setVotes] = useState<VoteResult[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [runId, setRunId] = useState(0);
  const [readyRun, setReadyRun] = useState<number | null>(null); // 結果が取れて発表を始められる回

  // 結果を取る（R キーでやり直すときも取り直す）
  useEffect(() => {
    let alive = true;
    setReadyRun(null);
    setStage({ kind: "loading" });
    setRevealed(new Set());
    const load: Promise<VoteResult[]> = demo
      ? Promise.resolve(DEMO_VOTES)
      : fetch(`/api/vote-results?battle=${encodeURIComponent(battleKey)}`).then((res) => (res.ok ? res.json() : Promise.reject(res.status)));
    load
      .then((data: VoteResult[]) => {
        if (!alive) return;
        const valid = Array.isArray(data) ? data.filter((d) => d && d.count > 0) : [];
        setVotes(valid);
        if (valid.length === 0) {
          setStage({ kind: "empty" });
        } else {
          setStage({ kind: "intro" });
          setReadyRun(runId);
        }
      })
      .catch(() => alive && setStage({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [battleKey, demo, runId]);

  const ranking = useMemo(() => computeRanking(votes), [votes]);
  const groupOf = useCallback((rank: number) => ranking.filter((r) => r.rank === rank), [ranking]);
  // 発表する順位（3位→2位→1位。同票で存在しない順位はとばす）
  const ranksToReveal = useMemo(() => [3, 2, 1].filter((r) => ranking.some((e) => e.rank === r)), [ranking]);

  // 発表の流れ（結果が取れたら1回だけ走らせる。途中で R を押したら止めてやり直す）
  useEffect(() => {
    if (readyRun === null) return;
    const signal = { cancelled: false };

    (async () => {
      if (!(await wait(INTRO_MS, signal))) return;
      for (const rank of ranksToReveal) {
        const isFirst = rank === 1;
        setStage({ kind: "suspense", rank });
        if (!(await wait(isFirst ? SUSPENSE_FIRST_MS : SUSPENSE_MS, signal))) return;
        setStage({ kind: "reveal", rank });
        setRevealed((prev) => new Set(prev).add(rank));
        if (isFirst) fireWinnerConfetti();
        if (!(await wait(isFirst ? HOLD_FIRST_MS : HOLD_MS, signal))) return;
      }
      setStage({ kind: "podium" });
      firePodiumConfetti();
    })();

    return () => {
      signal.cancelled = true;
    };
  }, [readyRun, ranksToReveal]);

  // F：全画面、R：やり直し
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
      }
      if (e.key === "r" || e.key === "R") {
        confetti.reset();
        setRunId((n) => n + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeRank = stage.kind === "suspense" || stage.kind === "reveal" ? stage.rank : null;
  const tension = stage.kind === "suspense" ? (stage.rank === 1 ? 2 : 1) : 0;

  return (
    <div style={rootStyle}>
      <style>{globalStyles}</style>
      <Background tension={tension} gold={activeRank === 1 || stage.kind === "podium"} />

      {/* 上のタイトル帯（イントロ以外でずっと出す） */}
      <AnimatePresence>
        {stage.kind !== "intro" && stage.kind !== "loading" && (
          <motion.div
            key="header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="vr-header"
          >
            <span className="vr-header__brand">Nú Vol.1</span>
            <span className="vr-header__title">{title}</span>
            <span className="vr-header__tag">{demo ? "DEMO" : "AUDIENCE VOTE"}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {stage.kind === "loading" && (
          <motion.p key="loading" className="vr-status" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.6 }}>
            集計中…
          </motion.p>
        )}

        {stage.kind === "error" && (
          <motion.p key="error" className="vr-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            結果を取得できませんでした（R キーで再読み込み）
          </motion.p>
        )}

        {stage.kind === "empty" && (
          <motion.p key="empty" className="vr-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            投票がありませんでした
          </motion.p>
        )}

        {stage.kind === "intro" && <Intro key={`intro-${runId}`} title={title} />}

        {stage.kind === "suspense" && (
          <Suspense
            key={`suspense-${stage.rank}-${runId}`}
            rank={stage.rank}
            pool={ranking.filter((r) => r.rank <= stage.rank).map((r) => r.battler)}
            durationMs={stage.rank === 1 ? SUSPENSE_FIRST_MS : SUSPENSE_MS}
          />
        )}

        {stage.kind === "reveal" && (
          <Reveal key={`reveal-${stage.rank}-${runId}`} rank={stage.rank} names={groupOf(stage.rank).map((r) => r.battler)} />
        )}

        {stage.kind === "podium" && <Podium key={`podium-${runId}`} groupOf={groupOf} />}
      </AnimatePresence>

      {/* 発表済みの順位（下に小さく残す） */}
      <AnimatePresence>
        {(stage.kind === "suspense" || stage.kind === "reveal") && revealed.size > 0 && (
          <motion.div key="tally" className="vr-tally" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[3, 2, 1]
              .filter((r) => revealed.has(r) && r !== activeRank)
              .map((r) => (
                <div key={r} className="vr-tally__item" style={{ borderColor: RANK_META[r].color }}>
                  <span style={{ color: RANK_META[r].color }}>{RANK_META[r].short}</span>
                  {groupOf(r).map((e) => e.battler).join(" / ")}
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── イントロ：バトル名を大きく ──────────────────────────────────────
function Intro({ title }: { title: string }) {
  return (
    <motion.div key="intro" className="vr-center" exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }} transition={{ duration: 0.7 }}>
      <motion.p
        className="vr-kicker"
        initial={{ opacity: 0, letterSpacing: "0.1em" }}
        animate={{ opacity: 1, letterSpacing: "0.6em" }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      >
        Nú Vol.1 — AUDIENCE VOTE
      </motion.p>
      <motion.h1
        className="vr-intro-title"
        initial={{ opacity: 0, y: 60, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {title}
      </motion.h1>
      <motion.div
        className="vr-intro-line"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: 1.3, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.p
        className="vr-intro-result"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.6, 1] }}
        transition={{ duration: 1.6, delay: 2.2 }}
      >
        RESULT
      </motion.p>
    </motion.div>
  );
}

// ── タメ：候補の名前が高速でシャッフルし、だんだん遅くなる ─────────────────
function Suspense({ rank, pool, durationMs }: { rank: number; pool: string[]; durationMs: number }) {
  const meta = RANK_META[rank];
  const [idx, setIdx] = useState(0);
  const isFirst = rank === 1;
  const poolKey = pool.join("\u0000"); // 毎回の描画で配列が作り直されても、中身が同じならタイマーを作り直さない

  useEffect(() => {
    if (pool.length < 2) return;
    const start = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const p = Math.min((Date.now() - start) / durationMs, 1);
      setIdx((i) => (i + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length);
      // 最初は速く（60ms）、終わりに向けて遅く（〜420ms）
      const next = 60 + Math.pow(p, 2.2) * 360;
      if (p < 0.94) timer = setTimeout(tick, next);
    };
    tick();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey, durationMs]);

  return (
    <motion.div key="suspense" className="vr-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <motion.p
        className="vr-rank-label"
        style={{ color: meta.color, textShadow: `0 0 40px ${meta.glow}` }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {isFirst ? "AND THE WINNER IS…" : meta.label}
      </motion.p>
      <div className="vr-shuffle-wrap">
        <motion.p
          className="vr-shuffle"
          style={{ fontSize: fitSize(pool.length >= 2 ? pool[idx % pool.length] : "???", isFirst ? 19 : 16) }}
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ repeat: Infinity, duration: isFirst ? 0.5 : 0.8 }}
        >
          {pool.length >= 2 ? pool[idx % pool.length] : "? ? ?"}
        </motion.p>
      </div>
      <SuspenseBar durationMs={durationMs} color={meta.color} />
    </motion.div>
  );
}

function SuspenseBar({ durationMs, color }: { durationMs: number; color: string }) {
  return (
    <div className="vr-bar">
      <motion.div
        className="vr-bar__fill"
        style={{ background: color, boxShadow: `0 0 18px ${color}` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: durationMs / 1000, ease: "linear" }}
      />
    </div>
  );
}

// ── 発表：名前をドンと出す ───────────────────────────────────────
function Reveal({ rank, names }: { rank: number; names: string[] }) {
  const meta = RANK_META[rank];
  const isFirst = rank === 1;
  const tie = names.length > 1;

  return (
    <motion.div key="reveal" className="vr-center" exit={{ opacity: 0, y: -30, filter: "blur(6px)" }} transition={{ duration: 0.6 }}>
      {/* 一瞬の白いフラッシュ */}
      <motion.div
        className="vr-flash"
        style={{ background: isFirst ? "radial-gradient(circle, #fff4d1 0%, rgba(255,209,102,0.6) 40%, transparent 75%)" : "radial-gradient(circle, rgba(255,255,255,0.85) 0%, transparent 70%)" }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: isFirst ? 1.4 : 0.9, ease: "easeOut" }}
      />
      <motion.p
        className="vr-rank-label"
        style={{ color: meta.color, textShadow: `0 0 40px ${meta.glow}` }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        {meta.label}
        {tie && <span className="vr-tie">TIE</span>}
      </motion.p>
      <div className={`vr-names${tie ? " vr-names--tie" : ""}`}>
        {names.map((name, i) => (
          <motion.p
            key={name}
            className={`vr-name${isFirst ? " vr-name--first" : ""}`}
            style={{
              color: isFirst ? meta.color : FG,
              textShadow: `0 0 ${isFirst ? 80 : 50}px ${meta.glow}`,
              fontSize: tie ? fitSize(name, isFirst ? 14 : 12, 88 / Math.min(names.length, 3)) : fitSize(name, isFirst ? 25 : 20),
            }}
            initial={{ opacity: 0, scale: 1.8, filter: "blur(18px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {name}
          </motion.p>
        ))}
      </div>
      {isFirst && (
        <motion.p
          className="vr-congrats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          CONGRATULATIONS!
        </motion.p>
      )}
    </motion.div>
  );
}

// ── 表彰台：2位・1位・3位を並べる（最後はこのまま止まる） ───────────────────
function Podium({ groupOf }: { groupOf: (rank: number) => RankedResult[] }) {
  const columns = [
    { rank: 2, height: "26vh", delay: 0.5 },
    { rank: 1, height: "38vh", delay: 1.1 },
    { rank: 3, height: "18vh", delay: 0 },
  ];

  return (
    <motion.div key="podium" className="vr-podium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
      {columns.filter(({ rank }) => groupOf(rank).length > 0).map(({ rank, height, delay }) => {
        const group = groupOf(rank);
        const meta = RANK_META[rank];
        const isFirst = rank === 1;
        return (
          <div key={rank} className="vr-podium__col" style={{ flex: isFirst ? 1.3 : 1, maxWidth: isFirst ? "32vw" : "26vw" }}>
            {group.length > 0 && (
              <>
                <motion.div
                  className="vr-podium__names"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: delay + 0.9, ease: [0.16, 1, 0.3, 1] }}
                >
                  {group.map((e) => (
                    <p
                      key={e.battler}
                      className={`vr-podium__name${isFirst ? " vr-podium__name--first" : ""}`}
                      style={{
                        color: isFirst ? meta.color : FG,
                        textShadow: `0 0 ${isFirst ? 50 : 26}px ${meta.glow}`,
                        fontSize: group.length > 1 ? (isFirst ? "6vh" : "4.4vh") : undefined,
                      }}
                    >
                      {e.battler}
                    </p>
                  ))}
                </motion.div>
                <motion.div
                  className={`vr-podium__block${isFirst ? " vr-podium__block--first" : ""}`}
                  style={{
                    height,
                    borderColor: meta.color,
                    boxShadow: `0 0 ${isFirst ? 60 : 30}px ${meta.glow}, inset 0 0 40px ${meta.glow.replace(/[\d.]+\)$/, "0.18)")}`,
                    background: `linear-gradient(180deg, ${meta.glow.replace(/[\d.]+\)$/, "0.28)")}, rgba(7,8,13,0.6))`,
                    transformOrigin: "bottom",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="vr-podium__rank" style={{ color: meta.color }}>
                    {meta.short}
                  </span>
                </motion.div>
              </>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

// ── 背景：サイトと同じ暗い地に、動くライトと波線 ───────────────────────────
function Background({ tension, gold }: { tension: number; gold: boolean }) {
  return (
    <div className="vr-bg" aria-hidden>
      <div className={`vr-beam vr-beam--l${tension ? " vr-beam--fast" : ""}`} style={{ opacity: tension === 2 ? 0.9 : 0.55 }} />
      <div className={`vr-beam vr-beam--r${tension ? " vr-beam--fast" : ""}`} style={{ opacity: tension === 2 ? 0.9 : 0.55 }} />
      <div className="vr-glow" style={{ background: gold ? "radial-gradient(ellipse at 50% 60%, rgba(255,209,102,0.22), transparent 60%)" : "radial-gradient(ellipse at 50% 60%, rgba(109,228,245,0.14), transparent 60%)" }} />
      <svg className="vr-waves" viewBox="0 0 1600 900" preserveAspectRatio="none">
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            className="vr-wave"
            style={{ animationDuration: `${9 + i * 1.7}s`, animationDelay: `${-i * 1.3}s`, opacity: 0.05 + (i % 3) * 0.03 }}
            d={`M0 ${620 + i * 34} C 300 ${560 + i * 30}, 500 ${700 + i * 30}, 800 ${630 + i * 32} S 1300 ${560 + i * 34}, 1600 ${640 + i * 30}`}
          />
        ))}
      </svg>
      <div className="vr-grain" />
      <div className="vr-vignette" />
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  position: "relative",
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  background: BG,
  color: FG,
  fontFamily: COND,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const globalStyles = `
  .vr-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
  .vr-glow { position: absolute; inset: 0; transition: background 1.2s ease; }
  .vr-beam {
    position: absolute; top: -30vh; width: 34vw; height: 150vh;
    background: linear-gradient(180deg, rgba(109,228,245,0.32), rgba(109,228,245,0) 75%);
    filter: blur(28px); transform-origin: 50% 0%; transition: opacity 0.8s ease;
    mix-blend-mode: screen;
  }
  .vr-beam--l { left: 8vw; animation: vrSwingL 7s ease-in-out infinite; }
  .vr-beam--r { right: 8vw; animation: vrSwingR 7s ease-in-out infinite; }
  .vr-beam--fast { animation-duration: 1.6s; }
  @keyframes vrSwingL { 0%,100% { transform: rotate(-24deg); } 50% { transform: rotate(10deg); } }
  @keyframes vrSwingR { 0%,100% { transform: rotate(24deg); } 50% { transform: rotate(-10deg); } }
  .vr-waves { position: absolute; inset: 0; width: 100%; height: 100%; }
  .vr-wave { fill: none; stroke: ${CYAN}; stroke-width: 1.4; animation: vrWave 10s ease-in-out infinite alternate; }
  @keyframes vrWave { from { transform: translateY(0); } to { transform: translateY(-40px); } }
  .vr-grain {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(214,230,242,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(214,230,242,0.03) 1px, transparent 1px);
    background-size: 6vh 6vh;
    mask-image: radial-gradient(ellipse at center, black 10%, transparent 75%);
  }
  .vr-vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 45%, ${BG} 100%); }

  .vr-header {
    position: absolute; top: 4vh; left: 4vw; right: 4vw; z-index: 3;
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: baseline;
    font-family: ${MONO}; color: rgba(214,230,242,0.6); font-size: 1.8vh; letter-spacing: 0.4em;
  }
  .vr-header__tag { text-align: right; }
  .vr-header__title { font-family: ${COND}; font-weight: 800; font-size: 3.6vh; letter-spacing: 0.12em; color: ${CYAN}; }

  .vr-status { position: relative; z-index: 2; font-family: ${MONO}; font-size: 3.4vh; letter-spacing: 0.3em; color: rgba(214,230,242,0.7); }

  .vr-center { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; width: 92vw; }
  .vr-kicker { font-family: ${MONO}; font-size: 2.2vh; color: ${CYAN}; margin: 0 0 2vh; }
  .vr-intro-title {
    margin: 0; font-weight: 800; font-size: 17vh; line-height: 0.95; letter-spacing: 0.04em;
    background: linear-gradient(90deg, ${FG}, ${CYAN} 50%, ${FG}); background-size: 200% 100%;
    -webkit-background-clip: text; background-clip: text; color: transparent;
    animation: vrShine 3.5s linear infinite;
  }
  @keyframes vrShine { to { background-position: -200% 0; } }
  .vr-intro-line { width: 46vw; height: 0.4vh; margin: 3.5vh 0; background: linear-gradient(90deg, transparent, ${CYAN}, transparent); }
  .vr-intro-result { margin: 0; font-weight: 700; font-size: 7vh; letter-spacing: 0.6em; color: ${FG}; padding-left: 0.6em; }

  .vr-rank-label { margin: 0 0 3vh; font-weight: 800; font-size: 7vh; letter-spacing: 0.3em; padding-left: 0.3em; display: flex; align-items: center; gap: 2vw; }
  .vr-tie { font-family: ${MONO}; font-size: 2.4vh; letter-spacing: 0.3em; padding: 0.6vh 1.2vw; border: 1px solid currentColor; border-radius: 999px; }
  .vr-shuffle-wrap { height: 22vh; display: flex; align-items: center; justify-content: center; }
  .vr-shuffle { margin: 0; font-weight: 800; letter-spacing: 0.04em; color: ${FG}; filter: blur(1.5px); white-space: nowrap; }
  .vr-bar { width: 40vw; height: 0.6vh; margin-top: 5vh; background: rgba(214,230,242,0.1); border-radius: 999px; overflow: hidden; }
  .vr-bar__fill { width: 100%; height: 100%; transform-origin: left; }

  .vr-flash { position: fixed; inset: -20vh -20vw; z-index: 1; pointer-events: none; }
  .vr-names { display: flex; flex-direction: column; align-items: center; gap: 1vh; }
  .vr-names--tie { flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 2vh 5vw; }
  .vr-name { margin: 0; font-weight: 800; line-height: 1; letter-spacing: 0.03em; white-space: nowrap; }
  .vr-congrats { margin: 4vh 0 0; font-family: ${MONO}; font-size: 3vh; letter-spacing: 0.6em; color: ${FG}; padding-left: 0.6em; }

  .vr-tally { position: absolute; bottom: 4vh; left: 0; right: 0; z-index: 3; display: flex; justify-content: center; gap: 2vw; }
  .vr-tally__item {
    display: flex; align-items: baseline; gap: 1vw; padding: 1vh 1.6vw; border: 1px solid; border-radius: 999px;
    background: rgba(7,8,13,0.6); font-weight: 700; font-size: 3vh; letter-spacing: 0.06em; color: ${FG};
  }
  .vr-tally__item span { font-family: ${MONO}; font-size: 2vh; letter-spacing: 0.2em; }

  .vr-podium { position: relative; z-index: 2; display: flex; align-items: flex-end; justify-content: center; gap: 3vw; width: 90vw; height: 78vh; margin-top: 10vh; }
  .vr-podium__col { flex: 1; max-width: 26vw; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; height: 100%; }
  .vr-podium__names { display: flex; flex-direction: column; align-items: center; gap: 0.6vh; margin-bottom: 2.4vh; }
  .vr-podium__name { margin: 0; font-weight: 800; font-size: 6.4vh; line-height: 1.02; letter-spacing: 0.03em; text-align: center; overflow-wrap: anywhere; }
  .vr-podium__name--first { font-size: 9.5vh; }
  .vr-podium__block {
    position: relative; border: 2px solid; border-bottom: none; border-radius: 1.6vh 1.6vh 0 0;
    display: flex; justify-content: center; padding-top: 2vh;
  }
  .vr-podium__block--first { animation: vrPulse 2.4s ease-in-out infinite; }
  @keyframes vrPulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
  .vr-podium__rank { font-weight: 800; font-size: 8vh; letter-spacing: 0.08em; line-height: 1; }

  @media (prefers-reduced-motion: reduce) {
    .vr-beam, .vr-wave, .vr-intro-title, .vr-podium__block--first { animation: none; }
  }
`;
