"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import ResultView from "@/components/result/ResultView";
import ShareDialog from "@/components/share/ShareDialog";
import { useGetLayout } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";

export default function SavedLayoutPage() {
  const params = useParams<{
    projectId: string;
    roomId: string;
    layoutId: string;
  }>();
  const layoutId = params?.layoutId;
  const projectId = params?.projectId ?? "";
  const roomId = params?.roomId ?? "";
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);

  const { data, isLoading, isError, error } = useGetLayout(layoutId);
  const [shareOpen, setShareOpen] = useState(false);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-400">
        Loading…
      </div>
    );
  }
  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Link href="/app" className="text-sm underline">
          Sign in
        </Link>
      </main>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-500">
        Loading layout…
      </div>
    );
  }

  if (isError || !data) {
    const status =
      error && typeof error === "object" && "status" in error
        ? (error as { status: number }).status
        : null;
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">
            {status === 404 ? "Layout not found" : "Something went wrong"}
          </h1>
          <Link
            href={`/app/projects/${projectId}/rooms/${roomId}`}
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Back to room
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <ResultView
        mode="saved"
        layout={data.layout}
        dims={data.rooms}
        style={data.layout.style}
        preferences={[]}
        layoutId={layoutId ?? null}
        onShare={() => setShareOpen(true)}
      />
      {layoutId && (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          layoutId={layoutId}
        />
      )}
    </>
  );
}
