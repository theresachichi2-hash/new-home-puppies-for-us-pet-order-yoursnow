import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchPuppiesAdmin, fetchPaymentSettings, type Puppy, type MediaItem } from "@/lib/puppies";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"puppies" | "orders" | "settings">("puppies");

  useEffect(() => {
    async function loadRoles(userId: string) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setSession(null); setIsAdmin(false); return; }
      setSession({ userId: data.user.id });
      loadRoles(data.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s?.user) { setSession(null); setIsAdmin(false); }
      else { setSession({ userId: s.user.id }); setIsAdmin(null); loadRoles(s.user.id); }
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
  useEffect(() => {
    // Ensure the admin account exists so the credentials work on first use.
    fetch("/api/public/ensure-admin", { method: "POST" }).catch(() => {});
  }, []);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Signed in");
  }
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <h1 className="font-display text-2xl font-semibold">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your admin email and password.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="Email" autoComplete="email"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input name="password" type="password" required placeholder="Password" autoComplete="current-password"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}


function PuppiesAdmin() {
  const qc = useQueryClient();
  const { data: puppies } = useQuery({ queryKey: ["puppies", "admin"], queryFn: fetchPuppiesAdmin });
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
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Image</th><th className="p-3">Name</th><th className="p-3">Breed</th>
              <th className="p-3">Gender</th><th className="p-3">Age</th><th className="p-3">Price</th>
              <th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {puppies?.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />
                    : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xl">🐶</div>}
                </td>
                <td className="p-3 font-medium whitespace-nowrap">{p.name}</td>
                <td className="p-3 whitespace-nowrap">{p.breed}</td>
                <td className="p-3">{p.gender}</td>
                <td className="p-3 whitespace-nowrap">{p.age_weeks}w</td>
                <td className="p-3 whitespace-nowrap">${p.price.toLocaleString()}</td>
                <td className="p-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${p.available ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                    {p.available ? "Available" : "Sold"}
                  </span>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing(p); setCreating(false); }} className="mr-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">Edit</button>
                  <button onClick={() => del(p.id)} className="rounded-full bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground">Delete</button>
                </td>
              </tr>
            ))}
            {puppies?.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No puppies yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PuppyForm({ puppy, onDone, onCancel }: { puppy: Puppy | null; onDone: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>(() => {
    const existing = puppy?.media ?? [];
    if (existing.length) return existing;
    return puppy?.image_url ? [{ type: "image", url: puppy.image_url }] : [];
  });
  const [uploading, setUploading] = useState(0);

  async function uploadOne(file: File): Promise<MediaItem | null> {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { toast.error(`${file.name}: not an image or video`); return null; }
    const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("puppy-images").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (upErr) { toast.error(`${file.name}: ${upErr.message}`); return null; }
    const { data: signed, error: signErr } = await supabase
      .storage.from("puppy-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signErr) { toast.error(`${file.name}: ${signErr.message}`); return null; }
    return { type: isVideo ? "video" : "image", url: signed.signedUrl };
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    setUploading((n) => n + files.length);
    const results = await Promise.all(files.map(uploadOne));
    setUploading((n) => Math.max(0, n - files.length));
    const good = results.filter((r): r is MediaItem => !!r);
    if (good.length) {
      setMedia((prev) => [...prev, ...good]);
      toast.success(`${good.length} file${good.length === 1 ? "" : "s"} uploaded`);
    }
  }

  function removeAt(idx: number) {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveFirst(idx: number) {
    setMedia((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cover = media.find((m) => m.type === "image")?.url ?? null;
    const numOrNull = (k: string) => {
      const v = fd.get(k);
      if (v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const strOrNull = (k: string) => {
      const v = String(fd.get(k) || "").trim();
      return v ? v : null;
    };
    const payload = {
      name: String(fd.get("name")),
      breed: String(fd.get("breed")),
      gender: String(fd.get("gender")),
      age_weeks: Number(fd.get("age_weeks")),
      color: String(fd.get("color") || ""),
      price: Number(fd.get("price")),
      description: String(fd.get("description") || ""),
      image_url: cover,
      media,
      available: fd.get("available") === "on",
      seller_name: strOrNull("seller_name"),
      seller_phone: strOrNull("seller_phone"),
      seller_email: strOrNull("seller_email"),
      seller_notes: strOrNull("seller_notes"),
      size: strOrNull("size"),
      generation: strOrNull("generation"),
      weight_min_lbs: numOrNull("weight_min_lbs"),
      weight_max_lbs: numOrNull("weight_max_lbs"),
      date_of_birth: strOrNull("date_of_birth"),
      vet_checked: fd.get("vet_checked") === "on",
      vaccines_status: strOrNull("vaccines_status"),
      free_delivery: fd.get("free_delivery") === "on",
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
      <div className="text-sm sm:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">Photos & videos</span>
          <span className="text-xs text-muted-foreground">{media.length} attached · first image is the cover</span>
        </div>
        {media.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {media.map((m, i) => (
              <div key={m.url} className="group relative overflow-hidden rounded-lg border border-border bg-muted">
                {m.type === "image" ? (
                  <img src={m.url} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <video src={m.url} className="aspect-square w-full object-cover" muted />
                )}
                {m.type === "video" && <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">▶ Video</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
                  {m.type === "image" && i !== 0 && (
                    <button type="button" onClick={() => moveFirst(i)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-black">Cover</button>
                  )}
                  <button type="button" onClick={() => removeAt(i)} className="ml-auto rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <input type="file" accept="image/*,video/*" multiple onChange={handleFiles} disabled={uploading > 0}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium" />
        <p className="mt-1 text-xs text-muted-foreground">
          Pick multiple images and/or videos at once. No limit on how many you attach.
          {uploading > 0 && <span className="ml-1 font-medium text-foreground">Uploading {uploading}…</span>}
        </p>
      </div>
      <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium">Description</span>
        <textarea name="description" defaultValue={puppy?.description ?? ""} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </label>
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 rounded-2xl border border-dashed border-border p-4">
        <div className="sm:col-span-2 text-sm font-medium">Seller contact (shown to buyers)</div>
        <FInput label="Seller name" name="seller_name" defaultValue={puppy?.seller_name ?? ""} />
        <FInput label="Seller phone" name="seller_phone" type="tel" defaultValue={puppy?.seller_phone ?? ""} placeholder="+1 985 602 3749" />
        <FInput label="Seller email" name="seller_email" type="email" defaultValue={puppy?.seller_email ?? ""} className="sm:col-span-2" />
        <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium">Contact notes (optional)</span>
          <textarea name="seller_notes" defaultValue={puppy?.seller_notes ?? ""} rows={2} placeholder="e.g. Text preferred, available 9am-6pm CST"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="available" defaultChecked={puppy?.available ?? true} /> Available for sale
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={busy || uploading > 0} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
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
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function confirmPayment(order: { id: string; puppy_id: string | null; puppy_name: string }) {
    if (!confirm(`Confirm payment for ${order.puppy_name}? This marks the puppy as sold.`)) return;
    const { error: oErr } = await supabase.from("orders").update({ status: "paid" }).eq("id", order.id);
    if (oErr) { toast.error(oErr.message); return; }
    if (order.puppy_id) {
      const { error: pErr } = await supabase.from("puppies").update({ available: false }).eq("id", order.puppy_id);
      if (pErr) { toast.error(`Order marked paid, but couldn't update puppy: ${pErr.message}`); return; }
    }
    toast.success("Payment confirmed — puppy marked sold");
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["puppies"] });
  }

  async function markUnpaid(orderId: string) {
    const { error } = await supabase.from("orders").update({ status: "pending_payment" }).eq("id", orderId);
    if (error) toast.error(error.message);
    else { toast.success("Reverted to pending"); qc.invalidateQueries({ queryKey: ["orders"] }); }
  }

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-3">Date</th><th className="p-3">Puppy</th><th className="p-3">Buyer</th>
            <th className="p-3">Payment</th><th className="p-3">Delivery</th><th className="p-3">Status</th><th className="p-3"></th>
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
              <td className="p-3">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${o.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {o.status === "paid" ? "Paid / Sold" : "Pending payment"}
                </span>
              </td>
              <td className="p-3 text-right whitespace-nowrap">
                {o.status !== "paid" ? (
                  <button onClick={() => confirmPayment(o)} className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">
                    Confirm payment
                  </button>
                ) : (
                  <button onClick={() => markUnpaid(o.id)} className="text-xs text-muted-foreground hover:text-foreground">
                    Undo
                  </button>
                )}
              </td>
            </tr>
          ))}
          {orders?.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No orders yet.</td></tr>}
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
