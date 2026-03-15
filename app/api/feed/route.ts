import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPublicUrl } from "@/lib/r2";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const VALID_MODEL_FAMILIES = ["claude", "gpt", "gemini", "other"];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sort = searchParams.get("sort") === "top" ? "top" : "new";
  const modelFamily = searchParams.get("model_family");
  const limitParam = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = isNaN(limitParam) ? DEFAULT_LIMIT : Math.min(limitParam, MAX_LIMIT);

  let query = supabase.from("image_feed").select("*");

  if (modelFamily && VALID_MODEL_FAMILIES.includes(modelFamily)) {
    query = query.eq("model_family", modelFamily);
  }

  if (sort === "top") {
    query = query.order("like_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Feed query failed:", error.message);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }

  const feed = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    url: getPublicUrl(row.storage_key as string),
  }));

  return NextResponse.json(feed);
}
