export function AppErrorFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="max-w-md space-y-4 text-center" role="alert">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-slate-300">
          Request bodies and your Gemini key are excluded from the error report.
        </p>
        <button
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reload LogosAI
        </button>
      </section>
    </main>
  );
}
