import { Sofa, Paintbrush, Layers } from "lucide-react";

const STEPS = [
  {
    icon: Sofa,
    title: "1. Set your room",
    body: "Enter dimensions for any room — living, bedroom, dining, or home office.",
  },
  {
    icon: Paintbrush,
    title: "2. Pick a style",
    body: "Scandinavian, Minimal, Industrial, Japandi, or Mid-century — five curated palettes.",
  },
  {
    icon: Layers,
    title: "3. Get a 3D layout",
    body: "AI places furniture, picks a palette, and explains every decision in under 10 seconds.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight font-display text-foreground mb-8">
        How it works
      </h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.title}
            className="rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <step.icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
