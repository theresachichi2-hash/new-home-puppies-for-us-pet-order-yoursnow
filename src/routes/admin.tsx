import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchPuppies, fetchPaymentSettings, type Puppy } from "@/lib/puppies";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"puppies" | "orders" | "settings">("puppies");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setSession(null); setIsAdmin(false); return; }
      setSession({ userId: data.user.id });
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s?.user) { setSession(null); setIsAdmin(false); }
      else { setSession({ userId: s.user.id }); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!session) return <AuthPanel />;
  if (isAdmin === null) return <div className="mx-auto max-w-4xl px-4 py-16 text-muted-foreground">Checking access…</div>;
  if (!isAdmin) return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-2xl">Not authorized</h1>
      <p className="mt-2 text-muted-foreground">Your account isn't an admin.</p>
      <button onClick={() => supabase.auth.signOut()} className="mt-4 rounded-md bg-secondary px-4 py-2 text-sm">Sign out</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Admin</h1>
        <button onClick={() => supabase.auth.signOut()} className="rounded-md bg-secondary px-3 py-1.5 text-sm">Sign out</button>
      </div>
      <div className="mb-6 flex gap-2 border-b border-border">
        {(["puppies", "orders", "settings"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-primary font-medium text-primary" : "text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "puppies" && <PuppiesAdmin />}
      {tab === "orders" && <OrdersAdmin />}
      {tab === "settings" && <SettingsAdmin />}
    </div>
  );
}

function AuthPanel() {
  const [busy, setBusy] = useState(false);
  async function signInAsAdmin() {
    setBusy(true);
    try {
      const res = await fetch("/api/public/ensure-admin", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to prepare admin account");
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: "Ovoroc7@gmail.com",
        password: "Ovoro123$",
      });
      if (error) throw error;
      toast.success("Signed in as admin");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <h1 className="font-display text-2xl font-semibold">Admin access</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to manage puppies, orders, and payment settings.</p>
        <button
          onClick={signInAsAdmin}
          disabled={busy}
          className="mt-6 w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in as Admin"}
        </button>
      </div>
    </div>
  );
}

function PuppiesAdmin() {
  const qc = useQueryClient();
  const { data: puppies } = useQuery({ queryKey: ["puppies"], queryFn: fetchPuppies });
  const [editing, setEditing] = useState<Puppy | null>(null);
  const [creating, setCreating] = useState(false);

  async function del(id: string) {
    if (!confirm("Delete this puppy?")) return;
    const { error } = await supabase.from("puppies").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["puppies"] }); }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => { setCreating(true); setEditing(null); }} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">+ Add puppy</button>
      </div>
      {(creating || editing) && (
        <PuppyForm
          puppy={editing}
          onDone={() => { setCreating(false); setEditing(null); qc.invalidateQueries({ queryKey: ["puppies"] }); }}
          onCancel={() => { setCreating(false); setEditing(null); }}
        />
      )}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="p-3">Name</th><th className="p-3">Breed</th><th className="p-3">Price</th><th className="p-3">Available</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {puppies?.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.breed}</td>
                <td className="p-3">${p.price.toLocaleString()}</td>
                <td className="p-3">{p.available ? "Yes" : "No"}</td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing(p); setCreating(false); }} className="mr-2 text-primary hover:underline">Edit</button>
                  <button onClick={() => del(p.id)} className="text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {puppies?.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No puppies yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PuppyForm({ puppy, onDone, onCancel }: { puppy: Puppy | null; onDone: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      breed: String(fd.get("breed")),
      gender: String(fd.get("gender")),
      age_weeks: Number(fd.get("age_weeks")),
      color: String(fd.get("color") || ""),
      price: Number(fd.get("price")),
      description: String(fd.get("description") || ""),
      image_url: String(fd.get("image_url") || ""),
      available: fd.get("available") === "on",
    };
    setBusy(true);
    const { error } = puppy
      ? await supabase.from("puppies").update(payload).eq("id", puppy.id)
      : await supabase.from("puppies").insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); onDone(); }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
      <FInput label="Name" name="name" defaultValue={puppy?.name} required />
      <FInput label="Breed" name="breed" defaultValue={puppy?.breed} required />
      <label className="text-sm"><span className="mb-1 block font-medium">Gender</span>
        <select name="gender" defaultValue={puppy?.gender ?? "Male"} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option>Male</option><option>Female</option>
        </select>
      </label>
      <FInput label="Age (weeks)" name="age_weeks" type="number" defaultValue={String(puppy?.age_weeks ?? 8)} required />
      <FInput label="Color" name="color" defaultValue={puppy?.color ?? ""} />
      <FInput label="Price (USD)" name="price" type="number" step="0.01" defaultValue={String(puppy?.price ?? "")} required />
      <FInput label="Image URL" name="image_url" defaultValue={puppy?.image_url ?? ""} className="sm:col-span-2" />
      <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium">Description</span>
        <textarea name="description" defaultValue={puppy?.description ?? ""} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="available" defaultChecked={puppy?.available ?? true} /> Available for sale
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={busy} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        <button type="button" onClick={onCancel} className="rounded-full bg-secondary px-5 py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}

function FInput({ label, className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`text-sm ${className}`}>
      <span className="mb-1 block font-medium">{label}</span>
      <input {...rest} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
    </label>
  );
}

function OrdersAdmin() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-3">Date</th><th className="p-3">Puppy</th><th className="p-3">Buyer</th>
            <th className="p-3">Payment</th><th className="p-3">Delivery</th><th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders?.map((o) => (
            <tr key={o.id} className="border-t border-border align-top">
              <td className="p-3 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
              <td className="p-3"><div className="font-medium">{o.puppy_name}</div><div className="text-xs text-muted-foreground">{o.puppy_breed} · ${Number(o.price).toLocaleString()}</div></td>
              <td className="p-3"><div>{o.buyer_name}</div><div className="text-xs text-muted-foreground">{o.buyer_email}</div><div className="text-xs text-muted-foreground">{o.buyer_phone}</div></td>
              <td className="p-3 capitalize">{o.payment_method}</td>
              <td className="p-3 text-xs">{o.address_line1}{o.address_line2 ? `, ${o.address_line2}` : ""}<br />{o.city}, {o.state} {o.postal_code}<br />{o.country}</td>
              <td className="p-3">{o.status}</td>
            </tr>
          ))}
          {orders?.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No orders yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SettingsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: fetchPaymentSettings });
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.from("payment_settings").update({
      paypal_email: String(fd.get("paypal_email") || ""),
      paypal_me_link: String(fd.get("paypal_me_link") || ""),
      bitcoin_address: String(fd.get("bitcoin_address") || ""),
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["settings"] }); }
  }
  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-semibold">Payment details</h2>
      <p className="text-sm text-muted-foreground">Buyers see these on the order confirmation page.</p>
      <FInput label="PayPal email" name="paypal_email" defaultValue={data?.paypal_email ?? ""} />
      <FInput label="PayPal.me link" name="paypal_me_link" defaultValue={data?.paypal_me_link ?? ""} placeholder="https://paypal.me/yourname" />
      <FInput label="Bitcoin wallet address" name="bitcoin_address" defaultValue={data?.bitcoin_address ?? ""} />
      <button disabled={busy} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}
