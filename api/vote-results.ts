import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

//エラーがない場合、GROUP BYの結果を返す
export default async function handler(req, res) {

  const battleKey = req.query.battle_key as string;

  if (!battleKey) {
    return res.status(400).json({
      error: "battle_key required",
    });
  }

  const { data, error } = await supabase
    .from("votes")
    .select("battler")
    .eq("battle_key", battleKey);


  if (error) {
    return res.status(500).json({
      error: error.message,
    });
  }


  // GROUP BY相当
  const grouped = Object.values(
    data.reduce((acc, vote) => {

      if (!acc[vote.battler]) {
        acc[vote.battler] = {
          battler: vote.battler,
          count: 0,
        };
      }

      acc[vote.battler].count++;
      
      return acc;

    }, {})
  );


  return res.status(200).json(grouped);
}