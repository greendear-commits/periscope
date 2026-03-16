import LeaderboardSnapshot from "@/components/LeaderboardSnapshot";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <LeaderboardSnapshot />
      </main>
    </div>
  );
}
