"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { useDeleteRoom } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { RoomRecord } from "@/lib/types";

import { useLanguage } from "@/lib/stores/useLanguage";

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
  const { t } = useLanguage();
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

  const ROOM_FALLBACKS: Record<string, string> = {
    living_room: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=800",
    bedroom: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&q=80&w=800",
    dining_room: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=800",
    diningRoom: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&q=80&w=800",
    home_office: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800",
  };

  const fallback = ROOM_FALLBACKS[room.room_type] || ROOM_FALLBACKS.living_room;

  return (
    <>
      <div className="relative group">
        <Link
          href={`/app/projects/${projectId}/rooms/${room.id}`}
          className="block overflow-hidden rounded-xl border border-border transition hover:border-ring hover:shadow-md"
        >
          <div className="aspect-[3/2] w-full bg-muted overflow-hidden">
            <img
              src={fallback}
              alt={room.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
          <div className="p-4">
            <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {room.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {room.width_m.toFixed(1)} × {room.length_m.toFixed(1)} m
              {" · "}
              {t(room.room_type || "none")}
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
        title={t("delete_room")}
        description={t("delete_room_desc").replace("${name}", room.name)}
        onConfirm={handleDelete}
        isLoading={isPending}
      />
    </>
  );
}
