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
  useGetProject,
  useListRoomsForProject,
  useUpdateProject,
} from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);

  const project = useGetProject(projectId);
  const rooms = useListRoomsForProject(projectId);
  const updateProject = useUpdateProject(projectId ?? "");

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [newRoomOpen, setNewRoomOpen] = useState(false);

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
    setName(project.data.name);
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
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-2xl font-semibold font-display text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <h1
            className="text-2xl font-semibold tracking-tight font-display text-foreground cursor-text"
            onClick={startRename}
            title="Click to rename"
          >
            {project.data.name}
          </h1>
        )}
        <Button size="sm" onClick={() => setNewRoomOpen(true)}>
          + New room
        </Button>
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
            <RoomCard key={r.id} room={r} projectId={projectId ?? ""} />
          ))}
        </div>
      )}

      <NewRoomDialog
        open={newRoomOpen}
        onOpenChange={setNewRoomOpen}
        projectId={projectId ?? ""}
      />
    </div>
  );
}
