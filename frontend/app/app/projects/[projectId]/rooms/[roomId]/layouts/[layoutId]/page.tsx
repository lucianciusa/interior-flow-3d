"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import ResultView from "@/components/result/ResultView";
import ShareDialog from "@/components/share/ShareDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetLayout } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";

import { useLanguage } from "@/lib/stores/useLanguage";

export default function SavedLayoutPage() {
  const { t } = useLanguage();
  const params = useParams<{
    projectId: string;
    roomId: string;
    layoutId: string;
  }>();
  const layoutId = params?.layoutId;
  const projectId = params?.projectId ?? "";
  const roomId = params?.roomId ?? "";
  const router = useRouter();
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
          {t("sign_in")}
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
            {status === 404 ? t("layout_not_found") : t("something_went_wrong")}
          </h1>
          <Link 
            href={`/app/projects/${projectId}/rooms/${roomId}`}
            className={cn(buttonVariants({ className: "mt-4" }))}
          >
            {t("back")}
          </Link>
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
        onCompare={() => router.push(`/app/projects/${projectId}/rooms/${roomId}`)}
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
