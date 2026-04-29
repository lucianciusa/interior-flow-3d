type ExplanationBlockProps = { text: string };

export default function ExplanationBlock({ text }: ExplanationBlockProps) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Why this works
      </h3>
      <p className="text-sm italic leading-relaxed text-foreground">{text}</p>
    </div>
  );
}
