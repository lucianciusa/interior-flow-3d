"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import CompareOverlay from "@/components/compare/CompareOverlay";
import LayoutVariantGrid from "@/components/layouts/LayoutVariantGrid";
import {
  useGetProject,
  useListRoomsForProject,
  useListLayoutsForRoom,
} from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { useWizardStore } from "@/lib/stores/wizard";

export default function RoomPage() {
  const params = useParams<{ projectId: string; roomId: string }>();
  const projectId = params?.projectId ?? "";
  const roomId = params?.roomId ?? "";
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);

  const project = useGetProject(projectId);
  const rooms = useListRoomsForProject(projectId);
  const layouts = useListLayoutsForRoom(roomId);
  const setDims = useWizardStore((s) => s.setDims);
  const reset = useWizardStore((s) => s.reset);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const room = rooms.data?.find((r) => r.id === roomId);

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

  if (rooms.isLoading || layouts.isLoading) {
    return (
      <main className="mx-auto max-w-5xl p-6 text-sm text-neutral-500">Loading…</main>
    );
  }

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const startNewLayout = () => {
    if (room) {
      setDims({ width_m: room.width_m, length_m: room.length_m, height_m: room.height_m });
    } else {
      reset();
    }
    router.push(`/app/new?roomId=${roomId}`);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-6">
      <div className="mb-2 text-xs text-neutral-500">
        <Link href="/app" className="hover:text-neutral-900">
          Projects
        </Link>{" "}
        /{" "}
        <Link href={`/app/projects/${projectId}`} className="hover:text-neutral-900">
          {project.data?.name ?? "…"}
        </Link>{" "}
        / {room?.name ?? "Room"}
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{room?.name ?? "Room"}</h1>
        <div className="flex gap-2">
          {compareIds.length === 2 && (
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
            >
              Compare (2)
            </button>
          )}
          <button
            type="button"
            onClick={startNewLayout}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            + New layout
          </button>
        </div>
      </div>

      <LayoutVariantGrid
        layouts={layouts.data ?? []}
        projectId={projectId}
        roomId={roomId}
        compareIds={compareIds}
        onToggleCompare={toggleCompare}
      />

      {compareOpen && compareIds.length === 2 && room && (
        <CompareOverlay
          aId={compareIds[0]}
          bId={compareIds[1]}
          dims={{
            width_m: room.width_m,
            length_m: room.length_m,
            height_m: room.height_m,
          }}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </main>
  );
}
