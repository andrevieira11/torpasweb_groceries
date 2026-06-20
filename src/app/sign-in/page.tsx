"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res =
      mode === "signup"
        ? await signUp.email({ name, email, password })
        : await signIn.email({ email, password });

    if (res.error) {
      setBusy(false);
      setError(res.error.message ?? "Something went wrong. Try again.");
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next && next.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col gap-1.5">
        <span className="text-3xl font-semibold tracking-tight">
          Mr<span className="text-brand">List</span>
        </span>
        <p className="text-sm text-muted">
          {mode === "signin"
            ? "Welcome back. Sign in to your lists."
            : "Create an account to start a list."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <Field
            label="Name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={setName}
            required
          />
        )}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          required
        />
        <Field
          label="Password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={setPassword}
          required
          minLength={8}
        />

        {error && <p className="text-sm text-over">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 h-12 rounded-2xl bg-brand text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="font-medium text-brand hover:underline"
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </p>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-sm font-medium text-muted">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-2xl border border-hairline bg-surface px-4 text-fg outline-none transition-colors focus:border-brand"
      />
    </label>
  );
}
