"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateRoom } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { ROOM_TYPES } from "@/lib/room-types";
import type { RoomType } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
};

export default function NewRoomDialog({ open, onOpenChange, projectId }: Props) {
  const [name, setName] = useState("Living room");
  const [roomType, setRoomType] = useState<RoomType>("living_room");
  const [width, setWidth] = useState(5);
  const [length, setLength] = useState(6);
  const [height, setHeight] = useState(2.6);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const create = useCreateRoom(projectId);

  const bounds = ROOM_TYPES[roomType].dim_bounds;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Update defaults when room type changes
  const handleRoomTypeChange = (type: RoomType) => {
    setRoomType(type);
    const b = ROOM_TYPES[type].dim_bounds;
    // Set to middle of bounds
    setWidth(Math.round((b.width_m[0] + b.width_m[1]) / 2));
    setLength(Math.round((b.length_m[0] + b.length_m[1]) / 2));
    setHeight(2.6);
    
    // Auto-update name if it was default
    const currentLabel = Object.entries(ROOM_TYPES).find(([k]) => k === roomType)?.[0] || "";
    if (name.toLowerCase() === currentLabel.replace("_", " ")) {
       const newLabel = type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
       setName(newLabel);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        name: name.trim() || "My Room",
        roomType,
        width_m: width,
        length_m: length,
        height_m: height,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not create");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New room</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label htmlFor="room-name" className="block text-xs font-medium text-foreground">
                Name
              </label>
              <input
                ref={inputRef}
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label htmlFor="room-type" className="block text-xs font-medium text-foreground">
                Type
              </label>
              <select
                id="room-type"
                value={roomType}
                onChange={(e) => handleRoomTypeChange(e.target.value as RoomType)}
                className="mt-1 flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="living_room">Living room</option>
                <option value="bedroom">Bedroom</option>
                <option value="dining_room">Dining room</option>
                <option value="home_office">Home office</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="text-xs font-medium text-foreground">
                Width (m)
                <span className="ml-1 text-[10px] text-muted-foreground opacity-70">({bounds.width_m[0]}-{bounds.width_m[1]})</span>
                <input
                  type="number"
                  step="0.1"
                  min={bounds.width_m[0]}
                  max={bounds.width_m[1]}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                Length (m)
                <span className="ml-1 text-[10px] text-muted-foreground opacity-70">({bounds.length_m[0]}-{bounds.length_m[1]})</span>
                <input
                  type="number"
                  step="0.1"
                  min={bounds.length_m[0]}
                  max={bounds.length_m[1]}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                Height (m)
                <span className="ml-1 text-[10px] text-muted-foreground opacity-70">({bounds.height_m[0]}-{bounds.height_m[1]})</span>
                <input
                  type="number"
                  step="0.1"
                  min={bounds.height_m[0]}
                  max={bounds.height_m[1]}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={create.isPending}
            >
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
