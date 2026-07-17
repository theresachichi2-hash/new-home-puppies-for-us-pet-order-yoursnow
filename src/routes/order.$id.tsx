import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPaymentSettings } from "@/lib/puppies";
import { toast } from "sonner";

export const Route = createFileRoute("/order/$id")({
  component: OrderPage,
});

async function fetchOrderMinimal(id: string) {
  // Orders read is admin-only per RLS, so we only display info we already know from URL + settings.
  // We fetch payment settings which are public.
  return { id };
}

function OrderPage() {
  const { id } = Route.useParams();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchPaymentSettings });
  const { data: order } = useQuery({ queryKey: ["order", id], queryFn: () => fetchOrderMinimal(id) });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Order received!</h1>
        <p className="mt-2 text-muted-foreground">
          Order reference: <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{order?.id}</span>
        </p>
        <p className="mt-4 text-foreground/80">
          Thank you! To complete your reservation, please send payment using one of the methods below and email your order reference to confirm.
        </p>

        <div className="mt-8 space-y-4">
          <PayCard title="PayPal" empty={!settings?.paypal_email && !settings?.paypal_me_link}>
            {settings?.paypal_me_link && (
              <a href={settings.paypal_me_link} target="_blank" rel="noreferrer" className="block rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
                Pay with PayPal →
              </a>
            )}
            {settings?.paypal_email && (
              <CopyRow label="PayPal email" value={settings.paypal_email} />
            )}
          </PayCard>

          <PayCard title="Bitcoin" empty={!settings?.bitcoin_address}>
            {settings?.bitcoin_address && <CopyRow label="BTC address" value={settings.bitcoin_address} />}
          </PayCard>

          {!settings?.paypal_email && !settings?.paypal_me_link && !settings?.bitcoin_address && (
            <ContactSeller orderId={order?.id ?? ""} />
          )}
        </div>

        <Link to="/" className="mt-8 inline-block text-sm text-primary hover:underline">← Back to puppies</Link>
      </div>
    </div>
  );
}

function ContactSeller({ orderId }: { orderId: string }) {
  const phoneDisplay = "+1 (985) 602-3749";
  const phoneE164 = "+19856023749";
  const waNumber = "19856023749";
  const message = `Hi! I just placed order ${orderId} and would like to arrange payment.`;
  const encoded = encodeURIComponent(message);
  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5">
      <div className="mb-2 font-display text-lg font-semibold">Payment not set up yet</div>
      <p className="text-sm text-muted-foreground">
        PayPal and Bitcoin aren't configured. Please contact the seller directly at{" "}
        <span className="font-medium text-foreground">{phoneDisplay}</span> to arrange payment.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <a href={`https://wa.me/${waNumber}?text=${encoded}`} target="_blank" rel="noreferrer"
          className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground">
          WhatsApp
        </a>
        <a href={`sms:${phoneE164}?body=${encoded}`}
          className="rounded-lg border border-border bg-background px-4 py-2 text-center text-sm font-medium">
          Text message
        </a>
        <a href={`tel:${phoneE164}`}
          className="rounded-lg border border-border bg-background px-4 py-2 text-center text-sm font-medium">
          Call
        </a>
      </div>
    </div>
  );
}

function PayCard({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="mb-3 font-display text-lg font-semibold">{title}</div>
      {empty ? (
        <p className="text-sm text-muted-foreground">Payment details not configured yet. Please contact us.</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-sm">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
      >Copy</button>
    </div>
  );
}
