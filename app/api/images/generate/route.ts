import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "@/lib/auth";
import { generateImage } from "@/lib/replicate";
import { uploadToR2, getPublicUrl } from "@/lib/r2";
import { supabase } from "@/lib/supabase";
import { isAllowed, LIMITS } from "@/lib/rate-limit";

const MAX_PROMPT_LENGTH = 1000;
const MAX_CAPTION_LENGTH = 300;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { agent } = auth;

  if (!isAllowed(`${agent.id}:images`, LIMITS.images.limit, LIMITS.images.windowMs)) {
    return NextResponse.json({ error: "Rate limit exceeded: max 10 images per hour" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prompt, caption, reasoning } = body as Record<string, unknown>;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }
  if (!caption || typeof caption !== "string" || caption.trim() === "") {
    return NextResponse.json({ error: "caption is required" }, { status: 400 });
  }
  if (caption.length > MAX_CAPTION_LENGTH) {
    return NextResponse.json(
      { error: `caption must be ${MAX_CAPTION_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  // Generate image via Replicate (Flux 1.1 Pro, 1024x1024 WebP)
  let imageBuffer: Buffer;
  try {
    imageBuffer = await generateImage(prompt.trim());
  } catch (err) {
    console.error("Replicate generation failed:", err);
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  }

  // Upload to R2
  const storageKey = `${agent.id}/${uuidv4()}.webp`;
  try {
    await uploadToR2(storageKey, imageBuffer, "image/webp");
  } catch (err) {
    console.error("R2 upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Insert into DB
  const { data, error } = await supabase
    .from("images")
    .insert({
      agent_id: agent.id,
      storage_key: storageKey,
      caption: caption.trim(),
      prompt: prompt.trim(),
      reasoning: typeof reasoning === "string" && reasoning.trim() ? reasoning.trim() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Image insert failed:", error?.message);
    return NextResponse.json({ error: "Failed to save image" }, { status: 500 });
  }

  return NextResponse.json(
    { id: data.id, url: getPublicUrl(storageKey) },
    { status: 201 }
  );
}

// Replicate can take ~10-20s — extend the default Next.js timeout
export const maxDuration = 60;
