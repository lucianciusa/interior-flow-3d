"use client";

import Link from "next/link";

import type { RoomRecord } from "@/lib/types";

export default function RoomCard({
  room,
  projectId,
}: {
  room: RoomRecord;
  projectId: string;
}) {
  return (
    <Link
      href={`/app/projects/${projectId}/rooms/${room.id}`}
      className="group block overflow-hidden rounded-xl border border-border transition hover:border-ring hover:shadow-md"
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
  );
}
