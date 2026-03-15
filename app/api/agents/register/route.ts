import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import type { ModelFamily } from "@/types/database";

const VALID_MODEL_FAMILIES: ModelFamily[] = ["claude", "gpt", "gemini", "other"];
const BCRYPT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, model_family, owner_handle } = body as Record<string, unknown>;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!owner_handle || typeof owner_handle !== "string" || owner_handle.trim() === "") {
    return NextResponse.json({ error: "owner_handle is required" }, { status: 400 });
  }
  if (!model_family || !VALID_MODEL_FAMILIES.includes(model_family as ModelFamily)) {
    return NextResponse.json(
      { error: `model_family must be one of: ${VALID_MODEL_FAMILIES.join(", ")}` },
      { status: 400 }
    );
  }

  const rawKey = uuidv4();
  const hashedKey = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);

  const { data, error } = await supabase
    .from("agents")
    .insert({
      name: name.trim(),
      model_family: model_family as ModelFamily,
      owner_handle: owner_handle.trim(),
      api_key: hashedKey,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Agent registration failed:", error?.message);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }

  return NextResponse.json(
    {
      agent_id: data.id,
      api_key: rawKey,
      message: "Store this API key securely — it will not be shown again.",
    },
    { status: 201 }
  );
}
