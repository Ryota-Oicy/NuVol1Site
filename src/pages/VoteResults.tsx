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

// 「n位!」の大表示を出しておく時間
const ANNOUNCE_MS = 900;
// 大表示が消えてから次の順位発表に移るまでの間（1位以外）
const GAP_MS = 700;

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
  { label: string; medal: string; color: string; glow: string }
> = {
  1: { label: "1位", medal: "🥇", color: "#FFD700", glow: "rgba(255,215,0,0.6)" },
  2: { label: "2位", medal: "🥈", color: "#C0C0C0", glow: "rgba(192,192,192,0.45)" },
  3: { label: "3位", medal: "🥉", color: "#CD7F32", glow: "rgba(205,127,50,0.4)" },
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fireConfetti() {
  const end = Date.now() + 2200;

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0 },
      colors: ["#FFD700", "#ffffff", "#FFB800"],
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1 },
      colors: ["#FFD700", "#ffffff", "#FFB800"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.4 },
    colors: ["#FFD700", "#ffffff", "#FFB800"],
  });
}

export default function VoteResults() {
  const [votes, setVotes] = useState<VoteResult[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 3位グループ→2位グループ→1位グループの順（存在するものだけ）
  const topGroups = useMemo(() => {
    return [3, 2, 1]
      .map((rank) => ranking.filter((r) => r.rank === rank))
      .filter((group) => group.length > 0);
  }, [ranking]);

  const rest = useMemo(() => ranking.filter((r) => r.rank > 3), [ranking]);

  // 3位→2位→1位の順に演出しながら公開していく
  useEffect(() => {
    if (loading || topGroups.length === 0) return;
    let cancelled = false;

    async function run() {
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
          await wait(600);
        } else {
          await wait(GAP_MS);
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
        <motion.p
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
          style={{ fontSize: 28 }}
        >
          集計中…
        </motion.p>
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div style={containerStyle}>
        <p style={{ fontSize: 32, color: "#888" }}>投票がありませんでした</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>{pulseKeyframes}</style>

      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ fontSize: 56, marginBottom: 60, letterSpacing: 4 }}
      >
        {battleKey?.toUpperCase()} BATTLE
      </motion.h1>

      {/* 「n位!」の大フラッシュ演出 */}
      <AnimatePresence>
        {announcing && (
          <motion.div
            key={`announce-${announcing}`}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: [0.3, 1.3, 1] }}
            exit={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 140,
              fontWeight: 900,
              color: RANK_META[announcing]?.color ?? "#fff",
              textShadow: `0 0 40px ${RANK_META[announcing]?.glow ?? "rgba(255,255,255,0.6)"}`,
              zIndex: 50,
              pointerEvents: "none",
              background: "rgba(0,0,0,0.35)",
            }}
          >
            {RANK_META[announcing]?.label}！
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          width: "70%",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* 表示位置は常に1位→2位→3位の順。中身は revealedRanks に応じて出現 */}
        {[1, 2, 3].map((rank) => {
          const group = ranking.filter((r) => r.rank === rank);
          if (group.length === 0) return null;
          const meta = RANK_META[rank];
          const revealed = revealedRanks.has(rank);

          return (
            <AnimatePresence key={rank}>
              {revealed &&
                group.map((entry, idx) => (
                  <motion.div
                    key={entry.battler}
                    initial={{ opacity: 0, x: -80, scale: 0.85 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: idx * 0.15, ease: "easeOut" }}
                    className={rank === 1 ? "rank-pulse" : undefined}
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: rank === 1 ? 50 : 42,
                      fontWeight: rank === 1 ? 800 : 500,
                      padding: "25px 40px",
                      borderRadius: 12,
                      border: `2px solid ${meta.color}`,
                      background:
                        rank === 1
                          ? "linear-gradient(90deg, rgba(255,215,0,0.14), rgba(255,215,0,0.02))"
                          : "rgba(255,255,255,0.03)",
                      boxShadow: rank === 1 ? `0 0 25px ${meta.glow}` : "none",
                      marginBottom: idx === group.length - 1 ? 0 : 10,
                    }}
                  >
                    <span>
                      {meta.medal} {entry.battler}
                      {entry.isTie && (
                        <span style={{ fontSize: 20, marginLeft: 12, color: "#aaa" }}>
                          （同票）
                        </span>
                      )}
                    </span>
                    <span>{entry.count}票</span>
                  </motion.div>
                ))}
            </AnimatePresence>
          );
        })}

        {/* 4位以下はまとめて後から表示 */}
        <AnimatePresence>
          {showRest &&
            rest.map((entry, idx) => (
              <motion.div
                key={entry.battler}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 28,
                  color: "#aaa",
                  padding: "14px 40px",
                  borderBottom: "1px solid #333",
                }}
              >
                <span>
                  {entry.rank}位 {entry.battler}
                  {entry.isTie && <span style={{ fontSize: 16, marginLeft: 8 }}>（同票）</span>}
                </span>
                <span>{entry.count}票</span>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: "#111",
  color: "#fff",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "sans-serif",
  overflow: "hidden",
  position: "relative",
};

// 1位カードだけ、公開後もじんわり光り続けるパルス演出
const pulseKeyframes = `
@keyframes rankPulseGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.4); }
  50% { box-shadow: 0 0 45px rgba(255,215,0,0.85); }
}
.rank-pulse {
  animation: rankPulseGlow 2.2s ease-in-out infinite;
}
`;