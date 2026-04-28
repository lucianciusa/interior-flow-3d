"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginModal({ open, onOpenChange, message }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus({ kind: "idle" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    emailRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const emailValid = EMAIL_RE.test(email);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) return;
    setStatus({ kind: "sending" });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    if (error) setStatus({ kind: "error", message: error.message });
    else setStatus({ kind: "sent" });
  }

  async function signInWithGoogle() {
    setStatus({ kind: "sending" });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) setStatus({ kind: "error", message: error.message });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={dialogRef}
        className={cn(
          "w-full max-w-sm rounded-xl bg-white p-6 shadow-xl",
          "border border-neutral-200",
        )}
      >
        <h2 id="login-title" className="text-lg font-semibold">
          Sign in to save
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          {message ?? "We'll send you a magic link or use Google."}
        </p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={status.kind === "sending"}
          className="mt-4 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          or
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={sendMagicLink} className="flex flex-col gap-2">
          <label htmlFor="login-email" className="text-xs font-medium text-neutral-700">
            Email
          </label>
          <input
            id="login-email"
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            required
          />
          <button
            type="submit"
            disabled={!emailValid || status.kind === "sending" || status.kind === "sent"}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {status.kind === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>

        {status.kind === "sent" && (
          <p className="mt-3 text-sm text-emerald-700">
            Check your inbox for the sign-in link.
          </p>
        )}
        {status.kind === "error" && (
          <p className="mt-3 text-sm text-red-600">{status.message}</p>
        )}

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-4 w-full text-xs text-neutral-500 hover:text-neutral-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
