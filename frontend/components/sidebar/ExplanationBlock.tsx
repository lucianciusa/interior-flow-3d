type ExplanationBlockProps = { text: string };

export default function ExplanationBlock({ text }: ExplanationBlockProps) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Why this works
      </h3>
      <p className="text-sm italic leading-relaxed text-neutral-700">{text}</p>
    </div>
  );
}
