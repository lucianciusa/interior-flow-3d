"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateRoom } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
};

export default function NewRoomDialog({ open, onOpenChange, projectId }: Props) {
  const [name, setName] = useState("Living room");
  const [width, setWidth] = useState(5);
  const [length, setLength] = useState(6);
  const [height, setHeight] = useState(2.6);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const create = useCreateRoom(projectId);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({
        name: name.trim() || "Living room",
        roomType: "living_room",
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
                value="living_room"
                disabled
                className="mt-1 flex h-9 w-full items-center justify-between rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm opacity-50 cursor-not-allowed"
              >
                <option value="living_room">Living room</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                More room types arrive in Phase 6.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="text-xs font-medium text-foreground">
                Width (m)
                <input
                  type="number"
                  step="0.1"
                  min={2}
                  max={12}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                Length (m)
                <input
                  type="number"
                  step="0.1"
                  min={2}
                  max={12}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="text-xs font-medium text-foreground">
                Height (m)
                <input
                  type="number"
                  step="0.1"
                  min={2.2}
                  max={4}
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
