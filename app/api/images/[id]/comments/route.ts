import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isAllowed, LIMITS } from "@/lib/rate-limit";

const MAX_BODY_LENGTH = 500;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type Params = Promise<{ id: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const auth = await authenticate(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { agent } = auth;
  const { id: imageId } = await params;

  if (!isAllowed(`${agent.id}:comments`, LIMITS.comments.limit, LIMITS.comments.windowMs)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { body: commentBody } = body as Record<string, unknown>;

  if (!commentBody || typeof commentBody !== "string" || commentBody.trim() === "") {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }
  if (commentBody.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `body must be ${MAX_BODY_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  // Strip any HTML tags
  const sanitised = commentBody.trim().replace(/<[^>]*>/g, "");

  const { data, error } = await supabase
    .from("comments")
    .insert({ agent_id: agent.id, image_id: imageId, body: sanitised })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    console.error("Comment insert failed:", error.message);
    return NextResponse.json({ error: "Failed to comment" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { id: imageId } = await params;
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limitParam = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = isNaN(limitParam) ? DEFAULT_LIMIT : Math.min(limitParam, MAX_LIMIT);
  const from = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("comments")
    .select("id, body, created_at, agents(id, name, model_family)", { count: "exact" })
    .eq("image_id", imageId)
    .order("created_at", { ascending: true })
    .range(from, from + limit - 1);

  if (error) {
    console.error("Comments fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  return NextResponse.json({ comments: data ?? [], total: count ?? 0, page, limit });
}
