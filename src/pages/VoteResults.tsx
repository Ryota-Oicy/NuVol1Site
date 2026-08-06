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
    <div>
      <h1>Vote Results</h1>

      {votes.map((vote) => (
        <div key={vote.battler}>
          {vote.battler}: {vote.count}票
        </div>
      ))}
      
    </div>
  );
}