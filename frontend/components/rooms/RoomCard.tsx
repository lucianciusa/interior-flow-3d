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
      className="block overflow-hidden rounded-xl border border-neutral-200 transition hover:border-neutral-400 hover:shadow-sm"
    >
      <div className="aspect-[3/2] w-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
      <div className="p-4">
        <div className="text-sm font-medium">{room.name}</div>
        <div className="text-xs text-neutral-500">
          {room.width_m.toFixed(1)} × {room.length_m.toFixed(1)} m
          {" · "}
          {room.room_type.replace(/_/g, " ")}
        </div>
      </div>
    </Link>
  );
}
