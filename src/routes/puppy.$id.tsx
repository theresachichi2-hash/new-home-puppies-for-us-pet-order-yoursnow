import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { fetchPuppy, fetchPaymentSettings, type Puppy } from "@/lib/puppies";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/puppy/$id")({
  component: PuppyPage,
});

const schema = z.object({
  buyer_name: z.string().trim().min(2).max(100),
  buyer_email: z.string().trim().email().max(255),
  buyer_phone: z.string().trim().min(5).max(30),
  address_line1: z.string().trim().min(3).max(200),
  address_line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postal_code: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(100),
  delivery_notes: z.string().trim().max(500).optional().or(z.literal("")),
  payment_method: z.enum(["paypal", "bitcoin"]),
});

function PuppyPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: puppy, isLoading } = useQuery({ queryKey: ["puppy", id], queryFn: () => fetchPuppy(id) });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchPaymentSettings });
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<"paypal" | "bitcoin">("paypal");
  const noPaymentConfigured = !settings?.paypal_email && !settings?.paypal_me_link && !settings?.bitcoin_address;

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">Loading…</div>;
  if (!puppy) return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p>Puppy not found.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline">Back to puppies</Link>
    </div>
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!puppy) return;
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    const parsed = schema.safeParse({ ...raw, payment_method: payment });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("orders").insert({
      puppy_id: puppy.id,
      puppy_name: puppy.name,
      puppy_breed: puppy.breed,
      price: puppy.price,
      ...parsed.data,
    }).select("id").single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/order/$id", params: { id: data.id } });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to puppies</Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div>
          <PuppyGallery puppy={puppy} />
          <div className="mt-6">
            <h1 className="font-display text-4xl font-semibold">{puppy.name}</h1>
            <p className="mt-1 text-muted-foreground">{puppy.breed} · {puppy.gender} · {puppy.age_weeks} weeks {puppy.color ? `· ${puppy.color}` : ""}</p>
            <div className="mt-4 text-3xl font-semibold text-primary">${puppy.price.toLocaleString()}</div>
            {puppy.description && <p className="mt-4 leading-relaxed text-foreground/80">{puppy.description}</p>}
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Checkout</h2>
          <p className="mt-1 text-sm text-muted-foreground">Enter delivery details to reserve {puppy.name}.</p>

          <div className="mt-6 grid gap-4">
            <Field label="Full name" name="buyer_name" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" name="buyer_email" type="email" required />
              <Field label="Phone" name="buyer_phone" required />
            </div>
            <Field label="Address line 1" name="address_line1" required />
            <Field label="Address line 2 (optional)" name="address_line2" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" name="city" required />
              <Field label="State / Region" name="state" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Postal code" name="postal_code" required />
              <Field label="Country" name="country" required defaultValue="United States" />
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Delivery notes (optional)</span>
              <textarea name="delivery_notes" rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </label>

            <div>
              <div className="mb-2 text-sm font-medium">Payment method</div>
              <div className="grid grid-cols-2 gap-3">
                {(["paypal", "bitcoin"] as const).map((m) => (
                  <button type="button" key={m} onClick={() => setPayment(m)}
                    className={`rounded-xl border-2 p-3 text-left text-sm transition ${payment === m ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"}`}>
                    <div className="font-medium">{m === "paypal" ? "PayPal" : "Bitcoin"}</div>
                    <div className="text-xs text-muted-foreground">{m === "paypal" ? "Pay with PayPal account" : "Send BTC to our wallet"}</div>
                  </button>
                ))}
              </div>
              {noPaymentConfigured && (
                <div className="mt-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-sm">
                  <div className="font-medium">Online payment not set up yet</div>
                  <p className="mt-1 text-muted-foreground">
                    Message the seller directly at <span className="font-medium text-foreground">+1 (985) 602-3749</span> to arrange payment for {puppy.name}.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <a href={`https://wa.me/19856023749?text=${encodeURIComponent(`Hi! I'd like to reserve ${puppy.name} (${puppy.breed}) for $${puppy.price}.`)}`} target="_blank" rel="noreferrer"
                      className="rounded-lg bg-primary px-3 py-2 text-center text-xs font-medium text-primary-foreground">WhatsApp</a>
                    <a href={`sms:+19856023749?body=${encodeURIComponent(`Hi! I'd like to reserve ${puppy.name} (${puppy.breed}) for $${puppy.price}.`)}`}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-center text-xs font-medium">Text</a>
                    <a href="tel:+19856023749"
                      className="rounded-lg border border-border bg-background px-3 py-2 text-center text-xs font-medium">Call</a>
                  </div>
                </div>
              )}
            </div>


            <button disabled={submitting} className="mt-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-50">
              {submitting ? "Placing order…" : `Reserve for $${puppy.price.toLocaleString()}`}
            </button>
            <p className="text-center text-xs text-muted-foreground">You'll get payment instructions on the next step.</p>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", required, defaultValue }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
      />
    </label>
  );
}

function PuppyGallery({ puppy }: { puppy: Puppy }) {
  const items = puppy.media.length
    ? puppy.media
    : puppy.image_url
      ? [{ type: "image" as const, url: puppy.image_url }]
      : [];
  const [active, setActive] = useState(0);
  const current = items[active];

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-muted text-8xl shadow-card">🐶</div>
    );
  }

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-3xl bg-muted shadow-card">
        {current.type === "image" ? (
          <img src={current.url} alt={puppy.name} className="h-full w-full object-cover" />
        ) : (
          <video src={current.url} controls playsInline className="h-full w-full bg-black object-contain" />
        )}
      </div>
      {items.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {items.map((m, i) => (
            <button
              type="button"
              key={m.url}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 flex-none overflow-hidden rounded-lg border-2 transition ${i === active ? "border-primary" : "border-transparent opacity-80 hover:opacity-100"}`}
              aria-label={`View ${m.type} ${i + 1}`}
            >
              {m.type === "image" ? (
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <video src={m.url} muted className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-lg">▶</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
