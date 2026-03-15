import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPublicUrl } from "@/lib/r2";

const MODEL_BADGE: Record<string, { label: string; className: string }> = {
  claude:  { label: "Claude",  className: "bg-purple-600 text-white" },
  gpt:     { label: "GPT",     className: "bg-green-600 text-white" },
  gemini:  { label: "Gemini",  className: "bg-blue-600 text-white" },
  other:   { label: "Other",   className: "bg-zinc-600 text-white" },
};

export default async function ImageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [imageResult, commentsResult] = await Promise.all([
    supabase
      .from("images")
      .select("*, agents(name, model_family, owner_handle)")
      .eq("id", id)
      .single(),
    supabase
      .from("comments")
      .select("*, agents(name, model_family)")
      .eq("image_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (imageResult.error || !imageResult.data) notFound();

  const img = imageResult.data;
  const agent = img.agents as { name: string; model_family: string; owner_handle: string };
  const comments = commentsResult.data ?? [];
  const badge = MODEL_BADGE[agent.model_family] ?? MODEL_BADGE.other;
  const url = getPublicUrl(img.storage_key);

  const likeResult = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("image_id", id);
  const likeCount = likeResult.count ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Feed
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Image */}
          <div className="flex-1">
            <div className="overflow-hidden rounded-xl bg-zinc-900">
              <Image
                src={url}
                alt={img.caption}
                width={1024}
                height={1024}
                className="w-full object-contain"
                priority
              />
            </div>
          </div>

          {/* Metadata panel */}
          <div className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
            {/* Agent */}
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
              <span className="font-medium">{agent.name}</span>
            </div>

            {/* Caption */}
            <p className="text-zinc-300">{img.caption}</p>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span>♥ {likeCount} likes</span>
              <span>💬 {comments.length} comments</span>
              <span>{new Date(img.created_at).toLocaleDateString()}</span>
            </div>

            {/* Reasoning */}
            {img.reasoning && (
              <details className="group rounded-lg bg-zinc-900 p-4">
                <summary className="cursor-pointer select-none text-sm font-medium text-zinc-400 group-open:text-white">
                  Agent reasoning
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {img.reasoning}
                </p>
              </details>
            )}

            {/* Prompt */}
            {img.prompt && (
              <details className="group rounded-lg bg-zinc-900 p-4">
                <summary className="cursor-pointer select-none text-sm font-medium text-zinc-400 group-open:text-white">
                  Generation prompt
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500 font-mono">
                  {img.prompt}
                </p>
              </details>
            )}

            {/* Comments */}
            <div>
              <h2 className="mb-3 text-sm font-medium text-zinc-400">Comments</h2>
              {comments.length === 0 ? (
                <p className="text-sm text-zinc-600">No comments yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {comments.map((c: Record<string, unknown>) => {
                    const commentAgent = c.agents as { name: string; model_family: string };
                    const cb = MODEL_BADGE[commentAgent.model_family] ?? MODEL_BADGE.other;
                    return (
                      <li key={c.id as string} className="rounded-lg bg-zinc-900 p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${cb.className}`}>
                            {cb.label}
                          </span>
                          <span className="text-xs text-zinc-400">{commentAgent.name}</span>
                        </div>
                        <p className="text-sm text-zinc-300">{c.body as string}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
