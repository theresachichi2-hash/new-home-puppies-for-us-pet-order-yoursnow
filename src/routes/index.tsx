import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPuppies, type Puppy } from "@/lib/puppies";
import heroImg from "@/assets/hero-puppies.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data: puppies, isLoading } = useQuery({ queryKey: ["puppies"], queryFn: fetchPuppies });
  const available = (puppies ?? []).filter((p) => p.available);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-accent-foreground">
              🐶 Healthy, happy puppies
            </span>
            <h1 className="mt-4 text-4xl leading-tight font-semibold md:text-6xl">
              Find your <span className="text-primary">new best friend</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Browse available puppies from trusted breeders. Pick your favorite and we'll deliver them safely to your door.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#puppies" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90">Browse puppies</a>
              <Link to="/about" className="rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-secondary">Learn more</Link>
            </div>
          </div>
          <div className="relative">
            <img src={heroImg} alt="Happy puppies playing" width={1600} height={900} className="w-full rounded-3xl object-cover shadow-soft" />
          </div>
        </div>
      </section>

      {/* Puppies */}
      <section id="puppies" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-semibold md:text-4xl">Available puppies</h2>
            <p className="mt-1 text-muted-foreground">{available.length} looking for a home</p>
          </div>
        </div>

        {isLoading && <div className="text-muted-foreground">Loading puppies…</div>}
        {!isLoading && available.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="text-4xl">🐾</div>
            <p className="mt-3 font-medium">No puppies listed yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Sign in as admin to add your first puppy.</p>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((p) => <PuppyCard key={p.id} puppy={p} />)}
        </div>
      </section>
    </div>
  );
}

function PuppyCard({ puppy }: { puppy: Puppy }) {
  return (
    <Link
      to="/puppy/$id"
      params={{ id: puppy.id }}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {puppy.image_url ? (
          <img src={puppy.image_url} alt={puppy.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">🐶</div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-semibold">{puppy.name}</h3>
            <p className="text-sm text-muted-foreground">{puppy.breed} · {puppy.gender}</p>
          </div>
          <div className="text-lg font-semibold text-primary">${puppy.price.toLocaleString()}</div>
        </div>
        <div className="mt-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {puppy.age_weeks} weeks old
        </div>
      </div>
    </Link>
  );
}
