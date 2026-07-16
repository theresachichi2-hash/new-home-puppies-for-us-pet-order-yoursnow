import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — NewHome Puppies" },
      { name: "description", content: "Learn how NewHome Puppies matches families with healthy, well-raised puppies." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold md:text-5xl">About NewHome Puppies</h1>
      <p className="mt-6 text-lg text-muted-foreground">
        We connect loving families with healthy puppies from vetted breeders. Every puppy comes with a health guarantee,
        up-to-date vaccinations, and lifetime support so your new companion thrives from day one.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { icon: "🏥", title: "Vet checked", desc: "Every puppy is examined by a licensed veterinarian." },
          { icon: "🚚", title: "Safe delivery", desc: "Comfortable, climate-controlled transport to your door." },
          { icon: "💛", title: "Lifetime support", desc: "We're here for questions long after you take them home." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="text-3xl">{f.icon}</div>
            <div className="mt-3 font-display text-lg font-semibold">{f.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
