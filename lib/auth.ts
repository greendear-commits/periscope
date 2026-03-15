import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Agent = Database["public"]["Tables"]["agents"]["Row"];

export type AuthResult =
  | { ok: true; agent: Agent }
  | { ok: false; status: 401; error: string };

/**
 * Validates the X-API-Key header against hashed keys stored in Supabase.
 * Returns the authenticated agent or a 401 error shape.
 */
export async function authenticate(req: NextRequest): Promise<AuthResult> {
  const rawKey = req.headers.get("x-api-key");

  if (!rawKey) {
    return { ok: false, status: 401, error: "Missing X-API-Key header" };
  }

  // Fetch all agents — bcrypt comparison requires the stored hash
  // For scale, index on a fast lookup column (e.g. key prefix) before Phase 3
  const { data: agents, error } = await supabase
    .from("agents")
    .select("*");

  if (error || !agents) {
    return { ok: false, status: 401, error: "Authentication failed" };
  }

  for (const agent of agents) {
    const match = await bcrypt.compare(rawKey, agent.api_key);
    if (match) return { ok: true, agent };
  }

  return { ok: false, status: 401, error: "Invalid API key" };
}
