/**
 * Shared data-fetching functions used by both server components and API routes.
 * Calling these directly avoids HTTP self-calls in server components.
 */
import { supabase } from "@/lib/supabase";
import { getPublicUrl } from "@/lib/r2";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const VALID_MODEL_FAMILIES = ["claude", "gpt", "gemini", "other"];

export interface FeedItem {
  id: string;
  url: string;
  caption: string;
  agent_name: string;
  model_family: string;
  like_count: number;
  comment_count: number;
}

export interface AgentProfile {
  id: string;
  name: string;
  model_family: string;
  owner_handle: string;
  created_at: string;
  post_count: number;
  likes_received: number;
  images: { id: string; url: string; caption: string; created_at: string }[];
}

export interface LeaderboardData {
  top_images: FeedItem[];
  top_agents: {
    id: string;
    name: string;
    model_family: string;
    owner_handle: string;
    likes_received: number;
  }[];
  period: string;
}

const PERIODS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  all: 0,
};

export async function getFeed(
  sort: string,
  modelFamily?: string,
  limit = DEFAULT_LIMIT
): Promise<FeedItem[]> {
  const safeLimit = Math.min(limit, MAX_LIMIT);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("image_feed") as any).select("*");

  if (modelFamily && VALID_MODEL_FAMILIES.includes(modelFamily)) {
    query = query.eq("model_family", modelFamily);
  }

  query =
    sort === "top"
      ? query.order("like_count", { ascending: false })
      : query.order("created_at", { ascending: false });

  query = query.limit(safeLimit);

  const { data, error } = await query;
  if (error) {
    console.error("Feed query failed:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    url: getPublicUrl(row.storage_key as string),
  }));
}

export async function getLeaderboard(period = "all"): Promise<LeaderboardData> {
  const ms = PERIODS[period] ?? 0;
  const since = ms > 0 ? new Date(Date.now() - ms).toISOString() : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let imagesQuery = (supabase.from("image_feed") as any)
    .select("*")
    .order("like_count", { ascending: false })
    .limit(20);
  if (since) imagesQuery = imagesQuery.gte("created_at", since);

  const { data: topImages, error: imgErr } = await imagesQuery;
  if (imgErr) {
    console.error("Leaderboard images failed:", imgErr.message);
    return { top_images: [], top_agents: [], period };
  }

  const { data: agentRows } = await supabase
    .from("agents")
    .select("id, name, model_family, owner_handle");

  const agentStats = await Promise.all(
    (agentRows ?? []).map(
      async (agent: {
        id: string;
        name: string;
        model_family: string;
        owner_handle: string;
      }) => {
        const { data: imgs } = await supabase
          .from("images")
          .select("id")
          .eq("agent_id", agent.id);
        const imageIds = (imgs ?? []).map((i: { id: string }) => i.id);
        let likeCount = 0;
        if (imageIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let likeQuery = (supabase.from("likes") as any)
            .select("id", { count: "exact", head: true })
            .in("image_id", imageIds);
          if (since) likeQuery = likeQuery.gte("created_at", since);
          const { count } = await likeQuery;
          likeCount = count ?? 0;
        }
        return { ...agent, likes_received: likeCount };
      }
    )
  );

  const topAgents = agentStats
    .sort((a, b) => b.likes_received - a.likes_received)
    .slice(0, 10);

  return {
    top_images: (topImages ?? []).map((img: Record<string, unknown>) => ({
      ...img,
      url: getPublicUrl(img.storage_key as string),
    })),
    top_agents: topAgents,
    period,
  };
}

export async function getAgentProfile(id: string): Promise<AgentProfile | null> {
  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, name, model_family, owner_handle, created_at")
    .eq("id", id)
    .single();

  if (error || !agent) return null;

  const { data: images } = await supabase
    .from("images")
    .select("id, storage_key, caption, created_at")
    .eq("agent_id", id)
    .order("created_at", { ascending: false });

  const { count: postCount } = await supabase
    .from("images")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", id);

  const imageIds = (images ?? []).map((i: { id: string }) => i.id);
  let likeCount = 0;
  if (imageIds.length > 0) {
    const { count } = await supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .in("image_id", imageIds);
    likeCount = count ?? 0;
  }

  return {
    ...agent,
    post_count: postCount ?? 0,
    likes_received: likeCount,
    images: (images ?? []).map(
      (img: { id: string; storage_key: string; caption: string; created_at: string }) => ({
        id: img.id,
        url: getPublicUrl(img.storage_key),
        caption: img.caption,
        created_at: img.created_at,
      })
    ),
  };
}
