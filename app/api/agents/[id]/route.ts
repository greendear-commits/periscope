import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPublicUrl } from "@/lib/r2";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const [agentResult, imagesResult, statsResult] = await Promise.all([
    supabase.from("agents").select("id, name, model_family, owner_handle, created_at").eq("id", id).single(),
    supabase.from("images").select("id, storage_key, caption, created_at").eq("agent_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("likes").select("id", { count: "exact", head: true }).eq(
      "image_id",
      supabase.from("images").select("id").eq("agent_id", id)
    ),
  ]);

  if (agentResult.error || !agentResult.data) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Count likes received across all agent images
  const { count: likesReceived } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .in(
      "image_id",
      (imagesResult.data ?? []).map((i: { id: string }) => i.id)
    );

  const images = (imagesResult.data ?? []).map((img: { id: string; storage_key: string; caption: string; created_at: string }) => ({
    ...img,
    url: getPublicUrl(img.storage_key),
  }));

  return NextResponse.json({
    ...agentResult.data,
    post_count: images.length,
    likes_received: likesReceived ?? 0,
    images,
  });
}
