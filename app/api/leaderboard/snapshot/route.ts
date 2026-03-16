import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AGENT_CONFIG } from "@/lib/agent-config";

interface HistoryEntry {
  id: string;
  agent_id: string;
  timestamp: string;
  post_id: string | null;
  rank_at_time: number;
  likes_at_time: number;
  posts_at_time: number;
  reasoning: string;
  image_prompt: string | null;
  feed_snapshot: unknown[];
  comments_received: unknown[];
}

function wordOverlapRatio(a: string, b: string): number {
  const words0 = a.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const words1 = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  if (words0.length === 0) return 0;
  const overlap = words0.filter(w => words1.has(w)).length;
  return overlap / words0.length;
}

export async function GET() {
  // 1. Fetch only the configured agents (filters out test/stale registrations)
  const configuredIds = Object.keys(AGENT_CONFIG);
  const { data: agents, error: agentsErr } = await supabase
    .from("agents")
    .select("id, name")
    .in("id", configuredIds);

  if (agentsErr || !agents) {
    console.error("snapshot: failed to fetch agents:", agentsErr?.message);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }

  // Pre-compute UTC day window for daily-status fields
  const nowUtc = new Date();
  const todayUtcMidnight = new Date(Date.UTC(
    nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()
  )).toISOString();

  // 2. Compute stats per agent in parallel
  const agentStats = await Promise.all(
    agents.map(async (agent: { id: string; name: string }) => {
      // All images for this agent
      const { data: imgs } = await supabase
        .from("images")
        .select("id")
        .eq("agent_id", agent.id);

      const imageIds = (imgs ?? []).map((i: { id: string }) => i.id);
      const posts = imageIds.length;

      let likes = 0;
      if (imageIds.length > 0) {
        const { count } = await supabase
          .from("likes")
          .select("id", { count: "exact", head: true })
          .in("image_id", imageIds);
        likes = count ?? 0;
      }

      // Last 5 history entries
      const { data: history } = await supabase
        .from("agent_history")
        .select("*")
        .eq("agent_id", agent.id)
        .order("timestamp", { ascending: false })
        .limit(5);

      // Most recent history entry that actually has a post (skip seed/observe-only rows)
      const lastPostEntry =
        (history ?? []).find((e: HistoryEntry) => e.post_id !== null) ?? null;

      // Today's post count (for daily budget)
      const { count: todayPostCount } = await supabase
        .from("agent_history")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", agent.id)
        .gte("timestamp", todayUtcMidnight)
        .not("post_id", "is", null);

      const hasPostedToday = (todayPostCount ?? 0) > 0;

      return {
        agent_id: agent.id,
        db_name: agent.name,
        posts,
        likes,
        history: (history ?? []) as HistoryEntry[],
        lastPostEntry: lastPostEntry as HistoryEntry | null,
        has_posted_today: hasPostedToday,
      };
    })
  );

  // 3. Sort by likes descending → assign rank
  agentStats.sort((a, b) => b.likes - a.likes);

  // 4. Fetch captions for the most recent actual post of each agent
  const postIds = agentStats
    .map(a => a.lastPostEntry?.post_id)
    .filter((id): id is string => Boolean(id));

  const captionMap: Record<string, string> = {};
  if (postIds.length > 0) {
    const { data: postRows } = await supabase
      .from("images")
      .select("id, caption")
      .in("id", postIds);
    for (const row of (postRows ?? [])) {
      captionMap[row.id] = row.caption;
    }
  }

  // 5. Build response
  const now = new Date().toISOString();

  const result = agentStats.map((a, idx) => {
    const rank = idx + 1;
    const h = a.history;
    const config = AGENT_CONFIG[a.agent_id];

    const rank_delta = h.length >= 2
      ? h[0].rank_at_time - h[1].rank_at_time
      : null;

    const likes_delta = h.length >= 2
      ? h[0].likes_at_time - h[1].likes_at_time
      : null;

    let repeating_strategy: boolean | null = null;
    if (h.length >= 2 && h[0].reasoning && h[1].reasoning) {
      const ratio = wordOverlapRatio(h[0].reasoning, h[1].reasoning);
      repeating_strategy = ratio > 0.6;
    }

    const lpe = a.lastPostEntry;
    const last_post_id = lpe?.post_id ?? null;
    const last_caption = last_post_id ? (captionMap[last_post_id] ?? null) : null;
    const likes_per_post = a.posts > 0
      ? Math.round((a.likes / a.posts) * 10) / 10
      : 0;

    return {
      agent_id: a.agent_id,
      name: config?.name ?? a.db_name ?? "Unknown",
      persona: config?.persona ?? "",
      avatarBg: config?.avatarBg,
      avatarColor: config?.avatarColor,
      barColor: config?.barColor,
      rank,
      likes: a.likes,
      posts: a.posts,
      likes_per_post,
      rank_delta,
      likes_delta,
      repeating_strategy,
      has_posted_today: a.has_posted_today,
      post_budget_remaining: a.has_posted_today ? 0 : 1,
      last_reasoning: lpe?.reasoning ?? null,
      last_image_prompt: lpe?.image_prompt ?? null,
      last_caption,
      last_post_id,
      last_post_at: lpe?.timestamp ?? null,
      history_preview: h.map(entry => ({
        timestamp: entry.timestamp,
        rank_at_time: entry.rank_at_time,
        likes_at_time: entry.likes_at_time,
        reasoning: entry.reasoning,
        image_prompt: entry.image_prompt,
        post_id: entry.post_id,
        feed_snapshot: entry.feed_snapshot,
        comments_received: entry.comments_received,
      })),
    };
  });

  return NextResponse.json({
    agents: result,
    generated_at: now,
  });
}
