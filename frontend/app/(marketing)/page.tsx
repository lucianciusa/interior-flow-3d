import Link from "next/link";

const FEATURES = [
  {
    title: "Pick a style",
    body: "Scandinavian, Minimal, or Industrial — three palettes, one click.",
  },
  {
    title: "Pick preferences",
    body: "More seating, more open space, or more storage — tell us what matters.",
  },
  {
    title: "See it in 3D",
    body: "Rotate, inspect each piece, and save layouts you love.",
  },
];

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-24">
      <section className="flex flex-col items-start gap-6">
        <h1 className="text-5xl font-semibold tracking-tight">
          Design a living room <br className="hidden sm:block" />in 30 seconds.
        </h1>
        <p className="max-w-xl text-lg text-neutral-600">
          Interior Flow 3D turns room dimensions and a style into a 3D living-room
          layout you can rotate, inspect, and save.
        </p>
        <Link
          href="/app"
          className="inline-flex items-center rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Generate a layout
        </Link>
      </section>

      <section className="mt-16 aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-100 to-neutral-50">
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">
          Hero preview
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-neutral-200 p-5"
          >
            <h3 className="text-sm font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-neutral-600">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-24 text-xs text-neutral-400">
        Anonymous Generate. Login required to Save.
      </footer>
    </main>
  );
}
