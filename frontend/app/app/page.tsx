"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import LoginModal from "@/components/auth/LoginModal";
import EmptyProjects from "@/components/projects/EmptyProjects";
import NewProjectDialog from "@/components/projects/NewProjectDialog";
import ProjectGrid from "@/components/projects/ProjectGrid";
import { useConvertAnonLayout, useListProjects } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import type { ConversionRequest } from "@/lib/types";

const PENDING_KEY = "pendingAnonLayout";

function readPending(): ConversionRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConversionRequest;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const router = useRouter();
  const { data, isLoading, isError, error } = useListProjects();
  const { mutateAsync: convertAnon } = useConvertAnonLayout();

  const [loginOpen, setLoginOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const convertingRef = useRef(false);

  useEffect(() => {
    if (!ready || !session || convertingRef.current) return;
    const pending = readPending();
    if (!pending) return;
    convertingRef.current = true;
    convertAnon(pending)
      .then((res) => {
        window.sessionStorage.removeItem(PENDING_KEY);
        router.push(
          `/app/projects/${res.project_id}/rooms/${res.room_id}/layouts/${res.layout_id}`,
        );
      })
      .catch((e: unknown) => {
        convertingRef.current = false;
        setConvertError(e instanceof Error ? e.message : "conversion failed");
      });
  }, [ready, session, convertAnon, router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-semibold">Interior Flow 3D</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Generate a 3D interior layout in seconds. Sign in to save your work.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              href="/app/new"
              className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
            >
              Try without signing in
            </Link>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              Sign in
            </button>
          </div>
        </div>
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <div className="flex gap-2">
          <Link
            href="/app/new"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
          >
            Quick generate
          </Link>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            + New project
          </button>
        </div>
      </div>

      {convertError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Could not save your generated layout: {convertError}
        </div>
      )}

      {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-red-600">
          Could not load projects: {error instanceof Error ? error.message : "error"}
        </p>
      )}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyProjects onCreate={() => setNewOpen(true)} />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <ProjectGrid projects={data} />
      )}

      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
    </main>
  );
}
