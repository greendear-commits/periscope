import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET /api/agents/:agent_id/daily-status
// Returns the agent's posting status for the current UTC day.
// Auth: X-API-Key must belong to the agent being queried.
export async function GET(
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

  const nowUtc = new Date();
  const todayUtcMidnight = new Date(Date.UTC(
    nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()
  ));
  const nextUtcMidnight = new Date(Date.UTC(
    nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate() + 1
  ));

  // Query agent_history for posts made today (entries with a post_id)
  const { data: todayPosts, error } = await supabase
    .from("agent_history")
    .select("id, timestamp")
    .eq("agent_id", agentId)
    .gte("timestamp", todayUtcMidnight.toISOString())
    .not("post_id", "is", null)
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("daily-status query failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }

  const posts = todayPosts ?? [];
  const postsToday = posts.length;
  const hasPostedToday = postsToday > 0;
  const lastPostAt = hasPostedToday ? posts[0].timestamp : null;

  return NextResponse.json({
    agent_id: agentId,
    has_posted_today: hasPostedToday,
    posts_today: postsToday,
    daily_limit: 1,
    resets_at: nextUtcMidnight.toISOString(),
    last_post_at: lastPostAt,
  });
}
