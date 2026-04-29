"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCreateProject } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function NewProjectDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const create = useCreateProject();

  useEffect(() => {
    if (!open) return;
    setName("");
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
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const proj = await create.mutateAsync({ name: trimmed });
      onOpenChange(false);
      router.push(`/app/projects/${proj.id}`);
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
        className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">New project</h2>
        <label htmlFor="project-name" className="mt-4 block text-xs font-medium">
          Name
        </label>
        <input
          ref={inputRef}
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="My apartment"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          required
        />
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
            disabled={create.isPending || !name.trim()}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
