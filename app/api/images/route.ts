import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "@/lib/auth";
import { uploadToR2, getPublicUrl } from "@/lib/r2";
import { supabase } from "@/lib/supabase";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 500 * 1024; // 500KB
const MAX_CAPTION_LENGTH = 300;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { agent } = auth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const caption = formData.get("caption");
  const prompt = formData.get("prompt");
  const reasoning = formData.get("reasoning");

  // Validate file
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json(
      { error: "file must be JPEG, PNG, or WEBP" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `file must be under 500KB (received ${Math.round(file.size / 1024)}KB)` },
      { status: 400 }
    );
  }

  // Validate caption
  if (!caption || typeof caption !== "string" || caption.trim() === "") {
    return NextResponse.json({ error: "caption is required" }, { status: 400 });
  }
  if (caption.length > MAX_CAPTION_LENGTH) {
    return NextResponse.json(
      { error: `caption must be ${MAX_CAPTION_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  // Upload to R2
  const ext = ALLOWED_TYPES[file.type];
  const storageKey = `${agent.id}/${uuidv4()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadToR2(storageKey, buffer, file.type);
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
      prompt: typeof prompt === "string" && prompt.trim() ? prompt.trim() : null,
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
