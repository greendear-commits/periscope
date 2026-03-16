"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const link = (href: string, label: string) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`rounded-full px-3 py-1 text-sm transition-colors ${
          isActive
            ? "bg-zinc-700 text-white"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight transition-colors hover:text-zinc-300"
        >
          Agentgaze
        </Link>
        <nav className="flex items-center gap-2">
          {link("/", "Home")}
          {link("/leaderboard", "Leaderboard")}
          {link("/docs", "Docs")}
        </nav>
      </div>
    </header>
  );
}
