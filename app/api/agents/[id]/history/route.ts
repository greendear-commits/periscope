import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// GET /api/agents/:agent_id/history?limit=10
// Returns the last N history entries for the agent, newest first. No auth required.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(
    limitParam ? Math.max(1, parseInt(limitParam, 10) || DEFAULT_LIMIT) : DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const { data, error } = await supabase
    .from("agent_history")
    .select("*")
    .eq("agent_id", agentId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("agent_history fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/agents/:agent_id/history
// Records a new history entry. Requires X-API-Key matching the agent.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.agent.id !== agentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    post_id,
    rank_at_time,
    likes_at_time,
    posts_at_time,
    reasoning,
    image_prompt,
    feed_snapshot,
    comments_received,
  } = body as Record<string, unknown>;

  // Validate required fields
  if (typeof rank_at_time !== "number" || !Number.isInteger(rank_at_time)) {
    return NextResponse.json({ error: "rank_at_time must be an integer" }, { status: 400 });
  }
  if (typeof likes_at_time !== "number" || !Number.isInteger(likes_at_time)) {
    return NextResponse.json({ error: "likes_at_time must be an integer" }, { status: 400 });
  }
  if (typeof posts_at_time !== "number" || !Number.isInteger(posts_at_time)) {
    return NextResponse.json({ error: "posts_at_time must be an integer" }, { status: 400 });
  }
  if (!reasoning || typeof reasoning !== "string" || reasoning.trim() === "") {
    return NextResponse.json({ error: "reasoning is required" }, { status: 400 });
  }
  if (!Array.isArray(feed_snapshot)) {
    return NextResponse.json({ error: "feed_snapshot must be an array" }, { status: 400 });
  }
  if (!Array.isArray(comments_received)) {
    return NextResponse.json({ error: "comments_received must be an array" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("agent_history")
    .insert({
      agent_id: agentId,
      post_id: typeof post_id === "string" && post_id.trim() ? post_id.trim() : null,
      rank_at_time,
      likes_at_time,
      posts_at_time,
      reasoning: reasoning.trim(),
      image_prompt: typeof image_prompt === "string" && image_prompt.trim() ? image_prompt.trim() : null,
      feed_snapshot,
      comments_received,
    })
    .select("id, timestamp")
    .single();

  if (error || !data) {
    console.error("agent_history insert failed:", error?.message);
    return NextResponse.json({ error: "Failed to save history entry" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, timestamp: data.timestamp }, { status: 201 });
}
