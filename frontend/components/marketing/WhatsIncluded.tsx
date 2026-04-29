import { Home, Palette, BookOpen } from "lucide-react";

const CARDS = [
  {
    icon: Home,
    title: "4 room types",
    body: "Living room, bedroom, dining room, and home office — each with tailored furniture and slots.",
  },
  {
    icon: Palette,
    title: "5 styles",
    body: "Scandinavian, Minimal, Industrial, Japandi, and Mid-century — each with a curated palette.",
  },
  {
    icon: BookOpen,
    title: "~40 catalog items",
    body: "Tagged furniture with smart placement, zone-aware AI, and first-person design rationale.",
  },
];

export default function WhatsIncluded() {
  return (
    <section className="py-16">
      <h2 className="text-center text-2xl font-semibold tracking-tight font-display text-foreground mb-8">
        What&apos;s included
      </h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <card.icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
