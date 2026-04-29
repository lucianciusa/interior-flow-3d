"use client";

type Props = {
  t: number;
  onChange: (t: number) => void;
  onClose: () => void;
};

export default function CompareToolbar({ t, onChange, onClose }: Props) {
  return (
    <div className="flex items-center gap-4 border-b border-neutral-800 bg-neutral-950/95 p-3 text-white">
      <span className="text-xs uppercase tracking-wider text-neutral-400">A</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={t}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-white"
        aria-label="Compare slider"
      />
      <span className="text-xs uppercase tracking-wider text-neutral-400">B</span>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium hover:bg-neutral-800"
      >
        Close
      </button>
    </div>
  );
}
