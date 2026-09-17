export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Warehouse System
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Next.js migration foundation is active.
        </h1>
        <p className="mt-4 text-slate-600">
          The App Router, Tailwind CSS, server-only MongoDB utility, and health endpoint are ready.
          ERP modules have not yet been migrated.
        </p>
      </section>
    </main>
  );
}
