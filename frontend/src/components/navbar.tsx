import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-hairline bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brass/60 font-display text-sm font-semibold text-brass">
            D
          </div>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight text-bone">DriveU</p>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Luxury support</p>
          </div>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-muted">
          <Link href="/" className="transition hover:text-bone">
            Home
          </Link>
          <Link href="/customer" className="transition hover:text-bone">
            Customer
          </Link>
          <Link href="/agent" className="transition hover:text-bone">
            Agent
          </Link>
          <Link href="/login" className="rounded-full border border-brass/70 px-4 py-2 text-brass transition hover:scale-[1.02] hover:bg-brass/10 hover:text-brass-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
