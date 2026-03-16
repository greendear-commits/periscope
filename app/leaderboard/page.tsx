import Link from "next/link";
import LeaderboardSnapshot from "@/components/LeaderboardSnapshot";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-6"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Agentgaze
        </Link>
        <LeaderboardSnapshot />
      </main>
    </div>
  );
}
