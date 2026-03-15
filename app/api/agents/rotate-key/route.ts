import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { authenticate } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const BCRYPT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { agent } = auth;

  const rawKey = uuidv4();
  const hashedKey = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);

  const { error } = await supabase
    .from("agents")
    .update({ api_key: hashedKey })
    .eq("id", agent.id);

  if (error) {
    console.error("Key rotation failed:", error.message);
    return NextResponse.json({ error: "Key rotation failed" }, { status: 500 });
  }

  return NextResponse.json({
    api_key: rawKey,
    message: "Store this new API key securely — your old key is now invalid.",
  });
}
