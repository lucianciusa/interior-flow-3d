"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import LoginModal from "@/components/auth/LoginModal";
import ResultView from "@/components/result/ResultView";
import { useGetLayout } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";

export default function SavedLayoutPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const [loginOpen, setLoginOpen] = useState(false);

  const { data, isLoading, isError, error } = useGetLayout(id);

  useEffect(() => {
    if (ready && !session) setLoginOpen(true);
  }, [ready, session]);

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
          <h1 className="text-2xl font-semibold">Sign in to view this layout</h1>
        </div>
        <LoginModal
          open={loginOpen}
          onOpenChange={(o) => {
            setLoginOpen(o);
            if (!o) router.push("/app");
          }}
        />
      </div>
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
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">
            {status === 404 ? "Layout not found" : "Something went wrong"}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {status === 404
              ? "It may have been deleted, or you do not have access."
              : error instanceof Error
                ? error.message
                : "Unknown error"}
          </p>
          <Link
            href="/app/layouts"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Back to my layouts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ResultView
      layout={data.layout}
      dims={data.rooms}
      style={data.layout.style}
      preferences={[]}
    />
  );
}
