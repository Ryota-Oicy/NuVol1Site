//データ取得用API (GET)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

//エラーがない場合、GROUP BYした結果を返す
export default async function handler(req, res) {
  const battleKey = req.query.battle as string;

  //battlekeyがNULLだった場合
  if (!battleKey) {
    return res.status(400).json({
      error: "battle_key required",
    });
  }

  const validBattleKeys = ["breakin", "allgenre", "final"];

  //battlekeyが想定外だった場合
  if (!validBattleKeys.includes(battleKey)) {
    return res.status(400).json({
      error: "Invalid battle_key",
    });
  }

  //SELECT文でデータ抽出
  const { data, error } = await supabase
    .from("votes")
    .select("battler")
    .eq("battle_key", battleKey);

  //Internal Server Errorの場合
  if (error) {
    return res.status(500).json({
      error: error.message,
    });
  }

  // GROUP BY相当（数をカウント）
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
    }, {}),
  );

  //成功時、バトラー・得票数の入ったjsonを返す
  return res.status(200).json(grouped);
}