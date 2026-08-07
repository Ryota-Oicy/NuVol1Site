import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

type VoteResult = {
  battler: string;
  count: number;
};

type RankedResult = VoteResult & {
  rank: number; // 標準競技順位（同票は同じ順位、次の順位はその分スキップ）
  isTie: boolean;
};

// ── 演出タイミング（すべてここで調整できます。単位はms） ──────────────
const PRE_ROLL_MS = 1400; // 発表が始まるまでの"タメ"
const ANNOUNCE_MS = 2200; // 「n位!」を画面に見せておく時間
const GAP_AFTER_REVEAL_MS = 1800; // 3位・2位発表後、次に移るまでの間
const GAP_AFTER_FIRST_MS = 2600; // 1位発表（紙吹雪）後、残りを出すまでの間
const TIE_STAGGER_S = 0.35; // 同着メンバーが並んで出てくる間隔（秒）
// ────────────────────────────────────────────────────────────

function computeRanking(votes: VoteResult[]): RankedResult[] {
  const sorted = [...votes].sort((a, b) => b.count - a.count);

  const withRank: Omit<RankedResult, "isTie">[] = [];
  let lastCount: number | null = null;
  let lastRank = 0;

  sorted.forEach((v, i) => {
    const rank = v.count === lastCount ? lastRank : i + 1;
    withRank.push({ ...v, rank });
    lastCount = v.count;
    lastRank = rank;
  });

  const countByRank = withRank.reduce<Record<number, number>>((acc, r) => {
    acc[r.rank] = (acc[r.rank] ?? 0) + 1;
    return acc;
  }, {});

  return withRank.map((r) => ({ ...r, isTie: countByRank[r.rank] > 1 }));
}

const RANK_META: Record<
  number,
  {
    label: string;
    medal: string;
    accent: string;
    accentSoft: string;
    glow: string;
  }
