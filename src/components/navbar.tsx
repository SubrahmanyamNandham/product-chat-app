import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-950 text-sm font-semibold text-white">
            D
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-stone-900">DriveU</p>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Luxury support</p>
          </div>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-stone-600">
          <Link href="/" className="transition hover:text-stone-900">
            Home
          </Link>
          <Link href="/customer" className="transition hover:text-stone-900">
            Customer
          </Link>
          <Link href="/agent" className="transition hover:text-stone-900">
            Agent
          </Link>
          <Link href="/login" className="rounded-full bg-stone-950 px-4 py-2 text-white transition hover:bg-stone-800">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
