"use client";

import Link from "next/link";
import { useState } from "react";

import LoginModal from "@/components/auth/LoginModal";
import { useDeleteLayout, useListLayouts } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";

const STYLE_LABELS: Record<string, string> = {
  scandinavian: "Scandinavian",
  minimal: "Minimal",
  industrial: "Industrial",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function MyLayoutsPage() {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const [loginOpen, setLoginOpen] = useState(false);
  const { data, isLoading, isError, error } = useListLayouts();
  const del = useDeleteLayout();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">My Layouts</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Sign in to view your saved layouts.
          </p>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Sign in
          </button>
        </div>
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Layouts</h1>
        <Link
          href="/app"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
        >
          Design another
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-neutral-500">Loading your layouts…</p>
      )}
      {isError && (
        <p className="text-sm text-red-600">
          Could not load layouts: {error instanceof Error ? error.message : "error"}
        </p>
      )}
      {!isLoading && !isError && data && data.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">
            No saved layouts yet — go design one.
          </p>
          <Link
            href="/app"
            className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Start designing
          </Link>
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-4"
            >
              <Link href={`/app/result/${item.id}`} className="flex-1">
                <div className="text-sm font-medium">
                  {STYLE_LABELS[item.style] ?? item.style}
                </div>
                <div className="text-xs text-neutral-500">
                  {fmtDate(item.created_at)}
                  {item.seed != null ? ` · seed ${item.seed}` : ""}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Delete this layout?")) del.mutate(item.id);
                }}
                disabled={del.isPending}
                className="ml-4 rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
