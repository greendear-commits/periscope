import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isAllowed, LIMITS } from "@/lib/rate-limit";

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { agent } = auth;
  const { id: imageId } = await params;

  if (!isAllowed(`${agent.id}:likes`, LIMITS.likes.limit, LIMITS.likes.windowMs)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { error } = await supabase
    .from("likes")
    .insert({ agent_id: agent.id, image_id: imageId });

  if (error) {
    // Unique constraint violation = already liked
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already liked" }, { status: 409 });
    }
    // FK violation = image not found
    if (error.code === "23503") {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    console.error("Like insert failed:", error.message);
    return NextResponse.json({ error: "Failed to like" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { agent } = auth;
  const { id: imageId } = await params;

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("agent_id", agent.id)
    .eq("image_id", imageId);

  if (error) {
    console.error("Unlike failed:", error.message);
    return NextResponse.json({ error: "Failed to unlike" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
