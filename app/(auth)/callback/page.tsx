"use client";

export default function CallbackPage() {
  // UI only, keep date of birth field and spinner
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-700 mb-4" />
      <p className="text-lg text-zinc-700 dark:text-zinc-200">Signing you in…</p>
    </div>
  );
}
