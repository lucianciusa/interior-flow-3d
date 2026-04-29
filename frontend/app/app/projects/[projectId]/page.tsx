"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import NewRoomDialog from "@/components/rooms/NewRoomDialog";
import RoomCard from "@/components/rooms/RoomCard";
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

  if (project.isLoading || rooms.isLoading) {
    return (
      <main className="mx-auto max-w-5xl p-6 text-sm text-neutral-500">
        Loading project…
      </main>
    );
  }
  if (project.isError || !project.data) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-red-600">Project not found.</p>
        <Link href="/app" className="text-sm underline">
          Back to projects
        </Link>
      </main>
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
    <main className="mx-auto min-h-screen w-full max-w-5xl p-6">
      <div className="mb-2 text-xs text-neutral-500">
        <Link href="/app" className="hover:text-neutral-900">
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
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        ) : (
          <h1
            className="text-2xl font-semibold cursor-text"
            onClick={startRename}
            title="Click to rename"
          >
            {project.data.name}
          </h1>
        )}
        <button
          type="button"
          onClick={() => setNewRoomOpen(true)}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          + New room
        </button>
      </div>

      {rooms.data && rooms.data.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">No rooms yet.</p>
          <button
            type="button"
            onClick={() => setNewRoomOpen(true)}
            className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add a room
          </button>
        </div>
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
    </main>
  );
}
