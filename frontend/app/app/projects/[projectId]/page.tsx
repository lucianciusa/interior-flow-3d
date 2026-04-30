"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import NewRoomDialog from "@/components/rooms/NewRoomDialog";
import RoomCard from "@/components/rooms/RoomCard";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyRoomsIllustration } from "@/components/ui/illustrations/EmptyRooms";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteRoom,
  useGetProject,
  useListRoomsForProject,
  useUpdateProject,
} from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);

  const project = useGetProject(projectId);
  const rooms = useListRoomsForProject(projectId);
  const updateProject = useUpdateProject(projectId ?? "");
  const { mutateAsync: deleteRoom } = useDeleteRoom();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [newRoomOpen, setNewRoomOpen] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const toggleOne = (id: string, val: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (val) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!rooms.data) return;
    if (selectedIds.size === rooms.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rooms.data.map((r) => r.id)));
    }
  };

  const deleteSelected = async () => {
    setIsDeletingBulk(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await deleteRoom(id);
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

  if (project.isLoading || rooms.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (project.isError || !project.data) {
    return (
      <div>
        <p className="text-sm text-destructive">Project not found.</p>
        <Link href="/app" className="text-sm underline text-muted-foreground hover:text-foreground">
          Back to projects
        </Link>
      </div>
    );
  }

  const startRename = () => {
    setName(project.data!.name);
    setEditing(true);
  };
  const submitRename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.data?.name) {
      setEditing(false);
      return;
    }
    try {
      await updateProject.mutateAsync({ name: trimmed });
    } finally {
      setEditing(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-2 text-xs text-muted-foreground">
        <Link href="/app" className="hover:text-foreground transition-colors">
          Projects
        </Link>{" "}
        / {project.data.name}
      </div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex-1">
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-2xl font-semibold font-display text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <div className="flex flex-col">
              <h1
                className="text-2xl font-semibold tracking-tight font-display text-foreground cursor-text"
                onClick={startRename}
                title="Click to rename"
              >
                {project.data.name}
              </h1>
              {rooms.data && rooms.data.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="text-left text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {selectedIds.size === rooms.data.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>
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
          <Button size="sm" onClick={() => setNewRoomOpen(true)}>
            + New room
          </Button>
        </div>
      </div>

      {rooms.data && rooms.data.length === 0 && (
        <EmptyState
          illustration={<EmptyRoomsIllustration />}
          title="No rooms yet"
          description="Add your first room to start designing layouts."
          cta={<Button onClick={() => setNewRoomOpen(true)}>Add a room</Button>}
        />
      )}

      {rooms.data && rooms.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.data.map((r) => (
            <RoomCard 
              key={r.id} 
              room={r} 
              projectId={projectId ?? ""} 
              selected={selectedIds.has(r.id)}
              onSelect={(val) => toggleOne(r.id, val)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="Delete Multiple Rooms"
        description={`Are you sure you want to delete ${selectedIds.size} rooms? This action will permanently remove all layouts within these rooms.`}
        onConfirm={deleteSelected}
        isLoading={isDeletingBulk}
      />

      <NewRoomDialog
        open={newRoomOpen}
        onOpenChange={setNewRoomOpen}
        projectId={projectId ?? ""}
      />
    </div>
  );
}

