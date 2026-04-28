import Link from "next/link";

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Interior Flow 3D</h1>
      <p className="text-lg text-neutral-600">
        Tell us your room dimensions and a style. We generate a 3D living room layout you can
        rotate, inspect, and save.
      </p>
      <Link
        href="/app"
        className="inline-flex items-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Generate a layout
      </Link>
    </main>
  );
}
