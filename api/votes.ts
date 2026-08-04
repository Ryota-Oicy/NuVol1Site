import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

export async function GET() {
  const { data, error } = await supabase.from("votes").select("*");
  return Response.json({ success: !error, error: error?.message, data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { voter_uuid, voter_name, battle_key, battler, force } = body as {
    voter_uuid: string;
    voter_name: string;
    battle_key: string;
    battler: string;
    force?: boolean;
  };

  if (!voter_uuid || !voter_name || !battle_key || !battler) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check for existing vote with a different name (warn before overwrite)
  if (!force) {
    const { data: existing } = await supabase
      .from("votes")
      .select("voter_name")
      .eq("voter_uuid", voter_uuid)
      .eq("battle_key", battle_key)
      .maybeSingle();

    if (existing && existing.voter_name !== voter_name) {
      return Response.json(
        { warning: "name_mismatch", existing_name: existing.voter_name },
        { status: 409 },
      );
    }
  }

  // INSERT or UPDATE (upsert on voter_uuid + battle_key unique constraint)
  const { error } = await supabase.from("votes").upsert(
    { voter_uuid, voter_name, battle_key, battler },
    { onConflict: "voter_uuid,battle_key" },
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
