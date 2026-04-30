"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { useDeleteRoom } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { RoomRecord } from "@/lib/types";

export default function RoomCard({
  room,
  projectId,
  selected = false,
  onSelect,
}: {
  room: RoomRecord;
  projectId: string;
  selected?: boolean;
  onSelect?: (val: boolean) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutateAsync: deleteRoom, isPending } = useDeleteRoom();

  const handleDelete = async () => {
    try {
      await deleteRoom(room.id);
      setConfirmOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="relative group">
        <Link
          href={`/app/projects/${projectId}/rooms/${room.id}`}
          className="block overflow-hidden rounded-xl border border-border transition hover:border-ring hover:shadow-md"
        >
          <div className="aspect-[3/2] w-full bg-gradient-to-br from-muted to-muted/50" />
          <div className="p-4">
            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {room.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {room.width_m.toFixed(1)} × {room.length_m.toFixed(1)} m
              {" · "}
              {room.room_type.replace(/_/g, " ")}
            </div>
          </div>
        </Link>

        {/* Checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect?.(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-ring"
          />
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirmOpen(true);
          }}
          className="absolute top-2 right-2 z-10 rounded-lg bg-background/80 p-2 text-muted-foreground backdrop-blur-sm transition hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Room"
        description={`Are you sure you want to delete "${room.name}"? This will permanently remove all layouts within this room.`}
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </>
  );
}
