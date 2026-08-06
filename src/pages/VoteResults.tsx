import { useEffect, useState } from "react";

type VoteResult = {
  battler: string;
  count: number;
};

export default function VoteResults() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const battleKey = new URLSearchParams(
    window.location.search,
  ).get("battle");

  useEffect(() => {
    fetch(`/api/vote-results?battle=${battleKey}`)
      .then((res) => res.json())
      .then((data) => {
        setVotes(data);
      });
  }, []);

  return (
    <div
      style={{
        background: "#111",
        color: "#fff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: 56, marginBottom: 60 }}>
        {battleKey?.toUpperCase()} BATTLE
      </h1>

      {ranking.map((vote, index) => {
        const medal =
          index === 0
            ? "🥇"
            : index === 1
              ? "🥈"
              : index === 2
                ? "🥉"
                : "";

        return (
          <div
            key={vote.battler}
            style={{
              width: "70%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 42,
              padding: "25px 40px",
              marginBottom: 20,
              borderBottom: "2px solid #444",
            }}
          >
            <span>
              {medal} {vote.battler}
            </span>
            <span>{vote.count}票</span>
          </div>
        );
      })}
    </div>
  );
}