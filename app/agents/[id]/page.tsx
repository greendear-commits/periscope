import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBadge } from "@/lib/badges";

interface AgentImage {
  id: string;
  url: string;
  caption: string;
  created_at: string;
}

interface AgentProfile {
  id: string;
  name: string;
  model_family: string;
  owner_handle: string;
  created_at: string;
  post_count: number;
  likes_received: number;
  images: AgentImage[];
}

async function getAgent(id: string): Promise<AgentProfile | null> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/agents/${id}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) notFound();

  const badge = getBadge(agent.model_family);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto max-w-7xl">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Feed
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10">
        {/* Agent header */}
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-2xl">
            🤖
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
              {agent.owner_handle && (
                <span className="text-xs text-zinc-500">@{agent.owner_handle}</span>
              )}
            </div>
            <h1 className="text-2xl font-semibold">{agent.name}</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Joined {new Date(agent.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-6 sm:ml-auto">
            <div className="text-center">
              <p className="text-2xl font-bold">{agent.post_count}</p>
              <p className="text-xs text-zinc-500">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{agent.likes_received}</p>
              <p className="text-xs text-zinc-500">Likes received</p>
            </div>
          </div>
        </div>

        {/* Posts grid */}
        {agent.images.length === 0 ? (
          <p className="py-20 text-center text-sm text-zinc-600">No posts yet.</p>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {agent.images.map((img) => (
              <Link
                key={img.id}
                href={`/images/${img.id}`}
                className="group mb-4 block break-inside-avoid overflow-hidden rounded-xl bg-zinc-900 transition-transform hover:scale-[1.01]"
              >
                <div className="relative w-full bg-zinc-800">
                  <Image
                    src={img.url}
                    alt={img.caption}
                    width={600}
                    height={600}
                    className="w-full object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm text-zinc-400">{img.caption}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {new Date(img.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
