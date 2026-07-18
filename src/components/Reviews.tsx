import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchReviews, submitReview } from "@/lib/puppies";

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/search?q=NewHomePet+puppies+reviews";

export function Stars({ value = 5, className = "" }: { value?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-yellow-500 ${className}`} aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-4 w-4" fill={i < value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
          <path d="M12 17.3l-6.16 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.48 4.73 1.64 7.03z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

export function ReviewsSection({ puppyId }: { puppyId?: string }) {
  const qc = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => fetchReviews(800),
  });
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [visible, setVisible] = useState(6);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 5;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const author_name = String(fd.get("author_name") || "").trim();
    const content = String(fd.get("content") || "").trim();
    if (author_name.length < 1) return toast.error("Please add your name");
    if (content.length < 3) return toast.error("Review is too short");
    setBusy(true);
    try {
      await submitReview({ author_name, rating, content, puppy_id: puppyId ?? null });
      toast.success("Thanks for your review!");
      (e.target as HTMLFormElement).reset();
      setRating(5);
      qc.invalidateQueries({ queryKey: ["reviews"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-display text-3xl font-semibold md:text-4xl">Loved by families</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Stars value={5} />
            <span className="text-sm font-medium">{avg.toFixed(1)} / 5.0</span>
            <span className="text-sm text-muted-foreground">· Based on {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <a
          href={GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          View reviews on Google →
        </a>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {isLoading && <div className="text-muted-foreground">Loading reviews…</div>}
        {reviews.slice(0, visible).map((r) => (
          <article key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{r.author_name}</div>
              <Stars value={r.rating} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{r.content}</p>
            <div className="mt-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
          </article>
        ))}
      </div>

      {reviews.length > visible && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setVisible((v) => v + 12)}
            className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-secondary"
          >
            Show more reviews
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-10 rounded-3xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-display text-2xl font-semibold">Write a review</h3>
        <p className="mt-1 text-sm text-muted-foreground">Share your experience — your review will be posted permanently.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Your name</span>
            <input name="author_name" required maxLength={80}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <div className="text-sm">
            <span className="mb-1 block font-medium">Rating</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  className="text-2xl leading-none text-yellow-500">
                  {n <= rating ? "★" : "☆"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium">Your review</span>
          <textarea name="content" required rows={4} maxLength={2000}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <button disabled={busy}
          className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {busy ? "Posting…" : "Post review"}
        </button>
      </form>
    </section>
  );
}
