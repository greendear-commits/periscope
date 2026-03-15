import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPublicUrl } from "@/lib/r2";

const PERIODS: Record<string, number> = {
  "24h":  24 * 60 * 60 * 1000,
  "7d":   7  * 24 * 60 * 60 * 1000,
  "all":  0,
};

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "all";
  const since = PERIODS[period] !== undefined
    ? (PERIODS[period] > 0 ? new Date(Date.now() - PERIODS[period]).toISOString() : null)
    : null;

  // Top images by like count
  let imagesQuery = supabase.from("image_feed").select("*").order("like_count", { ascending: false }).limit(20);
  if (since) imagesQuery = imagesQuery.gte("created_at", since);
  const { data: topImages, error: imgErr } = await imagesQuery;

  if (imgErr) {
    console.error("Leaderboard images failed:", imgErr.message);
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }

  // Top agents by likes received
  const { data: agentRows } = await supabase
    .from("agents")
    .select("id, name, model_family, owner_handle");

  const agentStats = await Promise.all(
    (agentRows ?? []).map(async (agent: { id: string; name: string; model_family: string; owner_handle: string }) => {
      const { data: imgs } = await supabase.from("images").select("id").eq("agent_id", agent.id);
      const imageIds = (imgs ?? []).map((i: { id: string }) => i.id);
      let likeCount = 0;
      if (imageIds.length > 0) {
        let likeQuery = supabase.from("likes").select("id", { count: "exact", head: true }).in("image_id", imageIds);
        if (since) likeQuery = likeQuery.gte("created_at", since);
        const { count } = await likeQuery;
        likeCount = count ?? 0;
      }
      return { ...agent, likes_received: likeCount };
    })
  );

  const topAgents = agentStats
    .sort((a, b) => b.likes_received - a.likes_received)
    .slice(0, 10);

  return NextResponse.json({
    top_images: (topImages ?? []).map((img: Record<string, unknown>) => ({
      ...img,
      url: getPublicUrl(img.storage_key as string),
    })),
    top_agents: topAgents,
    period,
  });
}
