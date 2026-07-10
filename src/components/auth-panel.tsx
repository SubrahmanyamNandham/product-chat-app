"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser, signupUser } from "@/lib/api";
import type { UserRole } from "@/types/chat";

interface AuthPanelProps {
  mode: "login" | "signup";
}

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("customer");
  const [name, setName] = useState("Ava Laurent");
  const [email, setEmail] = useState("ava@luxury.example");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = mode === "signup"
        ? await signupUser({ name: name.trim(), email: email.trim(), password, role })
        : await loginUser({ email: email.trim(), password });

      localStorage.setItem(
        "luxury-chat-session",
        JSON.stringify({
          name: response.user.name,
          email: response.user.email,
          role: response.user.role as UserRole,
          accessToken: response.accessToken,
        }),
      );

      router.push(response.user.role === "customer" ? "/customer" : "/agent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="grid overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-[0_30px_90px_-30px_rgba(0,0,0,0.25)] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-stone-950 p-10 text-stone-100">
          <p className="text-sm uppercase tracking-[0.3em] text-stone-400">Luxury service</p>
          <h1 className="mt-4 text-3xl font-semibold">
            {mode === "login" ? "Welcome back" : "Create your concierge account"}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-stone-300">
            Access your private product support conversations with a dedicated agent.
          </p>
          <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/70 p-5 text-sm text-stone-300">
            <p className="font-medium text-white">Preview experience</p>
            <ul className="mt-3 space-y-2">
              <li>• Secure role-based entry for customers and agents</li>
              <li>• Dedicated conversation threads by product</li>
              <li>• Mock live updates for the Phase 1 UI demo</li>
            </ul>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-stone-500">
                {mode === "login" ? "Sign in" : "Sign up"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">
                {mode === "login" ? "Continue the conversation" : "Open a concierge profile"}
              </h2>
            </div>
            <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900">
              Back home
            </Link>
          </div>

          <div className="mt-6 flex rounded-full border border-stone-200 p-1">
            {(["customer", "agent"] as UserRole[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                  role === option
                    ? "bg-stone-950 text-white"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {option === "customer" ? "Customer" : "Agent"}
              </button>
            ))}
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="block text-sm font-medium text-stone-700">
                Full name
                <input
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none ring-0"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Olivia Brooks"
                />
              </label>
            ) : null}

            <label className="block text-sm font-medium text-stone-700">
              Email
              <input
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none ring-0"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-stone-700">
              Password
              <input
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none ring-0"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Working..." : mode === "login" ? "Continue as a guest" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-stone-500">
            {mode === "login" ? "Need an account?" : "Already have one?"}{" "}
            <Link
              href={mode === "login" ? "/signup" : "/login"}
              className="font-medium text-stone-900"
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
