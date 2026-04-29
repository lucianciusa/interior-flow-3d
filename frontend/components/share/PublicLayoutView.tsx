"use client";

import ResultView from "@/components/result/ResultView";
import { useGetSharedLayout } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLayoutView({ token }: { token: string }) {
  const { data, isLoading, isError } = useGetSharedLayout(token);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="space-y-4 w-full max-w-2xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-background">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight font-display text-foreground">
            This share link is no longer available
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
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
