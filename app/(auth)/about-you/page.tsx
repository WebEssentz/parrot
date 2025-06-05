"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AboutYouPage() {
  const router = useRouter();
  const [birthday, setBirthday] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem("pendingUser");
    if (data) {
      setUser(JSON.parse(data));
    } else {
      router.replace("/auth/sign-in");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!birthday) {
        setError("Please enter your birthday.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          username: user?.username,
          profilePic: user?.profilePic,
          birthday,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create user.");
        setLoading(false);
        return;
      }
      localStorage.removeItem("pendingUser");
      // Redirect to app or dashboard
      router.replace("/");
    } catch (err) {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-md flex flex-col gap-6">
        <h2 className="text-2xl font-bold mb-2 text-center">Tell us about you</h2>
        <label className="flex flex-col gap-2">
          <span className="text-zinc-700 dark:text-zinc-200 font-medium">Birthday</span>
          <input
            type="date"
            className="border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={birthday}
            onChange={e => setBirthday(e.target.value)}
            required
          />
        </label>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button
          type="submit"
          className="w-full py-3 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
