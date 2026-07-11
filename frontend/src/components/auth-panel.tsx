"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser, saveSession, signupUser } from "@/lib/api";
import type { UserRole } from "@/types/chat";

interface AuthPanelProps {
  mode: "login" | "signup";
}

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("customer");
  const [name, setName] = useState("Ava Customer");
  const [email, setEmail] = useState("ava@luxury.example");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session =
        mode === "signup"
          ? await signupUser({ name: name.trim(), email: email.trim(), password, role })
          : await loginUser({ email: email.trim(), password });

      saveSession(session);
      router.push(session.role === "customer" ? "/customer" : "/agent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (option: UserRole) => {
    setRole(option);
    if (option === "customer") {
      setName("Ava Customer");
      setEmail("ava@luxury.example");
    } else {
      setName("Agent Smith");
      setEmail("agent@luxury.example");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="grid overflow-hidden rounded-[32px] border border-hairline bg-surface shadow-[0_30px_90px_-30px_rgba(0,0,0,0.45)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-ink p-10 text-bone">
          <p className="text-sm uppercase tracking-[0.3em] text-brass">Luxury service</p>
          <h1 className="mt-4 font-display text-3xl font-medium">
            {mode === "login" ? "Welcome back" : "Create your concierge account"}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted">
            Access your private product support conversations with a dedicated agent.
          </p>
          <div className="mt-8 rounded-2xl border border-hairline bg-surface-2 p-5 text-sm text-muted">
            <p className="font-medium text-bone">Demo accounts</p>
            <ul className="mt-3 space-y-2">
              <li>• Customer: ava@luxury.example / password123</li>
              <li>• Agent: agent@luxury.example / password123</li>
              <li>• Real-time chat powered by the NestJS backend</li>
            </ul>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted">
                {mode === "login" ? "Sign in" : "Sign up"}
              </p>
              <h2 className="mt-2 font-display text-2xl font-medium text-bone">
                {mode === "login" ? "Continue the conversation" : "Open a concierge profile"}
              </h2>
            </div>
            <Link href="/" className="text-sm font-medium text-muted transition hover:text-bone">
              Back home
            </Link>
          </div>

          <div className="mt-6 flex rounded-full border border-hairline p-1">
            {(["customer", "agent"] as UserRole[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleRoleChange(option)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                  role === option ? "bg-surface-2 text-brass" : "text-muted hover:text-bone"
                }`}
              >
                {option === "customer" ? "Customer" : "Agent"}
              </button>
            ))}
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="block text-sm font-medium text-bone">
                Full name
                <input
                  className="mt-2 w-full rounded-2xl border border-hairline bg-ink px-4 py-3 text-bone outline-none ring-0 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Olivia Brooks"
                />
              </label>
            ) : null}

            <label className="block text-sm font-medium text-bone">
              Email
              <input
                className="mt-2 w-full rounded-2xl border border-hairline bg-ink px-4 py-3 text-bone outline-none ring-0 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-bone">
              Password
              <input
                className="mt-2 w-full rounded-2xl border border-hairline bg-ink px-4 py-3 text-bone outline-none ring-0 placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error ? <p className="text-sm text-clay">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl border border-brass/70 px-4 py-3 text-sm font-semibold text-brass transition hover:scale-[1.02] hover:bg-brass/10 hover:text-brass-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/50"
            >
              {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted">
            {mode === "login" ? "Need an account?" : "Already have one?"}{" "}
            <Link href={mode === "login" ? "/signup" : "/login"} className="font-medium text-brass hover:text-brass-soft">
              {mode === "login" ? "Create one" : "Sign in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
