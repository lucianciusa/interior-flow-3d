"use client";

import { useEffect, useRef, useState } from "react";

import { useCreateRoom } from "@/lib/api";

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">New room</h2>

        <label htmlFor="room-name" className="mt-4 block text-xs font-medium">
          Name
        </label>
        <input
          ref={inputRef}
          id="room-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          required
        />

        <label htmlFor="room-type" className="mt-3 block text-xs font-medium">
          Type
        </label>
        <select
          id="room-type"
          value="living_room"
          disabled
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm"
        >
          <option value="living_room">Living room</option>
        </select>
        <p className="mt-1 text-xs text-neutral-400">
          More room types arrive in Phase 6.
        </p>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="text-xs font-medium">
            Width (m)
            <input
              type="number"
              step="0.1"
              min={2}
              max={12}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Length (m)
            <input
              type="number"
              step="0.1"
              min={2}
              max={12}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Height (m)
            <input
              type="number"
              step="0.1"
              min={2.2}
              max={4}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
