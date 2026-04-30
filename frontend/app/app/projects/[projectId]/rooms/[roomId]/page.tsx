"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import CompareOverlay from "@/components/compare/CompareOverlay";
import LayoutVariantGrid from "@/components/layouts/LayoutVariantGrid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteLayout,
  useGetProject,
  useListRoomsForProject,
  useListLayoutsForRoom,
} from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { useWizardStore } from "@/lib/stores/wizard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const { mutateAsync: deleteLayout } = useDeleteLayout();

  const setRoomType = useWizardStore((s) => s.setRoomType);
  const setDims = useWizardStore((s) => s.setDims);
  const setPhase = useWizardStore((s) => s.setPhase);
  const reset = useWizardStore((s) => s.reset);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const room = rooms.data?.find((r) => r.id === roomId);

  const toggleOne = (id: string, val: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (val) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!layouts.data) return;
    if (selectedIds.size === layouts.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(layouts.data.map((l) => l.id)));
    }
  };

  const deleteSelected = async () => {
    setIsDeletingBulk(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteLayout(id);
      }
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingBulk(false);
    }
  };

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
      setRoomType(room.room_type as any);
      setDims({ width_m: room.width_m, length_m: room.length_m, height_m: room.height_m });
      setPhase("step2");
    } else {
      reset();
    }
    router.push(`/app/new?roomId=${roomId}&projectId=${projectId}`);
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
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight font-display text-foreground">
            {room?.name ?? "Room"}
          </h1>
          {layouts.data && layouts.data.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-left text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {selectedIds.size === layouts.data.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirmOpen(true)}
            >
              Delete Selected ({selectedIds.size})
            </Button>
          )}
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
        selectedIds={selectedIds}
        onToggleSelection={toggleOne}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Delete Multiple Layouts"
        description={`Are you sure you want to delete ${selectedIds.size} layouts? This action cannot be undone.`}
        onConfirm={deleteSelected}
        isLoading={isDeletingBulk}
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
