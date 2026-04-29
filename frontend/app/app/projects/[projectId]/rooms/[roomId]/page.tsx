"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import CompareOverlay from "@/components/compare/CompareOverlay";
import LayoutVariantGrid from "@/components/layouts/LayoutVariantGrid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
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

  if (rooms.isLoading || layouts.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
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
    <div className="w-full">
      <div className="mb-2 text-xs text-muted-foreground">
        <Link href="/app" className="hover:text-foreground transition-colors">
          Projects
        </Link>{" "}
        /{" "}
        <Link href={`/app/projects/${projectId}`} className="hover:text-foreground transition-colors">
          {project.data?.name ?? "…"}
        </Link>{" "}
        / {room?.name ?? "Room"}
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight font-display text-foreground">
          {room?.name ?? "Room"}
        </h1>
        <div className="flex gap-2">
          {compareIds.length === 2 && (
            <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
              Compare (2)
            </Button>
          )}
          <Button size="sm" onClick={startNewLayout}>
            + New layout
          </Button>
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
    </div>
  );
}