> = {
  1: {
    label: "1 位",
    medal: "🥇",
    accent: "#FFD166",
    accentSoft: "rgba(255,209,102,0.16)",
    glow: "rgba(255,209,102,0.65)",
  },
  2: {
    label: "2 位",
    medal: "🥈",
    accent: "#CBD5E1",
    accentSoft: "rgba(203,213,225,0.12)",
    glow: "rgba(203,213,225,0.4)",
  },
  3: {
    label: "3 位",
    medal: "🥉",
    accent: "#E39A5B",
    accentSoft: "rgba(227,154,91,0.12)",
    glow: "rgba(227,154,91,0.4)",
  },
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fireConfetti() {
  const end = Date.now() + 2600;
  const colors = ["#FFD166", "#00E5FF", "#FF3EC9", "#ffffff"];

  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 65, origin: { x: 0 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 65, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({ particleCount: 140, spread: 100, origin: { y: 0.4 }, colors });
}

export default function VoteResults() {
  const [votes, setVotes] = useState<VoteResult[]>([]);
  const [loading, setLoading] = useState(true);

  const [started, setStarted] = useState(false);
  const [revealedRanks, setRevealedRanks] = useState<Set<number>>(new Set());
  const [showRest, setShowRest] = useState(false);
  const [announcing, setAnnouncing] = useState<number | null>(null);

  const battleKey = new URLSearchParams(window.location.search).get("battle");

  useEffect(() => {
    fetch(`/api/vote-results?battle=${battleKey}`)
      .then((res) => res.json())
      .then((data: VoteResult[]) => {
        setVotes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ranking = useMemo(() => computeRanking(votes), [votes]);

  // 3位グループ→2位グループ→1位グループの順（実際に存在するものだけ）
  const topGroups = useMemo(() => {
    return [3, 2, 1]
      .map((rank) => ranking.filter((r) => r.rank === rank))
      .filter((group) => group.length > 0);
  }, [ranking]);

  const rest = useMemo(() => ranking.filter((r) => r.rank > 3), [ranking]);

  useEffect(() => {
    if (loading || topGroups.length === 0) return;
    let cancelled = false;

    async function run() {
      await wait(PRE_ROLL_MS);
      if (cancelled) return;
      setStarted(true);

      for (const group of topGroups) {
        if (cancelled) return;
        const rank = group[0].rank;

        setAnnouncing(rank);
        await wait(ANNOUNCE_MS);
        if (cancelled) return;

        setRevealedRanks((prev) => new Set(prev).add(rank));
        setAnnouncing(null);

        if (rank === 1) {
          fireConfetti();
          await wait(GAP_AFTER_FIRST_MS);
        } else {
          await wait(GAP_AFTER_REVEAL_MS);
        }
      }
      if (!cancelled) setShowRest(true);
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, topGroups.length]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <BackgroundFX />
        <motion.p
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          style={{ fontSize: 24, letterSpacing: 3, color: "#9AA5B1" }}
        >
          集計中 …
        </motion.p>
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div style={containerStyle}>
        <BackgroundFX />
        <p style={{ fontSize: 28, color: "#6B7280" }}>投票がありませんでした</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>{globalStyles}</style>
      <BackgroundFX />

      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{ textAlign: "center", marginBottom: 56, zIndex: 2 }}
      >
        <p
          style={{
            fontSize: 14,
            letterSpacing: 8,
            color: "#5EE9FF",
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          VOTE RESULT
        </p>
        <h1 className="gradient-title" style={{ fontSize: 58, margin: 0 }}>
          {battleKey?.toUpperCase()} BATTLE
        </h1>
      </motion.div>

      {/* 開始前の「タメ」 */}
      <AnimatePresence>
        {!started && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: PRE_ROLL_MS / 1000, times: [0, 0.3, 0.75, 1] }}
            style={{
              fontSize: 20,
              letterSpacing: 6,
              color: "#9AA5B1",
              zIndex: 2,
            }}
          >
            結果発表まで、しばらくお待ちください …
          </motion.p>
        )}
      </AnimatePresence>

      {/* 「n位!」フルスクリーン演出 */}
      <AnimatePresence>
        {announcing && (
          <motion.div
            key={`announce-${announcing}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              pointerEvents: "none",
              background: "rgba(6,8,14,0.72)",
              backdropFilter: "blur(6px)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.4, filter: "blur(12px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.15, filter: "blur(6px)" }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize: 150,
                fontWeight: 900,
                letterSpacing: 6,
                color: RANK_META[announcing]?.accent ?? "#fff",
                textShadow: `0 0 60px ${RANK_META[announcing]?.glow ?? "rgba(255,255,255,0.6)"}`,
              }}
            >
              {RANK_META[announcing]?.label}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          width: "min(880px, 86%)",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          zIndex: 2,
        }}
      >
        {[1, 2, 3].map((rank) => {
          const group = ranking.filter((r) => r.rank === rank);
          if (group.length === 0) return null;
          const meta = RANK_META[rank];
          const revealed = revealedRanks.has(rank);
          const isFirst = rank === 1;

          return (
            <AnimatePresence key={rank}>
              {revealed &&
                group.map((entry, idx) => (
                  <motion.div
                    key={entry.battler}
                    initial={{ opacity: 0, y: 40, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: isFirst ? 1.04 : 1 }}
                    transition={{
                      duration: 0.9,
                      delay: idx * TIE_STAGGER_S,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`rank-card${isFirst ? " rank-card--first" : ""}`}
                    style={{
                      borderColor: meta.accent,
                      background: `linear-gradient(120deg, ${meta.accentSoft}, rgba(255,255,255,0.03))`,
                      boxShadow: isFirst
                        ? `0 0 50px ${meta.glow}, inset 0 0 0 1px ${meta.accentSoft}`
                        : `0 8px 30px rgba(0,0,0,0.35)`,
                    }}
                  >
                    <div className="rank-card__left">
                      <div
                        className="rank-badge"
                        style={{
                          borderColor: meta.accent,
                          color: meta.accent,
                          boxShadow: `0 0 20px ${meta.glow}`,
                        }}
                      >
                        <span style={{ fontSize: isFirst ? 30 : 24 }}>{meta.medal}</span>
                      </div>
                      <div>
                        <p
                          className="rank-card__name"
                          style={{ fontSize: isFirst ? 40 : 30 }}
                        >
                          {entry.battler}
                        </p>
                        <p className="rank-card__rank" style={{ color: meta.accent }}>
                          {meta.label}
                          {entry.isTie && <span className="tie-badge">SAME&nbsp;VOTE</span>}
                        </p>
                      </div>
                    </div>
                    <p
                      className="rank-card__count"
                      style={{ fontSize: isFirst ? 44 : 32, color: meta.accent }}
                    >
                      {entry.count}
                      <span className="rank-card__unit">票</span>
                    </p>
                  </motion.div>
                ))}
            </AnimatePresence>
          );
        })}

        {/* 4位以下 */}
        <AnimatePresence>
          {showRest && rest.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}
            >
              {rest.map((entry, idx) => (
                <motion.div
                  key={entry.battler}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="rest-row"
                >
                  <span>
                    {entry.rank}位　{entry.battler}
                    {entry.isTie && <span className="tie-badge tie-badge--muted">SAME</span>}
                  </span>
                  <span className="rest-row__count">{entry.count}票</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BackgroundFX() {
  return (
    <>
      <div className="bg-spotlight" />
      <div className="bg-grid" />
      <div className="bg-vignette" />
    </>
  );
}

const containerStyle: React.CSSProperties = {
  background: "#05060A",
  color: "#F5F7FA",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  fontFamily:
    '"Hiragino Sans", "Helvetica Neue", Arial, sans-serif',
  overflow: "hidden",
  position: "relative",
};

const globalStyles = `
  .gradient-title {
    font-weight: 900;
    letter-spacing: 3px;
    background: linear-gradient(90deg, #5EE9FF, #FF3EC9 55%, #FFD166);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: gradientShift 6s ease-in-out infinite;
  }

  @keyframes gradientShift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  .bg-spotlight {
    position: absolute;
    inset: -20%;
    background: conic-gradient(from 0deg, rgba(94,233,255,0.08), rgba(255,62,201,0.08), rgba(255,209,102,0.08), rgba(94,233,255,0.08));
    animation: spin 26s linear infinite;
    filter: blur(60px);
    z-index: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .bg-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);
    z-index: 0;
  }

  .bg-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, #05060A 92%);
    z-index: 1;
  }

  .rank-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 26px 34px;
    border-radius: 20px;
    border: 1.5px solid;
    backdrop-filter: blur(14px);
  }

  .rank-card--first {
    animation: firstPulse 2.6s ease-in-out infinite;
  }

  @keyframes firstPulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.12); }
  }

  .rank-card__left {
    display: flex;
    align-items: center;
    gap: 22px;
  }

  .rank-badge {
    width: 60px;
    height: 60px;
    min-width: 60px;
    border-radius: 999px;
    border: 1.5px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.03);
  }

  .rank-card__name {
    font-weight: 800;
    letter-spacing: 1px;
    margin: 0 0 4px 0;
  }

  .rank-card__rank {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 3px;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .rank-card__count {
    font-weight: 900;
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .rank-card__unit {
    font-size: 16px;
    font-weight: 500;
    color: #9AA5B1;
  }

  .tie-badge {
    font-size: 11px;
    letter-spacing: 2px;
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    color: #E5E9F0;
  }

  .tie-badge--muted {
    margin-left: 8px;
    background: rgba(255,255,255,0.05);
    color: #6B7280;
  }

  .rest-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 34px;
    font-size: 20px;
    color: #7C8797;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .rest-row__count {
    color: #9AA5B1;
    font-weight: 600;
  }
`;