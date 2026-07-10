import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f9f6f0,_#f3ece5_55%,_#eee0ce)] px-6 py-16 text-stone-900 sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="rounded-[36px] border border-stone-200 bg-white/90 p-8 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.25)] backdrop-blur sm:p-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-stone-500">Luxury support platform</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              Real-time product support for a refined customer experience.
            </h1>
            <p className="mt-5 text-lg leading-8 text-stone-600">
              Browse flagship products, open dedicated support threads per item, and manage conversations with a polished inbox experience.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800">
                Create account
              </Link>
              <Link href="/login" className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100">
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
              title: "Socket-ready UI",
              body: "The interface is prepared for the later NestJS and Socket.IO backend integration.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">{item.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
