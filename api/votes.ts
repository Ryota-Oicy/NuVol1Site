/// <reference types="node" />

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  const { data, error } = await supabase
    .from("votes")
    .select("*");

  return Response.json({
    success: !error,
    error: error?.message,
    data,
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const { error } = await supabase.from("votes").insert(body);

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return Response.json({
    success: true,
  });
}