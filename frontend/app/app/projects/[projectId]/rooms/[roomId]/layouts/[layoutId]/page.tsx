"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import ResultView from "@/components/result/ResultView";
import ShareDialog from "@/components/share/ShareDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Link href="/app" className="text-sm underline text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 w-full max-w-lg">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    const status =
      error && typeof error === "object" && "status" in error
        ? (error as { status: number }).status
        : null;
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight font-display text-foreground">
            {status === 404 ? "Layout not found" : "Something went wrong"}
          </h1>
          <Button asChild className="mt-4">
            <Link href={`/app/projects/${projectId}/rooms/${roomId}`}>
              Back to room
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ResultView
        mode="saved"
        roomType={data.rooms.room_type}
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
