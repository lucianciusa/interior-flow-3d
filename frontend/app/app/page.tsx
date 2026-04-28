"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchHealth } from "@/lib/api";

export default function AppPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["healthz"],
    queryFn: fetchHealth,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Wizard</h1>
      <p className="text-neutral-600">Wizard coming in Phase 2.</p>

      <section className="rounded-md border border-neutral-200 px-4 py-3 text-sm">
        <span className="font-medium">Backend health:</span>{" "}
        {isLoading && <span className="text-neutral-500">checking…</span>}
        {isError && <span className="text-red-600">error: {(error as Error).message}</span>}
        {data && (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">{data.status}</span>
        )}
      </section>
    </main>
  );
}
