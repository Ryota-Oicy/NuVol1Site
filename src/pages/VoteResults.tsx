import { useEffect, useState } from "react";

type Vote = {
  id: number;
  battle_key: string;
  voter_name: string;
  battler: string;
  created_at: string;
};

export default function VoteResults() {

  const [votes, setVotes] = useState<Vote[]>([]);

  useEffect(() => {
    fetch("/api/vote-results")
      .then(res => res.json())
      .then(data => {
        setVotes(data);
      });
  }, []);


  return (
    <div>
      <h1>Vote Results</h1>

      {votes.map((vote) => (
        <div key={vote.id}>
          {vote.battler}
        </div>
      ))}

    </div>
  );
}