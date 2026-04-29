"use client";

import ResultView from "@/components/result/ResultView";
import { useGetSharedLayout } from "@/lib/api";

export default function PublicLayoutView({ token }: { token: string }) {
  const { data, isLoading, isError } = useGetSharedLayout(token);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">This share link is no longer available</h1>
          <p className="mt-2 text-sm text-neutral-600">
            It may have expired or been revoked by the owner.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ResultView
      mode="shared"
      layout={data.layout}
      dims={data.rooms}
      style={data.layout.style}
      preferences={[]}
    />
  );
}
