"use client";

export default function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
      <h2 className="text-lg font-medium">No projects yet</h2>
      <p className="mt-2 text-sm text-neutral-500">
        A project groups your rooms and layout variants.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        Create your first project
      </button>
    </div>
  );
}
