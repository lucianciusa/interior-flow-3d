"use client";

type Props = {
  t: number;
  onChange: (t: number) => void;
  onClose: () => void;
  hideWalls: boolean;
  onHideWallsChange: (v: boolean) => void;
};

export default function CompareToolbar({ t, onChange, onClose, hideWalls, onHideWallsChange }: Props) {
  return (
    <div className="flex items-center gap-4 border-b border-white/10 bg-black/95 p-3 text-white backdrop-blur">
      <span className="text-xs uppercase tracking-wider text-white/50 font-bold">A</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={t}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-white h-1.5 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
        aria-label="Compare slider"
      />
      <span className="text-xs uppercase tracking-wider text-white/50 font-bold">B</span>
      
      <button
        type="button"
        onClick={() => onHideWallsChange(!hideWalls)}
        className="ml-2 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors"
      >
        {hideWalls ? "Show Walls" : "Hide Walls"}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
