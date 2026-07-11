import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16 text-bone sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="rounded-[36px] border border-hairline bg-surface p-8 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.45)] sm:p-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brass">Luxury support platform</p>
            <h1 className="mt-4 font-display text-4xl font-medium leading-tight text-bone sm:text-5xl">
              Real-time product support for a refined customer experience.
            </h1>
            <p className="mt-5 text-lg leading-8 text-muted">
              Browse flagship products, open dedicated support threads per item, and manage conversations with a polished inbox experience.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-full border border-brass/70 px-6 py-3 text-sm font-semibold text-brass transition hover:scale-[1.02] hover:bg-brass/10 hover:text-brass-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50">
                Create account
              </Link>
              <Link href="/login" className="rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-bone transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50">
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "Dedicated threads",
              body: "Every customer-to-product conversation is isolated so support history remains clean and private.",
            },
            {
              title: "Agent inbox",
              body: "Agents can switch across live conversations with unread badges and product context.",
            },
            {
              title: "Concierge experience",
              body: "Quiet, attentive service that feels like a private advisor in the boutique.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[28px] border border-hairline bg-surface p-6">
              <h2 className="font-display text-lg font-medium text-bone">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{item.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
